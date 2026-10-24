/**
 * 小组件协议（Widget Protocol）。
 *
 * 这是「小组件」与「桌面框架」之间的唯一契约。任何小组件（内置或用户自定义）
 * 都以一个文件夹的形式存在，文件夹内至少包含两份协议文件：
 *
 *   manifest.json —— 协议入口，声明小组件的元数据与尺寸约束（纯数据，不参与渲染）；
 *   index.ts      —— 入口代码文件，默认导出一个 WidgetModule，挂载真正用于渲染的 Vue 组件。
 *
 * 框架只认这两份文件；小组件内部的其余结构、实现方式由作者在范式内自由发挥，
 * 但不可越过以下硬性边界：
 *
 *   1. 尺寸上限：全局硬上限 WIDGET_MAX_SPAN（格），任何小组件都不可突破；
 *      小组件只能通过 manifest 的 minSize 声明自己的最小尺寸（下限），上限恒由框架统一钳制。
 *   2. 尺寸下限：minSize 只作为下限使用，manifest 不得声明「上限」字段。
 *   3. 禁止内部滚动：小组件被装入固定尺寸的磁块容器，容器强制 overflow:hidden，
 *      小组件自身不得制造可滚动区域，以免抢占用户对桌面页面的滚动手势。
 *   4. 允许联网与请求 API，但仅限静态代码逻辑；框架不提供服务端，也不做数据持久化中转。
 *
 * 自定义程度：manifest 的必填字段（protocol/id/name/description/minSize/defaultSize）
 * 不可删减；quickSizes 与 hideTileName 为可选扩展。WidgetModule 只要求一个可渲染组件，
 * defaultProps 为可选的实例默认参数。
 */

import type { Component } from 'vue';
import { MAX_TILE_SPAN, type WidgetSize } from '../core/types';

/** 小组件协议版本：manifest.protocol 必须等于该值才可注册 */
export const WIDGET_PROTOCOL_VERSION = 1;

/** 小组件全局最大跨度（格），框架硬上限，manifest 不可突破 */
export const WIDGET_MAX_SPAN = MAX_TILE_SPAN;

/** 小组件来源：内置（预设在项目中，不可删除）或用户（运行时主动添加，可删除） */
export type WidgetSource = 'builtin' | 'user';

/** manifest.json 的协议结构（经校验归一化后的形态） */
export interface WidgetManifest {
  protocol: number;
  id: string;
  name: string;
  description: string;
  minSize: WidgetSize;
  defaultSize: WidgetSize;
  quickSizes: WidgetSize[];
  hideTileName: boolean;
}

/** 入口代码文件默认导出的模块协议 */
export interface WidgetModule {
  component: Component;
  defaultProps?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseSize(value: unknown, field: string): WidgetSize {
  if (!isRecord(value)) throw new Error(`小组件 ${field} 必须是 { cols, rows } 对象`);
  const cols = value.cols;
  const rows = value.rows;
  const valid =
    typeof cols === 'number' && Number.isInteger(cols) && cols >= 1 && cols <= WIDGET_MAX_SPAN &&
    typeof rows === 'number' && Number.isInteger(rows) && rows >= 1 && rows <= WIDGET_MAX_SPAN;
  if (!valid) {
    throw new Error(`小组件 ${field} 的 cols/rows 必须是 1–${WIDGET_MAX_SPAN} 的整数`);
  }
  return { cols: cols as number, rows: rows as number };
}

/** 校验并归一化 manifest.json，不合法时抛出带明确信息的错误 */
export function validateWidgetManifest(value: unknown): WidgetManifest {
  if (!isRecord(value)) throw new Error('小组件 manifest 必须是对象');
  if (value.protocol !== WIDGET_PROTOCOL_VERSION) {
    throw new Error(`小组件协议版本不兼容：需要 protocol=${WIDGET_PROTOCOL_VERSION}`);
  }
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(value.id)) {
    throw new Error('小组件 id 必须由小写字母/数字/点/下划线/连字符组成，且以字母或数字开头');
  }
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error('小组件缺少 name 显示名');
  }
  if (typeof value.description !== 'string') {
    throw new Error('小组件缺少 description 描述');
  }
  const minSize = parseSize(value.minSize, 'minSize');
  const defaultSize = parseSize(value.defaultSize, 'defaultSize');
  if (defaultSize.cols < minSize.cols || defaultSize.rows < minSize.rows) {
    throw new Error('小组件 defaultSize 不能小于 minSize');
  }
  let quickSizes: WidgetSize[] = [defaultSize];
  if (value.quickSizes !== undefined) {
    if (!Array.isArray(value.quickSizes)) throw new Error('小组件 quickSizes 必须是数组');
    quickSizes = value.quickSizes.map((size, index) => {
      const parsed = parseSize(size, `quickSizes[${index}]`);
      if (parsed.cols < minSize.cols || parsed.rows < minSize.rows) {
        throw new Error(`小组件 quickSizes[${index}] 不能小于 minSize`);
      }
      return parsed;
    });
    if (quickSizes.length === 0) quickSizes = [defaultSize];
  }
  return {
    protocol: WIDGET_PROTOCOL_VERSION,
    id: value.id,
    name: value.name.trim(),
    description: value.description,
    minSize,
    defaultSize,
    quickSizes,
    hideTileName: value.hideTileName === true,
  };
}

/**
 * 从入口模块导出中提取渲染组件（兼容多种导出形态）：
 * - { component }                    命名导出组件
 * - { default: { component } }       默认导出 WidgetModule
 * - { default: Component }           默认导出组件本身
 */
export function extractWidgetModule(raw: unknown): WidgetModule {
  let candidate: unknown = raw;
  if (isRecord(candidate) && !('component' in candidate) && 'default' in candidate) {
    candidate = candidate.default;
  }
  let defaultProps: Record<string, unknown> | undefined;
  if (isRecord(candidate)) {
    if ('component' in candidate) {
      if (isRecord(candidate.defaultProps)) defaultProps = candidate.defaultProps;
      candidate = candidate.component;
    }
  }
  if (!candidate) throw new Error('小组件入口文件缺少可渲染的 Vue 组件');
  return { component: candidate as Component, defaultProps };
}
