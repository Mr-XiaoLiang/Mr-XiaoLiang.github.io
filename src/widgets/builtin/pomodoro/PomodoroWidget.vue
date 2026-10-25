<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

/** 工作 / 休息时长（秒），番茄钟默认 25 / 5 分钟 */
const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const phase = ref<'work' | 'break'>('work');
const remaining = ref(WORK_SECONDS);
const running = ref(false);
let timer: number | null = null;

const label = computed(() => (phase.value === 'work' ? '工作中' : '休息中'));
const timeText = computed(() => format(remaining.value));
const toggleText = computed(() => (running.value ? '暂停' : '开始'));

function format(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function start(): void {
  if (running.value) return;
  running.value = true;
  timer = window.setInterval(() => {
    remaining.value -= 1;
    if (remaining.value <= 0) switchPhase();
  }, 1000);
}

function pause(): void {
  running.value = false;
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function toggle(): void {
  if (running.value) pause();
  else start();
}

/** 阶段结束自动切换到下一阶段并继续计时 */
function switchPhase(): void {
  phase.value = phase.value === 'work' ? 'break' : 'work';
  remaining.value = phase.value === 'work' ? WORK_SECONDS : BREAK_SECONDS;
}

function reset(): void {
  pause();
  phase.value = 'work';
  remaining.value = WORK_SECONDS;
}

onBeforeUnmount(pause);
</script>

<template>
  <div class="pomodoro-widget">
    <span class="pomo-label">{{ label }}</span>
    <span class="pomo-time">{{ timeText }}</span>
    <div class="pomo-actions">
      <button type="button" class="pomo-btn pomo-btn-primary" @click="toggle">{{ toggleText }}</button>
      <button type="button" class="pomo-btn" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pomodoro-widget {
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

.pomo-label {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 14px);
  font-weight: 400;
}

/* 大字号倒计时：Metro 细体；字号以宽度为主约束，保证 "25:00" 五字符不溢出磁块 */
.pomo-time {
  color: #fff;
  font-weight: 300;
  font-size: clamp(26px, min(38cqh, 28cqw), 96px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
  max-width: 100%;
}

.pomo-actions {
  display: flex;
  gap: 6px;
}

.pomo-btn {
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

.pomo-btn:hover {
  background: rgb(255 255 255 / 0.12);
}

.pomo-btn-primary {
  border-color: var(--accent);
  background: var(--accent);
}

.pomo-btn-primary:hover {
  filter: brightness(1.08);
}
</style>
