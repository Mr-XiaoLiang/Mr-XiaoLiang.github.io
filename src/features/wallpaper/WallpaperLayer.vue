<script setup lang="ts">
import { computed, watch } from 'vue';
import type { WallpaperSetting } from '../../core/types';
import { findBuiltin } from './presets';
import DynamicWallpaper from './DynamicWallpaper.vue';

const props = defineProps<{ setting: WallpaperSetting }>();

const builtin = computed(() => (props.setting.type === 'builtin' ? findBuiltin(props.setting.value) : undefined));

const imageUrl = computed(() => {
  if (props.setting.type !== 'url' && props.setting.type !== 'upload') return '';
  return `url("${props.setting.value.replace(/"/g, '%22')}")`;
});

const colors = computed(() => props.setting.dynamic?.colors ?? ['#3b6ef5', '#8f3bd8', '#1fc8a9']);
const speed = computed(() => props.setting.dynamic?.speed ?? 1);

/** 壁纸明暗决定文字与玻璃配色的明暗方案，写入根元素供全局样式消费 */
const scheme = computed<'dark' | 'light'>(() =>
  props.setting.type === 'builtin' ? builtin.value?.scheme ?? 'dark' : 'dark',
);

watch(
  scheme,
  (value) => {
    document.documentElement.dataset.scheme = value;
  },
  { immediate: true },
);
</script>

<template>
  <div class="wallpaper-layer" aria-hidden="true">
    <div v-if="builtin" class="wallpaper-fill" :style="{ background: builtin.background }" />
    <DynamicWallpaper v-else-if="setting.type === 'dynamic'" :colors="colors" :speed="speed" />
    <div v-else-if="imageUrl" class="wallpaper-fill wallpaper-image" :style="{ backgroundImage: imageUrl }" />
    <div v-else class="wallpaper-fill" />
    <div class="wallpaper-scrim" />
  </div>
</template>

<style scoped>
.wallpaper-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.wallpaper-fill {
  position: absolute;
  inset: 0;
  background: var(--bg);
}

.wallpaper-image {
  background-size: cover;
  background-position: center;
}
</style>
