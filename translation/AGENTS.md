# Translation 油猴脚本项目指南

## 项目概述

划词翻译 + 输入弹窗翻译油猴脚本，支持 Google、DeepLX、DeepSeek、火山翻译多 provider 并行翻译。

## 技术栈

- **语言**: TypeScript (strict mode)
- **构建**: Vite 8 + vite-plugin-monkey 8.1（输出单个 `.user.js` 文件）
- **包管理**: pnpm（由根目录 `pnpm-workspace.yaml` 统一管理）
- **运行环境**: Tampermonkey / Violentmonkey 等油猴扩展

## 常用命令

```bash
pnpm dev      # 开发模式（HMR 热更新）
pnpm build    # 构建到 dist/translation-userscript.user.js
pnpm preview  # 预览构建产物
npx tsc --noEmit  # 仅类型检查
```

## 目录结构

```
src/
├── main.ts              # 入口：整合所有模块，注册事件和菜单
├── types.ts             # 共享类型契约（所有模块的依赖根）
├── config.ts            # 配置管理（GM_setValue/GM_getValue）
├── langdetect.ts        # 语言检测（checkEnglish + guessLanguage）
├── hotkeys.ts           # 快捷键监听
├── engines/             # 翻译引擎
│   ├── base.ts          # 抽象基类
│   ├── google.ts        # Google 翻译（免费 API，无需 key）
│   ├── deeplx.ts        # DeepLX（key 嵌在 URL path 中）
│   ├── volcano.ts       # 火山翻译（IAM 双密钥 + V4 HMAC 签名）
│   ├── sign.ts          # 火山 V4 签名（纯 TS SHA-256/HMAC）
│   ├── llm.ts           # LLM（OpenAI 兼容，默认 DeepSeek）
│   └── index.ts         # translateAll 并行编排
└── ui/                  # UI 组件（全部在 Shadow DOM 内）
    ├── styles.css       # 全部样式（.tr- 前缀，含暗色模式）
    ├── shadow.ts        # Shadow DOM host 管理
    ├── shared.ts        # provider 结果块 + 复制按钮（复用组件）
    ├── trigger-icon.ts  # 划词后浮动 SVG 图标
    ├── result-card.ts   # 翻译结果卡片（纵向平铺多 provider）
    ├── input-dialog.ts  # 输入翻译弹窗
    └── settings-panel.ts # 配置面板
```

## 架构约定

### 模块依赖方向

`types.ts` 是契约根，所有模块依赖它，它不依赖任何模块。依赖方向：

```
main.ts → engines/, ui/, hotkeys, config
engines/* → base, types, langdetect, config
ui/* → shadow, shared, types, config
```

### GM_api 使用

通过 ESM import 从 `'$'`（vite-plugin-monkey 的别名）导入：

```typescript
import { GM_xmlhttpRequest, GM_setValue, GM_getValue, GM_registerMenuCommand } from '$';
```

不要使用全局 `GM_*` 变量，统一走 ESM import 以获得类型提示。

### 跨域请求

所有翻译 API 调用必须用 `GM_xmlhttpRequest`（绕过 CORS），不能用 `fetch`。涉及的域名在 `vite.config.ts` 的 `@connect` 中声明。

### CSS 隔离

所有 UI 挂载在单一 Shadow DOM root 下（`ui/shadow.ts` 的 `getShadowRoot()`）。CSS 类名统一用 `.tr-` 前缀。样式写在 `ui/styles.css`，通过 `?style` 后缀 import 注入 Shadow DOM。

### 翻译引擎规范

每个引擎实现 `TranslatorEngine` 接口，`translate()` 方法**绝不抛出异常**——错误统一包装为 `TranslationResult.error` 字段返回。错误提示用中文，精简，不暴露错误栈。

`engines/index.ts` 的 `translateAll` 并行调用所有启用的引擎，通过 `onResult` 回调实现渐进式 UI 更新。

### DeepLX 鉴权

DeepLX 的 API key 嵌在 URL path 中（如 `https://api.deeplx.org/<key>/translate`），**不使用** Authorization Bearer header。用户在设置面板配置完整 URL。

### 火山翻译鉴权

火山引擎使用 IAM 的 AccessKey ID + Secret Access Key 双密钥，通过 V4 HMAC-SHA256 签名鉴权（`engines/sign.ts` 实现，纯 TS，不依赖 `crypto.subtle`）。请求头包含 `X-Date`、`X-Content-Sha256`、`Authorization`，端点固定为 `translate.volcengineapi.com`（region: cn-north-1, service: translate, Action: TranslateText, Version: 2020-06-01）。语言代码映射：`zh-CN/zh-CHS→zh`、`zh-CHT→zh-Hant`、`en-US→en`。

### LLM 配置

LLM 引擎适配 OpenAI 兼容接口，默认接入 DeepSeek。配置项包含：
- `endpoint`: API 地址（默认 `https://api.deepseek.com/v1/chat/completions`）
- `apiKey`: 用户密钥
- `model`: 模型名（默认 `deepseek-v4-flash`）

### 语言检测

精简规则：文本所有字符 charCode < 128 视为英文，否则视为中文。非中文→翻译为中文，中文→翻译为英文。用户可在设置中手动指定。

## 代码规范

- 注释使用中文
- 日志/错误消息使用中文，精简，不暴露内部实现细节
- 严格 TypeScript，避免 `any`
- 新功能必须包含测试用例，Bug 修复应包含回归测试
- 优先编辑现有文件，避免创建新文件