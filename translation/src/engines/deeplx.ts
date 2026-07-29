/**
 * DeepLX 翻译引擎
 * API key 由用户配置在完整 URL 中（path 部分），无需 Authorization 头
 */
import { GM_xmlhttpRequest } from '$';
import { BaseEngine } from './base';
import type { Config, TranslationResult } from '../types';

/** DeepLX 响应格式 */
interface DeepLXResponse {
  code: number;
  data: string;
  alternatives?: string[];
}

/**
 * 映射源语言代码到 DeepLX 格式
 */
function mapSourceLang(lang: string): string {
  if (['zh-CN', 'zh-CHS', 'zh-CHT'].includes(lang)) return 'ZH';
  if (lang === 'en-US') return 'EN';
  return lang.toUpperCase();
}

/**
 * 映射目标语言代码到 DeepLX 格式
 */
function mapTargetLang(lang: string): string {
  if (lang === 'zh-CN') return 'ZH';
  if (lang === 'zh-CHS') return 'ZH-HANS';
  if (lang === 'zh-CHT') return 'ZH-HANT';
  if (lang === 'en-US') return 'EN';
  return lang.toUpperCase();
}

export class DeepLXTranslator extends BaseEngine {
  readonly name = 'DeepLX';

  async translate(
    text: string,
    sl: string,
    tl: string,
    config: Config,
  ): Promise<TranslationResult> {
    const { sl: sourceLang, tl: targetLang } = this.guessLang(sl, tl, text);

    // 构造请求体，sl 为 auto 时不传 source_lang
    const body: Record<string, string> = {
      text,
      target_lang: mapTargetLang(targetLang),
    };
    if (sourceLang !== 'auto') {
      body.source_lang = mapSourceLang(sourceLang);
    }

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url: config.providers.deepLX.url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(body),
        timeout: config.providers.deepLX.timeout,
        onload: (resp) => {
          if (resp.status >= 400) {
            resolve({ provider: 'DeepLX', text: '', error: `HTTP ${resp.status}` });
            return;
          }
          try {
            const result: DeepLXResponse = JSON.parse(resp.responseText);
            if (result.code === 200) {
              resolve({
                provider: 'DeepLX',
                text: result.data,
              });
            } else {
              resolve({
                provider: 'DeepLX',
                text: '',
                error: `翻译失败 (${result.code})`,
              });
            }
          } catch {
            resolve({ provider: 'DeepLX', text: '', error: '响应解析失败' });
          }
        },
        onerror: () => {
          resolve({ provider: 'DeepLX', text: '', error: '请求失败' });
        },
        ontimeout: () => {
          resolve({ provider: 'DeepLX', text: '', error: '请求超时' });
        },
      });
    });
  }
}
