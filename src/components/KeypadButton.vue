<script setup>
/**
 * KeypadButton —— 计算器按键
 * 支持普通数字键、运算符键、功能键、等号键四种样式，按下时有物理感（CSS :active）。
 */
const props = defineProps({
  label: { type: String, required: true },
  /** 稳定的自动化测试钩子，例如 key-7 / btn-equals */
  testid: { type: String, required: true },
  /** num | op | fn | equals | danger | sci */
  variant: { type: String, default: 'num' },
  title: { type: String, default: '' },
  /** 是否占两格宽 */
  wide: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['press']);

function handleClick() {
  if (props.disabled) {
    return;
  }
  emit('press');
}
</script>

<template>
  <button
    class="key"
    :class="[`key--${variant}`, { 'key--wide': wide }]"
    type="button"
    :data-testid="testid"
    :title="title || label"
    :disabled="disabled"
    @click="handleClick"
  >
    {{ label }}
  </button>
</template>
