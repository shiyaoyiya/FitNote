<template>
  <view class="template-card" :class="{ 'is-dragging': isDragging }">
    <view class="card-color-bar" :style="{ backgroundColor: template.color || '#555' }"></view>
    <view class="card-info">
      <text class="card-name">{{ template.name }}</text>
      <text class="card-count">{{ template.actions ? template.actions.length : 0 }} 个动作</text>
      <view v-if="tags.length" class="card-tags">
        <text v-for="tag in tags" :key="tag" class="card-tag">{{ tag }}</text>
      </view>
    </view>
    <text class="card-arrow">›</text>
  </view>
</template>

<script>
export default {
  name: 'TemplateCard',
  props: {
    template: {
      type: Object,
      required: true
    },
    isDragging: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    tags() {
      if (!this.template) return []
      if (Array.isArray(this.template.tags) && this.template.tags.length > 0) {
        return this.template.tags
      }
      if (this.template.isAerobic) {
        return ['有氧']
      }
      const name = this.template.name || ''
      const rules = [
        { key: '全身', kws: ['全身'] },
        { key: '胸', kws: ['胸'] },
        { key: '背', kws: ['背'] },
        { key: '腿', kws: ['腿', '下肢'] },
        { key: '肩', kws: ['肩', '中束', '后束', '前束'] },
        { key: '手臂', kws: ['二头', '三头', '手臂'] },
        { key: '核心', kws: ['核心', '腹'] },
      ]
      const tags = []
      rules.forEach(r => {
        if (r.kws.some(k => name.includes(k))) {
          tags.push(r.key)
        }
      })
      return tags
    }
  }
}
</script>

<style scoped>
.template-card {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: transform 0.2s ease;
}

.template-card:active {
  transform: scale(0.98);
}

.card-color-bar {
  width: 12rpx;
  flex-shrink: 0;
  align-self: stretch;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
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

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
  margin-top: 2rpx;
}

.card-tag {
  font-size: 18rpx;
  line-height: 1.4;
  padding: 1rpx 10rpx;
  border-radius: 16rpx;
  background: rgba(55, 155, 255, 0.12);
  color: var(--primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-arrow {
  font-size: 36rpx;
  color: var(--text-placeholder);
  padding: 28rpx 24rpx;
  flex-shrink: 0;
}
</style>
