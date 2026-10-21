/** 配置结构版本，schema 变更时递增并在 storage.ts 登记迁移 */
export const CONFIG_VERSION = 1;

/** 应用或小组件在桌面上的位置：某一页的某一格 / Dock / 应用库 */
export type Placement =
  | { kind: 'page'; page: number; slot: number }
  | { kind: 'dock'; slot: number }
  | { kind: 'library' };

export type AppSource = 'preset' | 'user';

export interface AppItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  description?: string;
  category?: string;
  source: AppSource;
  placement: Placement;
}

export type WidgetType = 'clock' | 'search' | 'calendar' | 'iframe';

/** 小组件尺寸：小 2x2 / 中 4x2 / 大 4x4（以网格单元格计） */
export type WidgetSize = 's' | 'm' | 'l';

export interface WidgetItem {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  /** 各类型小组件私有配置，如 iframe 地址、时钟样式 */
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
  /** auto：按屏幕尺寸计算行列；manual：使用用户指定值 */
  mode: 'auto' | 'manual';
  density: Density;
  rows?: number;
  cols?: number;
}

export interface AppConfig {
  version: number;
  wallpaper: WallpaperSetting;
  theme: ThemeMode;
  layout: LayoutSetting;
  searchEngine: string;
  pageCount: number;
  apps: AppItem[];
  widgets: WidgetItem[];
  /** 被用户删除的预设应用 id，用于预设更新后不再自动复活 */
  hiddenPresetIds: string[];
}

/** 桌面格子条目：应用（1x1）或小组件（跨格） */
export type DesktopItem =
  | { kind: 'app'; key: string; app: AppItem }
  | { kind: 'widget'; key: string; widget: WidgetItem };

/** 拖拽同步时从 DOM 读出的条目 */
export interface DomEntry {
  id: string;
  isWidget: boolean;
}
