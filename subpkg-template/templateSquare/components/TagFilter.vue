<!-- pages/templateSquare/components/TagFilter.vue -->
<template>
  <picker :range="tagNames" :value="pickerIndex" @change="onPick" class="tag-filter">
    <view class="tag-picker-btn">
      <text class="tag-picker-text">{{ activeName || '全部部位' }}</text>
      <text class="tag-picker-arrow">▼</text>
    </view>
  </picker>
</template>

<script setup>
import { computed } from 'vue'
import { useTemplateSquareStore } from '../../stores/templateSquare.js'

const store = useTemplateSquareStore()

const tagNames = computed(() => ['全部部位', ...store.tags.map(t => t.name)])

const pickerIndex = computed(() => {
  if (!store.activeTag) return 0
  const idx = store.tags.findIndex(t => t.id === store.activeTag)
  return idx > -1 ? idx + 1 : 0
})

const activeName = computed(() => {
  if (!store.activeTag) return ''
  const t = store.tags.find(t => t.id === store.activeTag)
  return t ? t.name : ''
})

const onPick = (e) => {
  const idx = Number(e.detail.value)
  if (idx === 0) {
    store.setActiveTag('')
  } else {
    const tag = store.tags[idx - 1]
    store.setActiveTag(tag ? tag.id : '')
  }
}
</script>

<style scoped>
.tag-filter {
  flex-shrink: 0;
}

.tag-picker-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1rpx solid var(--border-color, rgba(0,0,0,0.06));
}

.tag-picker-text {
  font-size: 22rpx;
  max-width: 120rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tag-picker-arrow { font-size: 16rpx; opacity: 0.5; }

/* 平板适配 */
@media (min-width: 500px) {
  .tag-picker-btn { font-size: 11px !important; padding: 3px 10px !important; }
  .tag-picker-text { font-size: 11px !important; max-width: 60px; }
}
</style>
