<template>
  <view v-if="visible" class="popup-overlay">
    <view class="overlay-bg" @click="$emit('close')"></view>
    <view class="modal-panel fade-in" @click.stop>
      <view class="modal-header">
        <text class="modal-title">导入数据</text>
        <text class="close-icon" @click="$emit('close')">×</text>
      </view>
      <view class="modal-body">
        <view class="input-section">
          <text class="section-title">粘贴或输入训练数据：</text>
          <textarea class="input-textarea" v-model="inputText"
            placeholder="例如：\n卧推 10×50 10×50 10×50\n深蹲 8×80 8×80" :maxlength="-1" auto-height />
          <view class="input-actions">
            <view class="paste-btn" @click="pasteFromClipboard">
              <text class="paste-icon">📋</text>
              <text class="paste-text">从剪贴板粘贴</text>
            </view>
            <view class="parse-btn" @click="parseInput">
              <text class="parse-icon">🔍</text>
              <text class="parse-text">解析</text>
            </view>
          </view>
        </view>

        <view class="parsed-section" v-if="parsedData.length > 0">
          <text class="section-title">解析结果：</text>
          <view class="parsed-list">
            <view v-for="(action, index) in parsedData" :key="index" class="parsed-item">
              <text class="parsed-icon">✓</text>
              <view class="parsed-info">
                <text class="parsed-name">{{ action.actionName }}</text>
                <text class="parsed-detail">{{ getActionDetail(action) }}</text>
              </view>
              <text class="parsed-count">{{ action.entries.length }}组</text>
            </view>
          </view>
        </view>

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

<script setup>
  import { ref, watch } from 'vue'
  import { parseImportTextWithActions, parseImportText } from '@/utils/importParser'

  const props = defineProps({
    visible: { type: Boolean, default: false },
    actionNames: { type: Array, default: () => [] }
  })

  const emit = defineEmits(['close', 'confirm'])

  const inputText = ref('')
  const parsedData = ref([])
  const errorMessage = ref('')

  watch(() => props.visible, (newVal) => {
    if (newVal) {
      inputText.value = ''
      parsedData.value = []
      errorMessage.value = ''
      pasteFromClipboard()
    }
  })

  async function pasteFromClipboard() {
    try {
      // #ifdef H5
      const text = await navigator.clipboard.readText()
      if (text) {
        inputText.value = text
        parseInput()
      }
      // #endif

      // #ifdef APP-PLUS
      uni.getClipboardData({
        success: (res) => {
          if (res.data) {
            inputText.value = res.data
            parseInput()
          }
        },
        fail: () => {}
      })
      // #endif
    } catch (error) {}
  }

  function parseInput() {
    if (!inputText.value || !inputText.value.trim()) {
      errorMessage.value = '请输入训练数据'
      parsedData.value = []
      return
    }

    errorMessage.value = ''

    try {
      parsedData.value = parseImportTextWithActions(inputText.value.trim(), props.actionNames)
      if (parsedData.value.length === 0) {
        parsedData.value = parseImportText(inputText.value.trim())
      }
    } catch (e) {
      parsedData.value = []
    }

    if (parsedData.value.length === 0) {
      errorMessage.value = '无法识别训练数据格式，请检查输入内容'
    }
  }

  function getActionDetail(action) {
    if (!action.entries || action.entries.length === 0) return ''
    const first = action.entries[0]
    const last = action.entries[action.entries.length - 1]
    if (action.entries.length === 1) {
      return `${first.reps}次×${first.weight}kg`
    }
    return `${first.reps}次~${last.reps}次×${first.weight}kg`
  }

  function handleConfirm() {
    if (parsedData.value.length > 0) {
      emit('confirm', parsedData.value)
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
    width: 85vw;
    max-height: 75vh;
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
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
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
    overflow-x: hidden;
    padding: 12px 16px;
    -webkit-overflow-scrolling: touch;
  }

  .input-section {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: bold;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .input-textarea {
    width: calc(100% - 24px);
    min-height: 60px;
    max-height: 200px;
    background: var(--bg-tertiary);
    border: 1rpx solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    margin: 12px 0;
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .input-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .paste-btn,
  .parse-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 0;
    border-radius: 8px;
    border: 1rpx solid var(--border-color);
  }

  .paste-btn {
    background: var(--bg-tertiary);
  }

  .parse-btn {
    background: #379bff;
    border-color: #379bff;
  }

  .paste-icon,
  .parse-icon {
    font-size: 16px;
  }

  .paste-text {
    font-size: 14px;
    color: var(--text-primary);
  }

  .parse-text {
    font-size: 14px;
    color: #ffffff;
    font-weight: bold;
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
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
  }

  .parsed-icon {
    color: #4cd964;
    font-size: 16px;
  }

  .parsed-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .parsed-name {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: bold;
  }

  .parsed-detail {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .parsed-count {
    font-size: 13px;
    color: #379bff;
    font-weight: bold;
  }

  .error-section {
    display: flex;
    justify-content: center;
    align-items: center;
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
