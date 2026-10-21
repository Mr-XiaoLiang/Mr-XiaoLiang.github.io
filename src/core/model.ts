import type { AppConfig, AppItem, Placement, WidgetItem } from './types';
import { CONFIG_VERSION } from './types';
import { DEFAULT_SEARCH_ENGINE } from './search';

export const DEFAULT_WALLPAPER_ID = 'nebula';

function slotOf(placement: Placement): number {
  return placement.kind === 'page' || placement.kind === 'dock' ? placement.slot : Number.MAX_SAFE_INTEGER;
}

export function sortByPlacement<T extends { placement: Placement }>(items: T[]): T[] {
  return [...items].sort((a, b) => slotOf(a.placement) - slotOf(b.placement));
}

/** 全新用户的默认配置：第一页预置时钟与搜索小组件，其余预设应用随后 */
export function defaultConfig(presetApps: AppItem[]): AppConfig {
  const widgets: WidgetItem[] = [
    {
      id: 'widget:clock',
      type: 'clock',
      size: 's',
      props: {},
      placement: { kind: 'page', page: 0, slot: 0 },
    },
    {
      id: 'widget:search',
      type: 'search',
      size: 'm',
      props: {},
      placement: { kind: 'page', page: 0, slot: 1 },
    },
  ];
  const apps: AppItem[] = presetApps.map((app, index) => ({
    ...app,
    placement: { kind: 'page', page: 0, slot: widgets.length + index },
  }));
  return {
    version: CONFIG_VERSION,
    wallpaper: { type: 'builtin', value: DEFAULT_WALLPAPER_ID },
    theme: 'auto',
    layout: { mode: 'auto', density: 'regular' },
    searchEngine: DEFAULT_SEARCH_ENGINE,
    pageCount: 1,
    apps,
    widgets,
    hiddenPresetIds: [],
  };
}

function usedPageCount(config: AppConfig): number {
  let count = Math.max(1, config.pageCount);
  for (const item of [...config.apps, ...config.widgets]) {
    if (item.placement.kind === 'page') count = Math.max(count, item.placement.page + 1);
  }
  return count;
}

/** 归一化：每页按「小组件在前、应用在后」统一重排 slot，Dock 同样重排 */
export function normalize(config: AppConfig): AppConfig {
  const pageCount = usedPageCount(config);
  const apps: AppItem[] = config.apps.map((app) => ({ ...app, placement: { ...app.placement } }));
  const widgets: WidgetItem[] = config.widgets.map((widget) => ({ ...widget, placement: { ...widget.placement } }));

  for (let page = 0; page < pageCount; page += 1) {
    let slot = 0;
    for (const widget of sortByPlacement(
      widgets.filter((item) => item.placement.kind === 'page' && item.placement.page === page),
    )) {
      if (widget.placement.kind === 'page') widget.placement.slot = slot;
      slot += 1;
    }
    for (const app of sortByPlacement(
      apps.filter((item) => item.placement.kind === 'page' && item.placement.page === page),
    )) {
      if (app.placement.kind === 'page') app.placement.slot = slot;
      slot += 1;
    }
  }

  let dockSlot = 0;
  for (const app of sortByPlacement(apps.filter((item) => item.placement.kind === 'dock'))) {
    if (app.placement.kind === 'dock') app.placement.slot = dockSlot;
    dockSlot += 1;
  }

  return { ...config, version: CONFIG_VERSION, pageCount, apps, widgets };
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
  const kept = stored.apps.filter((app) => app.source !== 'preset' || presetIds.has(app.id));
  const known = new Set(kept.map((app) => app.id));
  const fresh = presetApps.filter((app) => !known.has(app.id) && !hidden.has(app.id));
  return normalize({ ...stored, apps: [...kept, ...fresh] });
}
