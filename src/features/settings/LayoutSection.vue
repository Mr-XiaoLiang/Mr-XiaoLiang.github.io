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
  <section class="flat-section">
    <h3 class="flat-section-title">布局</h3>

    <div class="flat-section">
      <span class="flat-label">密度</span>
      <div class="flat-tab-row">
        <button
          v-for="item in DENSITIES"
          :key="item.value"
          type="button"
          class="flat-tab"
          :class="{ active: layout.density === item.value }"
          @click="store.updateLayout({ density: item.value })"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="flat-section">
      <span class="flat-label">屏宽（格 / 屏）</span>
      <div class="flat-tab-row">
        <button
          v-for="width in SCREEN_WIDTHS"
          :key="width"
          type="button"
          class="flat-tab"
          :class="{ active: layout.screenWidth === width }"
          @click="store.updateLayout({ screenWidth: width })"
        >
          {{ width }}
        </button>
      </div>
      <p class="flat-note">屏宽 4-8 格。窄屏时自动收缩为可放格数，放不下下一屏的空间留空，后续屏按顺序落到下方。</p>
    </div>
  </section>
</template>
