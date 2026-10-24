<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useConfigStore } from '../../stores/config';
import { fetchPresetWidgets, type PresetWidget } from '../../core/presets';
import { listWidgets, sizeLabel } from '../../widgets';
import { tileColorFor } from '../../core/theme';
import { useWidgetDocs } from '../../composables/useWidgetDocs';
import FaviconImage from '../desktop/FaviconImage.vue';
import LetterJump from './LetterJump.vue';
import { LIBRARY_TILE_ID, SETTINGS_TILE_ID, type AppItem, type WidgetSize } from '../../core/types';

const props = defineProps<{
  /** 添加磁块时的目标屏 */
  currentScreen?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-settings'): void;
  (e: 'add-custom-app'): void;
  (e: 'add-custom-widget'): void;
}>();

const store = useConfigStore();
const { docsUrl, copied, copyDocsLink } = useWidgetDocs();

const tab = ref<'apps' | 'widgets'>('apps');
const query = ref('');
const jumpOpen = ref(false);
const groupRefs = ref<Record<string, HTMLElement | null>>({});
const iframePresets = ref<PresetWidget[]>([]);
const chosenSizes = ref<Record<string, WidgetSize>>({});
const builtinWidgets = computed(() => listWidgets('builtin'));
const userWidgets = computed(() => listWidgets('user'));
const searchInput = ref<HTMLInputElement | null>(null);

// 长按上下文菜单（Win8 风格）：按住应用行 500ms 弹出
const menuApp = ref<AppItem | null>(null);
let pressTimer = 0;

/** favicon 全部候选失败的应用 id，降级为首字色块 */
const faviconFailedId = ref('');

function onFaviconFailed(appId: string) {
  faviconFailedId.value = appId;
}

function cancelMenuPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
  }
}

function onRowPressDown(app: AppItem) {
  cancelMenuPress();
  pressTimer = window.setTimeout(() => {
    pressTimer = 0;
    menuApp.value = app;
  }, 500);
}

function onRowPressEnd() {
  cancelMenuPress();
}

onMounted(async () => {
  try {
    iframePresets.value = await fetchPresetWidgets();
  } catch {
    iframePresets.value = [];
  }
  nextTick(() => searchInput.value?.focus());
});

/** 应用按首字母分组：拉丁字母取大写首字母，其余归入 # */
function initialOf(name: string): string {
  const first = name.trim().charAt(0) ?? '';
  return /[a-z]/i.test(first) ? first.toUpperCase() : '#';
}

const filteredApps = computed<AppItem[]>(() => {
  const keyword = query.value.trim().toLowerCase();
  // 设置入口固定在列表顶部，不参与字母分组
  const list = [...store.apps]
    .filter((app) => app.id !== SETTINGS_TILE_ID)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' }));
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

function jumpTo(letter: string) {
  jumpOpen.value = false;
  groupRefs.value[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function isPinned(app: AppItem): boolean {
  return app.placement.kind === 'tile';
}

function openApp(app: AppItem) {
  if (app.id === SETTINGS_TILE_ID) {
    emit('open-settings');
    return;
  }
  if (app.id === LIBRARY_TILE_ID || !app.url) return;
  window.open(app.url, '_blank', 'noopener');
}

function pin(app: AppItem) {
  store.pinApp(app.id, props.currentScreen ?? 0);
  menuApp.value = null;
}

function unpin(app: AppItem) {
  store.unpinApp(app.id);
  menuApp.value = null;
}

function menuOpen(app: AppItem) {
  openApp(app);
  menuApp.value = null;
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

function deleteUserWidget(id: string) {
  store.deleteUserWidget(id);
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

/** 语义缩放：Ctrl+滚轮（含触控板捏合）在列表视图与字母分组视图间切换 */
function onWheel(event: WheelEvent) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  jumpOpen.value = event.deltaY < 0;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (menuApp.value) menuApp.value = null;
    else if (jumpOpen.value) jumpOpen.value = false;
    else emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  cancelMenuPress();
});
</script>

<template>
  <div class="flat-page library" @wheel="onWheel">
    <header class="flat-page-header">
      <h2 class="flat-page-title">应用库</h2>
      <span class="flat-label">共 {{ store.apps.length }} 个应用</span>
      <button type="button" class="flat-page-close" @click="emit('close')">关闭</button>
    </header>

    <div class="library-tabs">
      <button
        type="button"
        class="library-tab"
        :class="{ active: tab === 'apps' }"
        @click="tab = 'apps'"
      >
        应用
      </button>
      <button
        type="button"
        class="library-tab"
        :class="{ active: tab === 'widgets' }"
        @click="tab = 'widgets'"
      >
        小组件
      </button>
    </div>

    <div v-if="tab === 'apps'" class="library-search">
      <input ref="searchInput" v-model="query" class="flat-input" type="search" placeholder="搜索应用名称或描述" />
      <button
        type="button"
        class="zoom-btn"
        aria-label="按字母跳转"
        title="按字母跳转（Ctrl + 滚轮）"
        @click="jumpOpen = true"
      >
        A#
      </button>
    </div>

    <p v-if="tab === 'apps'" class="lib-hint">点按打开应用；长按或点按右侧按钮，将应用固定到屏幕</p>

    <div v-if="tab === 'apps'" class="library-body">
      <div class="lib-system">
        <div class="app-row system-row" @click="emit('open-settings')">
          <span class="row-icon" style="background: #1ba1e2">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.2 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
          </span>
          <span class="row-name">设置</span>
          <span class="row-flag">壁纸、布局、主题与数据</span>
        </div>

        <div class="app-row system-row" @click="emit('add-custom-app')">
          <span class="row-icon row-icon-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span class="row-name">自定义应用</span>
          <span class="row-flag">填写网址，新建一个磁块</span>
        </div>
      </div>

      <section v-for="group in groups" :key="group.letter" :ref="setGroupRef(group.letter)" class="lib-group">
        <h3 class="lib-group-title" @click="jumpOpen = true">{{ group.letter }}</h3>
        <div
          v-for="app in group.apps"
          :key="app.id"
          class="app-row"
          @click="openApp(app)"
          @pointerdown="onRowPressDown(app)"
          @pointerup="onRowPressEnd"
          @pointercancel="onRowPressEnd"
          @pointerleave="onRowPressEnd"
        >
          <span class="row-icon" :style="{ background: app.color || tileColorFor(app.id) }">
            <img v-if="app.icon" :src="app.icon" alt="" draggable="false" />
            <FaviconImage
              v-else-if="app.url && faviconFailedId !== app.id"
              :url="app.url"
              alt=""
              @failed="onFaviconFailed(app.id)"
            />
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
          <article v-for="definition in builtinWidgets" :key="definition.id" class="widget-card">
            <h4 class="card-name">{{ definition.name }}</h4>
            <p class="card-desc">{{ definition.description }}</p>
            <div class="size-row">
              <button
                v-for="size in definition.quickSizes"
                :key="sizeLabel(size)"
                type="button"
                class="size-chip"
                :class="{ active: widgetSizeOf(definition.id, definition.defaultSize).cols === size.cols && widgetSizeOf(definition.id, definition.defaultSize).rows === size.rows }"
                @click="pickSize(definition.id, size)"
              >
                {{ sizeLabel(size) }}
              </button>
            </div>
            <button
              type="button"
              class="card-add"
              @click="addWidget(definition.id, widgetSizeOf(definition.id, definition.defaultSize), definition.defaultProps ?? {})"
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
      <section class="lib-group">
        <div class="lib-group-head">
          <h3 class="lib-group-title">自定义小组件</h3>
          <div class="lib-group-actions">
            <button type="button" class="link-btn" @click="copyDocsLink">{{ copied ? '已复制' : '复制说明页链接' }}</button>
            <a class="link-btn" :href="docsUrl" target="_blank" rel="noopener">接入说明</a>
            <button type="button" class="row-pin" @click="emit('add-custom-widget')">导入小组件</button>
          </div>
        </div>
        <div v-if="userWidgets.length" class="widget-grid">
          <article v-for="definition in userWidgets" :key="definition.id" class="widget-card">
            <h4 class="card-name">{{ definition.name }}</h4>
            <p class="card-desc">{{ definition.description }}</p>
            <div class="size-row">
              <button
                v-for="size in definition.quickSizes"
                :key="sizeLabel(size)"
                type="button"
                class="size-chip"
                :class="{ active: widgetSizeOf(definition.id, definition.defaultSize).cols === size.cols && widgetSizeOf(definition.id, definition.defaultSize).rows === size.rows }"
                @click="pickSize(definition.id, size)"
              >
                {{ sizeLabel(size) }}
              </button>
            </div>
            <div class="card-actions">
              <button
                type="button"
                class="card-add"
                @click="addWidget(definition.id, widgetSizeOf(definition.id, definition.defaultSize), definition.defaultProps ?? {})"
              >
                添加
              </button>
              <button type="button" class="card-delete" @click="deleteUserWidget(definition.id)">删除</button>
            </div>
          </article>
        </div>
        <p v-else class="lib-empty">尚未添加自定义小组件</p>
      </section>
    </div>

    <!-- 长按上下文菜单（Win8 底部菜单栏） -->
    <div v-if="menuApp" class="menu-mask" @click.self="menuApp = null">
      <div class="menu-sheet" role="menu">
        <p class="menu-title">{{ menuApp.name }}</p>
        <button v-if="!isPinned(menuApp)" type="button" class="menu-item menu-primary" @click="pin(menuApp)">
          固定到屏幕
        </button>
        <button v-else type="button" class="menu-item" @click="unpin(menuApp)">从屏幕取消固定</button>
        <button v-if="menuApp.url" type="button" class="menu-item" @click="menuOpen(menuApp)">打开</button>
        <button type="button" class="menu-item" @click="menuApp = null">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding: 0 20px;
}

.library-tab {
  min-height: 38px;
  padding: 8px 18px;
  border: none;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--flat-secondary);
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
}

.library-tab.active {
  border-bottom-color: var(--accent);
  color: var(--flat-text);
  font-weight: 600;
}

.library-search {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-end;
  gap: 10px;
  padding: 14px 20px 6px;
}

.library-search .flat-input {
  flex: 1;
}

.zoom-btn {
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 34px;
  padding: 0 12px;
  border: 2px solid var(--flat-border);
  background: none;
  color: var(--flat-secondary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.zoom-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lib-hint {
  flex: 0 0 auto;
  margin: 0;
  padding: 10px 20px 0;
  color: var(--flat-tertiary);
  font-size: 12px;
}

.library-body {
  position: relative;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 20px max(24px, env(safe-area-inset-bottom));
}

.lib-group {
  margin-bottom: 22px;
}

.lib-group-title {
  margin: 0 0 6px;
  padding: 2px 6px;
  width: fit-content;
  color: var(--flat-text);
  font-size: 24px;
  font-weight: 300;
  cursor: pointer;
}

.lib-group-title:hover {
  color: var(--accent);
}

.app-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 11px 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* 行与行之间以细分隔线区分，避免字母分组内多行贴在一起 */
.app-row + .app-row {
  border-top: 1px solid var(--flat-border);
}

.app-row:hover {
  background: var(--flat-hover);
}

/* 顶部操作区：与下方字母分组列表明确分隔，两行之间也留出呼吸感 */
.lib-system {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--flat-border);
}

.system-row {
  min-height: 60px;
}

.row-icon-outline {
  border: 2px solid var(--accent);
  color: var(--accent);
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

.row-icon svg {
  width: 22px;
  height: 22px;
}

.row-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.row-name {
  flex: 1;
  overflow: hidden;
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-flag {
  color: var(--flat-tertiary);
  font-size: 11px;
}

.row-pin {
  min-height: 32px;
  padding: 5px 14px;
  border: 2px solid var(--accent);
  background: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.row-pin:active {
  background: var(--accent);
  color: #fff;
}

/* 长按上下文菜单：Win8 底部菜单栏 */
.menu-mask {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 0.55);
}

.menu-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px 0 max(10px, env(safe-area-inset-bottom));
  background: var(--flat-bg);
  border-top: 2px solid var(--flat-border);
}

.menu-title {
  margin: 0;
  padding: 10px 20px 12px;
  color: var(--flat-secondary);
  font-size: 13px;
}

.menu-item {
  min-height: 48px;
  padding: 0 20px;
  border: none;
  background: none;
  color: var(--flat-text);
  font-size: 15px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--flat-hover);
}

.menu-primary {
  color: var(--accent);
  font-weight: 600;
}

.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.widget-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 2px solid var(--flat-border);
}

.card-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.card-desc {
  margin: 0;
  flex: 1;
  color: var(--flat-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.size-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.size-chip {
  padding: 4px 10px;
  border: 2px solid transparent;
  background: none;
  color: var(--flat-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.size-chip.active {
  border-color: var(--accent);
  color: var(--flat-text);
  font-weight: 600;
}

.card-add {
  padding: 8px 0;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.card-add:active {
  filter: brightness(1.15);
}

.lib-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.lib-group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.link-btn {
  min-height: 32px;
  padding: 5px 12px;
  border: none;
  background: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions .card-add {
  flex: 1;
}

.card-delete {
  flex: 1;
  padding: 8px 0;
  border: 2px solid var(--danger);
  background: none;
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.card-delete:hover {
  background: rgb(229 20 0 / 0.12);
}

.lib-empty {
  margin: 36px 0 0;
  color: var(--flat-tertiary);
  font-size: 13px;
  text-align: center;
}
</style>
