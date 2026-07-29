/**
 * Emacs 编辑命令集合
 * 所有命令接收 EditableElement 并对其执行操作
 * kill 命令（C-k、M-d、M-Backspace）自动将删除的文本推入 kill ring
 */
import type { EditableElement } from './types';
import {
  push,
  markNonKill,
  startYank,
  yankPop,
  resetYank,
} from './killring';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

const isWordChar = (ch: string): boolean => /[A-Za-z0-9_]/.test(ch);
const isWhite = (ch: string): boolean => /\s/.test(ch);

function getValue(el: EditableElement): string {
  return el.value || '';
}

function setSelection(el: EditableElement, start: number, end?: number): void {
  const v = getValue(el);
  const len = v.length;
  const s = Math.max(0, Math.min(start, len));
  const e = end != null ? Math.max(0, Math.min(end, len)) : s;
  el.setSelectionRange(s, e, 'none');
}

function caretPos(el: EditableElement): number {
  return el.selectionStart ?? 0;
}

function selectionRange(el: EditableElement): [number, number] {
  const s = el.selectionStart ?? 0;
  const e = el.selectionEnd ?? s;
  return [s, e];
}

// ---------------------------------------------------------------------------
// 元素判定
// ---------------------------------------------------------------------------

/**
 * 判断元素是否为脚本应处理的 input/textarea
 * 可通过 data-no-emacs-keys="true" 属性排除
 */
export function isEditableTarget(
  el: EventTarget | null,
): el is EditableElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.getAttribute('data-no-emacs-keys') === 'true') return false;

  const tag = el.tagName;
  if (tag === 'TEXTAREA')
    return !(el as HTMLTextAreaElement).readOnly &&
      !(el as HTMLTextAreaElement).disabled;
  if (tag === 'INPUT') {
    const input = el as HTMLInputElement;
    if (input.readOnly || input.disabled) return false;
    const type = (input.getAttribute('type') || '').toLowerCase();
    return (
      type === '' ||
      type === 'text' ||
      type === 'search' ||
      type === 'url' ||
      type === 'email' ||
      type === 'tel' ||
      type === 'password'
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// 行操作
// ---------------------------------------------------------------------------

function lineBounds(el: EditableElement, idx: number): [number, number] {
  const v = getValue(el);
  if (el.tagName === 'TEXTAREA') {
    let start = v.lastIndexOf('\n', Math.max(0, idx - 1));
    start = start === -1 ? 0 : start + 1;
    let end = v.indexOf('\n', idx);
    end = end === -1 ? v.length : end;
    return [start, end];
  }
  // 单行 input：整行 = 整段文字
  return [0, v.length];
}

// ---------------------------------------------------------------------------
// 光标移动（非 kill）
// ---------------------------------------------------------------------------

export function beginningOfLine(el: EditableElement): void {
  markNonKill();
  const pos = caretPos(el);
  const [start] = lineBounds(el, pos);
  setSelection(el, start);
}

export function endOfLine(el: EditableElement): void {
  markNonKill();
  const pos = caretPos(el);
  const [, end] = lineBounds(el, pos);
  setSelection(el, end);
}

export function backwardChar(el: EditableElement): void {
  markNonKill();
  const [s, e] = selectionRange(el);
  const pos = Math.min(s, e);
  setSelection(el, pos - 1);
}

export function forwardChar(el: EditableElement): void {
  markNonKill();
  const [s, e] = selectionRange(el);
  const pos = Math.max(s, e);
  setSelection(el, pos + 1);
}

// ---------------------------------------------------------------------------
// 字符删除（非 kill，不推入 ring）
// ---------------------------------------------------------------------------

export function deleteCharForward(el: EditableElement): void {
  markNonKill();
  const v = getValue(el);
  const [s, e] = selectionRange(el);
  if (s !== e) {
    el.setRangeText('', s, e, 'start');
    return;
  }
  if (s >= v.length) return;
  el.setRangeText('', s, s + 1, 'start');
}

export function deleteCharBackward(el: EditableElement): void {
  markNonKill();
  const [s, e] = selectionRange(el);
  if (s !== e) {
    el.setRangeText('', s, e, 'start');
    return;
  }
  if (s <= 0) return;
  el.setRangeText('', s - 1, s, 'start');
}

// ---------------------------------------------------------------------------
// 单词移动（非 kill）
// ---------------------------------------------------------------------------

export function forwardWord(el: EditableElement): void {
  markNonKill();
  const v = getValue(el);
  const len = v.length;
  const [, e] = selectionRange(el);
  let i = e;
  while (i < len && isWhite(v[i])) i++;
  if (i < len && isWordChar(v[i])) {
    while (i < len && isWordChar(v[i])) i++;
  } else {
    while (i < len && !isWhite(v[i]) && !isWordChar(v[i])) i++;
  }
  setSelection(el, i);
}

export function backwardWord(el: EditableElement): void {
  markNonKill();
  const v = getValue(el);
  const [s] = selectionRange(el);
  let i = s;
  while (i > 0 && isWhite(v[i - 1])) i--;
  if (i > 0 && isWordChar(v[i - 1])) {
    while (i > 0 && isWordChar(v[i - 1])) i--;
  } else {
    while (i > 0 && !isWhite(v[i - 1]) && !isWordChar(v[i - 1])) i--;
  }
  setSelection(el, i);
}

// ---------------------------------------------------------------------------
// kill 命令（推入 kill ring）
// ---------------------------------------------------------------------------

export function deleteWordForward(el: EditableElement): void {
  const v = getValue(el);
  let [s, e] = selectionRange(el);
  if (s !== e) {
    push(v.slice(s, e));
    el.setRangeText('', s, e, 'start');
    return;
  }
  const len = v.length;
  let i = s;
  while (i < len && isWhite(v[i])) i++;
  if (i < len && isWordChar(v[i])) {
    while (i < len && isWordChar(v[i])) i++;
  } else {
    while (i < len && !isWhite(v[i]) && !isWordChar(v[i])) i++;
  }
  push(v.slice(s, i));
  el.setRangeText('', s, i, 'start');
}

export function deleteWordBackward(el: EditableElement): void {
  const v = getValue(el);
  let [s, e] = selectionRange(el);
  if (s !== e) {
    push(v.slice(s, e));
    el.setRangeText('', s, e, 'start');
    return;
  }
  let i = s;
  while (i > 0 && isWhite(v[i - 1])) i--;
  if (i > 0 && isWordChar(v[i - 1])) {
    while (i > 0 && isWordChar(v[i - 1])) i--;
  } else {
    while (i > 0 && !isWhite(v[i - 1]) && !isWordChar(v[i - 1])) i--;
  }
  push(v.slice(i, s));
  el.setRangeText('', i, s, 'start');
}

export function killToEndOfLine(el: EditableElement): void {
  const v = getValue(el);
  const len = v.length;
  const [s, e] = selectionRange(el);
  if (s !== e) {
    push(v.slice(s, e));
    el.setRangeText('', s, e, 'start');
    return;
  }
  const pos = s;
  const [, lineEnd] = lineBounds(el, pos);
  if (pos < lineEnd) {
    push(v.slice(pos, lineEnd));
    el.setRangeText('', pos, lineEnd, 'start');
  } else if (el.tagName === 'TEXTAREA' && lineEnd < len) {
    // 行尾：删除换行符（合并下一行）
    push(v.slice(pos, Math.min(pos + 1, len)));
    el.setRangeText('', pos, Math.min(pos + 1, len), 'start');
  }
}

// ---------------------------------------------------------------------------
// yank（从 kill ring 粘贴）
// ---------------------------------------------------------------------------

/** dataset key：记录上次 yank 插入的文字长度 */
const YANK_LEN_KEY = 'emacsYankLen';

/**
 * C-y：粘贴 kill ring 首条
 * 同时记录插入文本长度到元素 dataset，供后续 M-y 使用
 */
export function yankFromRing(el: EditableElement): void {
  const entry = startYank();
  if (!entry) return;

  const [s, e] = selectionRange(el);
  if (s !== e) {
    el.setRangeText('', s, e, 'start');
  }
  const pos = el.selectionStart ?? 0;
  el.setRangeText(entry.text, pos, pos, 'end');
  el.dataset[YANK_LEN_KEY] = String(entry.text.length);
}

/**
 * M-y：yank-pop，替换刚粘贴的文字为 kill ring 上一条
 */
export function yankPopFromRing(el: EditableElement): void {
  const prevLen = parseInt(el.dataset[YANK_LEN_KEY] ?? '0', 10);
  if (prevLen <= 0) return;

  const entry = yankPop();
  if (!entry) return;

  // 删除上次 yank 插入的文字（在光标之前）
  const pos = el.selectionEnd ?? el.selectionStart ?? 0;
  const delStart = Math.max(0, pos - prevLen);
  el.setRangeText('', delStart, pos, 'start');

  // 插入新的 yank 文字
  const newPos = el.selectionStart ?? 0;
  el.setRangeText(entry.text, newPos, newPos, 'end');
  el.dataset[YANK_LEN_KEY] = String(entry.text.length);
}

// ---------------------------------------------------------------------------
// undo
// ---------------------------------------------------------------------------

export function undo(): void {
  markNonKill();
  try {
    document.execCommand('undo');
  } catch {
    // 静默忽略
  }
}

/** 取消 yank 循环（在非 yank 命令执行时调用，确保 M-y 不会意外触发） */
export function cancelYankCycle(): void {
  resetYank();
}
