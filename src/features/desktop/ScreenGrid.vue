<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import Tile from './Tile.vue';
import { useEditMode } from './editState';
import { useConfigStore } from '../../stores/config';
import { packTiles, type PlacedTile } from '../../core/board';
import { beginDrag, dragState, registerScreen, unregisterScreen } from '../../core/drag';
import type { DesktopTile } from '../../core/types';

const props = defineProps<{
  screen: number;
  tiles: DesktopTile[];
  /** 单元格边长（px） */
  cell: number;
  /** 格间距（px） */
  gap: number;
  /** 屏宽（格） */
  maxCols: number;
  /** 是否为最后一屏（新屏瓦片只在末屏显示） */
  isLast?: boolean;
}>();

const emit = defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'remove-widget', id: string): void;
  (e: 'resize', id: string, cols: number, rows: number): void;
  (e: 'add-screen'): void;
  (e: 'open-library'): void;
  (e: 'open-settings'): void;
  (e: 'remove-screen'): void;
}>();

const { editing } = useEditMode();
const store = useConfigStore();

function sizeOf(tile: DesktopTile): { cols: number; rows: number } {
  if (tile.kind === 'widget') return tile.widget.size;
  const p = tile.app.placement;
  return p.kind === 'tile' ? { cols: p.cols, rows: p.rows } : { cols: 1, rows: 1 };
}

function hasExplicit(tile: DesktopTile): boolean {
  const p = tile.kind === 'widget' ? tile.widget.placement : tile.app.placement;
  return p.kind === 'tile' && p.col !== undefined && p.row !== undefined;
}

function explicitOf(tile: DesktopTile): { col: number; row: number } {
  const p = tile.kind === 'widget' ? tile.widget.placement : tile.app.placement;
  if (p.kind === 'tile' && p.col !== undefined && p.row !== undefined) return { col: p.col, row: p.row };
  return { col: 0, row: 0 };
}

/** 用框架的打包器解析本屏各磁块坐标：显式坐标优先，缺失者行优先填入首个空位 */
const resolved = computed(() => {
  const placed: PlacedTile[] = props.tiles.map((tile) => {
    const size = sizeOf(tile);
    const base: PlacedTile = { id: tile.key, cols: size.cols, rows: size.rows };
    if (hasExplicit(tile)) {
      const ex = explicitOf(tile);
      base.col = ex.col;
      base.row = ex.row;
    }
    return base;
  });
  const positions = packTiles(placed, props.maxCols);
  return props.tiles.map((tile) => ({ tile, pos: positions.get(tile.key)! }));
});

/** 编辑态棋盘需要展示的行数（内容之下留若干空行供摆放） */
const boardRows = computed(() => {
  let maxRow = -1;
  for (const entry of resolved.value) maxRow = Math.max(maxRow, entry.pos.row + sizeOf(entry.tile).rows);
  return Math.max(6, maxRow + 4);
});

const root = ref<HTMLElement | null>(null);

/** 把本屏几何注册进拖拽框架，供落点解析使用；相关参数变化时自动重注册 */
watchEffect((onCleanup) => {
  if (!root.value) return;
  registerScreen({
    screen: props.screen,
    maxCols: props.maxCols,
    boardRows: boardRows.value,
    cell: props.cell,
    gap: props.gap,
    el: root.value,
  });
  onCleanup(() => unregisterScreen(props.screen));
});

function onGridPointerDown(event: PointerEvent) {
  if (!editing.value) return;
  const target = event.target as HTMLElement;
  if (target.closest('.no-drag')) return;
  const tileEl = target.closest('.tile') as HTMLElement | null;
  if (!tileEl) return;
  const tileId = tileEl.dataset.tileId || tileEl.dataset.widgetId;
  if (!tileId) return;
  const entry = props.tiles.find((t) => t.key === tileId);
  if (!entry) return;
  const size = sizeOf(entry);
  beginDrag(event, {
    id: tileId,
    cols: size.cols,
    rows: size.rows,
    element: tileEl,
    onDrop: (target) => store.moveTileTo(tileId, target.screen, target.col, target.row),
  });
}

function onTileResize(id: string, cols: number, rows: number) {
  emit('resize', id, cols, rows);
}
</script>

<template>
  <section class="screen">
    <button
      v-if="editing && screen > 0"
      type="button"
      class="screen-remove no-drag"
      aria-label="删除此屏"
      @click.stop="emit('remove-screen')"
    >
      ×
    </button>
    <div
      ref="root"
      class="screen-grid"
      :class="{ board: editing }"
      :data-screen="screen"
      :style="{
        gridTemplateColumns: `repeat(${maxCols}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
        gridTemplateRows: editing ? `repeat(${boardRows}, ${cell}px)` : 'none',
        gap: `${gap}px`,
        '--cell': `${cell}px`,
        '--gap': `${gap}px`,
      }"
      @pointerdown="onGridPointerDown"
    >
      <Tile
        v-for="entry in resolved"
        :key="entry.tile.key"
        :app="entry.tile.kind === 'app' ? entry.tile.app : undefined"
        :widget="entry.tile.kind === 'widget' ? entry.tile.widget : undefined"
        :cell="cell"
        :gap="gap"
        :max-cols="maxCols"
        :col="entry.pos.col"
        :row="entry.pos.row"
        @remove="entry.tile.kind === 'widget' ? emit('remove-widget', $event) : emit('remove', $event)"
        @resize="onTileResize"
        @open-library="emit('open-library')"
        @open-settings="emit('open-settings')"
      />
      <div
        v-if="editing && dragState.active && dragState.target?.screen === screen"
        class="drop-highlight"
        aria-hidden="true"
        :style="{
          gridColumn: `${dragState.target.col + 1} / span ${dragState.cols}`,
          gridRow: `${dragState.target.row + 1} / span ${dragState.rows}`,
        }"
      ></div>
      <div v-if="tiles.length === 0" class="screen-placeholder">
        <span class="screen-placeholder-text">空屏，打开应用库固定磁块</span>
      </div>
    </div>
    <button
      v-if="editing && isLast"
      type="button"
      class="tile-add tile-add-screen no-drag"
      :style="{ marginTop: `${gap}px`, minHeight: `${cell}px` }"
      @click.stop="emit('add-screen')"
    >
      <span class="tile-add-sign">+</span>
      <span class="tile-add-label">新屏</span>
    </button>
  </section>
</template>

<style scoped>
.screen {
  position: relative;
  flex: 0 0 auto;
}

.screen-grid {
  display: grid;
  align-content: start;
  min-height: 100%;
}

/* 编辑态：棋盘底纹，提示可自由摆放 */
.screen-grid.board {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px);
  background-size: calc(var(--cell) + var(--gap)) calc(var(--cell) + var(--gap));
  background-position: 0 0;
}

.screen-remove {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(22 24 32 / 0.85);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.drop-highlight {
  z-index: 1;
  border-radius: 0;
  background: rgb(255 255 255 / 0.18);
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  pointer-events: none;
}

.tile-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  min-height: 0;
  border: 1.5px dashed rgb(255 255 255 / 0.4);
  background: none;
  color: rgb(255 255 255 / 0.75);
  font-family: inherit;
  cursor: pointer;
}

.tile-add-screen {
  width: 100%;
}

.tile-add-sign {
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
}

.tile-add-label {
  font-size: 11px;
}

.screen-placeholder {
  grid-column: 1 / -1;
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  border: 1.5px dashed rgb(255 255 255 / 0.3);
  pointer-events: none;
}

.screen-placeholder-text {
  color: rgb(255 255 255 / 0.5);
  font-size: 12px;
}
</style>
