/**
 * Emacs Input 共享类型定义
 * 所有模块的契约根，不依赖任何其他模块
 */

/** 可编辑的 input/textarea 元素 */
export type EditableElement = HTMLInputElement | HTMLTextAreaElement;

/** kill ring 单条记录 */
export interface KillRingEntry {
  /** 被 kill 的文本内容 */
  text: string;
}
