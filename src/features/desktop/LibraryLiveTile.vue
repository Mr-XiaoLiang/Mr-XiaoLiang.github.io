<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useConfigStore } from '../../stores/config';
import { tileColorFor } from '../../core/theme';
import { LIBRARY_TILE_ID, SETTINGS_TILE_ID, type AppItem } from '../../core/types';

const props = defineProps<{
  /** 磁贴主色（深浅色块据此生成） */
  tileColor: string;
}>();

const store = useConfigStore();

/** 可作为翻转头像的应用池：排除应用库、设置两个系统磁块 */
const pool = computed<AppItem[]>(() =>
  store.apps.filter((app) => app.id !== LIBRARY_TILE_ID && app.id !== SETTINGS_TILE_ID),
);

/** 明度系数（深→浅）：让 3×3 切片在没有内容时也呈现蒙德里安式的方块拼图 */
const SHADE_FACTORS = [0.42, 0.56, 0.7, 0.84, 1.0, 1.16, 1.32, 1.48, 1.64];

/** 按系数生成主色的明度变体：>1 向白靠拢，<1 向黑靠拢，纯色不透明 */
function shade(hex: string, factor: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const mix = (channel: number) =>
    factor >= 1 ? Math.round(channel + (255 - channel) * (factor - 1)) : Math.round(channel * factor);
  return `rgb(${mix(r)} ${mix(g)} ${mix(b)})`;
}

function shuffle<T>(list: T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface FlipCell {
  id: number;
  app: AppItem | null;
  flipped: boolean;
  /** 正面：主色的深浅纯色块 */
  shade: string;
}

/** 初始化 9 个切片，深浅色块打乱分布 */
function buildCells(): FlipCell[] {
  const shades = shuffle(SHADE_FACTORS.map((factor) => shade(props.tileColor, factor)));
  return Array.from({ length: 9 }, (_, id) => ({ id, app: null, flipped: false, shade: shades[id] }));
}

const cells = ref<FlipCell[]>(buildCells());

let timer = 0;

function backColor(cell: FlipCell): string {
  if (!cell.app) return cell.shade;
  return cell.app.color || tileColorFor(cell.app.id);
}

function initialOf(app: AppItem | null): string {
  if (!app) return '';
  return app.name.trim().charAt(0).toUpperCase();
}

function pickApp(): AppItem | null {
  if (!pool.value.length) return null;
  return pool.value[Math.floor(Math.random() * pool.value.length)];
}

/** 随机翻一批方块（2–3 个同时）：深浅色块 ↔ 应用图标；翻到应用面时随机指定一个应用 */
function flipBatch() {
  const count = 2 + Math.floor(Math.random() * 2);
  const order = shuffle(Array.from({ length: cells.value.length }, (_, i) => i));
  const chosen = new Set(order.slice(0, count));
  cells.value = cells.value.map((cell, i) => {
    if (!chosen.has(i)) return cell;
    if (cell.flipped) return { ...cell, flipped: false };
    return { ...cell, app: pickApp(), flipped: true };
  });
}

/** 初始随机翻出若干应用，其余保持深浅色块 */
function seed(count: number) {
  const order = shuffle(Array.from({ length: cells.value.length }, (_, i) => i));
  const chosen = new Set(order.slice(0, count));
  cells.value = cells.value.map((cell, i) =>
    chosen.has(i) ? { ...cell, app: pickApp(), flipped: true } : cell,
  );
}

function onIconError(event: Event) {
  (event.target as HTMLImageElement).style.display = 'none';
}

onMounted(() => {
  seed(4);
  // 停顿约 3.5 秒后翻转一批，给用户看清翻转结果的机会
  timer = window.setInterval(flipBatch, 3500);
});

onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
  <div class="library-live">
    <div v-for="cell in cells" :key="cell.id" class="flip-cell">
      <div class="flip-inner" :class="{ flipped: cell.flipped }">
        <div class="flip-face flip-front" :style="{ background: cell.shade }"></div>
        <div class="flip-face flip-back" :style="{ background: backColor(cell) }">
          <span v-if="cell.app" class="app-initial">{{ initialOf(cell.app) }}</span>
          <img v-if="cell.app?.icon" :src="cell.app.icon" alt="" draggable="false" @error="onIconError" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-live {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  /* WP8 联系人磁贴：3×3 切片零间隙铺满，无网格线、无外边距 */
  gap: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.flip-cell {
  perspective: 600px;
}

.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
}

.flip-inner.flipped {
  transform: rotateY(180deg);
}

.flip-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-back {
  transform: rotateY(180deg);
}

.flip-back img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  object-fit: contain;
}

.app-initial {
  font-size: clamp(14px, 9cqw, 30px);
  font-weight: 600;
  line-height: 1;
}
</style>
