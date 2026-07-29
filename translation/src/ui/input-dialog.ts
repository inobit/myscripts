/**
 * 输入翻译对话框
 * 居中弹窗，支持手动输入文本并调用多 provider 翻译
 */

import type { Config, TranslateAllFn } from '../types';
import { getShadowRoot, getShadowHost } from './shadow';
import { createProviderBlock } from './shared';

let currentDialog: HTMLDivElement | null = null;
let closeHandler: (() => void) | null = null;

const CLOSE_CHAR = '×';

/** 所有已知 provider 名称列表 */
const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  deepLX: 'DeepLX',
  deepseek: 'DeepSeek',
  opencode: 'OpenCode',
};

/**
 * 显示输入翻译对话框
 * @param translateAll 翻译编排函数
 * @param config 当前配置
 */
export function showInputDialog(translateAll: TranslateAllFn, config: Config): void {
  hideInputDialog();

  const root = getShadowRoot();

  // 遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'tr-dialog-overlay';

  // 对话框
  const dialog = document.createElement('div');
  dialog.className = 'tr-dialog';

  // 头部
  const header = document.createElement('div');
  header.className = 'tr-dialog-header';

  const title = document.createElement('span');
  title.className = 'tr-dialog-title';
  title.textContent = '翻译';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tr-dialog-close';
  closeBtn.textContent = CLOSE_CHAR;
  closeBtn.title = '关闭';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideInputDialog();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 主体
  const body = document.createElement('div');
  body.className = 'tr-dialog-body';

  // 文本输入区
  const textarea = document.createElement('textarea');
  textarea.className = 'tr-textarea';
  textarea.placeholder = '输入或粘贴要翻译的文本...';

  // 翻译按钮
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.justifyContent = 'flex-end';
  btnRow.style.marginTop = '10px';

  const translateBtn = document.createElement('button');
  translateBtn.className = 'tr-btn tr-btn-primary';
  translateBtn.textContent = '翻译 (Ctrl+Enter)';

  btnRow.appendChild(translateBtn);

  // 结果区容器
  const resultsSection = document.createElement('div');
  resultsSection.className = 'tr-dialog-results tr-hidden';

  const resultsTitle = document.createElement('div');
  resultsTitle.className = 'tr-dialog-results-title';
  resultsTitle.textContent = '翻译结果';

  const resultsBody = document.createElement('div');

  resultsSection.appendChild(resultsTitle);
  resultsSection.appendChild(resultsBody);

  body.appendChild(textarea);
  body.appendChild(btnRow);
  body.appendChild(resultsSection);

  dialog.appendChild(header);
  dialog.appendChild(body);
  overlay.appendChild(dialog);
  root.appendChild(overlay);

  currentDialog = overlay;

  // 自动聚焦
  requestAnimationFrame(() => {
    textarea.focus();
  });

  // 执行翻译
  const doTranslate = async () => {
    const text = textarea.value.trim();
    if (!text) return;

    // 清空旧结果
    resultsBody.innerHTML = '';

    // 立即为所有启用的 provider 创建占位块
    const providerMap = new Map<string, ReturnType<typeof createProviderBlock>>();
    for (const [key, name] of Object.entries(PROVIDER_NAMES)) {
      const enabled = config.providers[key as keyof typeof config.providers]?.enabled;
      if (!enabled) continue;
      const block = createProviderBlock(name);
      resultsBody.appendChild(block.element);
      providerMap.set(name, block);
    }

    resultsSection.classList.remove('tr-hidden');

    try {
      await translateAll(text, config, (result) => {
        const block = providerMap.get(result.provider);
        if (block) {
          block.update(result);
        }
      });
    } catch (err) {
      console.error('[translator-ui] translateAll failed:', err);
    }
  };

  translateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    doTranslate();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      doTranslate();
    }
  });

  // 遮罩层点击关闭（但点击 dialog 内部不关闭）
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      hideInputDialog();
    }
  });

  // 关闭事件
  closeHandler = bindCloseEvents();
}

/**
 * 隐藏输入翻译对话框
 */
export function hideInputDialog(): void {
  if (closeHandler) {
    closeHandler();
    closeHandler = null;
  }
  if (currentDialog) {
    currentDialog.remove();
    currentDialog = null;
  }
}

/**
 * 绑定 ESC 关闭
 */
function bindCloseEvents(): () => void {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideInputDialog();
    }
  };

  const onDocClick = (e: MouseEvent) => {
    const host = getShadowHost();
    if (!host) return;
    const path = e.composedPath();
    if (!path.includes(host)) {
      hideInputDialog();
    }
  };

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('mousedown', onDocClick);

  return () => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('mousedown', onDocClick);
  };
}
