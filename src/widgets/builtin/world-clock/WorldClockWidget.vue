<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const CITIES = [
  { name: '北京', zone: 'Asia/Shanghai' },
  { name: '东京', zone: 'Asia/Tokyo' },
  { name: '伦敦', zone: 'Europe/London' },
  { name: '纽约', zone: 'America/New_York' },
  { name: '洛杉矶', zone: 'America/Los_Angeles' },
  { name: '悉尼', zone: 'Australia/Sydney' },
];

const now = ref(new Date());
let timer = 0;

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => window.clearInterval(timer));

function timeIn(zone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now.value);
}
</script>

<template>
  <div class="world-clock-widget">
    <span class="wc-title">世界时钟</span>
    <div class="wc-grid">
      <div v-for="city in CITIES" :key="city.zone" class="wc-cell">
        <span class="wc-name">{{ city.name }}</span>
        <span class="wc-time">{{ timeIn(city.zone) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.world-clock-widget {
  display: flex;
  flex-direction: column;
  gap: 3%;
  width: 100%;
  height: 100%;
  padding: 7%;
  box-sizing: border-box;
  overflow: hidden;
}

.wc-title {
  flex: 0 0 auto;
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  font-weight: 400;
}

/* 两列网格：每个城市一单元，超出裁剪（协议禁止内部滚动） */
.wc-grid {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  gap: 2% 6%;
  overflow: hidden;
}

.wc-cell {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  gap: 2%;
}

.wc-name {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wc-time {
  color: #fff;
  font-size: clamp(13px, 9cqh, 22px);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}
</style>
