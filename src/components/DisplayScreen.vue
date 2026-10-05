<script setup>
/**
 * DisplayScreen —— 显示屏
 * 上行显示当前表达式，下行显示**后端返回**的结果；
 * 后端返回 success:false 时，把后端的 message 用红色错误条显著展示。
 */
import { computed } from 'vue';

const props = defineProps({
  expression: { type: String, default: '' },
  /** 后端返回的结果对象：{ resultText, normalizedExpression, historyId, createdAt, elapsedMs } */
  result: { type: Object, default: null },
  /** 错误对象：{ message, code, network } */
  error: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

defineEmits(['copy']);

const expressionText = computed(() => props.expression || '0');
const resultText = computed(() => (props.result ? props.result.resultText : '0'));

const showNormalized = computed(() => {
  if (!props.result) {
    return false;
  }
  const normalized = props.result.normalizedExpression;
  return Boolean(normalized) && normalized !== props.expression;
});

const metaText = computed(() => {
  if (!props.result) {
    return '';
  }
  const parts = [];
  if (props.result.elapsedMs !== null && props.result.elapsedMs !== undefined) {
    parts.push(`后端耗时 ${props.result.elapsedMs} ms`);
  }
  if (props.result.historyId !== null) {
    parts.push(`历史记录 #${props.result.historyId}`);
  }
  if (props.result.createdAt) {
    parts.push(props.result.createdAt);
  }
  return parts.join(' · ');
});
</script>

<template>
  <div class="display" :class="{ 'display--error': Boolean(error) }">
    <div class="display__screen">
      <div class="display__line">
        <span class="display__tag">表达式</span>
        <span class="display__expression" data-testid="display-expression">{{ expressionText }}</span>
      </div>
      <div class="display__line display__line--result">
        <span class="display__tag">结果</span>
        <span class="display__result" data-testid="display-result">{{ resultText }}</span>
        <button
          v-if="result"
          class="btn btn--ghost btn--sm display__copy"
          type="button"
          data-testid="btn-copy"
          title="复制结果到剪贴板"
          @click="$emit('copy')"
        >
          复制
        </button>
      </div>
    </div>

    <p v-if="showNormalized" class="display__meta">后端归一化：{{ result.normalizedExpression }}</p>
    <p v-if="metaText" class="display__meta">{{ metaText }}</p>
    <p v-if="loading" class="display__meta display__meta--loading">正在请求后端计算…</p>

    <p v-if="error" class="error-banner" data-testid="error-banner" role="alert">
      <span class="error-banner__icon" aria-hidden="true">!</span>
      <span class="error-banner__text">{{ error.message }}</span>
      <span v-if="error.code > 0" class="error-banner__code">错误码 {{ error.code }}</span>
    </p>
  </div>
</template>
