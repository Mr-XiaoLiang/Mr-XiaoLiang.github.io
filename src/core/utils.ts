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
