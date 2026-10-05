/**
 * useKeyboard.js —— 全局键盘快捷键
 *
 * 支持：0-9 . + - * / ( ) ^ ! %、Enter 计算、Backspace 退格、Esc 清空、Ctrl+H 显示/隐藏历史。
 * 约束：
 * 1. 在输入框 / 文本域内打字时不拦截字符键（交给浏览器原生行为，避免重复追加）；
 * 2. 输入框内仍支持 Enter（计算）、Esc（清空 / 失焦）与 Ctrl+H；
 * 3. 带 Ctrl / Meta / Alt 的组合键一律不拦截，避免影响复制粘贴等系统快捷键。
 */
import { onBeforeUnmount, onMounted } from 'vue';

/** 字符键 → 追加到表达式的符号（内部统一使用 × ÷ 显示） */
const CHAR_KEY_MAP = {
  '.': '.',
  '+': '+',
  '-': '-',
  '*': '×',
  x: '×',
  X: '×',
  '/': '÷',
  '(': '(',
  ')': ')',
  '^': '^',
  '!': '!',
  '%': '%',
  // 后端契约里的常量名是 pi（π 不在后端归一化字符表内），因此这里追加 pi
  p: 'pi',
};

const EDITABLE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

function isEditableTarget(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  return EDITABLE_TAGS.includes(target.tagName);
}

/**
 * 绑定键盘快捷键。
 *
 * @param {object} handlers
 * @param {(token: string) => void} handlers.onInput        追加符号
 * @param {() => void} handlers.onCalculate                 计算
 * @param {() => void} handlers.onBackspace                 退格
 * @param {() => void} handlers.onClear                     清空
 * @param {() => void} handlers.onToggleHistory             显示/隐藏历史
 */
export function useKeyboard(handlers = {}) {
  const { onInput, onCalculate, onBackspace, onClear, onToggleHistory } = handlers;

  function handleKeydown(event) {
    const target = event.target;
    const editable = isEditableTarget(target);
    const key = typeof event.key === 'string' ? event.key : '';

    // Ctrl+H / Cmd+H：显示 / 隐藏历史面板
    if ((event.ctrlKey || event.metaKey) && !event.altKey && key.toLowerCase() === 'h') {
      event.preventDefault();
      if (typeof onToggleHistory === 'function') {
        onToggleHistory();
      }
      return;
    }

    // 其它修饰键组合不拦截
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    // 中文输入法组字过程中不拦截
    if (event.isComposing) {
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();
      if (typeof onCalculate === 'function') {
        onCalculate();
      }
      return;
    }

    if (key === 'Escape') {
      // 在表达式输入框以外的输入框内按 Esc 只做失焦，避免误清空
      if (editable && target.getAttribute('data-testid') !== 'expression-input') {
        target.blur();
        return;
      }
      event.preventDefault();
      if (typeof onClear === 'function') {
        onClear();
      }
      return;
    }

    if (editable) {
      return;
    }

    if (key === 'Backspace') {
      event.preventDefault();
      if (typeof onBackspace === 'function') {
        onBackspace();
      }
      return;
    }

    const token = /^[0-9]$/.test(key) ? key : CHAR_KEY_MAP[key];
    if (token) {
      event.preventDefault();
      if (typeof onInput === 'function') {
        onInput(token);
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  return { handleKeydown };
}

export default useKeyboard;
