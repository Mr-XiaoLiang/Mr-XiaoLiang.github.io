<script setup lang="ts">
import type { Component } from 'vue';
import type { AppItem, WidgetItem } from '../../core/types';
import FaviconImage from './FaviconImage.vue';
import LibraryLiveTile from './LibraryLiveTile.vue';

defineProps<{
  app?: AppItem;
  widget?: WidgetItem;
  /** 全覆盖图，优先于 icon 展示 */
  fullIcon: string;
  /** 磁块主色（传给应用库 live tile） */
  color: string;
  /** 展示名称 */
  name: string;
  /** 名称字号（px） */
  nameSize: number;
  isLibrary: boolean;
  isSettings: boolean;
  isLibraryLive: boolean;
  showLive: boolean;
  showName: boolean;
  isBig: boolean;
  /** favicon 是否已失败（降级为首字色块） */
  faviconFailed: boolean;
  /** 小组件实时内容渲染组件 */
  component?: Component;
}>();

const emit = defineEmits<{
  /** favicon 全部候选失败，由调用方统一降级 */
  (e: 'favicon-failed'): void;
}>();
</script>

<template>
  <img v-if="fullIcon" class="tile-full" :src="fullIcon" :alt="app?.name ?? ''" draggable="false" />
  <template v-else>
    <LibraryLiveTile v-if="isLibraryLive" class="tile-live" :tile-color="color" />
    <component :is="component" v-else-if="showLive && widget" v-bind="widget.props" class="tile-live" />
    <div v-else class="tile-icon" :class="{ 'tile-icon-center': !isBig }">
      <svg v-if="isLibrary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" fill="currentColor" stroke="none" />
        <rect x="14.25" y="4.25" width="5.5" height="5.5" />
        <rect x="4.25" y="14.25" width="5.5" height="5.5" />
        <rect x="13.5" y="13.5" width="7" height="7" fill="currentColor" stroke="none" />
      </svg>
      <svg v-else-if="isSettings" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.2 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
        />
      </svg>
      <img v-else-if="app?.icon" :src="app.icon" :alt="app?.name ?? ''" draggable="false" />
      <FaviconImage
        v-else-if="app?.url && !faviconFailed"
        :url="app.url"
        :alt="app?.name ?? ''"
        @failed="emit('favicon-failed')"
      />
      <span v-else-if="app?.emoji" class="tile-emoji">{{ app.emoji }}</span>
      <span v-else class="tile-initial">{{ (app?.name ?? name ?? '?').trim().charAt(0).toUpperCase() }}</span>
    </div>
  </template>

  <span v-if="showName" class="tile-name" :style="{ fontSize: `${nameSize}px` }">{{ name }}</span>
</template>

<style scoped>
.tile-full {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tile-live {
  position: absolute;
  inset: 0;
  /* 强制裁剪：小组件协议禁止内部滚动，任何溢出内容被裁掉而非形成可滚动区域，
     以免抢占用户对桌面页面的滚动手势 */
  overflow: hidden;
  /* 小组件容器查询基准放在这里，避免 .tile 因 container-type 建立 stacking context
     而把手柄的 z-index 困在磁贴内部（导致悬浮手柄被相邻磁贴压住） */
  container-type: size;
}

.tile-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.tile-icon-center {
  align-items: center;
  justify-content: center;
}

/* 图标尺寸用 max-width/max-height 分别相对宽高约束（非 center 留 12%、center 留 18% 边距），
   避免 padding 百分比随磁块宽度翻倍而在横条/竖条上把图标压小 */
.tile-icon img,
.tile-icon svg {
  max-width: 76%;
  max-height: 76%;
  width: auto;
  height: auto;
}

.tile-icon-center img,
.tile-icon-center svg {
  max-width: 64%;
  max-height: 64%;
}

.tile-initial {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-weight: 600;
  font-size: 140%;
}

.tile-emoji {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 150%;
  line-height: 1;
}

.tile-name {
  position: absolute;
  left: 7%;
  bottom: 5%;
  max-width: 86%;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgb(0 0 0 / 0.55);
}
</style>
