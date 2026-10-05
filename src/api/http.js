/**
 * http.js —— 基于原生 fetch 的极简 HTTP 封装
 *
 * 职责：
 * 1. 统一基地址（解析顺序见 resolveBaseUrl：?api= → localStorage → config.js → 构建期变量 → 本机兜底）；
 * 2. 统一超时控制（AbortController）；
 * 3. 统一解包后端「扁平信封」{ success, code, message, ...业务字段 }；
 * 4. 统一错误归一化：业务错误直接使用后端 message，网络层错误使用本文件约定的提示文案。
 *
 * 注意：本文件只负责传输与解包，不含任何表达式求值逻辑。
 */

/** 本机默认后端地址（最后兜底，便于助教克隆后直接跑起来） */
const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

/** localStorage 键名：记住用户用 ?api= 指定的后端 */
const STORAGE_KEY = 'calc-api-base';

/**
 * 特殊值：表示「与页面同源」。
 *
 * 单机部署（nginx 托管前端并把 /api 反代到后端）时用它最省事：
 * 不用把服务器 IP 写死进前端，换成域名、加 HTTPS、换端口都不用重新构建。
 */
const SAME_ORIGIN = 'same-origin';

/** 归一化地址：只接受 http(s) 开头，去掉结尾斜杠 */
function normalizeBase(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

/** 把配置值转成可用的基地址；识别 same-origin 特殊值，非法值返回空串 */
function coerceBase(value) {
  if (typeof value === 'string' && value.trim().toLowerCase() === SAME_ORIGIN) {
    try {
      return window.location.origin;
    } catch (error) {
      return '';
    }
  }
  return normalizeBase(value);
}

function readQueryBase() {
  try {
    const base = coerceBase(new URLSearchParams(window.location.search).get('api'));
    if (base) {
      window.localStorage.setItem(STORAGE_KEY, base);
    }
    return base;
  } catch (error) {
    return '';
  }
}

function readStoredBase() {
  try {
    return normalizeBase(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return '';
  }
}

function readRuntimeBase() {
  try {
    return coerceBase(window.__API_BASE__);
  } catch (error) {
    return '';
  }
}

/**
 * 解析后端基地址。
 *
 * 之所以支持运行时指定：静态托管（如 GitHub Pages）只能承载前端，
 * 后端地址随时可能变化；把地址放到运行时解析，就**不需要重新构建**即可切换后端。
 *
 * 优先级：
 * 1. `?api=https://...`（会记入 localStorage，便于分享可用的页面链接；也支持 `?api=same-origin`）
 * 2. localStorage 中上次记住的地址
 * 3. `window.__API_BASE__`（由 public/config.js 提供，部署后可直接改文件）
 * 4. 构建期注入的 `VITE_API_BASE_URL`
 * 5. 本机默认 http://127.0.0.1:8000
 */
function resolveBaseUrl() {
  return (
    readQueryBase() ||
    readStoredBase() ||
    readRuntimeBase() ||
    normalizeBase(import.meta.env.VITE_API_BASE_URL) ||
    DEFAULT_BASE_URL
  );
}

/** 当前生效的后端基地址（模块加载时解析一次） */
const BASE_URL = resolveBaseUrl();

/** 默认请求超时（毫秒） */
const DEFAULT_TIMEOUT = 15000;

/**
 * 统一的接口错误对象。
 *
 * @property {number} code     业务码（后端信封里的 code；网络层错误为负数）
 * @property {number} status   HTTP 状态码（网络层错误为 0）
 * @property {boolean} network 是否为「连不上后端 / 超时」这类传输层错误
 * @property {any} payload     后端原始响应体（便于调试）
 */
export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? -1;
    this.status = options.status ?? 0;
    this.network = Boolean(options.network);
    this.payload = options.payload ?? null;
  }
}

/** 拼接完整 URL 与查询串（空值不参与拼接） */
function buildUrl(path, query) {
  const base = String(BASE_URL).replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) {
    return url;
  }
  const params = new URLSearchParams();
  Object.keys(query).forEach((key) => {
    const value = query[key];
    if (value === undefined || value === null || value === '') {
      return;
    }
    params.append(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * 发起请求。
 *
 * @param {string} method  HTTP 方法
 * @param {string} path    以 /api 开头的路径
 * @param {object} options { query, body, timeout, headers }
 * @returns {Promise<object>} 解包后的信封对象（业务字段已平铺在顶层）
 */
async function request(method, path, options = {}) {
  const { query, body, timeout = DEFAULT_TIMEOUT, headers } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error && error.name === 'AbortError';
    throw new ApiError(
      aborted
        ? `请求超时：后端服务在 ${timeout} 毫秒内未响应`
        : `无法连接后端服务（${BASE_URL}），请确认后端已启动后重试`,
      { network: true, code: aborted ? -2 : -1 },
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = null;
    }
  }

  // 情况一：后端明确告知业务失败 —— 直接使用后端 message（需求：错误文案必须来自后端）
  if (payload && typeof payload === 'object' && payload.success === false) {
    throw new ApiError(
      typeof payload.message === 'string' && payload.message ? payload.message : `请求失败（HTTP ${response.status}）`,
      { code: payload.code ?? -1, status: response.status, payload },
    );
  }

  // 情况二：HTTP 层失败（404/500/422 等）
  if (!response.ok) {
    const fallbackMessage = `服务端返回异常（HTTP ${response.status}）`;
    const message =
      payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message
        ? payload.message
        : fallbackMessage;
    throw new ApiError(message, {
      code: payload && typeof payload === 'object' ? payload.code ?? -1 : -1,
      status: response.status,
      payload,
    });
  }

  // 情况三：响应不是合法 JSON 信封
  if (!payload || typeof payload !== 'object') {
    throw new ApiError('后端返回的内容不是合法的 JSON 信封', { status: response.status, payload: text });
  }

  return payload;
}

export const http = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
};

export { BASE_URL, DEFAULT_TIMEOUT, DEFAULT_BASE_URL, STORAGE_KEY };
export default http;
