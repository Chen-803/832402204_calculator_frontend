/**
 * useHistory.js —— 历史记录状态（模块级单例）
 *
 * 数据全部来自后端 GET /api/history；删除 / 清空 / 收藏后都会**重新拉取**列表，
 * 不在前端数组里做「假删除」。模块级单例保证计算器面板与历史面板共享同一份状态。
 */
import { computed, ref } from 'vue';
import { clearAllHistory, listHistory, removeHistory, toggleFavorite as requestToggleFavorite } from '@/api/history';
import { useToast } from '@/composables/useToast';

/** 默认每页条数（契约要求 1..100） */
const DEFAULT_PAGE_SIZE = 10;

const items = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const totalPages = ref(0);
const keyword = ref('');
const onlyFavorite = ref(false);
const order = ref('desc');
const loading = ref(false);
const error = ref(null);
/** 数据变更版本号：计算成功 / 删除 / 清空 / 收藏后自增，供统计面板感知刷新 */
const revision = ref(0);
let hasLoadedOnce = false;

const pageInfo = computed(() => `第 ${page.value} / ${Math.max(totalPages.value, 1)} 页 · 共 ${total.value} 条`);
const isEmpty = computed(() => !loading.value && items.value.length === 0);
const hasPrev = computed(() => page.value > 1);
const hasNext = computed(() => page.value < totalPages.value);

/** 拉取当前查询条件下的历史列表 */
async function load() {
  loading.value = true;
  error.value = null;
  try {
    const data = await listHistory({
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
      onlyFavorite: onlyFavorite.value,
      order: order.value,
    });
    items.value = Array.isArray(data.items) ? data.items : [];
    total.value = Number(data.total) || 0;
    totalPages.value = Number(data.totalPages) || 0;
    if (data.page) {
      page.value = Number(data.page);
    }
    hasLoadedOnce = true;
    return true;
  } catch (err) {
    error.value = { message: err.message, code: err.code ?? -1, network: Boolean(err.network) };
    items.value = [];
    total.value = 0;
    totalPages.value = 0;
    return false;
  } finally {
    loading.value = false;
  }
}

/** 搜索（重置到第 1 页后重新拉取） */
function search(value) {
  keyword.value = String(value ?? '').trim();
  page.value = 1;
  return load();
}

/** 跳转到指定页 */
function setPage(value) {
  const target = Number(value) || 1;
  const max = Math.max(totalPages.value, 1);
  const next = Math.min(Math.max(target, 1), max);
  if (next === page.value) {
    return Promise.resolve(true);
  }
  page.value = next;
  return load();
}

function goPrev() {
  return setPage(page.value - 1);
}

function goNext() {
  return setPage(page.value + 1);
}

function setPageSize(value) {
  pageSize.value = Number(value) || DEFAULT_PAGE_SIZE;
  page.value = 1;
  return load();
}

function setOnlyFavorite(value) {
  onlyFavorite.value = Boolean(value);
  page.value = 1;
  return load();
}

function toggleOnlyFavorite() {
  return setOnlyFavorite(!onlyFavorite.value);
}

function setOrder(value) {
  order.value = value === 'asc' ? 'asc' : 'desc';
  page.value = 1;
  return load();
}

function toggleOrder() {
  return setOrder(order.value === 'desc' ? 'asc' : 'desc');
}

/** 删除单条历史：调用 DELETE /api/history/{id}，成功后重新拉取列表 */
async function removeItem(id) {
  const { toastSuccess, toastError } = useToast();
  try {
    await removeHistory(id);
    // 删掉当前页最后一条时回退一页，避免停留在空页
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    await load();
    revision.value += 1;
    toastSuccess('删除成功');
    return true;
  } catch (err) {
    toastError(err.message);
    return false;
  }
}

/** 清空全部历史：调用 DELETE /api/history（界面侧有二次确认） */
async function clearAll() {
  const { toastSuccess, toastError } = useToast();
  try {
    const data = await clearAllHistory();
    page.value = 1;
    await load();
    revision.value += 1;
    toastSuccess(`已清空 ${data.deleted ?? 0} 条历史记录`);
    return true;
  } catch (err) {
    toastError(err.message);
    return false;
  }
}

/** 切换收藏：调用 PATCH /api/history/{id}/favorite，成功后重新拉取列表 */
async function toggleFavorite(item) {
  const { toastSuccess, toastError } = useToast();
  if (!item || item.id === undefined) {
    return false;
  }
  const nextFavorite = !item.favorite;
  try {
    await requestToggleFavorite(item.id, nextFavorite);
    await load();
    revision.value += 1;
    toastSuccess(nextFavorite ? '已加入收藏' : '已取消收藏');
    return true;
  } catch (err) {
    toastError(err.message);
    return false;
  }
}

/** 计算成功后调用：通知历史与统计数据已变化 */
function notifyDataChanged() {
  revision.value += 1;
  if (hasLoadedOnce) {
    load();
  }
}

export function useHistory() {
  return {
    // 状态
    items,
    total,
    page,
    pageSize,
    totalPages,
    keyword,
    onlyFavorite,
    order,
    loading,
    error,
    revision,
    // 派生
    pageInfo,
    isEmpty,
    hasPrev,
    hasNext,
    // 行为
    load,
    refresh: load,
    search,
    setPage,
    goPrev,
    goNext,
    setPageSize,
    setOnlyFavorite,
    toggleOnlyFavorite,
    setOrder,
    toggleOrder,
    removeItem,
    clearAll,
    toggleFavorite,
    notifyDataChanged,
  };
}

export default useHistory;
