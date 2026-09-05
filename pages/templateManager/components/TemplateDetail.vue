<template>
  <view v-if="visible && template" class="popup-overlay" @click.self="handleClose">
    <view class="popup-panel slide-up" @click.stop>
      <view class="panel-header">
        <text class="panel-title">{{ template.name || '模板详情' }}</text>
        <text class="close-btn" @click="handleClose" aria-label="关闭">×</text>
      </view>
      <view class="panel-body panel-body-no-padding">
        <view class="sq-detail-hero" :style="{ background: `linear-gradient(135deg, ${template.color}, ${template.color2 || template.color})` }">
          <text class="sqd-author">作者：{{ template.author }}</text>
          <view class="sqd-tags">
            <text v-for="(tag, index) in (template.tags || [])" :key="index" class="sqd-tag">{{ tag }}</text>
          </view>
          <view class="sqd-stat-row">
            <view class="sqd-stat"><text class="sqd-stat-num">{{ (template.actions || []).length }}</text><text class="sqd-stat-lb">动作</text></view>
            <view class="sqd-stat"><text class="sqd-stat-num">{{ template.likes }}</text><text class="sqd-stat-lb">点赞</text></view>
            <view class="sqd-stat"><text class="sqd-stat-num">{{ template.downloads }}</text><text class="sqd-stat-lb">导入</text></view>
          </view>
        </view>
        <view class="sq-detail-actions-preview">
          <view class="sqd-section-title">动作清单</view>
          <view class="sqd-action-list">
            <view v-for="(a, i) in (template.actions || [])" :key="i" class="sqd-action-row">
              <text class="sqd-action-index">{{ i + 1 }}</text>
              <text class="sqd-action-name">{{ a.name }}</text>
              <text class="sqd-action-sets">{{ a.sets }}组</text>
            </view>
          </view>
        </view>
      </view>
      <view class="panel-footer">
        <view class="btn-cancel-popup" @click="handleShare">📤 分享</view>
        <view class="btn-confirm-popup" @click="handleImport">✨ 导入到我的模板</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TemplateDetail',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    template: {
      type: Object,
      default: null
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    handleImport() {
      this.$emit('import', this.template)
    },
    handleShare() {
      try {
        const code = JSON.stringify({ 
          n: this.template.name, 
          a: this.template.actions || [], 
          t: this.template.tags || [], 
          c: this.template.color 
        })
        uni.setClipboardData({
          data: code,
          success: () => uni.showToast({ title: '分享码已复制', icon: 'success' }),
          fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' })
        })
      } catch (e) {
        uni.showToast({ title: '分享失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.5);
}

.popup-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.slide-up {
  animation: slideUp 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--border-color);
  flex-shrink: 0;
}

.panel-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.close-btn {
  font-size: 40rpx;
  color: var(--text-secondary);
  padding: 8rpx;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24rpx 32rpx;
}

.panel-body-no-padding {
  padding-bottom: 0;
}

.sq-detail-hero {
  position: relative;
  overflow: hidden;
  border-radius: 16rpx;
  padding: 28rpx 24rpx 36rpx;
  color: #fff;
  margin-bottom: 20rpx;
}

.sqd-author {
  position: relative;
  z-index: 2;
  font-size: 24rpx;
  opacity: 0.92;
  display: block;
  margin-bottom: 12rpx;
}

.sqd-tags {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.sqd-tag {
  padding: 4rpx 14rpx;
  background: rgba(255,255,255,0.22);
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #fff;
  backdrop-filter: blur(6rpx);
}

.sqd-stat-row {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.sqd-stat {
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(8rpx);
  border-radius: 12rpx;
  padding: 12rpx 8rpx;
  text-align: center;
}

.sqd-stat-num {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}

.sqd-stat-lb {
  display: block;
  font-size: 22rpx;
  opacity: 0.9;
}

.sq-detail-actions-preview {
  background: var(--bg-secondary);
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  max-height: 480rpx;
  overflow-y: auto;
  overflow-x: hidden;
}

.sqd-section-title {
  font-size: 28rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
  color: var(--text-primary);
}

.sqd-action-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.sqd-action-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 12rpx;
  background: var(--bg-tertiary);
  border-radius: 12rpx;
  min-height: 64rpx;
}

.sqd-action-index {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #6ab6ff);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sqd-action-name {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sqd-action-sets {
  padding: 4rpx 14rpx;
  background: rgba(55,155,255,0.15);
  color: var(--primary);
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.panel-footer {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx 40rpx;
}

.btn-cancel-popup {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 40rpx;
  color: var(--text-primary);
  font-size: 28rpx;
}

.btn-confirm-popup {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
