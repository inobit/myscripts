/**
 * 翻译引擎抽象基类
 */
import type { Config, TranslationResult, TranslatorEngine } from '../types';
import { guessLanguage } from '../langdetect';

export abstract class BaseEngine implements TranslatorEngine {
  abstract readonly name: string;

  abstract translate(
    text: string,
    sl: string,
    tl: string,
    config: Config,
  ): Promise<TranslationResult>;

  /**
   * 自动猜测语言对（sl/tl 为 auto 时根据文本内容判断）
   */
  protected guessLang(sl: string, tl: string, text: string) {
    return guessLanguage(sl, tl, text);
  }
}
