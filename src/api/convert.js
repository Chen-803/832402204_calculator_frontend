/**
 * convert.js —— 进制转换与单位换算接口
 *
 * 契约来源：docs/API_CONTRACT.md
 * - POST /api/convert/base   （4.7 进制转换）
 * - GET  /api/convert/units  （4.8 单位类别与单位定义）
 * - POST /api/convert/unit   （4.9 单位换算）
 *
 * 注意：换算结果全部由后端计算并返回，前端不内置任何换算系数、不实现进制算法。
 */
import { http } from '@/api/http';

/**
 * 进制转换。
 *
 * @param {string} value  待转换的值，允许带符号与小数点
 * @param {number} fromBase 源进制，2..36
 * @param {number} toBase   目标进制，2..36
 * @returns {Promise<object>} { input, fromBase, toBase, output, decimalValue }
 */
export function convertBase(value, fromBase, toBase) {
  return http.post('/api/convert/base', { value, fromBase, toBase });
}

/**
 * 获取单位类别与单位定义（用于下拉框）。
 *
 * @returns {Promise<object>} { categories: [{ key, name, units: [{ key, name }] }] }
 */
export function getUnits() {
  return http.get('/api/convert/units');
}

/**
 * 单位换算。
 *
 * @param {string} category 类别 key，例如 "length"
 * @param {string} from     源单位 key，例如 "m"
 * @param {string} to       目标单位 key，例如 "km"
 * @param {number|string} value 待换算数值
 * @returns {Promise<object>} { category, from, to, value, output, outputText }
 */
export function convertUnit(category, from, to, value) {
  return http.post('/api/convert/unit', { category, from, to, value });
}
