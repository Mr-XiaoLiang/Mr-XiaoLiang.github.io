import type { Density } from './types';

export interface LayoutMetrics {
  /** 单元格边长（px），视口变窄时自动缩小以容纳固定的单屏格数 */
  cell: number;
  /** 磁贴间隙（px） */
  gap: number;
  /** 屏间距（px），远大于磁贴间隙 */
  screenGap: number;
  /** 桌面左右安全边距（px），与屏间距一致 */
  paddingX: number;
  /** 单屏横向格数（格），严格取配置值，不随视口宽度变化 */
  screenWidth: number;
  /** 密度基准格边长（视口未压缩时的目标值），用于磁块内容的框架级缩放 */
  baseCell: number;
  /** 密度基准磁贴间隙（px） */
  baseGap: number;
}

export interface LayoutInput {
  /** 桌面可用宽度（px） */
  width: number;
  density: Density;
  /** 配置的单屏横向格数，4-8 */
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
/** 密度基准格边长（px），供磁块内容做框架级缩放时参考 */
export const CELL_SIZE: Record<Density, number> = {
  loose: 108,
  regular: 88,
  compact: 72,
};

/** 磁贴间隙比例：cell 的 1/32 */
const GUTTER_RATIO = 1 / 32;
/** 屏间距比例：cell 的 1/3 */
const SCREEN_GAP_RATIO = 1 / 3;
/** 格边长下限（px），防止极端窄屏下为 0 或负数 */
const MIN_CELL = 28;

/** 屏宽边界：最小 4 格，最大 8 格 */
export const SCREEN_WIDTH_LIMITS = { min: 4, max: 8 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 布局计算：
 * - 单屏横向格数严格取配置值（4-8），不随视口变化——变窄时缩小格边长来容纳固定格数，
 *   而不是减少格数去裁剪已排布的内容；
 * - 真正随视口变化的是「屏」的排列：宽屏多屏并列，窄屏单屏串联换行（由外层 flex-wrap 处理）。
 */
export function computeLayout(input: LayoutInput): LayoutMetrics {
  const { width, density } = input;

  const screenWidth = clamp(
    Math.round(input.screenWidth),
    SCREEN_WIDTH_LIMITS.min,
    SCREEN_WIDTH_LIMITS.max,
  );

  // 一屏 + 两侧边距折算成的「格边长倍数」：
  //   screenWidth 格 → screenWidth × cell
  //   screenWidth-1 处间隙 → (screenWidth-1) × cell × GUTTER_RATIO
  //   两侧边距 → 2 × cell × SCREEN_GAP_RATIO
  const spanRatio =
    screenWidth + (screenWidth - 1) * GUTTER_RATIO + 2 * SCREEN_GAP_RATIO;

  // 视口能容纳的最大格边长；不超过密度基准（宽屏放更多屏），也不低于下限
  const baseCell = CELL_SIZE[density];
  const maxCellByWidth = width / spanRatio;
  const cell = Math.max(MIN_CELL, Math.min(baseCell, Math.floor(maxCellByWidth)));

  const gap = Math.round(cell * GUTTER_RATIO);
  const baseGap = Math.round(baseCell * GUTTER_RATIO);
  const screenGap = Math.round(cell * SCREEN_GAP_RATIO);
  const paddingX = screenGap;

  return { cell, gap, screenGap, paddingX, screenWidth, baseCell, baseGap };
}

/** 屏的像素宽度 */
export function screenWidthPx(metrics: LayoutMetrics): number {
  return metrics.screenWidth * metrics.cell + (metrics.screenWidth - 1) * metrics.gap;
}
