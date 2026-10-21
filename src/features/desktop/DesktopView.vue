<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useConfigStore } from '../../stores/config';
import { useGridMetrics } from '../../composables/useGridMetrics';
import { useEditMode } from './editState';
import WallpaperLayer from '../wallpaper/WallpaperLayer.vue';
import PageView from './PageView.vue';
import Dock from './Dock.vue';
import EditToolbar from './EditToolbar.vue';
import AddAppPanel, { type AddAppPayload } from './AddAppPanel.vue';
import AppLibrary from '../library/AppLibrary.vue';
import WidgetGallery from '../widgets/WidgetGallery.vue';
import type { LayoutSetting } from '../../core/types';

const store = useConfigStore();
const { editing, dragging, enter, exit } = useEditMode();

const area = ref<HTMLElement | null>(null);
const layout = computed<LayoutSetting>(() => store.config?.layout ?? { mode: 'auto', density: 'regular' });
const { metrics } = useGridMetrics(area, layout);

const pageCount = computed(() => store.pageCount);
const current = ref(0);
const pages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index));
const pagesWithItems = computed(() => pages.value.map((page) => ({ page, items: store.pageItems(page) })));
const addingPage = ref<number | null>(null);
const widgetGalleryPage = ref<number | null>(null);
const libraryOpen = ref(false);

// 滑动翻页 + 长按进入编辑模式
const tracking = ref(false);
const deltaX = ref(0);
let startX = 0;
let startY = 0;
let pressTimer = 0;

const trackStyle = computed(() => ({
  transform: `translate3d(calc(${-current.value * 100}% + ${deltaX.value}px), 0, 0)`,
  transition: tracking.value ? 'none' : 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
}));

function go(page: number): boolean {
  const next = Math.min(Math.max(page, 0), pageCount.value - 1);
  if (next === current.value) return false;
  current.value = next;
  return true;
}

function cancelPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  tracking.value = true;
  startX = event.clientX;
  startY = event.clientY;
  deltaX.value = 0;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  if (!editing.value) {
    cancelPress();
    pressTimer = window.setTimeout(() => {
      pressTimer = 0;
      enter();
    }, 500);
  }
}

function onPointerMove(event: PointerEvent) {
  if (!tracking.value) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  if (Math.abs(dx) > Math.abs(dy)) deltaX.value = dx;
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelPress();
}

function onPointerUp() {
  if (!tracking.value) return;
  tracking.value = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  cancelPress();
  // 图标拖拽进行中，翻页交由边缘检测处理
  if (dragging.value) {
    deltaX.value = 0;
    return;
  }
  const width = area.value?.clientWidth ?? 0;
  if (deltaX.value <= -width * 0.16) {
    // 末页继续左滑进入应用库
    if (current.value === pageCount.value - 1) libraryOpen.value = true;
    else go(current.value + 1);
  } else if (deltaX.value >= width * 0.16) {
    go(current.value - 1);
  }
  deltaX.value = 0;
}

// 拖拽图标至屏幕边缘自动翻页
let lastSwitchAt = 0;
function onDragPointerMove(event: PointerEvent) {
  const now = Date.now();
  if (now - lastSwitchAt < 400) return;
  const edge = 28;
  if (event.clientX <= edge) {
    if (go(current.value - 1)) lastSwitchAt = now;
  } else if (event.clientX >= window.innerWidth - edge) {
    if (go(current.value + 1)) lastSwitchAt = now;
  }
}

watch(dragging, (active) => {
  if (active) window.addEventListener('pointermove', onDragPointerMove);
  else window.removeEventListener('pointermove', onDragPointerMove);
});

// 页数减少时收敛当前页，避免越界
watch(pageCount, (count) => {
  if (current.value > count - 1) current.value = count - 1;
});

function onAddApp(payload: AddAppPayload) {
  if (addingPage.value === null) return;
  store.addUserApp(payload, addingPage.value);
  addingPage.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (addingPage.value !== null) addingPage.value = null;
    else if (widgetGalleryPage.value !== null) widgetGalleryPage.value = null;
    else if (libraryOpen.value) libraryOpen.value = false;
    else if (editing.value) exit();
    return;
  }
  if (libraryOpen.value || widgetGalleryPage.value !== null || editing.value) return;
  if (event.key === 'ArrowRight') go(current.value + 1);
  else if (event.key === 'ArrowLeft') go(current.value - 1);
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <WallpaperLayer v-if="store.config" :setting="store.config.wallpaper" />
  <main class="desktop" @pointerdown="onPointerDown">
    <EditToolbar v-if="editing" />
    <div ref="area" class="pages-area">
      <div class="pages-track" :style="trackStyle">
        <section v-for="entry in pagesWithItems" :key="entry.page" class="page-slot">
          <PageView
            :page="entry.page"
            :items="entry.items"
            :metrics="metrics"
            @remove="store.removeToLibrary"
            @remove-widget="store.removeWidget"
            @add="addingPage = $event"
            @add-widget="widgetGalleryPage = $event"
          />
        </section>
      </div>
    </div>
    <div class="bottom-chrome">
      <div class="dots">
        <span v-for="page in pages" :key="page" class="dot-wrap">
          <button
            type="button"
            class="dot"
            :class="{ active: page === current }"
            :aria-label="`第 ${page + 1} 页`"
            :aria-current="page === current ? 'page' : undefined"
            @click.stop="go(page)"
          />
          <button
            v-if="editing && pages.length > 1"
            type="button"
            class="dot-remove"
            :aria-label="`删除第 ${page + 1} 页`"
            @click.stop="store.removePage(page)"
          >
            ×
          </button>
        </span>
        <button v-if="editing" type="button" class="dot-add" aria-label="新建页面" @click.stop="store.addPage">
          +
        </button>
      </div>
      <Dock :apps="store.dockApps" :cell="metrics.cell" @remove="store.removeToLibrary" @open-library="libraryOpen = true" />
    </div>
  </main>
  <AddAppPanel
    v-if="addingPage !== null"
    :page="addingPage"
    @close="addingPage = null"
    @submit="onAddApp"
  />
  <WidgetGallery
    v-if="widgetGalleryPage !== null"
    :page="widgetGalleryPage"
    @close="widgetGalleryPage = null"
  />
  <transition name="library">
    <AppLibrary v-if="libraryOpen" :current-page="current" @close="libraryOpen = false" />
  </transition>
</template>

<style scoped>
.desktop {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: max(16px, env(safe-area-inset-top)) 0 max(12px, env(safe-area-inset-bottom));
  user-select: none;
}

.pages-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  touch-action: pan-y;
}

.pages-track {
  display: flex;
  height: 100%;
  will-change: transform;
}

.page-slot {
  flex: 0 0 100%;
  height: 100%;
  padding: 0 20px;
}

.bottom-chrome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 6px;
}

.dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot-wrap {
  position: relative;
  display: grid;
  place-items: center;
}

.dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--dot);
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.dot.active {
  background: var(--dot-active);
  transform: scale(1.15);
}

.dot-remove {
  position: absolute;
  top: -13px;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(22 24 32 / 0.85);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.dot-add {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  padding: 0;
  border: 1px dashed var(--dot-active);
  border-radius: 50%;
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
</style>
