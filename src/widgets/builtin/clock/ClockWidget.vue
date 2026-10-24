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
  justify-content: center;
  gap: 2%;
  width: 100%;
  height: 100%;
  padding: 6%;
  box-sizing: border-box;
  overflow: hidden;
}

/* Metro 时钟：细体大数字、扁平纯色、无阴影。
   时间以「占满高度」和「撑满宽度」同时约束（88cqh 上限 / 32cqw 按 5 字符估算），
   让 HH:MM 尽量铺满磁贴，而非小字居中留白。 */
.clock-time {
  font-weight: 300;
  font-size: clamp(24px, min(88cqh, 32cqw), 160px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.clock-date {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, min(8cqh, 9cqw), 18px);
  white-space: nowrap;
}

/* 横条形态（1 行高）只留时间，隐藏日期 */
@container (max-height: 130px) {
  .clock-date {
    display: none;
  }
}
</style>
