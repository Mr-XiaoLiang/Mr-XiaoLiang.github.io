<script setup lang="ts">
const LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

defineProps<{
  /** 存在分组的字母（含 #） */
  available: string[];
}>();

const emit = defineEmits<{
  (e: 'jump', letter: string): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="jump-mask" @click.self="emit('close')">
    <div class="jump-grid" role="dialog" aria-label="字母索引">
      <button
        v-for="letter in [...LETTERS, '#']"
        :key="letter"
        type="button"
        class="jump-cell"
        :class="{ disabled: !available.includes(letter) }"
        :aria-label="`跳转到 ${letter}`"
        @click="available.includes(letter) && emit('jump', letter)"
      >
        {{ letter }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.jump-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.jump-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  width: min(360px, 100%);
}

.jump-cell {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: none;
  background: rgb(255 255 255 / 0.12);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.jump-cell:active {
  background: rgb(255 255 255 / 0.25);
}

.jump-cell.disabled {
  opacity: 0.25;
  cursor: default;
}
</style>
