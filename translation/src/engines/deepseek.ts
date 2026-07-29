/**
 * LLM 翻译引擎（OpenAI 兼容接口，默认 DeepSeek）
 */
import { GM_xmlhttpRequest } from '$';
import { BaseEngine } from './base';
import type { Config, TranslationResult } from '../types';
import { checkChinese } from '../langdetect';

/** LLM API 响应结构 */
interface LLMMessage {
  role: string;
  content: string;
}

interface LLMChoice {
  message: LLMMessage;
}

interface LLMResponse {
  choices: LLMChoice[];
}

export class DeepSeekTranslator extends BaseEngine {
  readonly name = 'DeepSeek';

  async translate(
    text: string,
    _sl: string,
    _tl: string,
    config: Config,
  ): Promise<TranslationResult> {
    const c = config.providers.deepseek;

    // 检查 API Key 是否已配置
    if (!c.apiKey) {
      return {
        provider: 'DeepSeek',
        text: '',
        error: '未配置 API Key',
      };
    }

    // 自动判断语言方向
    const isCN = checkChinese(text);
    const sourceLangName = isCN ? '中文' : '英文';
    const targetLangName = isCN ? '英文' : '简体中文';

    const systemPrompt = `You are a professional translation engine. Translate the following ${sourceLangName} text to ${targetLangName}. Output ONLY the translated text. Do NOT add explanations, notes, questions, greetings, or any extra content. Do NOT ask for clarification. Just output the translation.`;

    const userPrompt = `Translate to ${targetLangName}: "${text}"`;

    const body = {
      model: c.model,
      max_tokens: 1000000,
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
            resolve({ provider: 'DeepSeek', text: '', error: 'API Key 无效' });
            return;
          }
          if (resp.status === 429) {
            resolve({ provider: 'DeepSeek', text: '', error: '请求过于频繁' });
            return;
          }
          if (resp.status >= 400) {
            resolve({ provider: 'DeepSeek', text: '', error: `HTTP ${resp.status}` });
            return;
          }
          try {
            const data: LLMResponse = JSON.parse(resp.responseText);
            const translated = data.choices?.[0]?.message?.content?.trim() ?? '';
            resolve({
              provider: 'DeepSeek',
              text: translated,
            });
          } catch {
            resolve({ provider: 'DeepSeek', text: '', error: '响应解析失败' });
          }
        },
        onerror: () => {
          resolve({ provider: 'DeepSeek', text: '', error: '请求失败' });
        },
        ontimeout: () => {
          resolve({ provider: 'DeepSeek', text: '', error: '请求超时' });
        },
      });
    });
  }
}
