<script setup>
/**
 * HistoryItem —— 单条历史记录
 * 展示 id / 表达式 / 结果 / 时间；支持点击回填表达式、切换收藏、删除。
 */
defineProps({
  item: { type: Object, required: true },
});

const emit = defineEmits(['use', 'remove', 'toggleFavorite']);
</script>

<template>
  <li class="history-item" :class="{ 'history-item--favorite': item.favorite }" data-testid="history-item">
    <div
      class="history-item__main"
      role="button"
      tabindex="0"
      title="点击把表达式回填到输入框"
      @click="emit('use', item)"
      @keydown.enter="emit('use', item)"
    >
      <p class="history-item__expression">{{ item.expression }}</p>
      <p class="history-item__result">= {{ item.resultText }}</p>
    </div>

    <div class="history-item__side">
      <p class="history-item__meta">
        <span class="history-item__id">#{{ item.id }}</span>
        <time class="history-item__time">{{ item.createdAt }}</time>
      </p>
      <div class="history-item__actions">
        <button
          class="btn btn--ghost btn--sm"
          :class="{ 'btn--star-on': item.favorite }"
          type="button"
          data-testid="history-favorite"
          :title="item.favorite ? '取消收藏' : '加入收藏'"
          @click.stop="emit('toggleFavorite', item)"
        >
          {{ item.favorite ? '★' : '☆' }}
        </button>
        <button
          class="btn btn--danger-ghost btn--sm"
          type="button"
          data-testid="history-delete"
          @click.stop="emit('remove', item)"
        >
          删除
        </button>
      </div>
    </div>
  </li>
</template>
