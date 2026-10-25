<script setup lang="ts">
import { computed, ref } from 'vue';

interface Unit {
  name: string;
  /** 基准值 = 输入值 × factor + offset，据此统一处理线性与温度换算 */
  factor: number;
  offset: number;
}

interface Category {
  id: string;
  name: string;
  units: Unit[];
}

const CATEGORIES: Category[] = [
  {
    id: 'length',
    name: '长度',
    units: [
      { name: '米', factor: 1, offset: 0 },
      { name: '千米', factor: 1000, offset: 0 },
      { name: '厘米', factor: 0.01, offset: 0 },
      { name: '毫米', factor: 0.001, offset: 0 },
      { name: '英尺', factor: 0.3048, offset: 0 },
      { name: '英寸', factor: 0.0254, offset: 0 },
      { name: '英里', factor: 1609.344, offset: 0 },
    ],
  },
  {
    id: 'weight',
    name: '重量',
    units: [
      { name: '千克', factor: 1, offset: 0 },
      { name: '克', factor: 0.001, offset: 0 },
      { name: '吨', factor: 1000, offset: 0 },
      { name: '磅', factor: 0.45359237, offset: 0 },
      { name: '盎司', factor: 0.028349523125, offset: 0 },
    ],
  },
  {
    id: 'area',
    name: '面积',
    units: [
      { name: '平方米', factor: 1, offset: 0 },
      { name: '平方千米', factor: 1000000, offset: 0 },
      { name: '平方厘米', factor: 0.0001, offset: 0 },
      { name: '公顷', factor: 10000, offset: 0 },
      { name: '亩', factor: 2000 / 3, offset: 0 },
      { name: '平方英尺', factor: 0.09290304, offset: 0 },
    ],
  },
  {
    id: 'temperature',
    name: '温度',
    units: [
      { name: '摄氏度', factor: 1, offset: 0 },
      { name: '华氏度', factor: 5 / 9, offset: -160 / 9 },
      { name: '开尔文', factor: 1, offset: -273.15 },
    ],
  },
];

const categoryId = ref('length');
const input = ref('1');
const fromIndex = ref(0);
const toIndex = ref(1);

const category = computed(() => CATEGORIES.find((item) => item.id === categoryId.value) ?? CATEGORIES[0]);
const fromUnit = computed(() => category.value.units[fromIndex.value] ?? category.value.units[0]);
const toUnit = computed(() => category.value.units[toIndex.value] ?? category.value.units[0]);

const result = computed(() => {
  const value = parseFloat(input.value);
  if (Number.isNaN(value)) return '';
  const base = value * fromUnit.value.factor + fromUnit.value.offset;
  const converted = (base - toUnit.value.offset) / toUnit.value.factor;
  if (!Number.isFinite(converted)) return '';
  return String(Math.round(converted * 1e8) / 1e8);
});

function selectCategory(id: string): void {
  categoryId.value = id;
  fromIndex.value = 0;
  toIndex.value = 1;
}
</script>

<template>
  <div class="unit-widget">
    <div class="unit-tabs">
      <button
        v-for="item in CATEGORIES"
        :key="item.id"
        type="button"
        class="unit-tab"
        :class="{ active: item.id === categoryId }"
        @click="selectCategory(item.id)"
      >
        {{ item.name }}
      </button>
    </div>

    <div class="unit-row">
      <input v-model="input" class="unit-input" type="number" step="any" inputmode="decimal" />
      <select v-model="fromIndex" class="unit-select">
        <option v-for="(unit, index) in category.units" :key="unit.name" :value="index">{{ unit.name }}</option>
      </select>
    </div>

    <div class="unit-row unit-result">
      <span class="unit-value">{{ result }}</span>
      <select v-model="toIndex" class="unit-select">
        <option v-for="(unit, index) in category.units" :key="unit.name" :value="index">{{ unit.name }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.unit-widget {
  display: flex;
  flex-direction: column;
  gap: 3%;
  width: 100%;
  height: 100%;
  padding: 6%;
  box-sizing: border-box;
  overflow: hidden;
}

.unit-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 2%;
}

.unit-tab {
  flex: 1;
  min-width: 0;
  padding: 0.4em 0;
  border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: 0;
  background: transparent;
  color: rgb(255 255 255 / 0.85);
  font-size: clamp(11px, 5cqh, 13px);
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.unit-tab:hover {
  background: rgb(255 255 255 / 0.08);
}

.unit-tab.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.unit-row {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  gap: 4%;
}

.unit-input {
  flex: 1;
  min-width: 0;
  height: 1.9em;
  padding: 0;
  border: none;
  border-bottom: 1px solid rgb(255 255 255 / 0.35);
  background: transparent;
  color: #fff;
  font-size: clamp(13px, 6cqh, 16px);
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  outline: none;
}

.unit-input:focus {
  border-bottom-color: var(--accent);
}

.unit-select {
  flex: 0 0 auto;
  max-width: 45%;
  height: 1.9em;
  padding: 0 4px;
  border: 1px solid rgb(255 255 255 / 0.3);
  border-radius: 0;
  background: rgb(0 0 0 / 0.3);
  color: #fff;
  color-scheme: dark;
  font-size: clamp(11px, 5cqh, 13px);
  font-family: inherit;
  outline: none;
}

.unit-result {
  border-top: 1px solid rgb(255 255 255 / 0.22);
}

.unit-value {
  flex: 1;
  min-width: 0;
  color: #fff;
  font-size: clamp(16px, 10cqh, 26px);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
