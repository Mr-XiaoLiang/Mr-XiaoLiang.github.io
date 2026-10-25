<script setup lang="ts">
import { onMounted, ref } from 'vue';

const text = ref('');
const source = ref('');
const loading = ref(false);
const failed = ref(false);

async function loadHitokoto(): Promise<void> {
  loading.value = true;
  failed.value = false;
  try {
    const response = await fetch('https://v1.hitokoto.cn/');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    text.value = typeof data?.hitokoto === 'string' ? data.hitokoto : '';
    const from = typeof data?.from === 'string' ? data.from : '';
    const who = typeof data?.from_who === 'string' ? data.from_who : '';
    source.value = who ? `${from} · ${who}` : from;
  } catch {
    failed.value = true;
    text.value = '';
    source.value = '';
  } finally {
    loading.value = false;
  }
}

onMounted(loadHitokoto);
</script>

<template>
  <div class="hitokoto-widget">
    <div class="hitokoto-body">
      <span v-if="loading" class="hitokoto-text">…</span>
      <span v-else-if="failed" class="hitokoto-text">加载失败</span>
      <span v-else class="hitokoto-text">{{ text || '…' }}</span>
    </div>
    <div class="hitokoto-foot">
      <span class="hitokoto-source">{{ source }}</span>
      <button type="button" class="hitokoto-refresh" :disabled="loading" @click="loadHitokoto">换一句</button>
    </div>
  </div>
</template>

<style scoped>
.hitokoto-widget {
  display: flex;
  flex-direction: column;
  gap: 4%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.hitokoto-body {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 文案为重心：Metro 细体，可多行，超出裁剪（协议禁止内部滚动） */
.hitokoto-text {
  color: #fff;
  font-size: clamp(13px, 7cqh, 18px);
  font-weight: 300;
  line-height: 1.5;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.hitokoto-foot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hitokoto-source {
  flex: 1;
  min-width: 0;
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hitokoto-refresh {
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

.hitokoto-refresh:hover {
  background: rgb(255 255 255 / 0.12);
}

.hitokoto-refresh:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
