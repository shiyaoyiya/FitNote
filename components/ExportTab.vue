<template>
  <view class="export-tab">
    <!-- 模板选择 -->
    <view class="export-section">
      <view class="section-header">
        <view class="section-title">
          <text class="icon">📋</text>
          <text>模板数据</text>
        </view>
        <view class="toggle-switch" @click="toggleTemplateSection">
          <view :class="['switch', { active: includeTemplates }]"></view>
        </view>
      </view>
      
      <view v-if="includeTemplates" class="template-selection">
        <view class="select-all" @click="toggleSelectAll">
          <view :class="['checkbox', { checked: allTemplatesSelected }]"></view>
          <text>全选</text>
        </view>
        <view class="template-list">
          <view 
            v-for="template in templates" 
            :key="template.name"
            :class="['template-item', { selected: selectedTemplates.includes(template.name) }]"
            @click="toggleTemplate(template.name)"
          >
            <view :class="['checkbox', { checked: selectedTemplates.includes(template.name) }]"></view>
            <text class="template-name">{{ template.name }}</text>
            <text class="template-actions-count">{{ template.actions ? template.actions.length : 0 }}个动作</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 分化计划选择 -->
    <view class="export-section">
      <view class="section-header">
        <view class="section-title">
          <text class="icon">📅</text>
          <text>分化计划</text>
        </view>
        <view class="toggle-switch" @click="toggleSplitPlan">
          <view :class="['switch', { active: includeSplitPlan }]"></view>
        </view>
      </view>
      <view v-if="includeSplitPlan && splitPlan && splitPlan.enabled" class="plan-preview">
        <text class="plan-mode">模式：{{ splitPlan.mode === 'cycle' ? '按天数' : '按周' }}</text>
        <text class="plan-days">{{ planDaysCount }}天</text>
      </view>
      <view v-else-if="includeSplitPlan" class="no-data">
        <text>暂未设置分化计划</text>
      </view>
    </view>
    
    <!-- 训练数据选择 -->
    <view class="export-section">
      <view class="section-header">
        <view class="section-title">
          <text class="icon">📊</text>
          <text>训练数据</text>
        </view>
        <view class="toggle-switch" @click="toggleDayData">
          <view :class="['switch', { active: includeDayData }]"></view>
        </view>
      </view>
      
      <view v-if="includeDayData" class="day-data-selection">
        <view class="date-range-display" @click="showDatePicker = true">
          <text v-if="selectedDates.length === 0">选择日期范围</text>
          <text v-else>已选择 {{ selectedDates.length }} 天</text>
          <text class="arrow">▶</text>
        </view>
        
        <view v-if="selectedDates.length > 0" class="selected-dates-preview">
          <view class="date-chip" v-for="date in selectedDates.slice(0, 5)" :key="date">
            <text>{{ formatDateShort(date) }}</text>
          </view>
          <view v-if="selectedDates.length > 5" class="more-dates">
            <text>+{{ selectedDates.length - 5 }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 导出按钮 -->
    <view class="export-action">
      <view 
        :class="['export-btn', { disabled: !canExport }]" 
        @click="handleExport"
      >
        <text class="btn-icon">📤</text>
        <text class="btn-text">导出到剪贴板</text>
      </view>
      <text class="export-hint" v-if="exportPreview">
        预计导出：{{ exportPreview }}
      </text>
    </view>
    
    <!-- 日期选择器弹窗 -->
    <view class="date-picker-modal" v-if="showDatePicker" @click.self="showDatePicker = false">
      <view class="modal-content">
        <DateRangePicker 
          :availableDates="availableDates"
          :initialDates="selectedDates"
          @confirm="onDatesConfirm"
          @cancel="showDatePicker = false"
        />
      </view>
    </view>
  </view>
</template>

<script>
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { formatTemplates, formatSplitPlan, formatDayData } from '@/utils/exportImport.js'
import DateRangePicker from '@/components/DateRangePicker.vue'

export default {
  components: {
    DateRangePicker
  },
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      includeTemplates: true,
      includeSplitPlan: true,
      includeDayData: true,
      selectedTemplates: [],
      selectedDates: [],
      showDatePicker: false,
      templates: []
    }
  },
  computed: {
    splitPlan() {
      return this.daySettingsStore.splitPlan
    },
    allTemplatesSelected() {
      return this.templates.length > 0 && this.selectedTemplates.length === this.templates.length
    },
    planDaysCount() {
      if (!this.splitPlan || !this.splitPlan.enabled) return 0
      const plan = this.splitPlan.mode === 'cycle' ? this.splitPlan.cycleDays : this.splitPlan.weekPlan
      return plan.filter(d => d.enabled).length
    },
    availableDates() {
      // 从存储中获取有数据的日期
      const dates = []
      const info = uni.getStorageInfoSync()
      info.keys.forEach(key => {
        if (key.startsWith('fitness_daydata_')) {
          const date = key.replace('fitness_daydata_', '')
          dates.push(date)
        }
      })
      return dates.sort()
    },
    canExport() {
      if (!this.includeTemplates && !this.includeSplitPlan && !this.includeDayData) {
        return false
      }
      if (this.includeTemplates && this.selectedTemplates.length === 0) {
        return false
      }
      if (this.includeDayData && this.selectedDates.length === 0) {
        return false
      }
      return true
    },
    exportPreview() {
      const parts = []
      if (this.includeTemplates && this.selectedTemplates.length > 0) {
        parts.push(`${this.selectedTemplates.length}个模板`)
      }
      if (this.includeSplitPlan && this.splitPlan && this.splitPlan.enabled) {
        parts.push('分化计划')
      }
      if (this.includeDayData && this.selectedDates.length > 0) {
        parts.push(`${this.selectedDates.length}天数据`)
      }
      return parts.join('、')
    }
  },
  created() {
    this.loadTemplates()
  },
  methods: {
    loadTemplates() {
      try {
        const data = uni.getStorageSync('fitness_templates')
        if (data && Array.isArray(data)) {
          this.templates = data
          this.selectedTemplates = data.map(t => t.name)
        }
      } catch (err) {
        console.error('加载模板失败:', err)
      }
    },
    toggleTemplateSection() {
      this.includeTemplates = !this.includeTemplates
    },
    toggleSplitPlan() {
      this.includeSplitPlan = !this.includeSplitPlan
    },
    toggleDayData() {
      this.includeDayData = !this.includeDayData
    },
    toggleSelectAll() {
      if (this.allTemplatesSelected) {
        this.selectedTemplates = []
      } else {
        this.selectedTemplates = this.templates.map(t => t.name)
      }
    },
    toggleTemplate(name) {
      const idx = this.selectedTemplates.indexOf(name)
      if (idx >= 0) {
        this.selectedTemplates.splice(idx, 1)
      } else {
        this.selectedTemplates.push(name)
      }
    },
    formatDateShort(date) {
      const parts = date.split('-')
      return `${parts[1]}-${parts[2]}`
    },
    onDatesConfirm(dates) {
      this.selectedDates = dates
      this.showDatePicker = false
    },
    async handleExport() {
      if (!this.canExport) {
        uni.showToast({
          title: '请选择要导出的数据',
          icon: 'none'
        })
        return
      }
      
      uni.showLoading({ title: '导出中...' })
      
      try {
        // 收集模板数据
        let templates = []
        if (this.includeTemplates) {
          templates = this.templates.filter(t => this.selectedTemplates.includes(t.name))
        }
        
        // 收集分化计划数据
        let splitPlan = null
        if (this.includeSplitPlan && this.splitPlan && this.splitPlan.enabled) {
          splitPlan = this.splitPlan
        }
        
        // 收集训练数据
        let dayData = {}
        if (this.includeDayData && this.selectedDates.length > 0) {
          this.selectedDates.forEach(date => {
            const key = `fitness_daydata_${date}`
            const data = uni.getStorageSync(key)
            // 检查是否有有效的训练数据
            if (data && !data.isRestDay && data.entries && Object.keys(data.entries).length > 0) {
              dayData[date] = data
            }
          })
        }
        
        // 格式化并导出
        let text = ''
        
        if (templates.length > 0) {
          text += formatTemplates(templates) + '\n\n'
        }
        
        if (splitPlan) {
          text += formatSplitPlan(splitPlan, this.templates) + '\n\n'
        }
        
        if (Object.keys(dayData).length > 0) {
          text += formatDayData(dayData) + '\n\n'
        }
        
        text = text.trim()
        
        if (!text) {
          throw new Error('没有可导出的数据')
        }
        
        uni.setClipboardData({
          data: text,
          success: () => {
            uni.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
            this.$emit('export-success')
          },
          fail: () => {
            throw new Error('复制到剪贴板失败')
          }
        })
      } catch (err) {
        console.error('导出失败:', err)
        uni.showToast({
          title: err.message || '导出失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.export-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.icon {
  font-size: 20px;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 2px;
  cursor: pointer;
}

.switch {
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.3s;
}

.switch.active {
  transform: translateX(20px);
  background: var(--primary);
}

.template-selection {
  margin-top: 12px;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background: var(--primary);
  border-color: var(--primary);
}

.checkbox.checked::after {
  content: '✓';
  color: #ffffff;
  font-size: 12px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
}

.template-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.template-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.template-actions-count {
  font-size: 12px;
  color: var(--text-muted);
}

.plan-preview {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.plan-mode, .plan-days {
  font-size: 14px;
  color: var(--text-secondary);
}

.no-data {
  padding: 10px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
}

.day-data-selection {
  margin-top: 12px;
}

.date-range-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
}

.date-range-display text {
  font-size: 14px;
  color: var(--text-primary);
}

.arrow {
  color: var(--text-muted);
}

.selected-dates-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.date-chip {
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.more-dates {
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.export-action {
  margin-top: 20px;
  text-align: center;
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(135deg, #007aff, #0056b3);
  border-radius: 16px;
  cursor: pointer;
}

.export-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
}

.export-hint {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.date-picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 400px;
}
</style>
