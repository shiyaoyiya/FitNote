<template>
  <view class="popup-overlay" @click.self="onClose">
    <view class="overlay-bg" @click="onClose"></view>
    <view class="split-panel fade-in" :class="{ light: isLightMode }" @click.stop>
      <view class="split-header">
        <text class="split-title">设置分化计划</text>
        <view class="header-actions">
          <text class="import-export-icon" @click="openImportExportPanel">📤</text>
          <text class="close-icon" @click="onClose">×</text>
        </view>
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
        showImportExportPanel: false,
        importExportTab: 'export',
        importText: '',
        parsedPlan: null,
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
      openImportExportPanel() {
        this.showImportExportPanel = true
        this.importExportTab = 'export'
        this.importText = ''
        this.parsedPlan = null
      },
      closeImportExportPanel() {
        this.showImportExportPanel = false
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
    background-color: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    z-index: 10001;
  }

  .split-panel.light {
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
    border-bottom: 1px solid var(--border-color);
  }

  .mode-tabs {
    display: flex;
    padding: 8px 16px;
    gap: 8px;
    border-bottom: 1px solid var(--border-color);
  }

  .mode-tab {
    flex: 1;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    background-color: var(--bg-tertiary);
    transition: all 0.2s;
  }

  .mode-tab-active {
    background-color: rgba(55, 155, 255, 0.2);
  }

  .split-panel.light .mode-tab-active {
    background-color: rgba(55, 155, 255, 0.15);
  }

  .mode-tab-text {
    font-size: 13px;
    color: var(--text-muted);
  }

  .mode-tab-text-active {
    color: var(--primary);
    font-weight: 500;
  }

  .split-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--text-primary);
  }

  .close-icon {
    font-size: 20px;
    color: var(--text-secondary);
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .import-export-icon {
    font-size: 18px;
    color: var(--text-secondary);
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
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
    border-bottom: 1px solid var(--bg-tertiary);
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
    color: var(--text-secondary);
    font-weight: 500;
  }

  .day-control {
    margin-right: 10px;
    flex-shrink: 0;
  }

  .day-toggle {
    padding: 4px 12px;
    border-radius: 100px;
    background-color: var(--border-color);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .day-toggle-active {
    background-color: rgba(55, 155, 255, 0.2);
  }

  .toggle-text {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .toggle-text-active {
    color: var(--primary);
  }

  .day-template {
    flex: 1;
    min-width: 0;
  }

  .tpl-picker {
    display: flex;
    align-items: center;
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    padding: 6px 10px;
  }

  .split-panel.light .tpl-picker {
    border: 1px solid var(--border-color);
  }

  .tpl-picker-text {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-arrow {
    font-size: 12px;
    color: var(--text-muted);
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
    color: var(--text-muted);
  }

  .add-day-row {
    margin-top: 8px;
    padding: 10px;
    text-align: center;
    border: 1px dashed var(--border-color);
    border-radius: 10px;
  }

  .add-day-text {
    font-size: 14px;
    color: var(--primary);
  }

  .split-footer {
    padding: 12px 16px;
    display: flex;
    gap: 12px;
    border-top: 1px solid var(--border-color);
  }

  .btn-cancel {
    flex: 1;
    height: 44px;
    line-height: 44px;
    text-align: center;
    border-radius: 10px;
    background-color: var(--border-color);
  }

  .btn-cancel text {
    font-size: 15px;
    color: var(--text-secondary);
  }

  .btn-save {
    flex: 1;
    height: 44px;
    line-height: 44px;
    text-align: center;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--primary), var(--primary));
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