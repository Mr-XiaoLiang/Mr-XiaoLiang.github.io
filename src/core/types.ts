/** 配置结构版本，schema 变更时递增并在 storage.ts 登记迁移 */
export const CONFIG_VERSION = 2;

/** 应用库磁块的固定 id，唯一不允许删除的磁块 */
export const LIBRARY_TILE_ID = 'system:library';

/** 磁块合法尺寸：任一边为 1 时另一边不超过 2，其余组合 2-4 */
export const MAX_TILE_SPAN = 4;

export function isValidTileSize(cols: number, rows: number): boolean {
  if (cols < 1 || rows < 1 || cols > MAX_TILE_SPAN || rows > MAX_TILE_SPAN) return false;
  if (cols === 1 || rows === 1) return Math.max(cols, rows) <= 2;
  return true;
}

/**
 * 磁块位置：
 * - tile：位于某一屏，槽位决定屏内排列顺序，cols/rows 为占用格数
 * - library：未固定到屏幕的应用
 */
export type Placement =
  | { kind: 'tile'; screen: number; slot: number; cols: number; rows: number }
  | { kind: 'library' };

export type AppSource = 'preset' | 'user';

export interface AppItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  /** 全覆盖图，优先于 icon 展示，与 icon 互斥 */
  fullIcon?: string;
  /** 磁块背景色，为空时使用主题色 */
  color?: string;
  description?: string;
  category?: string;
  source: AppSource;
  placement: Placement;
}

export interface WidgetSize {
  cols: number;
  rows: number;
}

export type WidgetType = 'clock' | 'search' | 'calendar' | 'iframe';

export interface WidgetItem {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  /** 各类型小组件私有配置，如 iframe 地址 */
  props: Record<string, unknown>;
  placement: Placement;
}

export type Density = 'loose' | 'regular' | 'compact';

export type ThemeMode = 'auto' | 'light' | 'dark';

export type WallpaperType = 'builtin' | 'url' | 'upload' | 'dynamic';

export interface WallpaperSetting {
  type: WallpaperType;
  /** builtin 为壁纸 id；url / upload 为图片地址 */
  value: string;
  /** 动态壁纸参数：用户自选颜色与流动速度 */
  dynamic?: { colors: string[]; speed: number };
}

export interface LayoutSetting {
  density: Density;
  /** 屏宽（格），4-8；窄屏时自动收缩，放不下下一屏的空间留空 */
  screenWidth: number;
}

export interface AppConfig {
  version: number;
  wallpaper: WallpaperSetting;
  theme: ThemeMode;
  layout: LayoutSetting;
  searchEngine: string;
  /** 屏数量（含空白屏，由用户在编辑模式增减） */
  screenCount: number;
  apps: AppItem[];
  widgets: WidgetItem[];
  /** 被用户删除的预设应用 id，用于预设更新后不再自动复活 */
  hiddenPresetIds: string[];
}

/** 桌面磁块条目：应用磁块或小组件磁块 */
export type DesktopTile =
  | { kind: 'app'; key: string; app: AppItem }
  | { kind: 'widget'; key: string; widget: WidgetItem };

/** 拖拽同步时从 DOM 读出的条目 */
export interface DomEntry {
  id: string;
  isWidget: boolean;
}
