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
import SettingsPanel from '../settings/SettingsPanel.vue';
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
const settingsOpen = ref(false);

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
    else if (settingsOpen.value) settingsOpen.value = false;
    else if (libraryOpen.value) libraryOpen.value = false;
    else if (editing.value) exit();
    return;
  }
  if (libraryOpen.value || widgetGalleryPage.value !== null || settingsOpen.value || editing.value) return;
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
  <SettingsPanel v-if="settingsOpen" @close="settingsOpen = false" />
  <button
    type="button"
    class="settings-gear"
    aria-label="打开设置"
    title="设置"
    @click.stop="settingsOpen = true"
  >
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.2 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      />
    </svg>
  </button>
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

.settings-gear {
  position: fixed;
  top: max(14px, env(safe-area-inset-top));
  right: max(14px, env(safe-area-inset-right));
  z-index: 10;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  background: var(--glass-bg);
  color: var(--text-secondary);
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: color 0.2s ease;
}

.settings-gear:hover {
  color: var(--text);
}
</style>
