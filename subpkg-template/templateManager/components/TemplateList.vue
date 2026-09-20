<template>
  <view class="template-list">
    <view v-if="templates.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无模板，快去创建一个吧~</text>
    </view>
    <view v-else class="list-content">
      <view v-for="(tpl, idx) in templates" :key="tpl.id || idx" class="template-item"
        @click="$emit('select', tpl)" @longpress="onLongPress(idx)">
        <view class="card-color-bar" :style="{ backgroundColor: tpl.color || '#555' }"></view>
        <view class="card-info">
          <text class="card-name">{{ tpl.name }}</text>
          <text class="card-count">{{ tpl.actions ? tpl.actions.length : 0 }} 个动作</text>
        </view>
        <text class="card-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TemplateList',
  props: {
    templates: {
      type: Array,
      required: true
    }
  },
  methods: {
    onLongPress(idx) {
      uni.showActionSheet({
        itemList: ['删除'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.$emit('delete', idx)
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.template-list {
  min-height: 200rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: var(--text-muted);
}

.list-content {
  padding: 20rpx 30rpx;
}

.template-item {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
}

.template-item:active {
  transform: scale(0.98);
  opacity: 0.8;
}

.card-color-bar {
  width: 12rpx;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 120rpx;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  padding: 28rpx 20rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.card-count {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.card-arrow {
  font-size: 36rpx;
  color: var(--text-placeholder);
  padding: 28rpx 24rpx;
  flex-shrink: 0;
}
</style>
