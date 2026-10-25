<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface Habit {
  id: string;
  name: string;
  /** 已打卡日期（YYYY-MM-DD） */
  checkedDates: string[];
}

const STORAGE_KEY = 'mruserspage:habits';

const habits = ref<Habit[]>([]);
const draft = ref('');

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayStr(): string {
  return dateStr(new Date());
}

function genId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 连续打卡天数：今天未打卡时从昨天起算，保证「昨天打卡、今天未打」仍正确计数 */
function streak(dates: string[]): number {
  const set = new Set(dates);
  const cursor = new Date();
  if (!set.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (set.has(dateStr(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function isTodayChecked(habit: Habit): boolean {
  return habit.checkedDates.includes(todayStr());
}

function load(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const result: Habit[] = [];
    for (const item of data) {
      if (item && typeof item === 'object' && typeof (item as Habit).name === 'string') {
        const entry = item as Habit;
        if (!entry.name.trim()) continue;
        result.push({
          id: typeof entry.id === 'string' ? entry.id : genId(),
          name: entry.name,
          checkedDates: Array.isArray(entry.checkedDates)
            ? entry.checkedDates.filter((date): date is string => typeof date === 'string')
            : [],
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits.value));
  } catch {
    // 超出配额等场景下静默失败，内存态仍可正常使用
  }
}

onMounted(() => {
  habits.value = load();
});

function addHabit(): void {
  const name = draft.value.trim();
  if (!name) return;
  habits.value = [...habits.value, { id: genId(), name, checkedDates: [] }];
  draft.value = '';
  persist();
}

function toggle(habit: Habit): void {
  const today = todayStr();
  habits.value = habits.value.map((item) => {
    if (item.id !== habit.id) return item;
    const checked = item.checkedDates.includes(today);
    return {
      ...item,
      checkedDates: checked ? item.checkedDates.filter((date) => date !== today) : [...item.checkedDates, today],
    };
  });
  persist();
}

function remove(habit: Habit): void {
  habits.value = habits.value.filter((item) => item.id !== habit.id);
  persist();
}
</script>

<template>
  <div class="habit-widget">
    <div class="habit-head">
      <span class="habit-title">习惯</span>
    </div>

    <ul class="habit-list">
      <li v-for="habit in habits" :key="habit.id" class="habit-item" :class="{ done: isTodayChecked(habit) }">
        <button
          type="button"
          class="habit-check"
          :aria-label="isTodayChecked(habit) ? '取消今日打卡' : '今日打卡'"
          @click="toggle(habit)"
        >
          <svg
            v-if="isTodayChecked(habit)"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="4 12.5 9.5 18 20 6.5" />
          </svg>
        </button>
        <span class="habit-name">{{ habit.name }}</span>
        <span class="habit-streak">连续 {{ streak(habit.checkedDates) }} 天</span>
        <button type="button" class="habit-del" aria-label="删除习惯" @click="remove(habit)">×</button>
      </li>
      <li v-if="habits.length === 0" class="habit-empty">暂无习惯，添加后开始打卡</li>
    </ul>

    <form class="habit-add" @submit.prevent="addHabit">
      <input v-model="draft" class="habit-input" type="text" placeholder="新增习惯" enterkeyhint="done" />
      <button type="submit" class="habit-add-btn" aria-label="添加习惯">＋</button>
    </form>
  </div>
</template>

<style scoped>
.habit-widget {
  display: flex;
  flex-direction: column;
  gap: 3%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.habit-head {
  flex: 0 0 auto;
}

.habit-title {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  font-weight: 400;
}

.habit-list {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 2%;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.habit-item {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5em;
  font-size: clamp(11px, 5.5cqh, 14px);
}

/* 勾选框：直角；打卡后白色填充 + 深色对勾 */
.habit-check {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.15em;
  height: 1.15em;
  padding: 0;
  border: 1.5px solid rgb(255 255 255 / 0.65);
  border-radius: 0;
  background: transparent;
  color: #1b1e26;
  cursor: pointer;
}

.habit-item.done .habit-check {
  border-color: #fff;
  background: #fff;
}

.habit-check svg {
  width: 0.8em;
  height: 0.8em;
}

.habit-name {
  flex: 1;
  min-width: 0;
  color: #fff;
  font-size: 1em;
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.habit-item.done .habit-name {
  text-decoration: line-through;
}

.habit-streak {
  flex: 0 0 auto;
  color: rgb(255 255 255 / 0.72);
  font-size: 0.85em;
  white-space: nowrap;
}

.habit-del {
  flex: 0 0 auto;
  width: 1.1em;
  height: 1.1em;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: rgb(255 255 255 / 0.5);
  font-size: 1em;
  line-height: 1;
  cursor: pointer;
}

.habit-del:hover {
  color: #fff;
}

.habit-empty {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
}

.habit-add {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgb(255 255 255 / 0.35);
}

.habit-input {
  flex: 1;
  min-width: 0;
  height: 1.9em;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-size: clamp(11px, 5.5cqh, 14px);
  font-family: inherit;
  outline: none;
}

.habit-input::placeholder {
  color: rgb(255 255 255 / 0.55);
}

.habit-add-btn {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.6em;
  height: 1.6em;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(13px, 6cqh, 16px);
  cursor: pointer;
}

.habit-add-btn:hover {
  background: rgb(255 255 255 / 0.12);
}
</style>
