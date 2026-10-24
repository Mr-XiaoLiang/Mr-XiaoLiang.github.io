/**
 * 小组件运行时注册表。
 *
 * 内置小组件与用户自定义小组件在两个独立的集合中分别管理（均在内存中）：
 *   - builtinMap：随应用打包注册，永驻，不允许删除；
 *   - userMap：用户运行时主动添加，可单独删除。
 * 两类小组件对外统一返回 WidgetDefinition，渲染与添加流程完全一致，
 * 唯一区别在于「是否可删除」这一生命周期语义。
 *
 * 注册表只依赖协议（protocol.ts），不依赖任何具体小组件，保证小组件不侵入整体框架。
 */

import { reactive, type Component } from 'vue';
import {
  extractWidgetModule,
  validateWidgetManifest,
  type WidgetManifest,
  type WidgetModule,
  type WidgetSource,
} from './protocol';
import type { WidgetSize } from '../core/types';

/** 消费方使用的小组件定义：合并 manifest 元数据与渲染组件后的统一形态 */
export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  component: Component;
  minSize: WidgetSize;
  defaultSize: WidgetSize;
  quickSizes: WidgetSize[];
  hideTileName: boolean;
  /** 实例默认参数，添加小组件实例时若未显式提供 props 则使用 */
  defaultProps?: Record<string, unknown>;
  source: WidgetSource;
}

interface RegistryEntry {
  manifest: WidgetManifest;
  module: WidgetModule;
}

const builtinMap = reactive(new Map<string, RegistryEntry>());
const userMap = reactive(new Map<string, RegistryEntry>());

function toDefinition(id: string, entry: RegistryEntry, source: WidgetSource): WidgetDefinition {
  return {
    id,
    name: entry.manifest.name,
    description: entry.manifest.description,
    component: entry.module.component,
    minSize: entry.manifest.minSize,
    defaultSize: entry.manifest.defaultSize,
    quickSizes: entry.manifest.quickSizes,
    hideTileName: entry.manifest.hideTileName,
    defaultProps: entry.module.defaultProps,
    source,
  };
}

/** 注册内置小组件（幂等：重复加载如 HMR 时忽略，避免抛错） */
export function registerBuiltin(manifest: unknown, module: unknown): void {
  const validated = validateWidgetManifest(manifest);
  if (builtinMap.has(validated.id)) return;
  if (userMap.has(validated.id)) {
    throw new Error(`小组件 id「${validated.id}」已被用户小组件占用`);
  }
  builtinMap.set(validated.id, { manifest: validated, module: extractWidgetModule(module) });
}

/** 注册用户自定义小组件：id 与内置或既有用户小组件冲突时抛错 */
export function registerUserWidget(manifest: unknown, module: unknown): void {
  const validated = validateWidgetManifest(manifest);
  if (builtinMap.has(validated.id) || userMap.has(validated.id)) {
    throw new Error(`小组件 id「${validated.id}」已存在`);
  }
  userMap.set(validated.id, { manifest: validated, module: extractWidgetModule(module) });
}

/** 删除用户自定义小组件：仅限 user 来源，内置小组件不可删除 */
export function unregisterUserWidget(id: string): boolean {
  if (builtinMap.has(id)) return false;
  return userMap.delete(id);
}

export function isBuiltinWidget(id: string): boolean {
  return builtinMap.has(id);
}

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  const builtin = builtinMap.get(id);
  if (builtin) return toDefinition(id, builtin, 'builtin');
  const user = userMap.get(id);
  if (user) return toDefinition(id, user, 'user');
  return undefined;
}

/** 列出小组件：可指定来源过滤；不指定时内置在前、用户在后，各自保持注册顺序 */
export function listWidgets(source?: WidgetSource): WidgetDefinition[] {
  const definitions: WidgetDefinition[] = [];
  if (!source || source === 'builtin') {
    for (const [id, entry] of builtinMap) definitions.push(toDefinition(id, entry, 'builtin'));
  }
  if (!source || source === 'user') {
    for (const [id, entry] of userMap) definitions.push(toDefinition(id, entry, 'user'));
  }
  return definitions;
}

export function sizeLabel(size: WidgetSize): string {
  return `${size.cols}×${size.rows}`;
}
