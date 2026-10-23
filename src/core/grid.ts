import type { Density } from './types';

export interface LayoutMetrics {
  /** 单元格边长（px） */
  cell: number;
  /** 磁贴间隙（px） */
  gap: number;
  /** 屏间距（px），远大于磁贴间隙 */
  screenGap: number;
  /** 桌面左右安全边距（px），与屏间距一致 */
  paddingX: number;
  /** 当前宽度可放格数 */
  cellsFit: number;
  /** 生效屏宽（格），不超过可放格数且不小于 4 */
  screenWidth: number;
}

export interface LayoutInput {
  /** 桌面可用宽度（px） */
  width: number;
  density: Density;
  /** 配置的屏宽（格），4-8 */
  screenWidth: number;
}

/**
 * 布局换算比例尺（基准 = 格边长 cell）。
 *
 * 依据 Windows Phone 8 / Win8 Metro 方块磁贴规范：磁贴是 1:1 直角方块，
 * 磁贴之间的间隙是克制的细缝，只有屏与屏之间才留明显间隔（桌面端分栏）。
 *
 * | 量               | 公式              | loose(108) | regular(88) | compact(72) |
 * |------------------|-------------------|------------|-------------|-------------|
 * | 格边长 cell      | 基准              | 108        | 88          | 72          |
 * | 磁贴间隙 gap     | round(cell × 1/32) | 3         | 3           | 2           |
 * | 屏间距 screenGap | round(cell × 1/3)  | 36         | 29          | 24          |
 * | 左右边距 paddingX| = screenGap       | 36         | 29          | 24          |
 *
 * 磁贴间隙约为格边长的 1/32（≈3%），是紧贴的细缝；
 * 屏间距约为格边长的 1/3（≈33%），是磁贴间隙的约 10 倍，桌面端屏与屏之间一眼可分。
 */
const CELL_SIZE: Record<Density, number> = {
  loose: 108,
  regular: 88,
  compact: 72,
};

/** 磁贴间隙比例：cell 的 1/32 */
const GUTTER_RATIO = 1 / 32;
/** 屏间距比例：cell 的 1/3 */
const SCREEN_GAP_RATIO = 1 / 3;

/** 屏宽边界：最小 4 格，最大 8 格 */
export const SCREEN_WIDTH_LIMITS = { min: 4, max: 8 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 布局计算：
 * 1. 按密度取格尺寸，由比例尺推导间隙 / 屏间距 / 边距
 * 2. 计算当前宽度可放格数；不足 4 时缩小格尺寸，硬凑 4 格
 * 3. 屏宽取配置值，收敛到 [4, 可放格数]
 */
export function computeLayout(input: LayoutInput): LayoutMetrics {
  const { width, density } = input;
  let cell = CELL_SIZE[density];
  const gap = Math.round(cell * GUTTER_RATIO);
  const screenGap = Math.round(cell * SCREEN_GAP_RATIO);
  const paddingX = screenGap;

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

  return { cell, gap, screenGap, paddingX, cellsFit, screenWidth };
}

/** 屏的像素宽度 */
export function screenWidthPx(metrics: LayoutMetrics): number {
  return metrics.screenWidth * metrics.cell + (metrics.screenWidth - 1) * metrics.gap;
}
