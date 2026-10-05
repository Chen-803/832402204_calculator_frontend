<script setup>
/**
 * CalculatorPanel —— 计算器主面板
 * 显示屏 + 表达式输入框 + 键盘 + 角度制切换。
 * 本组件只负责把按键拼成表达式字符串，真正的计算由 useCalculator -> 后端完成。
 */
import { computed } from 'vue';
import DisplayScreen from '@/components/DisplayScreen.vue';
import KeypadButton from '@/components/KeypadButton.vue';
import { useCalculator } from '@/composables/useCalculator';
import { useToast } from '@/composables/useToast';
import { copyText } from '@/utils/clipboard';

const {
  expression,
  result,
  error,
  loading,
  angleMode,
  append,
  backspace,
  clearAll,
  calculate,
  toggleAngleMode,
} = useCalculator();
const { toastSuccess, toastError, toastInfo } = useToast();

/**
 * 键盘布局（4 列）。
 * token：追加到表达式末尾的符号（纯字符串拼接）；
 * action：需要特殊处理的动作（清空 / 退格 / 计算）。
 */
const KEYS = [
  { label: 'C', testid: 'btn-clear', variant: 'danger', action: 'clear', title: '清空（Esc）' },
  { label: '(', testid: 'key-lparen', variant: 'op', token: '(' },
  { label: ')', testid: 'key-rparen', variant: 'op', token: ')' },
  { label: '⌫', testid: 'btn-backspace', variant: 'fn', action: 'backspace', title: '退格（Backspace）' },

  { label: '7', testid: 'key-7', token: '7' },
  { label: '8', testid: 'key-8', token: '8' },
  { label: '9', testid: 'key-9', token: '9' },
  { label: '÷', testid: 'key-div', variant: 'op', token: '÷', title: '除' },

  { label: '4', testid: 'key-4', token: '4' },
  { label: '5', testid: 'key-5', token: '5' },
  { label: '6', testid: 'key-6', token: '6' },
  { label: '×', testid: 'key-mul', variant: 'op', token: '×', title: '乘' },

  { label: '1', testid: 'key-1', token: '1' },
  { label: '2', testid: 'key-2', token: '2' },
  { label: '3', testid: 'key-3', token: '3' },
  { label: '-', testid: 'key-sub', variant: 'op', token: '-', title: '减' },

  { label: '±', testid: 'btn-sign', variant: 'fn', action: 'sign', title: '正负号' },
  { label: '0', testid: 'key-0', token: '0' },
  { label: '.', testid: 'key-dot', token: '.' },
  { label: '+', testid: 'key-add', variant: 'op', token: '+', title: '加' },

  { label: '=', testid: 'btn-equals', variant: 'equals', action: 'equals', wide: true, title: '计算结果（Enter）' },
];

const angleTitle = computed(
  () => `当前角度制 ${angleMode.value.toUpperCase()}，点击切换 DEG / RAD`,
);

function onKeyPress(key) {
  if (key.action === 'clear') {
    clearAll();
    return;
  }
  if (key.action === 'backspace') {
    backspace();
    return;
  }
  if (key.action === 'equals') {
    calculate();
    return;
  }
  if (key.action === 'sign') {
    toggleSign();
    return;
  }
  append(key.token);
}

/** 正负号：只做字符串首部的 +- 拼接/移除，不做任何数值运算 */
function toggleSign() {
  if (expression.value.startsWith('-')) {
    expression.value = expression.value.slice(1);
    return;
  }
  expression.value = `-${expression.value}`;
}

async function onCopyResult() {
  const text = result.value ? result.value.resultText : '';
  if (!text) {
    toastInfo('还没有可复制的结果');
    return;
  }
  const succeeded = await copyText(text);
  if (succeeded) {
    toastSuccess(`已复制结果：${text}`);
  } else {
    toastError('复制失败，请手动选中结果复制');
  }
}
</script>

<template>
  <section class="panel calc">
    <header class="panel__head">
      <h2 class="panel__title">计算器</h2>
      <button
        class="angle-toggle"
        type="button"
        data-testid="angle-mode"
        :title="angleTitle"
        @click="toggleAngleMode"
      >
        角度制 <strong>{{ angleMode.toUpperCase() }}</strong>
      </button>
    </header>

    <DisplayScreen
      :expression="expression"
      :result="result"
      :error="error"
      :loading="loading"
      @copy="onCopyResult"
    />

    <div class="calc__input-row">
      <input
        v-model="expression"
        class="input calc__input"
        type="text"
        data-testid="expression-input"
        placeholder="输入或点击按键拼接表达式，例如 (1+2)*3、sin(30)+2^3"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        class="btn btn--primary"
        type="button"
        data-testid="btn-calculate"
        :disabled="loading"
        @click="calculate"
      >
        {{ loading ? '计算中…' : '计算' }}
      </button>
    </div>

    <div class="keypad">
      <KeypadButton
        v-for="key in KEYS"
        :key="key.testid"
        :label="key.label"
        :testid="key.testid"
        :variant="key.variant || 'num'"
        :title="key.title || ''"
        :wide="Boolean(key.wide)"
        @press="onKeyPress(key)"
      />
    </div>

    <p class="calc__hint">
      快捷键：0-9 . + - * / ( ) ^ !　Enter 计算　Backspace 退格　Esc 清空　Ctrl+H 显示/隐藏历史　P 输入 π
    </p>
  </section>
</template>
