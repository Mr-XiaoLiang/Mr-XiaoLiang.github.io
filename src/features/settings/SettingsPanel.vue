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
  <div class="settings-mask" @click.self="emit('close')">
    <div class="settings" role="dialog" aria-label="设置">
      <header class="settings-header">
        <h2 class="settings-title">设置</h2>
        <button type="button" class="settings-close" @click="emit('close')">关闭</button>
      </header>
      <div class="settings-body">
        <WallpaperSection />
        <LayoutSection />
        <section class="settings-section">
          <h3 class="section-title">主题</h3>
          <div class="tab-row">
            <button
              v-for="item in THEMES"
              :key="item.value"
              type="button"
              class="tab-btn"
              :class="{ active: theme === item.value }"
              @click="store.setTheme(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
          <p class="section-note">自动模式下，文字与玻璃配色跟随壁纸明暗。</p>
        </section>
        <DataSection />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.settings {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  border-radius: 22px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.4);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  color: var(--text);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
}

.settings-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.settings-close {
  padding: 6px 16px;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.14);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.settings-body .settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tab-btn {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgb(255 255 255 / 0.08);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.tab-btn.active {
  border-color: rgb(255 255 255 / 0.35);
  color: var(--text);
}

.section-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
