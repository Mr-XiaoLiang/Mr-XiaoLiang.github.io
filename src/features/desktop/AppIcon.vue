<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AppItem } from '../../core/types';
import { useEditMode } from './editState';

const props = withDefaults(
  defineProps<{
    app: AppItem;
    /** 单元格边长（px），图标与字号按比例推导 */
    cell: number;
    showLabel?: boolean;
    removeLabel?: string;
  }>(),
  {
    showLabel: true,
    removeLabel: '移除',
  },
);

const emit = defineEmits<{
  (e: 'remove', id: string): void;
}>();

const { editing } = useEditMode();

const iconFailed = ref(false);

const iconSize = computed(() => Math.round(props.cell * 0.6));
const radius = computed(() => Math.round(iconSize.value * 0.24));
const fallbackFontSize = computed(() => Math.round(iconSize.value * 0.42));
const labelSize = computed(() => Math.min(13, Math.max(11, Math.round(props.cell * 0.15))));
const showImage = computed(() => props.app.icon.length > 0 && !iconFailed.value);
const initial = computed(() => Array.from(props.app.name.trim())[0]?.toUpperCase() ?? '?');
const hue = computed(() => {
  let hash = 0;
  for (const char of props.app.name) hash = (hash * 31 + char.codePointAt(0)!) % 360;
  return hash;
});

function open() {
  if (editing.value) return;
  window.open(props.app.url, '_blank', 'noopener');
}
</script>

<template>
  <button class="app-icon" type="button" :class="{ 'is-editing': editing }" :title="app.name" @click="open">
    <span class="icon-wrap" :style="{ width: `${iconSize}px`, height: `${iconSize}px` }">
      <span class="icon-tile" :style="{ borderRadius: `${radius}px` }">
        <img v-if="showImage" :src="app.icon" :alt="app.name" draggable="false" @error="iconFailed = true" />
        <span
          v-else
          class="icon-fallback"
          :style="{
              background: `linear-gradient(150deg, hsl(${hue} 60% 52%), hsl(${(hue + 40) % 360} 60% 38%))`,
              fontSize: `${fallbackFontSize}px`,
            }"
          >{{ initial }}</span
        >
        </span>
        <slot name="badge" />
        <span
          v-if="editing"
          class="icon-remove no-drag"
          role="button"
          :aria-label="removeLabel"
          @click.stop="emit('remove', app.id)"
          >−</span
        >
      </span>
    <span v-if="showLabel" class="app-name" :style="{ fontSize: `${labelSize}px` }">{{ app.name }}</span>
  </button>
</template>

<style scoped>
.app-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.icon-wrap {
  position: relative;
  display: block;
}

.icon-tile {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--icon-tile-bg);
  box-shadow:
    0 4px 14px rgb(0 0 0 / 0.22),
    inset 0 0 0 1px var(--icon-border);
  transition: transform 0.16s ease;
}

.app-icon:active .icon-tile {
  transform: scale(0.92);
}

.icon-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #fff;
  font-weight: 600;
}

.app-icon.is-editing .icon-tile {
  animation: jiggle 0.32s ease-in-out infinite alternate;
}

.icon-remove {
  position: absolute;
  top: -8px;
  left: -8px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(22 24 32 / 0.88);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
  cursor: pointer;
}

.app-name {
  max-width: 100%;
  overflow: hidden;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
}

@keyframes jiggle {
  from {
    transform: rotate(-1.6deg);
  }
  to {
    transform: rotate(1.6deg);
  }
}
</style>
