<!-- pages/templateSquare/components/SortBar.vue -->
<template>
  <view class="sort-bar">
    <view 
      v-for="s in sorts" 
      :key="s.key"
      class="sort-item"
      :class="{ active: store.sort === s.key }"
      @click="store.setSort(s.key)"
    >
      {{ s.label }}
    </view>
  </view>
</template>

<script setup>
import { useTemplateSquareStore } from '../../stores/templateSquare.js'

const store = useTemplateSquareStore()

const sorts = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '热门' }
]
</script>

<style scoped>
.sort-bar {
  display: flex;
  gap: 8px;
}

.sort-item {
  padding: 8rpx 20rpx;
  border-radius: 999px;
  font-size: 24rpx;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.sort-item.active {
  background: var(--primary);
  color: #ffffff !important;
  font-weight: 600;
}

/* 平板适配 */
@media (min-width: 500px) {
  .sort-item { font-size: 12px !important; padding: 4px 10px !important; }
}
</style>