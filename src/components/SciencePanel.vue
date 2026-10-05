<script setup>
/**
 * SciencePanel —— 科学计算面板
 * 所有函数按钮只把符号追加到表达式里（例如 sin( ），真正的计算交给后端 POST /api/calculate。
 * 角度制（DEG/RAD）由计算器面板顶部的 angle-mode 按钮切换，会随计算请求一起发送给后端。
 */
import { computed } from 'vue';
import KeypadButton from '@/components/KeypadButton.vue';
import { useCalculator } from '@/composables/useCalculator';

const { angleMode, append } = useCalculator();

/** 函数按钮：token 为追加到表达式的文本；π 按钮追加的是后端支持常量 pi */
const GROUPS = [
  {
    title: '三角函数',
    keys: [
      { label: 'sin', testid: 'sci-sin', token: 'sin(' },
      { label: 'cos', testid: 'sci-cos', token: 'cos(' },
      { label: 'tan', testid: 'sci-tan', token: 'tan(' },
      { label: 'asin', testid: 'sci-asin', token: 'asin(' },
      { label: 'acos', testid: 'sci-acos', token: 'acos(' },
      { label: 'atan', testid: 'sci-atan', token: 'atan(' },
    ],
  },
  {
    title: '双曲函数',
    keys: [
      { label: 'sinh', testid: 'sci-sinh', token: 'sinh(' },
      { label: 'cosh', testid: 'sci-cosh', token: 'cosh(' },
      { label: 'tanh', testid: 'sci-tanh', token: 'tanh(' },
    ],
  },
  {
    title: '对数与指数',
    keys: [
      { label: 'ln', testid: 'sci-ln', token: 'ln(' },
      { label: 'log', testid: 'sci-log', token: 'log(' },
      { label: 'log2', testid: 'sci-log2', token: 'log2(' },
      { label: 'lg', testid: 'sci-lg', token: 'lg(' },
      { label: 'exp', testid: 'sci-exp', token: 'exp(' },
    ],
  },
  {
    title: '幂与根号',
    keys: [
      { label: 'x²', testid: 'sci-pow2', token: '^2' },
      { label: 'xʸ', testid: 'sci-pow', token: '^' },
      { label: '√', testid: 'sci-sqrt', token: 'sqrt(' },
      { label: '∛', testid: 'sci-cbrt', token: 'cbrt(' },
      { label: 'pow', testid: 'sci-pow-fn', token: 'pow(' },
    ],
  },
  {
    title: '取整与其它',
    keys: [
      { label: 'abs', testid: 'sci-abs', token: 'abs(' },
      { label: 'floor', testid: 'sci-floor', token: 'floor(' },
      { label: 'ceil', testid: 'sci-ceil', token: 'ceil(' },
      { label: 'round', testid: 'sci-round', token: 'round(' },
      { label: 'sign', testid: 'sci-sign', token: 'sign(' },
      { label: 'max', testid: 'sci-max', token: 'max(' },
      { label: 'min', testid: 'sci-min', token: 'min(' },
      { label: 'fact', testid: 'sci-fact', token: 'fact(' },
    ],
  },
  {
    title: '常量与运算符',
    keys: [
      { label: 'π', testid: 'sci-pi', token: 'pi' },
      { label: 'e', testid: 'sci-e', token: 'e' },
      { label: '!', testid: 'sci-factorial', token: '!' },
      { label: '%', testid: 'sci-percent', token: '%' },
      { label: 'mod', testid: 'sci-mod', token: ' mod ' },
      { label: '(', testid: 'sci-lparen', token: '(' },
      { label: ')', testid: 'sci-rparen', token: ')' },
    ],
  },
];

const angleHint = computed(() => `当前角度制：${angleMode.value.toUpperCase()}（切换后重新计算会一起发送给后端）`);
</script>

<template>
  <section class="panel science">
    <header class="panel__head">
      <h2 class="panel__title">科学计算</h2>
      <span class="panel__subtitle" data-testid="sci-angle-mode">{{ angleHint }}</span>
    </header>

    <p class="science__note">
      点击按钮只会把符号追加到左侧表达式，<strong>计算全部由后端完成</strong>。
    </p>

    <div v-for="group in GROUPS" :key="group.title" class="science__group">
      <h3 class="science__group-title">{{ group.title }}</h3>
      <div class="science__keys">
        <KeypadButton
          v-for="key in group.keys"
          :key="key.testid"
          :label="key.label"
          :testid="key.testid"
          variant="sci"
          @press="append(key.token)"
        />
      </div>
    </div>
  </section>
</template>
