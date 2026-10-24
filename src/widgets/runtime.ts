/**
 * 小组件运行时（Widget Runtime）。
 *
 * 用户自定义小组件以压缩包导入，入口代码文件是运行时才执行的普通 ES 模块，
 * 无法像项目内代码那样直接 `import { ref } from 'vue'`（会把另一份 Vue 实例拉进来，
 * 破坏响应式）。因此框架在应用启动时把 Vue 运行时与资源解析能力挂到全局
 * `MrUserPageWidget`，入口模块只需在顶层读取它即可获得与框架同源的运行时：
 *
 *   const { h, ref, computed } = globalThis.MrUserPageWidget.vue;
 *
 * 资源解析通过 `assets()` 工厂在「入口模块顶层」捕获当前压缩包的文件表，
 * 返回的解析器可随组件一起在渲染期使用，用于读取打包进压缩包的图片、数据等资源。
 */

import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  watchEffect,
} from 'vue';

/** 小组件压缩包解压后的文件表：相对路径 → 原始字节 */
type WidgetFiles = Record<string, Uint8Array>;

/** 仅在导入小组件的瞬间非空，供 assets() 在入口模块顶层捕获 */
let activeFiles: WidgetFiles | null = null;

/** 常见扩展名 → MIME，用于生成可被 <img> 等正确识别的对象地址 */
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  json: 'application/json',
  txt: 'text/plain',
  css: 'text/css',
};

/** 归一化资源相对路径：去除开头的 ./ 或 / */
function normalizeAssetPath(path: string): string {
  return path.replace(/^\.?\//, '');
}

/** 小组件资源解析器：把压缩包内的相对路径解析为可用地址或文本 */
export interface WidgetAssetResolver {
  /** 返回资源的对象地址（object URL），可直接用于 <img> / fetch 等 */
  url(path: string): string;
  /** 以 UTF-8 文本读取资源内容 */
  text(path: string): Promise<string>;
}

function createAssetResolver(files: WidgetFiles): WidgetAssetResolver {
  const urls = new Map<string, string>();
  return {
    url(path: string): string {
      const key = normalizeAssetPath(path);
      const data = files[key];
      if (!data) throw new Error(`小组件资源不存在：${path}`);
      let existing = urls.get(key);
      if (!existing) {
        const ext = key.split('.').pop()?.toLowerCase() ?? '';
        const type = MIME_BY_EXT[ext] ?? 'application/octet-stream';
        existing = URL.createObjectURL(new Blob([data], { type }));
        urls.set(key, existing);
      }
      return existing;
    },
    async text(path: string): Promise<string> {
      const key = normalizeAssetPath(path);
      const data = files[key];
      if (!data) throw new Error(`小组件资源不存在：${path}`);
      return new TextDecoder().decode(data);
    },
  };
}

/** 挂载全局运行时，应用启动时执行一次 */
export function installWidgetRuntime(): void {
  const global = globalThis as unknown as Record<string, unknown>;
  global.MrUserPageWidget = {
    vue: {
      h,
      ref,
      computed,
      reactive,
      watch,
      watchEffect,
      onMounted,
      onBeforeUnmount,
      nextTick,
      defineComponent,
    },
    /** 必须在入口模块顶层调用，捕获当前压缩包的文件表 */
    assets(): WidgetAssetResolver {
      if (!activeFiles) {
        throw new Error('assets() 只能在小组件入口模块的顶层作用域调用');
      }
      return createAssetResolver(activeFiles);
    },
  };
}

/** 导入期间设置当前压缩包文件表；导入结束后传入 null 复位 */
export function setActiveWidgetFiles(files: WidgetFiles | null): void {
  activeFiles = files;
}
