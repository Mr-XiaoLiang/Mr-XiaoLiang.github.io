<script setup lang="ts">
import { computed, ref } from 'vue';

const today = new Date();
const view = ref({ year: today.getFullYear(), month: today.getMonth() });

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const title = computed(() => `${view.value.year}年${view.value.month + 1}月`);

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
    <span class="calendar-title">{{ title }}</span>
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

.calendar-title {
  color: rgb(255 255 255 / 0.85);
  font-size: clamp(10px, 7cqh, 18px);
  font-weight: 600;
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
  color: rgb(255 255 255 / 0.65);
  font-size: clamp(8px, 5cqh, 13px);
}

.calendar-day {
  display: grid;
  place-items: center;
  min-height: 0;
  color: #fff;
  font-size: clamp(8px, 5.5cqh, 14px);
  font-variant-numeric: tabular-nums;
}

.calendar-day.empty {
  visibility: hidden;
}

.calendar-day.today {
  border-radius: 6px;
  background: rgb(255 255 255 / 0.92);
  color: #1b1e26;
  font-weight: 700;
}
</style>
