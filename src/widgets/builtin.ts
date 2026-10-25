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
import todoModule from './builtin/todo';
import todoManifest from './builtin/todo/manifest.json';
import noteModule from './builtin/note';
import noteManifest from './builtin/note/manifest.json';
import countdownModule from './builtin/countdown';
import countdownManifest from './builtin/countdown/manifest.json';
import calculatorModule from './builtin/calculator';
import calculatorManifest from './builtin/calculator/manifest.json';
import pomodoroModule from './builtin/pomodoro';
import pomodoroManifest from './builtin/pomodoro/manifest.json';
import worldClockModule from './builtin/world-clock';
import worldClockManifest from './builtin/world-clock/manifest.json';
import stopwatchModule from './builtin/stopwatch';
import stopwatchManifest from './builtin/stopwatch/manifest.json';
import unitConverterModule from './builtin/unit-converter';
import unitConverterManifest from './builtin/unit-converter/manifest.json';
import randomModule from './builtin/random';
import randomManifest from './builtin/random/manifest.json';
import habitModule from './builtin/habit';
import habitManifest from './builtin/habit/manifest.json';
import weatherModule from './builtin/weather';
import weatherManifest from './builtin/weather/manifest.json';
import currencyModule from './builtin/currency';
import currencyManifest from './builtin/currency/manifest.json';
import hitokotoModule from './builtin/hitokoto';
import hitokotoManifest from './builtin/hitokoto/manifest.json';
import dailyEnglishModule from './builtin/daily-english';
import dailyEnglishManifest from './builtin/daily-english/manifest.json';

/** 注册全部内置小组件（应在应用启动时执行一次） */
export function installBuiltinWidgets(): void {
  registerBuiltin(clockManifest, clockModule);
  registerBuiltin(searchManifest, searchModule);
  registerBuiltin(calendarManifest, calendarModule);
  registerBuiltin(iframeManifest, iframeModule);
  registerBuiltin(todoManifest, todoModule);
  registerBuiltin(noteManifest, noteModule);
  registerBuiltin(countdownManifest, countdownModule);
  registerBuiltin(calculatorManifest, calculatorModule);
  registerBuiltin(pomodoroManifest, pomodoroModule);
  registerBuiltin(worldClockManifest, worldClockModule);
  registerBuiltin(stopwatchManifest, stopwatchModule);
  registerBuiltin(unitConverterManifest, unitConverterModule);
  registerBuiltin(randomManifest, randomModule);
  registerBuiltin(habitManifest, habitModule);
  registerBuiltin(weatherManifest, weatherModule);
  registerBuiltin(currencyManifest, currencyModule);
  registerBuiltin(hitokotoManifest, hitokotoModule);
  registerBuiltin(dailyEnglishManifest, dailyEnglishModule);
}
