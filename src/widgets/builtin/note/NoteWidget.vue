<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

/** 便签内容按实例 id 分存，各便签实例互不影响 */
const STORAGE_KEY = 'mruserspage:notes';

const props = defineProps<{
  /** 小组件实例 id，由框架在渲染时注入 */
  widgetId?: string;
}>();

const text = ref('');

function loadNote(id: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const map: unknown = JSON.parse(raw);
    if (map && typeof map === 'object') {
      const value = (map as Record<string, unknown>)[id];
      return typeof value === 'string' ? value : '';
    }
    return '';
  } catch {
    return '';
  }
}

function persist(): void {
  if (!props.widgetId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let map: Record<string, unknown> = {};
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') map = parsed as Record<string, unknown>;
    }
    if (text.value.trim()) {
      map[props.widgetId] = text.value;
    } else {
      delete map[props.widgetId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 超出配额等场景下静默失败，内存态仍可正常使用
  }
}

onMounted(() => {
  if (props.widgetId) text.value = loadNote(props.widgetId);
});

watch(text, persist);
</script>

<template>
  <div class="note-widget">
    <div class="note-head">
      <span class="note-title">便签</span>
    </div>
    <textarea v-model="text" class="note-input" placeholder="输入便签内容" />
  </div>
</template>

<style scoped>
.note-widget {
  display: flex;
  flex-direction: column;
  gap: 3%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

.note-head {
  flex: 0 0 auto;
}

/* 标题为次要信息，正文为重心 */
.note-title {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  font-weight: 400;
}

.note-input {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-size: clamp(12px, 6cqh, 15px);
  line-height: 1.4;
  font-family: inherit;
  outline: none;
  resize: none;
  overflow: hidden;
}

.note-input::placeholder {
  color: rgb(255 255 255 / 0.55);
}
</style>
