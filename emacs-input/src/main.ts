/**
 * Emacs Input 油猴脚本入口
 * 在 input/textarea 中提供 Emacs 风格的编辑键位
 */
import { loadEnabled, saveEnabled } from './config';
import { showToast } from './toast';
import { cancelYankCycle } from './editing';
import {
  isEditableTarget,
  beginningOfLine,
  endOfLine,
  backwardChar,
  forwardChar,
  deleteCharForward,
  deleteCharBackward,
  forwardWord,
  backwardWord,
  deleteWordForward,
  deleteWordBackward,
  killToEndOfLine,
  yankFromRing,
  yankPopFromRing,
  undo,
} from './editing';

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------

let enabled = loadEnabled();
const addOpts: AddEventListenerOptions = { capture: true, passive: false };

// ---------------------------------------------------------------------------
// 键位匹配
// ---------------------------------------------------------------------------

/** 判断是否为脚本关注的快捷键组合（用于 keypress/keyup 拦截） */
function isOurCombo(e: KeyboardEvent): boolean {
  const key = (e.key || '').toLowerCase();
  return (
    (e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      ['a', 'e', 'b', 'f', 'd', 'k', 'h', 'y', '_'].includes(key)) ||
    (e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      (['f', 'b', 'd', 'y'].includes(key) || key === 'backspace'))
  );
}

/** 判断 toggle 组合键: Ctrl+Alt+/ */
function isToggleCombo(e: KeyboardEvent): boolean {
  if (e.isComposing) return false;
  if (!e.ctrlKey || !e.altKey || e.metaKey) return false;
  const k = e.key || '';
  return k === '/' || e.code === 'Slash';
}

/** 判断 undo 组合键: C-_ (= Ctrl+Shift+- on US keyboard) */
function isUndoCombo(e: KeyboardEvent): boolean {
  return (
    e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    (e.key === '_' || e.code === 'Minus')
  );
}

// ---------------------------------------------------------------------------
// 键盘事件处理
// ---------------------------------------------------------------------------

function handleKeydown(e: KeyboardEvent): void {
  if (e.defaultPrevented || e.isComposing) return;

  if (!enabled) return;
  const t = e.target;
  if (!isEditableTarget(t)) return;

  // 任何非 yank 命令都会取消 yank 循环
  // yank 相关命令自己管理 cancellation
  const key = (e.key || '').toLowerCase();
  const ctrl = e.ctrlKey;
  const alt = e.altKey;
  const meta = e.metaKey;

  // 不干扰系统快捷键
  if (meta) return;

  // 处理 Ctrl+Alt+/ 切换
  if (isToggleCombo(e)) return;

  let handled = false;

  // Ctrl-based（无 Alt，无 Meta）
  if (ctrl && !alt) {
    switch (key) {
      case 'a':
        cancelYankCycle(); beginningOfLine(t); handled = true; break;
      case 'e':
        cancelYankCycle(); endOfLine(t); handled = true; break;
      case 'b':
        cancelYankCycle(); backwardChar(t); handled = true; break;
      case 'f':
        cancelYankCycle(); forwardChar(t); handled = true; break;
      case 'd':
        cancelYankCycle(); deleteCharForward(t); handled = true; break;
      case 'h':
        cancelYankCycle(); deleteCharBackward(t); handled = true; break;
      case 'k':
        // kill 命令不取消 yank 循环（但 killring.push 会重置）
        killToEndOfLine(t); handled = true; break;
      case 'y':
        yankFromRing(t); handled = true; break;
      default:
        break;
    }
  }

  // Alt-based（无 Ctrl，无 Meta）
  if (!handled && alt && !ctrl) {
    switch (key) {
      case 'f':
        cancelYankCycle(); forwardWord(t); handled = true; break;
      case 'b':
        cancelYankCycle(); backwardWord(t); handled = true; break;
      case 'd':
        // kill 命令
        deleteWordForward(t); handled = true; break;
      case 'y':
        yankPopFromRing(t); handled = true; break;
      default:
        break;
    }
  }

  // Alt-Backspace (特殊的 key 检查)
  if (!handled && alt && !ctrl && key === 'backspace') {
    deleteWordBackward(t);
    handled = true;
  }

  // C-_ = undo（独立于 ctrl+alt 检查）
  if (!handled && isUndoCombo(e)) {
    cancelYankCycle();
    undo();
    handled = true;
  }

  if (handled) {
    try { e.preventDefault(); } catch { /* 忽略 */ }
    try { e.stopImmediatePropagation(); } catch { /* 忽略 */ }
    try { e.stopPropagation(); } catch { /* 忽略 */ }
  }
}

/** 额外拦截 keypress/keyup，防止浏览器默认行为 */
function handleKeypressKeyup(e: KeyboardEvent): void {
  if (!enabled) return;
  if (!isEditableTarget(e.target)) return;
  if (!isOurCombo(e)) return;
  try { e.preventDefault(); } catch { /* 忽略 */ }
  try { e.stopImmediatePropagation(); } catch { /* 忽略 */ }
  try { e.stopPropagation(); } catch { /* 忽略 */ }
}

// ---------------------------------------------------------------------------
// toggle
// ---------------------------------------------------------------------------

function handleToggle(e: KeyboardEvent): void {
  if (!isToggleCombo(e)) return;

  try { e.preventDefault(); } catch { /* 忽略 */ }
  try { e.stopImmediatePropagation(); } catch { /* 忽略 */ }
  try { e.stopPropagation(); } catch { /* 忽略 */ }

  enabled = !enabled;
  saveEnabled(enabled);

  const target = document.activeElement;
  const el = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    ? target
    : undefined;

  if (enabled) {
    addListeners();
    showToast('Emacs Keys: On', el);
  } else {
    removeListeners();
    showToast('Emacs Keys: Off', el);
  }
}

// ---------------------------------------------------------------------------
// 监听器管理
// ---------------------------------------------------------------------------

function addListeners(): void {
  window.addEventListener('keydown', handleKeydown, addOpts);
  window.addEventListener('keypress', handleKeypressKeyup, addOpts);
  window.addEventListener('keyup', handleKeypressKeyup, addOpts);
}

function removeListeners(): void {
  window.removeEventListener('keydown', handleKeydown, addOpts);
  window.removeEventListener('keypress', handleKeypressKeyup, addOpts);
  window.removeEventListener('keyup', handleKeypressKeyup, addOpts);
}

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------

addListeners();
window.addEventListener('keydown', handleToggle, addOpts);
