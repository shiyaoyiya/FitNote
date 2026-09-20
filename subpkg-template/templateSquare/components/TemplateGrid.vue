<!-- pages/templateSquare/components/TemplateGrid.vue -->
<template>
  <scroll-view class="template-grid" scroll-y show-scrollbar="false" @scrolltolower="onReachBottom">
    <view class="grid-content">
      <!-- 离线缓存提示 -->
      <view v-if="store.isOffline && store.lastCacheTime" class="cache-hint">
        <text class="cache-icon">💾</text>
        <text class="cache-text">显示缓存数据 · {{ formatCacheTime(store.lastCacheTime) }}更新</text>
      </view>
      
      <view v-if="store.filteredTemplates.length > 0" class="grid-list">
        <TemplateCard
          v-for="tpl in store.filteredTemplates"
          :key="tpl.id"
          :template="tpl"
          :is-offline="store.isOffline"
          @click="emit('cardClick', tpl)"
        />
      </view>
      <view v-else-if="!store.loading" class="empty-state">
        <text class="empty-icon">🗂️</text>
        <text class="empty-text">{{ store.isOffline ? '暂无缓存模板' : '暂无匹配模板' }}</text>
      </view>
      <view v-if="store.loading" class="loading-state">
        <view class="spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      <view v-if="store.loadingMore" class="loading-more">
        <text class="loading-more-text">加载更多...</text>
      </view>
      <view class="bottom-space"></view>
    </view>
  </scroll-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTemplateSquareStore } from '../../stores/templateSquare.js'
import TemplateCard from './TemplateCard.vue'

const store = useTemplateSquareStore()
const emit = defineEmits(['cardClick'])

onMounted(() => {
  store.loadTemplates()
  store.loadTags()
})

const onReachBottom = () => {
  if (store.hasMore && !store.loadingMore) {
    store.loadMore()
  }
}

const formatCacheTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`
}
</script>

<style scoped>
.template-grid {
  flex: 1;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.grid-content {
  padding: 8px 16px;
}

.cache-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 10px;
  margin-bottom: 12px;
}

.cache-icon {
  font-size: 14px;
}

.cache-text {
  font-size: 12px;
  color: #ff9800;
}

.grid-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.empty-state, .loading-state {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 48rpx;
}

.empty-text, .loading-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: sqSpin 0.8s linear infinite;
}

@keyframes sqSpin {
  to { transform: rotate(360deg); }
}

.loading-more {
  padding: 20px 0;
  text-align: center;
}

.loading-more-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.bottom-space {
  height: 80px;
}
</style>
