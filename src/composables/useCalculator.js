/**
 * useCalculator.js —— 计算器核心状态（模块级单例）
 *
 * 【作业硬性约束】本文件**不含任何表达式求值逻辑**：
 * 前端只把用户点击 / 键入的符号拼成表达式字符串，然后调用后端 POST /api/calculate，
 * 并展示后端返回的 resultText；错误也直接展示后端返回的 message。
 */
import { computed, ref } from 'vue';
import { calculate as requestCalculate, checkHealth } from '@/api/calculator';
import { useHistory } from '@/composables/useHistory';

const expression = ref('');
const result = ref(null);
const error = ref(null);
const loading = ref(false);
/** 角度制：deg | rad，随计算请求一起发送给后端（由后端决定三角函数如何解释） */
const angleMode = ref('deg');
/** 后端连接状态：null 未检测 / true 在线 / false 离线 */
const backendOnline = ref(null);

/** 当前表达式（空表达式用 0 占位展示） */
const displayExpression = computed(() => expression.value || '0');
/** 后端返回的结果文本 */
const displayResult = computed(() => (result.value ? result.value.resultText : '—'));
const hasResult = computed(() => Boolean(result.value));
const canCalculate = computed(() => !loading.value);

/** 追加符号到表达式末尾（纯字符串拼接，不做任何计算） */
function append(token) {
  const text = String(token ?? '');
  if (!text) {
    return;
  }
  expression.value += text;
  error.value = null;
}

/** 退格：删除表达式最后一个字符 */
function backspace() {
  expression.value = expression.value.slice(0, -1);
  error.value = null;
}

/** 清空：表达式、结果、错误一起重置 */
function clearAll() {
  expression.value = '';
  result.value = null;
  error.value = null;
}

/** 回填表达式（点击历史条目时使用） */
function setExpression(text) {
  expression.value = String(text ?? '');
  result.value = null;
  error.value = null;
}

/** 切换角度制 DEG / RAD；切换后重新计算会把新的 angleMode 一起发给后端 */
function setAngleMode(mode) {
  angleMode.value = mode === 'rad' ? 'rad' : 'deg';
}

function toggleAngleMode() {
  setAngleMode(angleMode.value === 'deg' ? 'rad' : 'deg');
}

/** 把后端返回的结果字段整理成界面需要的结构 */
function normalizeResult(data) {
  return {
    resultText: String(data.resultText ?? ''),
    expression: data.expression ?? '',
    normalizedExpression: data.normalizedExpression ?? '',
    historyId: data.historyId ?? null,
    createdAt: data.createdAt ?? '',
    elapsedMs: data.elapsedMs ?? null,
  };
}

/**
 * 请求后端计算当前表达式。
 * 表达式原样发送（含 × ÷ π 等符号，后端按契约 5.3 归一化），前端不参与求值。
 */
async function calculate() {
  if (loading.value) {
    return null;
  }
  loading.value = true;
  error.value = null;
  try {
    const data = await requestCalculate(expression.value, angleMode.value);
    result.value = normalizeResult(data);
    backendOnline.value = true;
    // 需求 4：计算成功后自动刷新历史列表（并让统计面板感知数据变化）
    useHistory().notifyDataChanged();
    return data;
  } catch (err) {
    // 业务错误直接使用后端 message；网络层错误使用 http.js 约定的提示
    error.value = {
      message: err.message,
      code: err.code ?? -1,
      status: err.status ?? 0,
      network: Boolean(err.network),
    };
    result.value = null;
    if (err.network) {
      backendOnline.value = false;
    }
    return null;
  } finally {
    loading.value = false;
  }
}

/** 后端健康检查（顶栏指示灯） */
async function checkBackend() {
  try {
    await checkHealth();
    backendOnline.value = true;
    return true;
  } catch (err) {
    backendOnline.value = false;
    return false;
  }
}

export function useCalculator() {
  return {
    // 状态
    expression,
    result,
    error,
    loading,
    angleMode,
    backendOnline,
    // 派生
    displayExpression,
    displayResult,
    hasResult,
    canCalculate,
    // 行为
    append,
    backspace,
    clearAll,
    setExpression,
    setAngleMode,
    toggleAngleMode,
    calculate,
    checkBackend,
  };
}

export default useCalculator;
