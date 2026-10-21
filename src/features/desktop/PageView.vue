<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Sortable from 'sortablejs';
import AppIcon from './AppIcon.vue';
import WidgetTile from '../widgets/WidgetTile.vue';
import { useEditMode } from './editState';
import { syncDomOrderToStore } from './dragSync';
import type { DesktopItem } from '../../core/types';
import type { GridMetrics } from '../../core/grid';

const props = defineProps<{
  page: number;
  items: DesktopItem[];
  metrics: GridMetrics;
}>();

const emit = defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'remove-widget', id: string): void;
  (e: 'add', page: number): void;
  (e: 'add-widget', page: number): void;
}>();

const { editing, dragging } = useEditMode();

const root = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;

const addTileSize = computed(() => Math.round(props.metrics.cell * 0.6));

function handleDrop() {
  dragging.value = false;
  syncDomOrderToStore();
}

function createSortable(element: HTMLElement) {
  sortable = new Sortable(element, {
    group: 'apps',
    animation: 200,
    draggable: '.app-icon, .widget-tile',
    filter: '.no-drag',
    // 避免 SortableJS 对过滤元素调用 preventDefault 吞掉点击（移除徽标、添加瓦片）
    preventOnFilter: false,
    ghostClass: 'icon-ghost',
    onStart: () => {
      dragging.value = true;
      const clear = () => {
        dragging.value = false;
      };
      window.addEventListener('pointerup', clear, { once: true });
      window.addEventListener('pointercancel', clear, { once: true });
    },
    onEnd: handleDrop,
  });
}

// 仅在编辑模式下挂载拖拽，避免与常规点击和翻页手势冲突
watch(
  editing,
  (active) => {
    if (active && root.value && !sortable) {
      createSortable(root.value);
    } else if (!active && sortable) {
      sortable.destroy();
      sortable = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>

<template>
  <div
    ref="root"
    class="page"
    :data-page-list="page"
    :style="{
      gridTemplateColumns: `repeat(${metrics.cols}, ${metrics.cell}px)`,
      gridAutoRows: `${metrics.cell}px`,
      gap: `${metrics.gap}px`,
    }"
  >
    <template v-for="item in items" :key="item.key">
      <AppIcon
        v-if="item.kind === 'app'"
        :app="item.app"
        :cell="metrics.cell"
        :data-app-id="item.app.id"
        @remove="emit('remove', $event)"
      />
      <WidgetTile
        v-else
        :widget="item.widget"
        :max-cols="metrics.cols"
        :max-rows="metrics.rows"
        @remove="emit('remove-widget', $event)"
      />
    </template>
    <button v-if="editing" type="button" class="page-add no-drag" @click="emit('add', page)">
      <span class="page-add-sign" :style="{ width: `${addTileSize}px`, height: `${addTileSize}px` }">+</span>
      <span class="page-add-label">添加</span>
    </button>
    <button v-if="editing" type="button" class="page-add page-add-widget no-drag" @click="emit('add-widget', page)">
      <span class="page-add-sign page-add-glyph" :style="{ width: `${addTileSize}px`, height: `${addTileSize}px` }" />
      <span class="page-add-label">组件</span>
    </button>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-auto-flow: row dense;
  align-content: start;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 8px 0;
}

.page-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-family: inherit;
  cursor: pointer;
}

.page-add-sign {
  display: grid;
  place-items: center;
  border: 1.5px dashed var(--dot-active);
  border-radius: 24%;
  font-size: 26px;
  font-weight: 300;
  line-height: 1;
}

.page-add-glyph {
  background:
    radial-gradient(circle at 28% 28%, currentColor 2.4px, transparent 2.5px),
    radial-gradient(circle at 72% 28%, currentColor 2.4px, transparent 2.5px),
    radial-gradient(circle at 28% 72%, currentColor 2.4px, transparent 2.5px),
    radial-gradient(circle at 72% 72%, currentColor 2.4px, transparent 2.5px);
}

.page-add-label {
  font-size: 12px;
}
</style>
