/**
 * @file config.js
 * @description 全局配置与运行时参数解析。
 *
 * 设计约束：
 * 1. 整个前端只有本文件写死后端地址，其它模块一律通过 `getRuntimeConfig()` 读取，
 *    避免 "http://127.0.0.1:8000" 散落在多处。
 * 2. 支持 `?api=http://host:port/api` 覆盖 API 基地址。
 * 3. localStorage 仅用于保存主题与界面偏好，绝不用于缓存计算历史。
 *
 * 本文件不包含、也不允许包含任何表达式计算逻辑。
 *
 * @author 陈俊洁 (832402204)
 */

/** 默认后端 API 基地址（后端服务地址 + `/api` 前缀）。 */
export const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api';

/** 单次 HTTP 请求的超时时间（毫秒）。 */
export const REQUEST_TIMEOUT_MS = 8000;

/** 表达式实时预览的防抖时间（毫秒）。 */
export const PREVIEW_DEBOUNCE_MS = 400;

/** 历史检索输入框的防抖时间（毫秒）。 */
export const SEARCH_DEBOUNCE_MS = 300;

/** 历史列表默认每页条数。 */
export const DEFAULT_PAGE_SIZE = 10;

/** localStorage 键名：主题偏好。 */
export const STORAGE_KEY_THEME = 'theme';

/** localStorage 键名：界面偏好（分页大小、筛选开关等，不含任何历史数据）。 */
export const STORAGE_KEY_UI_PREFS = 'calculator.ui-prefs';

/** 支持的主题。 */
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';
export const SUPPORTED_THEMES = Object.freeze([THEME_LIGHT, THEME_DARK]);

/**
 * 运行期配置（进程内单例）。
 * @type {{apiBase: string, theme: string, expression: string, autoCalculate: boolean, themeFromQuery: boolean} | null}
 */
let activeConfig = null;

/**
 * 安全读取 localStorage：隐私模式 / 禁用存储时不应抛错。
 * @param {string} key 键名
 * @returns {string | null} 值，读取失败返回 null
 */
export function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 安全写入 localStorage。
 * @param {string} key 键名
 * @param {string} value 值
 * @returns {boolean} 是否写入成功
 */
export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取界面偏好（仅存主题、分页大小、筛选开关等界面状态）。
 * @returns {{pageSize?: number, favoriteOnly?: boolean, sciPanelCollapsed?: boolean}} 界面偏好对象
 */
export function readUiPrefs() {
  const raw = readStorage(STORAGE_KEY_UI_PREFS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 保存界面偏好。
 * @param {object} prefs 需要合并的偏好字段
 * @returns {boolean} 是否保存成功
 */
export function writeUiPrefs(prefs) {
  const merged = Object.assign({}, readUiPrefs(), prefs || {});
  return writeStorage(STORAGE_KEY_UI_PREFS, JSON.stringify(merged));
}

/**
 * 把任意形式的 API 地址规范化为 `<scheme>://<host>[:port]/api` 或同源相对路径 `/api`。
 * - 缺少协议时补 `http://`；
 * - 末尾斜杠会被去掉；
 * - 路径不以 `/api` 结尾时自动补上 `/api`（契约中所有接口都带 `/api` 前缀）；
 * - 以 `/` 开头的相对地址原样保留（用于同源部署，例如 `/api`）。
 * @param {string} raw 原始地址
 * @returns {string} 规范化后的 API 基地址
 */
export function normalizeApiBase(raw) {
  if (typeof raw !== 'string') return DEFAULT_API_BASE;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_API_BASE;

  // 同源相对地址：部署在同一域名下时使用（由反向代理把 /api 转到后端）
  if (trimmed.startsWith('/')) {
    const relativePath = trimmed.replace(/\/+$/, '');
    return /\/api$/i.test(relativePath) ? relativePath : `${relativePath}/api`;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    let path = url.pathname.replace(/\/+$/, '');
    if (!/\/api$/i.test(path)) path = `${path}/api`;
    url.pathname = path;
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_API_BASE;
  }
}

/**
 * 拼接完整请求 URL。
 * @param {string} apiBase API 基地址
 * @param {string} pathname 接口路径，如 `/calculate`
 * @param {object | null} [query] 查询参数，值为 undefined/null/'' 时跳过；布尔值转 true/false
 * @returns {string} 完整 URL
 */
export function buildApiUrl(apiBase, pathname, query) {
  const base = normalizeApiBase(apiBase);
  const path = typeof pathname === 'string' && pathname.startsWith('/') ? pathname : `/${pathname || ''}`;
  const search = new URLSearchParams();
  if (query && typeof query === 'object') {
    Object.keys(query).forEach((key) => {
      const value = query[key];
      if (value === undefined || value === null) return;
      const text = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
      if (text === '') return;
      search.set(key, text);
    });
  }
  const qs = search.toString();
  return qs ? `${base}${path}?${qs}` : `${base}${path}`;
}

/**
 * 跟随系统主题给出默认值。
 * @returns {string} `light` 或 `dark`
 */
function preferredSystemTheme() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return THEME_DARK;
  } catch {
    /* 忽略：matchMedia 不可用时回落到浅色 */
  }
  return THEME_LIGHT;
}

/**
 * 推断默认的 API 基地址。
 *
 * - 页面由本机打开（localhost / 127.0.0.1 / file:）时，默认连本机后端
 *   `http://127.0.0.1:8000/api`（开发时的默认行为）；
 * - 页面由其它主机名打开时（局域网 IP、云服务器域名、隧道域名等），
 *   默认走**同源** `/api`——前提是该域名下已把 `/api` 反向代理到后端
 *   （见 `tools/serve_public.py`）。这样公网地址不需要额外带 `?api=` 参数。
 *
 * 想指向别的后端时，用 `?api=http://host:port/api` 或页面里注入的
 * `window.__CALC_API_BASE__` 覆盖即可。
 *
 * @returns {string} 推断出的 API 基地址
 */
function inferDefaultApiBase() {
  if (typeof window === 'undefined' || !window.location) return DEFAULT_API_BASE;
  const protocol = window.location.protocol;
  const hostname = window.location.hostname || '';
  const isHttp = protocol === 'http:' || protocol === 'https:';
  const isLoopback =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  if (isHttp && !isLoopback) return '/api';
  return DEFAULT_API_BASE;
}

/**
 * 解析 URL 查询参数、localStorage，得到本次运行的配置。
 *
 * API 基地址的优先级（从高到低）：
 * 1. URL 参数 `?api=`；
 * 2. 页面注入的 `window.__CALC_API_BASE__`（同源部署时由反向代理注入）；
 * 3. 自动推断（本机 -> `http://127.0.0.1:8000/api`；其它主机 -> `/api`）。
 *
 * 另外支持：
 * - `?theme=dark` 覆盖主题
 * - `?expr=1%2B2*3` 预填表达式并在加载后自动计算一次（persist=true）
 *
 * @param {string} [search] 查询字符串，默认取 `window.location.search`
 * @returns {{apiBase: string, theme: string, expression: string, autoCalculate: boolean, themeFromQuery: boolean, params: URLSearchParams}}
 */
export function resolveRuntimeConfig(search) {
  const rawSearch = typeof search === 'string' ? search : (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(rawSearch.replace(/^\?/, ''));

  const apiParam = params.get('api');
  const injectedBase =
    typeof window !== 'undefined' && typeof window.__CALC_API_BASE__ === 'string'
      ? window.__CALC_API_BASE__
      : '';
  const apiBase = normalizeApiBase(apiParam || injectedBase || inferDefaultApiBase());

  const themeParam = (params.get('theme') || '').toLowerCase();
  const storedTheme = (readStorage(STORAGE_KEY_THEME) || '').toLowerCase();
  const themeFromQuery = SUPPORTED_THEMES.includes(themeParam);
  const theme = themeFromQuery
    ? themeParam
    : (SUPPORTED_THEMES.includes(storedTheme) ? storedTheme : preferredSystemTheme());

  const expression = params.get('expr') || '';

  return {
    apiBase,
    theme,
    expression,
    autoCalculate: expression.trim() !== '',
    themeFromQuery,
    params
  };
}

/**
 * 获取（必要时初始化）运行期配置单例。
 * @returns {{apiBase: string, theme: string, expression: string, autoCalculate: boolean, themeFromQuery: boolean, params: URLSearchParams}}
 */
export function getRuntimeConfig() {
  if (!activeConfig) activeConfig = resolveRuntimeConfig();
  return activeConfig;
}

/**
 * 运行期修改 API 基地址（供调试或自动化脚本使用）。
 * @param {string} apiBase 新的 API 基地址
 * @returns {string} 规范化后的地址
 */
export function setApiBase(apiBase) {
  const config = getRuntimeConfig();
  config.apiBase = normalizeApiBase(apiBase);
  return config.apiBase;
}

/**
 * 保存主题偏好到 localStorage。
 * @param {string} theme `light` 或 `dark`
 * @returns {boolean} 是否保存成功
 */
export function saveTheme(theme) {
  return writeStorage(STORAGE_KEY_THEME, theme === THEME_DARK ? THEME_DARK : THEME_LIGHT);
}
