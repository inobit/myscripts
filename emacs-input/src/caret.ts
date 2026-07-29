import type { EditableElement } from './types';

/**
 * 计算可编辑元素中光标的屏幕位置
 * 通过创建隐藏 mirror div 来近似 caret 的 client rect
 */
export function caretClientRect(el: EditableElement): DOMRect | null {
  try {
    if (typeof el.selectionStart !== 'number') return null;

    const doc = el.ownerDocument;
    const win = doc.defaultView;
    if (!doc || !win) return null;

    const s = el.selectionStart;
    const v = el.value || '';
    const rect = el.getBoundingClientRect();
    const cs = win.getComputedStyle(el);

    const mirror = doc.createElement('div');
    const isTA = el.tagName === 'TEXTAREA';

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.whiteSpace = isTA ? 'pre-wrap' : 'pre';
    mirror.style.wordWrap = isTA ? 'break-word' : 'normal';
    mirror.style.overflow = 'hidden';
    mirror.style.boxSizing = cs.boxSizing;
    mirror.style.width = `${rect.width}px`;
    mirror.style.height = `${rect.height}px`;
    mirror.style.left = `${rect.left + win.scrollX - el.scrollLeft}px`;
    mirror.style.top = `${rect.top + win.scrollY - el.scrollTop}px`;
    mirror.style.padding = cs.padding;
    mirror.style.border = cs.border;
    mirror.style.font = cs.font;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.textTransform = cs.textTransform;
    mirror.style.textAlign = cs.textAlign;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.direction = cs.direction;

    const before = doc.createTextNode(v.slice(0, s));
    const marker = doc.createElement('span');
    marker.textContent = '\u200b'; // zero-width space
    const after = doc.createTextNode(v.slice(s));

    mirror.appendChild(before);
    mirror.appendChild(marker);
    mirror.appendChild(after);

    const body = doc.body || doc.documentElement;
    body.appendChild(mirror);

    // 确保 mirror 在任何情况下都能被移除
    let mrect: DOMRect | null = null;
    try {
      mrect = marker.getBoundingClientRect();
    } finally {
      if (mirror.parentNode) {
        mirror.parentNode.removeChild(mirror);
      }
    }

    return mrect;
  } catch {
    return null;
  }
}
