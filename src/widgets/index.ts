/**
 * 小组件公共入口。
 *
 * 应用其余部分只应从本模块导入小组件相关能力，不直接触碰 builtin/ 内部实现，
 * 从而保证「小组件不影响整体框架」——框架只依赖协议与注册表，不依赖任何具体小组件。
 */

export * from './protocol';
export * from './registry';
export { loadUserWidget } from './loader';

import { installBuiltinWidgets } from './builtin';

// 模块首次加载即注册内置小组件（ES 模块副作用仅执行一次）
installBuiltinWidgets();
