/**
 * 翻译结果卡片
 * 显示原文及所有 provider 的翻译结果，初始即展示所有启用 provider 的占位 spinners
 */

import type { Config, TranslationResult } from '../types';
import { getShadowRoot, getShadowHost } from './shadow';
import { createProviderBlock } from './shared';

let currentCard: HTMLDivElement | null = null;
let providerMap = new Map<string, ReturnType<typeof createProviderBlock>>();
let closeHandler: (() => void) | null = null;

/** 关闭图标字符 */
const CLOSE_CHAR = '×';

/** 所有已知 provider 名称列表 */
const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  deepLX: 'DeepLX',
  volcano: '火山翻译',
  deepseek: 'DeepSeek',
  opencode: 'OpenCode',
};

/**
 * 显示结果卡片
 * @param originalText 原文
 * @param x 触发点 X
 * @param y 触发点 Y
 * @param config 当前配置
 */
export function showResultCard(originalText: string, x: number, y: number, config: Config): void {
  hideResultCard();

  const root = getShadowRoot();

  const card = document.createElement('div');
  card.className = 'tr-card';

  // 头部：原文 + 关闭按钮
  const header = document.createElement('div');
  header.className = 'tr-card-header';

  const title = document.createElement('span');
  title.className = 'tr-card-title';
  title.textContent = originalText;
  title.title = originalText;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tr-card-close';
  closeBtn.textContent = CLOSE_CHAR;
  closeBtn.title = '关闭';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideResultCard();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 主体：先展示所有启用 provider 的占位块
  const body = document.createElement('div');
  body.className = 'tr-card-body';

  const newMap = new Map<string, ReturnType<typeof createProviderBlock>>();
  for (const [key, name] of Object.entries(PROVIDER_NAMES)) {
    const enabled = config.providers[key as keyof typeof config.providers]?.enabled;
    if (!enabled) continue;
    if (enabled) {
      const block = createProviderBlock(name);
      body.appendChild(block.element);
      newMap.set(name, block);
    }
  }

  card.appendChild(header);
  card.appendChild(body);
  root.appendChild(card);

  currentCard = card;
  providerMap = newMap;

  // 定位
  requestAnimationFrame(() => {
    positionCard(card, x, y);
  });

  // 关闭事件绑定
  closeHandler = bindCloseEvents();
}

/**
 * 更新某个 provider 的结果
 * @param provider provider 显示名称
 * @param result 翻译结果
 */
export function updateResult(provider: string, result: TranslationResult): void {
  if (!currentCard) return;

  const block = providerMap.get(provider);
  if (block) {
    block.update(result);
  }
}

/**
 * 隐藏结果卡片
 */
export function hideResultCard(): void {
  if (closeHandler) {
    closeHandler();
    closeHandler = null;
  }
  if (currentCard) {
    currentCard.remove();
    currentCard = null;
  }
  providerMap.clear();
}

/**
 * 计算卡片位置，自动翻转
 */
function positionCard(card: HTMLDivElement, x: number, y: number): void {
  const rect = card.getBoundingClientRect();
  const margin = 12;
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  let top = y + margin;
  let left = x;

  // 下方空间不足则翻转至上方
  if (top + rect.height > viewportH - margin) {
    top = y - rect.height - margin;
    if (top < margin) {
      top = margin;
    }
  }

  // 水平边界检查
  if (left + rect.width > viewportW - margin) {
    left = viewportW - rect.width - margin;
  }
  if (left < margin) {
    left = margin;
  }

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

/**
 * 绑定关闭事件：ESC、点击外部
 * @returns 清理函数
 */
function bindCloseEvents(): () => void {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideResultCard();
    }
  };

  const onDocClick = (e: MouseEvent) => {
    const host = getShadowHost();
    if (!host) return;
    const path = e.composedPath();
    if (!path.includes(host)) {
      hideResultCard();
    }
  };

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('mousedown', onDocClick);

  return () => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('mousedown', onDocClick);
  };
}
