<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Sortable from 'sortablejs';
import AppIcon from './AppIcon.vue';
import { useEditMode } from './editState';
import { syncDomOrderToStore } from './dragSync';
import type { AppItem } from '../../core/types';

const props = defineProps<{
  apps: AppItem[];
  cell: number;
}>();

const emit = defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'open-library'): void;
}>();

const { editing, dragging } = useEditMode();

const root = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;

const dockCell = computed(() => Math.min(56, props.cell));

function handleDrop() {
  dragging.value = false;
  syncDomOrderToStore();
}

// 与页面网格共用同一分组，支持图标在桌面与 Dock 间拖动
watch(
  editing,
  (active) => {
    if (active && root.value && !sortable) {
      sortable = new Sortable(root.value, {
        group: 'apps',
        animation: 200,
        draggable: '.app-icon',
        filter: '.no-drag',
        // 避免 SortableJS 对过滤元素调用 preventDefault 吞掉点击（移除徽标）
        preventOnFilter: false,
        ghostClass: 'icon-ghost',
        onStart: () => {
          dragging.value = true;
          const clear = () => {
            dragging.value = false;
          };
          window.addEventListener('pointerup', clear, { once: true });
          window.addEventListener('pointercancel', clear, { once: true });
        },
        onEnd: handleDrop,
      });
    } else if (!active && sortable) {
      sortable.destroy();
      sortable = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>

<template>
  <div ref="root" class="dock" data-dock-list role="toolbar" aria-label="常用应用栏">
    <AppIcon
      v-for="app in apps"
      :key="app.id"
      :app="app"
      :cell="dockCell"
      :show-label="false"
      :data-app-id="app.id"
      remove-label="移出程序坞"
      @remove="emit('remove', $event)"
    />
    <span v-if="!apps.length && !editing" class="dock-hint">常用应用会显示在这里</span>
    <span class="dock-divider" />
    <button
      type="button"
      class="dock-library"
      aria-label="打开应用库"
      title="应用库"
      @click="emit('open-library')"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="7.6" height="7.6" rx="2.2" opacity="0.95" />
        <rect x="13.4" y="3" width="7.6" height="7.6" rx="2.2" opacity="0.55" />
        <rect x="3" y="13.4" width="7.6" height="7.6" rx="2.2" opacity="0.55" />
        <rect x="13.4" y="13.4" width="7.6" height="7.6" rx="2.2" opacity="0.95" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.dock {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 68px;
  max-width: calc(100vw - 40px);
  padding: 0 18px;
  overflow-x: auto;
  scrollbar-width: none;
  border-radius: 26px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.28);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
}

.dock::-webkit-scrollbar {
  display: none;
}

.dock-divider {
  flex: 0 0 auto;
  align-self: stretch;
  width: 1px;
  margin: 12px 2px;
  background: var(--glass-border);
}

.dock-library {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 14px;
  background: none;
  color: var(--text);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.dock-library:active {
  background: rgb(255 255 255 / 0.12);
}

.dock-hint {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
</style>
