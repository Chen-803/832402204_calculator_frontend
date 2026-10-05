<script setup>
/**
 * App —— 页面骨架
 * 顶栏 + 左侧计算器 + 右侧标签面板（科学计算 / 历史记录 / 统计 / 转换）+ 页脚 + 轻提示。
 *
 * 本组件只负责布局、键盘快捷键绑定与后端健康检查；
 * 所有计算结果都由后端接口产生，前端不做任何表达式求值。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import CalculatorPanel from '@/components/CalculatorPanel.vue';
import ConverterPanel from '@/components/ConverterPanel.vue';
import HistoryPanel from '@/components/HistoryPanel.vue';
import SciencePanel from '@/components/SciencePanel.vue';
import StatsPanel from '@/components/StatsPanel.vue';
import ToastMessage from '@/components/ToastMessage.vue';
import { BASE_URL } from '@/api/http';
import { useCalculator } from '@/composables/useCalculator';
import { useKeyboard } from '@/composables/useKeyboard';

/** 后端健康检查间隔（毫秒） */
const HEALTH_INTERVAL = 20000;

const TABS = [
  { key: 'science', label: '科学计算', testid: 'tab-science' },
  { key: 'history', label: '历史记录', testid: 'tab-history' },
  { key: 'stats', label: '统计', testid: 'tab-stats' },
  { key: 'convert', label: '转换', testid: 'tab-convert' },
];

const apiBaseUrl = BASE_URL;

const { backendOnline, checkBackend, append, backspace, clearAll, calculate } = useCalculator();

/** 默认展示历史记录面板（右侧），科学计算 / 统计 / 转换通过标签页切换 */
const activeTab = ref('history');
const previousTab = ref('science');

function selectTab(key) {
  if (key === activeTab.value) {
    return;
  }
  previousTab.value = activeTab.value;
  activeTab.value = key;
}

/** Ctrl+H：显示 / 隐藏历史面板（隐藏时回到上一次查看的面板） */
function toggleHistoryTab() {
  if (activeTab.value === 'history') {
    activeTab.value = previousTab.value === 'history' ? 'science' : previousTab.value;
    return;
  }
  previousTab.value = activeTab.value;
  activeTab.value = 'history';
}

useKeyboard({
  onInput: append,
  onCalculate: () => calculate(),
  onBackspace: backspace,
  onClear: clearAll,
  onToggleHistory: toggleHistoryTab,
});

let healthTimer = null;

onMounted(async () => {
  await checkBackend();
  healthTimer = setInterval(checkBackend, HEALTH_INTERVAL);
});

onBeforeUnmount(() => {
  if (healthTimer) {
    clearInterval(healthTimer);
  }
});
</script>

<template>
  <div class="app">
    <AppHeader :online="backendOnline" @recheck="checkBackend" />

    <main class="app__main">
      <div class="app__col app__col--calc">
        <CalculatorPanel />
      </div>

      <aside class="app__col app__col--side">
        <nav class="tabs" role="tablist" aria-label="功能面板">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            class="tab"
            :class="{ 'tab--active': activeTab === tab.key }"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            :data-testid="tab.testid"
            @click="selectTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div class="app__panels">
          <SciencePanel v-show="activeTab === 'science'" />
          <HistoryPanel v-show="activeTab === 'history'" :active="activeTab === 'history'" />
          <StatsPanel v-show="activeTab === 'stats'" :active="activeTab === 'stats'" />
          <ConverterPanel v-show="activeTab === 'convert'" :active="activeTab === 'convert'" />
        </div>
      </aside>
    </main>

    <footer class="app__footer">
      <span>
        所有计算结果均由后端 <code>POST /api/calculate</code> 产生并返回，前端不含任何表达式求值逻辑。
      </span>
      <span class="app__footer-meta">后端地址：{{ apiBaseUrl }}</span>
    </footer>

    <ToastMessage />
  </div>
</template>
