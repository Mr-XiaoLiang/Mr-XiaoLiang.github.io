<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface Currency {
  code: string;
  name: string;
}

const CURRENCIES: Currency[] = [
  { code: 'CNY', name: '人民币' },
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '欧元' },
  { code: 'JPY', name: '日元' },
  { code: 'GBP', name: '英镑' },
  { code: 'HKD', name: '港币' },
  { code: 'KRW', name: '韩元' },
  { code: 'AUD', name: '澳元' },
];

const input = ref('1');
const fromCode = ref('USD');
const toCode = ref('CNY');
const rates = ref<Record<string, number> | null>(null);
const failed = ref(false);

/** 以人民币为基准的汇率表：rates[code] 表示 1 人民币兑换多少该货币 */
async function loadRates(): Promise<void> {
  failed.value = false;
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/CNY');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const list = data?.rates;
    if (list && typeof list === 'object') rates.value = list as Record<string, number>;
    else throw new Error('无效数据');
  } catch {
    failed.value = true;
    rates.value = null;
  }
}

onMounted(loadRates);

const result = computed(() => {
  const value = parseFloat(input.value);
  if (Number.isNaN(value) || !rates.value) return '';
  const fromRate = rates.value[fromCode.value];
  const toRate = rates.value[toCode.value];
  if (!fromRate || !toRate) return '';
  const converted = (value / fromRate) * toRate;
  if (!Number.isFinite(converted)) return '';
  return String(Math.round(converted * 1e6) / 1e6);
});
</script>

<template>
  <div class="currency-widget">
    <div class="currency-row">
      <input v-model="input" class="currency-input" type="number" step="any" inputmode="decimal" />
      <select v-model="fromCode" class="currency-select">
        <option v-for="item in CURRENCIES" :key="item.code" :value="item.code">{{ item.name }}</option>
      </select>
    </div>

    <div class="currency-row currency-result">
      <span class="currency-value">{{ failed ? '加载失败' : result || '…' }}</span>
      <select v-model="toCode" class="currency-select">
        <option v-for="item in CURRENCIES" :key="item.code" :value="item.code">{{ item.name }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.currency-widget {
  display: flex;
  flex-direction: column;
  gap: 4%;
  width: 100%;
  height: 100%;
  padding: 7%;
  box-sizing: border-box;
  overflow: hidden;
}

.currency-row {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  gap: 4%;
}

.currency-input {
  flex: 1;
  min-width: 0;
  height: 1.9em;
  padding: 0;
  border: none;
  border-bottom: 1px solid rgb(255 255 255 / 0.35);
  background: transparent;
  color: #fff;
  font-size: clamp(14px, 7cqh, 18px);
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  outline: none;
}

.currency-input:focus {
  border-bottom-color: var(--accent);
}

.currency-select {
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

.currency-result {
  border-top: 1px solid rgb(255 255 255 / 0.22);
}

.currency-value {
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
