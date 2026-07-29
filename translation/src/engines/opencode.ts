/**
 * OpenCode 翻译引擎（OpenAI 兼容接口）
 * 使用 opencode.ai 的 Zen API，模型 big-pickle
 */
import { GM_xmlhttpRequest } from '$';
import { BaseEngine } from './base';
import type { Config, TranslationResult } from '../types';
import { checkChinese } from '../langdetect';

export class OpenCodeTranslator extends BaseEngine {
  readonly name = 'OpenCode';

  async translate(
    text: string,
    _sl: string,
    _tl: string,
    config: Config,
  ): Promise<TranslationResult> {
    const c = config.providers.opencode;

    if (!c.apiKey) {
      return { provider: 'OpenCode', text: '', error: '未配置 API Key' };
    }

    const isCN = checkChinese(text);
    const sourceLangName = isCN ? '中文' : '英文';
    const targetLangName = isCN ? '英文' : '简体中文';

    const systemPrompt = `You are a professional translation engine. Translate the following ${sourceLangName} text to ${targetLangName}. Output ONLY the translated text. Do NOT add explanations, notes, questions, greetings, or any extra content. Do NOT ask for clarification. Just output the translation.`;

    const userPrompt = `Translate to ${targetLangName}: "${text}"`;

    const body = {
      model: c.model,
      max_tokens: 128000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    };

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url: c.endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.apiKey}`,
        },
        data: JSON.stringify(body),
        timeout: c.timeout,
        onload: (resp) => {
          if (resp.status === 401) {
            resolve({ provider: 'OpenCode', text: '', error: 'API Key 无效' });
            return;
          }
          if (resp.status >= 400) {
            resolve({ provider: 'OpenCode', text: '', error: `HTTP ${resp.status}` });
            return;
          }
          try {
            const data = JSON.parse(resp.responseText);
            const translated = data.choices?.[0]?.message?.content?.trim() ?? '';
            resolve({ provider: 'OpenCode', text: translated });
          } catch {
            resolve({ provider: 'OpenCode', text: '', error: '响应解析失败' });
          }
        },
        onerror: () => {
          resolve({ provider: 'OpenCode', text: '', error: '请求失败' });
        },
        ontimeout: () => {
          resolve({ provider: 'OpenCode', text: '', error: '请求超时' });
        },
      });
    });
  }
}
