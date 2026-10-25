<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

/** 倒计时配置统一存一份（个人主页只维护一个倒计时目标） */
const STORAGE_KEY = 'mruserspage:countdown';

interface CountdownData {
  title: string;
  target: string;
}

const data = ref<CountdownData | null>(null);
const editing = ref(false);
const formTitle = ref('');
const formTarget = ref('');

function load(): CountdownData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.target === 'string' && obj.target) {
        return { title: typeof obj.title === 'string' ? obj.title : '', target: obj.target };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function persist(): void {
  try {
    if (data.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 超出配额等场景下静默失败，内存态仍可正常使用
  }
}

onMounted(() => {
  data.value = load();
});

/** 以「今天」为起点计算剩余天数：正数未到、0 为当天、负数已过 */
const days = computed(() => {
  if (!data.value) return null;
  const target = new Date(`${data.value.target}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / 86400000);
});

const numberText = computed(() => (days.value === null || days.value === 0 ? '' : `${Math.abs(days.value)}`));
const unitText = computed(() => {
  if (days.value === null) return '';
  if (days.value > 0) return '天后';
  if (days.value < 0) return '天前';
  return '就是今天';
});

function beginEdit(): void {
  formTitle.value = data.value?.title ?? '';
  formTarget.value = data.value?.target ?? '';
  editing.value = true;
}

function save(): void {
  const target = formTarget.value.trim();
  if (!target) return;
  data.value = { title: formTitle.value.trim(), target };
  persist();
  editing.value = false;
}

function cancel(): void {
  editing.value = false;
}
</script>

<template>
  <div class="countdown-widget">
    <!-- 显示态：点击进入编辑 -->
    <div v-if="!editing" class="cd-display" @click="beginEdit">
      <span class="cd-title">{{ data?.title || '倒计时' }}</span>
      <div v-if="data" class="cd-main">
        <span v-if="days !== 0" class="cd-number">{{ numberText }}</span>
        <span class="cd-unit" :class="{ solo: days === 0 }">{{ unitText }}</span>
      </div>
      <span v-if="data" class="cd-date">{{ data.target }}</span>
      <span v-else class="cd-empty">点击设置倒计时</span>
    </div>

    <!-- 编辑态 -->
    <form v-else class="cd-form" @submit.prevent="save">
      <input v-model="formTitle" class="cd-input" type="text" placeholder="目标名称（可选）" />
      <input v-model="formTarget" class="cd-input" type="date" required />
      <div class="cd-actions">
        <button type="submit" class="cd-btn cd-btn-primary">保存</button>
        <button type="button" class="cd-btn" @click="cancel">取消</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.countdown-widget {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.cd-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2%;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.cd-title {
  max-width: 100%;
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 14px);
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 大数字 + 单位：Metro 细体大字号，重心是数字 */
.cd-main {
  display: flex;
  align-items: baseline;
  gap: 0.15em;
}

.cd-number {
  color: #fff;
  font-weight: 300;
  font-size: clamp(28px, min(34cqh, 34cqw), 110px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.cd-unit {
  color: #fff;
  font-size: clamp(12px, min(9cqh, 10cqw), 22px);
  font-weight: 400;
}

.cd-unit.solo {
  font-size: clamp(20px, min(24cqh, 24cqw), 60px);
  font-weight: 300;
}

.cd-date {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  font-variant-numeric: tabular-nums;
}

.cd-empty {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(12px, 6cqh, 15px);
}

/* 编辑态：Win8 无边框输入——仅底部一条细线 */
.cd-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.cd-input {
  width: 100%;
  height: 2em;
  padding: 0;
  border: none;
  border-bottom: 1px solid rgb(255 255 255 / 0.35);
  background: transparent;
  color: #fff;
  color-scheme: dark;
  font-size: clamp(12px, 6cqh, 14px);
  font-family: inherit;
  outline: none;
}

.cd-input:focus {
  border-bottom-color: var(--accent);
}

.cd-input::placeholder {
  color: rgb(255 255 255 / 0.55);
}

.cd-actions {
  display: flex;
  gap: 8px;
}

.cd-btn {
  flex: 1;
  padding: 0.5em 0;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(12px, 6cqh, 14px);
  font-family: inherit;
  cursor: pointer;
}

.cd-btn:hover {
  background: rgb(255 255 255 / 0.12);
}

.cd-btn-primary {
  border-color: var(--accent);
  background: var(--accent);
}
</style>
