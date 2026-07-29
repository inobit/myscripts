/**
 * dictionaryapi.dev 词典查询工具
 * 供 Google 引擎和 translateAll 后处理复用
 */
import { GM_xmlhttpRequest } from '$';

export interface DictResult {
  phonetic: string;
  audio: string;
}

interface DictEntry {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
}

/**
 * 从 dictionaryapi.dev 查英文单词的 IPA + 音频
 */
export function fetchDict(word: string, timeout = 3000): Promise<DictResult> {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      url: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      method: 'GET',
      timeout,
      onload: (resp) => {
        if (resp.status === 200) {
          try {
            const entries: DictEntry[] = JSON.parse(resp.responseText);
            const entry = entries?.[0];
            let phonetic = '';
            let audio = '';
            if (entry?.phonetics && Array.isArray(entry.phonetics)) {
              for (const p of entry.phonetics) {
                if (!phonetic && p.text) phonetic = p.text;
                if (!audio && p.audio) audio = p.audio;
              }
            }
            if (!phonetic && entry?.phonetic) phonetic = entry.phonetic;
            resolve({ phonetic, audio });
            return;
          } catch { /** ignore */ }
        }
        resolve({ phonetic: '', audio: '' });
      },
      onerror: () => resolve({ phonetic: '', audio: '' }),
      ontimeout: () => resolve({ phonetic: '', audio: '' }),
    });
  });
}
