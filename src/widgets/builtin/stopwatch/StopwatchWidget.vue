<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

const elapsed = ref(0);
const running = ref(false);
let timer = 0;
let startAt = 0;

const timeText = computed(() => format(elapsed.value));
const toggleText = computed(() => (running.value ? '暂停' : '开始'));

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function format(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

function start(): void {
  if (running.value) return;
  running.value = true;
  startAt = Date.now() - elapsed.value;
  timer = window.setInterval(() => {
    elapsed.value = Date.now() - startAt;
  }, 50);
}

function pause(): void {
  running.value = false;
  window.clearInterval(timer);
}

function toggle(): void {
  if (running.value) pause();
  else start();
}

function reset(): void {
  pause();
  elapsed.value = 0;
}

onBeforeUnmount(pause);
</script>

<template>
  <div class="stopwatch-widget">
    <span class="sw-label">秒表</span>
    <span class="sw-time">{{ timeText }}</span>
    <div class="sw-actions">
      <button type="button" class="sw-btn sw-btn-primary" @click="toggle">{{ toggleText }}</button>
      <button type="button" class="sw-btn" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.stopwatch-widget {
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

.sw-label {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 14px);
  font-weight: 400;
}

/* 大字号计时：Metro 细体，重心是时间 */
.sw-time {
  color: #fff;
  font-weight: 300;
  font-size: clamp(24px, min(38cqh, 40cqw), 110px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.sw-actions {
  display: flex;
  gap: 6px;
}

.sw-btn {
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

.sw-btn:hover {
  background: rgb(255 255 255 / 0.12);
}

.sw-btn-primary {
  border-color: var(--accent);
  background: var(--accent);
}

.sw-btn-primary:hover {
  filter: brightness(1.08);
}
</style>
