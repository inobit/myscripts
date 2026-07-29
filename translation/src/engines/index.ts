/**
 * 翻译编排入口
 * 并行调用所有已启用的翻译引擎，支持渐进式回调
 * 后处理：中文单词→英文时，查英文结果的 IPA 音标
 */
import type { Config, TranslationResult, TranslateAllFn } from '../types';
import { checkChinese } from '../langdetect';
import { GoogleTranslator } from './google';
import { DeepLXTranslator } from './deeplx';
import { DeepSeekTranslator } from './deepseek';
import { OpenCodeTranslator } from './opencode';
import { fetchDict } from './pronunciation';

export const translateAll: TranslateAllFn = async (text, config, onResult?) => {
  const { sourceLang, targetLang } = config.translation;

  const tasks: Promise<TranslationResult>[] = [];
  const taskProviders: string[] = [];

  if (config.providers.google.enabled) {
    const engine = new GoogleTranslator();
    taskProviders.push(engine.name);
    tasks.push(runEngine(engine, text, sourceLang, targetLang, config, onResult));
  }
  if (config.providers.deepLX.enabled) {
    const engine = new DeepLXTranslator();
    taskProviders.push(engine.name);
    tasks.push(runEngine(engine, text, sourceLang, targetLang, config, onResult));
  }
  if (config.providers.deepseek.enabled) {
    const engine = new DeepSeekTranslator();
    taskProviders.push(engine.name);
    tasks.push(runEngine(engine, text, sourceLang, targetLang, config, onResult));
  }
  if (config.providers.opencode.enabled) {
    const engine = new OpenCodeTranslator();
    taskProviders.push(engine.name);
    tasks.push(runEngine(engine, text, sourceLang, targetLang, config, onResult));
  }

  // 并行执行所有任务，用 allSettled 确保不因个别失败而整体中断
  const settled = await Promise.allSettled(tasks);

  // 后处理：中文单词→英文时，查英文翻译结果的 IPA
  if (onResult && checkChinese(text)) {
    const googleIdx = taskProviders.indexOf('Google');
    if (googleIdx >= 0) {
      const googleSettled = settled[googleIdx];
      if (googleSettled.status === 'fulfilled' && googleSettled.value.text) {
        const resultText = googleSettled.value.text;
        const isSingleEnglishWord = !resultText.includes(' ') && /^[\x20-\x7E]+$/.test(resultText);
        if (isSingleEnglishWord) {
          const dict = await fetchDict(resultText, config.providers.google.timeout);
          if (dict.phonetic) {
            onResult({
              provider: 'Google',
              text: googleSettled.value.text,
              phonetic: dict.phonetic,
              phoneticAudio: dict.audio || undefined,
            });
          }
        }
      }
    }
  }

  return settled.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { provider: 'unknown', text: '', error: String(r.reason) },
  );
};

async function runEngine(
  engine: { name: string; translate(text: string, sl: string, tl: string, config: Config): Promise<TranslationResult> },
  text: string,
  sourceLang: string,
  targetLang: string,
  config: Config,
  onResult?: (result: TranslationResult) => void,
): Promise<TranslationResult> {
  try {
    const result = await engine.translate(text, sourceLang, targetLang, config);
    onResult?.(result);
    return result;
  } catch {
    const errorResult: TranslationResult = {
      provider: engine.name,
      text: '',
      error: '翻译服务异常',
    };
    onResult?.(errorResult);
    return errorResult;
  }
}
