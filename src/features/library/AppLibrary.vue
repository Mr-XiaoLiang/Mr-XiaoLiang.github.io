<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useConfigStore } from '../../stores/config';
import { fetchPresetWidgets, type PresetWidget } from '../../core/presets';
import { WIDGET_REGISTRY, sizeLabel } from '../widgets/registry';
import { tileColorFor } from '../../core/theme';
import LetterJump from './LetterJump.vue';
import { LIBRARY_TILE_ID, type AppItem, type WidgetSize } from '../../core/types';

const props = defineProps<{
  /** 添加磁块时的目标屏 */
  currentScreen?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = useConfigStore();

const tab = ref<'apps' | 'widgets'>('apps');
const query = ref('');
const jumpOpen = ref(false);
const groupRefs = ref<Record<string, HTMLElement | null>>({});
const iframePresets = ref<PresetWidget[]>([]);
const chosenSizes = ref<Record<string, WidgetSize>>({});

onMounted(async () => {
  try {
    iframePresets.value = await fetchPresetWidgets();
  } catch {
    iframePresets.value = [];
  }
  nextTick(() => searchInput.value?.focus());
});

const searchInput = ref<HTMLInputElement | null>(null);

/** 应用按首字母分组：拉丁字母取大写首字母，其余归入 # */
function initialOf(name: string): string {
  const first = name.trim().charAt(0) ?? '';
  return /[a-z]/i.test(first) ? first.toUpperCase() : '#';
}

const filteredApps = computed<AppItem[]>(() => {
  const keyword = query.value.trim().toLowerCase();
  const list = [...store.apps].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' }),
  );
  if (!keyword) return list;
  return list.filter((app) =>
    [app.name, app.description ?? '', app.category ?? ''].some((field) => field.toLowerCase().includes(keyword)),
  );
});

const groups = computed(() => {
  const grouped = new Map<string, AppItem[]>();
  for (const app of filteredApps.value) {
    const letter = initialOf(app.name);
    const list = grouped.get(letter) ?? [];
    list.push(app);
    grouped.set(letter, list);
  }
  return [...grouped.entries()]
    .map(([letter, apps]) => ({ letter, apps }))
    .sort((a, b) => {
      if (a.letter === '#') return 1;
      if (b.letter === '#') return -1;
      return a.letter.localeCompare(b.letter);
    });
});

const availableLetters = computed(() => groups.value.map((group) => group.letter));

function isPinned(app: AppItem): boolean {
  return app.placement.kind === 'tile';
}

function jumpTo(letter: string) {
  jumpOpen.value = false;
  const element = groupRefs.value[letter];
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openApp(app: AppItem) {
  if (app.url) window.open(app.url, '_blank', 'noopener');
}

function pin(app: AppItem) {
  store.pinApp(app.id, props.currentScreen ?? 0);
}

function widgetSizeOf(key: string, fallback: WidgetSize): WidgetSize {
  return chosenSizes.value[key] ?? fallback;
}

function pickSize(key: string, size: WidgetSize) {
  chosenSizes.value = { ...chosenSizes.value, [key]: size };
}

function addWidget(type: Parameters<typeof store.addWidget>[0], size: WidgetSize, widgetProps: Record<string, unknown>) {
  store.addWidget(type, size, widgetProps, props.currentScreen ?? 0);
}

function addIframeWidget(preset: PresetWidget) {
  const key = `iframe:${preset.name}`;
  addWidget('iframe', widgetSizeOf(key, { cols: 4, rows: 4 }), { url: preset.url, name: preset.name });
}

function isIframeSizeActive(presetName: string, size: WidgetSize): boolean {
  const picked = widgetSizeOf(`iframe:${presetName}`, { cols: 4, rows: 4 });
  return picked.cols === size.cols && picked.rows === size.rows;
}

function setGroupRef(letter: string) {
  return (element: unknown) => {
    groupRefs.value[letter] = element as HTMLElement | null;
  };
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (jumpOpen.value) jumpOpen.value = false;
    else emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="library">
    <header class="library-header">
      <div class="library-title-row">
        <h2 class="library-title">应用库</h2>
        <span class="library-count">共 {{ store.apps.length }} 个应用</span>
        <button type="button" class="library-close" @click="emit('close')">关闭</button>
      </div>
      <div class="library-tabs" role="tablist">
        <button
          type="button"
          class="library-tab"
          :class="{ active: tab === 'apps' }"
          role="tab"
          :aria-selected="tab === 'apps'"
          @click="tab = 'apps'"
        >
          应用
        </button>
        <button
          type="button"
          class="library-tab"
          :class="{ active: tab === 'widgets' }"
          role="tab"
          :aria-selected="tab === 'widgets'"
          @click="tab = 'widgets'"
        >
          小组件
        </button>
      </div>
      <div v-if="tab === 'apps'" class="library-search">
        <input ref="searchInput" v-model="query" type="search" placeholder="搜索应用名称或描述" />
      </div>
    </header>

    <div v-if="tab === 'apps'" class="library-body">
      <section v-for="group in groups" :key="group.letter" :ref="setGroupRef(group.letter)" class="lib-group">
        <h3 class="lib-group-title" @click="jumpOpen = true">{{ group.letter }}</h3>
        <div v-for="app in group.apps" :key="app.id" class="app-row" @click="openApp(app)">
          <span class="row-icon" :style="{ background: app.color || tileColorFor(app.id) }">
            <img v-if="app.icon" :src="app.icon" alt="" draggable="false" />
            <span v-else>{{ app.name.trim().charAt(0).toUpperCase() }}</span>
          </span>
          <span class="row-name">{{ app.name }}</span>
          <span v-if="app.id === LIBRARY_TILE_ID" class="row-flag">入口磁块</span>
          <span v-else-if="isPinned(app)" class="row-flag">已固定</span>
          <button v-else type="button" class="row-pin" @click.stop="pin(app)">固定到屏幕</button>
        </div>
      </section>
      <p v-if="!groups.length" class="lib-empty">没有匹配的应用</p>
      <LetterJump v-if="jumpOpen" :available="availableLetters" @jump="jumpTo" @close="jumpOpen = false" />
    </div>

    <div v-else class="library-body">
      <section class="lib-group">
        <h3 class="lib-group-title">内置小组件</h3>
        <div class="widget-grid">
          <article v-for="definition in WIDGET_REGISTRY" :key="definition.type" class="widget-card">
            <h4 class="card-name">{{ definition.name }}</h4>
            <p class="card-desc">{{ definition.description }}</p>
            <div class="size-row">
              <button
                v-for="size in definition.quickSizes"
                :key="sizeLabel(size)"
                type="button"
                class="size-chip"
                :class="{ active: widgetSizeOf(definition.type, definition.defaultSize).cols === size.cols && widgetSizeOf(definition.type, definition.defaultSize).rows === size.rows }"
                @click="pickSize(definition.type, size)"
              >
                {{ sizeLabel(size) }}
              </button>
            </div>
            <button
              type="button"
              class="card-add"
              @click="addWidget(definition.type, widgetSizeOf(definition.type, definition.defaultSize), {})"
            >
              添加
            </button>
          </article>
        </div>
      </section>
      <section class="lib-group">
        <h3 class="lib-group-title">网页小组件</h3>
        <div v-if="iframePresets.length" class="widget-grid">
          <article v-for="preset in iframePresets" :key="preset.name" class="widget-card">
            <h4 class="card-name">{{ preset.name }}</h4>
            <p class="card-desc">{{ preset.description || preset.url }}</p>
            <div class="size-row">
              <button
                v-for="size in [{ cols: 2, rows: 2 }, { cols: 3, rows: 3 }, { cols: 4, rows: 2 }, { cols: 4, rows: 4 }] as WidgetSize[]"
                :key="sizeLabel(size)"
                type="button"
                class="size-chip"
                :class="{ active: isIframeSizeActive(preset.name, size) }"
                @click="pickSize(`iframe:${preset.name}`, size)"
              >
                {{ sizeLabel(size) }}
              </button>
            </div>
            <button type="button" class="card-add" @click="addIframeWidget(preset)">添加</button>
          </article>
        </div>
        <p v-else class="lib-empty">未配置网页小组件，可在 Widgets.json 中添加</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.library {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgb(5 6 15 / 0.88);
  backdrop-filter: blur(28px) saturate(1.3);
  -webkit-backdrop-filter: blur(28px) saturate(1.3);
  color: var(--text);
}

.library-enter-active,
.library-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.library-enter-from,
.library-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

.library-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: max(18px, env(safe-area-inset-top)) 20px 12px;
}

.library-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.library-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.library-count {
  flex: 1;
  color: var(--text-secondary);
  font-size: 12px;
}

.library-close {
  padding: 6px 16px;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.library-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.08);
  width: fit-content;
}

.library-tab {
  padding: 6px 22px;
  border: none;
  border-radius: 999px;
  background: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.library-tab.active {
  background: rgb(255 255 255 / 0.18);
  color: var(--text);
  font-weight: 600;
}

.library-search input {
  width: 100%;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgb(255 255 255 / 0.08);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.library-search input::placeholder {
  color: var(--text-secondary);
}

.library-body {
  position: relative;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 20px max(24px, env(safe-area-inset-bottom));
}

.lib-group {
  margin-bottom: 20px;
}

.lib-group-title {
  margin: 0 0 8px;
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  width: fit-content;
}

.lib-group-title:hover {
  background: rgb(255 255 255 / 0.12);
  color: var(--text);
}

.app-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 8px;
  border-radius: 10px;
  cursor: pointer;
}

.app-row:hover {
  background: rgb(255 255 255 / 0.07);
}

.row-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.row-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.row-name {
  flex: 1;
  overflow: hidden;
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-flag {
  color: var(--text-secondary);
  font-size: 11px;
}

.row-pin {
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: #1ba1e2;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.widget-card {
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
  flex-wrap: wrap;
  gap: 6px;
}

.size-chip {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgb(255 255 255 / 0.08);
  color: var(--text-secondary);
  font-size: 11px;
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
  background: #1ba1e2;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.card-add:active {
  transform: scale(0.97);
}

.lib-empty {
  margin: 32px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}
</style>
