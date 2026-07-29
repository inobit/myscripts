/**
 * Kill ring 管理模块
 *
 * Emacs kill ring 行为：
 * - C-k、M-d、M-Backspace 等 kill 命令将删除的文本存入 ring
 * - 连续的 kill 命令追加到同一 ring 条目
 * - C-y (yank) 粘贴最近一次 kill 的文本
 * - M-y (yank-pop) 在 yank 后轮转到上一个 ring 条目
 */
import type { KillRingEntry } from './types';

const ring: KillRingEntry[] = [];
const MAX_RING_SIZE = 60;

/** 当前 yank 在 ring 中的索引（-1 表示未进入 yank 循环） */
let yankIndex = -1;
/** 上一条命令是否是 kill 类命令（用于连续 kill 追加） */
let lastCommandWasKill = false;

/**
 * 将文本推入 kill ring
 * 如果上一条命令也是 kill，则追加到首条而非新建
 */
export function push(text: string): void {
  if (!text) return;

  if (lastCommandWasKill && ring.length > 0) {
    // 连续 kill：追加到 ring 首条
    ring[0] = { text: ring[0].text + text };
  } else {
    ring.unshift({ text });
    if (ring.length > MAX_RING_SIZE) {
      ring.pop();
    }
  }

  lastCommandWasKill = true;
  yankIndex = -1;
}

/** 标记上一条不是 kill 命令（中断连续 kill 追加 + 取消 yank 循环） */
export function markNonKill(): void {
  lastCommandWasKill = false;
  yankIndex = -1;
}

/** 开始一次 yank 操作，返回 ring 首条文本 */
export function startYank(): KillRingEntry | null {
  if (ring.length === 0) return null;
  yankIndex = 0;
  return ring[0];
}

/** 在 yank 后轮转到上一条 ring 条目 */
export function yankPop(): KillRingEntry | null {
  if (ring.length === 0 || yankIndex < 0) return null;
  yankIndex = (yankIndex + 1) % ring.length;
  return ring[yankIndex];
}

/** 结束 yank 循环 */
export function resetYank(): void {
  yankIndex = -1;
}
