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
 * 打包磁块坐标：
 * - 优先保留显式坐标（仅钳制在屏宽内），维持用户自由布局与历史配置；
 * - 若缩小屏宽后，钳制导致磁块互相重叠，则整体降级为「流式重排」：按视觉顺序
 *   （先上后下、先左后右）逐个放置，放不下的磁块换行插入后续空位，永不重叠、不丢内容。
 *   磁块最大 4 格、屏最低 4 格，因此换行后必然能放下。
 */
export function packTiles(tiles: PlacedTile[], maxCols: number): Map<string, Cell> {
  const result = new Map<string, Cell>();
  const occupied: Box[] = [];

  const explicit = tiles.filter((t) => t.col !== undefined && t.row !== undefined).sort(
    (a, b) => a.row! - b.row! || a.col! - b.col!,
  );

  let conflict = false;
  for (const tile of explicit) {
    const maxCol = Math.max(0, maxCols - tile.cols);
    const cell: Cell = { col: clamp(tile.col!, 0, maxCol), row: Math.max(0, tile.row!) };
    const box: Box = { ...cell, cols: tile.cols, rows: tile.rows };
    if (!fits(box, occupied)) {
      conflict = true;
      break;
    }
    result.set(tile.id, cell);
    occupied.push(box);
  }

  if (conflict) {
    return flowPack(tiles, maxCols);
  }

  // 无冲突：仅为缺失坐标的磁块行优先补位
  for (const tile of tiles) {
    if (result.has(tile.id)) continue;
    const pos = findFirstFit(tile.cols, tile.rows, maxCols, occupied);
    result.set(tile.id, pos);
    occupied.push({ ...pos, cols: tile.cols, rows: tile.rows });
  }

  return result;
}

/** 流式重排：按视觉顺序逐个放置，放不下换行，永不重叠 */
function flowPack(tiles: PlacedTile[], maxCols: number): Map<string, Cell> {
  const ordered = [...tiles].sort((a, b) => {
    const ra = a.row ?? Number.MAX_SAFE_INTEGER;
    const rb = b.row ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return (a.col ?? Number.MAX_SAFE_INTEGER) - (b.col ?? Number.MAX_SAFE_INTEGER);
  });
  const result = new Map<string, Cell>();
  const occupied: Box[] = [];
  for (const tile of ordered) {
    const pos = findFirstFit(tile.cols, tile.rows, maxCols, occupied);
    result.set(tile.id, pos);
    occupied.push({ ...pos, cols: tile.cols, rows: tile.rows });
  }
  return result;
}

/** 行优先扫描首个能放下的空位（磁块 cols ≤ maxCols 时必然能找到） */
function findFirstFit(cols: number, rows: number, maxCols: number, occupied: Box[]): Cell {
  if (cols > maxCols) return { col: 0, row: 0 };
  for (let row = 0; ; row += 1) {
    for (let col = 0; col + cols <= maxCols; col += 1) {
      const box: Box = { col, row, cols, rows };
      if (fits(box, occupied)) return { col, row };
    }
  }
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
