<script setup lang="ts">
import { computed, ref } from 'vue';
import { useConfigStore } from '../../stores/config';
import { SEARCH_ENGINES, buildSearchUrl } from '../../core/search';

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
  <form class="search-widget" @submit.prevent="submit">
    <div class="search-row">
      <input v-model="query" type="search" placeholder="搜索网页" enterkeyhint="search" />
      <button type="submit" aria-label="搜索">搜索</button>
    </div>
    <div class="engine-block">
      <span class="engine-label">默认搜索引擎</span>
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
    </div>
  </form>
</template>

<style scoped>
.search-widget {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 5%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.search-row {
  display: flex;
  gap: 3%;
}

.search-row input {
  flex: 1;
  min-width: 0;
  padding: 2.5% 5%;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: #fff;
  font-size: clamp(11px, 7cqh, 16px);
  font-family: inherit;
  outline: none;
}

.search-row input::placeholder {
  color: rgb(255 255 255 / 0.65);
}

.search-row input:focus {
  background: rgb(255 255 255 / 0.26);
}

.search-row button {
  flex: 0 0 auto;
  padding: 2.5% 5%;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.9);
  color: #1b1e26;
  font-size: clamp(11px, 7cqh, 16px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.engine-block {
  display: flex;
  flex-direction: column;
  gap: 3%;
}

.engine-label {
  color: rgb(255 255 255 / 0.7);
  font-size: clamp(9px, 5cqh, 12px);
}

.engine-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2%;
}

.engine-chip {
  padding: 1.5% 3.5%;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.25);
  background: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.8);
  font-size: clamp(9px, 5.5cqh, 13px);
  font-family: inherit;
  cursor: pointer;
}

.engine-chip.active {
  border-color: rgb(255 255 255 / 0.7);
  background: rgb(255 255 255 / 0.28);
  color: #fff;
  font-weight: 600;
}
</style>
