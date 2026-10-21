<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 用户自选颜色，至少取前两色，循环使用 */
    colors?: string[];
    /** 流动速度倍率，1 为基准 */
    speed?: number;
  }>(),
  {
    colors: () => ['#3b6ef5', '#8f3bd8', '#1fc8a9'],
    speed: 1,
  },
);

const BASE_DURATIONS = [26, 32, 38, 30];

const blobs = computed(() => {
  const palette = props.colors.length >= 2 ? props.colors : ['#3b6ef5', '#8f3bd8', '#1fc8a9'];
  const speed = props.speed > 0 ? props.speed : 1;
  return Array.from({ length: 4 }, (_, index) => ({
    color: palette[index % palette.length],
    duration: `${BASE_DURATIONS[index] / speed}s`,
  }));
});
</script>

<template>
  <div class="dynamic-wallpaper">
    <span
      v-for="(blob, index) in blobs"
      :key="index"
      class="blob"
      :class="`blob-${index + 1}`"
      :style="{ background: blob.color, animationDuration: blob.duration }"
    />
  </div>
</template>

<style scoped>
.dynamic-wallpaper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #05060f;
}

.blob {
  position: absolute;
  width: 62vmax;
  height: 62vmax;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.55;
  will-change: transform;
}

.blob-1 {
  top: -18%;
  left: -12%;
  animation: drift-a 26s ease-in-out infinite alternate;
}

.blob-2 {
  top: -10%;
  right: -18%;
  animation: drift-b 32s ease-in-out infinite alternate;
}

.blob-3 {
  bottom: -22%;
  left: -8%;
  animation: drift-c 38s ease-in-out infinite alternate;
}

.blob-4 {
  bottom: -16%;
  right: -10%;
  animation: drift-d 30s ease-in-out infinite alternate;
}

@keyframes drift-a {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(18%, 12%, 0) scale(1.2);
  }
}

@keyframes drift-b {
  from {
    transform: translate3d(0, 0, 0) scale(1.1);
  }
  to {
    transform: translate3d(-14%, 20%, 0) scale(0.95);
  }
}

@keyframes drift-c {
  from {
    transform: translate3d(0, 0, 0) scale(0.95);
  }
  to {
    transform: translate3d(22%, -14%, 0) scale(1.15);
  }
}

@keyframes drift-d {
  from {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
  to {
    transform: translate3d(-20%, -12%, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none;
  }
}
</style>
