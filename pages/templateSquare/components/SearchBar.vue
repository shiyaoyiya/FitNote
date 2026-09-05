<template>
  <view class="search-bar">
    <view class="search-icon">🔍</view>
    <input 
      v-model="keyword" 
      class="search-input" 
      placeholder="搜索模板名 / 动作 / 标签"
      @input="onInput"
    />
    <view v-if="keyword" class="clear-btn" @click="clearKeyword">×</view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTemplateSquareStore } from '@/stores/templateSquare.js'

const store = useTemplateSquareStore()
const keyword = ref(store.keyword)
let debounceTimer = null

const onInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.setKeyword(keyword.value)
  }, 300)
}

const clearKeyword = () => {
  keyword.value = ''
  store.setKeyword('')
}
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 88rpx;
  margin-bottom: 8px;
}

.search-icon {
  font-size: 24rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  height: 88rpx;
}

.clear-btn {
  font-size: 32rpx;
  color: var(--text-secondary);
  padding: 0 8rpx;
}
</style>