/**
 * calculator.js —— 计算与统计相关接口
 *
 * 契约来源：docs/API_CONTRACT.md
 * - POST /api/calculate  （4.1 核心：表达式计算，结果由后端产生）
 * - GET  /api/stats      （4.6 计算统计）
 * - GET  /api/health     （4.10 健康检查）
 */
import { http } from '@/api/http';

/**
 * 请求后端计算表达式。
 * 前端只发送表达式原文与角度制，绝不在本地求值。
 *
 * @param {string} expression 表达式原文，例如 "(1+2)*3"
 * @param {'deg'|'rad'} angleMode 角度制，默认 "deg"
 * @returns {Promise<object>} { expression, normalizedExpression, result, resultText, historyId, createdAt, elapsedMs }
 */
export function calculate(expression, angleMode = 'deg') {
  return http.post('/api/calculate', { expression, angleMode });
}

/**
 * 获取计算统计。
 *
 * @returns {Promise<object>} { totalCount, todayCount, favoriteCount, operatorUsage, topExpressions, recentSevenDays }
 */
export function getStats() {
  return http.get('/api/stats');
}

/**
 * 后端健康检查（用于顶栏连接状态指示灯）。
 *
 * @returns {Promise<object>} { service, version, database, time }
 */
export function checkHealth() {
  return http.get('/api/health', { timeout: 5000 });
}
