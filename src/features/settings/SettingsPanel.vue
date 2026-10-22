<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useConfigStore } from '../../stores/config';
import WallpaperSection from './WallpaperSection.vue';
import LayoutSection from './LayoutSection.vue';
import DataSection from './DataSection.vue';
import type { ThemeMode } from '../../core/types';

const store = useConfigStore();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
];

const theme = computed<ThemeMode>(() => store.config?.theme ?? 'auto');

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="flat-page settings" role="dialog" aria-label="设置">
    <header class="flat-page-header">
      <h2 class="flat-page-title">设置</h2>
      <button type="button" class="flat-page-close" @click="emit('close')">关闭</button>
    </header>
    <div class="flat-page-body">
      <WallpaperSection />
      <LayoutSection />
      <section class="flat-section">
        <h3 class="flat-section-title">主题</h3>
        <div class="flat-tab-row">
          <button
            v-for="item in THEMES"
            :key="item.value"
            type="button"
            class="flat-tab"
            :class="{ active: theme === item.value }"
            @click="store.setTheme(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <p class="flat-note">自动模式下，文字配色跟随壁纸明暗。</p>
      </section>
      <DataSection />
    </div>
  </div>
</template>
