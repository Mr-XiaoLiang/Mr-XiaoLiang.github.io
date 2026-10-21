import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mergePresets, normalize, sortByPlacement } from '../core/model';
import { fetchPresetApps, presetToApp } from '../core/presets';
import { loadConfig, saveConfig } from '../core/storage';
import { newId, normalizeUrl } from '../core/utils';
import type { AppConfig, AppItem, DesktopItem, DomEntry, Placement, WidgetItem, WidgetSize, WidgetType } from '../core/types';

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig | null>(null);
  const ready = ref(false);
  const error = ref<string | null>(null);

  /** 初始化：拉取预设 → 与本地存储合并 → 归一化落库 */
  async function init(): Promise<void> {
    try {
      const presets = (await fetchPresetApps()).map(presetToApp);
      config.value = mergePresets(loadConfig(), presets);
      ready.value = true;
      persist();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '配置初始化失败';
    }
  }

  function persist(): void {
    if (config.value) saveConfig(config.value);
  }

  const apps = computed<AppItem[]>(() => config.value?.apps ?? []);
  const pageCount = computed(() => config.value?.pageCount ?? 1);

  function appsOnPage(page: number): AppItem[] {
    return sortByPlacement(
      apps.value.filter((app) => app.placement.kind === 'page' && app.placement.page === page),
    );
  }

  const dockApps = computed<AppItem[]>(() =>
    sortByPlacement(apps.value.filter((app) => app.placement.kind === 'dock')),
  );

  /** 某一页下一个统一 slot（小组件与应用共用序列） */
  function nextSlotOnPage(page: number): number {
    const current = config.value;
    if (!current) return 0;
    let max = -1;
    for (const app of current.apps) {
      if (app.placement.kind === 'page' && app.placement.page === page) {
        max = Math.max(max, app.placement.slot);
      }
    }
    for (const widget of current.widgets) {
      if (widget.placement.kind === 'page' && widget.placement.page === page) {
        max = Math.max(max, widget.placement.slot);
      }
    }
    return max + 1;
  }

  const widgets = computed<WidgetItem[]>(() => config.value?.widgets ?? []);

  function slotOfItem(item: DesktopItem): number {
    const placement = item.kind === 'app' ? item.app.placement : item.widget.placement;
    return placement.kind === 'page' || placement.kind === 'dock' ? placement.slot : Number.MAX_SAFE_INTEGER;
  }

  /** 某一页的混合条目（应用与小组件按统一 slot 排序） */
  function pageItems(page: number): DesktopItem[] {
    const items: DesktopItem[] = [];
    for (const app of apps.value) {
      if (app.placement.kind === 'page' && app.placement.page === page) {
        items.push({ kind: 'app', key: app.id, app });
      }
    }
    for (const widget of widgets.value) {
      if (widget.placement.kind === 'page' && widget.placement.page === page) {
        items.push({ kind: 'widget', key: widget.id, widget });
      }
    }
    return items.sort((a, b) => slotOfItem(a) - slotOfItem(b));
  }

  /** 新增小组件实例，落在指定页末尾 */
  function addWidget(
    type: WidgetType,
    size: WidgetSize,
    widgetProps: Record<string, unknown>,
    page: number,
  ): void {
    const current = config.value;
    if (!current) return;
    const widget: WidgetItem = {
      id: newId('widget'),
      type,
      size,
      props: widgetProps,
      placement: { kind: 'page', page, slot: nextSlotOnPage(page) },
    };
    config.value = normalize({ ...current, widgets: [...current.widgets, widget] });
    persist();
  }

  /** 删除小组件实例（可从小组件库重新添加） */
  function removeWidget(widgetId: string): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({
      ...current,
      widgets: current.widgets.filter((widget) => widget.id !== widgetId),
    });
    persist();
  }

  /** 从桌面或 Dock 移入应用库（不删除，仅改变位置） */
  function removeToLibrary(appId: string): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) =>
        app.id === appId ? { ...app, placement: { kind: 'library' } } : app,
      ),
    });
    persist();
  }

  /** 新增用户应用，落在指定页末尾 */
  function addUserApp(
    input: { name: string; url: string; icon: string; description?: string },
    page: number,
  ): void {
    const current = config.value;
    if (!current) return;
    const app: AppItem = {
      id: newId('user'),
      name: input.name,
      url: normalizeUrl(input.url),
      icon: input.icon,
      description: input.description || undefined,
      source: 'user',
      placement: { kind: 'page', page, slot: nextSlotOnPage(page) },
    };
    config.value = normalize({ ...current, apps: [...current.apps, app] });
    persist();
  }

  function addPage(): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({ ...current, pageCount: current.pageCount + 1 });
    persist();
  }

  /** 删除指定页：页内条目移入应用库，后续页序号前移 */
  function removePage(page: number): void {
    const current = config.value;
    if (!current || current.pageCount <= 1) return;
    config.value = normalize({
      ...current,
      pageCount: current.pageCount - 1,
      apps: current.apps.map((app) => shiftPlacement(app, page)),
      widgets: current.widgets.map((widget) => shiftPlacement(widget, page)),
    });
    persist();
  }

  /** 以拖拽后的 DOM 顺序回写页面与 Dock 排列（应用与小组件统一 slot） */
  function applyDomOrder(order: { pages: DomEntry[][]; dock: string[] }): void {
    const current = config.value;
    if (!current) return;
    const placements = new Map<string, Placement>();
    order.pages.forEach((entries, page) => {
      entries.forEach((entry, slot) => {
        placements.set(entry.id, { kind: 'page', page, slot });
      });
    });
    order.dock.forEach((id, slot) => {
      placements.set(id, { kind: 'dock', slot });
    });
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) => {
        const placement = placements.get(app.id);
        return placement ? { ...app, placement } : app;
      }),
      widgets: current.widgets.map((widget) => {
        const placement = placements.get(widget.id);
        return placement ? { ...widget, placement } : widget;
      }),
    });
    persist();
  }

  /** 将应用放置到指定页末尾（应用库添加到主屏幕） */
  function placeOnPage(appId: string, page: number): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) =>
        app.id === appId ? { ...app, placement: { kind: 'page', page, slot: nextSlotOnPage(page) } } : app,
      ),
    });
    persist();
  }

  /** 将应用移入 Dock 末尾 */
  function moveToDock(appId: string): void {
    const current = config.value;
    if (!current) return;
    const slot =
      current.apps.reduce((max, app) => {
        if (app.placement.kind === 'dock') return Math.max(max, app.placement.slot);
        return max;
      }, -1) + 1;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) => (app.id === appId ? { ...app, placement: { kind: 'dock', slot } } : app)),
    });
    persist();
  }

  /** 彻底删除应用：预设应用记入隐藏名单，预设更新后不再复活 */
  function deleteApp(appId: string): void {
    const current = config.value;
    if (!current) return;
    const target = current.apps.find((app) => app.id === appId);
    if (!target) return;
    const hiddenPresetIds =
      target.source === 'preset' && !current.hiddenPresetIds.includes(appId)
        ? [...current.hiddenPresetIds, appId]
        : current.hiddenPresetIds;
    config.value = normalize({
      ...current,
      hiddenPresetIds,
      apps: current.apps.filter((app) => app.id !== appId),
    });
    persist();
  }

  return {
    config,
    ready,
    error,
    init,
    persist,
    apps,
    widgets,
    pageCount,
    appsOnPage,
    pageItems,
    dockApps,
    removeToLibrary,
    addUserApp,
    addPage,
    removePage,
    applyDomOrder,
    placeOnPage,
    moveToDock,
    deleteApp,
    addWidget,
    removeWidget,
  };
});

/** 删除页时条目位移：本页移入应用库，后续页序号前移 */
function shiftPlacement<T extends { placement: Placement }>(item: T, removedPage: number): T {
  if (item.placement.kind !== 'page') return item;
  if (item.placement.page === removedPage) return { ...item, placement: { kind: 'library' } };
  if (item.placement.page > removedPage) {
    return { ...item, placement: { ...item.placement, page: item.placement.page - 1 } };
  }
  return item;
}
