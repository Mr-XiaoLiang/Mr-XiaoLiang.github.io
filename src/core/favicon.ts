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
 * 生成站点的 favicon 候选地址，按优先级排列：
 * 1. 站点自身的 /favicon.ico（无第三方依赖，多数站点可直接命中）
 * 2. DuckDuckGo 图标服务（按域名返回缓存图标）
 * 3. Google favicon 服务（按域名返回图标）
 * 全部失败时由调用方降级到名称首字色块
 */
export function faviconCandidates(url: string): string[] {
  const domain = domainOf(url);
  if (!domain) return [];
  return [
    `https://${domain}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ];
}
