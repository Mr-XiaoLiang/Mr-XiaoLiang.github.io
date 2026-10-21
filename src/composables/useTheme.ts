import { watch, type Ref } from 'vue';
import type { ThemeMode } from '../core/types';

/**
 * 主题模式写入根元素 data-theme：
 * - auto：文字配色跟随壁纸明暗（data-scheme）
 * - light / dark：用户显式覆盖
 */
export function useTheme(mode: Ref<ThemeMode>) {
  watch(
    mode,
    (value) => {
      document.documentElement.dataset.theme = value;
    },
    { immediate: true },
  );
}
