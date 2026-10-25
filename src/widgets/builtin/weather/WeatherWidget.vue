<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface City {
  name: string;
  lat: number;
  lon: number;
}

const CITIES: City[] = [
  { name: '北京', lat: 39.9042, lon: 116.4074 },
  { name: '上海', lat: 31.2304, lon: 121.4737 },
  { name: '广州', lat: 23.1291, lon: 113.2644 },
  { name: '深圳', lat: 22.5431, lon: 114.0579 },
  { name: '成都', lat: 30.5728, lon: 104.0668 },
  { name: '杭州', lat: 30.2741, lon: 120.1551 },
];

const cityIndex = ref(0);
const temp = ref<number | null>(null);
const weather = ref('');
const loading = ref(false);
const failed = ref(false);

function weatherText(code: number): string {
  if (code === 0) return '晴';
  if (code === 1) return '大致晴朗';
  if (code === 2) return '多云';
  if (code === 3) return '阴';
  if (code === 45 || code === 48) return '雾';
  if (code >= 51 && code <= 57) return '毛毛雨';
  if (code >= 61 && code <= 67) return '雨';
  if (code >= 71 && code <= 77) return '雪';
  if (code >= 80 && code <= 82) return '阵雨';
  if (code >= 95) return '雷暴';
  return '未知';
}

async function loadWeather(): Promise<void> {
  const target = CITIES[cityIndex.value];
  loading.value = true;
  failed.value = false;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${target.lat}&longitude=${target.lon}` +
      `&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const current = data?.current;
    temp.value = typeof current?.temperature_2m === 'number' ? current.temperature_2m : null;
    weather.value = weatherText(typeof current?.weather_code === 'number' ? current.weather_code : -1);
  } catch {
    failed.value = true;
    temp.value = null;
    weather.value = '';
  } finally {
    loading.value = false;
  }
}

onMounted(loadWeather);
</script>

<template>
  <div class="weather-widget">
    <select v-model="cityIndex" class="weather-city" @change="loadWeather">
      <option v-for="(item, index) in CITIES" :key="item.name" :value="index">{{ item.name }}</option>
    </select>

    <template v-if="loading">
      <span class="weather-temp">…</span>
      <span class="weather-desc">加载中</span>
    </template>
    <template v-else-if="failed">
      <span class="weather-temp">—</span>
      <span class="weather-desc">加载失败</span>
    </template>
    <template v-else>
      <span class="weather-temp">{{ temp === null ? '—' : `${Math.round(temp)}°` }}</span>
      <span class="weather-desc">{{ weather }}</span>
    </template>
  </div>
</template>

<style scoped>
.weather-widget {
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

.weather-city {
  flex: 0 0 auto;
  max-width: 70%;
  height: 1.9em;
  padding: 0 4px;
  border: 1px solid rgb(255 255 255 / 0.3);
  border-radius: 0;
  background: rgb(0 0 0 / 0.3);
  color: #fff;
  color-scheme: dark;
  font-size: clamp(11px, 5cqh, 13px);
  font-family: inherit;
  outline: none;
}

/* 大字号温度：Metro 细体；字号以宽度为主约束，负温度等多字符时也不溢出磁块 */
.weather-temp {
  color: #fff;
  font-weight: 300;
  font-size: clamp(30px, min(42cqh, 30cqw), 96px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  max-width: 100%;
}

.weather-desc {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(12px, 6cqh, 16px);
  font-weight: 400;
}
</style>
