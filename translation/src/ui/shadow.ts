/**
 * Shadow DOM 宿主管理器
 * 所有 UI 元素都挂载到同一个 Shadow Root 下，实现 CSS 隔离
 */

import styles from './styles.css?style';

let shadowRoot: ShadowRoot | null = null;
let hostDiv: HTMLDivElement | null = null;

/**
 * 获取 Shadow Root，首次调用时创建宿主 div 并附加样式
 */
export function getShadowRoot(): ShadowRoot {
  if (shadowRoot) {
    return shadowRoot;
  }

  hostDiv = document.createElement('div');
  hostDiv.className = 'tr-host';
  document.body.appendChild(hostDiv);

  shadowRoot = hostDiv.attachShadow({ mode: 'open' });

  // 注入样式表
  if (styles instanceof HTMLStyleElement) {
    shadowRoot.appendChild(styles);
  } else {
    // 兜底：如果 vite-plugin-monkey 的 ?style 没有返回 HTMLStyleElement，
    // 手动创建 style 标签并写入 CSS 文本
    const styleEl = document.createElement('style');
    // styles 在 build 时会被 vite-plugin-monkey 处理为 HTMLStyleElement，
    // dev 模式下也可能为字符串，这里做兼容处理
    styleEl.textContent = typeof styles === 'string' ? styles : '';
    shadowRoot.appendChild(styleEl);
  }

  return shadowRoot;
}

/**
 * 获取 Shadow Host 元素（用于判断点击是否在 UI 内）
 */
export function getShadowHost(): HTMLDivElement | null {
  return hostDiv;
}
