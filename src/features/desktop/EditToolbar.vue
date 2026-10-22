<script setup lang="ts">
import { useEditMode } from './editState';

const { exit } = useEditMode();
</script>

<template>
  <div class="edit-toolbar">
    <span class="edit-hint">拖动磁块调整位置，可跨屏移动；拖拽右下角手柄调整尺寸</span>
    <button type="button" class="edit-done" @click="exit">完成</button>
  </div>
</template>

<style scoped>
.edit-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  width: fit-content;
  margin: 0 auto 10px;
  padding: 8px 10px 8px 18px;
  border-radius: 999px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
}

.edit-hint {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.edit-done {
  padding: 6px 16px;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.edit-done:active {
  transform: scale(0.96);
}
</style>
