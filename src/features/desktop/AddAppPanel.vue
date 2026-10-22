<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { tileColorFor } from '../../core/theme';
import FaviconImage from './FaviconImage.vue';

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

/** 预览中 favicon 是否已尝试失败，失败则显示首字 */
const faviconFailed = ref(false);

watch(url, () => {
  faviconFailed.value = false;
});

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
  <div class="flat-page" role="dialog" aria-label="添加应用">
    <header class="flat-page-header">
      <h2 class="flat-page-title">添加应用</h2>
      <button type="button" class="flat-page-close" @click="emit('close')">关闭</button>
    </header>
    <form class="flat-page-body" @submit.prevent="submit">
      <div class="panel-preview">
        <span class="preview-tile" :style="{ background: previewColor }">
          <img v-if="icon.trim()" :src="icon.trim()" alt="" />
          <FaviconImage v-else-if="url.trim() && !faviconFailed" :url="url" alt="" @failed="faviconFailed = true" />
          <span v-else>{{ previewInitial }}</span>
        </span>
      </div>
      <label class="field">
        <span class="flat-label">名称</span>
        <input ref="nameInput" v-model="name" class="flat-input" type="text" maxlength="30" placeholder="网站名称" required />
      </label>
      <label class="field">
        <span class="flat-label">网址</span>
        <input v-model="url" class="flat-input" type="text" placeholder="example.com" required />
      </label>
      <label class="field">
        <span class="flat-label">图标地址（选填）</span>
        <input v-model="icon" class="flat-input" type="text" placeholder="https://..." />
      </label>
      <label class="field">
        <span class="flat-label">全覆盖图（选填）</span>
        <input v-model="fullIcon" class="flat-input" type="text" placeholder="https://...，优先于图标平铺整个磁块" />
      </label>
      <label class="field">
        <span class="flat-label">描述（选填）</span>
        <input v-model="description" class="flat-input" type="text" maxlength="60" placeholder="一句话说明" />
      </label>
      <p v-if="!icon.trim() && !fullIcon.trim()" class="flat-note">
        未填写图片时将尝试抓取网站图标，抓取不到则使用名称首字生成色块
      </p>
      <div class="panel-actions">
        <button type="button" class="flat-btn" @click="emit('close')">取消</button>
        <button type="submit" class="flat-btn flat-btn-primary" :disabled="!canSubmit">添加</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.panel-preview {
  display: grid;
  place-items: center;
}

.preview-tile {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  color: #fff;
  font-size: 24px;
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
</style>
