<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    url?: string;
    name?: string;
  }>(),
  {
    url: '',
    name: '网页小组件',
  },
);

const hasUrl = computed(() => props.url.length > 0);

function openExternal() {
  if (props.url) window.open(props.url, '_blank', 'noopener');
}
</script>

<template>
  <div class="iframe-widget">
    <iframe
      v-if="hasUrl"
      class="iframe-frame"
      :src="url"
      :title="name"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    />
    <div v-else class="iframe-empty">未配置网址</div>
    <div class="iframe-bar">
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
  background: #fff;
}

.iframe-frame {
  flex: 1;
  width: 100%;
  border: none;
}

.iframe-empty {
  display: grid;
  flex: 1;
  place-items: center;
  background: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.75);
  font-size: 12px;
}

.iframe-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgb(0 0 0 / 0.35);
}

.iframe-name {
  flex: 1;
  overflow: hidden;
  color: rgb(255 255 255 / 0.85);
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.iframe-bar button {
  flex: 0 0 auto;
  padding: 3px 10px;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.85);
  color: #1b1e26;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
</style>
