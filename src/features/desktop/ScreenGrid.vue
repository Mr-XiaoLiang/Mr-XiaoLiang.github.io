<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Sortable from 'sortablejs';
import Tile from './Tile.vue';
import { useEditMode } from './editState';
import { handleTileDrop } from './dragSync';
import type { DesktopTile } from '../../core/types';

defineProps<{
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

const root = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;

function createSortable(element: HTMLElement) {
  sortable = new Sortable(element, {
    group: 'tiles',
    animation: 200,
    draggable: '.tile',
    filter: '.no-drag',
    // 避免 SortableJS 对过滤元素调用 preventDefault 吞掉点击（徽标、手柄、添加瓦片）
    preventOnFilter: false,
    ghostClass: 'tile-ghost',
    onEnd: handleTileDrop,
  });
}

// 编辑状态变化时挂载或销毁拖拽
watch(editing, (active) => {
  if (active && root.value && !sortable) {
    createSortable(root.value);
  } else if (!active && sortable) {
    sortable.destroy();
    sortable = null;
  }
});

// 编辑模式中新增的屏（如新屏瓦片）挂载时即补建拖拽实例
onMounted(() => {
  if (editing.value && root.value && !sortable) {
    createSortable(root.value);
  }
});

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});

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
      :data-screen-list="screen"
      :style="{
        gridTemplateColumns: `repeat(${maxCols}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
        gap: `${gap}px`,
        minHeight: `${cell * 2 + gap}px`,
      }"
    >
      <Tile
        v-for="tile in tiles"
        :key="tile.key"
        :app="tile.kind === 'app' ? tile.app : undefined"
        :widget="tile.kind === 'widget' ? tile.widget : undefined"
        :cell="cell"
        :gap="gap"
        :max-cols="maxCols"
        @remove="tile.kind === 'widget' ? emit('remove-widget', $event) : emit('remove', $event)"
        @resize="onTileResize"
        @open-library="emit('open-library')"
        @open-settings="emit('open-settings')"
      />
      <button
        v-if="editing && isLast"
        type="button"
        class="tile-add tile-add-screen no-drag"
        @click.stop="emit('add-screen')"
      >
        <span class="tile-add-sign">+</span>
        <span class="tile-add-label">新屏</span>
      </button>
      <div v-if="tiles.length === 0" class="screen-placeholder">
        <span class="screen-placeholder-text">空屏，打开应用库固定磁块</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.screen {
  position: relative;
  flex: 0 0 auto;
}

.screen-grid {
  display: grid;
  grid-auto-flow: row dense;
  align-content: start;
  min-height: 100%;
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
  align-self: start;
}

.tile-add-sign {
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
}

.tile-add-label {
  font-size: 11px;
}

/* 空屏占位：标示屏范围，引导拖入磁块 */
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
