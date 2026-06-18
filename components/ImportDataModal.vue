<template>
  <view v-if="visible" class="popup-overlay">
    <view class="overlay-bg" @click="$emit('close')"></view>
    <view class="modal-panel fade-in" @click.stop>
      <view class="modal-header">
        <text class="modal-title">导入数据</text>
        <text class="close-icon" @click="$emit('close')">×</text>
      </view>
      <view class="modal-body">
        <!-- 剪贴板内容 -->
        <view class="clipboard-section">
          <text class="section-title">剪贴板内容：</text>
          <view class="clipboard-content">
            <text class="clipboard-text">{{ clipboardContent }}</text>
          </view>
        </view>
        
        <!-- 解析结果 -->
        <view class="parsed-section" v-if="parsedData.length > 0">
          <text class="section-title">解析结果：</text>
          <view class="parsed-list">
            <view v-for="(action, index) in parsedData" :key="index" class="parsed-item">
              <text class="parsed-icon">✓</text>
              <text class="parsed-name">{{ action.actionName }}</text>
              <text class="parsed-count">- {{ action.entries.length }}组</text>
            </view>
          </view>
        </view>
        
        <!-- 错误提示 -->
        <view class="error-section" v-if="errorMessage">
          <text class="error-text">{{ errorMessage }}</text>
        </view>
      </view>
      <view class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button class="confirm-btn" @click="handleConfirm" :disabled="parsedData.length === 0">
          确认导入
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { parseImportTextWithActions } from '@/utils/importParser'

export default {
  name: 'ImportDataModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    actionNames: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      clipboardContent: '',
      parsedData: [],
      errorMessage: ''
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.readClipboard()
      }
    }
  },
  methods: {
    async readClipboard() {
      try {
        // #ifdef H5
        const text = await navigator.clipboard.readText()
        this.clipboardContent = text
        this.parseClipboardContent()
        // #endif
        
        // #ifdef APP-PLUS
        uni.getClipboardData({
          success: (res) => {
            this.clipboardContent = res.data
            this.parseClipboardContent()
          },
          fail: () => {
            this.errorMessage = '无法读取剪贴板内容'
          }
        })
        // #endif
      } catch (error) {
        this.errorMessage = '无法读取剪贴板内容'
      }
    },
    parseClipboardContent() {
      if (!this.clipboardContent) {
        this.errorMessage = '剪贴板中没有内容'
        return
      }

      this.errorMessage = ''
      this.parsedData = parseImportTextWithActions(this.clipboardContent, this.actionNames)
      
      if (this.parsedData.length === 0) {
        this.errorMessage = '无法识别训练数据格式'
      }
    },
    handleConfirm() {
      if (this.parsedData.length > 0) {
        this.$emit('confirm', this.parsedData)
      }
    }
  }
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.overlay-bg {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.3);
}

.modal-panel {
  position: relative;
  width: 80vw;
  max-height: 70vh;
  background-color: var(--bg-secondary);
  border: 1rpx solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1001;
}

.fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  position: relative;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 72vw;
  height: 1px;
  background-color: var(--divider-color);
}

.modal-title {
  font-size: 16px;
  font-weight: bold;
  margin-left: 2vw;
  color: var(--text-primary);
}

.close-icon {
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  border-radius: 50%;
  color: var(--text-secondary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.clipboard-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.clipboard-content {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 12px;
  max-height: 120px;
  overflow-y: auto;
}

.clipboard-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.parsed-section {
  margin-bottom: 16px;
}

.parsed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parsed-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.parsed-icon {
  color: #4cd964;
  font-size: 14px;
}

.parsed-name {
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
}

.parsed-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.error-section {
  margin-bottom: 16px;
}

.error-text {
  font-size: 14px;
  color: #ff3b30;
}

.modal-footer {
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  position: relative;
}

.modal-footer::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 72vw;
  height: 1px;
  background-color: var(--divider-color);
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  border: none;
  margin: 0 4px;
}

.cancel-btn {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.confirm-btn {
  background: #379bff;
  color: #ffffff;
}

.confirm-btn:disabled {
  background: #ccc;
  color: #999;
}
</style>