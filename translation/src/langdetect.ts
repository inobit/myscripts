import type { LanguagePair } from './types';

/**
 * 判断文本是否包含中文字符（CJK 统一表意文字）
 * 含中文 → 翻译为英文；不含中文 → 翻译为中文
 */
export function checkChinese(text: string): boolean {
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // CJK Unified Ideographs + Extension A
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) return true;
  }
  return false;
}

/**
 * 判断文本是否全为 ASCII 字符（用于 TTS 语言选择等辅助场景）
 */
export function isAscii(text: string): boolean {
  for (const ch of text) {
    if (ch.charCodeAt(0) >= 128) return false;
  }
  return true;
}

/**
 * 猜测语言对：当 sl/tl 均为 auto 时
 * 含中文 → 翻译为英文；不含中文 → 翻译为中文（如日/韩/英/法等由 Google 自动检测）
 */
export function guessLanguage(sl: string, tl: string, text: string): LanguagePair {
  if ((!sl || sl === 'auto') && (!tl || tl === 'auto')) {
    return checkChinese(text) ? { sl: 'zh-CN', tl: 'en' } : { sl: 'auto', tl: 'zh-CN' };
  }
  return { sl: sl || 'auto', tl: tl || 'auto' };
}
