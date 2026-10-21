<script setup lang="ts">
export interface SheetAction {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

defineProps<{
  title?: string;
  actions: SheetAction[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <div class="sheet" role="dialog" :aria-label="title ?? '操作'">
      <p v-if="title" class="sheet-title">{{ title }}</p>
      <button
        v-for="(action, index) in actions"
        :key="index"
        type="button"
        class="sheet-action"
        :class="{ danger: action.danger }"
        @click="action.onClick"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: end center;
  padding: 20px max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom))
    max(20px, env(safe-area-inset-left));
  background: rgb(0 0 0 / 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: min(340px, 100%);
  overflow: hidden;
  border-radius: 18px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.35);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
}

.sheet-title {
  margin: 0;
  padding: 14px 16px 10px;
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sheet-action {
  padding: 13px 16px;
  border: none;
  background: none;
  color: var(--text);
  font-size: 15px;
  font-family: inherit;
  text-align: center;
  cursor: pointer;
}

.sheet-action + .sheet-action {
  border-top: 1px solid var(--glass-border);
}

.sheet-action:active {
  background: rgb(255 255 255 / 0.08);
}

.sheet-action.danger {
  color: #ff5a5f;
  font-weight: 600;
}
</style>
