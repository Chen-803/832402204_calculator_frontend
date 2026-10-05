<script setup>
/**
 * HistoryPanel —— 历史记录面板
 * 搜索关键字、分页、只看收藏、排序、删除、清空（二次确认）、点击回填。
 * 所有数据都来自后端 GET /api/history；删除 / 清空 / 收藏成功后都会重新拉取列表。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import HistoryItem from '@/components/HistoryItem.vue';
import { useCalculator } from '@/composables/useCalculator';
import { useHistory } from '@/composables/useHistory';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  /** 面板是否处于激活（可见）状态：切回本面板时刷新一次列表 */
  active: { type: Boolean, default: true },
});

const {
  items,
  total,
  pageSize,
  onlyFavorite,
  order,
  loading,
  error,
  pageInfo,
  isEmpty,
  hasPrev,
  hasNext,
  load,
  search,
  goPrev,
  goNext,
  setPageSize,
  setOnlyFavorite,
  setOrder,
  removeItem,
  clearAll,
  toggleFavorite,
} = useHistory();
const { setExpression } = useCalculator();
const { toastInfo } = useToast();

const keywordInput = ref('');
const confirmVisible = ref(false);
let searchTimer = null;

/** 输入即搜索（300ms 防抖），避免每敲一个字符都打后端 */
function onKeywordInput() {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => {
    search(keywordInput.value);
  }, 300);
}

function onSearchNow() {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  search(keywordInput.value);
}

/** 点击历史条目：把表达式回填到输入框（不计算，计算需用户再点 =） */
function onUse(item) {
  setExpression(item.expression);
  toastInfo(`已回填表达式：${item.expression}`);
}

function onAskClear() {
  if (!total.value) {
    return;
  }
  confirmVisible.value = true;
}

async function onConfirmClear() {
  confirmVisible.value = false;
  await clearAll();
}

// 首次挂载即拉取历史（GET /api/history）
onMounted(() => {
  load();
});

// 从其它标签页切回历史面板时刷新一次
watch(
  () => props.active,
  (value) => {
    if (value) {
      load();
    }
  },
);

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <section class="panel history">
    <header class="panel__head">
      <h2 class="panel__title">历史记录</h2>
      <span class="panel__subtitle">来自后端 GET /api/history</span>
    </header>

    <div class="history__toolbar">
      <div class="history__search">
        <input
          v-model="keywordInput"
          class="input"
          type="search"
          data-testid="history-search"
          placeholder="搜索表达式或结果…"
          autocomplete="off"
          @input="onKeywordInput"
          @keydown.enter.prevent="onSearchNow"
        />
        <button class="btn btn--ghost" type="button" data-testid="history-search-btn" @click="onSearchNow">
          搜索
        </button>
      </div>

      <div class="history__filters">
        <label class="switch">
          <input
            v-model="onlyFavorite"
            type="checkbox"
            data-testid="history-only-favorite"
            @change="setOnlyFavorite(onlyFavorite)"
          />
          <span>只看收藏</span>
        </label>

        <select v-model="order" class="select" data-testid="history-order" @change="setOrder(order)">
          <option value="desc">最新优先</option>
          <option value="asc">最早优先</option>
        </select>

        <select
          v-model.number="pageSize"
          class="select"
          data-testid="history-page-size"
          @change="setPageSize(pageSize)"
        >
          <option :value="10">每页 10 条</option>
          <option :value="20">每页 20 条</option>
          <option :value="50">每页 50 条</option>
        </select>

        <button
          class="btn btn--danger-ghost"
          type="button"
          data-testid="history-clear-all"
          :disabled="!total"
          @click="onAskClear"
        >
          清空全部
        </button>
      </div>
    </div>

    <p v-if="error" class="error-banner error-banner--inline" data-testid="history-error" role="alert">
      <span class="error-banner__icon" aria-hidden="true">!</span>
      <span class="error-banner__text">{{ error.message }}</span>
      <button class="btn btn--ghost btn--sm" type="button" @click="load()">重试</button>
    </p>

    <ul class="history__list" data-testid="history-list">
      <HistoryItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        @use="onUse"
        @remove="removeItem(item.id)"
        @toggle-favorite="toggleFavorite(item)"
      />
    </ul>

    <p v-if="loading" class="history__state">正在加载历史…</p>
    <p v-else-if="isEmpty" class="history__state">暂无历史记录，先在左侧计算一次吧。</p>

    <footer class="history__pager">
      <button
        class="btn btn--ghost"
        type="button"
        data-testid="history-prev"
        :disabled="!hasPrev || loading"
        @click="goPrev"
      >
        上一页
      </button>
      <span class="history__page-info" data-testid="history-page-info">{{ pageInfo }}</span>
      <button
        class="btn btn--ghost"
        type="button"
        data-testid="history-next"
        :disabled="!hasNext || loading"
        @click="goNext"
      >
        下一页
      </button>
    </footer>

    <div v-if="confirmVisible" class="modal" data-testid="clear-confirm">
      <div class="modal__dialog">
        <h3 class="modal__title">确认清空全部历史？</h3>
        <p class="modal__text">
          将调用后端接口删除全部 {{ total }} 条历史记录，删除后不可恢复。
        </p>
        <div class="modal__actions">
          <button class="btn btn--ghost" type="button" data-testid="clear-confirm-cancel" @click="confirmVisible = false">
            取消
          </button>
          <button class="btn btn--danger" type="button" data-testid="clear-confirm-ok" @click="onConfirmClear">
            确认清空
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
