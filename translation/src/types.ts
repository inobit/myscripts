/**
 * 翻译脚本共享类型定义
 * 这是所有模块的契约文件，engines 和 ui 都依赖此文件
 */

// ----------------------------------------------------------------------
// Provider 配置
// ----------------------------------------------------------------------
export interface ProviderConfig {
  /** 是否启用该 provider */
  enabled: boolean;
  /** 请求超时时间（毫秒） */
  timeout: number;
}

export interface GoogleConfig extends ProviderConfig {}

export interface DeepLXConfig extends ProviderConfig {
  /** DeepLX 接口地址，API key 嵌在 path 中，如 https://api.deeplx.org/<api-key>/translate */
  url: string;
}

export interface LLMConfig extends ProviderConfig {
  /** OpenAI 兼容的接口地址，如 https://api.deepseek.com/v1/chat/completions */
  endpoint: string;
  /** API key */
  apiKey: string;
  /** 模型名称，如 deepseek-chat */
  model: string;
}

export interface LLMConfig extends ProviderConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

// ----------------------------------------------------------------------
// 快捷键
// ----------------------------------------------------------------------
export interface HotkeyDef {
  /** 按键，如 "s"、"t"、"Escape" */
  key: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}

// ----------------------------------------------------------------------
// 完整配置
// ----------------------------------------------------------------------
export interface Config {
  providers: {
    google: GoogleConfig;
    deepLX: DeepLXConfig;
    deepseek: LLMConfig;
    opencode: LLMConfig;
  };
  hotkeys: {
    /** 翻译当前选中文字的快捷键 */
    translateSel: HotkeyDef;
    /** 打开输入弹窗的快捷键 */
    openDialog: HotkeyDef;
  };
  translation: {
    /** 源语言，默认 "auto" */
    sourceLang: string;
    /** 目标语言，默认 "auto"（自动探测：非中文→中文，中文→英文） */
    targetLang: string;
  };
}

// ----------------------------------------------------------------------
// 翻译结果
// ----------------------------------------------------------------------
export interface TranslationResult {
  /** provider 显示名：Google、DeepLX、DeepSeek */
  provider: string;
  /** 翻译后的文本 */
  text: string;
  /** 源文本（用于 TTS 语音播放） */
  sourceText?: string;
  /** 音标/拼音等额外发音信息 */
  phonetic?: string;
  /** 发音音频 URL */
  phoneticAudio?: string;
  /** 词性+多释义，如 ["n. 集合", "v. 设置"] */
  definitions?: string[];
  /** 错误信息，翻译失败时填充 */
  error?: string;
  /** 是否仍在加载中 */
  loading?: boolean;
}

// ----------------------------------------------------------------------
// 语言对
// ----------------------------------------------------------------------
export interface LanguagePair {
  sl: string;
  tl: string;
}

// ----------------------------------------------------------------------
// 引擎接口
// ----------------------------------------------------------------------
export interface TranslatorEngine {
  readonly name: string;
  translate(text: string, sl: string, tl: string, config: Config): Promise<TranslationResult>;
}

/**
 * 翻译编排函数签名：并行调用所有启用的 provider，返回所有结果
 * 在 engines/index.ts 中实现，UI 层调用此函数
 * @param text 待翻译文本
 * @param config 配置
 * @param onResult 每个 provider 完成时的回调（用于渐进式更新 UI）
 * @returns 所有 provider 的结果（全部完成时 resolve）
 */
export type TranslateAllFn = (
  text: string,
  config: Config,
  onResult?: (result: TranslationResult) => void,
) => Promise<TranslationResult[]>;