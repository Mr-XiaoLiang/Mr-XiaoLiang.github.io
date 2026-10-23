/**
 * 拖拽框架（响应式控制器，与业务无关）。
 *
 * 只关心「把一个可拖拽的磁块从指针按下跟手到落点」这一件事：
 * - 指针捕获，保证指针移出元素后事件不中断；
 * - 用 position:fixed + translate3d 让磁块 1:1 跟手，且不受滚动影响；
 * - 通过 screen 注册表实时读取屏幕矩形，交给 board.resolveDropTarget 解析落点；
 * - 落点以响应式 state.target 暴露，供界面渲染高亮；
 * - 靠近滚动容器上下边缘时自动滚动，跨屏拖拽不断链。
 *
 * 业务层只需：registerScreen / unregisterScreen / setScrollContainer 提供几何，
 * 然后调用 beginDrag 开始拖拽，并在 onDrop 回调里落库。
 */

import { reactive } from 'vue';
import { pitch, resolveDropTarget, type DropTarget, type Rect } from './board';

export interface RegisteredScreen {
  screen: number;
  maxCols: number;
  boardRows: number;
  cell: number;
  gap: number;
  el: HTMLElement;
}

export interface DragBeginOptions {
  id: string;
  cols: number;
  rows: number;
  element: HTMLElement;
  onDrop: (target: DropTarget) => void;
}

export const dragState = reactive<{
  active: boolean;
  id: string | null;
  cols: number;
  rows: number;
  target: DropTarget | null;
}>({
  active: false,
  id: null,
  cols: 1,
  rows: 1,
  target: null,
});

const screens = new Map<number, RegisteredScreen>();
let scrollContainer: HTMLElement | null = null;

export function registerScreen(screen: RegisteredScreen): void {
  screens.set(screen.screen, screen);
}

export function unregisterScreen(screen: number): void {
  screens.delete(screen);
}

export function setScrollContainer(el: HTMLElement | null): void {
  scrollContainer = el;
}

interface Session extends DragBeginOptions {
  grabOffsetX: number;
  grabOffsetY: number;
  originLeft: number;
  originTop: number;
  width: number;
  height: number;
  pointerId: number;
  moved: boolean;
}

let session: Session | null = null;
let lastX = 0;
let lastY = 0;
let rafId = 0;
/** 松手回位动画的取消句柄，用于快速连续拖拽时中断上一次落定 */
let settling: { finish: () => void } | null = null;

/** 拖拽阈值：超过该像素位移才认定为真实拖拽，避免点按被误判 */
const DRAG_THRESHOLD = 4;
/** 自动滚动：靠近上下边缘的触发距离与每帧步长 */
const AUTO_SCROLL_ZONE = 64;
const AUTO_SCROLL_SPEED = 16;

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function currentScreens() {
  return [...screens.values()].map((s) => ({
    screen: s.screen,
    maxCols: s.maxCols,
    boardRows: s.boardRows,
    cell: s.cell,
    gap: s.gap,
    rect: rectOf(s.el),
  }));
}

function applyDragVisual(): void {
  if (!session) return;
  const s = session;
  dragState.active = true;
  dragState.id = s.id;
  dragState.cols = s.cols;
  dragState.rows = s.rows;
  s.element.classList.add('tile-dragging');
  s.element.style.width = `${s.width}px`;
  s.element.style.height = `${s.height}px`;
  s.element.style.left = `${s.originLeft}px`;
  s.element.style.top = `${s.originTop}px`;
  startLoop();
}

function clearDragVisual(s: Session): void {
  s.element.classList.remove('tile-dragging');
  // 关键：transform 必须瞬时归零，否则 .tile 基类的 transform 过渡会把「目标格 + 残留位移」
  // 渲染成一次向右下的二次回弹。先固定 transition 为 none，归零并在渲染之后才恢复基类过渡。
  s.element.style.transition = 'none';
  s.element.style.position = '';
  s.element.style.zIndex = '';
  s.element.style.margin = '';
  s.element.style.left = '';
  s.element.style.top = '';
  s.element.style.width = '';
  s.element.style.height = '';
  s.element.style.transform = '';
  // 渲染后恢复基类过渡（此刻 transform 已为 0，不会触发过渡；若已开始新拖拽则由 tile-dragging 的 !important 接管）
  window.setTimeout(() => {
    s.element.style.transition = '';
  }, 0);
}

function update(clientX: number, clientY: number): void {
  lastX = clientX;
  lastY = clientY;
  if (!session) return;
  const s = session;
  const dx = clientX - s.grabOffsetX - s.originLeft;
  const dy = clientY - s.grabOffsetY - s.originTop;
  s.element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  dragState.target = resolveDropTarget(currentScreens(), clientX, clientY, s.grabOffsetX, s.grabOffsetY, s.cols);
}

/** 拖拽期间持续运行的自动滚动循环：靠近边缘时滚动并重算落点 */
function startLoop(): void {
  if (rafId) return;
  const step = (): void => {
    rafId = 0;
    if (!session) return;
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      const dir = lastY < rect.top + AUTO_SCROLL_ZONE ? -1 : lastY > rect.bottom - AUTO_SCROLL_ZONE ? 1 : 0;
      if (dir !== 0) {
        scrollContainer.scrollBy(0, dir * AUTO_SCROLL_SPEED);
        // 屏幕随滚动移动，指针不变，重新解析落点
        dragState.target = resolveDropTarget(
          currentScreens(),
          lastX,
          lastY,
          session.grabOffsetX,
          session.grabOffsetY,
          session.cols,
        );
      }
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

function stopLoop(): void {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

export function beginDrag(event: PointerEvent, options: DragBeginOptions): void {
  if (session) return;
  // 中断上一次尚未完成的落定动画，避免旧回调污染新一次拖拽
  if (settling) settling.finish();
  const rect = options.element.getBoundingClientRect();
  session = {
    ...options,
    grabOffsetX: event.clientX - rect.left,
    grabOffsetY: event.clientY - rect.top,
    originLeft: rect.left,
    originTop: rect.top,
    width: rect.width,
    height: rect.height,
    pointerId: event.pointerId,
    moved: false,
  };

  options.element.setPointerCapture(event.pointerId);
  options.element.addEventListener('pointermove', onMove);
  options.element.addEventListener('pointerup', onEnd);
  options.element.addEventListener('pointercancel', onEnd);
}

function onMove(event: PointerEvent): void {
  if (!session) return;
  const s = session;
  if (!s.moved) {
    const startX = s.originLeft + s.grabOffsetX;
    const startY = s.originTop + s.grabOffsetY;
    if (Math.abs(event.clientX - startX) > DRAG_THRESHOLD || Math.abs(event.clientY - startY) > DRAG_THRESHOLD) {
      s.moved = true;
      applyDragVisual();
    }
  }
  if (s.moved) update(event.clientX, event.clientY);
}

function onEnd(event: PointerEvent): void {
  if (!session) return;
  const s = session;
  session = null;
  stopLoop();

  s.element.removeEventListener('pointermove', onMove);
  s.element.removeEventListener('pointerup', onEnd);
  s.element.removeEventListener('pointercancel', onEnd);

  const target = dragState.target;
  dragState.active = false;
  dragState.id = null;
  dragState.target = null;

  try {
    if (s.element.hasPointerCapture(event.pointerId)) s.element.releasePointerCapture(event.pointerId);
  } catch {
    /* 已释放则忽略 */
  }

  if (s.moved && target) {
    // 吞掉拖拽结束后的 click（在落定动画前同步注册，保证捕获到）
    suppressClick();
    settle(s, target);
  } else {
    // 未构成拖拽（点按），直接还原
    clearDragVisual(s);
  }
}

/**
 * 松手回位：磁块保持浮起，从跟手位置平滑滑到吸附格，到位后再落库。
 * 消除「跟手位置 → 吸附格」之间的半格瞬移。
 */
function settle(s: Session, target: DropTarget): void {
  const screen = screens.get(target.screen);
  let settleLeft = s.originLeft;
  let settleTop = s.originTop;
  if (screen) {
    const p = pitch(screen.cell, screen.gap);
    const rect = rectOf(screen.el);
    settleLeft = rect.left + target.col * p;
    settleTop = rect.top + target.row * p;
  }
  const targetDx = settleLeft - s.originLeft;
  const targetDy = settleTop - s.originTop;
  const curDx = lastX - s.grabOffsetX - s.originLeft;
  const curDy = lastY - s.grabOffsetY - s.originTop;

  // 退出拖拽态，但保持浮起（行内样式接管 fixed 定位），避免先跳回原格
  s.element.classList.remove('tile-dragging');
  s.element.style.position = 'fixed';
  s.element.style.zIndex = '1000';
  s.element.style.margin = '0';
  s.element.style.left = `${s.originLeft}px`;
  s.element.style.top = `${s.originTop}px`;
  s.element.style.width = `${s.width}px`;
  s.element.style.height = `${s.height}px`;

  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    settling = null;
    clearDragVisual(s);
    s.onDrop(target);
  };
  settling = { finish };

  // 吸附位置与当前跟手位置几乎重合时无需动画，直接落定
  if (Math.abs(targetDx - curDx) + Math.abs(targetDy - curDy) < 0.5) {
    finish();
    return;
  }

  s.element.style.transition = 'transform 130ms ease-out';
  s.element.style.transform = `translate3d(${targetDx}px, ${targetDy}px, 0)`;
  s.element.addEventListener('transitionend', finish, { once: true });
  // 兜底：transitionend 未触发（reduced-motion / 异常）时仍要落定
  window.setTimeout(finish, 170);
}

/** 吞掉拖拽结束后派生的 click，避免误触发磁块的打开动作 */
function suppressClick(): void {
  const swallow = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    document.removeEventListener('click', swallow, true);
  };
  document.addEventListener('click', swallow, true);
}
