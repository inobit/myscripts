import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: '划词翻译 (Translation)',
        namespace: 'https://github.com/inobit/myscripts',
        version: '0.2.0',
        description:
          '划词翻译 + 输入弹窗翻译，支持 Google、DeepLX、DeepSeek、火山翻译多 provider 并行翻译',
        author: 'inobit',
        match: ['*://*/*'],
        'run-at': 'document-end',
        noframes: true,
        grant: [
          'GM_xmlhttpRequest',
          'GM_setValue',
          'GM_getValue',
          'GM_registerMenuCommand',
          'GM_addStyle',
        ],
        connect: [
          'translate.googleapis.com',
          'api.deeplx.org',
          'translate.volcengineapi.com',
          'api.deepseek.com',
          'opencode.ai',
          '*',
        ],
      },
    }),
  ],
});