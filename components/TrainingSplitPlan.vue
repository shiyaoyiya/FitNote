<template>
  <view class="popup-overlay" @click.self="onClose">
    <view class="overlay-bg" @click="onClose"></view>
    <view class="split-panel fade-in" :class="{ light: isLightMode }" @click.stop>
      <view class="split-header">
        <text class="split-title">设置分化计划</text>
        <text class="close-icon" @click="onClose">×</text>
      </view>
      <view class="mode-tabs">
        <view class="mode-tab" :class="{ 'mode-tab-active': localMode === 'cycle' }" @click="switchMode('cycle')">
          <text class="mode-tab-text" :class="{ 'mode-tab-text-active': localMode === 'cycle' }">按天数</text>
        </view>
        <view class="mode-tab" :class="{ 'mode-tab-active': localMode === 'week' }" @click="switchMode('week')">
          <text class="mode-tab-text" :class="{ 'mode-tab-text-active': localMode === 'week' }">按周</text>
        </view>
      </view>
      <view class="split-body">
        <view v-if="localMode === 'cycle'">
          <view v-for="(day, idx) in localPlan" :key="idx" class="day-row">
            <view class="day-info">
              <text class="day-label">第{{ idx + 1 }}天</text>
            </view>
            <view class="day-control">
              <view class="day-toggle" :class="{ 'day-toggle-active': day.enabled }" @click="toggleDay(idx)">
                <text class="toggle-text" :class="{ 'toggle-text-active': day.enabled }">{{ day.enabled ? '训练' : '休息' }}</text>
              </view>
            </view>
            <view class="day-template" v-if="day.enabled">
              <picker :range="templateNames" @change="onTplChange($event, idx)">
                <view class="tpl-picker">
                  <text class="tpl-picker-text">{{ day.template || '选择模板' }}</text>
                  <text class="tpl-arrow">▾</text>
                </view>
              </picker>
            </view>
            <view class="day-remove" @click="removeDay(idx)" v-if="localPlan.length > 1">
              <text class="remove-icon">×</text>
            </view>
          </view>
          <view class="add-day-row" @click="addDay">
            <text class="add-day-text">+ 添加一天</text>
          </view>
        </view>
        <view v-else>
          <view v-for="(day, idx) in localWeekPlan" :key="idx" class="day-row">
            <view class="day-info">
              <text class="day-label">{{ weekDayNames[idx] }}</text>
            </view>
            <view class="day-control">
              <view class="day-toggle" :class="{ 'day-toggle-active': day.enabled }" @click="toggleWeekDay(idx)">
                <text class="toggle-text" :class="{ 'toggle-text-active': day.enabled }">{{ day.enabled ? '训练' : '休息' }}</text>
              </view>
            </view>
            <view class="day-template" v-if="day.enabled">
              <picker :range="templateNames" @change="onWeekTplChange($event, idx)">
                <view class="tpl-picker">
                  <text class="tpl-picker-text">{{ day.template || '选择模板' }}</text>
                  <text class="tpl-arrow">▾</text>
                </view>
              </picker>
            </view>
          </view>
        </view>
      </view>
      <view class="split-footer">
        <view class="btn-cancel" @click="onClose">
          <text>取消</text>
        </view>
        <view class="btn-save" @click="onSave">
          <text>保存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'

  export default {
    name: 'TrainingSplitPlan',
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      templates: {
        type: Array,
        default: () => []
      },
      cycleDays: {
        type: Array,
        default: () => [{
            template: null,
            enabled: false
          },
          {
            template: null,
            enabled: false
          },
          {
            template: null,
            enabled: false
          },
          {
            template: null,
            enabled: false
          },
          {
            template: null,
            enabled: false
          },
          {
            template: null,
            enabled: false
          },
          {
            template: null,
            enabled: false
          },
        ],
      },
      mode: {
        type: String,
        default: 'cycle'
      },
      weekPlan: {
        type: Array,
        default: () => [
          { template: null, enabled: false },
          { template: null, enabled: false },
          { template: null, enabled: false },
          { template: null, enabled: false },
          { template: null, enabled: false },
          { template: null, enabled: false },
          { template: null, enabled: false },
        ],
      },
    },
    data() {
      return {
        localPlan: [],
        localMode: 'cycle',
        localWeekPlan: [],
        weekDayNames: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      }
    },
    computed: {
      templateNames() {
        return this.templates.map(t => t.name)
      },
      isLightMode() {
        const daySettingsStore = useDaySettingsStore()
        return !daySettingsStore.isDarkMode
      },
    },
    watch: {
      cycleDays: {
        immediate: true,
        deep: true,
        handler(val) {
          this.localPlan = JSON.parse(JSON.stringify(val))
        },
      },
      mode: {
        immediate: true,
        handler(val) {
          this.localMode = val || 'cycle'
        },
      },
      weekPlan: {
        immediate: true,
        deep: true,
        handler(val) {
          this.localWeekPlan = JSON.parse(JSON.stringify(val))
        },
      },
    },
    methods: {
      switchMode(mode) {
        this.localMode = mode
      },
      toggleDay(idx) {
        this.localPlan[idx].enabled = !this.localPlan[idx].enabled
        if (!this.localPlan[idx].enabled) {
          this.localPlan[idx].template = null
        }
      },
      toggleWeekDay(idx) {
        this.localWeekPlan[idx].enabled = !this.localWeekPlan[idx].enabled
        if (!this.localWeekPlan[idx].enabled) {
          this.localWeekPlan[idx].template = null
        }
      },
      onTplChange(e, idx) {
        const tplIdx = e.detail.value
        this.localPlan[idx].template = this.templateNames[tplIdx]
      },
      onWeekTplChange(e, idx) {
        const tplIdx = e.detail.value
        this.localWeekPlan[idx].template = this.templateNames[tplIdx]
      },
      addDay() {
        this.localPlan.push({
          template: null,
          enabled: false
        })
      },
      removeDay(idx) {
        this.localPlan.splice(idx, 1)
      },
      onClose() {
        this.$emit('close')
      },
      onSave() {
        this.$emit('save', {
          mode: this.localMode,
          cycleDays: this.localPlan,
          weekPlan: this.localWeekPlan,
        })
      },
    },
  }
</script>

<style scoped>
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
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
    background-color: rgba(0, 0, 0, 0.7);
  }

  .split-panel {
    position: relative;
    width: 85vw;
    max-width: 360px;
    background-color: #1e1e1e;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    z-index: 10001;
  }

  .split-panel.light {
    background-color: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
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

  .split-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333;
  }

  .split-panel.light .split-header {
    border-bottom-color: #e0e0e0;
  }

  .mode-tabs {
    display: flex;
    padding: 8px 16px;
    gap: 8px;
    border-bottom: 1px solid #333;
  }

  .split-panel.light .mode-tabs {
    border-bottom-color: #e0e0e0;
  }

  .mode-tab {
    flex: 1;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    background-color: #2a2a2a;
    transition: all 0.2s;
  }

  .split-panel.light .mode-tab {
    background-color: #e8e8e8;
  }

  .mode-tab-active {
    background-color: rgba(55, 155, 255, 0.2);
  }

  .split-panel.light .mode-tab-active {
    background-color: rgba(55, 155, 255, 0.15);
  }

  .mode-tab-text {
    font-size: 13px;
    color: #888;
  }

  .mode-tab-text-active {
    color: #379bff;
    font-weight: 500;
  }

  .split-title {
    font-size: 16px;
    font-weight: bold;
    color: #f7f7f7;
  }

  .split-panel.light .split-title {
    color: #333333;
  }

  .close-icon {
    font-size: 20px;
    color: #999;
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .split-panel.light .close-icon {
    color: #666666;
  }

  .split-body {
    padding: 12px 16px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .day-row {
    display: flex;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #2a2a2a;
  }

  .split-panel.light .day-row {
    border-bottom-color: #e0e0e0;
  }

  .day-row:last-child {
    border-bottom: none;
  }

  .day-info {
    width: 48px;
    flex-shrink: 0;
  }

  .day-label {
    font-size: 14px;
    color: #ccc;
    font-weight: 500;
  }

  .split-panel.light .day-label {
    color: #666666;
  }

  .day-control {
    margin-right: 10px;
    flex-shrink: 0;
  }

  .day-toggle {
    padding: 4px 12px;
    border-radius: 100px;
    background-color: #333;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .split-panel.light .day-toggle {
    background-color: #e0e0e0;
  }

  .day-toggle-active {
    background-color: rgba(55, 155, 255, 0.2);
  }

  .toggle-text {
    font-size: 12px;
    color: #999;
  }

  .toggle-text-active {
    color: #379bff;
  }

  .day-template {
    flex: 1;
    min-width: 0;
  }

  .tpl-picker {
    display: flex;
    align-items: center;
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 6px 10px;
  }

  .split-panel.light .tpl-picker {
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
  }

  .tpl-picker-text {
    flex: 1;
    font-size: 13px;
    color: #f7f7f7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .split-panel.light .tpl-picker-text {
    color: #333333;
  }

  .tpl-arrow {
    font-size: 12px;
    color: #666;
    margin-left: 4px;
  }

  .day-remove {
    margin-left: 8px;
    width: 28px;
    height: 28px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
  }

  .remove-icon {
    font-size: 18px;
    color: #666;
  }

  .add-day-row {
    margin-top: 8px;
    padding: 10px;
    text-align: center;
    border: 1px dashed #444;
    border-radius: 10px;
  }

  .split-panel.light .add-day-row {
    border: 1px dashed #e0e0e0;
  }

  .add-day-text {
    font-size: 14px;
    color: #379bff;
  }

  .split-footer {
    padding: 12px 16px;
    display: flex;
    gap: 12px;
    border-top: 1px solid #333;
  }

  .split-panel.light .split-footer {
    border-top-color: #e0e0e0;
  }

  .btn-cancel {
    flex: 1;
    height: 44px;
    line-height: 44px;
    text-align: center;
    border-radius: 10px;
    background-color: #333;
  }

  .split-panel.light .btn-cancel {
    background-color: #e0e0e0;
  }

  .btn-cancel text {
    font-size: 15px;
    color: #bbb;
  }

  .split-panel.light .btn-cancel text {
    color: #666666;
  }

  .btn-save {
    flex: 1;
    height: 44px;
    line-height: 44px;
    text-align: center;
    border-radius: 10px;
    background: linear-gradient(135deg, #379bff, #2d82d6);
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-save text {
    font-size: 15px;
    font-weight: bold;
    color: #fff;
  }

  .btn-save:active {
    transform: scale(0.95);
    opacity: 0.9;
  }
</style>