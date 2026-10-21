import { useConfigStore } from '../../stores/config';
import type { DomEntry } from '../../core/types';

/** 读取列表内混合条目的 DOM 顺序 */
function entriesIn(list: HTMLElement | null): DomEntry[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLElement>('[data-app-id], [data-widget-id]'))
    .map((element) => ({
      id: element.dataset.appId ?? element.dataset.widgetId ?? '',
      isWidget: element.dataset.widgetId !== undefined,
    }))
    .filter((entry) => entry.id.length > 0);
}

/** 读取 Dock 内的应用 id 顺序（小组件不进 Dock） */
function appIdsIn(list: HTMLElement | null): string[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLElement>('[data-app-id]'))
    .map((element) => element.dataset.appId)
    .filter((id): id is string => !!id);
}

/**
 * 以 SortableJS 拖拽后的 DOM 顺序为准，回写配置：
 * 各页网格内应用与小组件共用统一 slot 序列；
 * 小组件被拖入 Dock 时不会被记录，保持原位弹回。
 */
export function syncDomOrderToStore(): void {
  const store = useConfigStore();
  const pages: DomEntry[][] = [];
  document.querySelectorAll<HTMLElement>('[data-page-list]').forEach((list) => {
    pages.push(entriesIn(list));
  });
  const dock = appIdsIn(document.querySelector<HTMLElement>('[data-dock-list]'));
  store.applyDomOrder({ pages, dock });
}
