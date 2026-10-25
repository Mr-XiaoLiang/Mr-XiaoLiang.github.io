import { normalizeUrl } from './utils';

/** 从应用网址提取主机名，失败返回空串 */
export function domainOf(url: string): string {
  const value = url.trim();
  if (!value) return '';
  try {
    return new URL(normalizeUrl(value)).hostname;
  } catch {
    return '';
  }
}

/**
 * 生成站点的 favicon 候选地址（按清晰度降序），全部取自站点自身，不借助第三方图标服务：
 * 1. /apple-touch-icon.png —— iOS 约定路径，通常为 180px 高清图，适合磁块大图展示；
 * 2. /apple-touch-icon-precomposed.png —— 同上的无预合成变体；
 * 3. /favicon.ico —— 浏览器约定路径，常见 16–32px，作为最终回退。
 * 全部失败时由调用方降级到 emoji / 名称首字。
 */
export function faviconCandidates(url: string): string[] {
  const domain = domainOf(url);
  if (!domain) return [];
  return [
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon-precomposed.png`,
    `https://${domain}/favicon.ico`,
  ];
}
