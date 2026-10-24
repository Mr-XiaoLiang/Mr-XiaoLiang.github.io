<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { loadUserWidget } from '../../widgets';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const manifestUrl = ref('');
const entryUrl = ref('');
const loading = ref(false);
const error = ref('');
const manifestInput = ref<HTMLInputElement | null>(null);

const canSubmit = computed(
  () => manifestUrl.value.trim().length > 0 && entryUrl.value.trim().length > 0 && !loading.value,
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !loading.value) emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  nextTick(() => manifestInput.value?.focus());
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

async function submit() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = '';
  try {
    await loadUserWidget(manifestUrl.value.trim(), entryUrl.value.trim());
    emit('close');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '小组件加载失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flat-page" role="dialog" aria-label="添加小组件">
    <header class="flat-page-header">
      <h2 class="flat-page-title">添加小组件</h2>
      <button type="button" class="flat-page-close" @click="emit('close')">关闭</button>
    </header>
    <form class="flat-page-body" @submit.prevent="submit">
      <label class="field">
        <span class="flat-label">manifest.json 地址</span>
        <input
          ref="manifestInput"
          v-model="manifestUrl"
          class="flat-input"
          type="text"
          placeholder="https://…/manifest.json"
          required
        />
      </label>
      <label class="field">
        <span class="flat-label">入口代码文件地址（ES 模块）</span>
        <input v-model="entryUrl" class="flat-input" type="text" placeholder="https://…/index.js" required />
      </label>
      <p class="flat-note">
        小组件须遵循标准协议：manifest.json 声明元数据与尺寸约束，入口文件默认导出一个 Vue 组件。
        入口文件须为同源或允许跨域的 ES 模块；小组件内部不可使用滚动区域，以免影响桌面滑动。
      </p>
      <p v-if="error" class="flat-note widget-error">{{ error }}</p>
      <div class="panel-actions">
        <button type="button" class="flat-btn" :disabled="loading" @click="emit('close')">取消</button>
        <button type="submit" class="flat-btn flat-btn-primary" :disabled="!canSubmit">
          {{ loading ? '加载中' : '添加' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
