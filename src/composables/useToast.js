/**
 * useToast.js —— 轻提示队列（模块级单例）
 *
 * 用于「已复制」「删除成功」「后端返回的错误」等短提示。
 * 相同文案重复触发时只刷新计时器，避免提示堆叠。
 */
import { ref } from 'vue';

/** 同时最多展示的提示条数 */
const MAX_VISIBLE = 3;
/** 默认展示时长（毫秒） */
const DEFAULT_DURATION = 2400;

const toasts = ref([]);
const timers = new Map();
let seed = 0;

function removeToast(id) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter((item) => item.id !== id);
}

function scheduleRemoval(id, duration) {
  const existing = timers.get(id);
  if (existing) {
    clearTimeout(existing);
  }
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      removeToast(id);
    }, duration),
  );
}

/**
 * 显示一条轻提示。
 *
 * @param {string} message 提示文案
 * @param {'info'|'success'|'error'} [type] 提示类型
 * @param {number} [duration] 展示时长（毫秒）
 * @returns {number|null} 提示 id
 */
function showToast(message, type = 'info', duration = DEFAULT_DURATION) {
  const text = String(message ?? '').trim();
  if (!text) {
    return null;
  }
  const duplicated = toasts.value.find((item) => item.message === text && item.type === type);
  if (duplicated) {
    scheduleRemoval(duplicated.id, duration);
    return duplicated.id;
  }
  seed += 1;
  const id = seed;
  toasts.value.push({ id, message: text, type });
  if (toasts.value.length > MAX_VISIBLE) {
    const overflow = toasts.value.slice(0, toasts.value.length - MAX_VISIBLE);
    overflow.forEach((item) => removeToast(item.id));
  }
  scheduleRemoval(id, duration);
  return id;
}

function toastSuccess(message, duration) {
  return showToast(message, 'success', duration);
}

function toastError(message, duration) {
  return showToast(message, 'error', duration);
}

function toastInfo(message, duration) {
  return showToast(message, 'info', duration);
}

export function useToast() {
  return { toasts, showToast, toastSuccess, toastError, toastInfo, removeToast };
}

export default useToast;
