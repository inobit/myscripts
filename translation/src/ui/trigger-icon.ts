/**
 * 浮动触发图标
 * 文本选中后显示在鼠标位置附近的小翻译按钮
 */

import { getShadowRoot } from './shadow';

let currentIcon: HTMLDivElement | null = null;

/** 翻译图标 SVG（文 A 风格） */
const TRANSLATE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M17 18h6"/></svg>`;

/**
 * 显示触发图标
 * @param x 视口 X 坐标
 * @param y 视口 Y 坐标
 * @param onClick 点击回调
 */
export function showTriggerIcon(x: number, y: number, onClick: () => void): void {
  hideTriggerIcon();

  const root = getShadowRoot();

  const wrapper = document.createElement('div');
  wrapper.className = 'tr-trigger-icon';
  wrapper.style.left = `${x + 8}px`;
  wrapper.style.top = `${y + 8}px`;

  const inner = document.createElement('div');
  inner.className = 'tr-trigger-icon-inner';
  inner.innerHTML = TRANSLATE_ICON_SVG;

  wrapper.appendChild(inner);
  root.appendChild(wrapper);

  wrapper.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  });

  currentIcon = wrapper;
}

/**
 * 隐藏触发图标
 */
export function hideTriggerIcon(): void {
  if (currentIcon) {
    currentIcon.remove();
    currentIcon = null;
  }
}

/**
 * 监听选区变化，自动隐藏图标
 */
document.addEventListener('selectionchange', () => {
  const sel = document.getSelection();
  if (!sel || sel.toString().trim() === '') {
    hideTriggerIcon();
  }
});
