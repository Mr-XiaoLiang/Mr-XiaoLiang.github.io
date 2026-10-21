import { AppConfig, CONFIG_VERSION } from './types';

const STORAGE_KEY = 'mruserspage:config';

type RawConfig = Record<string, unknown>;
type Migrator = (config: RawConfig) => RawConfig;

/** 版本迁移表：键为迁移后的版本号，当前无历史版本故为空 */
const MIGRATIONS: Record<number, Migrator> = {};

export function loadConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let data = JSON.parse(raw) as RawConfig;
    if (!data || typeof data !== 'object') return null;
    let version = typeof data.version === 'number' ? data.version : 0;
    while (version < CONFIG_VERSION) {
      const migrate = MIGRATIONS[version + 1];
      if (!migrate) return null;
      data = migrate(data);
      version += 1;
    }
    if (version !== CONFIG_VERSION) return null;
    return data as unknown as AppConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 超出配额等场景下静默失败，内存态仍可正常使用
  }
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
