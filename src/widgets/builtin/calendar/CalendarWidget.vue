<script setup lang="ts">
import { computed, ref } from 'vue';

const today = new Date();
const view = ref({ year: today.getFullYear(), month: today.getMonth() });

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const monthLabel = computed(() => `${view.value.month + 1}月`);
const yearLabel = computed(() => `${view.value.year}年`);

const cells = computed<(number | null)[]>(() => {
  const { year, month } = view.value;
  const offset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const list: (number | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) list.push(day);
  while (list.length % 7 !== 0) list.push(null);
  return list;
});

function isToday(day: number | null): boolean {
  if (day === null) return false;
  return (
    today.getFullYear() === view.value.year &&
    today.getMonth() === view.value.month &&
    today.getDate() === day
  );
}
</script>

<template>
  <div class="calendar-widget">
    <div class="calendar-title">
      <span class="calendar-month">{{ monthLabel }}</span>
      <span class="calendar-year">{{ yearLabel }}</span>
    </div>
    <div class="calendar-grid">
      <span v-for="name in WEEKDAYS" :key="name" class="calendar-weekday">{{ name }}</span>
      <span
        v-for="(day, index) in cells"
        :key="index"
        class="calendar-day"
        :class="{ today: isToday(day), empty: day === null }"
        >{{ day ?? '' }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.calendar-widget {
  display: flex;
  flex-direction: column;
  gap: 4%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 标题：月份为视觉重心（大、醒目），年份为次要信息（小、弱），基线对齐 */
.calendar-title {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  color: #fff;
}

.calendar-month {
  font-size: clamp(16px, 13cqh, 30px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}

.calendar-year {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 6cqh, 15px);
  font-weight: 400;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  gap: 2%;
  flex: 1;
  min-height: 0;
}

.calendar-weekday {
  display: grid;
  place-items: center;
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  font-weight: 400;
}

.calendar-day {
  display: grid;
  place-items: center;
  min-height: 0;
  color: #fff;
  font-size: clamp(11px, 5.5cqh, 14px);
  font-variant-numeric: tabular-nums;
}

.calendar-day.empty {
  visibility: hidden;
}

/* 今日：直角纯白块 + 深色文字，高对比、扁平（Metro 无圆角） */
.calendar-day.today {
  border-radius: 0;
  background: #fff;
  color: #1b1e26;
  font-weight: 600;
}
</style>
