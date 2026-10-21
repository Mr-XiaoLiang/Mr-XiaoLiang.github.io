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
  /** 各尺寸占用的网格格数 */
  spans: Record<WidgetSize, { cols: number; rows: number }>;
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
}

const SPANS: Record<WidgetSize, { cols: number; rows: number }> = {
  s: { cols: 2, rows: 2 },
  m: { cols: 4, rows: 2 },
  l: { cols: 4, rows: 4 },
};

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'clock',
    name: '时钟',
    description: '显示当前时间与日期',
    component: ClockWidget,
    spans: SPANS,
    supportedSizes: ['s', 'm'],
    defaultSize: 's',
  },
  {
    type: 'search',
    name: '搜索',
    description: '多引擎搜索框，可选默认引擎',
    component: SearchWidget,
    spans: SPANS,
    supportedSizes: ['m', 'l'],
    defaultSize: 'm',
  },
  {
    type: 'calendar',
    name: '日历',
    description: '当月月历，高亮今日',
    component: CalendarWidget,
    spans: SPANS,
    supportedSizes: ['m', 'l'],
    defaultSize: 'm',
  },
  {
    type: 'iframe',
    name: '网页',
    description: '以 iframe 加载的网页小组件',
    component: IframeWidget,
    spans: SPANS,
    supportedSizes: ['s', 'm', 'l'],
    defaultSize: 'm',
  },
];

export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((definition) => definition.type === type);
}

export const SIZE_LABELS: Record<WidgetSize, string> = {
  s: '小',
  m: '中',
  l: '大',
};
