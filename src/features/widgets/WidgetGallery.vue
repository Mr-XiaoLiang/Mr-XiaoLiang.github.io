<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useConfigStore } from '../../stores/config';
import { fetchPresetWidgets, type PresetWidget } from '../../core/presets';
import { SIZE_LABELS, WIDGET_REGISTRY } from './registry';
import type { WidgetSize, WidgetType } from '../../core/types';

const props = defineProps<{
  /** 小组件添加到的目标页 */
  page: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = useConfigStore();

const iframePresets = ref<PresetWidget[]>([]);
const chosen = ref<Record<string, WidgetSize>>({});

onMounted(async () => {
  try {
    iframePresets.value = await fetchPresetWidgets();
  } catch {
    iframePresets.value = [];
  }
});

function sizeOf(key: string, fallback: WidgetSize): WidgetSize {
  return chosen.value[key] ?? fallback;
}

function pick(key: string, size: WidgetSize) {
  chosen.value = { ...chosen.value, [key]: size };
}

function addBuiltin(type: WidgetType, defaultSize: WidgetSize) {
  store.addWidget(type, sizeOf(type, defaultSize), {}, props.page);
}

function addIframe(preset: PresetWidget) {
  const key = `iframe:${preset.name}`;
  store.addWidget('iframe', sizeOf(key, 'm'), { url: preset.url, name: preset.name }, props.page);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="gallery-mask" @click.self="emit('close')">
    <div class="gallery" role="dialog" aria-label="小组件库">
      <header class="gallery-header">
        <h2 class="gallery-title">小组件</h2>
        <button type="button" class="gallery-close" @click="emit('close')">关闭</button>
      </header>
      <div class="gallery-body">
        <section class="gallery-section">
          <h3 class="gallery-section-title">内置小组件</h3>
          <div class="gallery-grid">
            <article v-for="definition in WIDGET_REGISTRY" :key="definition.type" class="gallery-card">
              <h4 class="card-name">{{ definition.name }}</h4>
              <p class="card-desc">{{ definition.description }}</p>
              <div class="size-row">
                <button
                  v-for="size in definition.supportedSizes"
                  :key="size"
                  type="button"
                  class="size-chip"
                  :class="{ active: sizeOf(definition.type, definition.defaultSize) === size }"
                  :title="`${SIZE_LABELS[size]}尺寸`"
                  @click="pick(definition.type, size)"
                >
                  {{ SIZE_LABELS[size] }}
                </button>
              </div>
              <button type="button" class="card-add" @click="addBuiltin(definition.type, definition.defaultSize)">
                添加
              </button>
            </article>
          </div>
        </section>
        <section class="gallery-section">
          <h3 class="gallery-section-title">网页小组件</h3>
          <div v-if="iframePresets.length" class="gallery-grid">
            <article v-for="preset in iframePresets" :key="preset.name" class="gallery-card">
              <h4 class="card-name">{{ preset.name }}</h4>
              <p class="card-desc">{{ preset.description || preset.url }}</p>
              <div class="size-row">
                <button
                  v-for="size in ['s', 'm', 'l'] as WidgetSize[]"
                  :key="size"
                  type="button"
                  class="size-chip"
                  :class="{ active: sizeOf(`iframe:${preset.name}`, 'm') === size }"
                  :title="`${SIZE_LABELS[size]}尺寸`"
                  @click="pick(`iframe:${preset.name}`, size)"
                >
                  {{ SIZE_LABELS[size] }}
                </button>
              </div>
              <button type="button" class="card-add" @click="addIframe(preset)">添加</button>
            </article>
          </div>
          <p v-else class="gallery-empty">未配置网页小组件，可在 Widgets.json 中添加</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.gallery {
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

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
}

.gallery-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.gallery-close {
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

.gallery-body {
  overflow-y: auto;
  padding: 0 20px 20px;
}

.gallery-section + .gallery-section {
  margin-top: 20px;
}

.gallery-section-title {
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.gallery-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  background: rgb(255 255 255 / 0.06);
}

.card-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.card-desc {
  margin: 0;
  flex: 1;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.size-row {
  display: flex;
  gap: 6px;
}

.size-chip {
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgb(255 255 255 / 0.08);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.size-chip.active {
  border-color: rgb(255 255 255 / 0.35);
  color: var(--text);
}

.card-add {
  padding: 7px 0;
  border: none;
  border-radius: 999px;
  background: #3b6ef5;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.card-add:active {
  transform: scale(0.97);
}

.gallery-empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
