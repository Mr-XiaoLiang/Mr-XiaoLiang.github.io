/**
 * 棋盘布局引擎（纯函数，无 Vue、无 DOM、无业务依赖）。
 *
 * 这是布局与拖拽的框架内核：磁块的「屏 / 格」坐标、行优先打包、碰撞检测、
 * 以及拖拽落点的吸附解析，全部收敛在此。业务层（应用 / 小组件）只负责把
 * 「谁在哪个屏、占几格」交给它，渲染与交互只消费它的结果，从而做到
 * 后续调整业务不改动框架。
 */

export interface Cell {
  col: number;
  row: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Box {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/** 待打包的磁块：无显式坐标时由打包器行优先填入 */
export interface PlacedTile {
  id: string;
  cols: number;
  rows: number;
  col?: number;
  row?: number;
}

/** 一块屏的几何信息（由外层在交互时用实时 DOM 矩形填充 rect） */
export interface ScreenRect {
  screen: number;
  maxCols: number;
  /** 编辑态棋盘可用的行数（含预留空行），用于钳制落点行 */
  boardRows: number;
  cell: number;
  gap: number;
  rect: Rect;
}

export interface DropTarget {
  screen: number;
  col: number;
  row: number;
}

/** 格步距：一格边长 + 一格间距 */
export function pitch(cell: number, gap: number): number {
  return cell + gap;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 两矩形（格坐标）是否重叠 */
export function overlap(a: Box, b: Box): boolean {
  return a.col < b.col + b.cols && a.col + a.cols > b.col && a.row < b.row + b.rows && a.row + a.rows > b.row;
}

/** 某矩形是否与一组已占用矩形均不重叠 */
export function fits(box: Box, occupied: Box[]): boolean {
  return !occupied.some((o) => overlap(box, o));
}

/**
 * 行优先打包：已有显式坐标的磁块原样保留（并钳制在屏宽内），
 * 其余按行优先填入首个不与已有磁块重叠的空位。历史配置缺少坐标时也能稳定渲染。
 */
export function packTiles(tiles: PlacedTile[], maxCols: number): Map<string, Cell> {
  const result = new Map<string, Cell>();
  const occupied: Box[] = [];

  for (const tile of tiles) {
    if (tile.col !== undefined && tile.row !== undefined) {
      const maxCol = Math.max(0, maxCols - tile.cols);
      const cell: Cell = { col: clamp(tile.col, 0, maxCol), row: Math.max(0, tile.row) };
      result.set(tile.id, cell);
      occupied.push({ ...cell, cols: tile.cols, rows: tile.rows });
    }
  }

  for (const tile of tiles) {
    if (result.has(tile.id)) continue;
    let placed = false;
    for (let row = 0; row <= 64 && !placed; row += 1) {
      for (let col = 0; col + tile.cols <= maxCols && !placed; col += 1) {
        const box: Box = { col, row, cols: tile.cols, rows: tile.rows };
        if (fits(box, occupied)) {
          result.set(tile.id, { col, row });
          occupied.push(box);
          placed = true;
        }
      }
    }
    if (!placed) {
      result.set(tile.id, { col: 0, row: 0 });
      occupied.push({ col: 0, row: 0, cols: tile.cols, rows: tile.rows });
    }
  }

  return result;
}

function pointInRect(x: number, y: number, rect: Rect, pad = 0): boolean {
  return x >= rect.left - pad && x <= rect.left + rect.width + pad && y >= rect.top - pad && y <= rect.top + rect.height + pad;
}

/** 距离指定点最近的屏（到矩形内最近点的欧氏距离） */
function nearestScreen(screens: ScreenRect[], x: number, y: number): ScreenRect | null {
  let best: ScreenRect | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const screen of screens) {
    const cx = clamp(x, screen.rect.left, screen.rect.left + screen.rect.width);
    const cy = clamp(y, screen.rect.top, screen.rect.top + screen.rect.height);
    const dx = x - cx;
    const dy = y - cy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = screen;
    }
  }
  return best;
}

/**
 * 由指针位置与抓取偏移解析落点（纯函数）。
 *
 * 磁块左上角 = 指针 - 抓取偏移，因此「按在哪就抓哪」；吸附到左上角所在的格。
 * 屏的选择以磁块左上角为准（带少量容差），否则取最近屏，保证落点始终可解析。
 */
export function resolveDropTarget(
  screens: ScreenRect[],
  clientX: number,
  clientY: number,
  grabOffsetX: number,
  grabOffsetY: number,
  cols: number,
): DropTarget | null {
  if (screens.length === 0) return null;
  const tileLeft = clientX - grabOffsetX;
  const tileTop = clientY - grabOffsetY;

  const screen = screens.find((s) => pointInRect(tileLeft, tileTop, s.rect, 8)) ?? nearestScreen(screens, tileLeft, tileTop);
  if (!screen) return null;

  const p = pitch(screen.cell, screen.gap);
  const col = clamp(Math.round((tileLeft - screen.rect.left) / p), 0, Math.max(0, screen.maxCols - cols));
  const row = clamp(Math.round((tileTop - screen.rect.top) / p), 0, screen.boardRows);
  return { screen: screen.screen, col, row };
}
