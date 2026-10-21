<script setup lang="ts">
import { computed, ref } from 'vue';
import type { WidgetSize } from '../../core/types';

withDefaults(defineProps<{ size?: WidgetSize }>(), { size: 'm' });

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
  <div class="calendar-widget" :class="`size-${size}`">
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
  gap: 8px;
  padding: 12px;
}

.calendar-title {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  gap: 2px;
  flex: 1;
  min-height: 0;
}

.calendar-weekday {
  color: var(--text-secondary);
  font-size: 10px;
  text-align: center;
}

.calendar-day {
  display: grid;
  place-items: center;
  min-height: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.calendar-day.empty {
  visibility: hidden;
}

.calendar-day.today {
  border-radius: 8px;
  background: #3b6ef5;
  color: #fff;
  font-weight: 700;
}

.calendar-widget.size-l .calendar-day {
  font-size: 13px;
}

.calendar-widget.size-l .calendar-title {
  font-size: 14px;
}
</style>
