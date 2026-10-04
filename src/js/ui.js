/**
 * @file ui.js
 * @description 视图层：DOM 引用、渲染、主题、Toast、键盘与按键事件绑定。
 *
 * 职责边界（严格遵守作业红线）：
 * - 本文件只做「显示」与「输入编辑」，不计算任何表达式；
 * - 界面上的结果文本一律来自 app.js 传入的后端响应；
 * - 绝不在前端做字符串求值（无 eval / Function / 自研求值器）。
 *
 * @author 陈俊洁 (832402204)
 */

/** 错误提示级别样式。 */
export const ERROR_LEVEL = Object.freeze({ ERROR: 'error', WARNING: 'warning' });

/** 后端连接状态。 */
export const BACKEND_STATE = Object.freeze({ ONLINE: 'online', OFFLINE: 'offline', UNKNOWN: 'unknown' });

/** 键盘（焦点不在输入框时）到输入片段的映射表：只做字符映射，不做任何计算。 */
const KEY_TO_FRAGMENT = Object.freeze({
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '.': '.', ',': '.',
  '+': '+', '-': '-', '*': '×', '/': '÷', 'x': '×', 'X': '×',
  '(': '(', ')': ')', '^': '^', '!': '!', '%': '%'
});

/**
 * 采集页面上所有需要操作的 DOM 节点。
 * @param {Document|Element} [root] 查询根节点
 * @returns {Record<string, HTMLElement>} data-testid -> 元素
 */
export function createRefs(root) {
  const scope = root || document;
  /**
   * @param {string} id data-testid 值
   * @returns {HTMLElement} 命中的元素
   */
  const byTestId = (id) => scope.querySelector(`[data-testid="${id}"]`);

  return {
    // 显示区
    displayExpression: byTestId('display-expression'),
    displayResult: byTestId('display-result'),
    displayPreview: byTestId('display-preview'),
    displayError: byTestId('display-error'),
    // 输入与按键
    expressionInput: byTestId('expression-input'),
    keypad: byTestId('keypad'),
    sciPanel: byTestId('sci-panel'),
    sciFnList: byTestId('sci-fn-list'),
    sciPanelHint: byTestId('sci-panel-hint'),
    // 历史区
    historyList: byTestId('history-list'),
    historySearch: byTestId('history-search'),
    historyStartDate: byTestId('history-start-date'),
    historyEndDate: byTestId('history-end-date'),
    historyFavoriteOnly: byTestId('history-favorite-only'),
    historyClearAll: byTestId('history-clear-all'),
    historyPagePrev: byTestId('history-page-prev'),
    historyPageNext: byTestId('history-page-next'),
    historyPageInfo: byTestId('history-page-info'),
    // 统计区
    statistics: byTestId('statistics'),
    statTotal: byTestId('stat-total'),
    statToday: byTestId('stat-today'),
    statFavorite: byTestId('stat-favorite'),
    statOperator: byTestId('stat-operator'),
    statDistribution: byTestId('stat-distribution'),
    statFirst: byTestId('stat-first-time'),
    statLast: byTestId('stat-last-time'),
    statisticsMessage: byTestId('statistics-message'),
    // 其它
    themeToggle: byTestId('theme-toggle'),
    copyResult: byTestId('copy-result'),
    toast: byTestId('toast'),
    backendStatus: byTestId('backend-status'),
    apiBase: byTestId('api-base')
  };
}

/**
 * 判断标记值是否为「真」（兼容 1/0、"1"/"0"、true/false）。
 * @param {unknown} value 待判断的值
 * @returns {boolean} 是否为真
 */
export function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * 取一个安全的数字，非数字时返回兜底值（仅用于页码等界面计数）。
 * @param {unknown} value 待判断的值
 * @param {number} fallback 兜底值
 * @returns {number} 结果
 */
function asNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * 把可空值渲染成文本（0 要正常显示）。
 * @param {unknown} value 值
 * @returns {string} 文本
 */
function textOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

/* -------------------------------------------------------------------------- */
/* Toast                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * 弹出一条 Toast。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} message 文案
 * @param {{type?: 'info'|'success'|'warning'|'error', duration?: number}} [options] 选项
 * @returns {HTMLElement|null} 创建出的 Toast 元素
 */
export function toast(refs, message, options) {
  const opts = options || {};
  const container = refs.toast;
  if (!container || !message) return null;

  const type = opts.type || 'info';
  const duration = typeof opts.duration === 'number' ? opts.duration : 3200;

  const item = document.createElement('div');
  item.className = `toast-item toast-item--${type}`;
  item.dataset.testid = 'toast-item';
  item.dataset.type = type;
  item.setAttribute('role', type === 'error' ? 'alert' : 'status');
  item.textContent = String(message);

  /** 移除自身。 */
  const remove = () => {
    if (item.parentNode) item.parentNode.removeChild(item);
  };
  item.addEventListener('click', remove);

  container.appendChild(item);
  while (container.children.length > 5) container.removeChild(container.firstElementChild);
  if (duration > 0) setTimeout(remove, duration);
  return item;
}

/* -------------------------------------------------------------------------- */
/* 主题                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 应用主题到 `<html data-theme>` 并同步按钮文案。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {'light'|'dark'} theme 主题
 * @returns {'light'|'dark'} 实际生效的主题
 */
export function applyTheme(refs, theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try {
    document.documentElement.style.colorScheme = next;
  } catch {
    /* 忽略 */
  }
  if (refs.themeToggle) {
    refs.themeToggle.textContent = next === 'dark' ? '☀️ 浅色主题' : '🌙 深色主题';
    refs.themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    refs.themeToggle.setAttribute(
      'title',
      next === 'dark' ? '切换到浅色主题（Ctrl/Cmd + D）' : '切换到深色主题（Ctrl/Cmd + D）'
    );
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* 状态栏与显示区                                                              */
/* -------------------------------------------------------------------------- */

/**
 * 渲染后端连接状态。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {'online'|'offline'|'unknown'} state 状态
 * @param {string} text 文案
 * @returns {void}
 */
export function renderBackendStatus(refs, state, text) {
  if (!refs.backendStatus) return;
  refs.backendStatus.dataset.state = state;
  refs.backendStatus.textContent = text;
  refs.backendStatus.setAttribute('title', text);
}

/**
 * 显示当前使用的 API 基地址。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} apiBase API 基地址
 * @returns {void}
 */
export function renderApiBase(refs, apiBase) {
  if (refs.apiBase) refs.apiBase.textContent = apiBase;
}

/**
 * 渲染表达式回显。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} expression 表达式
 * @returns {void}
 */
export function renderDisplayExpression(refs, expression) {
  if (!refs.displayExpression) return;
  refs.displayExpression.textContent = expression && expression.trim() !== '' ? expression : '—';
}

/**
 * 渲染一次成功的计算结果（结果字符串直接来自后端）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{expression?: string, result?: any, display_result?: any}} payload 后端返回
 * @param {string} [fallbackExpression] 后端未回显表达式时使用的输入值
 * @returns {void}
 */
export function renderCalculation(refs, payload, fallbackExpression) {
  const data = payload || {};
  const expression = typeof data.expression === 'string' && data.expression !== ''
    ? data.expression
    : (fallbackExpression || '');
  renderDisplayExpression(refs, expression);
  if (refs.displayResult) {
    const shown = data.display_result !== null && data.display_result !== undefined
      ? data.display_result
      : data.result;
    refs.displayResult.textContent = textOrDash(shown);
    refs.displayResult.dataset.state = 'ok';
  }
  clearError(refs);
  clearPreview(refs);
}

/**
 * 在结果区用淡色显示实时预览（预览值来自后端 persist=false 的试算）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string|number} preview 预览结果
 * @returns {void}
 */
export function renderPreview(refs, preview) {
  if (!refs.displayPreview) return;
  if (preview === null || preview === undefined || preview === '') {
    clearPreview(refs);
    return;
  }
  refs.displayPreview.hidden = false;
  refs.displayPreview.textContent = `预览：${String(preview)}`;
}

/**
 * 清空实时预览。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @returns {void}
 */
export function clearPreview(refs) {
  if (!refs.displayPreview) return;
  refs.displayPreview.hidden = true;
  refs.displayPreview.textContent = '';
}

/**
 * 在结果区展示后端返回的错误信息。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} message 后端 message
 * @param {'error'|'warning'} [level] 样式级别
 * @param {string} [expression] 出错时后端回显的表达式
 * @returns {void}
 */
export function renderError(refs, message, level, expression) {
  const safeLevel = level === ERROR_LEVEL.WARNING ? ERROR_LEVEL.WARNING : ERROR_LEVEL.ERROR;
  if (refs.displayError) {
    refs.displayError.hidden = false;
    refs.displayError.textContent = String(message || '请求失败');
    refs.displayError.dataset.level = safeLevel;
    refs.displayError.className = `display__error display__error--${safeLevel}`;
  }
  if (typeof expression === 'string' && expression !== '') renderDisplayExpression(refs, expression);
  if (refs.displayResult) {
    refs.displayResult.textContent = '—';
    refs.displayResult.dataset.state = 'error';
  }
  clearPreview(refs);
}

/**
 * 清除错误提示。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @returns {void}
 */
export function clearError(refs) {
  if (!refs.displayError) return;
  refs.displayError.hidden = true;
  refs.displayError.textContent = '';
  refs.displayError.removeAttribute('data-level');
  refs.displayError.className = 'display__error';
}

/**
 * 切换忙碌状态（计算中）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {boolean} busy 是否忙碌
 * @returns {void}
 */
export function setBusy(refs, busy) {
  document.body.dataset.busy = busy ? 'true' : 'false';
  if (refs.statistics) refs.statistics.setAttribute('aria-busy', busy ? 'true' : 'false');
}

/* -------------------------------------------------------------------------- */
/* 科学面板（由 /api/meta/functions 动态渲染）                                 */
/* -------------------------------------------------------------------------- */

/**
 * 根据后端元数据创建一个函数 / 常量按钮。
 * @param {{name?: string, label?: string, usage?: string, description?: string}} item 元数据项
 * @param {'function'|'constant'} kind 类型
 * @returns {HTMLElement|null} 按钮元素
 */
function createMetaButton(item, kind) {
  const name = item && typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = kind === 'constant' ? 'key key--const' : 'key key--fn';
  button.dataset.testid = `fn-${name}`;
  button.dataset.insert = kind === 'function' ? `${name}(` : name;
  button.dataset.kind = kind;
  button.textContent = item.label || name;
  button.setAttribute('aria-label', kind === 'function' ? `插入函数 ${name}` : `插入常量 ${name}`);
  const title = item.description || item.usage || name;
  button.setAttribute('title', `${title}（插入 ${button.dataset.insert}）`);
  return button;
}

/**
 * 用后端元数据渲染科学面板动态按钮区。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{constants?: Array<object>, functions?: Array<object>}} meta 后端元数据
 * @returns {void}
 */
export function renderFunctionPanel(refs, meta) {
  const list = refs.sciFnList;
  if (!list) return;

  const data = meta || {};
  const constants = Array.isArray(data.constants) ? data.constants : [];
  const functions = Array.isArray(data.functions) ? data.functions : [];

  list.textContent = '';

  let created = 0;
  functions.forEach((fn) => {
    const button = createMetaButton(fn, 'function');
    if (button) {
      list.appendChild(button);
      created += 1;
    }
  });
  constants.forEach((constant) => {
    const button = createMetaButton(constant, 'constant');
    if (button) {
      list.appendChild(button);
      created += 1;
    }
  });

  if (created === 0) {
    renderFunctionPanelUnavailable(refs, '后端未返回可用函数');
    return;
  }

  list.hidden = false;
  if (refs.sciPanel) refs.sciPanel.dataset.state = 'ready';
  if (refs.sciPanelHint) {
    refs.sciPanelHint.textContent = `后端提供 ${functions.length} 个函数、${constants.length} 个常量`;
  }
}

/**
 * 元数据接口失败时的降级：隐藏动态函数区，保留固定的 `^ ! %` 扩展按键。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} [reason] 降级原因
 * @returns {void}
 */
export function renderFunctionPanelUnavailable(refs, reason) {
  if (refs.sciFnList) {
    refs.sciFnList.textContent = '';
    refs.sciFnList.hidden = true;
  }
  if (refs.sciPanel) refs.sciPanel.dataset.state = 'degraded';
  if (refs.sciPanelHint) {
    refs.sciPanelHint.textContent = `科学函数不可用（${reason || '元数据接口失败'}），^ ! % 仍可使用`;
  }
}

/* -------------------------------------------------------------------------- */
/* 统计区                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 把运算符分布对象渲染成文本。
 * @param {Record<string, number>} distribution 形如 `{"+": 5, "*": 4}`
 * @returns {string} 文本
 */
function formatDistribution(distribution) {
  if (!distribution || typeof distribution !== 'object') return '—';
  const keys = Object.keys(distribution);
  if (keys.length === 0) return '—';
  return keys.map((key) => `${key} ${distribution[key]}`).join(' · ');
}

/**
 * 渲染统计卡片。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {object} stats `/api/history/statistics` 的 data
 * @returns {void}
 */
export function renderStatistics(refs, stats) {
  const data = stats || {};
  if (refs.statTotal) refs.statTotal.textContent = textOrDash(data.total);
  if (refs.statToday) refs.statToday.textContent = textOrDash(data.today);
  if (refs.statFavorite) refs.statFavorite.textContent = textOrDash(data.favorite_count);
  if (refs.statOperator) refs.statOperator.textContent = textOrDash(data.most_used_operator);
  if (refs.statDistribution) {
    refs.statDistribution.textContent = formatDistribution(data.operator_distribution);
  }
  if (refs.statFirst) refs.statFirst.textContent = textOrDash(data.first_calculation_at);
  if (refs.statLast) refs.statLast.textContent = textOrDash(data.last_calculation_at);
  if (refs.statisticsMessage) {
    refs.statisticsMessage.hidden = true;
    refs.statisticsMessage.textContent = '';
    refs.statisticsMessage.removeAttribute('data-level');
  }
}

/**
 * 统计加载失败时把各项置为占位符并给出提示。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} message 失败原因
 * @returns {void}
 */
export function renderStatisticsError(refs, message) {
  [refs.statTotal, refs.statToday, refs.statFavorite, refs.statOperator, refs.statDistribution, refs.statFirst, refs.statLast]
    .forEach((element) => {
      if (element) element.textContent = '—';
    });
  if (refs.statisticsMessage) {
    refs.statisticsMessage.hidden = false;
    refs.statisticsMessage.dataset.level = 'error';
    refs.statisticsMessage.textContent = `统计加载失败：${message}`;
  }
}

/* -------------------------------------------------------------------------- */
/* 历史区                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 依据后端记录创建一条历史 DOM。
 * @param {object} record 历史记录
 * @returns {HTMLElement} `<li>` 元素
 */
function createHistoryItem(record) {
  const data = record || {};
  const id = data.id === undefined || data.id === null ? '' : String(data.id);
  const favorite = isTruthyFlag(data.is_favorite);

  const item = document.createElement('li');
  item.className = 'history-item';
  item.dataset.testid = 'history-item';
  item.dataset.id = id;
  item.dataset.favorite = favorite ? '1' : '0';
  item.dataset.expression = typeof data.expression === 'string' ? data.expression : '';
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.setAttribute('title', '点击可把该表达式回填到输入框');

  const head = document.createElement('div');
  head.className = 'history-item__head';

  const idElement = document.createElement('span');
  idElement.className = 'history-item__id';
  idElement.textContent = `#${id}`;

  const timeElement = document.createElement('span');
  timeElement.className = 'history-item__time';
  timeElement.textContent = textOrDash(data.created_at);

  const badge = document.createElement('span');
  badge.className = 'history-item__badge';
  badge.textContent = favorite ? '★ 已收藏' : '☆ 未收藏';

  head.append(idElement, timeElement, badge);

  const body = document.createElement('div');
  body.className = 'history-item__body';

  const exprElement = document.createElement('code');
  exprElement.className = 'history-item__expr';
  exprElement.textContent = textOrDash(data.expression);

  const eqElement = document.createElement('span');
  eqElement.className = 'history-item__eq';
  eqElement.textContent = '=';

  const resultElement = document.createElement('span');
  resultElement.className = 'history-item__result';
  resultElement.textContent = textOrDash(data.result);

  body.append(exprElement, eqElement, resultElement);

  const actions = document.createElement('div');
  actions.className = 'history-item__actions';

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'btn btn--icon';
  favoriteButton.dataset.testid = 'history-favorite';
  favoriteButton.dataset.favorite = favorite ? '1' : '0';
  favoriteButton.textContent = favorite ? '★' : '☆';
  favoriteButton.setAttribute('aria-pressed', favorite ? 'true' : 'false');
  favoriteButton.setAttribute('aria-label', favorite ? '取消收藏' : '收藏');
  favoriteButton.setAttribute('title', favorite ? '取消收藏' : '收藏');

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn btn--icon btn--danger';
  deleteButton.dataset.testid = 'history-delete';
  deleteButton.textContent = '删除';
  deleteButton.setAttribute('aria-label', '删除该条历史');
  deleteButton.setAttribute('title', '删除该条历史');

  actions.append(favoriteButton, deleteButton);
  item.append(head, body, actions);
  return item;
}

/**
 * 渲染历史列表。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{items?: Array<object>, page?: number, total?: number, total_pages?: number}} page 后端返回的分页数据
 * @param {{keyword?: string}} [options] 附加信息（用于空态文案）
 * @returns {void}
 */
export function renderHistory(refs, page, options) {
  const list = refs.historyList;
  if (!list) return;

  const data = page || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const keyword = (options && options.keyword) || '';

  list.textContent = '';

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'history__empty';
    empty.dataset.testid = 'history-empty';
    empty.textContent = keyword
      ? `没有匹配「${keyword}」的历史记录`
      : '暂无计算历史，先在上方做一次计算吧。';
    list.appendChild(empty);
    return;
  }

  items.forEach((record) => list.appendChild(createHistoryItem(record)));
}

/**
 * 历史加载失败时在列表位置显示错误行（不影响其它区域）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {string} message 错误描述
 * @returns {void}
 */
export function renderHistoryError(refs, message) {
  const list = refs.historyList;
  if (!list) return;
  list.textContent = '';
  const item = document.createElement('li');
  item.className = 'history__empty history__empty--error';
  item.dataset.testid = 'history-error';
  item.textContent = `历史加载失败：${message}`;
  list.appendChild(item);
}

/**
 * 切换历史区加载态。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {boolean} loading 是否加载中
 * @returns {void}
 */
export function setHistoryLoading(refs, loading) {
  if (!refs.historyList) return;
  refs.historyList.dataset.loading = loading ? 'true' : 'false';
  refs.historyList.setAttribute('aria-busy', loading ? 'true' : 'false');
}

/**
 * 渲染分页信息与按钮可用状态。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{page?: number, total_pages?: number, total?: number, items?: Array<object>}} page 分页数据
 * @returns {void}
 */
export function renderPager(refs, page) {
  const data = page || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const pageNo = asNumber(data.page, 1);
  const totalPages = asNumber(data.total_pages, 1);
  const total = asNumber(data.total, items.length);

  if (refs.historyPageInfo) {
    refs.historyPageInfo.textContent = `第 ${pageNo} / ${totalPages} 页 · 共 ${total} 条`;
  }
  if (refs.historyPagePrev) refs.historyPagePrev.disabled = pageNo <= 1;
  if (refs.historyPageNext) refs.historyPageNext.disabled = pageNo >= totalPages;
}

/* -------------------------------------------------------------------------- */
/* 事件绑定                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 防抖包装。
 * @param {Function} fn 目标函数
 * @param {number} wait 等待毫秒
 * @returns {Function} 带 `cancel` 方法的防抖函数
 */
export function debounce(fn, wait) {
  let timer = null;
  const wrapped = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return wrapped;
}

/**
 * 绑定数字键盘 / 运算符键盘点击（事件委托）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {(action: {type: 'insert'|'action', value?: string, name?: string}) => void} handler 回调
 * @returns {Function} 解绑函数
 */
export function bindKeypad(refs, handler) {
  const container = refs.keypad;
  if (!container) return () => {};

  /** @param {MouseEvent} event 点击事件 */
  const onClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-insert], [data-action]');
    if (!button || !container.contains(button)) return;
    event.preventDefault();
    const insert = button.dataset.insert;
    if (typeof insert === 'string' && insert !== '') {
      handler({ type: 'insert', value: insert });
      return;
    }
    const action = button.dataset.action;
    if (typeof action === 'string' && action !== '') handler({ type: 'action', name: action });
  };

  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}

/**
 * 绑定科学面板动态按钮点击（事件委托）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {(fragment: string) => void} onInsert 插入片段回调
 * @returns {Function} 解绑函数
 */
export function bindFunctionPanel(refs, onInsert) {
  const container = refs.sciPanel;
  if (!container) return () => {};

  /** @param {MouseEvent} event 点击事件 */
  const onClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-insert]');
    if (!button || !container.contains(button)) return;
    event.preventDefault();
    const fragment = button.dataset.insert;
    if (typeof fragment === 'string' && fragment !== '') onInsert(fragment);
  };

  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}

/**
 * 绑定历史列表的删除 / 收藏 / 回填（事件委托）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{onDelete?: Function, onFavorite?: Function, onRefill?: Function}} handlers 回调
 * @returns {Function} 解绑函数
 */
export function bindHistory(refs, handlers) {
  const list = refs.historyList;
  const callbacks = handlers || {};
  if (!list) return () => {};

  /** @param {MouseEvent} event 点击事件 */
  const onClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('[data-testid="history-item"]');
    if (!item || !list.contains(item)) return;

    const id = item.dataset.id || '';
    if (event.target.closest('[data-testid="history-delete"]')) {
      event.stopPropagation();
      if (callbacks.onDelete) callbacks.onDelete(id, item);
      return;
    }
    if (event.target.closest('[data-testid="history-favorite"]')) {
      event.stopPropagation();
      if (callbacks.onFavorite) callbacks.onFavorite(id, item.dataset.favorite === '1', item);
      return;
    }
    if (callbacks.onRefill) callbacks.onRefill(id, item.dataset.expression || '', item);
  };

  /** @param {KeyboardEvent} event 键盘事件 */
  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('[data-testid="history-item"]');
    if (!item || event.target !== item) return;
    event.preventDefault();
    if (callbacks.onRefill) callbacks.onRefill(item.dataset.id || '', item.dataset.expression || '', item);
  };

  list.addEventListener('click', onClick);
  list.addEventListener('keydown', onKeyDown);
  return () => {
    list.removeEventListener('click', onClick);
    list.removeEventListener('keydown', onKeyDown);
  };
}

/**
 * 绑定历史筛选控件。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{onSearchInput?: Function, onFilterChange?: Function, onClearAll?: Function, searchDebounce?: number}} handlers 回调
 * @returns {Function} 解绑函数
 */
export function bindHistoryControls(refs, handlers) {
  const callbacks = handlers || {};
  const wait = typeof callbacks.searchDebounce === 'number' ? callbacks.searchDebounce : 300;
  const listeners = [];

  /**
   * @param {HTMLElement|null} element 元素
   * @param {string} type 事件名
   * @param {Function} listener 监听器
   */
  const on = (element, type, listener) => {
    if (!element) return;
    element.addEventListener(type, listener);
    listeners.push([element, type, listener]);
  };

  if (refs.historySearch && callbacks.onSearchInput) {
    const debounced = debounce(() => callbacks.onSearchInput(refs.historySearch.value), wait);
    on(refs.historySearch, 'input', debounced);
    on(refs.historySearch, 'search', () => {
      debounced.cancel();
      callbacks.onSearchInput(refs.historySearch.value);
    });
  }

  const emitFilterChange = () => {
    if (callbacks.onFilterChange) {
      callbacks.onFilterChange({
        startDate: refs.historyStartDate ? refs.historyStartDate.value : '',
        endDate: refs.historyEndDate ? refs.historyEndDate.value : '',
        favoriteOnly: refs.historyFavoriteOnly ? refs.historyFavoriteOnly.checked : false
      });
    }
  };

  on(refs.historyStartDate, 'change', emitFilterChange);
  on(refs.historyEndDate, 'change', emitFilterChange);
  on(refs.historyFavoriteOnly, 'change', emitFilterChange);

  if (refs.historyClearAll && callbacks.onClearAll) {
    on(refs.historyClearAll, 'click', (event) => {
      event.preventDefault();
      callbacks.onClearAll(refs.historyClearAll);
    });
  }

  return () => listeners.forEach(([element, type, listener]) => element.removeEventListener(type, listener));
}

/**
 * 绑定分页按钮。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{onPrev?: Function, onNext?: Function}} handlers 回调
 * @returns {Function} 解绑函数
 */
export function bindPager(refs, handlers) {
  const callbacks = handlers || {};
  const listeners = [];
  /**
   * @param {HTMLElement|null} element 元素
   * @param {Function} listener 监听器
   */
  const on = (element, listener) => {
    if (!element) return;
    element.addEventListener('click', listener);
    listeners.push([element, listener]);
  };

  on(refs.historyPagePrev, (event) => {
    event.preventDefault();
    if (callbacks.onPrev) callbacks.onPrev();
  });
  on(refs.historyPageNext, (event) => {
    event.preventDefault();
    if (callbacks.onNext) callbacks.onNext();
  });

  return () => listeners.forEach(([element, listener]) => element.removeEventListener('click', listener));
}

/**
 * 绑定顶部操作（主题切换、复制结果）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{onToggleTheme?: Function, onCopy?: Function}} handlers 回调
 * @returns {Function} 解绑函数
 */
export function bindHeaderActions(refs, handlers) {
  const callbacks = handlers || {};
  const listeners = [];
  /**
   * @param {HTMLElement|null} element 元素
   * @param {Function} listener 监听器
   */
  const on = (element, listener) => {
    if (!element) return;
    element.addEventListener('click', listener);
    listeners.push([element, listener]);
  };

  on(refs.themeToggle, (event) => {
    event.preventDefault();
    if (callbacks.onToggleTheme) callbacks.onToggleTheme();
  });
  on(refs.copyResult, (event) => {
    event.preventDefault();
    if (callbacks.onCopy) callbacks.onCopy();
  });

  return () => listeners.forEach(([element, listener]) => element.removeEventListener('click', listener));
}

/**
 * 判断事件目标是否处于可编辑控件中。
 * @param {EventTarget|null} target 事件目标
 * @returns {boolean} 是否可编辑
 */
function isTextEditable(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable === true;
}

/**
 * 绑定全局键盘快捷键。
 *
 * - `Enter`：计算（焦点在表达式输入框或非输入区域时）
 * - `Esc`：清空输入
 * - `Backspace`：退格（焦点不在输入框时，避免与浏览器原生编辑冲突）
 * - 数字 / 运算符：直接追加到表达式
 * - `Ctrl/Cmd + D`：切换主题
 *
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {{onSubmit?: Function, onEscape?: Function, onBackspace?: Function, onInsert?: Function, onToggleTheme?: Function}} handlers 回调
 * @returns {Function} 解绑函数
 */
export function bindKeyboard(refs, handlers) {
  const callbacks = handlers || {};

  /** @param {KeyboardEvent} event 键盘事件 */
  const onKeyDown = (event) => {
    if (event.defaultPrevented) return;
    const key = event.key;
    const editable = isTextEditable(event.target);
    const isExpressionInput = event.target instanceof Element
      && event.target.matches('[data-testid="expression-input"]');

    if ((event.ctrlKey || event.metaKey) && (key === 'd' || key === 'D')) {
      event.preventDefault();
      if (callbacks.onToggleTheme) callbacks.onToggleTheme();
      return;
    }

    if (key === 'Enter') {
      if (isExpressionInput || !editable) {
        event.preventDefault();
        if (callbacks.onSubmit) callbacks.onSubmit();
      }
      return;
    }

    if (key === 'Escape') {
      event.preventDefault();
      if (callbacks.onEscape) callbacks.onEscape();
      return;
    }

    if (editable) return; // 输入框内的编辑行为交给浏览器原生处理

    if (key === 'Backspace') {
      event.preventDefault();
      if (callbacks.onBackspace) callbacks.onBackspace();
      return;
    }

    const fragment = KEY_TO_FRAGMENT[key];
    if (typeof fragment === 'string') {
      event.preventDefault();
      if (callbacks.onInsert) callbacks.onInsert(fragment);
    }
  };

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}

/**
 * 给表达式输入框绑定输入事件（用于同步回显与实时预览）。
 * @param {Record<string, HTMLElement>} refs DOM 引用
 * @param {(value: string) => void} onChange 回调
 * @returns {Function} 解绑函数
 */
export function bindExpressionInput(refs, onChange) {
  const input = refs.expressionInput;
  if (!input) return () => {};
  /** @param {Event} event 输入事件 */
  const onInput = () => onChange(input.value);
  input.addEventListener('input', onInput);
  return () => input.removeEventListener('input', onInput);
}
