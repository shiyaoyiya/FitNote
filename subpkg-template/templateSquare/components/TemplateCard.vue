<!-- pages/templateSquare/components/TemplateCard.vue -->
<template>
  <view class="template-card" @click="emit('click', template)">
    <view class="card-cover" :style="{ backgroundColor: template.coverColor || '#379bff' }">
      <text class="cover-icon">📋</text>
      <view v-if="template.isOfficial" class="official-badge">官方</view>
      <view v-if="isOffline" class="offline-badge">
        <text class="offline-dot">●</text>
      </view>
    </view>
    <view class="card-info">
      <text class="card-title">{{ template.name }}</text>
      <view class="card-stats">
        <text class="stat-item">{{ template.actionCount ?? template.actions?.length ?? 0 }} 动作</text>
        <text class="stat-item">⬇ {{ template.downloadCount ?? template.downloads ?? 0 }}</text>
        <text class="stat-item">★ {{ template.collectCount ?? template.likes ?? 0 }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  template: {
    type: Object,
    required: true
  },
  isOffline: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])
</script>

<style scoped>
.template-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1rpx solid var(--border-color);
  border-radius: 16rpx;
  overflow: hidden;
  box-sizing: border-box;
  min-width: 0;
}

.card-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 56rpx;
}

.official-badge {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  padding: 2rpx 12rpx;
  background: rgba(255, 215, 0, 0.9);
  color: #5a3d00;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 8rpx;
}

.offline-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  padding: 4rpx 8rpx;
  background: rgba(255, 152, 0, 0.9);
  border-radius: 50%;
}

.offline-dot {
  font-size: 8px;
  color: #fff;
}

.card-info {
  padding: 14rpx 20rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 6rpx;
}

.card-stats {
  display: flex;
  gap: 12rpx;
}

.stat-item {
  font-size: 22rpx;
  color: var(--text-secondary);
}

/* 平板适配 */
@media (min-width: 500px) {
  .card-title { font-size: 15px !important; }
  .stat-item { font-size: 11px !important; }
  .cover-icon { font-size: 28px !important; }
}
</style>
