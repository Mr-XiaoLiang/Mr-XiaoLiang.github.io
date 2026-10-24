<script setup lang="ts">
import { computed, ref } from 'vue';
import { getWidgetDefinition } from '../../widgets';
import TileFace from './TileFace.vue';
import { useEditMode } from './editState';
import { tileColorFor } from '../../core/theme';
import { LIBRARY_TILE_ID, isValidTileSize, MAX_TILE_SPAN, SETTINGS_TILE_ID, type AppItem, type WidgetItem } from '../../core/types';

const props = defineProps<{
  app?: AppItem;
  widget?: WidgetItem;
  /** 单元格边长（px） */
  cell: number;
  /** 格间距（px） */
  gap: number;
  /** 当前屏宽（格），尺寸钳制上限 */
  maxCols: number;
  /** 显式列坐标（格），由打包引擎计算 */
  col: number;
  /** 显式行坐标（格），由打包引擎计算 */
  row: number;
}>();

const emit = defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'resize', id: string, cols: number, rows: number): void;
  (e: 'open-library'): void;
  (e: 'open-settings'): void;
}>();

const { editing } = useEditMode();

/** favicon 全部候选失败的磁块 id，降级为首字色块 */
const faviconFailedId = ref('');

/** 跳转前卡片翻转动画时长（与 CSS 中 .tile-flip 的 transition 时长保持一致） */
const FLIP_MS = 350;
/** 是否正在翻转（翻转期间拒绝重复触发） */
const flipping = ref(false);

const isLibrary = computed(() => props.app?.id === LIBRARY_TILE_ID);
const isSettings = computed(() => props.app?.id === SETTINGS_TILE_ID);
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

/** 双维均不小于 2 格时展示名称 */
const isBig = computed(() => displayCols.value >= 2 && displayRows.value >= 2);
/** 小组件只要列宽足够即渲染实时内容（高度 1 也显示，不再回退为问号） */
const showLive = computed(() => isWidget.value && displayCols.value >= 2);
/** 应用库磁块放大到 2×2 及以上时，以 3×3 翻转方块 live tile 替代静态图标 */
const isLibraryLive = computed(() => isLibrary.value && isBig.value);
const showName = computed(
  () => isBig.value && !definition.value?.hideTileName && !showLive.value && !isLibraryLive.value,
);

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
    // 小组件以声明的最小尺寸为下界，允许 1 行宽条等自由尺寸；应用磁块沿用通用吸附
    preview.value = isWidget.value ? { cols, rows } : snapSize(cols, rows);
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
  // 编辑态下拦截所有磁块点击，仅保留拖拽、调尺寸、取消固定等编辑操作
  if (editing.value) return;
  if (isLibrary.value) {
    emit('open-library');
    return;
  }
  if (isSettings.value) {
    emit('open-settings');
    return;
  }
  const url = props.widget ? (props.widget.props.url as string | undefined) : props.app?.url;
  if (!url || flipping.value) return;
  // 点击跳转：先做一次卡片翻转（翻过去仍是当前图标），翻转到位后再打开目标网址，随后翻转回正面
  flipping.value = true;
  window.setTimeout(() => {
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => {
      flipping.value = false;
    }, FLIP_MS);
  }, FLIP_MS);
}
</script>

<template>
  <div
    class="tile"
    :class="{ 'tile-editing': editing, 'tile-library': isLibrary }"
    :style="{
      gridColumn: `${col + 1} / span ${displayCols}`,
      gridRow: `${row + 1} / span ${displayRows}`,
      background: color,
    }"
    :data-tile-id="tileId"
    :data-widget-id="widget ? widget.id : undefined"
    role="button"
    :aria-label="app?.name ?? '小组件'"
    @click="activate"
  >
    <div class="tile-flip" :class="{ 'tile-flipping': flipping }">
      <TileFace
        class="tile-face tile-front"
        :app="app"
        :widget="widget"
        :full-icon="fullIcon"
        :color="color"
        :name="name"
        :name-size="nameSize"
        :is-library="isLibrary"
        :is-settings="isSettings"
        :is-library-live="isLibraryLive"
        :show-live="showLive"
        :show-name="showName"
        :is-big="isBig"
        :favicon-failed="faviconFailedId === tileId"
        :component="definition?.component"
        @favicon-failed="faviconFailedId = tileId"
      />
      <TileFace
        class="tile-face tile-back"
        :app="app"
        :widget="widget"
        :full-icon="fullIcon"
        :color="color"
        :name="name"
        :name-size="nameSize"
        :is-library="isLibrary"
        :is-settings="isSettings"
        :is-library-live="isLibraryLive"
        :show-live="showLive"
        :show-name="showName"
        :is-big="isBig"
        :favicon-failed="faviconFailedId === tileId"
        :component="definition?.component"
        @favicon-failed="faviconFailedId = tileId"
      />
    </div>

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
  /* 编辑态下磁块自身可拖拽，禁用触摸滚动接管，保证跟手 */
  touch-action: none;
}

/* 编辑态拦截磁块内容的鼠标操作：仅保留拖拽、调尺寸、取消固定等编辑手势 */
.tile-editing .tile-flip {
  pointer-events: none;
}

.tile-dragging {
  position: fixed !important;
  z-index: 1000 !important;
  margin: 0 !important;
  /* 禁用过渡与按压缩放，保证位移逐帧跟手（行内 transform 始终由拖拽框架写入） */
  transition: none !important;
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.55);
  cursor: grabbing;
}

/* 卡片翻转容器：占据磁块全幅，透视用 transform 内联表达，避免把 perspective 加到
   .tile 上令其建立 stacking context 而把手柄的 z-index 困在磁贴内部 */
.tile-flip {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: perspective(900px) rotateY(0deg);
  transition: transform 0.35s ease;
}

.tile-flip.tile-flipping {
  transform: perspective(900px) rotateY(180deg);
}

.tile-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.tile-back {
  transform: rotateY(180deg);
}

.tile-remove {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 2;
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
  z-index: 2;
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
