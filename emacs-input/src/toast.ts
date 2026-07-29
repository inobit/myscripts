import { caretClientRect } from './caret';
import type { EditableElement } from './types';

/**
 * 显示简短 toast 通知
 * 如果有目标元素，尝试显示在 caret 附近；否则居中显示
 */
export function showToast(text: string, targetEl?: EditableElement): void {
  try {
    const el = document.createElement('div');
    el.textContent = text;

    const style = el.style;
    style.position = 'fixed';
    style.zIndex = '2147483647';
    style.background = 'rgba(0,0,0,0.82)';
    style.color = '#fff';
    style.padding = '6px 10px';
    style.borderRadius = '6px';
    style.font =
      '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
    style.opacity = '0';
    style.transition = 'opacity 80ms ease';

    let placed = false;
    if (targetEl) {
      const caretRect = caretClientRect(targetEl);
      if (caretRect) {
        const x = Math.min(Math.max(4, caretRect.left), window.innerWidth - 4);
        const y = Math.min(
          Math.max(4, caretRect.top - 24),
          window.innerHeight - 4,
        );
        style.left = `${Math.round(x)}px`;
        style.top = `${Math.round(y)}px`;
        placed = true;
      }
    }

    if (!placed) {
      style.left = '50%';
      style.top = '50%';
      style.transform = 'translate(-50%, -50%)';
    }

    const body = document.body || document.documentElement;
    body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });

    setTimeout(() => {
      el.style.opacity = '0';
    }, 500);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 700);
  } catch {
    // 静默忽略 toast 创建失败
  }
}
