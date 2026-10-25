<script setup lang="ts">
import { ref } from 'vue';

const result = ref('—');
const label = ref('随机数');

function rollDice(): void {
  result.value = String(1 + Math.floor(Math.random() * 6));
  label.value = '骰子';
}

function randomRange(): void {
  result.value = String(1 + Math.floor(Math.random() * 100));
  label.value = '1–100';
}
</script>

<template>
  <div class="random-widget">
    <span class="random-label">{{ label }}</span>
    <span class="random-result">{{ result }}</span>
    <div class="random-actions">
      <button type="button" class="random-btn random-btn-primary" @click="rollDice">骰子</button>
      <button type="button" class="random-btn" @click="randomRange">1–100</button>
    </div>
  </div>
</template>

<style scoped>
.random-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.random-label {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 14px);
  font-weight: 400;
}

/* 大字号结果：Metro 细体，重心是数字 */
.random-result {
  color: #fff;
  font-weight: 300;
  font-size: clamp(32px, min(44cqh, 44cqw), 120px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.random-actions {
  display: flex;
  gap: 6px;
}

.random-btn {
  min-width: 3.2em;
  padding: 0.45em 0.9em;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(11px, 5.5cqh, 14px);
  font-family: inherit;
  cursor: pointer;
}

.random-btn:hover {
  background: rgb(255 255 255 / 0.12);
}

.random-btn-primary {
  border-color: var(--accent);
  background: var(--accent);
}

.random-btn-primary:hover {
  filter: brightness(1.08);
}
</style>
