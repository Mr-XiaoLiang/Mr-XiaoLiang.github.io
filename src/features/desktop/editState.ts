import { ref } from 'vue';

/** 编辑模式状态：模块级单例，桌面各处共享 */
const editing = ref(false);
/** 拖拽进行中标志，供边缘翻页等协作逻辑消费 */
const dragging = ref(false);

export function useEditMode() {
  function enter() {
    editing.value = true;
  }

  function exit() {
    editing.value = false;
  }

  function toggle() {
    editing.value = !editing.value;
  }

  return { editing, dragging, enter, exit, toggle };
}
