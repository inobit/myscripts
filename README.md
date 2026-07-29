# myscripts

Browser userscripts built with TypeScript + Vite.

## Requirements

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 9
- [Tampermonkey](https://www.tampermonkey.net/) (or compatible userscript manager)

## Projects

### translation

划词翻译 + 输入弹窗翻译，支持 Google、DeepLX、DeepSeek 多引擎并行翻译。

```bash
pnpm --filter translation-userscript dev     # dev mode with HMR
pnpm --filter translation-userscript build   # output to dist/
```

Install: Open `translation/dist/translation-userscript.user.js` in Tampermonkey.

### emacs-input

在 input/textarea 中提供 Emacs 风格编辑键位，支持 kill ring、yank-pop 和 undo。

```bash
pnpm --filter emacs-input-userscript dev     # dev mode with HMR
pnpm --filter emacs-input-userscript build   # output to dist/
```

Install: Open `emacs-input/dist/emacs-input-userscript.user.js` in Tampermonkey.

## Build All

```bash
pnpm install
pnpm run build
```

## Release

Push a tag in `{project}/v{version}` format to trigger a GitHub release:

```bash
git tag translation/v0.2.0
git tag emacs-input/v0.3.0
git push --tags
```

## License

MIT
