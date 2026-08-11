/**
 * UI 共享组件与工具函数
 * 供 result-card 和 input-dialog 复用
 */

import type { TranslationResult } from '../types';
import { isAscii } from '../langdetect';

/** 所有已知 provider 配置 key → 显示名称映射（result-card 与 input-dialog 共用，需保持同步） */
export const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  deepLX: 'DeepLX',
  volcano: '火山翻译',
  deepseek: 'DeepSeek',
  opencode: 'OpenCode',
};

/** 剪贴板 SVG 图标 */
const CLIPBOARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

/** 扬声器 SVG 图标 */
const SPEAKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;

/**
 * 生成 Google TTS 发音 URL
 * @param text 要朗读的文本
 * @param lang 语言代码，默认 en
 */
function ttsUrl(text: string, lang = 'en'): string {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
}

/**
 * 播放 TTS 音频
 */
function playTTS(text: string, lang?: string): void {
  const url = ttsUrl(text, lang);
  const audio = new Audio(url);
  audio.volume = 0.8;
  audio.play().catch(() => {
    /** autoplay may be blocked */
  });
}

/**
 * 创建一个 Provider 结果展示块，包含 provider 名称、复制按钮、音标区和结果文本
 */
export function createProviderBlock(providerName: string): {
  element: HTMLElement;
  update: (result: TranslationResult) => void;
} {
  const block = document.createElement('div');
  block.className = 'tr-provider-block';

  // Provider 头部：名称 + 复制按钮
  const header = document.createElement('div');
  header.className = 'tr-provider-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'tr-provider-name';
  nameEl.textContent = providerName;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'tr-copy-btn';
  copyBtn.innerHTML = CLIPBOARD_SVG;
  copyBtn.title = '复制结果';

  const feedback = document.createElement('span');
  feedback.className = 'tr-copy-feedback';
  feedback.textContent = 'Copied!';
  copyBtn.appendChild(feedback);

  header.appendChild(nameEl);
  header.appendChild(copyBtn);

  // 内容区域：加载中 / 音标行 / 结果 / 错误
  const content = document.createElement('div');
  content.className = 'tr-provider-content';

  const loadingEl = document.createElement('div');
  loadingEl.className = 'tr-provider-loading';
  loadingEl.textContent = 'Translating...';

  // 音标行：发音文本 + 朗读按钮
  const phoneticRow = document.createElement('div');
  phoneticRow.className = 'tr-phonetic-row';

  const phoneticEl = document.createElement('span');
  phoneticEl.className = 'tr-provider-phonetic';

  const speakBtn = document.createElement('button');
  speakBtn.className = 'tr-speak-btn';
  speakBtn.innerHTML = SPEAKER_SVG;
  speakBtn.title = '朗读发音 (美式)';

  phoneticRow.appendChild(phoneticEl);
  phoneticRow.appendChild(speakBtn);

  const textEl = document.createElement('div');
  textEl.className = 'tr-provider-text';

  const errorEl = document.createElement('div');
  errorEl.className = 'tr-provider-error';

  // 词典释义列表
  const defsEl = document.createElement('div');
  defsEl.className = 'tr-provider-defs';

  content.appendChild(loadingEl);
  content.appendChild(phoneticRow);
  content.appendChild(textEl);
  content.appendChild(defsEl);
  content.appendChild(errorEl);

  block.appendChild(header);
  block.appendChild(content);

  // 复制按钮点击事件
  copyBtn.addEventListener('click', async () => {
    const textToCopy = textEl.textContent || '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      feedback.classList.add('tr-visible');
      setTimeout(() => {
        feedback.classList.remove('tr-visible');
      }, 1500);
    } catch (err) {
      console.error('[translator-ui] clipboard write failed:', err);
    }
  });

  // 更新回调：根据 TranslationResult 切换显示状态
  function update(result: TranslationResult) {
    if (result.loading) {
      block.style.display = '';
      loadingEl.style.display = '';
      phoneticRow.style.display = 'none';
      textEl.style.display = 'none';
      defsEl.style.display = 'none';
      errorEl.style.display = 'none';
    } else if (result.error) {
      block.style.display = '';
      loadingEl.style.display = 'none';
      phoneticRow.style.display = 'none';
      textEl.style.display = 'none';
      defsEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.textContent = result.error;
    } else {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'none';
      block.style.display = '';

      // 主翻译（有内容才更新，避免覆盖已有数据）
      if (result.text) {
        textEl.style.display = '';
        textEl.textContent = result.text;
      }

      // 音标行
      if (result.phonetic) {
        phoneticRow.style.display = '';
        phoneticEl.textContent = result.phonetic;

        if (result.phoneticAudio || result.sourceText) {
          speakBtn.style.display = '';
          speakBtn.title = result.phoneticAudio ? '朗读发音' : '朗读发音 (美式)';
          speakBtn.onclick = (e) => {
            e.stopPropagation();
            if (result.phoneticAudio) {
              const audio = new Audio(result.phoneticAudio);
              audio.volume = 0.8;
              audio.play().catch(() => {});
            } else if (result.sourceText) {
              playTTS(result.sourceText!, isAscii(result.sourceText) ? 'en' : 'zh-CN');
            }
          };
        } else {
          speakBtn.style.display = 'none';
        }
      } else {
        phoneticRow.style.display = 'none';
      }

      // 词典释义
      if (result.definitions && result.definitions.length > 0) {
        defsEl.style.display = '';
        defsEl.innerHTML = result.definitions
          .map((d) => `<span class="tr-def-item">${d}</span>`)
          .join('');
      } else {
        defsEl.style.display = 'none';
      }
    }
  }

  // 初始状态为加载中
  update({ provider: providerName, text: '', loading: true });

  return { element: block, update };
}
