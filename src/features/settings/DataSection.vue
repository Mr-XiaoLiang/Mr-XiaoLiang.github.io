<script setup lang="ts">
import { ref } from 'vue';
import { useConfigStore } from '../../stores/config';

const store = useConfigStore();

const confirmingReset = ref(false);
const message = ref('');
const error = ref('');

function exportConfig() {
  if (!store.config) return;
  const blob = new Blob([JSON.stringify(store.config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mruserpage-config.json';
  anchor.click();
  URL.revokeObjectURL(url);
  message.value = '配置已导出';
  error.value = '';
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  message.value = '';
  error.value = '';
  try {
    const text = await file.text();
    store.importConfig(JSON.parse(text));
    message.value = '配置已导入';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '导入失败';
  }
  input.value = '';
}

async function reset() {
  await store.resetToDefault();
  confirmingReset.value = false;
  message.value = '已恢复默认配置';
  error.value = '';
}
</script>

<template>
  <section class="flat-section">
    <h3 class="flat-section-title">数据</h3>
    <div class="action-row">
      <button type="button" class="flat-btn" @click="exportConfig">导出配置</button>
      <label class="flat-btn">
        导入配置
        <input type="file" accept="application/json,.json" @change="onImport" />
      </label>
    </div>
    <div class="action-row">
      <template v-if="confirmingReset">
        <span class="reset-warning">将清空全部个性化数据，此操作不可撤销</span>
        <button type="button" class="flat-btn flat-btn-danger" @click="reset">确认恢复</button>
        <button type="button" class="flat-btn" @click="confirmingReset = false">取消</button>
      </template>
      <button v-else type="button" class="flat-btn" @click="confirmingReset = true">恢复默认</button>
    </div>
    <p v-if="message" class="flat-note">{{ message }}</p>
    <p v-if="error" class="wp-error">{{ error }}</p>
  </section>
</template>

<style scoped>
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.action-row label input {
  display: none;
}

.reset-warning {
  flex: 1;
  min-width: 180px;
  color: var(--danger);
  font-size: 12px;
}

.wp-error {
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}
</style>
