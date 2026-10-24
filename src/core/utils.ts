/** 生成带前缀的随机 id，优先使用 crypto.randomUUID */
export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}:${uuid}`;
}

/** 补全缺失的协议头，避免 example.com 被当作相对路径 */
export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return value;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

/** 小组件接入说明页的绝对地址（随部署域名自适应，用于分享给 AI 学习） */
export function widgetDocsUrl(): string {
  return new URL('widget-docs.html', window.location.href).href;
}

/** 复制文本到剪贴板，返回是否成功；非安全上下文回退到 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
