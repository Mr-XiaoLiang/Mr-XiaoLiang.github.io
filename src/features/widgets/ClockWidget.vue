<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { WidgetSize } from '../../core/types';

const props = withDefaults(defineProps<{ size?: WidgetSize }>(), { size: 's' });

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

const timeSize = computed(() => (props.size === 'l' ? 46 : props.size === 'm' ? 32 : 22));
const dateSize = computed(() => (props.size === 'l' ? 15 : props.size === 'm' ? 13 : 11));

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
</script>

<template>
  <div class="clock-widget" :class="`size-${size}`">
    <span class="clock-time" :style="{ fontSize: `${timeSize}px` }">{{ time }}</span>
    <span class="clock-date" :style="{ fontSize: `${dateSize}px` }">{{ dateLine }}</span>
  </div>
</template>

<style scoped>
.clock-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
}

.clock-time {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.clock-date {
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
