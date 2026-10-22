import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { computeLayout, type LayoutMetrics } from '../core/grid';
import type { LayoutSetting } from '../core/types';

/** 观测桌面区域尺寸，实时推导格/屏布局度量 */
export function useLayoutMetrics(target: Ref<HTMLElement | null>, layout: Ref<LayoutSetting>) {
  const width = ref(0);
  let observer: ResizeObserver | null = null;

  onMounted(() => {
    const element = target.value;
    if (!element) return;
    const measure = () => {
      width.value = element.getBoundingClientRect().width;
    };
    measure();
    observer = new ResizeObserver(measure);
    observer.observe(element);
  });

  onBeforeUnmount(() => observer?.disconnect());

  const metrics = computed<LayoutMetrics>(() =>
    computeLayout({
      width: width.value,
      paddingX: 24,
      density: layout.value.density,
      screenWidth: layout.value.screenWidth,
    }),
  );

  return { metrics };
}
