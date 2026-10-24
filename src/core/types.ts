/** 配置结构版本，schema 变更时递增并在 storage.ts 登记迁移 */
export const CONFIG_VERSION = 2;

/** 应用库磁块的固定 id，唯一不允许删除的磁块 */
export const LIBRARY_TILE_ID = 'system:library';

/** 设置磁块的固定 id，可取消固定但不可删除（始终在应用库中） */
export const SETTINGS_TILE_ID = 'system:settings';

/** 磁块最大跨度（格）。屏宽上限同为 8，1 行/1 列磁块可横跨整屏 */
export const MAX_TILE_SPAN = 8;

/**
 * 磁块合法尺寸：
 * - 未声明最小尺寸（普通应用磁块）：任一边为 1 时另一边不超过 2，其余组合 2–MAX_TILE_SPAN
 * - 声明了最小尺寸（小组件）：以其最小尺寸为下界，允许 1 行宽条等自由形态，跨度不超过 MAX_TILE_SPAN
 */
export function isValidTileSize(cols: number, rows: number, min?: WidgetSize): boolean {
  if (cols < 1 || rows < 1 || cols > MAX_TILE_SPAN || rows > MAX_TILE_SPAN) return false;
  if (min) {
    if (cols < min.cols || rows < min.rows) return false;
    return true;
  }
  if (cols === 1 || rows === 1) return Math.max(cols, rows) <= 2;
  return true;
}

/**
 * 磁块位置：
 * - tile：位于某一屏，槽位决定屏内排列顺序，cols/rows 为占用格数
 * - library：未固定到屏幕的应用
 */
export type Placement =
  | { kind: 'tile'; screen: number; slot: number; cols: number; rows: number; col?: number; row?: number }
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

/** 小组件类型即其协议 id（见 src/widgets/protocol.ts），内置与用户自定义小组件共用同一命名空间 */
export type WidgetType = string;

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
