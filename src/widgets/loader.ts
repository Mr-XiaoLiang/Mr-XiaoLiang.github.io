/**
 * 用户自定义小组件的远程加载器。
 *
 * 用户主动添加小组件 = 提供一份 manifest.json 地址与一份入口 ES 模块地址，
 * 框架按协议校验后注册进 userMap（内存态，刷新后失效，符合「在内存中分别管理」）。
 */

import { registerUserWidget } from './registry';
import { validateWidgetManifest, type WidgetManifest } from './protocol';

/** 从远程地址加载并注册一个用户小组件，返回其归一化后的 manifest */
export async function loadUserWidget(manifestUrl: string, entryUrl: string): Promise<WidgetManifest> {
  const manifest = await fetchManifest(manifestUrl);
  const module = await importEntry(entryUrl);
  registerUserWidget(manifest, module);
  return manifest;
}

async function fetchManifest(url: string): Promise<WidgetManifest> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`小组件 manifest 加载失败（HTTP ${response.status}）`);
  return validateWidgetManifest(await response.json());
}

async function importEntry(url: string): Promise<unknown> {
  // 地址来自用户输入，无法静态分析，忽略打包器的动态导入告警
  return import(/* @vite-ignore */ url);
}
