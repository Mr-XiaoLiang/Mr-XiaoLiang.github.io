import { AppItem } from './types';

export interface PresetApp {
  name: string;
  url: string;
  icon: string;
  /** 全覆盖图，优先于 icon */
  fullIcon?: string;
  /** 表情符号图标，作为文本图标展示 */
  emoji?: string;
  /** 磁块背景色 */
  color?: string;
  description?: string;
  category?: string;
}

/** 在线应用源地址 */
const ONLINE_APPS_URL = 'https://looly.top/api/apps.json';

function isPresetApp(item: unknown): item is PresetApp {
  return (
    !!item &&
    typeof item === 'object' &&
    typeof (item as PresetApp).name === 'string' &&
    typeof (item as PresetApp).url === 'string'
  );
}

/** 拉取内置预设应用（public/Apps.json） */
async function fetchBuiltinApps(): Promise<PresetApp[]> {
  const response = await fetch('./Apps.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`预设应用加载失败（HTTP ${response.status}）`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  return data.filter(isPresetApp);
}

/** 在线应用列表的内存缓存：拉取成功后复用，页面刷新（模块重载）后清空并重新拉取 */
let onlineAppsCache: PresetApp[] | null = null;

/** 拉取在线应用列表，归一化为预设应用条目 */
async function fetchOnlineApps(): Promise<PresetApp[]> {
  if (onlineAppsCache) return onlineAppsCache;
  const response = await fetch(ONLINE_APPS_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`在线应用加载失败（HTTP ${response.status}）`);
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') return [];
  const list = (data as { apps?: unknown }).apps;
  if (!Array.isArray(list)) return [];
  const result = list
    .filter(isPresetApp)
    .map((item) => ({
      name: item.name,
      url: item.url,
      icon: '',
      emoji: typeof item.emoji === 'string' ? item.emoji : undefined,
    }));
  onlineAppsCache = result;
  return result;
}

/** 拉取全部预设应用：内置 Apps.json 与在线应用合并（在线源失败时静默降级，仅用内置） */
export async function fetchPresetApps(): Promise<PresetApp[]> {
  const builtin = await fetchBuiltinApps();
  let online: PresetApp[] = [];
  try {
    online = await fetchOnlineApps();
  } catch {
    online = [];
  }
  return [...builtin, ...online];
}

/** 预设应用转为用户态条目，默认落在应用库，由合并策略决定去向 */
export function presetToApp(preset: PresetApp): AppItem {
  return {
    id: `preset:${slugify(preset.name)}`,
    name: preset.name,
    url: preset.url,
    icon: preset.icon ?? '',
    fullIcon: preset.fullIcon,
    emoji: preset.emoji,
    color: preset.color,
    description: preset.description,
    category: preset.category,
    source: 'preset',
    placement: { kind: 'library' },
  };
}

export interface PresetWidget {
  name: string;
  url: string;
  icon?: string;
  description?: string;
}

/** 拉取内置预设网页小组件（public/Widgets.json） */
export async function fetchPresetWidgets(): Promise<PresetWidget[]> {
  const response = await fetch('./Widgets.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`预设小组件加载失败（HTTP ${response.status}）`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is PresetWidget =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as PresetWidget).name === 'string' &&
      typeof (item as PresetWidget).url === 'string',
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '');
}
