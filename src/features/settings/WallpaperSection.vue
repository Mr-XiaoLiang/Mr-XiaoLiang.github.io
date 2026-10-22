<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useConfigStore } from '../../stores/config';
import { BUILTIN_WALLPAPERS } from '../wallpaper/presets';
import DynamicWallpaper from '../wallpaper/DynamicWallpaper.vue';
import { fileToCompressedDataUrl } from '../../core/image';
import type { WallpaperType } from '../../core/types';

const store = useConfigStore();

const TABS: { type: WallpaperType; label: string }[] = [
  { type: 'builtin', label: '内置' },
  { type: 'url', label: '在线图片' },
  { type: 'upload', label: '本地上传' },
  { type: 'dynamic', label: '动态光晕' },
];

const DEFAULT_COLORS = ['#3b6ef5', '#8f3bd8', '#1fc8a9'];

const wallpaper = computed(
  () => store.config?.wallpaper ?? { type: 'builtin' as WallpaperType, value: 'nebula' },
);

const tab = ref<WallpaperType>(wallpaper.value.type);
const urlInput = ref(wallpaper.value.type === 'url' ? wallpaper.value.value : '');
const urlError = ref('');
const uploadError = ref('');
const dynamicColors = ref<string[]>([...(wallpaper.value.dynamic?.colors ?? DEFAULT_COLORS)]);
const dynamicSpeed = ref(wallpaper.value.dynamic?.speed ?? 1);

// 动态壁纸参数变更即时生效
watch(
  [dynamicColors, dynamicSpeed],
  () => {
    store.setWallpaper({
      type: 'dynamic',
      value: '',
      dynamic: { colors: [...dynamicColors.value], speed: dynamicSpeed.value },
    });
  },
  { deep: true },
);

function selectTab(type: WallpaperType) {
  tab.value = type;
  // 切到动态页时立即应用，保证所见即所得
  if (type === 'dynamic') {
    store.setWallpaper({
      type: 'dynamic',
      value: '',
      dynamic: { colors: [...dynamicColors.value], speed: dynamicSpeed.value },
    });
  }
}

function applyUrl() {
  const value = urlInput.value.trim();
  if (!value) {
    urlError.value = '请输入图片地址';
    return;
  }
  urlError.value = '';
  store.setWallpaper({ type: 'url', value });
}

async function onUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploadError.value = '';
  try {
    const dataUrl = await fileToCompressedDataUrl(file);
    store.setWallpaper({ type: 'upload', value: dataUrl });
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : '上传失败';
  }
  // 允许再次选择同一文件
  input.value = '';
}
</script>

<template>
  <section class="flat-section">
    <h3 class="flat-section-title">壁纸</h3>
    <div class="flat-tab-row">
      <button
        v-for="item in TABS"
        :key="item.type"
        type="button"
        class="flat-tab"
        :class="{ active: tab === item.type }"
        @click="selectTab(item.type)"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="tab === 'builtin'" class="wp-grid">
      <button
        v-for="item in BUILTIN_WALLPAPERS"
        :key="item.id"
        type="button"
        class="wp-thumb"
        :class="{ active: wallpaper.type === 'builtin' && wallpaper.value === item.id }"
        @click="store.setWallpaper({ type: 'builtin', value: item.id })"
      >
        <span class="wp-thumb-bg" :style="{ background: item.background }" />
        <span class="wp-thumb-name">{{ item.name }}</span>
      </button>
    </div>

    <div v-else-if="tab === 'url'" class="wp-panel">
      <div class="url-row">
        <input v-model="urlInput" class="flat-input" type="url" placeholder="https://example.com/wallpaper.jpg" />
        <button type="button" class="flat-btn" @click="applyUrl">应用</button>
      </div>
      <p v-if="urlError" class="wp-error">{{ urlError }}</p>
    </div>

    <div v-else-if="tab === 'upload'" class="wp-panel">
      <label class="flat-btn wp-upload">
        选择图片
        <input type="file" accept="image/*" @change="onUpload" />
      </label>
      <p class="flat-note">图片将压缩至最长边 1920 像素后存入浏览器本地</p>
      <p v-if="uploadError" class="wp-error">{{ uploadError }}</p>
    </div>

    <div v-else class="wp-panel">
      <div class="dyn-preview">
        <DynamicWallpaper :colors="dynamicColors" :speed="dynamicSpeed" />
      </div>
      <div class="color-row">
        <label v-for="(_, index) in dynamicColors" :key="index" class="color-field">
          <input v-model="dynamicColors[index]" type="color" />
        </label>
      </div>
      <label class="speed-field">
        <span class="flat-label">流动速度</span>
        <input v-model="dynamicSpeed" type="range" min="0.25" max="2" step="0.25" />
        <span class="speed-value">{{ dynamicSpeed }}x</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.wp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 12px;
}

.wp-thumb {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--flat-text);
  font-family: inherit;
  cursor: pointer;
}

.wp-thumb-bg {
  display: block;
  height: 60px;
  border: 2px solid transparent;
  outline: 1px solid var(--flat-border);
}

.wp-thumb.active .wp-thumb-bg {
  border-color: var(--accent);
}

.wp-thumb-name {
  color: var(--flat-secondary);
  font-size: 12px;
}

.wp-thumb.active .wp-thumb-name {
  color: var(--flat-text);
}

.wp-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.url-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.url-row .flat-btn {
  flex: 0 0 auto;
}

.wp-upload {
  align-self: flex-start;
  cursor: pointer;
}

.wp-upload input {
  display: none;
}

.dyn-preview {
  position: relative;
  height: 120px;
  overflow: hidden;
  border: 1px solid var(--flat-border);
}

.color-row {
  display: flex;
  gap: 10px;
}

.color-field input {
  width: 44px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--flat-border);
  background: none;
  cursor: pointer;
}

.speed-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speed-field input[type='range'] {
  flex: 1;
  accent-color: var(--accent);
}

.speed-value {
  min-width: 36px;
  color: var(--flat-text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.wp-error {
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}
</style>
