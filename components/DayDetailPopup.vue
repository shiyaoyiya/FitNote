<template>
  <view v-if="visible" class="popup-overlay" @click.self="close">
    <view class="overlay-bg" @click="close"></view>
    <view class="modal-panel fade-in">
      <view class="modal-header">
        <text class="modal-title">{{ type === 'aerobic' ? '有氧' : '休息' }}</text>
        <text class="close-icon" @click="close">×</text>
      </view>
      <view class="modal-body">
        <!-- 有氧模式 -->
        <template v-if="type === 'aerobic'">
          <view class="detail-row" @click="startEdit('name')">
            <text class="detail-label">类型</text>
            <input v-if="editingField === 'name'" v-model="editName" class="detail-input"
              placeholder="有氧名称" @blur="saveField('name')" focus />
            <text v-else class="detail-value">{{ detail.name }}</text>
          </view>
          <view class="detail-row" @click="startEdit('time')">
            <text class="detail-label">时长</text>
            <view v-if="editingField === 'time'" class="detail-input-wrap">
              <input v-model.number="editTime" type="number" class="detail-input"
                placeholder="分钟" @blur="saveField('time')" focus />
              <text class="detail-unit">分钟</text>
            </view>
            <text v-else class="detail-value">{{ detail.time }} 分钟</text>
          </view>
        </template>

        <!-- 休息模式 -->
        <template v-else>
          <view class="detail-row" @click="startEdit('reason')">
            <text class="detail-label">理由</text>
            <input v-if="editingField === 'reason'" v-model="editReason" class="detail-input"
              placeholder="休息理由" @blur="saveField('reason')" focus />
            <text v-else class="detail-value">{{ detail.reason }}</text>
          </view>
        </template>

        <!-- 颜色设置 -->
        <view class="detail-row" @click="showColorPicker = !showColorPicker">
          <text class="detail-label">颜色</text>
          <text class="detail-link">{{ showColorPicker ? '收起' : '设置颜色' }}</text>
        </view>

        <!-- 颜色选择器 -->
        <view v-if="showColorPicker" class="color-picker">
          <view v-for="(cObj, idx) in presetColors" :key="idx" class="color-option-item"
            @click="selectColor(cObj.value)">
            <view class="color-circle" :style="{ backgroundColor: cObj.value }">
              <view v-if="detail.color === cObj.value" class="color-selected"></view>
            </view>
            <text class="color-name">{{ cObj.name }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { PRESET_COLORS } from '@/utils/color.js'

  export default {
    name: 'DayDetailPopup',
    props: {
      visible: { type: Boolean, default: false },
      type: { type: String, default: 'aerobic' },
      detail: {
        type: Object,
        default: () => ({ date: '', name: '', time: 0, reason: '', color: '' })
      },
    },
    emits: ['close', 'color-change', 'save-edit'],
    data() {
      return {
        presetColors: PRESET_COLORS,
        showColorPicker: false,
        editingField: null, // null | 'name' | 'time' | 'reason'
        editName: '',
        editTime: 0,
        editReason: '',
      }
    },
    watch: {
      visible(val) {
        if (val) {
          this.showColorPicker = false
          this.editingField = null
        }
      },
    },
    methods: {
      close() {
        // 失焦会自动保存，这里只需要关闭
        this.editingField = null
        this.$emit('close')
      },
      selectColor(color) {
        this.$emit('color-change', color)
        this.showColorPicker = false
      },
      startEdit(field) {
        if (this.editingField === field) return
        // 先保存之前的编辑
        if (this.editingField) {
          this.saveField(this.editingField)
        }
        this.editingField = field
        if (field === 'name') this.editName = this.detail.name || ''
        if (field === 'time') this.editTime = this.detail.time || 0
        if (field === 'reason') this.editReason = this.detail.reason || ''
      },
      saveField(field) {
        if (field === 'name') {
          const val = this.editName.trim()
          if (val && val !== this.detail.name) {
            this.$emit('save-edit', { name: val, time: this.detail.time })
          }
        } else if (field === 'time') {
          const val = Number(this.editTime)
          if (val > 0 && val !== this.detail.time) {
            this.$emit('save-edit', { name: this.detail.name, time: val })
          }
        } else if (field === 'reason') {
          const val = this.editReason.trim()
          if (val && val !== this.detail.reason) {
            this.$emit('save-edit', { reason: val })
          }
        }
        this.editingField = null
      },
    },
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
    justify-content: center;
    align-items: center;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
  }

  .modal-panel {
    position: relative;
    width: 80vw;
    max-width: 320px;
    max-height: 80vh;
    background-color: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  .modal-header {
    height: 56px;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 20px;
    color: var(--text-muted);
    background: transparent;
  }

  .close-icon:active {
    background-color: var(--bg-tertiary);
  }

  .modal-body {
    flex: 1;
    padding: 8px 0;
    overflow-y: auto;
  }

  /* 每行布局 */
  .detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    transition: background-color 0.15s;
  }

  .detail-row:active {
    background-color: var(--bg-tertiary);
  }

  .detail-label {
    font-size: 14px;
    color: var(--text-secondary);
    flex-shrink: 0;
    margin-right: 12px;
  }

  .detail-value {
    font-size: 14px;
    color: var(--text-primary);
    text-align: right;
    flex: 1;
  }

  .detail-link {
    font-size: 14px;
    color: #379bff;
    flex-shrink: 0;
  }

  /* 输入框 */
  .detail-input {
    flex: 1;
    height: 36px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 14px;
    color: var(--text-primary);
    text-align: right;
    box-sizing: border-box;
  }

  .detail-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: flex-end;
  }

  .detail-input-wrap .detail-input {
    width: 80px;
    flex: none;
  }

  .detail-unit {
    font-size: 13px;
    color: var(--text-secondary);
  }

  /* 颜色选择器 */
  .color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 16px 16px;
    justify-content: center;
  }

  .color-option-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .color-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    position: relative;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .color-selected {
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;
    border: 2px solid #fff;
    border-radius: 50%;
  }

  .color-name {
    font-size: 11px;
    color: var(--text-muted);
  }

  .fade-in {
    animation: modalFadeIn 0.25s ease;
  }

  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
