<script setup>
/**
 * StatsPanel —— 计算统计
 * 数据来自后端 GET /api/stats；近七日柱状图用纯 CSS 绘制（不引入任何图表库）。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { getStats } from '@/api/calculator';
import { useHistory } from '@/composables/useHistory';

const props = defineProps({
  active: { type: Boolean, default: true },
});

const { revision } = useHistory();

const stats = ref(null);
const loading = ref(false);
const error = ref(null);

const operatorUsage = computed(() =>
  stats.value && Array.isArray(stats.value.operatorUsage) ? stats.value.operatorUsage : [],
);
const topExpressions = computed(() =>
  stats.value && Array.isArray(stats.value.topExpressions) ? stats.value.topExpressions : [],
);
const recentSevenDays = computed(() =>
  stats.value && Array.isArray(stats.value.recentSevenDays) ? stats.value.recentSevenDays : [],
);

const totalCount = computed(() => (stats.value ? stats.value.totalCount ?? 0 : 0));
const todayCount = computed(() => (stats.value ? stats.value.todayCount ?? 0 : 0));
const favoriteCount = computed(() => (stats.value ? stats.value.favoriteCount ?? 0 : 0));

const maxDayCount = computed(() =>
  recentSevenDays.value.reduce((max, day) => Math.max(max, Number(day.count) || 0), 0),
);
const maxOperatorCount = computed(() =>
  operatorUsage.value.reduce((max, item) => Math.max(max, Number(item.count) || 0), 0),
);

/** 纯展示用：把后端返回的计数映射成 CSS 高度/宽度百分比（不是业务计算） */
function toPercent(count, max) {
  const value = Number(count) || 0;
  if (!max || value <= 0) {
    return 0;
  }
  return Math.round((value / max) * 100);
}

/** 纯展示用：2026-10-05 → 10-05 */
function shortDate(date) {
  return String(date ?? '').slice(5);
}

async function loadStats() {
  loading.value = true;
  error.value = null;
  try {
    stats.value = await getStats();
  } catch (err) {
    error.value = { message: err.message, network: Boolean(err.network) };
  } finally {
    loading.value = false;
  }
}

onMounted(loadStats);

// 切到统计标签页时刷新
watch(
  () => props.active,
  (value) => {
    if (value) {
      loadStats();
    }
  },
);

// 计算 / 删除 / 收藏后刷新（仅在面板可见时）
watch(revision, () => {
  if (props.active) {
    loadStats();
  }
});
</script>

<template>
  <section class="panel stats">
    <header class="panel__head">
      <h2 class="panel__title">计算统计</h2>
      <button class="btn btn--ghost btn--sm" type="button" data-testid="stats-refresh" :disabled="loading" @click="loadStats">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </header>

    <p v-if="error" class="error-banner error-banner--inline" data-testid="stats-error" role="alert">
      <span class="error-banner__icon" aria-hidden="true">!</span>
      <span class="error-banner__text">{{ error.message }}</span>
      <button class="btn btn--ghost btn--sm" type="button" @click="loadStats">重试</button>
    </p>

    <div class="stats__cards">
      <div class="stat-card stat-card--primary">
        <span class="stat-card__label">累计计算次数</span>
        <strong class="stat-card__value" data-testid="stats-total">{{ totalCount }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">今日计算</span>
        <strong class="stat-card__value" data-testid="stats-today">{{ todayCount }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">收藏条数</span>
        <strong class="stat-card__value" data-testid="stats-favorite">{{ favoriteCount }}</strong>
      </div>
    </div>

    <section class="stats__block">
      <h3 class="stats__block-title">近七日计算次数</h3>
      <div v-if="recentSevenDays.length" class="chart" data-testid="stats-chart">
        <div v-for="day in recentSevenDays" :key="day.date" class="chart__column">
          <span class="chart__count">{{ day.count }}</span>
          <div class="chart__track">
            <div class="chart__bar" :style="{ height: `${toPercent(day.count, maxDayCount)}%` }"></div>
          </div>
          <span class="chart__label">{{ shortDate(day.date) }}</span>
        </div>
      </div>
      <p v-else class="stats__empty">暂无数据</p>
    </section>

    <section class="stats__block">
      <h3 class="stats__block-title">运算符使用分布</h3>
      <ul v-if="operatorUsage.length" class="bars" data-testid="stats-operators">
        <li v-for="item in operatorUsage" :key="item.operator" class="bars__row">
          <span class="bars__key">{{ item.operator }}</span>
          <div class="bars__track">
            <div class="bars__fill" :style="{ width: `${toPercent(item.count, maxOperatorCount)}%` }"></div>
          </div>
          <span class="bars__value">{{ item.count }}</span>
        </li>
      </ul>
      <p v-else class="stats__empty">暂无数据</p>
    </section>

    <section class="stats__block">
      <h3 class="stats__block-title">高频表达式</h3>
      <ul v-if="topExpressions.length" class="top-list" data-testid="stats-top-expressions">
        <li v-for="item in topExpressions" :key="item.expression" class="top-list__row">
          <code class="top-list__expression">{{ item.expression }}</code>
          <span class="top-list__count">{{ item.count }} 次</span>
        </li>
      </ul>
      <p v-else class="stats__empty">暂无数据</p>
    </section>
  </section>
</template>
