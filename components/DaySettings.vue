<template>
  <view>
    <view v-if="visible" class="popup-overlay">
      <view class="overlay-bg" @click.stop="$emit('close')"></view>
      <view class="modal-panel fade-in" @click.stop>
        <view class="modal-header">
          <text class="modal-title">训练设置</text>
          <text class="close-icon" @click.stop="$emit('close')">×</text>
        </view>
        <view class="modal-body settings-body">
          <view class="setting-item" @click="$emit('toggle-auto-timer')">
            <text class="setting-label">保存后自动调起计时器</text>
            <view class="setting-switch" :class="{ on: settings.autoStartTimer }">
              <view class="switch-dot"></view>
            </view>
          </view>
          <view class="setting-item" @click="$emit('toggle-auto-fill')">
            <text class="setting-label">自动填充历史数据</text>
            <view class="setting-switch" :class="{ on: settings.autoFillData }">
              <view class="switch-dot"></view>
            </view>
          </view>
          <view class="setting-item" @click="$emit('toggle-bubble-fill')">
            <text class="setting-label">气泡快捷填充</text>
            <view class="setting-switch" :class="{ on: settings.bubbleFill }">
              <view class="switch-dot"></view>
            </view>
          </view>

          <view class="settings-divider"></view>

          <view class="setting-label-row">
            <text class="setting-section-title">计时器默认时间</text>
          </view>
          <view class="timer-input-row">
            <view class="timer-input-group">
              <text class="timer-input-label">胸背腿</text>
              <view class="timer-input-wrap">
                <input type="number" :value="settings.heavyTimerDuration"
                  @input="$emit('set-heavy-timer', Number($event.detail.value) || 180)" class="timer-input" />
                <text class="timer-unit">秒</text>
              </view>
            </view>
            <view class="timer-input-group">
              <text class="timer-input-label">肩手</text>
              <view class="timer-input-wrap">
                <input type="number" :value="settings.lightTimerDuration"
                  @input="$emit('set-light-timer', Number($event.detail.value) || 120)" class="timer-input" />
                <text class="timer-unit">秒</text>
              </view>
            </view>
          </view>

          <view class="settings-divider"></view>

          <view class="setting-actions-row">
            <view class="setting-action manage-action" @click="navigateToManage">
              <text class="action-icon">📋</text>
              <text class="action-label">管理动作</text>
            </view>
            <view class="setting-action export-action" @click="$emit('export-data')">
              <text class="action-icon">📤</text>
              <text class="action-label">复制数据</text>
            </view>
            <view class="setting-action import-action" @click="$emit('import-data')">
              <text class="action-icon">📥</text>
              <text class="action-label">导入数据</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
  const props = defineProps({
    visible: { type: Boolean, default: false },
    availableActions: { type: Array, default: () => [] },
    chosenActions: { type: Array, default: () => [] },
    settings: {
      type: Object,
      default: () => ({ autoStartTimer: false, autoFillData: false })
    },
  })

  const emit = defineEmits([
    'close', 'add-action', 'toggle-auto-timer', 'toggle-auto-fill', 'toggle-bubble-fill',
    'set-heavy-timer', 'set-light-timer', 'export-data', 'import-data'
  ])

  function navigateToManage() {
    emit('close')
    const chosen = JSON.stringify(props.chosenActions || [])
    uni.navigateTo({
      url: '/pages/manageActions/manageActions?chosenActions=' + encodeURIComponent(chosen)
    })
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
    margin-top: -44px;
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
    padding: 12px 16px;
  }

  .settings-body {
    padding: 8px 0 !important;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
  }

  .setting-label {
    font-size: 15px;
    color: var(--text-primary);
  }

  .setting-switch {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    position: relative;
    transition: background 0.2s, border-color 0.2s;
    border: 2px solid var(--border-color);
  }

  .setting-switch.on {
    background: #379bff;
    border: 2px solid var(--border-color);
  }

  .switch-dot {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: var(--icon-bg);
    position: absolute;
    top: 2px;
    left: 2px;
    transition: left 0.2s;
  }

  .setting-switch.on .switch-dot {
    left: 22px;
  }

  .settings-divider {
    height: 1px;
    background: var(--divider-color);
    margin: 4px 16px;
  }

  .setting-label-row {
    padding: 8px 20px 0;
  }

  .setting-section-title {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .timer-input-row {
    display: flex;
    gap: 16px;
    padding: 10px 20px;
  }

  .timer-input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .timer-input-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .timer-input-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 0 12px;
    border: 1rpx solid var(--border-color);
  }

  .timer-input {
    flex: 1;
    height: 40px;
    font-size: 18px;
    font-weight: bold;
    color: var(--text-primary);
    text-align: center;
  }

  .timer-unit {
    font-size: 13px;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .setting-actions-row {
    display: flex;
    gap: 12px;
    padding: 8px 20px;
  }

  .setting-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    gap: 8px;
    background: var(--bg-tertiary);
    border-radius: 10px;
    border: 1rpx solid var(--border-color);
  }

  .action-icon {
    font-size: 18px;
    color: #379bff;
  }

  .action-label {
    font-size: 15px;
    color: var(--text-primary);
    width: 30px;
    text-align: justify;
  }

  .import-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    gap: 8px;
    background: var(--bg-tertiary);
    border-radius: 10px;
    border: 1rpx solid var(--border-color);
  }

  .import-action .action-icon {
    font-size: 18px;
    color: #34c759;
  }

  .import-action .action-label {
    font-size: 15px;
    color: var(--text-primary);
  }
</style>
