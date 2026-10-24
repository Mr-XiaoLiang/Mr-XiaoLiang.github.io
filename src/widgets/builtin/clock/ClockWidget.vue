<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const now = ref(new Date());
let timer = 0;

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => window.clearInterval(timer));

const time = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}`);

const dateLine = computed(() => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.value.getMonth() + 1}月${now.value.getDate()}日 星期${weekdays[now.value.getDay()]}`;
});

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
</script>

<template>
  <div class="clock-widget">
    <span class="clock-time">{{ time }}</span>
    <span class="clock-date">{{ dateLine }}</span>
  </div>
</template>

<style scoped>
.clock-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  gap: 4%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 字号同时受高度与宽度约束，窄高磁贴（如 2x3）不溢出 */
.clock-time {
  font-weight: 700;
  font-size: clamp(18px, min(26cqh, 30cqw), 64px);
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
}

.clock-date {
  color: rgb(255 255 255 / 0.85);
  font-size: clamp(10px, min(8cqh, 9cqw), 18px);
  white-space: nowrap;
}
</style>
