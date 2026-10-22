<script setup lang="ts">
import { useEditMode } from './editState';

const { exit } = useEditMode();
</script>

<template>
  <div class="flat-bar edit-toolbar">
    <span class="flat-bar-hint">拖动磁块调整位置，可跨屏移动；拖拽右下角手柄调整尺寸</span>
    <button type="button" class="flat-bar-action" @click="exit">完成</button>
  </div>
</template>
