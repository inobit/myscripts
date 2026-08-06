import { GM_getValue, GM_setValue } from '$';
import type { Config } from './types';

const STORAGE_KEY = 'translator_config';

/** 默认配置：仅开启 Google（无需额外配置即可使用） */
export const DEFAULT_CONFIG: Config = {
  providers: {
    google: { enabled: true, timeout: 3000 },
    deepLX: {
      enabled: false,
      url: 'https://api.deeplx.org/<your-api-key>/translate',
      timeout: 3000,
    },
    volcano: {
      enabled: false,
      accessKey: '',
      secretKey: '',
      timeout: 5000,
    },
    deepseek: {
      enabled: false,
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: '',
      model: 'deepseek-v4-flash',
      timeout: 10000,
    },
    opencode: {
      enabled: false,
      endpoint: 'https://opencode.ai/zen/v1/chat/completions',
      apiKey: '',
      model: 'big-pickle',
      timeout: 10000,
    },
  },
  hotkeys: {
    translateSel: { key: 's', alt: true },
    openDialog: { key: 'k', ctrl: true, shift: true },
  },
  translation: {
    sourceLang: 'auto',
    targetLang: 'auto',
  },
};

/** 读取配置，与默认配置深度合并 */
export function loadConfig(): Config {
  try {
    const saved = GM_getValue(STORAGE_KEY, '');
    if (saved) {
      const parsed = JSON.parse(saved);
      return deepMerge(DEFAULT_CONFIG, parsed);
    }
  } catch {
    // ignore parse errors
  }
  return structuredClone(DEFAULT_CONFIG);
}

/** 保存配置 */
export function saveConfig(config: Config): void {
  GM_setValue(STORAGE_KEY, JSON.stringify(config));
}

/** 深度合并：override 覆盖 base，保留 base 中 override 未提及的字段 */
function deepMerge<T>(base: T, override: unknown): T {
  if (
    typeof base === 'object' &&
    base !== null &&
    !Array.isArray(base) &&
    typeof override === 'object' &&
    override !== null &&
    !Array.isArray(override)
  ) {
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(override as Record<string, unknown>)) {
      result[key] = deepMerge(
        (base as Record<string, unknown>)[key],
        (override as Record<string, unknown>)[key],
      );
    }
    return result as T;
  }
  return (override !== undefined ? override : base) as T;
}