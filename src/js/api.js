/**
 * @file api.js
 * @description 后端 REST 接口的统一封装：URL 拼接、超时控制、错误归一化。
 *
 * 职责边界（严格遵守作业红线）：
 * - 本文件只负责「发请求 / 收响应 / 抛结构化错误」；
 * - 不解析、不计算任何表达式；所有结果字符串都原样来自后端。
 * - 统一响应外壳：
 *   成功 `{success:true, data:..., message:...}`（`/api/calculate` 为扁平结构，无 data）
 *   失败 `{success:false, message:..., error_code:...}`
 *
 * @author 陈俊洁 (832402204)
 */

import { buildApiUrl, getRuntimeConfig, REQUEST_TIMEOUT_MS } from './config.js';

/**
 * 错误分类枚举。
 * @readonly
 * @enum {string}
 */
export const ERROR_KIND = Object.freeze({
  /** 后端返回 success:false（业务错误，如除零、表达式非法） */
  BACKEND: 'backend',
  /** HTTP 非 2xx 且响应体不是统一外壳 */
  HTTP: 'http',
  /** 网络不可达（后端未启动 / CORS 被拒） */
  NETWORK: 'network',
  /** 请求超时 */
  TIMEOUT: 'timeout',
  /** 响应体不是合法 JSON */
  PARSE: 'parse',
  /** 调用方主动取消（例如实时预览被新的输入打断） */
  ABORT: 'abort'
});

/**
 * 属于「数学运行时问题」的错误码，界面用黄色警示样式区分于参数类红色错误。
 * @type {readonly string[]}
 */
export const WARNING_ERROR_CODES = Object.freeze([
  'DIVISION_BY_ZERO',
  'MATH_DOMAIN_ERROR',
  'OVERFLOW_ERROR'
]);

/**
 * 判断错误码是否属于黄色警示类。
 * @param {string} code 后端返回的 error_code
 * @returns {boolean} true 表示使用警示样式
 */
export function isWarningErrorCode(code) {
  return WARNING_ERROR_CODES.includes(code);
}

/**
 * 统一的接口错误对象。
 */
export class ApiError extends Error {
  /**
   * @param {string} message 展示给用户的中文错误描述
   * @param {object} [options] 附加信息
   * @param {string} [options.kind] ERROR_KIND 之一
   * @param {string} [options.errorCode] 后端 error_code
   * @param {number} [options.status] HTTP 状态码
   * @param {string} [options.expression] 出错时后端回显的表达式
   * @param {object|null} [options.payload] 原始响应体
   */
  constructor(message, options) {
    super(message || '请求失败');
    const opts = options || {};
    this.name = 'ApiError';
    this.kind = opts.kind || ERROR_KIND.BACKEND;
    this.errorCode = opts.errorCode || '';
    this.status = typeof opts.status === 'number' ? opts.status : 0;
    this.expression = opts.expression || '';
    this.payload = opts.payload || null;
  }

  /** @returns {boolean} 是否为黄色警示类错误 */
  get isWarning() {
    return isWarningErrorCode(this.errorCode);
  }

  /** @returns {boolean} 是否为「连不上后端」类错误 */
  get isConnectionError() {
    return this.kind === ERROR_KIND.NETWORK || this.kind === ERROR_KIND.TIMEOUT;
  }
}

/**
 * 把任意异常归一化成界面可直接使用的描述。
 * @param {unknown} error 捕获到的异常
 * @returns {{message: string, level: 'warning'|'error', kind: string, errorCode: string, status: number, expression: string}}
 */
export function describeError(error) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      level: error.isWarning ? 'warning' : 'error',
      kind: error.kind,
      errorCode: error.errorCode,
      status: error.status,
      expression: error.expression
    };
  }
  const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : '未知错误';
  return { message, level: 'error', kind: 'unknown', errorCode: '', status: 0, expression: '' };
}

/**
 * 判断异常是否为「调用方主动取消」。
 * @param {unknown} error 捕获到的异常
 * @returns {boolean} true 表示主动取消
 */
export function isAbortError(error) {
  return error instanceof ApiError && error.kind === ERROR_KIND.ABORT;
}

/**
 * 统一请求方法：负责超时、JSON 编解码、统一外壳解析与错误抛出。
 * @param {string} path 接口路径（以 `/` 开头）
 * @param {object} [options] 请求选项
 * @param {string} [options.method] HTTP 方法，默认 GET
 * @param {object|null} [options.body] 请求体（会被 JSON.stringify）
 * @param {object|null} [options.query] 查询参数
 * @param {number} [options.timeout] 超时毫秒数
 * @param {AbortSignal|null} [options.signal] 外部取消信号（用于实时预览防抖取消）
 * @returns {Promise<any>} 成功时返回 `data` 字段；无 `data` 外壳时返回整个响应体
 * @throws {ApiError} 任何失败情况都抛出结构化的 ApiError
 */
async function request(path, options) {
  const opts = options || {};
  const method = opts.method || 'GET';
  const body = opts.body === undefined ? null : opts.body;
  const query = opts.query || null;
  const timeout = typeof opts.timeout === 'number' && opts.timeout > 0 ? opts.timeout : REQUEST_TIMEOUT_MS;
  const externalSignal = opts.signal || null;

  const url = buildApiUrl(getRuntimeConfig().apiBase, path, query);

  const controller = new AbortController();
  let timedOut = false;
  let externalAborted = false;

  const abortFromOutside = () => {
    externalAborted = true;
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) abortFromOutside();
    else externalSignal.addEventListener('abort', abortFromOutside, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  const headers = { Accept: 'application/json' };
  if (body !== null) headers['Content-Type'] = 'application/json; charset=utf-8';

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit'
    });

    const text = await response.text();
    let payload = null;
    if (text && text.trim() !== '') {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ApiError(`响应不是合法 JSON（HTTP ${response.status}）`, {
          kind: ERROR_KIND.PARSE,
          status: response.status
        });
      }
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (payload.success === true) {
        // 统一外壳的成功响应取 `data` 字段。
        // 注意：`/api/calculate` 是扁平结构（结果字段直接在顶层），
        // 且后端实现可能额外附带 `"data": null`；因此当 `data` 缺失或为 null 时，
        // 直接返回整个响应体，由调用方读取顶层的 expression / result / display_result。
        if ('data' in payload && payload.data !== null && payload.data !== undefined) {
          return payload.data;
        }
        return payload;
      }
      throw new ApiError(payload.message || `请求失败（HTTP ${response.status}）`, {
        kind: ERROR_KIND.BACKEND,
        errorCode: payload.error_code || '',
        status: response.status,
        expression: typeof payload.expression === 'string' ? payload.expression : '',
        payload
      });
    }

    if (!response.ok) {
      throw new ApiError(`请求失败（HTTP ${response.status}）`, {
        kind: ERROR_KIND.HTTP,
        status: response.status,
        payload
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) {
      throw new ApiError(`请求超时（${timeout} 毫秒），后端未及时响应`, { kind: ERROR_KIND.TIMEOUT });
    }
    if (externalAborted) {
      throw new ApiError('请求已取消', { kind: ERROR_KIND.ABORT });
    }
    // 其余情况基本都是 fetch 的网络层失败：无法连接后端服务，请确认后端已启动
    throw new ApiError('无法连接后端服务，请确认后端已启动', {
      kind: ERROR_KIND.NETWORK,
      errorCode: 'NETWORK_ERROR'
    });
  } finally {
    clearTimeout(timer);
    if (externalSignal && typeof externalSignal.removeEventListener === 'function') {
      externalSignal.removeEventListener('abort', abortFromOutside);
    }
  }
}

/**
 * 后端接口集合。所有方法都会在失败时抛出 {@link ApiError}。
 */
export const api = {
  /**
   * 健康检查。
   * @returns {Promise<{status: string, service: string, version: string, time: string}>}
   */
  health() {
    return request('/health');
  },

  /**
   * 获取常量与科学函数元数据（前端据此动态渲染科学面板）。
   * @returns {Promise<{constants: Array<object>, functions: Array<object>}>}
   */
  getMeta() {
    return request('/meta/functions');
  },

  /**
   * 提交表达式给后端计算（结果只来自后端）。
   * @param {string} expression 表达式（前端已把 × ÷ 等统一转成后端字符）
   * @param {boolean} [persist] 是否写入历史，默认 true；false 表示只试算（实时预览）
   * @param {AbortSignal|null} [signal] 取消信号
   * @returns {Promise<{success: boolean, expression: string, result: any, display_result: string, record: object|null}>}
   */
  calculate(expression, persist, signal) {
    return request('/calculate', {
      method: 'POST',
      body: { expression, persist: persist !== false },
      signal: signal || null
    });
  },

  /**
   * 查询计算历史（分页 / 关键字 / 日期区间 / 仅收藏 / 排序）。
   * @param {object} [query] 查询参数
   * @returns {Promise<{items: Array<object>, total: number, page: number, page_size: number, total_pages: number}>}
   */
  getHistory(query) {
    return request('/history', { query: query || null });
  },

  /**
   * 获取计算统计。
   * @returns {Promise<object>}
   */
  getStatistics() {
    return request('/history/statistics');
  },

  /**
   * 查询单条历史。
   * @param {number|string} id 记录 ID
   * @returns {Promise<object>}
   */
  getHistoryItem(id) {
    return request(`/history/${encodeURIComponent(String(id))}`);
  },

  /**
   * 删除单条历史。
   * @param {number|string} id 记录 ID
   * @returns {Promise<{deleted_id: number}>}
   */
  deleteHistoryItem(id) {
    return request(`/history/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
  },

  /**
   * 清空全部历史。
   * @returns {Promise<{deleted: number}>}
   */
  clearHistory() {
    return request('/history', { method: 'DELETE' });
  },

  /**
   * 收藏 / 取消收藏（不传 is_favorite 时后端切换）。
   * @param {number|string} id 记录 ID
   * @param {boolean} [isFavorite] 目标收藏状态
   * @returns {Promise<object>} 更新后的记录
   */
  setFavorite(id, isFavorite) {
    const body = typeof isFavorite === 'boolean' ? { is_favorite: isFavorite } : {};
    return request(`/history/${encodeURIComponent(String(id))}/favorite`, { method: 'PATCH', body });
  }
};

export default api;
