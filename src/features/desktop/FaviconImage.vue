<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { faviconCandidates } from '../../core/favicon';

const props = withDefaults(
  defineProps<{
    /** 应用网址，用于推导 favicon 候选地址 */
    url: string;
    alt?: string;
  }>(),
  { alt: '' },
);

const emit = defineEmits<{
  /** 全部候选均加载失败，调用方降级到名称首字色块 */
  (e: 'failed'): void;
}>();

const index = ref(0);

const candidates = computed(() => faviconCandidates(props.url));
const current = computed(() => candidates.value[index.value] ?? '');
const exhausted = computed(() => index.value >= candidates.value.length);

// 网址变化时重置尝试进度
watch(candidates, () => {
  index.value = 0;
});

function onError() {
  if (index.value < candidates.value.length - 1) {
    index.value += 1;
    return;
  }
  index.value = candidates.value.length;
  emit('failed');
}
</script>

<template>
  <img v-if="current && !exhausted" :src="current" :alt="alt" draggable="false" @error="onError" />
</template>
