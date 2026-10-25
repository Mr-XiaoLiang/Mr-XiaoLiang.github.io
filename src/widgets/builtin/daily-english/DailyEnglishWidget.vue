<script setup lang="ts">
import { onMounted, ref } from 'vue';

const content = ref('');
const note = ref('');
const loading = ref(false);
const failed = ref(false);

async function loadDaily(): Promise<void> {
  loading.value = true;
  failed.value = false;
  try {
    const response = await fetch('https://open.iciba.com/dsapi/');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    content.value = typeof data?.content === 'string' ? data.content : '';
    note.value = typeof data?.note === 'string' ? data.note : '';
  } catch {
    failed.value = true;
    content.value = '';
    note.value = '';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDaily);
</script>

<template>
  <div class="daily-widget">
    <div class="daily-body">
      <span v-if="loading" class="daily-content">…</span>
      <span v-else-if="failed" class="daily-content">加载失败</span>
      <span v-else class="daily-content">{{ content || '…' }}</span>
      <span v-if="note" class="daily-note">{{ note }}</span>
    </div>
    <div class="daily-foot">
      <button type="button" class="daily-refresh" :disabled="loading" @click="loadDaily">刷新</button>
    </div>
  </div>
</template>

<style scoped>
.daily-widget {
  display: flex;
  flex-direction: column;
  gap: 4%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.daily-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3%;
  overflow: hidden;
}

/* 英文句子为重心：Metro 细体，可多行，超出裁剪 */
.daily-content {
  color: #fff;
  font-size: clamp(13px, 7cqh, 18px);
  font-weight: 300;
  line-height: 1.5;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.daily-note {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  line-height: 1.5;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.daily-foot {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
}

.daily-refresh {
  padding: 0.4em 0.9em;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(11px, 5.5cqh, 13px);
  font-family: inherit;
  cursor: pointer;
}

.daily-refresh:hover {
  background: rgb(255 255 255 / 0.12);
}

.daily-refresh:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
