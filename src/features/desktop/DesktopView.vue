<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useConfigStore } from '../../stores/config';
import { useLayoutMetrics } from '../../composables/useLayoutMetrics';
import { screenWidthPx } from '../../core/grid';
import { setScrollContainer } from '../../core/drag';
import { useEditMode } from './editState';
import WallpaperLayer from '../wallpaper/WallpaperLayer.vue';
import ScreenGrid from './ScreenGrid.vue';
import EditToolbar from './EditToolbar.vue';
import AddAppPanel from './AddAppPanel.vue';
import type { AddAppPayload } from './AddAppPanel.vue';
import AddWidgetPanel from './AddWidgetPanel.vue';
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
const addingWidget = ref(false);
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

// 退出编辑模式（保存）时压缩布局：删除完全空着的行与屏，使内容连续
watch(editing, (active) => {
  if (!active) store.compactLayout();
});

function onAddApp(payload: AddAppPayload) {
  store.addUserApp(payload, 0);
  addingApp.value = false;
}

function onOpenSettings() {
  libraryOpen.value = false;
  settingsOpen.value = true;
}

// 自定义应用：从应用库进入，关闭库后打开表单
function onAddCustomApp() {
  libraryOpen.value = false;
  addingApp.value = true;
}

// 自定义小组件：从应用库进入，关闭库后打开加载表单
function onAddCustomWidget() {
  libraryOpen.value = false;
  addingWidget.value = true;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (addingApp.value) addingApp.value = false;
    else if (addingWidget.value) addingWidget.value = false;
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
  setScrollContainer(area.value);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  setScrollContainer(null);
});
</script>

<template>
  <WallpaperLayer v-if="store.config" :setting="store.config.wallpaper" />
  <main class="desktop" @pointerdown="onPointerDown">
    <EditToolbar v-if="editing" />
    <div
      ref="area"
      class="screens-scroll"
      :style="{ paddingLeft: `${metrics.paddingX}px`, paddingRight: `${metrics.paddingX}px` }"
    >
      <div class="screens" :style="{ gap: `${metrics.screenGap}px` }">
        <ScreenGrid
          v-for="screen in screens"
          :key="screen"
          :screen="screen"
          :tiles="store.tilesOnScreen(screen)"
          :cell="metrics.cell"
          :gap="metrics.gap"
          :base-cell="metrics.baseCell"
          :base-gap="metrics.baseGap"
          :max-cols="metrics.screenWidth"
          :is-last="screen === screens.length - 1"
          :style="{ width: `${screenWidth}px` }"
          @remove="store.unpinApp"
          @remove-widget="store.removeWidget"
          @resize="onResize"
          @add-screen="store.addScreen"
          @open-library="libraryOpen = true"
          @open-settings="onOpenSettings"
        />
      </div>
    </div>
  </main>
  <transition name="flat">
    <AddAppPanel v-if="addingApp" @close="addingApp = false" @submit="onAddApp" />
  </transition>
  <transition name="flat">
    <AddWidgetPanel v-if="addingWidget" @close="addingWidget = false" />
  </transition>
  <transition name="flat">
    <AppLibrary
      v-if="libraryOpen"
      :current-screen="0"
      @close="libraryOpen = false"
      @open-settings="onOpenSettings"
      @add-custom-app="onAddCustomApp"
      @add-custom-widget="onAddCustomWidget"
    />
  </transition>
  <transition name="flat">
    <SettingsPanel v-if="settingsOpen" @close="settingsOpen = false" />
  </transition>
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
  /* 左右边距由布局比例尺 metrics.paddingX 内联控制，与可用宽度计算保持一致 */
  padding: max(16px, env(safe-area-inset-top)) 0 max(24px, env(safe-area-inset-bottom));
}

.screens {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}
</style>
