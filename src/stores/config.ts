import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mergePresets, normalize } from '../core/model';
import { fetchPresetApps, presetToApp } from '../core/presets';
import { loadConfig, saveConfig, clearConfig } from '../core/storage';
import { newId, normalizeUrl } from '../core/utils';
import { CONFIG_VERSION, LIBRARY_TILE_ID, isValidTileSize, type AppConfig, type AppItem, type DesktopTile, type DomEntry, type LayoutSetting, type ThemeMode, type WallpaperSetting, type WidgetItem, type WidgetSize, type WidgetType } from '../core/types';

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
  const widgets = computed<WidgetItem[]>(() => config.value?.widgets ?? []);
  const screenCount = computed(() => config.value?.screenCount ?? 1);

  function slotOfTile(tile: DesktopTile): number {
    const placement = tile.kind === 'app' ? tile.app.placement : tile.widget.placement;
    return placement.kind === 'tile' ? placement.slot : Number.MAX_SAFE_INTEGER;
  }

  /** 某一屏的磁块（按槽位排序，应用库磁块恒在首位） */
  function tilesOnScreen(screen: number): DesktopTile[] {
    const tiles: DesktopTile[] = [];
    for (const app of apps.value) {
      if (app.placement.kind === 'tile' && app.placement.screen === screen) {
        tiles.push({ kind: 'app', key: app.id, app });
      }
    }
    for (const widget of widgets.value) {
      if (widget.placement.kind === 'tile' && widget.placement.screen === screen) {
        tiles.push({ kind: 'widget', key: widget.id, widget });
      }
    }
    return tiles.sort((a, b) => {
      // 应用库磁块优先，其余按槽位
      const aLibrary = a.kind === 'app' && a.app.id === LIBRARY_TILE_ID;
      const bLibrary = b.kind === 'app' && b.app.id === LIBRARY_TILE_ID;
      if (aLibrary !== bLibrary) return aLibrary ? -1 : 1;
      return slotOfTile(a) - slotOfTile(b);
    });
  }

  /** 某一屏下一个可用槽位 */
  function nextSlotOnScreen(screen: number): number {
    const current = config.value;
    if (!current) return 0;
    let max = -1;
    for (const app of current.apps) {
      if (app.placement.kind === 'tile' && app.placement.screen === screen) {
        max = Math.max(max, app.placement.slot);
      }
    }
    for (const widget of current.widgets) {
      if (widget.placement.kind === 'tile' && widget.placement.screen === screen) {
        max = Math.max(max, widget.placement.slot);
      }
    }
    return max + 1;
  }

  /** 将应用固定到指定屏末尾（从应用库固定） */
  function pinApp(appId: string, screen = 0): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) =>
        app.id === appId
          ? { ...app, placement: { kind: 'tile', screen, slot: nextSlotOnScreen(screen), cols: 1, rows: 1 } }
          : app,
      ),
    });
    persist();
  }

  /** 从屏幕移回应用库（取消固定） */
  function unpinApp(appId: string): void {
    const current = config.value;
    if (!current || appId === LIBRARY_TILE_ID) return;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) =>
        app.id === appId ? { ...app, placement: { kind: 'library' } } : app,
      ),
    });
    persist();
  }

  /** 彻底删除应用：预设应用记入隐藏名单，预设更新后不再复活 */
  function deleteApp(appId: string): void {
    const current = config.value;
    if (!current || appId === LIBRARY_TILE_ID) return;
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

  /** 新增用户应用，固定到指定屏末尾 */
  function addUserApp(
    input: { name: string; url: string; icon: string; fullIcon?: string; description?: string },
    screen = 0,
  ): void {
    const current = config.value;
    if (!current) return;
    const app: AppItem = {
      id: newId('user'),
      name: input.name,
      url: normalizeUrl(input.url),
      icon: input.icon,
      fullIcon: input.fullIcon,
      description: input.description || undefined,
      source: 'user',
      placement: { kind: 'tile', screen, slot: nextSlotOnScreen(screen), cols: 1, rows: 1 },
    };
    config.value = normalize({ ...current, apps: [...current.apps, app] });
    persist();
  }

  /** 新增小组件实例，固定到指定屏末尾 */
  function addWidget(type: WidgetType, size: WidgetSize, widgetProps: Record<string, unknown>, screen = 0): void {
    const current = config.value;
    if (!current) return;
    const widget: WidgetItem = {
      id: newId('widget'),
      type,
      size,
      props: widgetProps,
      placement: { kind: 'tile', screen, slot: nextSlotOnScreen(screen), ...size },
    };
    config.value = normalize({ ...current, widgets: [...current.widgets, widget] });
    persist();
  }

  /** 删除小组件实例（可从应用库小组件页重新添加） */
  function removeWidget(widgetId: string): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({
      ...current,
      widgets: current.widgets.filter((widget) => widget.id !== widgetId),
    });
    persist();
  }

  /** 调整磁块尺寸（应用或小组件），尺寸非法时忽略 */
  function resizeTile(tileId: string, cols: number, rows: number): void {
    const current = config.value;
    if (!current || !isValidTileSize(cols, rows)) return;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) =>
        app.id === tileId && app.placement.kind === 'tile'
          ? { ...app, placement: { ...app.placement, cols, rows } }
          : app,
      ),
      widgets: current.widgets.map((widget) =>
        widget.id === tileId && widget.placement.kind === 'tile'
          ? { ...widget, size: { cols, rows }, placement: { ...widget.placement, cols, rows } }
          : widget,
      ),
    });
    persist();
  }

  /** 新增空白屏 */
  function addScreen(): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({ ...current, screenCount: current.screenCount + 1 });
    persist();
  }

  /**
   * 压缩布局：移除没有任何磁块的空屏（应用库磁块恒在屏上，至少保留第一屏）。
   * 屏内为 dense 自动排布，空行在结构上不会残留，无需单独处理。
   */
  function compactScreens(): void {
    const current = config.value;
    if (!current) return;
    let maxScreen = 0;
    for (const app of current.apps) {
      if (app.placement.kind === 'tile') maxScreen = Math.max(maxScreen, app.placement.screen);
    }
    for (const widget of current.widgets) {
      if (widget.placement.kind === 'tile') maxScreen = Math.max(maxScreen, widget.placement.screen);
    }
    if (current.screenCount === maxScreen + 1) return;
    config.value = normalize({ ...current, screenCount: maxScreen + 1 });
    persist();
  }

  /** 删除指定屏：屏内应用移入应用库、小组件移入相邻屏，后续屏序号前移 */
  function removeScreen(screen: number): void {
    const current = config.value;
    if (!current || current.screenCount <= 1) return;
    const targetScreen = Math.max(0, screen - 1);
    config.value = normalize({
      ...current,
      screenCount: current.screenCount - 1,
      apps: current.apps.map((app) => {
        if (app.placement.kind !== 'tile') return app;
        if (app.placement.screen === screen) {
          // 应用库磁块不允许移走，跟随到相邻屏
          if (app.id === LIBRARY_TILE_ID) {
            return { ...app, placement: { ...app.placement, screen: targetScreen } };
          }
          return { ...app, placement: { kind: 'library' } };
        }
        if (app.placement.screen > screen) {
          return { ...app, placement: { ...app.placement, screen: app.placement.screen - 1 } };
        }
        return app;
      }),
      widgets: current.widgets.map((widget) => {
        if (widget.placement.kind !== 'tile') return widget;
        if (widget.placement.screen === screen) {
          // 小组件无应用库可去，落到相邻屏末尾
          return { ...widget, placement: { ...widget.placement, screen: targetScreen, slot: Number.MAX_SAFE_INTEGER } };
        }
        if (widget.placement.screen > screen) {
          return { ...widget, placement: { ...widget.placement, screen: widget.placement.screen - 1 } };
        }
        return widget;
      }),
    });
    persist();
  }

  /** 以拖拽后的 DOM 顺序回写各屏槽位 */
  function applyTileOrder(order: { screens: DomEntry[][] }): void {
    const current = config.value;
    if (!current) return;
    const placements = new Map<string, { screen: number; slot: number }>();
    order.screens.forEach((entries, screen) => {
      entries.forEach((entry, slot) => placements.set(entry.id, { screen, slot }));
    });
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) => {
        const position = placements.get(app.id);
        if (!position || app.placement.kind !== 'tile') return app;
        return { ...app, placement: { ...app.placement, screen: position.screen, slot: position.slot } };
      }),
      widgets: current.widgets.map((widget) => {
        const position = placements.get(widget.id);
        if (!position || widget.placement.kind !== 'tile') return widget;
        return { ...widget, placement: { ...widget.placement, screen: position.screen, slot: position.slot } };
      }),
    });
    persist();
  }

  /** 更新壁纸设置 */
  function setWallpaper(setting: WallpaperSetting): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({ ...current, wallpaper: setting });
    persist();
  }

  /** 更新布局设置（密度、屏宽） */
  function updateLayout(patch: Partial<LayoutSetting>): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({ ...current, layout: { ...current.layout, ...patch } });
    persist();
  }

  function setTheme(mode: ThemeMode): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({ ...current, theme: mode });
    persist();
  }

  /** 导入配置文件：校验版本与必要字段后替换整体配置 */
  function importConfig(raw: unknown): void {
    if (!raw || typeof raw !== 'object') throw new Error('配置文件格式不正确');
    const data = raw as AppConfig;
    if (data.version !== CONFIG_VERSION) {
      throw new Error(`配置版本不兼容，需要 v${CONFIG_VERSION}`);
    }
    if (!Array.isArray(data.apps) || !Array.isArray(data.widgets)) {
      throw new Error('配置文件缺少必要字段');
    }
    config.value = normalize({ ...data, version: CONFIG_VERSION });
    persist();
  }

  /** 恢复默认：清空本地配置并按预设重建 */
  async function resetToDefault(): Promise<void> {
    clearConfig();
    const presets = (await fetchPresetApps()).map(presetToApp);
    config.value = mergePresets(null, presets);
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
    screenCount,
    tilesOnScreen,
    pinApp,
    unpinApp,
    deleteApp,
    addUserApp,
    addWidget,
    removeWidget,
    resizeTile,
    addScreen,
    removeScreen,
    compactScreens,
    applyTileOrder,
    setWallpaper,
    updateLayout,
    setTheme,
    importConfig,
    resetToDefault,
  };
});
