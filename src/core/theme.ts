/** 磁块主题色板（Windows 风格的浓色块） */
export const TILE_COLORS = [
  '#1ba1e2',
  '#60a917',
  '#d80073',
  '#a200ff',
  '#0050ef',
  '#e51400',
  '#f0a30a',
  '#00aba9',
  '#6b5b95',
  '#fa6800',
];

/** 按 id 稳定取色，保证同一磁块每次颜色一致 */
export function tileColorFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100000;
  }
  return TILE_COLORS[hash % TILE_COLORS.length];
}
