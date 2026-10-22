<script setup lang="ts">
import { computed, ref } from 'vue';
import { getWidgetDefinition } from '../widgets/registry';
import { useEditMode } from './editState';
import { tileColorFor } from '../../core/theme';
import { LIBRARY_TILE_ID, isValidTileSize, MAX_TILE_SPAN, type AppItem, type WidgetItem } from '../../core/types';

const props = defineProps<{
  app?: AppItem;
  widget?: WidgetItem;
  /** 单元格边长（px） */
  cell: number;
  /** 格间距（px） */
  gap: number;
  /** 当前屏宽（格），尺寸钳制上限 */
  maxCols: number;
}>();

const emit = defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'resize', id: string, cols: number, rows: number): void;
  (e: 'open-library'): void;
}>();

const { editing } = useEditMode();

const isLibrary = computed(() => props.app?.id === LIBRARY_TILE_ID);
const tileId = computed(() => props.app?.id ?? props.widget?.id ?? '');
const isWidget = computed(() => !!props.widget);

const baseCols = computed(() => {
  if (props.widget) return props.widget.size.cols;
  return props.app?.placement.kind === 'tile' ? props.app.placement.cols : 1;
});
const baseRows = computed(() => {
  if (props.widget) return props.widget.size.rows;
  return props.app?.placement.kind === 'tile' ? props.app.placement.rows : 1;
});

const minCols = computed(() => (props.widget ? getWidgetDefinition(props.widget.type)?.minSize.cols ?? 2 : 1));
const minRows = computed(() => (props.widget ? getWidgetDefinition(props.widget.type)?.minSize.rows ?? 2 : 1));

/** 拖拽调尺寸过程中的预览值 */
const preview = ref<{ cols: number; rows: number } | null>(null);
const displayCols = computed(() => preview.value?.cols ?? baseCols.value);
const displayRows = computed(() => preview.value?.rows ?? baseRows.value);

const name = computed(() => {
  if (props.widget) return getWidgetDefinition(props.widget.type)?.name ?? '小组件';
  return props.app?.name ?? '';
});
const definition = computed(() => (props.widget ? getWidgetDefinition(props.widget.type) : undefined));

const color = computed(() => props.app?.color || tileColorFor(tileId.value));
const fullIcon = computed(() => props.app?.fullIcon ?? '');

/** 双维均不小于 2 格时展示名称与动态内容 */
const isBig = computed(() => displayCols.value >= 2 && displayRows.value >= 2);
const showName = computed(() => isBig.value && !definition.value?.hideTileName);
const showLive = computed(() => isWidget.value && isBig.value);

const nameSize = computed(() => Math.min(15, Math.max(11, Math.round(props.cell * 0.15))));

/** 将任意尺寸吸附到合法尺寸（一边为 1 时另一边不超过 2） */
function snapSize(cols: number, rows: number): { cols: number; rows: number } {
  if (isValidTileSize(cols, rows)) return { cols, rows };
  if (cols === 1 || rows === 1) {
    return { cols: Math.min(cols, 2), rows: Math.min(rows, 2) };
  }
  return { cols, rows };
}

function onResizeDown(event: PointerEvent) {
  if (!editing.value) return;
  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startY = event.clientY;
  const startCols = baseCols.value;
  const startRows = baseRows.value;
  const unit = props.cell + props.gap;

  const move = (moveEvent: PointerEvent) => {
    const dx = Math.round((moveEvent.clientX - startX) / unit);
    const dy = Math.round((moveEvent.clientY - startY) / unit);
    const cols = Math.min(Math.max(startCols + dx, minCols.value), Math.min(props.maxCols, MAX_TILE_SPAN));
    const rows = Math.min(Math.max(startRows + dy, minRows.value), MAX_TILE_SPAN);
    preview.value = snapSize(cols, rows);
  };

  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (preview.value) {
      emit('resize', tileId.value, preview.value.cols, preview.value.rows);
    }
    preview.value = null;
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function activate() {
  if (editing.value) return;
  if (isLibrary.value) {
    emit('open-library');
    return;
  }
  const url = props.widget ? (props.widget.props.url as string | undefined) : props.app?.url;
  if (url) window.open(url, '_blank', 'noopener');
}
</script>

<template>
  <div
    class="tile"
    :class="{ 'tile-editing': editing, 'tile-library': isLibrary }"
    :style="{
      gridColumn: `span ${displayCols}`,
      gridRow: `span ${displayRows}`,
      background: color,
    }"
    :data-tile-id="tileId"
    :data-widget-id="widget ? widget.id : undefined"
    role="button"
    :aria-label="app?.name ?? '小组件'"
    @click="activate"
  >
    <img v-if="fullIcon" class="tile-full" :src="fullIcon" :alt="app?.name ?? ''" draggable="false" />
    <template v-else>
      <component :is="definition?.component" v-if="showLive && widget" v-bind="widget.props" class="tile-live" />
      <div v-else class="tile-icon" :class="{ 'tile-icon-center': !isBig }">
        <svg v-if="isLibrary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" />
          <rect x="13" y="3" width="8" height="8" opacity="0.55" />
          <rect x="3" y="13" width="8" height="8" opacity="0.55" />
          <rect x="13" y="13" width="8" height="8" />
        </svg>
        <img v-else-if="app?.icon" :src="app.icon" :alt="app?.name ?? ''" draggable="false" />
        <span v-else class="tile-initial">{{ (app?.name ?? '?').trim().charAt(0).toUpperCase() }}</span>
      </div>
    </template>

    <span v-if="showName" class="tile-name" :style="{ fontSize: `${nameSize}px` }">{{ name }}</span>

    <span
      v-if="editing && !isLibrary"
      class="tile-remove no-drag"
      role="button"
      :aria-label="widget ? '移除小组件' : '取消固定'"
      @click.stop="emit('remove', tileId)"
      >−</span
    >
    <span v-if="editing" class="tile-resize no-drag" role="button" aria-label="调整尺寸" @pointerdown="onResizeDown">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
        <polyline points="6.5 11.5 6.5 6.5 11.5 6.5" />
        <polyline points="12.5 17.5 17.5 17.5 17.5 12.5" />
      </svg>
    </span>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  container-type: size;
  border-radius: 0;
  color: #fff;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    filter 0.15s ease,
    transform 0.15s ease;
}

.tile:hover {
  filter: brightness(1.08);
}

.tile:active {
  transform: scale(0.97);
}

.tile-editing {
  outline: 2px solid rgb(255 255 255 / 0.28);
  outline-offset: -2px;
}

.tile-full {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tile-live {
  position: absolute;
  inset: 0;
}

.tile-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12%;
}

.tile-icon-center {
  align-items: center;
  justify-content: center;
  padding: 18%;
}

.tile-icon img,
.tile-icon svg {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.tile-initial {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-weight: 600;
  font-size: 140%;
}

.tile-name {
  position: absolute;
  left: 7%;
  bottom: 5%;
  max-width: 86%;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgb(0 0 0 / 0.55);
}

.tile-remove {
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

.tile-resize {
  position: absolute;
  right: -9px;
  bottom: -9px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.92);
  color: #1b1e26;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
  cursor: nwse-resize;
  touch-action: none;
}

.tile-resize svg {
  width: 15px;
  height: 15px;
}
</style>
