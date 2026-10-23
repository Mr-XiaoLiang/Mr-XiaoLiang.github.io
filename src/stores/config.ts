import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mergePresets, normalize } from '../core/model';
import { fetchPresetApps, presetToApp } from '../core/presets';
import { loadConfig, saveConfig, clearConfig } from '../core/storage';
import { newId, normalizeUrl } from '../core/utils';
import { getWidgetDefinition } from '../features/widgets/registry';
import { CONFIG_VERSION, LIBRARY_TILE_ID, SETTINGS_TILE_ID, isValidTileSize, type AppConfig, type AppItem, type DesktopTile, type LayoutSetting, type Placement, type ThemeMode, type WallpaperSetting, type WidgetItem, type WidgetSize, type WidgetType } from '../core/types';
import { clamp, overlap, packTiles, type PlacedTile } from '../core/board';

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

  /** 当前屏宽（格），用于默认落点与拖拽钳制 */
  function screenWidthOf(): number {
    return config.value?.layout.screenWidth ?? 6;
  }

  /** 某屏已占用的矩形区域（缺坐标按 0,0 计），供默认落点计算 */
  function occupiedCells(screen: number): { col: number; row: number; cols: number; rows: number }[] {
    const current = config.value;
    if (!current) return [];
    const list: { col: number; row: number; cols: number; rows: number }[] = [];
    const collect = (p: Placement) => {
      if (p.kind === 'tile' && p.screen === screen) {
        list.push({ col: p.col ?? 0, row: p.row ?? 0, cols: p.cols, rows: p.rows });
      }
    };
    current.apps.forEach((a) => collect(a.placement));
    current.widgets.forEach((w) => collect(w.placement));
    return list;
  }

  /** 某屏首个未占用的格子（行优先），作为新磁块的默认落点 */
  function firstFreeCell(screen: number, cols: number, rows: number): { col: number; row: number } {
    const width = screenWidthOf();
    const occ = occupiedCells(screen);
    const fits = (c: number, r: number) =>
      !occ.some((o) => c < o.col + o.cols && c + cols > o.col && r < o.row + o.rows && r + rows > o.row);
    for (let y = 0; y <= 24; y += 1) {
      for (let x = 0; x + cols <= width; x += 1) {
        if (fits(x, y)) return { col: x, row: y };
      }
    }
    return { col: 0, row: 0 };
  }

  /** 将应用固定到指定屏（从应用库固定），落点为该屏首个空位 */
  function pinApp(appId: string, screen = 0): void {
    const current = config.value;
    if (!current) return;
    config.value = normalize({
      ...current,
      apps: current.apps.map((app) =>
        app.id === appId
          ? {
              ...app,
              placement: {
                ...firstFreeCell(screen, 1, 1),
                kind: 'tile',
                screen,
                slot: nextSlotOnScreen(screen),
                cols: 1,
                rows: 1,
              },
            }
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

  /** 彻底删除应用：预设应用记入隐藏名单，预设更新后不再复活；系统磁块不可删除 */
  function deleteApp(appId: string): void {
    const current = config.value;
    if (!current || appId === LIBRARY_TILE_ID || appId === SETTINGS_TILE_ID) return;
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
      placement: { ...firstFreeCell(screen, 1, 1), kind: 'tile', screen, slot: nextSlotOnScreen(screen), cols: 1, rows: 1 },
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
      placement: { ...firstFreeCell(screen, size.cols, size.rows), kind: 'tile', screen, slot: nextSlotOnScreen(screen), ...size },
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
    if (!current) return;
    const widget = current.widgets.find((w) => w.id === tileId);
    const min = widget ? getWidgetDefinition(widget.type)?.minSize : undefined;
    if (!isValidTileSize(cols, rows, min)) return;
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
   * 压缩布局（保存时调用）：
   * 1. 逐屏删除完全没有任何磁块的行，后续行整体上移，使内容连续；
   * 2. 删除完全空着的屏并重新编号，至少保留第一屏。
   * 用户对磁块的排布（含错位、留白）在屏内得到完整保留，仅清掉“整行空”与“整屏空”。
   */
  function compactLayout(): void {
    const current = config.value;
    if (!current) return;
    let apps: AppItem[] = current.apps.map((app) => ({ ...app, placement: { ...app.placement } }));
    let widgets: WidgetItem[] = current.widgets.map((widget) => ({ ...widget, placement: { ...widget.placement } }));

    for (let screen = 0; screen < current.screenCount; screen += 1) {
      const onScreen = [...apps, ...widgets].filter(
        (t) => t.placement.kind === 'tile' && t.placement.screen === screen,
      );
      if (onScreen.length === 0) continue;
      const occupied = new Set<number>();
      let maxRow = -1;
      for (const t of onScreen) {
        const p = t.placement;
        if (p.kind !== 'tile') continue;
        const base = p.row ?? 0;
        for (let r = base; r < base + p.rows; r += 1) {
          occupied.add(r);
          maxRow = Math.max(maxRow, r);
        }
      }
      const shiftFor = new Map<number, number>();
      let shift = 0;
      for (let r = 0; r <= maxRow; r += 1) {
        if (!occupied.has(r)) shift += 1;
        else shiftFor.set(r, shift);
      }
      for (const t of onScreen) {
        const p = t.placement;
        if (p.kind === 'tile' && occupied.has(p.row ?? 0)) {
          p.row = (p.row ?? 0) - (shiftFor.get(p.row ?? 0) ?? 0);
        }
      }
    }

    const used = new Set<number>();
    for (const t of [...apps, ...widgets]) {
      if (t.placement.kind === 'tile') used.add(t.placement.screen);
    }
    const ordered = [...used].sort((a, b) => a - b);
    const screenMap = new Map<number, number>();
    ordered.forEach((s, index) => screenMap.set(s, index));
    apps = apps.map((app) =>
      app.placement.kind === 'tile' && screenMap.has(app.placement.screen)
        ? { ...app, placement: { ...app.placement, screen: screenMap.get(app.placement.screen)! } }
        : app,
    );
    widgets = widgets.map((widget) =>
      widget.placement.kind === 'tile' && screenMap.has(widget.placement.screen)
        ? { ...widget, placement: { ...widget.placement, screen: screenMap.get(widget.placement.screen)! } }
        : widget,
    );

    config.value = normalize({ ...current, apps, widgets, screenCount: Math.max(1, ordered.length) });
    persist();
  }

  /**
   * 移动磁块到目标屏的指定格（自由摆放）：
   * - 落点与同屏其它磁块重叠时，同屏则交换两者位置，跨屏则把被占磁块挤到该屏空位；
   * - 列钳制在 [0, maxCols-宽度]，行不小于 0（多余空行在保存时压缩）。
   * 其余磁块位置不受影响——排布完全由用户决定。
   * 落点已由拖拽框架吸附并钳制，此处只做冲突处理与落库。
   */
  function moveTileTo(id: string, toScreen: number, col: number, row: number): void {
    const current = config.value;
    if (!current) return;
    const app = current.apps.find((a) => a.id === id);
    const widget = current.widgets.find((w) => w.id === id);
    const item = app || widget;
    if (!item || item.placement.kind !== 'tile') return;
    const cols = item.placement.cols;
    const rows = item.placement.rows;
    const fromScreen = item.placement.screen;
    const fromCol = item.placement.col ?? 0;
    const fromRow = item.placement.row ?? 0;
    const maxCols = Math.max(1, current.layout.screenWidth);

    const targetCol = clamp(Math.max(0, col), 0, Math.max(0, maxCols - cols));
    const targetRow = Math.max(0, row);

    // 用框架打包器解析目标屏其余磁块位置，判断落点是否被占用（历史缺坐标的磁块也能正确参与）
    const others = [...current.apps, ...current.widgets].filter(
      (t) => t !== item && t.placement.kind === 'tile' && t.placement.screen === toScreen,
    );
    const positions = packTiles(
      others.map((t) => {
        const p = t.placement as Extract<Placement, { kind: 'tile' }>;
        const base: PlacedTile = { id: t.id, cols: p.cols, rows: p.rows };
        if (p.col !== undefined && p.row !== undefined) {
          base.col = p.col;
          base.row = p.row;
        }
        return base;
      }),
      maxCols,
    );
    const hit = others.find((t) => {
      const pos = positions.get(t.id);
      if (!pos) return false;
      const p = t.placement as Extract<Placement, { kind: 'tile' }>;
      return overlap(
        { col: targetCol, row: targetRow, cols, rows },
        { col: pos.col, row: pos.row, cols: p.cols, rows: p.rows },
      );
    });

    let displaced: { item: AppItem | WidgetItem; col: number; row: number } | null = null;
    if (hit) {
      const hp = hit.placement as Extract<Placement, { kind: 'tile' }>;
      if (fromScreen === toScreen) {
        displaced = { item: hit, col: fromCol, row: fromRow };
      } else {
        const free = firstFreeCell(toScreen, hp.cols, hp.rows);
        displaced = { item: hit, col: free.col, row: free.row };
      }
    }

    const apply = <T extends AppItem | WidgetItem>(t: T): T => {
      if (t === item && t.placement.kind === 'tile') {
        return { ...t, placement: { ...t.placement, screen: toScreen, col: targetCol, row: targetRow } };
      }
      if (displaced && t === displaced.item && t.placement.kind === 'tile') {
        return { ...t, placement: { ...t.placement, col: displaced.col, row: displaced.row } };
      }
      return t;
    };

    config.value = normalize({
      ...current,
      apps: current.apps.map(apply),
      widgets: current.widgets.map(apply),
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
    compactLayout,
    moveTileTo,
    setWallpaper,
    updateLayout,
    setTheme,
    importConfig,
    resetToDefault,
  };
});
