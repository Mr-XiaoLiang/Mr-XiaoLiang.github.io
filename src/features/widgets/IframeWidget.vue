<script setup lang="ts">
import { computed } from 'vue';
import type { WidgetSize } from '../../core/types';

const props = withDefaults(
  defineProps<{
    url?: string;
    name?: string;
    size?: WidgetSize;
  }>(),
  {
    url: '',
    name: '网页小组件',
    size: 'm',
  },
);

const showBar = computed(() => props.size !== 's');

function openExternal() {
  if (props.url) window.open(props.url, '_blank', 'noopener');
}
</script>

<template>
  <div class="iframe-widget">
    <iframe
      v-if="url"
      class="iframe-frame"
      :src="url"
      :title="name"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    />
    <div v-else class="iframe-empty">未配置网址</div>
    <div v-if="showBar" class="iframe-bar">
      <span class="iframe-name">{{ name }}</span>
      <button type="button" @click="openExternal">新窗口打开</button>
    </div>
  </div>
</template>

<style scoped>
.iframe-widget {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
}

.iframe-frame {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}

.iframe-empty {
  display: grid;
  flex: 1;
  place-items: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.iframe-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid var(--glass-border);
}

.iframe-name {
  flex: 1;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.iframe-bar button {
  flex: 0 0 auto;
  padding: 3px 10px;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.12);
  color: var(--text);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
</style>
