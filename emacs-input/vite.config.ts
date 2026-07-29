import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Emacs Input',
        namespace: 'https://github.com/inobit/myscripts',
        version: '0.2.0',
        description:
          'Emacs-like keybindings (C-a, C-e, C-b, C-f, C-d, C-k, M-b, M-f, M-d, M-Backspace, C-y, M-y, C-_) for input and textarea elements',
        author: 'inobit',
        match: ['*://*/*'],
        grant: ['GM_setValue', 'GM_getValue'],
        'run-at': 'document-start',
      },
    }),
  ],
});
