import type { Component } from 'vue';
import type { WidgetSize, WidgetType } from '../../core/types';
import ClockWidget from './ClockWidget.vue';
import SearchWidget from './SearchWidget.vue';
import CalendarWidget from './CalendarWidget.vue';
import IframeWidget from './IframeWidget.vue';

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  component: Component;
  /** 最小支持尺寸（格） */
  minSize: WidgetSize;
  /** 默认尺寸（格） */
  defaultSize: WidgetSize;
  /** 应用库中提供的快捷尺寸 */
  quickSizes: WidgetSize[];
  /** 是否不在磁块上叠加名称（iframe 自带标题栏） */
  hideTileName?: boolean;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'clock',
    name: '时钟',
    description: '显示当前时间与日期',
    component: ClockWidget,
    minSize: { cols: 2, rows: 2 },
    defaultSize: { cols: 2, rows: 2 },
    quickSizes: [
      { cols: 2, rows: 2 },
      { cols: 3, rows: 3 },
      { cols: 4, rows: 2 },
      { cols: 4, rows: 4 },
    ],
  },
  {
    type: 'search',
    name: '搜索',
    description: '多引擎搜索框，可选默认引擎',
    component: SearchWidget,
    minSize: { cols: 2, rows: 1 },
    defaultSize: { cols: 4, rows: 1 },
    quickSizes: [
      { cols: 2, rows: 1 },
      { cols: 3, rows: 1 },
      { cols: 4, rows: 1 },
      { cols: 4, rows: 2 },
    ],
  },
  {
    type: 'calendar',
    name: '日历',
    description: '当月月历，高亮今日',
    component: CalendarWidget,
    minSize: { cols: 2, rows: 2 },
    defaultSize: { cols: 3, rows: 3 },
    quickSizes: [
      { cols: 2, rows: 2 },
      { cols: 3, rows: 3 },
      { cols: 4, rows: 3 },
      { cols: 4, rows: 4 },
    ],
  },
  {
    type: 'iframe',
    name: '网页',
    description: '以 iframe 加载的网页小组件',
    component: IframeWidget,
    minSize: { cols: 2, rows: 2 },
    defaultSize: { cols: 4, rows: 4 },
    quickSizes: [
      { cols: 2, rows: 2 },
      { cols: 3, rows: 3 },
      { cols: 4, rows: 2 },
      { cols: 4, rows: 4 },
    ],
    hideTileName: true,
  },
];

export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((definition) => definition.type === type);
}

export function sizeLabel(size: WidgetSize): string {
  return `${size.cols}×${size.rows}`;
}
