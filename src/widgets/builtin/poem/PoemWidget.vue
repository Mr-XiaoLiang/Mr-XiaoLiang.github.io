<script setup lang="ts">
import { onMounted, ref } from 'vue';

const content = ref('');
const origin = ref('');
const loading = ref(false);
const failed = ref(false);

async function loadPoem(): Promise<void> {
  loading.value = true;
  failed.value = false;
  try {
    const response = await fetch('https://v1.jinrishici.com/all.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    content.value = typeof data?.content === 'string' ? data.content : '';
    const author = typeof data?.author === 'string' ? data.author : '';
    const work = typeof data?.origin === 'string' ? data.origin : '';
    origin.value = [work, author].filter(Boolean).join(' · ');
  } catch {
    failed.value = true;
    content.value = '';
    origin.value = '';
  } finally {
    loading.value = false;
  }
}

onMounted(loadPoem);
</script>

<template>
  <div class="poem-widget">
    <div class="poem-body">
      <span v-if="loading" class="poem-content">…</span>
      <span v-else-if="failed" class="poem-content">加载失败</span>
      <span v-else class="poem-content">{{ content || '…' }}</span>
    </div>
    <div class="poem-foot">
      <span class="poem-origin">{{ origin }}</span>
      <button type="button" class="poem-refresh" :disabled="loading" @click="loadPoem">换一句</button>
    </div>
  </div>
</template>

<style scoped>
.poem-widget {
  display: flex;
  flex-direction: column;
  gap: 4%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.poem-body {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 诗句为重心：Metro 细体，可多行，超出裁剪（协议禁止内部滚动） */
.poem-content {
  color: #fff;
  font-size: clamp(13px, 7cqh, 18px);
  font-weight: 300;
  line-height: 1.6;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.poem-foot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.poem-origin {
  flex: 1;
  min-width: 0;
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.poem-refresh {
  flex: 0 0 auto;
  padding: 0.4em 0.9em;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(11px, 5.5cqh, 13px);
  font-family: inherit;
  cursor: pointer;
}

.poem-refresh:hover {
  background: rgb(255 255 255 / 0.12);
}

.poem-refresh:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
