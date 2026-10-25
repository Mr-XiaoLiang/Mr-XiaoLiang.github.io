<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

/** 待办清单数据统一存一份，所有待办小组件实例共享（个人主页只维护一份清单） */
const STORAGE_KEY = 'mruserspage:todo';

const todos = ref<TodoItem[]>([]);
const draft = ref('');

function genId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function load(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const result: TodoItem[] = [];
    for (const item of data) {
      if (item && typeof item === 'object' && typeof (item as TodoItem).text === 'string') {
        const entry = item as TodoItem;
        if (!entry.text.trim()) continue;
        result.push({
          id: typeof entry.id === 'string' ? entry.id : genId(),
          text: entry.text,
          done: entry.done === true,
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value));
  } catch {
    // 超出配额等场景下静默失败，内存态仍可正常使用
  }
}

onMounted(() => {
  todos.value = load();
});

const remaining = computed(() => todos.value.filter((item) => !item.done).length);

function addTodo(): void {
  const text = draft.value.trim();
  if (!text) return;
  todos.value = [...todos.value, { id: genId(), text, done: false }];
  draft.value = '';
  persist();
}

function toggle(item: TodoItem): void {
  todos.value = todos.value.map((t) => (t.id === item.id ? { ...t, done: !t.done } : t));
  persist();
}

function remove(item: TodoItem): void {
  todos.value = todos.value.filter((t) => t.id !== item.id);
  persist();
}
</script>

<template>
  <div class="todo-widget">
    <div class="todo-head">
      <span class="todo-title">待办</span>
      <span class="todo-count">{{ remaining === 0 ? '全部完成' : `剩余 ${remaining}` }}</span>
    </div>

    <ul class="todo-list">
      <li v-for="item in todos" :key="item.id" class="todo-item" :class="{ done: item.done }">
        <button
          type="button"
          class="todo-check"
          :aria-label="item.done ? '标记为未完成' : '标记为已完成'"
          @click="toggle(item)"
        >
          <svg
            v-if="item.done"
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
        <span class="todo-text" @click="toggle(item)">{{ item.text }}</span>
        <button type="button" class="todo-del" aria-label="删除待办" @click="remove(item)">×</button>
      </li>
      <li v-if="todos.length === 0" class="todo-empty">暂无待办</li>
    </ul>

    <form class="todo-add" @submit.prevent="addTodo">
      <input v-model="draft" class="todo-input" type="text" placeholder="新增待办" enterkeyhint="done" />
      <button type="submit" class="todo-add-btn" aria-label="添加待办">＋</button>
    </form>
  </div>
</template>

<style scoped>
.todo-widget {
  display: flex;
  flex-direction: column;
  gap: 3%;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 标题行：标题为重心，计数为次要信息，基线对齐 */
.todo-head {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5em;
}

.todo-title {
  color: #fff;
  font-size: clamp(13px, 8cqh, 20px);
  font-weight: 600;
  line-height: 1;
}

.todo-count {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
  font-weight: 400;
}

/* 列表：占据剩余高度，超出部分裁剪（小组件协议禁止内部滚动） */
.todo-list {
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

.todo-item {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5em;
  font-size: clamp(11px, 5.5cqh, 14px);
}

/* 勾选框：直角、无圆角；完成态白色填充 + 深色对勾 */
.todo-check {
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

.todo-item.done .todo-check {
  border-color: #fff;
  background: #fff;
}

.todo-check svg {
  width: 0.8em;
  height: 0.8em;
}

/* 完成态以「方框填充 + 删除线」区分，文字保持不透明 */
.todo-text {
  flex: 1;
  min-width: 0;
  color: #fff;
  font-size: 1em;
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}

.todo-item.done .todo-text {
  text-decoration: line-through;
}

.todo-del {
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

.todo-del:hover {
  color: #fff;
}

.todo-empty {
  color: rgb(255 255 255 / 0.72);
  font-size: clamp(11px, 5cqh, 13px);
}

/* 新增输入行：Win8 无边框风格——仅底部一条细线 */
.todo-add {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgb(255 255 255 / 0.35);
}

.todo-input {
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

.todo-input::placeholder {
  color: rgb(255 255 255 / 0.55);
}

.todo-add-btn {
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

.todo-add-btn:hover {
  background: rgb(255 255 255 / 0.12);
}
</style>
