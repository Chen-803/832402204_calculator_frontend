/**
 * history.js —— 历史记录相关接口
 *
 * 契约来源：docs/API_CONTRACT.md
 * - GET    /api/history                     （4.2 查询历史：keyword / page / pageSize / onlyFavorite / order）
 * - DELETE /api/history/{id}                （4.3 删除指定历史）
 * - DELETE /api/history                     （4.4 清空全部历史）
 * - PATCH  /api/history/{id}/favorite       （4.5 切换收藏）
 */
import { http } from '@/api/http';

/**
 * 查询历史记录。
 *
 * @param {object} params
 * @param {string} [params.keyword]       按表达式或结果模糊搜索
 * @param {number} [params.page]          页码，从 1 开始
 * @param {number} [params.pageSize]      每页条数，1..100
 * @param {boolean} [params.onlyFavorite] 只看收藏
 * @param {'desc'|'asc'} [params.order]   时间排序，默认 desc
 * @returns {Promise<object>} { total, page, pageSize, totalPages, items }
 */
export function listHistory(params = {}) {
  const { keyword = '', page = 1, pageSize = 10, onlyFavorite = false, order = 'desc' } = params;
  return http.get('/api/history', {
    query: { keyword, page, pageSize, onlyFavorite, order },
  });
}

/**
 * 删除指定历史记录。
 *
 * @param {number|string} id 历史记录 ID
 * @returns {Promise<object>} { deleted, id }
 */
export function removeHistory(id) {
  return http.delete(`/api/history/${id}`);
}

/**
 * 清空全部历史记录。
 *
 * @returns {Promise<object>} { deleted }
 */
export function clearAllHistory() {
  return http.delete('/api/history');
}

/**
 * 切换收藏状态。
 *
 * @param {number|string} id 历史记录 ID
 * @param {boolean} [favorite] 目标状态；省略时后端取反
 * @returns {Promise<object>} { id, favorite }
 */
export function toggleFavorite(id, favorite) {
  const body = favorite === undefined ? {} : { favorite };
  return http.patch(`/api/history/${id}/favorite`, body);
}
