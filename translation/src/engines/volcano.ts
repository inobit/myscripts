/**
 * 火山引擎文本翻译引擎（TranslateText）
 * 使用 IAM AccessKey ID + Secret Access Key 做 V4 HMAC-SHA256 签名
 */
import { GM_xmlhttpRequest } from '$';
import { BaseEngine } from './base';
import type { Config, TranslationResult } from '../types';
import { signVolcanoRequest } from './sign';

const VOLCANO_HOST = 'translate.volcengineapi.com';
const VOLCANO_REGION = 'cn-north-1';
const VOLCANO_SERVICE = 'translate';
const VOLCANO_ACTION = 'TranslateText';
const VOLCANO_VERSION = '2020-06-01';
/** 接口限制：单条文本不超过 5000 字符 */
const MAX_TEXT_LENGTH = 5000;

/** 火山引擎返回体 */
interface VolcanoResponse {
  TranslationList?: Array<{
    Translation: string;
    DetectedSourceLanguage?: string;
  }>;
  ResponseMetadata?: {
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
}

/** 映射语言代码到火山引擎格式（zh-CN/zh-CHS→zh，zh-CHT→zh-Hant） */
function mapLang(lang: string): string {
  switch (lang) {
    case 'zh-CN':
    case 'zh-CHS':
      return 'zh';
    case 'zh-CHT':
      return 'zh-Hant';
    case 'en-US':
      return 'en';
    default:
      return lang;
  }
}

/** 将火山引擎错误码映射为中文提示 */
function mapErrorCode(code: string): string {
  switch (code) {
    case '-400':
      return '请求参数错误';
    case '-415':
      return '不支持的语向';
    case '-429':
      return '请求过于频繁';
    case '-500':
      return '翻译服务异常';
    default:
      return `接口错误 (${code})`;
  }
}

export class VolcanoTranslator extends BaseEngine {
  readonly name = '火山翻译';

  async translate(
    text: string,
    sl: string,
    tl: string,
    config: Config,
  ): Promise<TranslationResult> {
    const c = config.providers.volcano;

    // 检查密钥是否已配置
    if (!c.accessKey || !c.secretKey) {
      return { provider: '火山翻译', text: '', error: '未配置 Access Key' };
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return { provider: '火山翻译', text: '', error: '文本过长（超过 5000 字符）' };
    }

    const { sl: sourceLang, tl: targetLang } = this.guessLang(sl, tl, text);

    // 构造请求体：sl 为 auto 时不传 SourceLanguage（服务端自动检测）
    const body: Record<string, unknown> = {
      TargetLanguage: mapLang(targetLang),
      TextList: [text],
    };
    if (sourceLang !== 'auto') {
      body.SourceLanguage = mapLang(sourceLang);
    }
    const bodyStr = JSON.stringify(body);

    const { Authorization, 'X-Date': xDate, 'X-Content-Sha256': xContentSha256, 'Content-Type': contentType } =
      signVolcanoRequest({
        accessKey: c.accessKey,
        secretKey: c.secretKey,
        method: 'POST',
        host: VOLCANO_HOST,
        path: '/',
        query: { Action: VOLCANO_ACTION, Version: VOLCANO_VERSION },
        body: bodyStr,
        region: VOLCANO_REGION,
        service: VOLCANO_SERVICE,
      });

    const url = `https://${VOLCANO_HOST}/?Action=${VOLCANO_ACTION}&Version=${VOLCANO_VERSION}`;

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url,
        method: 'POST',
        headers: {
          Authorization,
          'X-Date': xDate,
          'X-Content-Sha256': xContentSha256,
          'Content-Type': contentType,
        },
        data: bodyStr,
        timeout: c.timeout,
        onload: (resp) => {
          if (resp.status === 401 || resp.status === 403) {
            resolve({ provider: '火山翻译', text: '', error: 'Access Key 无效' });
            return;
          }
          if (resp.status === 429) {
            resolve({ provider: '火山翻译', text: '', error: '请求过于频繁' });
            return;
          }
          try {
            const data: VolcanoResponse = JSON.parse(resp.responseText);
            const apiError = data.ResponseMetadata?.Error;
            if (apiError?.Code) {
              resolve({ provider: '火山翻译', text: '', error: mapErrorCode(apiError.Code) });
              return;
            }
            const translated = data.TranslationList?.[0]?.Translation ?? '';
            resolve({
              provider: '火山翻译',
              text: translated,
            });
          } catch {
            resolve({ provider: '火山翻译', text: '', error: '响应解析失败' });
          }
        },
        onerror: () => {
          resolve({ provider: '火山翻译', text: '', error: '请求失败' });
        },
        ontimeout: () => {
          resolve({ provider: '火山翻译', text: '', error: '请求超时' });
        },
      });
    });
  }
}
