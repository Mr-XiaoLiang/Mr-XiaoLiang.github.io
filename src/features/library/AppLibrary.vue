<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '../desktop/AppIcon.vue';
import ActionSheet, { type SheetAction } from './ActionSheet.vue';
import { useConfigStore } from '../../stores/config';
import type { AppItem } from '../../core/types';

const props = defineProps<{
  /** 添加到主屏幕时的目标页 */
  currentPage: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = useConfigStore();

const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const sheetApp = ref<AppItem | null>(null);
const confirmingDelete = ref(false);

const sortedApps = computed<AppItem[]>(() =>
  [...store.apps].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
);

const filteredApps = computed<AppItem[]>(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return sortedApps.value;
  return sortedApps.value.filter((app) =>
    [app.name, app.description ?? '', app.category ?? ''].some((field) =>
      field.toLowerCase().includes(keyword),
    ),
  );
});

const sections = computed(() => {
  const grouped = new Map<string, AppItem[]>();
  for (const app of filteredApps.value) {
    const title = app.category?.trim() || '未分类';
    const list = grouped.get(title) ?? [];
    list.push(app);
    grouped.set(title, list);
  }
  return [...grouped.entries()]
    .map(([title, apps]) => ({ title, apps }))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
});

function isUnplaced(app: AppItem): boolean {
  return app.placement.kind === 'library';
}

function stateLabel(app: AppItem): string {
  if (app.placement.kind === 'dock') return '程序坞';
  if (app.placement.kind === 'page') return '主屏';
  return '';
}

function placeOnCurrentPage(app: AppItem) {
  store.placeOnPage(app.id, props.currentPage);
}

function closeSheet() {
  sheetApp.value = null;
  confirmingDelete.value = false;
}

function confirmDelete() {
  if (sheetApp.value) store.deleteApp(sheetApp.value.id);
  closeSheet();
}

const sheetActions = computed<SheetAction[]>(() => {
  const app = sheetApp.value;
  if (!app) return [];
  if (confirmingDelete.value) {
    return [
      { label: '确认删除', danger: true, onClick: confirmDelete },
      { label: '取消', onClick: closeSheet },
    ];
  }
  const actions: SheetAction[] = [];
  if (isUnplaced(app)) {
    actions.push({
      label: '添加到主屏幕',
      onClick: () => {
        placeOnCurrentPage(app);
        closeSheet();
      },
    });
  }
  if (app.placement.kind !== 'dock') {
    actions.push({
      label: '添加到程序坞',
      onClick: () => {
        store.moveToDock(app.id);
        closeSheet();
      },
    });
  }
  actions.push({ label: '取消', onClick: closeSheet });
  if (app.source === 'user') {
    actions.push({
      label: '删除应用',
      danger: true,
      onClick: () => {
        confirmingDelete.value = true;
      },
    });
  }
  return actions;
});

// 长按呼出操作菜单
let pressTimer = 0;
function onItemPointerDown(app: AppItem) {
  pressTimer = window.setTimeout(() => {
    pressTimer = 0;
    sheetApp.value = app;
  }, 500);
}
function cancelPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (sheetApp.value) closeSheet();
  else emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  nextTick(() => searchInput.value?.focus());
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  cancelPress();
});
</script>

<template>
  <div class="library">
    <header class="library-header">
      <div class="library-title-row">
        <h2 class="library-title">应用库</h2>
        <span class="library-count">共 {{ store.apps.length }} 个应用</span>
        <button type="button" class="library-close" @click="emit('close')">关闭</button>
      </div>
      <div class="library-search">
        <input ref="searchInput" v-model="query" type="search" placeholder="搜索应用名称或描述" />
      </div>
    </header>
    <div class="library-body">
      <template v-if="sections.length">
        <section v-for="section in sections" :key="section.title" class="lib-section">
          <h3 class="lib-section-title">{{ section.title }}</h3>
          <div class="lib-grid">
            <div
              v-for="app in section.apps"
              :key="app.id"
              class="lib-item"
              @pointerdown="onItemPointerDown(app)"
              @pointerup="cancelPress"
              @pointercancel="cancelPress"
              @pointerleave="cancelPress"
            >
              <AppIcon :app="app" :cell="72">
                <template #badge>
                  <button
                    v-if="isUnplaced(app)"
                    type="button"
                    class="lib-add"
                    :aria-label="`将 ${app.name} 添加到主屏幕`"
                    @click.stop="placeOnCurrentPage(app)"
                  >
                    +
                  </button>
                  <span v-else class="lib-state" :title="`已在${stateLabel(app)}`">{{ stateLabel(app) }}</span>
                </template>
              </AppIcon>
            </div>
          </div>
        </section>
      </template>
      <p v-else class="lib-empty">
        {{ query.trim() ? '没有匹配的应用' : '应用库为空，可在桌面编辑模式下添加应用' }}
      </p>
    </div>
    <ActionSheet v-if="sheetApp" :title="sheetApp.name" :actions="sheetActions" @close="closeSheet" />
  </div>
</template>

<style scoped>
.library {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgb(5 6 15 / 0.82);
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
  flex: 1;
  overflow-y: auto;
  padding: 4px 20px max(24px, env(safe-area-inset-bottom));
  overscroll-behavior: contain;
}

.lib-section + .lib-section {
  margin-top: 22px;
}

.lib-section-title {
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.lib-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 18px 8px;
}

.lib-item {
  display: grid;
  place-items: center;
}

.lib-add {
  position: absolute;
  top: -7px;
  left: -7px;
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #3b6ef5;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);
  cursor: pointer;
}

.lib-state {
  position: absolute;
  top: -7px;
  right: -10px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgb(22 24 32 / 0.85);
  color: rgb(255 255 255 / 0.92);
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
}

.lib-empty {
  margin: 48px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
}
</style>
