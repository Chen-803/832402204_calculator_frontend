/**
 * @file app.js
 * @description 主流程编排：串联界面事件、后端接口与页面状态。
 *
 * 职责边界（严格遵守作业红线）：
 * - 前端**不计算任何表达式**，不使用 eval / Function / 自研求值器；
 * - 所有结果字符串都直接取自后端 `POST /api/calculate` 的返回值；
 * - localStorage 只保存主题与界面偏好，历史数据每次都重新向后端查询。
 *
 * @author 陈俊洁 (832402204)
 */

import {
  DEFAULT_PAGE_SIZE,
  PREVIEW_DEBOUNCE_MS,
  SEARCH_DEBOUNCE_MS,
  SUPPORTED_THEMES,
  THEME_DARK,
  THEME_LIGHT,
  getRuntimeConfig,
  readUiPrefs,
  saveTheme,
  setApiBase,
  writeUiPrefs
} from './config.js';
import { api, describeError, isAbortError } from './api.js';
import * as ui from './ui.js';

/**
 * 显示字符 -> 后端字符的归一化映射表。
 *
 * 说明：这只是「字符替换」，不是表达式求值。
 * 例如界面显示 `×`，发送给后端前统一转成 `*`。
 * @type {Readonly<Record<string, string>>}
 */
const WIRE_NORMALIZATION_MAP = Object.freeze({
  '×': '*', '✕': '*', '＊': '*', '⨯': '*',
  '÷': '/', '／': '/',
  '−': '-', '–': '-', '—': '-', '－': '-',
  '（': '(', '）': ')', '＋': '+', '＝': '=', '．': '.',
  '＾': '^', '！': '!', '％': '%',
  'π': 'pi', 'Π': 'pi',
  '√': 'sqrt', '∛': 'cbrt',
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9'
});

/** 应用状态（唯一数据源）。 */
const state = {
  /** @type {string} 最近一次成功计算的结果（后端返回） */
  result: null,
  /** @type {string} 最近一次成功计算的显示结果（后端 display_result） */
  displayResult: '',
  /** @type {object|null} 最近一次 /api/calculate 的完整响应 */
  lastPayload: null,
  /** @type {'light'|'dark'} 当前主题 */
  theme: THEME_LIGHT,
  /** @type {string} 当前 API 基地址 */
  apiBase: '',
  /** @type {{online: boolean, status: string, service: string, version: string, time: string}} 后端状态 */
  backend: { online: false, status: 'unknown', service: '', version: '', time: '' },
  /** @type {{items: Array<object>, total: number, page: number, page_size: number, total_pages: number}} 历史分页数据 */
  history: { items: [], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE, total_pages: 1 },
  /** @type {{keyword: string, start_date: string, end_date: string, favorite_only: boolean, sort: string}} 历史筛选条件 */
  filters: { keyword: '', start_date: '', end_date: '', favorite_only: false, sort: 'desc' },
  /** @type {object|null} 统计信息 */
  statistics: null,
  /** @type {object|null} 科学函数元数据 */
  meta: null,
  /** @type {boolean} 是否正在执行一次持久化计算 */
  busy: false,
  /** @type {boolean} 是否已经提示过「后端未连接」 */
  offlineNotified: false
};

/** @type {Record<string, HTMLElement>} DOM 引用 */
let refs = {};

/** @type {number|null} 实时预览防抖定时器 */
let previewTimer = null;
/** @type {AbortController|null} 实时预览请求的取消控制器 */
let previewAbort = null;
/** @type {number} 清空历史的二次确认剩余毫秒 */
let clearAllConfirmTimer = null;
/** @type {number|null} 输入框最近一次的光标位置（用户点击按键后输入框会失焦，需要记住它） */
let rememberedCaret = null;

/* -------------------------------------------------------------------------- */
/* 工具函数                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 把界面表达式归一化成后端可识别的字符集（纯字符替换 + 去除空白，不含任何计算）。
 * @param {string} text 界面上的表达式
 * @returns {string} 发送给后端的表达式
 */
export function normalizeExpressionForApi(text) {
  if (typeof text !== 'string' || text === '') return '';
  const chars = Array.from(text);
  const buffer = [];
  chars.forEach((char) => {
    if (/\s/.test(char)) return;
    const mapped = Object.prototype.hasOwnProperty.call(WIRE_NORMALIZATION_MAP, char)
      ? WIRE_NORMALIZATION_MAP[char]
      : char;
    buffer.push(mapped);
  });
  return buffer.join('');
}

/**
 * 读取表达式输入框当前内容。
 * @returns {string} 输入框内容
 */
function readExpressionInput() {
  return refs.expressionInput ? refs.expressionInput.value : '';
}

/**
 * 从后端错误中提取需要展示的信息。
 * @param {unknown} error 异常
 * @returns {{message: string, level: 'warning'|'error', kind: string, errorCode: string, expression: string}} 展示信息
 */
function describe(error) {
  return describeError(error);
}

/**
 * 根据错误更新后端连接状态（仅在网络类错误时）。
 * @param {unknown} error 异常
 * @returns {void}
 */
function markBackendFromError(error) {
  if (isAbortError(error)) return;
  const info = describe(error);
  if (info.kind === 'network' || info.kind === 'timeout') {
    state.backend = Object.assign({}, state.backend, { online: false, status: info.kind });
    ui.renderBackendStatus(refs, ui.BACKEND_STATE.OFFLINE, '后端未连接（无法连接后端服务，请确认后端已启动）');
  }
}

/**
 * 是否应该弹出「无法连接后端服务」提示（同一状态只提示一次，避免刷屏）。
 * @param {unknown} error 异常
 * @returns {boolean} 是否提示
 */
function shouldNotifyOffline(error) {
  const info = describe(error);
  const connectionIssue = info.kind === 'network' || info.kind === 'timeout';
  if (!connectionIssue) return true;
  if (state.offlineNotified) return false;
  state.offlineNotified = true;
  return true;
}

/* -------------------------------------------------------------------------- */
/* 主题                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 设置主题并保存偏好（localStorage 仅保存主题）。
 * @param {'light'|'dark'} theme 目标主题
 * @returns {'light'|'dark'} 实际生效主题
 */
function setTheme(theme) {
  const next = THEME_DARK === theme ? THEME_DARK : THEME_LIGHT;
  state.theme = ui.applyTheme(refs, next);
  saveTheme(state.theme);
  return state.theme;
}

/**
 * 在明 / 暗主题之间切换。
 * @returns {'light'|'dark'} 切换后的主题
 */
function toggleTheme() {
  const next = state.theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  const applied = setTheme(next);
  ui.toast(refs, applied === THEME_DARK ? '已切换到深色主题' : '已切换到浅色主题', { type: 'info', duration: 1800 });
  return applied;
}

/* -------------------------------------------------------------------------- */
/* 表达式输入与实时预览                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 把输入框内容同步到显示区，并安排一次实时预览。
 * @param {{preview?: boolean}} [options] 选项
 * @returns {void}
 */
function handleExpressionChanged(options) {
  const opts = options || {};
  const value = readExpressionInput();
  ui.renderDisplayExpression(refs, value);
  ui.clearError(refs);
  if (opts.preview === false) return;

  if (previewTimer) clearTimeout(previewTimer);
  const wire = normalizeExpressionForApi(value);
  if (wire === '') {
    ui.clearPreview(refs);
    return;
  }
  previewTimer = setTimeout(() => {
    previewTimer = null;
    void runPreview(wire);
  }, PREVIEW_DEBOUNCE_MS);
}

/**
 * 执行一次「只试算不写入历史」的实时预览；失败时静默处理，不打扰用户。
 * @param {string} wireExpression 已归一化的表达式
 * @returns {Promise<void>} 无返回
 */
async function runPreview(wireExpression) {
  if (previewAbort) previewAbort.abort();
  const controller = new AbortController();
  previewAbort = controller;
  try {
    const payload = await api.calculate(wireExpression, false, controller.signal);
    if (controller.signal.aborted) return;
    ui.renderPreview(refs, payload && payload.display_result !== undefined ? payload.display_result : '');
  } catch (error) {
    if (isAbortError(error)) return;
    ui.clearPreview(refs); // 预览失败不显示错误、不弹 Toast
  } finally {
    if (previewAbort === controller) previewAbort = null;
  }
}

/**
 * 记录输入框光标位置。
 * @param {number} index 光标位置
 * @returns {void}
 */
function rememberCaret(index) {
  if (typeof index === 'number' && index >= 0) rememberedCaret = index;
}

/**
 * 计算插入位置。
 *
 * 输入框获得焦点时使用实时光标；否则回退到最近一次记录的光标；再否则追加到末尾。
 * 这样可以避免 `?expr=` 预填（此时 `selectionStart` 为 0）后点击按键把内容插到最前面。
 * @param {HTMLInputElement} input 表达式输入框
 * @returns {{start: number, end: number}} 插入区间
 */
function resolveInsertRange(input) {
  if (document.activeElement === input && typeof input.selectionStart === 'number') {
    const start = input.selectionStart;
    const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
    return { start, end };
  }
  const fallback = input.value.length;
  if (typeof rememberedCaret === 'number' && rememberedCaret >= 0 && rememberedCaret <= fallback) {
    return { start: rememberedCaret, end: rememberedCaret };
  }
  return { start: fallback, end: fallback };
}

/**
 * 跟踪输入框光标（focus / click / keyup / select）。
 * @returns {void}
 */
function trackExpressionCaret() {
  const input = refs.expressionInput;
  if (!input) return;
  const remember = () => {
    if (document.activeElement === input) rememberCaret(input.selectionStart);
  };
  ['focus', 'click', 'keyup', 'select'].forEach((type) => input.addEventListener(type, remember));
}

/**
 * 在输入框光标处插入片段（纯字符串编辑，不涉及计算）。
 * @param {string} fragment 待插入片段
 * @returns {void}
 */
function insertFragment(fragment) {
  const input = refs.expressionInput;
  if (!input || typeof fragment !== 'string' || fragment === '') return;

  const range = resolveInsertRange(input);
  input.value = `${input.value.slice(0, range.start)}${fragment}${input.value.slice(range.end)}`;

  const caret = range.start + fragment.length;
  rememberCaret(caret);
  try {
    input.focus();
    input.setSelectionRange(caret, caret);
  } catch {
    /* 忽略：不支持选择范围时不影响功能 */
  }
  handleExpressionChanged();
}

/**
 * 删除输入框光标前一个字符（或当前选区）。
 * @returns {void}
 */
function backspaceExpression() {
  const input = refs.expressionInput;
  if (!input) return;

  const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
  const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;

  if (start === end) {
    if (start === 0) return;
    // 按「字符」而不是 UTF-16 码元回退，避免把全角字符 / emoji 切坏
    const before = Array.from(input.value.slice(0, start));
    const after = input.value.slice(end);
    before.pop();
    const beforeText = before.join('');
    input.value = `${beforeText}${after}`;
    rememberCaret(beforeText.length);
    try {
      input.focus();
      input.setSelectionRange(beforeText.length, beforeText.length);
    } catch {
      /* 忽略 */
    }
  } else {
    input.value = `${input.value.slice(0, start)}${input.value.slice(end)}`;
    rememberCaret(start);
    try {
      input.focus();
      input.setSelectionRange(start, start);
    } catch {
      /* 忽略 */
    }
  }
  handleExpressionChanged();
}

/**
 * 清空输入与结果展示。
 * @returns {void}
 */
function clearAllInput() {
  const input = refs.expressionInput;
  if (input) {
    input.value = '';
    rememberCaret(0);
    try {
      input.focus();
      input.setSelectionRange(0, 0);
    } catch {
      /* 忽略 */
    }
  }
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = null;
  ui.clearError(refs);
  ui.clearPreview(refs);
  ui.renderDisplayExpression(refs, '');
  if (refs.displayResult) {
    refs.displayResult.textContent = '—';
    delete refs.displayResult.dataset.state;
  }
}

/* -------------------------------------------------------------------------- */
/* 计算                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 调用后端计算表达式（前端只负责发请求与展示返回值）。
 * @param {string} [expression] 表达式；省略时取输入框内容
 * @param {{persist?: boolean}} [options] 选项，`persist` 默认 true
 * @returns {Promise<object|null>} 后端响应体；失败返回 null
 */
async function calculate(expression, options) {
  const opts = options || {};
  const persist = opts.persist !== false;
  const rawExpression = typeof expression === 'string' ? expression : readExpressionInput();
  const wireExpression = normalizeExpressionForApi(rawExpression);

  if (wireExpression === '') {
    if (persist) {
      ui.renderError(refs, '表达式为空，请先输入要计算的内容', ui.ERROR_LEVEL.ERROR, rawExpression);
      ui.toast(refs, '表达式为空，请先输入要计算的内容', { type: 'warning' });
    }
    return null;
  }

  if (refs.expressionInput && typeof expression === 'string' && refs.expressionInput.value !== expression) {
    refs.expressionInput.value = expression;
    ui.renderDisplayExpression(refs, expression);
  }

  if (persist) {
    state.busy = true;
    ui.setBusy(refs, true);
    ui.clearError(refs);
    ui.clearPreview(refs);
  }

  try {
    const payload = await api.calculate(wireExpression, persist);
    if (persist) {
      state.lastPayload = payload;
      state.result = payload ? payload.result : null;
      state.displayResult = payload && payload.display_result !== undefined ? String(payload.display_result) : '';
      ui.renderCalculation(refs, payload, rawExpression);
      ui.toast(
        refs,
        `计算成功：${(payload && payload.expression) || wireExpression} = ${state.displayResult}`,
        { type: 'success' }
      );
      // 历史与统计必须重新向后端查询，绝不在前端数组里自行增删
      await Promise.all([refreshHistory(), refreshStatistics()]);
    } else {
      ui.renderPreview(refs, payload && payload.display_result !== undefined ? payload.display_result : '');
    }
    return payload;
  } catch (error) {
    if (isAbortError(error)) return null;
    const info = describe(error);

    if (persist) {
      ui.renderError(refs, info.message, info.level, info.expression || rawExpression);
      ui.toast(refs, info.message, {
        type: info.level === ui.ERROR_LEVEL.WARNING ? 'warning' : 'error',
        duration: 4600
      });
    } else {
      ui.clearPreview(refs);
    }
    markBackendFromError(error);
    return null;
  } finally {
    if (persist) {
      state.busy = false;
      ui.setBusy(refs, false);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 后端状态与元数据                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 健康检查并刷新顶部状态栏。
 * @returns {Promise<object|null>} 健康数据；失败返回 null
 */
async function checkHealth() {
  ui.renderBackendStatus(refs, ui.BACKEND_STATE.UNKNOWN, '后端状态检测中…');
  try {
    const data = await api.health();
    state.backend = {
      online: true,
      status: (data && data.status) || 'ok',
      service: (data && data.service) || 'calculator-backend',
      version: (data && data.version) || '',
      time: (data && data.time) || ''
    };
    state.offlineNotified = false;
    ui.renderBackendStatus(
      refs,
      ui.BACKEND_STATE.ONLINE,
      `后端已连接 · ${state.backend.service} v${state.backend.version}`
    );
    return data;
  } catch (error) {
    const info = describe(error);
    state.backend = { online: false, status: info.kind, service: '', version: '', time: '' };
    ui.renderBackendStatus(refs, ui.BACKEND_STATE.OFFLINE, '后端未连接（无法连接后端服务，请确认后端已启动）');
    if (!state.offlineNotified) {
      state.offlineNotified = true;
      ui.toast(refs, '无法连接后端服务，请确认后端已启动', { type: 'error', duration: 5200 });
    }
    return null;
  }
}

/**
 * 拉取科学函数元数据并动态渲染科学面板；失败则降级隐藏动态函数区。
 * @returns {Promise<object|null>} 元数据；失败返回 null
 */
async function loadFunctionMeta() {
  try {
    const data = await api.getMeta();
    state.meta = data;
    ui.renderFunctionPanel(refs, data);
    return data;
  } catch (error) {
    state.meta = null;
    ui.renderFunctionPanelUnavailable(refs, describe(error).message);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 历史                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 按当前筛选条件与页码向后端重新查询历史（删除 / 收藏后也必须走这里）。
 * @returns {Promise<object|null>} 历史分页数据；失败返回 null
 */
async function refreshHistory() {
  const query = {
    page: state.history.page,
    page_size: state.history.page_size,
    keyword: state.filters.keyword,
    start_date: state.filters.start_date,
    end_date: state.filters.end_date,
    favorite_only: state.filters.favorite_only,
    sort: state.filters.sort
  };

  ui.setHistoryLoading(refs, true);
  try {
    const data = await api.getHistory(query);
    const payload = data || {};
    state.history = {
      items: Array.isArray(payload.items) ? payload.items : [],
      total: typeof payload.total === 'number' ? payload.total : 0,
      page: typeof payload.page === 'number' ? payload.page : state.history.page,
      page_size: typeof payload.page_size === 'number' ? payload.page_size : state.history.page_size,
      total_pages: typeof payload.total_pages === 'number' ? payload.total_pages : 1
    };
    ui.renderHistory(refs, state.history, { keyword: state.filters.keyword });
    ui.renderPager(refs, state.history);
    return state.history;
  } catch (error) {
    const info = describe(error);
    ui.renderHistoryError(refs, info.message);
    ui.renderPager(refs, state.history);
    if (shouldNotifyOffline(error)) {
      ui.toast(refs, `历史加载失败：${info.message}`, { type: 'error', duration: 4200 });
    }
    markBackendFromError(error);
    return null;
  } finally {
    ui.setHistoryLoading(refs, false);
  }
}

/**
 * 拉取统计信息。
 * @returns {Promise<object|null>} 统计数据；失败返回 null
 */
async function refreshStatistics() {
  try {
    const data = await api.getStatistics();
    state.statistics = data;
    ui.renderStatistics(refs, data);
    return data;
  } catch (error) {
    const info = describe(error);
    ui.renderStatisticsError(refs, info.message);
    if (shouldNotifyOffline(error)) {
      ui.toast(refs, `统计加载失败：${info.message}`, { type: 'error', duration: 4200 });
    }
    markBackendFromError(error);
    return null;
  }
}

/**
 * 删除一条历史；删除后必须重新向后端查询列表与统计。
 * @param {string|number} id 记录 ID
 * @returns {Promise<void>} 无返回
 */
async function deleteHistory(id) {
  if (id === undefined || id === null || id === '') return;
  try {
    await api.deleteHistoryItem(id);
    ui.toast(refs, `已删除 #${id}`, { type: 'success' });
  } catch (error) {
    const info = describe(error);
    ui.toast(refs, `删除失败：${info.message}`, { type: 'error', duration: 4200 });
    markBackendFromError(error);
    return;
  }
  // 若当前页删空且不是第一页，则回退一页再查询
  if (state.history.items.length === 1 && state.history.page > 1) {
    state.history.page -= 1;
  }
  await refreshHistory();
  await refreshStatistics();
}

/**
 * 切换收藏状态；之后重新向后端查询。
 * @param {string|number} id 记录 ID
 * @param {boolean} currentFavorite 当前是否已收藏
 * @returns {Promise<void>} 无返回
 */
async function toggleFavorite(id, currentFavorite) {
  if (id === undefined || id === null || id === '') return;
  const target = !currentFavorite;
  try {
    await api.setFavorite(id, target);
    ui.toast(refs, target ? `已收藏 #${id}` : `已取消收藏 #${id}`, { type: 'success' });
  } catch (error) {
    const info = describe(error);
    ui.toast(refs, `收藏操作失败：${info.message}`, { type: 'error', duration: 4200 });
    markBackendFromError(error);
    return;
  }
  await refreshHistory();
  await refreshStatistics();
}

/**
 * 清空全部历史（两次点击确认，避免使用阻塞式原生 confirm 打断自动化截图）。
 * @param {HTMLElement} button 触发按钮
 * @returns {Promise<void>} 无返回
 */
async function clearAllHistory(button) {
  const armed = button && button.dataset.armed === 'true';
  if (!armed) {
    if (button) {
      button.dataset.armed = 'true';
      button.dataset.originalText = button.textContent || '清空全部';
      button.textContent = '再次点击确认清空';
      button.classList.add('btn--armed');
    }
    ui.toast(refs, '危险操作：再次点击「清空全部」按钮才会真正删除', { type: 'warning', duration: 4000 });
    if (clearAllConfirmTimer) clearTimeout(clearAllConfirmTimer);
    clearAllConfirmTimer = setTimeout(() => {
      if (button) {
        button.dataset.armed = 'false';
        button.textContent = button.dataset.originalText || '清空全部';
        button.classList.remove('btn--armed');
      }
      clearAllConfirmTimer = null;
    }, 5000);
    return;
  }

  if (clearAllConfirmTimer) clearTimeout(clearAllConfirmTimer);
  clearAllConfirmTimer = null;
  if (button) {
    button.dataset.armed = 'false';
    button.textContent = button.dataset.originalText || '清空全部';
    button.classList.remove('btn--armed');
  }

  try {
    const data = await api.clearHistory();
    const deleted = data && data.deleted !== undefined ? data.deleted : '';
    ui.toast(refs, deleted === '' ? '已清空计算历史' : `已清空 ${deleted} 条计算历史`, { type: 'success' });
  } catch (error) {
    const info = describe(error);
    ui.toast(refs, `清空失败：${info.message}`, { type: 'error', duration: 4200 });
    markBackendFromError(error);
    return;
  }
  state.history.page = 1;
  await refreshHistory();
  await refreshStatistics();
}

/**
 * 把历史里的表达式回填到输入框。
 * @param {string} id 记录 ID（仅用于提示）
 * @param {string} expression 表达式
 * @returns {void}
 */
function refillExpression(id, expression) {
  if (typeof expression !== 'string' || expression === '') {
    ui.toast(refs, '该记录没有可回填的表达式', { type: 'warning' });
    return;
  }
  if (refs.expressionInput) refs.expressionInput.value = expression;
  handleExpressionChanged();
  ui.toast(refs, `已回填 #${id} 的表达式：${expression}`, { type: 'info', duration: 2400 });
}

/* -------------------------------------------------------------------------- */
/* 复制结果                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 复制当前结果到剪贴板；失败时降级提示（并选中结果文本便于手动复制）。
 * @returns {Promise<void>} 无返回
 */
async function copyResult() {
  const holder = refs.displayResult;
  const text = holder ? (holder.textContent || '').trim() : '';
  if (!text || text === '—') {
    ui.toast(refs, '当前没有可复制的结果', { type: 'warning' });
    return;
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      ui.toast(refs, `已复制结果：${text}`, { type: 'success' });
      return;
    }
    throw new Error('clipboard API unavailable');
  } catch {
    if (selectElementText(holder)) {
      ui.toast(refs, '剪贴板不可用（可能非 HTTPS 环境），已选中结果文本，请按 Ctrl/Cmd + C 复制', {
        type: 'warning',
        duration: 5200
      });
      return;
    }
    ui.toast(refs, '复制失败：浏览器不允许访问剪贴板，请手动选择结果文本', { type: 'error', duration: 5200 });
  }
}

/**
 * 尝试选中元素内的文本（复制失败时的降级方案）。
 * @param {HTMLElement|null} element 目标元素
 * @returns {boolean} 是否选中成功
 */
function selectElementText(element) {
  if (!element) return false;
  try {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* 筛选与分页                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 变更关键字筛选（回到第一页后重新查询）。
 * @param {string} keyword 关键字
 * @returns {Promise<void>} 无返回
 */
async function applyKeyword(keyword) {
  state.filters.keyword = typeof keyword === 'string' ? keyword.trim() : '';
  state.history.page = 1;
  await refreshHistory();
}

/**
 * 变更日期 / 仅收藏筛选。
 * @param {{startDate: string, endDate: string, favoriteOnly: boolean}} filters 筛选值
 * @returns {Promise<void>} 无返回
 */
async function applyFilters(filters) {
  state.filters.start_date = filters.startDate || '';
  state.filters.end_date = filters.endDate || '';
  state.filters.favorite_only = Boolean(filters.favoriteOnly);
  writeUiPrefs({ favoriteOnly: state.filters.favorite_only });
  state.history.page = 1;
  await refreshHistory();
}

/**
 * 上一页。
 * @returns {Promise<void>} 无返回
 */
async function goPrevPage() {
  if (state.history.page <= 1) return;
  state.history.page -= 1;
  await refreshHistory();
}

/**
 * 下一页。
 * @returns {Promise<void>} 无返回
 */
async function goNextPage() {
  if (state.history.page >= state.history.total_pages) return;
  state.history.page += 1;
  await refreshHistory();
}

/* -------------------------------------------------------------------------- */
/* 初始化                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 绑定所有界面事件。
 * @returns {void}
 */
function bindEvents() {
  ui.bindKeypad(refs, (action) => {
    if (action.type === 'insert') {
      insertFragment(action.value);
      return;
    }
    if (action.name === 'equals') void calculate(readExpressionInput(), { persist: true });
    else if (action.name === 'clear') clearAllInput();
    else if (action.name === 'backspace') backspaceExpression();
  });

  ui.bindFunctionPanel(refs, (fragment) => insertFragment(fragment));

  ui.bindExpressionInput(refs, () => handleExpressionChanged());
  trackExpressionCaret();

  ui.bindKeyboard(refs, {
    onSubmit: () => void calculate(readExpressionInput(), { persist: true }),
    onEscape: () => clearAllInput(),
    onBackspace: () => backspaceExpression(),
    onInsert: (fragment) => insertFragment(fragment),
    onToggleTheme: () => toggleTheme()
  });

  ui.bindHistory(refs, {
    onDelete: (id) => void deleteHistory(id),
    onFavorite: (id, current) => void toggleFavorite(id, current),
    onRefill: (id, expression) => refillExpression(id, expression)
  });

  ui.bindHistoryControls(refs, {
    searchDebounce: SEARCH_DEBOUNCE_MS,
    onSearchInput: (keyword) => void applyKeyword(keyword),
    onFilterChange: (filters) => void applyFilters(filters),
    onClearAll: (button) => void clearAllHistory(button)
  });

  ui.bindPager(refs, {
    onPrev: () => void goPrevPage(),
    onNext: () => void goNextPage()
  });

  ui.bindHeaderActions(refs, {
    onToggleTheme: () => toggleTheme(),
    onCopy: () => void copyResult()
  });
}

/**
 * 应用 URL 参数中的初始状态（主题、表达式预填）。
 * @param {ReturnType<typeof getRuntimeConfig>} config 运行期配置
 * @returns {void}
 */
function applyInitialConfig(config) {
  ui.renderApiBase(refs, config.apiBase);

  if (refs.historyFavoriteOnly) refs.historyFavoriteOnly.checked = state.filters.favorite_only;

  if (config.expression) {
    if (refs.expressionInput) refs.expressionInput.value = config.expression;
    ui.renderDisplayExpression(refs, config.expression);
  }
}

/**
 * 启动应用。
 * @returns {Promise<void>} 无返回
 */
async function bootstrap() {
  refs = ui.createRefs();

  const config = getRuntimeConfig();
  state.apiBase = config.apiBase;
  state.theme = ui.applyTheme(refs, config.theme);
  if (config.themeFromQuery) saveTheme(state.theme);

  const prefs = readUiPrefs();
  state.filters.favorite_only = Boolean(prefs.favoriteOnly);
  state.history.page_size = typeof prefs.pageSize === 'number' && prefs.pageSize > 0
    ? prefs.pageSize
    : DEFAULT_PAGE_SIZE;

  applyInitialConfig(config);
  bindEvents();

  // 页面加载即检测后端、拉取函数元数据、历史与统计
  const health = await checkHealth();
  if (health) await loadFunctionMeta();
  else ui.renderFunctionPanelUnavailable(refs, '后端未连接');

  await Promise.all([refreshHistory(), refreshStatistics()]);

  // ?expr=1%2B2*3 打开页面时预填并自动计算一次（persist=true，会写入历史）
  if (config.autoCalculate) {
    await calculate(config.expression, { persist: true });
  }

  document.body.dataset.ready = 'true';
}

/* -------------------------------------------------------------------------- */
/* 暴露给自动化脚本的编排接口                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 返回当前状态快照（只读用途）。
 * @returns {object} 状态快照
 */
function getState() {
  return {
    expression: readExpressionInput(),
    wireExpression: normalizeExpressionForApi(readExpressionInput()),
    result: state.result,
    displayResult: state.displayResult,
    lastPayload: state.lastPayload,
    theme: state.theme,
    apiBase: state.apiBase,
    backend: Object.assign({}, state.backend),
    history: {
      items: state.history.items.slice(),
      total: state.history.total,
      page: state.history.page,
      page_size: state.history.page_size,
      total_pages: state.history.total_pages
    },
    filters: Object.assign({}, state.filters),
    statistics: state.statistics,
    meta: state.meta,
    busy: state.busy
  };
}

/**
 * 暴露给自动化 / 调试脚本的编排接口。
 * @type {{calculate: Function, refreshHistory: Function, refreshStatistics: Function, setTheme: Function, getState: Function, checkHealth: Function, normalizeExpressionForApi: Function, setApiBase: Function}}
 */
const calculatorApp = {
  calculate: (expression, options) => calculate(expression, options),
  refreshHistory: () => refreshHistory(),
  refreshStatistics: () => refreshStatistics(),
  setTheme: (theme) => (SUPPORTED_THEMES.includes(theme) ? setTheme(theme) : state.theme),
  getState: () => getState(),
  checkHealth: () => checkHealth(),
  normalizeExpressionForApi: (text) => normalizeExpressionForApi(text),
  setApiBase: (apiBase) => {
    state.apiBase = setApiBase(apiBase);
    ui.renderApiBase(refs, state.apiBase);
    return state.apiBase;
  }
};

window.calculatorApp = calculatorApp;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void bootstrap();
  }, { once: true });
} else {
  void bootstrap();
}
