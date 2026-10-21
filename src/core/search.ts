export interface SearchEngine {
  id: string;
  name: string;
  /** 查询串模板，末尾拼接编码后的关键词 */
  searchUrl: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'bing', name: 'Bing', searchUrl: 'https://www.bing.com/search?q=' },
  { id: 'baidu', name: '百度', searchUrl: 'https://www.baidu.com/s?wd=' },
  { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q=' },
  { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=' },
];

export const DEFAULT_SEARCH_ENGINE = 'bing';

export function buildSearchUrl(engineId: string, query: string): string {
  const engine = SEARCH_ENGINES.find((item) => item.id === engineId) ?? SEARCH_ENGINES[0];
  return engine.searchUrl + encodeURIComponent(query);
}
