/**
 * 内置小组件装配入口。
 *
 * 内置小组件与用户自定义小组件遵循同一份协议（manifest.json + 入口代码文件），
 * 只是随应用打包、预设在项目中。此处统一读取各内置小组件的两份协议文件并注册，
 * 后续新增内置小组件只需：在 builtin/ 下新建一个符合协议的文件夹，再在此补一行注册。
 */

import { registerBuiltin } from './registry';

import clockModule from './builtin/clock';
import clockManifest from './builtin/clock/manifest.json';
import searchModule from './builtin/search';
import searchManifest from './builtin/search/manifest.json';
import calendarModule from './builtin/calendar';
import calendarManifest from './builtin/calendar/manifest.json';
import iframeModule from './builtin/iframe';
import iframeManifest from './builtin/iframe/manifest.json';

/** 注册全部内置小组件（应在应用启动时执行一次） */
export function installBuiltinWidgets(): void {
  registerBuiltin(clockManifest, clockModule);
  registerBuiltin(searchManifest, searchModule);
  registerBuiltin(calendarManifest, calendarModule);
  registerBuiltin(iframeManifest, iframeModule);
}
