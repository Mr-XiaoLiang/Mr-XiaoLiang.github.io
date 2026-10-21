import type { Density, LayoutSetting } from './types';

export interface GridMetrics {
  /** 每行图标数 */
  cols: number;
  /** 每页可容纳行数 */
  rows: number;
  /** 单元格边长（px） */
  cell: number;
  /** 网格间距（px） */
  gap: number;
}

export interface GridInput {
  /** 桌面可用宽度（px） */
  width: number;
  /** 桌面可用高度（px） */
  height: number;
  layout: LayoutSetting;
  /** 左右安全边距（px） */
  paddingX: number;
}

/** 三档密度对应的单元格基准尺寸与间距 */
const CELL_SIZE: Record<Density, number> = {
  loose: 108,
  regular: 88,
  compact: 72,
};

const GRID_GAP: Record<Density, number> = {
  loose: 22,
  regular: 16,
  compact: 10,
};

const LIMITS = {
  minCols: 3,
  maxCols: 12,
  minRows: 2,
  maxRows: 8,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 按屏幕尺寸与密度计算网格行列；manual 模式优先使用用户指定值 */
export function computeGrid(input: GridInput): GridMetrics {
  const { width, height, layout, paddingX } = input;
  const cell = CELL_SIZE[layout.density];
  const gap = GRID_GAP[layout.density];

  let cols = Math.floor((Math.max(0, width - paddingX * 2) + gap) / (cell + gap));
  let rows = Math.floor((Math.max(0, height) + gap) / (cell + gap));

  cols = clamp(cols, LIMITS.minCols, LIMITS.maxCols);
  rows = clamp(rows, LIMITS.minRows, LIMITS.maxRows);

  if (layout.mode === 'manual') {
    if (layout.cols && layout.cols > 0) cols = clamp(Math.round(layout.cols), LIMITS.minCols, LIMITS.maxCols);
    if (layout.rows && layout.rows > 0) rows = clamp(Math.round(layout.rows), LIMITS.minRows, LIMITS.maxRows);
  }

  return { cols, rows, cell, gap };
}
