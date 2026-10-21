<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useConfigStore } from './stores/config';
import { useTheme } from './composables/useTheme';
import DesktopView from './features/desktop/DesktopView.vue';

const store = useConfigStore();

const themeMode = computed(() => store.config?.theme ?? 'auto');
useTheme(themeMode);

onMounted(() => {
  void store.init();
});
</script>

<template>
  <DesktopView v-if="store.ready && store.config" />
  <div v-else-if="store.error" class="boot boot-error">{{ store.error }}</div>
  <div v-else class="boot">正在加载</div>
</template>

<style scoped>
.boot {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
}

.boot-error {
  padding: 0 24px;
  text-align: center;
}
</style>
