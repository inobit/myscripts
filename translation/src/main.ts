/**
 * 翻译油猴脚本入口
 * 整合配置、引擎、快捷键、UI 各模块
 */
import { GM_registerMenuCommand } from '$';
import { loadConfig, saveConfig } from './config';
import { translateAll } from './engines';
import { startHotkeyListener } from './hotkeys';
import { showTriggerIcon, hideTriggerIcon } from './ui/trigger-icon';
import { showResultCard, updateResult } from './ui/result-card';
import { showInputDialog } from './ui/input-dialog';
import { showSettingsPanel } from './ui/settings-panel';
import { getShadowHost } from './ui/shadow';

/** 当前配置（运行时缓存，设置保存后刷新） */
let config = loadConfig();

/** 快捷键监听器清理函数 */
let cleanupHotkeys: (() => void) | null = null;

/**
 * 执行划词翻译
 * @param text 待翻译文本
 * @param x 触发点 X 坐标
 * @param y 触发点 Y 坐标
 */
function doTranslateSelection(text: string, x: number, y: number): void {
  hideTriggerIcon();
  showResultCard(text, x, y, config);
  // 并行调用所有启用的 provider，每个完成时渐进式更新卡片
  void translateAll(text, config, (result) => {
    updateResult(result.provider, result);
  });
}

/**
 * 划词翻译快捷键触发：使用当前选区文字
 */
function onTranslateSelectionHotkey(): void {
  const sel = window.getSelection();
  const text = sel?.toString().trim() ?? '';
  if (!text) return;

  // 用选区末尾位置作为卡片定位点
  const range = sel!.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  doTranslateSelection(text, rect.right, rect.bottom);
}

/**
 * 打开输入翻译弹窗
 */
function onOpenDialogHotkey(): void {
  showInputDialog(translateAll, config);
}

/**
 * 打开设置面板
 */
function openSettings(): void {
  showSettingsPanel(config, (newConfig) => {
    config = newConfig;
    saveConfig(config);
    // 重启快捷键监听以应用新配置
    if (cleanupHotkeys) cleanupHotkeys();
    cleanupHotkeys = startHotkeyListener(config, {
      onTranslateSelection: onTranslateSelectionHotkey,
      onOpenDialog: onOpenDialogHotkey,
    });
  });
}

/**
 * 初始化：注册划词监听、快捷键、菜单命令
 */
function init(): void {
  // 划词监听：mouseup 后若有选中文字则显示触发图标
  document.addEventListener('mouseup', (e) => {
    // 忽略右键
    if (e.button !== 0) return;
    // 忽略来自 UI 组件内部的事件
    const host = getShadowHost();
    if (host && e.composedPath().includes(host)) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!text) {
      hideTriggerIcon();
      return;
    }
    // 在鼠标释放位置显示触发图标
    showTriggerIcon(e.clientX, e.clientY, () => {
      doTranslateSelection(text, e.clientX, e.clientY);
    });
  });

  // 快捷键监听
  cleanupHotkeys = startHotkeyListener(config, {
    onTranslateSelection: onTranslateSelectionHotkey,
    onOpenDialog: onOpenDialogHotkey,
  });

  // Tampermonkey 菜单命令
  GM_registerMenuCommand('翻译设置', openSettings, { id: 'settings' });
  GM_registerMenuCommand('打开翻译弹窗', onOpenDialogHotkey, { id: 'open-dialog' });
}

init();