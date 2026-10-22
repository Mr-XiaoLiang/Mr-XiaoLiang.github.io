import { AppItem } from './types';

export interface PresetApp {
  name: string;
  url: string;
  icon: string;
  /** 全覆盖图，优先于 icon */
  fullIcon?: string;
  /** 磁块背景色 */
  color?: string;
  description?: string;
  category?: string;
}

/** 拉取内置预设应用（public/Apps.json） */
export async function fetchPresetApps(): Promise<PresetApp[]> {
  const response = await fetch('./Apps.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`预设应用加载失败（HTTP ${response.status}）`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is PresetApp =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as PresetApp).name === 'string' &&
      typeof (item as PresetApp).url === 'string',
  );
}

/** 预设应用转为用户态条目，默认落在应用库，由合并策略决定去向 */
export function presetToApp(preset: PresetApp): AppItem {
  return {
    id: `preset:${slugify(preset.name)}`,
    name: preset.name,
    url: preset.url,
    icon: preset.icon ?? '',
    fullIcon: preset.fullIcon,
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
