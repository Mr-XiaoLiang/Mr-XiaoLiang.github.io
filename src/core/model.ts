import { DEFAULT_SEARCH_ENGINE } from './search';
import { clamp, packTiles, type PlacedTile } from './board';
import { SCREEN_WIDTH_LIMITS } from './grid';
import {
  CONFIG_VERSION,
  LIBRARY_TILE_ID,
  SETTINGS_TILE_ID,
  type AppConfig,
  type AppItem,
  type DesktopTile,
  type Placement,
  type WidgetItem,
} from './types';

export const DEFAULT_WALLPAPER_ID = 'nebula';
export const DEFAULT_SCREEN_WIDTH = 6;

function slotOf(placement: Placement): number {
  return placement.kind === 'tile' ? placement.slot : Number.MAX_SAFE_INTEGER;
}

/** 全新用户的默认配置：应用库与设置磁块打头，预设应用随后，预置时钟与搜索小组件 */
export function defaultConfig(presetApps: AppItem[]): AppConfig {
  const libraryTile: AppItem = {
    id: LIBRARY_TILE_ID,
    name: '应用库',
    url: '',
    icon: '',
    source: 'preset',
    placement: { kind: 'tile', screen: 0, slot: 0, cols: 1, rows: 1 },
  };
  const settingsTile: AppItem = {
    id: SETTINGS_TILE_ID,
    name: '设置',
    url: '',
    icon: '',
    color: '#1ba1e2',
    source: 'preset',
    placement: { kind: 'tile', screen: 0, slot: 1, cols: 1, rows: 1 },
  };
  const apps: AppItem[] = presetApps.map((app, index) => ({
    ...app,
    placement: { kind: 'tile', screen: 0, slot: index + 2, cols: 1, rows: 1 },
  }));
  const widgets: WidgetItem[] = [
    {
      id: 'widget:clock',
      type: 'clock',
      size: { cols: 2, rows: 2 },
      props: {},
      placement: { kind: 'tile', screen: 0, slot: apps.length + 2, cols: 2, rows: 2 },
    },
    {
      id: 'widget:search',
      type: 'search',
      size: { cols: 4, rows: 2 },
      props: {},
      placement: { kind: 'tile', screen: 0, slot: apps.length + 3, cols: 4, rows: 2 },
    },
  ];
  return {
    version: CONFIG_VERSION,
    wallpaper: { type: 'builtin', value: DEFAULT_WALLPAPER_ID },
    theme: 'auto',
    layout: { density: 'regular', screenWidth: DEFAULT_SCREEN_WIDTH },
    searchEngine: DEFAULT_SEARCH_ENGINE,
    screenCount: 1,
    apps: [libraryTile, settingsTile, ...apps],
    widgets,
    hiddenPresetIds: [],
  };
}

/** 确保应用库磁块存在且固定在屏上；设置磁块缺失时补建（不强制其位置） */
function ensureSystemTiles(apps: AppItem[]): AppItem[] {
  const hasSettings = apps.some((app) => app.id === SETTINGS_TILE_ID);
  const withSettings = hasSettings
    ? apps
    : [
        ...apps,
        {
          id: SETTINGS_TILE_ID,
          name: '设置',
          url: '',
          icon: '',
          color: '#1ba1e2',
          source: 'preset' as const,
          placement: { kind: 'library' as const },
        },
      ];
  const library = withSettings.find((app) => app.id === LIBRARY_TILE_ID);
  if (library && library.placement.kind === 'tile') return withSettings;
  const libraryTile: AppItem = {
    id: LIBRARY_TILE_ID,
    name: '应用库',
    url: '',
    icon: '',
    source: 'preset',
    placement: { kind: 'tile', screen: 0, slot: -1, cols: 1, rows: 1 },
  };
  return library ? withSettings.map((app) => (app.id === LIBRARY_TILE_ID ? libraryTile : app)) : [libraryTile, ...withSettings];
}

/** 已使用的最大屏索引 */
function usedScreenCount(apps: AppItem[], widgets: WidgetItem[]): number {
  let count = 1;
  for (const item of [...apps, ...widgets]) {
    if (item.placement.kind === 'tile') count = Math.max(count, item.placement.screen + 1);
  }
  return count;
}

/**
 * 归一化：
 * - 确保应用库磁块存在
 * - 每屏按槽位重排为连续序号（应用与小组件共用序列）
 * - 用棋盘打包器为每块磁块写入显式坐标，存储态与渲染态共用同一套坐标，
 *   保存压缩、碰撞检测不再依赖“缺坐标按 0,0 处理”的猜测
 * - 屏数量兜底，不丢条目
 */
export function normalize(config: AppConfig): AppConfig {
  const apps: AppItem[] = ensureSystemTiles(config.apps).map((app) => ({
    ...app,
    placement: { ...app.placement },
  }));
  const widgets: WidgetItem[] = config.widgets.map((widget) => ({
    ...widget,
    placement: { ...widget.placement },
  }));

  const maxCols = clamp(
    config.layout.screenWidth,
    SCREEN_WIDTH_LIMITS.min,
    SCREEN_WIDTH_LIMITS.max,
  );
  const screenCount = Math.max(1, config.screenCount, usedScreenCount(apps, widgets));
  for (let screen = 0; screen < screenCount; screen += 1) {
    const onScreen: DesktopTile[] = [
      ...apps
        .filter((app) => app.placement.kind === 'tile' && app.placement.screen === screen)
        .map((app) => ({ kind: 'app' as const, key: app.id, app })),
      ...widgets
        .filter((widget) => widget.placement.kind === 'tile' && widget.placement.screen === screen)
        .map((widget) => ({ kind: 'widget' as const, key: widget.id, widget })),
    ].sort((a, b) => {
      const placementA = a.kind === 'app' ? a.app.placement : a.widget.placement;
      const placementB = b.kind === 'app' ? b.app.placement : b.widget.placement;
      return slotOf(placementA) - slotOf(placementB);
    });

    onScreen.forEach((item, index) => {
      if (item.kind === 'app') {
        if (item.app.placement.kind === 'tile') item.app.placement.slot = index;
      } else if (item.widget.placement.kind === 'tile') {
        item.widget.placement.slot = index;
      }
    });

    const positions = packTiles(
      onScreen.map((item): PlacedTile => {
        const p = item.kind === 'app' ? item.app.placement : item.widget.placement;
        if (p.kind !== 'tile') return { id: item.key, cols: 1, rows: 1 };
        const base: PlacedTile = { id: item.key, cols: p.cols, rows: p.rows };
        if (p.col !== undefined && p.row !== undefined) {
          base.col = p.col;
          base.row = p.row;
        }
        return base;
      }),
      maxCols,
    );
    for (const item of onScreen) {
      const pos = positions.get(item.key);
      const p = item.kind === 'app' ? item.app.placement : item.widget.placement;
      if (pos && p.kind === 'tile') {
        p.col = pos.col;
        p.row = pos.row;
      }
    }
  }

  return { ...config, version: CONFIG_VERSION, screenCount, apps, widgets };
}

/**
 * 预设与用户层合并：
 * - 预设为只读基线，用户修改过的条目以存储态为准
 * - 预设中新增且未被用户删除的条目加入合并结果（默认落在应用库）
 * - 预设中已消失的条目从存储态移除
 */
export function mergePresets(stored: AppConfig | null, presetApps: AppItem[]): AppConfig {
  if (!stored) return normalize(defaultConfig(presetApps));
  const presetIds = new Set(presetApps.map((app) => app.id));
  const hidden = new Set(stored.hiddenPresetIds ?? []);
  // 系统磁块（应用库、设置）不属于预设清单，合并时始终保留，避免刷新后被误判为已消失的预设
  const isSystem = (id: string): boolean => id === LIBRARY_TILE_ID || id === SETTINGS_TILE_ID;
  const kept = stored.apps.filter(
    (app) => isSystem(app.id) || app.source !== 'preset' || presetIds.has(app.id),
  );
  const known = new Set(kept.map((app) => app.id));
  const fresh = presetApps.filter((app) => !known.has(app.id) && !hidden.has(app.id));
  return normalize({ ...stored, apps: [...kept, ...fresh] });
}
