<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../../stores/config';
import { SCREEN_WIDTH_LIMITS } from '../../core/grid';
import type { Density } from '../../core/types';

const store = useConfigStore();

const layout = computed(() => store.config?.layout ?? { density: 'regular' as Density, screenWidth: 6 });

const DENSITIES: { value: Density; label: string }[] = [
  { value: 'loose', label: '宽松' },
  { value: 'regular', label: '适中' },
  { value: 'compact', label: '紧凑' },
];

const SCREEN_WIDTHS = Array.from(
  { length: SCREEN_WIDTH_LIMITS.max - SCREEN_WIDTH_LIMITS.min + 1 },
  (_, index) => SCREEN_WIDTH_LIMITS.min + index,
);
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
      <span class="field-label">屏宽（格 / 屏）</span>
      <div class="tab-row">
        <button
          v-for="width in SCREEN_WIDTHS"
          :key="width"
          type="button"
          class="tab-btn"
          :class="{ active: layout.screenWidth === width }"
          @click="store.updateLayout({ screenWidth: width })"
        >
          {{ width }}
        </button>
      </div>
      <p class="section-note">
        屏宽 4-8 格。窄屏时自动收缩为可放格数，放不下下一屏的空间留空，后续屏按顺序落到下方。
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
  min-width: 44px;
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

.section-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
