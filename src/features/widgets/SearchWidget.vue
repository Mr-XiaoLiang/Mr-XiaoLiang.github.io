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
const engineDef = computed(() => SEARCH_ENGINES.find((e) => e.id === engine.value) ?? SEARCH_ENGINES[0]);
const engineName = computed(() => engineDef.value.name);

/** favicon 加载成功时隐藏首字母文字，只显示 logo */
function onIconLoaded(event: Event) {
  const badge = (event.currentTarget as HTMLImageElement).parentElement;
  const letter = badge?.querySelector('.engine-letter') as HTMLElement | null;
  if (letter) letter.style.display = 'none';
}

/** favicon 加载失败时隐藏自身，露出首字母文字 */
function onIconError(event: Event) {
  (event.target as HTMLImageElement).style.display = 'none';
}

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
    const left = Math.min(r.left, window.innerWidth - 180);
    popupStyle.value = { left: `${Math.max(8, left)}px`, top: `${r.bottom + 6}px` };
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
      <button
        ref="triggerRef"
        type="button"
        class="engine-trigger"
        :title="`当前搜索引擎：${engineName}`"
        @click="openEnginePicker"
      >
        <span class="engine-badge" :key="engine">
          <span class="engine-letter" aria-hidden="true">{{ engineName.charAt(0) }}</span>
          <img :src="engineDef.icon" :alt="engineName" class="engine-icon" draggable="false" @load="onIconLoaded" @error="onIconError" />
        </span>
      </button>

      <input
        v-model="query"
        type="search"
        class="search-input"
        placeholder="搜索网页"
        enterkeyhint="search"
      />

      <button type="submit" class="search-submit" aria-label="搜索">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </button>
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
          <span class="engine-badge">
            <span class="engine-letter" aria-hidden="true">{{ item.name.charAt(0) }}</span>
            <img :src="item.icon" :alt="item.name" class="engine-icon" draggable="false" @load="onIconLoaded" @error="onIconError" />
          </span>
          <span class="engine-option-name">{{ item.name }}</span>
        </button>
      </div>
    </Teleport>
  </form>
</template>

<style scoped>
/* 外层垂直水平居中：磁贴变大时搜索条保持固定尺寸，仅上下留白，绝不拉伸变形 */
.search-widget {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
}

/* 一条固定高度的搜索条：Win8 无边框风格——直角、无填充、仅底部一条细线 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 520px;
  height: 44px;
  padding: 0 4px;
  border-bottom: 1px solid rgb(255 255 255 / 0.3);
  background: transparent;
  box-sizing: border-box;
}

.engine-trigger {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
}

.engine-trigger:hover {
  background: rgb(255 255 255 / 0.1);
}

/* 图标位：首字母文字打底，favicon 加载成功后覆盖其上，加载失败则露出首字母 */
.engine-badge {
  position: relative;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
}

.engine-letter {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.engine-icon {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.search-input::placeholder {
  color: rgb(255 255 255 / 0.55);
}

.search-submit {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.search-submit:hover {
  background: rgb(255 255 255 / 0.1);
}

.search-submit svg {
  width: 18px;
  height: 18px;
}
</style>

<style>
/* 引擎选择弹窗（挂 body，避免被磁块裁剪）：Win8 直角、扁平 */
.engine-popup {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  min-width: 168px;
  padding: 4px;
  border-radius: 0;
  background: rgb(28 30 38 / 0.98);
  border: 1px solid rgb(255 255 255 / 0.12);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.45);
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: rgb(255 255 255 / 0.9);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.engine-option:hover {
  background: rgb(255 255 255 / 0.1);
}

.engine-option.active {
  background: var(--accent);
  color: #fff;
}

.engine-option-name {
  font-size: 14px;
}
</style>
