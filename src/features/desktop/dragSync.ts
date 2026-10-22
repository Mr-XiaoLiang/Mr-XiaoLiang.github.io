import Sortable from 'sortablejs';
import { useConfigStore } from '../../stores/config';
import type { DomEntry } from '../../core/types';

/** 读取屏内磁块的 DOM 顺序 */
function entriesIn(list: HTMLElement | null): DomEntry[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLElement>('[data-tile-id]'))
    .map((element) => ({
      id: element.dataset.tileId ?? '',
      isWidget: element.dataset.widgetId !== undefined,
    }))
    .filter((entry) => entry.id.length > 0);
}

/** 读取当前全部屏的磁块顺序 */
export function readTileOrder(): { screens: DomEntry[][] } {
  const screens: DomEntry[][] = [];
  document.querySelectorAll<HTMLElement>('[data-screen-list]').forEach((list) => {
    screens.push(entriesIn(list));
  });
  return { screens };
}

/** 以拖拽后的 DOM 顺序为准回写配置 */
export function syncTilesToStore(): void {
  useConfigStore().applyTileOrder(readTileOrder());
}

function orderContains(order: { screens: DomEntry[][] }, id: string): boolean {
  return order.screens.some((entries) => entries.some((entry) => entry.id === id));
}

/** 将节点移回来源屏的原索引处（拖拽弹回） */
function restoreToSource(fromEl: HTMLElement, item: HTMLElement, oldIndex: number): void {
  const draggables = Array.from(fromEl.querySelectorAll<HTMLElement>(':scope > .tile'));
  fromEl.insertBefore(item, draggables[oldIndex] ?? null);
}

/**
 * 拖拽结束处理：
 * - 屏内重排：直接以 DOM 顺序回写，Vue 键控 diff 自行完成节点移动
 * - 跨屏：先读取 DOM 顺序，移除被 SortableJS 搬移的节点，再落库，
 *   由 Vue 依新数据重建节点，避免旧节点残留造成重复
 * - 未被任何屏接收：节点移回原处，实现弹回
 */
export function handleTileDrop(event: Sortable.SortableEvent): void {
  const store = useConfigStore();

  if (event.from === event.to) {
    store.applyTileOrder(readTileOrder());
    return;
  }

  const movedId = event.item.dataset.tileId ?? '';
  const order = readTileOrder();
  const accepted = movedId.length > 0 && orderContains(order, movedId);

  if (!accepted) {
    restoreToSource(event.from, event.item, event.oldDraggableIndex ?? 0);
    return;
  }

  event.item.remove();
  store.applyTileOrder(order);
}
