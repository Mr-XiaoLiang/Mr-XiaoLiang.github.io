<script setup lang="ts">
import { computed, ref } from 'vue';
import { useConfigStore } from '../../stores/config';
import { SEARCH_ENGINES, buildSearchUrl } from '../../core/search';
import type { WidgetSize } from '../../core/types';

withDefaults(defineProps<{ size?: WidgetSize }>(), { size: 'm' });

const store = useConfigStore();
const query = ref('');

const engine = computed(() => store.config?.searchEngine ?? 'bing');

function submit() {
  const keyword = query.value.trim();
  if (!keyword) return;
  window.open(buildSearchUrl(engine.value, keyword), '_blank', 'noopener');
}

function selectEngine(id: string) {
  if (!store.config) return;
  store.config.searchEngine = id;
  store.persist();
}
</script>

<template>
  <form class="search-widget" :class="`size-${size}`" @submit.prevent="submit">
    <div class="search-row">
      <input v-model="query" type="search" placeholder="搜索网页" enterkeyhint="search" />
      <button type="submit" aria-label="搜索">搜索</button>
    </div>
    <div class="engine-row">
      <button
        v-for="item in SEARCH_ENGINES"
        :key="item.id"
        type="button"
        class="engine-chip"
        :class="{ active: item.id === engine }"
        @click="selectEngine(item.id)"
      >
        {{ item.name }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.search-widget {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 12px;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-row input {
  flex: 1;
  min-width: 0;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgb(255 255 255 / 0.1);
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.search-row input::placeholder {
  color: var(--text-secondary);
}

.search-row button {
  flex: 0 0 auto;
  padding: 7px 14px;
  border: none;
  border-radius: 999px;
  background: #3b6ef5;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.engine-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.engine-chip {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgb(255 255 255 / 0.08);
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.engine-chip.active {
  border-color: rgb(255 255 255 / 0.35);
  color: var(--text);
}

.search-widget.size-l .search-row input,
.search-widget.size-l .search-row button {
  padding: 9px 14px;
  font-size: 14px;
}
</style>
