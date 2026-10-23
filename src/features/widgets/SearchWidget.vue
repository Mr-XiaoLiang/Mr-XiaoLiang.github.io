<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useConfigStore } from '../../stores/config';
import { SEARCH_ENGINES, buildSearchUrl } from '../../core/search';

const store = useConfigStore();
const query = ref('');
const engineOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const popupStyle = ref<{ left: string; top: string }>({ left: '0px', top: '0px' });

const engine = computed(() => store.config?.searchEngine ?? 'bing');
const engineName = computed(
  () => SEARCH_ENGINES.find((e) => e.id === engine.value)?.name ?? '搜索引擎',
);

function submit() {
  const keyword = query.value.trim();
  if (!keyword) return;
  window.open(buildSearchUrl(engine.value, keyword), '_blank', 'noopener');
}

function selectEngine(id: string) {
  if (!store.config) return;
  store.config.searchEngine = id;
  store.persist();
  engineOpen.value = false;
}

function openEnginePicker() {
  if (triggerRef.value) {
    const r = triggerRef.value.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - 160);
    popupStyle.value = { left: `${Math.max(8, left)}px`, top: `${r.bottom + 4}px` };
  }
  engineOpen.value = true;
}

function onDocPointer(e: PointerEvent) {
  const target = e.target as HTMLElement | null;
  if (target && (target.closest('.engine-popup') || target.closest('.engine-trigger'))) return;
  engineOpen.value = false;
}

watch(engineOpen, (open) => {
  if (open) document.addEventListener('pointerdown', onDocPointer, true);
  else document.removeEventListener('pointerdown', onDocPointer, true);
});
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer, true));
</script>

<template>
  <form class="search-widget" @submit.prevent="submit">
    <div class="search-bar">
      <input
        v-model="query"
        type="search"
        class="search-input"
        placeholder="搜索网页"
        enterkeyhint="search"
      />
      <button
        ref="triggerRef"
        type="button"
        class="engine-trigger"
        :title="`当前搜索引擎：${engineName}`"
        @click="openEnginePicker"
      >
        <span class="engine-trigger-name">{{ engineName }}</span>
        <span class="engine-trigger-caret" aria-hidden="true">▾</span>
      </button>
      <button type="submit" class="search-submit" aria-label="搜索">搜索</button>
    </div>

    <Teleport to="body">
      <div
        v-if="engineOpen"
        class="engine-popup"
        :style="{ left: popupStyle.left, top: popupStyle.top }"
        @pointerdown.stop
      >
        <button
          v-for="item in SEARCH_ENGINES"
          :key="item.id"
          type="button"
          class="engine-option"
          :class="{ active: item.id === engine }"
          @click="selectEngine(item.id)"
        >
          {{ item.name }}
        </button>
      </div>
    </Teleport>
  </form>
</template>

<style scoped>
.search-widget {
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 输入框主导：一条横贯整块的搜索条，而非占满的大胶囊 */
.search-bar {
  display: flex;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 6%;
  box-sizing: border-box;
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: rgb(255 255 255 / 0.16);
  color: #fff;
  font-size: clamp(12px, 8cqh, 20px);
  font-family: inherit;
  outline: none;
}

.search-input::placeholder {
  color: rgb(255 255 255 / 0.65);
}

.search-input:focus {
  background: rgb(255 255 255 / 0.26);
}

/* 引擎触发：紧凑小按钮，点击弹出选择，不常驻一排 */
.engine-trigger {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid rgb(255 255 255 / 0.3);
  border-radius: 6px;
  background: transparent;
  color: rgb(255 255 255 / 0.85);
  font-size: clamp(10px, 5cqh, 13px);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.engine-trigger-caret {
  font-size: 0.8em;
}

.search-submit {
  flex: 0 0 auto;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: rgb(255 255 255 / 0.9);
  color: #1b1e26;
  font-size: clamp(11px, 6cqh, 15px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
</style>

<style>
/* 引擎选择弹窗（挂 body，避免被磁块裁剪） */
.engine-popup {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  min-width: 132px;
  padding: 6px;
  border-radius: 10px;
  background: rgb(28 30 38 / 0.98);
  border: 1px solid rgb(255 255 255 / 0.16);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);
}

.engine-option {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(255 255 255 / 0.9);
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.engine-option:hover {
  background: rgb(255 255 255 / 0.1);
}

.engine-option.active {
  background: rgb(255 255 255 / 0.18);
  color: #fff;
  font-weight: 600;
}
</style>
