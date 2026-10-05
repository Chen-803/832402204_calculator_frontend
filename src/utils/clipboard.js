/**
 * clipboard.js —— 复制文本到剪贴板
 *
 * 仅服务于「复制结果」这类展示功能；复制的内容是后端返回的 resultText 原文，
 * 不涉及任何数值处理。
 */
export async function copyText(text) {
  const value = String(text ?? '');
  if (!value) {
    return false;
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      // 非安全上下文（http）下浏览器可能拒绝，继续走兜底方案
    }
  }
  return legacyCopy(value);
}

/** 兜底方案：临时 textarea + execCommand（仅在没有可用 Clipboard API 时使用） */
function legacyCopy(value) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return succeeded;
  } catch (error) {
    return false;
  }
}

export default copyText;
