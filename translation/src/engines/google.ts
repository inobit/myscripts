/**
 * Google 翻译引擎
 * 英文单词：字典释义 (dt=md) + IPA (dict API) + 翻译，并行
 * 中文单词→英文：翻译，然后 dict API 查英文结果 IPA
 */
import { GM_xmlhttpRequest } from '$';
import { BaseEngine } from './base';
import { checkChinese, isAscii } from '../langdetect';
import type { Config, TranslationResult } from '../types';
import { fetchDict } from './pronunciation';

export class GoogleTranslator extends BaseEngine {
  readonly name = 'Google';

  async translate(
    text: string,
    sl: string,
    tl: string,
    config: Config,
  ): Promise<TranslationResult> {
    const { sl: sourceLang, tl: targetLang } = this.guessLang(sl, tl, text);
    const sourceIsEN = isAscii(text);
    const isSingleWord = !text.includes(' ');
    const sourceIsCN = checkChinese(text);
    const isENWord = isSingleWord && sourceIsEN;
    const timeout = config.providers.google.timeout;

    // EN 单词：并行翻译(含词典) + dict API(IPA)
    if (isENWord) {
      const dtParams = 't&dt=bd';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=${dtParams}&q=${encodeURIComponent(text)}`;

      const [transResult, dictResult] = await Promise.all([
        this.doTranslate(url, text, timeout),
        fetchDict(text, timeout),
      ]);

      if (dictResult.phonetic) transResult.phonetic = dictResult.phonetic;
      if (dictResult.audio) transResult.phoneticAudio = dictResult.audio;
      return transResult;
    }

    // 非 EN 单词：只翻译（后处理管 IPA）
    const dtParams = isSingleWord && !sourceIsCN ? 't&dt=rm' : 't';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=${dtParams}&q=${encodeURIComponent(text)}`;

    return this.doTranslate(url, text, timeout);
  }

  /**
   * 执行 Google 翻译，解析翻译文本 + 词典释义(dt=md)
   */
  private doTranslate(
    url: string,
    text: string,
    timeout: number,
  ): Promise<TranslationResult> {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url,
        method: 'GET',
        timeout,
        onload: (resp) => {
          if (resp.status >= 400) {
            resolve({ provider: 'Google', text: '', error: `HTTP ${resp.status}` });
            return;
          }
          try {
            const data = JSON.parse(resp.responseText);
            const segments: string[] = [];
            if (Array.isArray(data[0])) {
              for (const seg of data[0]) {
                if (seg[0] != null) segments.push(String(seg[0]));
              }
            }
            const defs = parseDefinitions(data);
            resolve({
              provider: 'Google',
              text: segments.join(''),
              sourceText: text,
              definitions: defs.length > 0 ? defs : undefined,
            });
          } catch {
            resolve({ provider: 'Google', text: '', error: '响应解析失败' });
          }
        },
        onerror: () => resolve({ provider: 'Google', text: '', error: '请求失败' }),
        ontimeout: () => resolve({ provider: 'Google', text: '', error: '请求超时' }),
      });
    });
  }

}

/**
 * 从 Google dt=bd 响应中解析词典释义
 * data[1] 格式: [["noun", ["组","集",...], [...]], ["verb", ["放","设置",...], [...]]]
 */
function parseDefinitions(data: unknown): string[] {
  const defs: string[] = [];
  try {
    const arr = data as Record<number, unknown>;
    for (const idx of [1]) {
      const dict = arr[idx];
      if (!Array.isArray(dict)) continue;
      for (const item of dict) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const pos = String(item[0]);
        const meanings = item[1];
        if (!Array.isArray(meanings)) continue;
        const texts: string[] = [];
        for (const m of meanings) {
          if (typeof m === 'string') texts.push(m);
        }
        if (texts.length > 0) {
          defs.push(`${pos}. ${texts.join('、')}`);
        }
      }
    }
  } catch { /** ignore */ }
  return defs;
}
