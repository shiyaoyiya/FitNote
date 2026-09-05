<!-- pages/templateSquare/components/TagFilter.vue -->
<template>
  <scroll-view class="tag-filter" scroll-x show-scrollbar="false" @touchmove.stop>
    <view class="tag-list">
      <view 
        v-for="tag in store.tags" 
        :key="tag.id || tag.name" 
        class="tag-chip"
        :class="{ active: store.activeTag === (tag.id || tag.name) }"
        @click="toggleTag(tag)"
      >
        {{ tag.name || tag }}
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { useTemplateSquareStore } from '@/stores/templateSquare.js'

const store = useTemplateSquareStore()

const toggleTag = (tag) => {
  const tagValue = tag.id || tag.name || tag
  store.setActiveTag(tagValue)
}
</script>

<style scoped>
.tag-filter {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 4px 16px;
  box-sizing: border-box;
  white-space: nowrap;
}

.tag-list {
  display: inline-flex;
  gap: 8px;
  padding: 4px 0;
}

.tag-chip {
  padding: 6rpx 20rpx;
  border-radius: 999px;
  font-size: 22rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  white-space: nowrap;
}

.tag-chip.active {
  background: var(--primary);
  color: #fff;
}
</style>
