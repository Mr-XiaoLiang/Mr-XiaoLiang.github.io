<script setup lang="ts">
import { computed } from 'vue';
import { getWidgetDefinition } from './registry';
import { useEditMode } from '../desktop/editState';
import type { WidgetItem } from '../../core/types';

const props = defineProps<{
  widget: WidgetItem;
  /** 当前网格列数，跨度超限时收敛 */
  maxCols: number;
  maxRows: number;
}>();

const emit = defineEmits<{
  (e: 'remove', id: string): void;
}>();

const { editing } = useEditMode();

const definition = computed(() => getWidgetDefinition(props.widget.type));

const span = computed(() => {
  const def = definition.value;
  if (!def) return { cols: 1, rows: 1 };
  const size = def.spans[props.widget.size] ?? def.spans[def.defaultSize];
  return {
    cols: Math.max(1, Math.min(size.cols, props.maxCols)),
    rows: Math.max(1, Math.min(size.rows, props.maxRows)),
  };
});

const tileStyle = computed(() => ({
  gridColumn: `span ${span.value.cols}`,
  gridRow: `span ${span.value.rows}`,
}));
</script>

<template>
  <div v-if="definition" class="widget-tile" :style="tileStyle" :data-widget-id="widget.id">
    <component :is="definition.component" v-bind="widget.props" :size="widget.size" />
    <span
      v-if="editing"
      class="widget-remove no-drag"
      role="button"
      aria-label="移除小组件"
      @click.stop="emit('remove', widget.id)"
      >−</span
    >
  </div>
</template>

<style scoped>
.widget-tile {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  border-radius: 20px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.22);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  color: var(--text);
}

.widget-tile > * {
  flex: 1;
  min-width: 0;
}

.widget-remove {
  position: absolute;
  top: -8px;
  left: -8px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(22 24 32 / 0.88);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
  cursor: pointer;
}
</style>
