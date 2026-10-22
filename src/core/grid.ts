import type { Density } from './types';

export interface LayoutMetrics {
  /** 单元格边长（px） */
  cell: number;
  /** 格间距（px） */
  gap: number;
  /** 屏间距（px），大于格间距 */
  screenGap: number;
  /** 当前宽度可放格数 */
  cellsFit: number;
  /** 生效屏宽（格），不超过可放格数且不小于 4 */
  screenWidth: number;
}

export interface LayoutInput {
  /** 桌面可用宽度（px） */
  width: number;
  /** 左右安全边距（px） */
  paddingX: number;
  density: Density;
  /** 配置的屏宽（格），4-8 */
  screenWidth: number;
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

/** 屏宽边界：最小 4 格，最大 8 格 */
export const SCREEN_WIDTH_LIMITS = { min: 4, max: 8 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 布局计算：
 * 1. 按密度取格尺寸，计算当前宽度可放格数
 * 2. 可放格数不足 4 时缩小格尺寸，硬凑 4 格
 * 3. 屏宽取配置值，收敛到 [4, 可放格数]
 */
export function computeLayout(input: LayoutInput): LayoutMetrics {
  const { width, paddingX, density } = input;
  let cell = CELL_SIZE[density];
  const gap = GRID_GAP[density];
  const screenGap = gap * 3;

  const usable = Math.max(0, width - paddingX * 2);
  let cellsFit = Math.floor((usable + gap) / (cell + gap));

  // 不足 4 格时缩小格尺寸，保证最小 4 格
  if (cellsFit < 4) {
    cell = Math.max(36, Math.floor((usable - 3 * gap) / 4));
    cellsFit = Math.floor((usable + gap) / (cell + gap));
    if (cellsFit < 4) cellsFit = 4;
  }

  const screenWidth = clamp(
    Math.round(input.screenWidth),
    SCREEN_WIDTH_LIMITS.min,
    Math.min(SCREEN_WIDTH_LIMITS.max, Math.max(SCREEN_WIDTH_LIMITS.min, cellsFit)),
  );

  return { cell, gap, screenGap, cellsFit, screenWidth };
}

/** 屏的像素宽度 */
export function screenWidthPx(metrics: LayoutMetrics): number {
  return metrics.screenWidth * metrics.cell + (metrics.screenWidth - 1) * metrics.gap;
}
