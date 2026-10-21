import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { computeGrid, type GridMetrics } from '../core/grid';
import type { LayoutSetting } from '../core/types';

/** 观测桌面区域尺寸，按布局设置实时推导网格度量 */
export function useGridMetrics(target: Ref<HTMLElement | null>, layout: Ref<LayoutSetting>) {
  const width = ref(0);
  const height = ref(0);
  let observer: ResizeObserver | null = null;

  onMounted(() => {
    const element = target.value;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      width.value = rect.width;
      height.value = rect.height;
    };
    measure();
    observer = new ResizeObserver(measure);
    observer.observe(element);
  });

  onBeforeUnmount(() => observer?.disconnect());

  const metrics = computed<GridMetrics>(() =>
    computeGrid({ width: width.value, height: height.value, layout: layout.value, paddingX: 24 }),
  );

  return { metrics };
}
