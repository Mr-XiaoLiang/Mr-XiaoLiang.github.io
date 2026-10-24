import { ref } from 'vue';
import { copyText, widgetDocsUrl } from '../core/utils';

/** 小组件接入说明入口的通用逻辑：返回说明页地址、复制动作与反馈状态 */
export function useWidgetDocs() {
  const docsUrl = widgetDocsUrl();
  const copied = ref(false);
  let timer = 0;

  async function copyDocsLink(): Promise<void> {
    const ok = await copyText(docsUrl);
    if (!ok) return;
    copied.value = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  }

  return { docsUrl, copied, copyDocsLink };
}
