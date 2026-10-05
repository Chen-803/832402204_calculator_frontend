<script setup>
/**
 * AppHeader —— 页面顶栏
 * 标题、副标题、后端连接状态指示灯（可点击重新检测）、主题切换按钮。
 */
import { computed } from 'vue';
import { useTheme } from '@/composables/useTheme';

const props = defineProps({
  /** 后端连接状态：null 未检测 / true 在线 / false 离线 */
  online: { type: Boolean, default: null },
});

const emit = defineEmits(['recheck']);

const { themeIcon, themeLabel, toggleTheme } = useTheme();

const connText = computed(() => {
  if (props.online === true) {
    return '后端已连接';
  }
  if (props.online === false) {
    return '无法连接后端服务';
  }
  return '正在检测后端…';
});

const connClass = computed(() => {
  if (props.online === true) {
    return 'conn--online';
  }
  if (props.online === false) {
    return 'conn--offline';
  }
  return 'conn--unknown';
});
</script>

<template>
  <header class="app-header">
    <div class="app-header__brand">
      <span class="app-header__logo" aria-hidden="true">=</span>
      <div class="app-header__titles">
        <h1 class="app-header__title">前后端分离计算器系统</h1>
        <p class="app-header__subtitle">学号 832402204 · 陈俊洁</p>
      </div>
    </div>

    <div class="app-header__actions">
      <button
        class="conn"
        :class="connClass"
        type="button"
        data-testid="conn-status"
        :title="`${connText}，点击重新检测`"
        @click="emit('recheck')"
      >
        <span class="conn__dot" aria-hidden="true"></span>
        <span class="conn__text">{{ connText }}</span>
      </button>

      <button
        class="btn btn--ghost"
        type="button"
        data-testid="theme-toggle"
        :title="themeLabel"
        @click="toggleTheme"
      >
        <span class="btn__icon" aria-hidden="true">{{ themeIcon }}</span>
        <span>{{ themeLabel }}</span>
      </button>
    </div>
  </header>
</template>
