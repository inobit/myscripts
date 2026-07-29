# Emacs Input 油猴脚本项目指南

## 项目概述

在 input/textarea 中提供 Emacs/Bash emacs-mode 风格的编辑键位，支持 kill ring 和 undo。

## 技术栈

- **语言**: TypeScript (strict mode)
- **构建**: Vite 8 + vite-plugin-monkey 8.1（输出单个 `.user.js` 文件）
- **包管理**: pnpm（由根目录 `pnpm-workspace.yaml` 统一管理）
- **运行环境**: Tampermonkey / Violentmonkey 等油猴扩展

## 常用命令

```bash
pnpm dev      # 开发模式（HMR 热更新）
pnpm build    # 构建到 dist/emacs-input-userscript.user.js
pnpm preview  # 预览构建产物
npx tsc --noEmit  # 仅类型检查
```

## 目录结构

```
src/
├── main.ts           # 入口：注册监听器、toggle、键盘事件分发
├── types.ts          # 共享类型定义（模块契约根）
├── config.ts         # 持久化配置（toggle 状态）
├── editing.ts        # 编辑命令集合（光标移动、单词操作、kill、yank、undo）
├── killring.ts       # kill ring 管理（push / yank / yank-pop）
├── caret.ts          # 光标屏幕位置检测（mirror div）
├── toast.ts          # Toast 通知（toggle 状态提示）
└── vite-env.d.ts     # Vite 类型声明
```

## 架构约定

### 模块依赖方向

```
types.ts 是契约根，所有模块依赖它，它不依赖任何模块。

main.ts → editing, killring, config, toast, caret
editing.ts → types, killring
killring.ts → types
config.ts → $ (GM_setValue/GM_getValue)
caret.ts → types
toast.ts → types, caret
```

### kill ring 行为

- **kill 命令**（C-k、M-d、M-Backspace）将删除的文本推入 ring
- 连续的 kill 命令追加到同一 ring 条目，非 kill 命令中断追加
- **C-y** 粘贴 ring 首条，在元素 dataset 记录插入长度
- **M-y** 仅在 C-y 或 M-y 之后有效，替换刚粘贴的文字为 ring 上一条

### 快捷键

| 按键 | 功能 | 类型 |
|------|------|------|
| C-a | 行首 | 移动 |
| C-e | 行尾 | 移动 |
| C-b | 向前字符 | 移动 |
| C-f | 向后字符 | 移动 |
| C-d | 删除后一个字符 | 删除（非 kill） |
| C-h | 删除前一个字符 | 删除（非 kill） |
| C-k | 删到行尾 | kill |
| C-y | yank（粘贴） | yank |
| C-_ | undo | 编辑 |
| M-b | 向前单词 | 移动 |
| M-f | 向后单词 | 移动 |
| M-d | 删除后一个单词 | kill |
| M-Backspace | 删除前一个单词 | kill |
| M-y | yank-pop（轮转粘贴） | yank |

### 排除元素

为 input/textarea 添加 `data-no-emacs-keys="true"` 属性可排除该元素。

### Toggle

`Ctrl+Alt+/` 切换脚本启用/禁用状态，状态持久化到 GM_setValue。

## 代码规范

- 注释使用中文
- 日志消息使用英文
- 严格 TypeScript，避免 `any`
- 优先编辑现有文件，避免创建新文件
