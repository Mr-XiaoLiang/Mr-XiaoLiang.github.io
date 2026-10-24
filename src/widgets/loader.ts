/**
 * 用户自定义小组件的导入加载器（zip 压缩包）。
 *
 * 用户把制作完成的小组件打包为 .zip 后直接导入：压缩包内需包含 manifest.json
 * 与入口代码文件 index.js（或 index.mjs）。框架解压后校验 manifest，将入口代码
 * 作为原生 ES 模块执行并注册进 userMap（内存态，刷新后失效）。
 *
 * 导入按序串行执行：assets() 依赖「当前压缩包文件表」这一瞬时全局态，
 * 串行化可避免并发导入时相互覆盖。
 */

import { unzipSync } from 'fflate';
import { registerUserWidget } from './registry';
import { validateWidgetManifest, type WidgetManifest } from './protocol';
import { setActiveWidgetFiles } from './runtime';

/** 入口代码文件的候选名，按顺序匹配，命中第一个即用 */
const ENTRY_CANDIDATES = ['index.js', 'index.mjs'];

/** 上一次导入的完成链，用于串行化并发导入 */
let importChain: Promise<unknown> = Promise.resolve();

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** 从 .zip 压缩包导入一个用户小组件，返回其归一化后的 manifest */
export function loadUserWidgetFromZip(file: File): Promise<WidgetManifest> {
  const run = async (): Promise<WidgetManifest> => {
    const files = await readZip(file);

    const manifestRaw = files['manifest.json'];
    if (!manifestRaw) throw new Error('压缩包缺少 manifest.json');
    const manifest = validateWidgetManifest(JSON.parse(decode(manifestRaw)));

    const entryPath = ENTRY_CANDIDATES.find((name) => files[name]);
    if (!entryPath) throw new Error('压缩包缺少入口文件 index.js（或 index.mjs）');
    const code = decode(files[entryPath]);
    if (!code.trim()) throw new Error('小组件入口文件为空');

    // 地址来自用户上传内容，无法静态分析，忽略打包器的动态导入告警
    const entryUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    setActiveWidgetFiles(files);
    try {
      const module = await import(/* @vite-ignore */ entryUrl);
      registerUserWidget(manifest, module);
    } finally {
      setActiveWidgetFiles(null);
    }
    return manifest;
  };

  const result = importChain.then(run, run);
  importChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readZip(file: File): Promise<Record<string, Uint8Array>> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('请选择 .zip 格式的压缩包');
  }
  const buffer = await file.arrayBuffer();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error('压缩包解析失败，请确认文件为有效的 zip 压缩包');
  }
  return normalizeZipFiles(files);
}

/**
 * 归一化压缩包内路径：若协议文件被统一包在一层顶层目录里（常见于直接压缩文件夹），
 * 则去掉该顶层目录前缀，使 manifest.json / index.js / 资源落在根目录，便于统一解析。
 */
function normalizeZipFiles(files: Record<string, Uint8Array>): Record<string, Uint8Array> {
  if (files['manifest.json'] || files['index.js'] || files['index.mjs']) return files;
  const manifestEntry = Object.keys(files).find((path) => path.endsWith('/manifest.json'));
  if (!manifestEntry) return files;
  const prefix = manifestEntry.slice(0, -'manifest.json'.length);
  const normalized: Record<string, Uint8Array> = {};
  for (const [path, data] of Object.entries(files)) {
    normalized[path.startsWith(prefix) ? path.slice(prefix.length) : path] = data;
  }
  return normalized;
}
