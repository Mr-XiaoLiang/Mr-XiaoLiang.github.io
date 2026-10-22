<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { tileColorFor } from '../../core/theme';

export interface AddAppPayload {
  name: string;
  url: string;
  icon: string;
  fullIcon?: string;
  description?: string;
}

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: AddAppPayload): void;
}>();

const name = ref('');
const url = ref('');
const icon = ref('');
const fullIcon = ref('');
const description = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

const canSubmit = computed(() => name.value.trim().length > 0 && url.value.trim().length > 0);

const previewInitial = computed(() => name.value.trim().charAt(0).toUpperCase() || '新');
const previewColor = computed(() => tileColorFor(name.value.trim() || 'preview'));

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  nextTick(() => nameInput.value?.focus());
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

function submit() {
  if (!canSubmit.value) return;
  emit('submit', {
    name: name.value.trim(),
    url: url.value.trim(),
    icon: icon.value.trim(),
    fullIcon: fullIcon.value.trim() || undefined,
    description: description.value.trim(),
  });
}
</script>

<template>
  <div class="panel-mask" @click.self="emit('close')">
    <form class="panel" @submit.prevent="submit">
      <h2 class="panel-title">添加应用</h2>
      <div class="panel-preview">
        <span class="preview-tile" :style="{ background: previewColor }">
          <img v-if="icon.trim()" :src="icon.trim()" alt="" />
          <span v-else>{{ previewInitial }}</span>
        </span>
      </div>
      <label class="field">
        <span class="field-label">名称</span>
        <input ref="nameInput" v-model="name" type="text" maxlength="30" placeholder="网站名称" required />
      </label>
      <label class="field">
        <span class="field-label">网址</span>
        <input v-model="url" type="text" placeholder="example.com" required />
      </label>
      <label class="field">
        <span class="field-label">图标地址（选填）</span>
        <input v-model="icon" type="text" placeholder="https://..." />
      </label>
      <label class="field">
        <span class="field-label">全覆盖图（选填）</span>
        <input v-model="fullIcon" type="text" placeholder="https://...，优先于图标平铺整个磁块" />
      </label>
      <label class="field">
        <span class="field-label">描述（选填）</span>
        <input v-model="description" type="text" maxlength="60" placeholder="一句话说明" />
      </label>
      <p v-if="!icon.trim() && !fullIcon.trim()" class="field-note">未填写图片时将使用名称首字生成色块</p>
      <div class="panel-actions">
        <button type="button" class="btn btn-plain" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="!canSubmit">添加</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.panel-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(360px, 100%);
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 22px;
  border-radius: 22px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.4);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  color: var(--text);
}

.panel-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
}

.panel-preview {
  display: grid;
  place-items: center;
}

.preview-tile {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  overflow: hidden;
  color: #fff;
  font-size: 22px;
  font-weight: 600;
}

.preview-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.field input {
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgb(255 255 255 / 0.08);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.field input:focus {
  border-color: rgb(255 255 255 / 0.4);
}

.field-note {
  margin: -6px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 18px;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.btn:active {
  transform: scale(0.96);
}

.btn-plain {
  background: rgb(255 255 255 / 0.1);
  color: var(--text);
}

.btn-primary {
  background: #1ba1e2;
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
