/**
 * 设置配置面板
 * 居中弹窗，支持 provider 启用/配置及快捷键设置
 */

import type { Config, HotkeyDef } from '../types';
import { getShadowRoot, getShadowHost } from './shadow';

let currentPanel: HTMLDivElement | null = null;
let closeHandler: (() => void) | null = null;
let recordingCleanup: (() => void) | null = null;

const CLOSE_CHAR = '×';

/**
 * 显示设置面板
 * @param config 当前配置
 * @param onSave 保存回调，传入新配置对象
 */
export function showSettingsPanel(config: Config, onSave: (config: Config) => void): void {
  hideSettingsPanel();

  const root = getShadowRoot();

  const overlay = document.createElement('div');
  overlay.className = 'tr-dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'tr-dialog';

  // 头部
  const header = document.createElement('div');
  header.className = 'tr-dialog-header';

  const title = document.createElement('span');
  title.className = 'tr-dialog-title';
  title.textContent = '翻译设置';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tr-dialog-close';
  closeBtn.textContent = CLOSE_CHAR;
  closeBtn.title = '关闭';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideSettingsPanel();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 主体表单
  const body = document.createElement('div');
  body.className = 'tr-dialog-body';

  // ---------- Provider 区域 ----------
  const providerGroup = document.createElement('div');
  providerGroup.className = 'tr-settings-group';

  const providerLabel = document.createElement('div');
  providerLabel.className = 'tr-settings-label';
  providerLabel.textContent = '翻译引擎';
  providerGroup.appendChild(providerLabel);

  // Google
  const googleWrap = createCheckbox('google', 'Google', config.providers.google.enabled);
  const googleTimeout = createNumberInput('google-timeout', '超时(ms)', config.providers.google.timeout);
  googleTimeout.style.marginLeft = '24px';
  googleTimeout.style.marginTop = '6px';

  const googleToggle = googleWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
  googleToggle.addEventListener('change', () => {
    googleTimeout.classList.toggle('tr-hidden', !googleToggle.checked);
  });
  if (!config.providers.google.enabled) {
    googleTimeout.classList.add('tr-hidden');
  }

  providerGroup.appendChild(googleWrap);
  providerGroup.appendChild(googleTimeout);

  // DeepLX
  const deepLXWrap = createCheckbox('deeplx', 'DeepLX', config.providers.deepLX.enabled);
  const deepLXInput = createTextInput('deeplx-url', '接口地址', config.providers.deepLX.url);
  deepLXInput.classList.add('tr-hidden');
  deepLXInput.style.marginLeft = '24px';
  deepLXInput.style.marginTop = '6px';

  const deepLXTimeout = createNumberInput('deeplx-timeout', '超时(ms)', config.providers.deepLX.timeout);
  deepLXTimeout.classList.add('tr-hidden');
  deepLXTimeout.style.marginLeft = '24px';
  deepLXTimeout.style.marginTop = '6px';

  const deepLXToggle = deepLXWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
  deepLXToggle.addEventListener('change', () => {
    deepLXInput.classList.toggle('tr-hidden', !deepLXToggle.checked);
    deepLXTimeout.classList.toggle('tr-hidden', !deepLXToggle.checked);
  });
  if (config.providers.deepLX.enabled) {
    deepLXInput.classList.remove('tr-hidden');
    deepLXTimeout.classList.remove('tr-hidden');
  }

  providerGroup.appendChild(deepLXWrap);
  providerGroup.appendChild(deepLXInput);
  providerGroup.appendChild(deepLXTimeout);

  // DeepSeek (LLM)
  const deepseekWrap = createCheckbox('deepseek', 'DeepSeek', config.providers.deepseek.enabled);
  const deepseekInputs = document.createElement('div');
  deepseekInputs.className = 'tr-hidden';
  deepseekInputs.style.marginLeft = '24px';
  deepseekInputs.style.marginTop = '6px';

  const deepseekEndpoint = createTextInput('deepseek-endpoint', 'Endpoint', config.providers.deepseek.endpoint);
  const deepseekKey = createPasswordInput('deepseek-key', 'API Key', config.providers.deepseek.apiKey);
  const deepseekModel = createTextInput('deepseek-model', 'Model', config.providers.deepseek.model);
  const deepseekTimeout = createNumberInput('deepseek-timeout', '超时(ms)', config.providers.deepseek.timeout);

  deepseekInputs.appendChild(deepseekEndpoint);
  deepseekInputs.appendChild(deepseekKey);
  deepseekInputs.appendChild(deepseekModel);
  deepseekInputs.appendChild(deepseekTimeout);

  const deepseekToggle = deepseekWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
  deepseekToggle.addEventListener('change', () => {
    deepseekInputs.classList.toggle('tr-hidden', !deepseekToggle.checked);
  });
  if (config.providers.deepseek.enabled) {
    deepseekInputs.classList.remove('tr-hidden');
  }

  providerGroup.appendChild(deepseekWrap);
  providerGroup.appendChild(deepseekInputs);

  // OpenCode
  const opencodeWrap = createCheckbox('opencode', 'OpenCode', config.providers.opencode.enabled);
  const opencodeInputs = document.createElement('div');
  opencodeInputs.className = 'tr-hidden';
  opencodeInputs.style.marginLeft = '24px';
  opencodeInputs.style.marginTop = '6px';

  const opencodeEndpoint = createTextInput('opencode-endpoint', 'Endpoint', config.providers.opencode.endpoint);
  const opencodeKey = createPasswordInput('opencode-key', 'API Key', config.providers.opencode.apiKey);
  const opencodeModel = createTextInput('opencode-model', 'Model', config.providers.opencode.model);
  const opencodeTimeout = createNumberInput('opencode-timeout', '超时(ms)', config.providers.opencode.timeout);

  opencodeInputs.appendChild(opencodeEndpoint);
  opencodeInputs.appendChild(opencodeKey);
  opencodeInputs.appendChild(opencodeModel);
  opencodeInputs.appendChild(opencodeTimeout);

  const opencodeToggle = opencodeWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
  opencodeToggle.addEventListener('change', () => {
    opencodeInputs.classList.toggle('tr-hidden', !opencodeToggle.checked);
  });
  if (config.providers.opencode.enabled) {
    opencodeInputs.classList.remove('tr-hidden');
  }

  providerGroup.appendChild(opencodeWrap);
  providerGroup.appendChild(opencodeInputs);

  body.appendChild(providerGroup);

  // ---------- 快捷键区域 ----------
  const hotkeyGroup = document.createElement('div');
  hotkeyGroup.className = 'tr-settings-group';

  const hotkeyLabel = document.createElement('div');
  hotkeyLabel.className = 'tr-settings-label';
  hotkeyLabel.textContent = '快捷键';
  hotkeyGroup.appendChild(hotkeyLabel);

  // 翻译选中文字
  const hk1Row = createHotkeyRow('翻译选中文字', config.hotkeys.translateSel, 'hk-translate-sel');
  hotkeyGroup.appendChild(hk1Row);

  // 打开翻译弹窗
  const hk2Row = createHotkeyRow('打开翻译弹窗', config.hotkeys.openDialog, 'hk-open-dialog');
  hotkeyGroup.appendChild(hk2Row);

  body.appendChild(hotkeyGroup);

  // ---------- 操作按钮 ----------
  const actions = document.createElement('div');
  actions.className = 'tr-settings-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'tr-btn tr-btn-secondary';
  cancelBtn.textContent = '取消';
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideSettingsPanel();
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'tr-btn tr-btn-primary';
  saveBtn.textContent = '保存';
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const googleCb = googleWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const googleTimeoutEl = googleTimeout.querySelector('input') as HTMLInputElement;
    const deepLXCb = deepLXWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const deepLXUrlEl = deepLXInput.querySelector('input') as HTMLInputElement;
    const deepLXTimeoutEl = deepLXTimeout.querySelector('input') as HTMLInputElement;
    const deepseekCb = deepseekWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const deepseekEndpointEl = deepseekEndpoint.querySelector('input') as HTMLInputElement;
    const deepseekKeyEl = deepseekKey.querySelector('input') as HTMLInputElement;
    const deepseekModelEl = deepseekModel.querySelector('input') as HTMLInputElement;
    const deepseekTimeoutEl = deepseekTimeout.querySelector('input') as HTMLInputElement;
    const opencodeCb = opencodeWrap.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const opencodeEndpointEl = opencodeEndpoint.querySelector('input') as HTMLInputElement;
    const opencodeKeyEl = opencodeKey.querySelector('input') as HTMLInputElement;
    const opencodeModelEl = opencodeModel.querySelector('input') as HTMLInputElement;
    const opencodeTimeoutEl = opencodeTimeout.querySelector('input') as HTMLInputElement;

    // 至少启用一个翻译 provider
    if (!googleCb.checked && !deepLXCb.checked && !deepseekCb.checked && !opencodeCb.checked) {
      alert('请至少启用一个翻译引擎');
      return;
    }

    const hk1El = dialog.querySelector('#hk-translate-sel') as HTMLButtonElement;
    const hk2El = dialog.querySelector('#hk-open-dialog') as HTMLButtonElement;

    const newConfig: Config = {
      providers: {
        google: {
          enabled: googleCb.checked,
          timeout: parseInt(googleTimeoutEl?.value || '3000', 10) || 3000,
        },
        deepLX: {
          enabled: deepLXCb.checked,
          url: deepLXUrlEl?.value || '',
          timeout: parseInt(deepLXTimeoutEl?.value || '3000', 10) || 3000,
        },
        deepseek: {
          enabled: deepseekCb.checked,
          endpoint: deepseekEndpointEl?.value || '',
          apiKey: deepseekKeyEl?.value || '',
          model: deepseekModelEl?.value || '',
          timeout: parseInt(deepseekTimeoutEl?.value || '3000', 10) || 3000,
        },
        opencode: {
          enabled: opencodeCb.checked,
          endpoint: opencodeEndpointEl?.value || '',
          apiKey: opencodeKeyEl?.value || '',
          model: opencodeModelEl?.value || '',
          timeout: parseInt(opencodeTimeoutEl?.value || '3000', 10) || 3000,
        },
      },
      hotkeys: {
        translateSel: parseHotkey(hk1El.dataset.hotkey || ''),
        openDialog: parseHotkey(hk2El.dataset.hotkey || ''),
      },
      translation: {
        sourceLang: config.translation.sourceLang,
        targetLang: config.translation.targetLang,
      },
    };

    onSave(newConfig);
    hideSettingsPanel();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  body.appendChild(actions);

  dialog.appendChild(header);
  dialog.appendChild(body);
  overlay.appendChild(dialog);
  root.appendChild(overlay);

  currentPanel = overlay;

  // 遮罩点击关闭
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      hideSettingsPanel();
    }
  });

  closeHandler = bindCloseEvents();
}

/**
 * 隐藏设置面板
 */
export function hideSettingsPanel(): void {
  if (recordingCleanup) {
    recordingCleanup();
    recordingCleanup = null;
  }
  if (closeHandler) {
    closeHandler();
    closeHandler = null;
  }
  if (currentPanel) {
    currentPanel.remove();
    currentPanel = null;
  }
}

// ==================== 辅助函数 ====================

/**
 * 创建带标签的复选框行
 */
function createCheckbox(id: string, label: string, checked: boolean, note?: string): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.className = 'tr-checkbox';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = `cb-${id}`;
  cb.checked = checked;

  const lbl = document.createElement('span');
  lbl.className = 'tr-checkbox-label';
  lbl.textContent = label;

  wrap.appendChild(cb);
  wrap.appendChild(lbl);

  if (note) {
    const noteEl = document.createElement('span');
    noteEl.className = 'tr-checkbox-note';
    noteEl.textContent = note;
    wrap.appendChild(noteEl);
  }

  return wrap;
}

/**
 * 创建文本输入包装器
 */
function createTextInput(id: string, label: string, value: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';

  const lbl = document.createElement('label');
  lbl.className = 'tr-settings-sublabel';
  lbl.textContent = label;
  lbl.htmlFor = id;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = 'tr-settings-input';
  input.value = value;
  input.placeholder = value || '';

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}

/**
 * 创建密码输入包装器
 */
function createPasswordInput(id: string, label: string, value: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';

  const lbl = document.createElement('label');
  lbl.className = 'tr-settings-sublabel';
  lbl.textContent = label;
  lbl.htmlFor = id;

  const input = document.createElement('input');
  input.type = 'password';
  input.id = id;
  input.className = 'tr-settings-input';
  input.value = value;
  input.placeholder = '输入 API Key';

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}

/**
 * 创建数字输入包装器
 */
function createNumberInput(id: string, label: string, value: number): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';

  const lbl = document.createElement('label');
  lbl.className = 'tr-settings-sublabel';
  lbl.textContent = label;
  lbl.htmlFor = id;

  const input = document.createElement('input');
  input.type = 'number';
  input.id = id;
  input.className = 'tr-settings-input';
  input.value = String(value);
  input.min = '100';
  input.max = '30000';
  input.step = '500';

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}

/**
 * 创建快捷键设置行
 */
function createHotkeyRow(label: string, hotkey: HotkeyDef, id: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';

  const lbl = document.createElement('div');
  lbl.className = 'tr-settings-label';
  lbl.textContent = label;

  const btn = document.createElement('button');
  btn.id = id;
  btn.className = 'tr-hotkey-record';
  btn.dataset.hotkey = JSON.stringify(hotkey);
  btn.textContent = formatHotkey(hotkey);

  const hint = document.createElement('div');
  hint.className = 'tr-hotkey-hint';
  hint.textContent = '点击按钮录制新快捷键，按 Escape 取消';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (recordingCleanup) {
      recordingCleanup();
      recordingCleanup = null;
    }

    btn.classList.add('tr-hotkey-recording');
    btn.textContent = '按快捷键...';

    const cleanup = recordHotkey((newHotkey) => {
      btn.classList.remove('tr-hotkey-recording');
      if (newHotkey) {
        btn.dataset.hotkey = JSON.stringify(newHotkey);
        btn.textContent = formatHotkey(newHotkey);
      } else {
        // 取消录制，恢复原有显示
        const prev = JSON.parse(btn.dataset.hotkey || '{}') as HotkeyDef;
        btn.textContent = formatHotkey(prev);
      }
      recordingCleanup = null;
    });

    recordingCleanup = cleanup;
  });

  wrap.appendChild(lbl);
  wrap.appendChild(btn);
  wrap.appendChild(hint);
  return wrap;
}

/**
 * 录制下一次按键作为快捷键
 * 通过 keydown+keyup 配合实现：修饰键不结束录制，等待组合键；
 * 释放单独的修饰键时记录为快捷键
 */
function recordHotkey(callback: (hotkey: HotkeyDef | null) => void): () => void {
  const MODIFIER_KEYS = ['Alt', 'Control', 'Shift', 'Meta'];
  let lastModifier: string | null = null;

  const onKeydown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      callback(null);
      cleanup();
      return;
    }

    if (MODIFIER_KEYS.includes(e.key)) {
      lastModifier = e.key;
      return;
    }

    // 非修饰键：记录完整组合键
    callback({
      key: e.key,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
    });
    cleanup();
  };

  const onKeyup = (e: KeyboardEvent) => {
    if (lastModifier && MODIFIER_KEYS.includes(e.key)) {
      callback({
        key: '',
        ctrl: e.key === 'Control',
        alt: e.key === 'Alt',
        shift: e.key === 'Shift',
        meta: e.key === 'Meta',
      });
      cleanup();
    }
  };

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('keyup', onKeyup, true);

  const cleanup = () => {
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('keyup', onKeyup, true);
  };

  return cleanup;
}

/**
 * 格式化快捷键为可读字符串
 */
function formatHotkey(hk: HotkeyDef): string {
  const parts: string[] = [];
  if (hk.ctrl) parts.push('Ctrl');
  if (hk.alt) parts.push('Alt');
  if (hk.shift) parts.push('Shift');
  if (hk.meta) parts.push('Meta');
  if (hk.key) {
    parts.push(hk.key.length === 1 ? hk.key.toUpperCase() : hk.key);
  }
  return parts.join('+') || '未设置';
}

/**
 * 从 JSON 字符串解析快捷键
 */
function parseHotkey(str: string): HotkeyDef {
  try {
    return JSON.parse(str) as HotkeyDef;
  } catch {
    return { key: '' };
  }
}

/**
 * 绑定 ESC 和外部点击关闭
 */
function bindCloseEvents(): () => void {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideSettingsPanel();
    }
  };

  const onDocClick = (e: MouseEvent) => {
    const host = getShadowHost();
    if (!host) return;
    const path = e.composedPath();
    if (!path.includes(host)) {
      hideSettingsPanel();
    }
  };

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('mousedown', onDocClick);

  return () => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('mousedown', onDocClick);
  };
}
