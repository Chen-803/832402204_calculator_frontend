<script setup>
/**
 * ToastMessage —— 轻提示（全局唯一实例）
 * 文案来源：操作成功提示，或后端返回的错误 message。
 */
import { useToast } from '@/composables/useToast';

const { toasts, removeToast } = useToast();

function iconOf(type) {
  if (type === 'success') {
    return '✓';
  }
  if (type === 'error') {
    return '!';
  }
  return 'i';
}
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-stack" aria-live="polite">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="`toast--${toast.type}`"
      data-testid="toast"
      role="status"
      @click="removeToast(toast.id)"
    >
      <span class="toast__icon" aria-hidden="true">{{ iconOf(toast.type) }}</span>
      <span class="toast__text">{{ toast.message }}</span>
    </div>
  </TransitionGroup>
</template>
