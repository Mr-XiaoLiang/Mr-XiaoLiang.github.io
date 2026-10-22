<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../../stores/config';
import { useWindowSize } from '../../composables/useWindowSize';
import { computeGrid, GRID_LIMITS } from '../../core/grid';
import type { Density, LayoutSetting } from '../../core/types';

const store = useConfigStore();
const { width, height } = useWindowSize();

const layout = computed<LayoutSetting>(() => store.config?.layout ?? { mode: 'auto', density: 'regular' });

// 估算桌面可用区域：扣除底部程序坞、圆点指示器与内边距
const autoMetrics = computed(() =>
  computeGrid({
    width: Math.max(0, width.value - 48),
    height: Math.max(0, height.value - 150),
    layout: layout.value,
    paddingX: 24,
  }),
);

const DENSITIES: { value: Density; label: string }[] = [
  { value: 'loose', label: '宽松' },
  { value: 'regular', label: '适中' },
  { value: 'compact', label: '紧凑' },
];

const cols = computed(() => layout.value.cols ?? autoMetrics.value.cols);
const rows = computed(() => layout.value.rows ?? autoMetrics.value.rows);

function setMode(mode: 'auto' | 'manual') {
  // 切到手动模式时，用当前自动计算结果作为初值
  if (mode === 'manual' && (layout.value.cols == null || layout.value.rows == null)) {
    store.updateLayout({ mode, cols: autoMetrics.value.cols, rows: autoMetrics.value.rows });
    return;
  }
  store.updateLayout({ mode });
}

function onColsChange(event: Event) {
  const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
  if (Number.isNaN(value)) return;
  store.updateLayout({ cols: Math.min(Math.max(value, GRID_LIMITS.minCols), GRID_LIMITS.maxCols) });
}

function onRowsChange(event: Event) {
  const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
  if (Number.isNaN(value)) return;
  store.updateLayout({ rows: Math.min(Math.max(value, GRID_LIMITS.minRows), GRID_LIMITS.maxRows) });
}
</script>

<template>
  <section class="settings-section">
    <h3 class="section-title">布局</h3>

    <div class="field-block">
      <span class="field-label">密度</span>
      <div class="tab-row">
        <button
          v-for="item in DENSITIES"
          :key="item.value"
          type="button"
          class="tab-btn"
          :class="{ active: layout.density === item.value }"
          @click="store.updateLayout({ density: item.value })"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="field-block">
      <span class="field-label">行列数量</span>
      <div class="tab-row">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: layout.mode === 'auto' }"
          @click="setMode('auto')"
        >
          自动适配
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: layout.mode === 'manual' }"
          @click="setMode('manual')"
        >
          手动指定
        </button>
      </div>
      <div v-if="layout.mode === 'manual'" class="manual-row">
        <label class="number-field">
          <span>列数</span>
          <input type="number" :min="GRID_LIMITS.minCols" :max="GRID_LIMITS.maxCols" :value="cols" @change="onColsChange" />
        </label>
        <label class="number-field">
          <span>行数</span>
          <input type="number" :min="GRID_LIMITS.minRows" :max="GRID_LIMITS.maxRows" :value="rows" @change="onRowsChange" />
        </label>
      </div>
      <p class="section-note">
        {{ layout.mode === 'auto' ? '自动模式下按屏幕尺寸计算' : '手动指定固定行列' }}，当前为 {{ cols }} 列 × {{ rows }} 行
      </p>
    </div>
  </section>
</template>

<style scoped>
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tab-btn {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgb(255 255 255 / 0.08);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.tab-btn.active {
  border-color: rgb(255 255 255 / 0.35);
  color: var(--text);
}

.manual-row {
  display: flex;
  gap: 12px;
}

.number-field {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.number-field input {
  width: 64px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgb(255 255 255 / 0.08);
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.section-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
