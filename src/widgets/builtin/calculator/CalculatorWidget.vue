<script setup lang="ts">
import { ref } from 'vue';

type KeyType = 'digit' | 'dot' | 'op' | 'equals' | 'clear';

interface CalcKey {
  label: string;
  type: KeyType;
  cls?: string;
}

const keys: CalcKey[] = [
  { label: 'C', type: 'clear', cls: 'key-op' },
  { label: '÷', type: 'op', cls: 'key-op' },
  { label: '×', type: 'op', cls: 'key-op' },
  { label: '−', type: 'op', cls: 'key-op' },
  { label: '7', type: 'digit' },
  { label: '8', type: 'digit' },
  { label: '9', type: 'digit' },
  { label: '+', type: 'op', cls: 'key-op key-plus' },
  { label: '4', type: 'digit' },
  { label: '5', type: 'digit' },
  { label: '6', type: 'digit' },
  { label: '1', type: 'digit' },
  { label: '2', type: 'digit' },
  { label: '3', type: 'digit' },
  { label: '=', type: 'equals', cls: 'key-equals' },
  { label: '0', type: 'digit', cls: 'key-zero' },
  { label: '.', type: 'dot' },
];

const display = ref('0');
const acc = ref<number | null>(null);
const op = ref<string | null>(null);
const justOperated = ref(false);

function pressDigit(digit: string): void {
  if (justOperated.value) {
    display.value = digit;
    justOperated.value = false;
  } else {
    display.value = display.value === '0' ? digit : display.value + digit;
  }
}

function pressDot(): void {
  if (justOperated.value) {
    display.value = '0.';
    justOperated.value = false;
  } else if (!display.value.includes('.')) {
    display.value += '.';
  }
}

function pressOp(next: string): void {
  const current = parseFloat(display.value);
  if (op.value !== null && acc.value !== null && !justOperated.value) {
    const result = compute(acc.value, current, op.value);
    display.value = format(result);
    acc.value = result;
  } else if (op.value === null) {
    acc.value = current;
  }
  op.value = next;
  justOperated.value = true;
}

function pressEquals(): void {
  if (op.value === null || acc.value === null) return;
  const current = parseFloat(display.value);
  const result = compute(acc.value, current, op.value);
  display.value = format(result);
  acc.value = null;
  op.value = null;
  justOperated.value = true;
}

function pressClear(): void {
  display.value = '0';
  acc.value = null;
  op.value = null;
  justOperated.value = false;
}

function compute(a: number, b: number, operator: string): number {
  switch (operator) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function format(value: number): string {
  if (!Number.isFinite(value)) return '错误';
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

function onKey(key: CalcKey): void {
  switch (key.type) {
    case 'digit':
      pressDigit(key.label);
      break;
    case 'dot':
      pressDot();
      break;
    case 'op':
      pressOp(key.label);
      break;
    case 'equals':
      pressEquals();
      break;
    case 'clear':
      pressClear();
      break;
  }
}
</script>

<template>
  <div class="calc-widget">
    <div class="calc-display">{{ display }}</div>
    <div class="calc-keys">
      <button
        v-for="(key, index) in keys"
        :key="index"
        type="button"
        class="calc-key"
        :class="key.cls"
        @click="onKey(key)"
      >
        {{ key.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.calc-widget {
  display: flex;
  flex-direction: column;
  gap: 2%;
  width: 100%;
  height: 100%;
  padding: 6%;
  box-sizing: border-box;
  overflow: hidden;
}

.calc-display {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-end;
  justify-content: flex-end;
  min-height: 0;
  padding: 0 2%;
  color: #fff;
  font-size: clamp(18px, 12cqh, 34px);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}

.calc-keys {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: 2%;
}

.calc-key {
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(13px, 7cqh, 20px);
  font-family: inherit;
  cursor: pointer;
}

.calc-key:hover {
  background: rgb(255 255 255 / 0.14);
}

.calc-key:active {
  background: rgb(255 255 255 / 0.24);
}

/* 运算符与清除：半透明底区分功能键 */
.key-op {
  background: rgb(255 255 255 / 0.16);
}

.key-op:hover {
  background: rgb(255 255 255 / 0.26);
}

/* 等号：单一强调色 */
.key-equals {
  background: var(--accent);
  color: #fff;
}

.key-equals:hover {
  filter: brightness(1.08);
}

.key-plus {
  grid-row: span 2;
}

.key-equals {
  grid-row: span 2;
}

.key-zero {
  grid-column: span 2;
}
</style>
