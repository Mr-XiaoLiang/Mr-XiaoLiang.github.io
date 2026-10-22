<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useConfigStore } from '../../stores/config';
import { useLayoutMetrics } from '../../composables/useLayoutMetrics';
import { screenWidthPx } from '../../core/grid';
import { useEditMode } from './editState';
import WallpaperLayer from '../wallpaper/WallpaperLayer.vue';
import ScreenGrid from './ScreenGrid.vue';
import EditToolbar from './EditToolbar.vue';
import AddAppPanel from './AddAppPanel.vue';
import type { AddAppPayload } from './AddAppPanel.vue';
import AppLibrary from '../library/AppLibrary.vue';
import SettingsPanel from '../settings/SettingsPanel.vue';
import type { LayoutSetting } from '../../core/types';

const store = useConfigStore();
const { editing, enter, exit } = useEditMode();

const area = ref<HTMLElement | null>(null);
const layout = computed<LayoutSetting>(
  () => store.config?.layout ?? { density: 'regular', screenWidth: 6 },
);
const { metrics } = useLayoutMetrics(area, layout);

const screens = computed(() => Array.from({ length: store.screenCount }, (_, index) => index));
const screenWidth = computed(() => screenWidthPx(metrics.value));

const addingApp = ref(false);
const libraryOpen = ref(false);
const settingsOpen = ref(false);

// 长按进入编辑模式
let pressTimer = 0;
function cancelPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (editing.value) return;
  cancelPress();
  pressTimer = window.setTimeout(() => {
    pressTimer = 0;
    enter();
  }, 500);
}

function onPointerUp() {
  cancelPress();
}

function onResize(id: string, cols: number, rows: number) {
  store.resizeTile(id, cols, rows);
}

// 退出编辑模式时压缩布局：移除空屏（dense 排布下空行不会残留）
watch(editing, (active) => {
  if (!active) store.compactScreens();
});

function onAddApp(payload: AddAppPayload) {
  store.addUserApp(payload, 0);
  addingApp.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (addingApp.value) addingApp.value = false;
    else if (libraryOpen.value) libraryOpen.value = false;
    else if (settingsOpen.value) settingsOpen.value = false;
    else if (editing.value) exit();
    return;
  }
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
});
</script>

<template>
  <WallpaperLayer v-if="store.config" :setting="store.config.wallpaper" />
  <main class="desktop" @pointerdown="onPointerDown">
    <EditToolbar v-if="editing" />
    <div ref="area" class="screens-scroll">
      <div class="screens" :style="{ gap: `${metrics.screenGap}px` }">
        <ScreenGrid
          v-for="screen in screens"
          :key="screen"
          :screen="screen"
          :tiles="store.tilesOnScreen(screen)"
          :cell="metrics.cell"
          :gap="metrics.gap"
          :max-cols="metrics.screenWidth"
          :is-last="screen === screens.length - 1"
          :style="{ width: `${screenWidth}px` }"
          @remove="store.unpinApp"
          @remove-widget="store.removeWidget"
          @resize="onResize"
          @add-app="addingApp = true"
          @add-screen="store.addScreen"
          @open-library="libraryOpen = true"
          @remove-screen="store.removeScreen(screen)"
        />
      </div>
    </div>
  </main>
  <transition name="panel">
    <AddAppPanel v-if="addingApp" @close="addingApp = false" @submit="onAddApp" />
  </transition>
  <transition name="library">
    <AppLibrary v-if="libraryOpen" @close="libraryOpen = false" />
  </transition>
  <transition name="panel">
    <SettingsPanel v-if="settingsOpen" @close="settingsOpen = false" />
  </transition>
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
  user-select: none;
}

.screens-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: max(16px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
}

.screens {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
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

/* 浮层转场：淡入加轻微上移 */
.panel-enter-active,
.panel-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
