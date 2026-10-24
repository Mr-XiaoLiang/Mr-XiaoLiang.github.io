export interface SearchEngine {
  id: string;
  name: string;
  /** 查询串模板，末尾拼接编码后的关键词 */
  searchUrl: string;
  /** 引擎图标：官网 favicon，直接引用；加载失败时回退为名称首字 */
  icon: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'bing', name: 'Bing', searchUrl: 'https://www.bing.com/search?q=', icon: 'https://www.bing.com/favicon.ico' },
  { id: 'baidu', name: '百度', searchUrl: 'https://www.baidu.com/s?wd=', icon: 'https://www.baidu.com/favicon.ico' },
  { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q=', icon: 'https://www.google.com/favicon.ico' },
  { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=', icon: 'https://duckduckgo.com/favicon.ico' },
];

export const DEFAULT_SEARCH_ENGINE = 'bing';

export function buildSearchUrl(engineId: string, query: string): string {
  const engine = SEARCH_ENGINES.find((item) => item.id === engineId) ?? SEARCH_ENGINES[0];
  return engine.searchUrl + encodeURIComponent(query);
}
