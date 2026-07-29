import { GM_getValue, GM_setValue } from '$';

const STORAGE_KEY = 'emacs_input_enabled';

/** 默认启用 */
const DEFAULT_ENABLED = true;

/** 读取启用状态 */
export function loadEnabled(): boolean {
  try {
    const v = GM_getValue(STORAGE_KEY);
    if (typeof v === 'boolean') return v;
  } catch {
    // ignore
  }
  return DEFAULT_ENABLED;
}

/** 保存启用状态 */
export function saveEnabled(enabled: boolean): void {
  GM_setValue(STORAGE_KEY, enabled);
}
