/**
 * 快捷键管理器
 * 监听全局键盘事件，匹配用户配置的快捷键并触发对应操作
 */
import type { Config, HotkeyDef } from './types';

export interface HotkeyHandlers {
  onTranslateSelection: () => void;
  onOpenDialog: () => void;
}

/**
 * 判断键盘事件是否匹配快捷键定义
 */
export function matchHotkey(event: KeyboardEvent, def: HotkeyDef): boolean {
  return (
    event.key.toLowerCase() === def.key.toLowerCase() &&
    event.altKey === (def.alt ?? false) &&
    event.ctrlKey === (def.ctrl ?? false) &&
    event.shiftKey === (def.shift ?? false) &&
    event.metaKey === (def.meta ?? false)
  );
}

/**
 * 判断当前焦点元素是否为可编辑区域
 */
function isEditableActive(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  return (el as HTMLElement).isContentEditable ?? false;
}

/**
 * 启动快捷键监听
 * @param config 配置对象
 * @param handlers 快捷键对应的回调
 * @returns 清理函数，用于移除监听器
 */
export function startHotkeyListener(
  config: Config,
  handlers: HotkeyHandlers,
): () => void {
  const handler = (event: KeyboardEvent) => {
    // Escape 在任何情况下都可用；其他快捷键在可编辑元素中忽略，避免干扰打字
    if (event.key !== 'Escape' && isEditableActive()) return;

    if (matchHotkey(event, config.hotkeys.translateSel)) {
      event.preventDefault();
      handlers.onTranslateSelection();
      return;
    }

    if (matchHotkey(event, config.hotkeys.openDialog)) {
      event.preventDefault();
      handlers.onOpenDialog();
      return;
    }
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
