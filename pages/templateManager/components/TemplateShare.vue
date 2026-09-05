<template>
  <view v-if="visible" class="popup-overlay" @click.self="handleClose">
    <view class="overlay-bg" @click="handleClose"></view>
    <view class="popup-panel slide-up" @click.stop>
      <view class="panel-header">
        <text class="panel-title">分享我的模板</text>
        <text class="close-btn" @click="handleClose">×</text>
      </view>
      <view class="panel-body">
        <view v-if="!selectedTemplateId" class="template-pick-list">
          <view v-for="tpl in templates" :key="tpl.id" class="template-pick"
            @click="selectTemplate(tpl)">
            <text class="template-pick-name">{{ tpl.name }}</text>
            <text class="template-pick-count">{{ tpl.actions?.length || 0 }} 动作</text>
          </view>
          <view v-if="templates.length === 0" class="empty-state">
            <text class="empty-text">暂无模板可分享</text>
          </view>
        </view>
        <view v-else>
          <view class="form-group">
            <text class="form-label">模板名称</text>
            <input v-model="shareName" class="share-input" placeholder="不超过50字" maxlength="50" />
          </view>
          <view class="form-group">
            <text class="form-label">模板介绍</text>
            <textarea v-model="shareDesc" class="share-textarea" placeholder="介绍一下这个模板..." maxlength="200" />
          </view>
        </view>
      </view>
      <view class="panel-footer">
        <view class="btn-cancel-popup" @click="handleClose">取消</view>
        <view class="btn-confirm-popup" @click="handleConfirm" :style="{ background: 'linear-gradient(135deg,#379bff,#2d82d6)', color: '#fff' }">分享</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TemplateShare',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    templates: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedTemplateId: '',
      shareName: '',
      shareDesc: ''
    }
  },
  methods: {
    handleClose() {
      this.resetForm()
      this.$emit('close')
    },
    handleConfirm() {
      if (!this.selectedTemplateId) {
        uni.showToast({ title: '请先选择模板', icon: 'none' })
        return
      }
      const tpl = this.templates.find(t => t.id === this.selectedTemplateId)
      if (!tpl) {
        uni.showToast({ title: '模板不存在', icon: 'none' })
        return
      }
      if (!tpl.actions || !Array.isArray(tpl.actions)) {
        uni.showToast({ title: '模板数据异常', icon: 'none' })
        return
      }
      const code = JSON.stringify({
        name: this.shareName || tpl.name,
        desc: this.shareDesc,
        actions: tpl.actions,
        color: tpl.color
      })
      uni.setClipboardData({
        data: code,
        success: () => {
          uni.showToast({ title: '分享码已复制', icon: 'success' })
          this.handleClose()
        },
        fail: () => {
          uni.showToast({ title: '复制失败，请重试', icon: 'none' })
        }
      })
    },
    selectTemplate(tpl) {
      this.selectedTemplateId = tpl.id
      this.shareName = tpl.name
    },
    resetForm() {
      this.selectedTemplateId = ''
      this.shareName = ''
      this.shareDesc = ''
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

.overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: transparent;
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
  padding-bottom: 0;
}

.template-pick-list {
  max-height: 50vh;
  overflow-y: auto;
}

.template-pick {
  padding: 12rpx 20rpx;
  border: 1rpx solid var(--border-color);
  border-radius: 12rpx;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-pick:active {
  opacity: 0.7;
}

.template-pick-name {
  font-size: 28rpx;
  color: var(--text-primary);
}

.template-pick-count {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: var(--text-muted);
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}

.share-input {
  width: 100%;
  height: 88rpx;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.share-textarea {
  width: 100%;
  height: 160rpx;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  line-height: 1.5;
  box-sizing: border-box;
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
