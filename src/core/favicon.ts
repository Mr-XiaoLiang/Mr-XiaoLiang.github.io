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
 * 生成站点的 favicon 候选地址：
 * 仅使用网站自身的 /favicon.ico（浏览器约定路径），不借助第三方图标服务，
 * 避免拿到第三方缓存/占位图标。加载失败时由调用方降级到 emoji / 名称首字。
 */
export function faviconCandidates(url: string): string[] {
  const domain = domainOf(url);
  if (!domain) return [];
  return [`https://${domain}/favicon.ico`];
}
