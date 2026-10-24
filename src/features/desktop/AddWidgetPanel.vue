<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { loadUserWidgetFromZip } from '../../widgets';
import { useWidgetDocs } from '../../composables/useWidgetDocs';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const file = ref<File | null>(null);
const loading = ref(false);
const error = ref('');
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const { docsUrl, copied, copyDocsLink } = useWidgetDocs();

const canSubmit = computed(() => !!file.value && !loading.value);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !loading.value) emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = input.files?.[0] ?? null;
  if (selected) setFile(selected);
  input.value = '';
}

function setFile(selected: File) {
  error.value = '';
  file.value = selected;
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  const selected = event.dataTransfer?.files?.[0] ?? null;
  if (selected) setFile(selected);
}

async function submit() {
  if (!canSubmit.value || !file.value) return;
  loading.value = true;
  error.value = '';
  try {
    await loadUserWidgetFromZip(file.value);
    emit('close');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '小组件导入失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flat-page" role="dialog" aria-label="导入小组件">
    <header class="flat-page-header">
      <h2 class="flat-page-title">导入小组件</h2>
      <button type="button" class="flat-page-close" @click="emit('close')">关闭</button>
    </header>
    <form class="flat-page-body" @submit.prevent="submit">
      <div
        class="dropzone"
        :class="{ active: dragging, 'has-file': !!file }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <input ref="fileInput" type="file" accept=".zip,application/zip" @change="pickFile" />
        <span v-if="file" class="drop-file">{{ file.name }}</span>
        <span v-else class="drop-hint">选择或拖入 .zip 压缩包</span>
      </div>
      <p class="flat-note">
        压缩包内需包含 manifest.json 与入口文件 index.js（或 index.mjs）。
        小组件遵循标准协议运行，导入后即时生效。
      </p>
      <div class="docs-row">
        <a class="flat-link" :href="docsUrl" target="_blank" rel="noopener">查看接入说明</a>
        <button type="button" class="copy-btn" @click="copyDocsLink">{{ copied ? '已复制' : '复制说明页链接' }}</button>
      </div>
      <p v-if="error" class="flat-note widget-error">{{ error }}</p>
      <div class="panel-actions">
        <button type="button" class="flat-btn" :disabled="loading" @click="emit('close')">取消</button>
        <button type="submit" class="flat-btn flat-btn-primary" :disabled="!canSubmit">
          {{ loading ? '导入中' : '导入' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.dropzone {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 120px;
  padding: 16px;
  border: 2px dashed var(--flat-border);
  cursor: pointer;
}

.dropzone.active {
  border-color: var(--accent);
  background: var(--flat-hover);
}

.dropzone.has-file {
  border-style: solid;
  border-color: var(--accent);
}

.dropzone input {
  display: none;
}

.drop-file {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

.drop-hint {
  color: var(--flat-secondary);
  font-size: 13px;
}

.docs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.flat-link {
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.flat-link:hover {
  text-decoration: underline;
}

.copy-btn {
  padding: 5px 12px;
  border: 2px solid var(--accent);
  background: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.copy-btn:active {
  background: var(--accent);
  color: #fff;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.flat-btn-primary:disabled {
  border-color: var(--flat-border);
  background: var(--flat-hover);
  color: var(--flat-tertiary);
  cursor: not-allowed;
}

.widget-error {
  color: var(--danger);
}
</style>
