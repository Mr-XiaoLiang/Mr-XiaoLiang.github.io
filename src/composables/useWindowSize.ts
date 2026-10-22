import { onBeforeUnmount, onMounted, ref } from 'vue';

/** 响应式窗口尺寸，供设置面板的网格预览使用 */
export function useWindowSize() {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  function update() {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  }

  onMounted(() => window.addEventListener('resize', update));
  onBeforeUnmount(() => window.removeEventListener('resize', update));

  return { width, height };
}
