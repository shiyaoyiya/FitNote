<template>
  <view class="import-tab">
    <!-- 粘贴区域 -->
    <view class="paste-section">
      <view class="section-header">
        <view class="section-title">
          <text class="icon">📋</text>
          <text>从剪贴板导入</text>
        </view>
      </view>
      <view class="paste-action">
        <view class="paste-btn" @click="handlePaste">
          <text class="btn-icon">📋</text>
          <text class="btn-text">从剪贴板粘贴</text>
        </view>
        <text class="paste-hint">粘贴之前导出的文本数据</text>
      </view>
    </view>
    
    <!-- 导入预览 -->
    <view v-if="parsedData" class="preview-section">
      <view class="section-header">
        <view class="section-title">
          <text class="icon">👁️</text>
          <text>导入预览</text>
        </view>
      </view>
      
      <view class="preview-content">
        <view class="preview-item" v-if="parsedData.templates.length > 0">
          <text class="preview-label">模板：</text>
          <text class="preview-value">{{ parsedData.templates.length }}个</text>
        </view>
        <view class="preview-item" v-if="parsedData.splitPlan && parsedData.splitPlan.enabled">
          <text class="preview-label">分化计划：</text>
          <text class="preview-value">有</text>
        </view>
        <view class="preview-item" v-if="Object.keys(parsedData.dayData).length > 0">
          <text class="preview-label">训练数据：</text>
          <text class="preview-value">{{ Object.keys(parsedData.dayData).length }}天</text>
        </view>
      </view>
      
      <!-- 详细预览 -->
      <view class="detailed-preview">
        <view class="detail-toggle" @click="showDetails = !showDetails">
          <text>{{ showDetails ? '隐藏详情' : '显示详情' }}</text>
          <text class="toggle-arrow">{{ showDetails ? '▲' : '▼' }}</text>
        </view>
        
        <view v-if="showDetails" class="detail-content">
          <!-- 模板详情 -->
          <view v-if="parsedData.templates.length > 0" class="detail-section">
            <text class="detail-title">模板详情：</text>
            <view class="detail-list">
              <view v-for="template in parsedData.templates" :key="template.name" class="detail-item">
                <text class="item-name">{{ template.name }}</text>
                <text class="item-info">{{ template.actions ? template.actions.length : 0 }}个动作</text>
              </view>
            </view>
          </view>
          
          <!-- 训练数据详情 -->
          <view v-if="Object.keys(parsedData.dayData).length > 0" class="detail-section">
            <text class="detail-title">训练数据详情：</text>
            <view class="detail-list">
              <view v-for="(data, date) in parsedData.dayData" :key="date" class="detail-item">
                <text class="item-name">{{ date }}</text>
                <text class="item-info">{{ data.entries ? Object.keys(data.entries).length : 0 }}个动作</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 导入选项 -->
    <view v-if="parsedData" class="options-section">
      <view class="section-header">
        <view class="section-title">
          <text class="icon">⚙️</text>
          <text>导入选项</text>
        </view>
      </view>
      
      <view class="import-options">
        <view 
          :class="['option-item', { selected: importMode === 'overwrite' }]"
          @click="importMode = 'overwrite'"
        >
          <view class="radio-btn">
            <view :class="['radio', { checked: importMode === 'overwrite' }]"></view>
          </view>
          <view class="option-content">
            <text class="option-title">覆盖导入</text>
            <text class="option-desc">清除现有数据，完全替换为导入数据</text>
          </view>
        </view>
        
        <view 
          :class="['option-item', { selected: importMode === 'merge' }]"
          @click="importMode = 'merge'"
        >
          <view class="radio-btn">
            <view :class="['radio', { checked: importMode === 'merge' }]"></view>
          </view>
          <view class="option-content">
            <text class="option-title">合并导入</text>
            <text class="option-desc">保留现有数据，将导入数据合并到现有数据中</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 导入按钮 -->
    <view v-if="parsedData" class="import-action">
      <view 
        :class="['import-btn', { disabled: !canImport }]" 
        @click="handleImport"
      >
        <text class="btn-icon">📥</text>
        <text class="btn-text">确认导入</text>
      </view>
    </view>
    
    <!-- 错误提示 -->
    <view v-if="errorMessage" class="error-message">
      <text class="error-icon">❌</text>
      <text class="error-text">{{ errorMessage }}</text>
    </view>
  </view>
</template>

<script>
import { importFromClipboard } from '@/utils/exportImport.js'
import { useDayDataCacheStore } from '@/stores/dayDataCache.js'
import { useDaySettingsStore } from '@/stores/daySettings.js'

export default {
  data() {
    return {
      parsedData: null,
      importMode: 'merge',
      showDetails: false,
      errorMessage: '',
      isImporting: false
    }
  },
  computed: {
    canImport() {
      return this.parsedData && !this.isImporting
    }
  },
  methods: {
    async handlePaste() {
      this.errorMessage = ''
      
      try {
        uni.showLoading({ title: '解析中...' })
        this.parsedData = await importFromClipboard()
        
        if (!this.parsedData.templates.length && 
            !this.parsedData.splitPlan && 
            !Object.keys(this.parsedData.dayData).length) {
          this.errorMessage = '未能识别到有效数据'
          this.parsedData = null
        }
      } catch (err) {
        this.errorMessage = err.message
        this.parsedData = null
      } finally {
        uni.hideLoading()
      }
    },
    async handleImport() {
      if (!this.canImport || this.isImporting) return
      
      this.isImporting = true
      uni.showLoading({ title: '导入中...' })
      
      try {
        const { templates, splitPlan, dayData } = this.parsedData
        
        // 导入模板
        if (templates && templates.length > 0) {
          if (this.importMode === 'overwrite') {
            uni.setStorageSync('fitness_templates', templates)
          } else {
            const existing = uni.getStorageSync('fitness_templates') || []
            const merged = this.mergeArraysUnique(existing, templates)
            uni.setStorageSync('fitness_templates', merged)
          }
        }
        
        // 导入分化计划
        if (splitPlan && splitPlan.enabled) {
          const daySettingsStore = useDaySettingsStore()
          
          if (this.importMode === 'overwrite') {
            daySettingsStore.splitPlan = splitPlan
          } else {
            // 合并分化计划
            if (splitPlan.mode === daySettingsStore.splitPlan.mode) {
              const existingPlan = daySettingsStore.splitPlan.mode === 'cycle' 
                ? daySettingsStore.splitPlan.cycleDays 
                : daySettingsStore.splitPlan.weekPlan
              const importedPlan = splitPlan.mode === 'cycle' 
                ? splitPlan.cycleDays 
                : splitPlan.weekPlan
              
              const merged = this.mergeArraysUnique(existingPlan, importedPlan)
              
              if (daySettingsStore.splitPlan.mode === 'cycle') {
                daySettingsStore.splitPlan.cycleDays = merged
              } else {
                daySettingsStore.splitPlan.weekPlan = merged
              }
            } else {
              // 模式不同，覆盖
              daySettingsStore.splitPlan = splitPlan
            }
          }
          
          daySettingsStore.save()
        }
        
        // 导入训练数据
        if (dayData && Object.keys(dayData).length > 0) {
          const DAYDATA_PREFIX = 'fitness_daydata_'
          const cacheStore = useDayDataCacheStore()
          
          Object.keys(dayData).forEach(date => {
            const key = DAYDATA_PREFIX + date
            const importedData = dayData[date]
            
            if (this.importMode === 'overwrite') {
              cacheStore.saveDayData(date, importedData)
            } else {
              const existing = uni.getStorageSync(key) || {}
              const merged = this.mergeDayData(existing, importedData)
              cacheStore.saveDayData(date, merged)
            }
          })
        }
        
        uni.showToast({
          title: '导入成功',
          icon: 'success'
        })
        
        this.$emit('import-success')
        this.parsedData = null
        
        // 延迟刷新页面，确保数据已保存
        setTimeout(() => {
          uni.$emit('day-data-updated')
        }, 500)
        
      } catch (err) {
        console.error('导入失败:', err)
        uni.showToast({
          title: '导入失败: ' + (err.message || '未知错误'),
          icon: 'none'
        })
      } finally {
        this.isImporting = false
        uni.hideLoading()
      }
    },
    mergeArraysUnique(arrA, arrB) {
      const a = Array.isArray(arrA) ? arrA.slice() : []
      const b = Array.isArray(arrB) ? arrB : []
      
      b.forEach(item => {
        const exists = a.some(x => {
          if (typeof x === 'object' && typeof item === 'object') {
            return x.name === item.name
          }
          return JSON.stringify(x) === JSON.stringify(item)
        })
        
        if (!exists) {
          a.push(item)
        }
      })
      
      return a
    },
    mergeDayData(existing, imported) {
      const merged = { ...existing }
      
      // 合并模板数据
      if (imported.templates) {
        merged.templates = { ...merged.templates, ...imported.templates }
      }
      
      // 合并动作数据
      if (imported.entries) {
        merged.entries = { ...merged.entries, ...imported.entries }
      }
      
      // 合并动作计数
      if (imported.actions) {
        merged.actions = { ...merged.actions, ...imported.actions }
      }
      
      return merged
    }
  }
}
</script>

<style scoped>
.import-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paste-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 16px;
}

.section-header {
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

.paste-action {
  text-align: center;
}

.paste-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  cursor: pointer;
}

.paste-btn:active {
  opacity: 0.7;
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  font-size: 15px;
  color: var(--text-primary);
}

.paste-hint {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.preview-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 16px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.preview-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.preview-value {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
}

.detailed-preview {
  margin-top: 12px;
}

.detail-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
  cursor: pointer;
}

.detail-toggle text {
  font-size: 13px;
  color: var(--primary);
}

.toggle-arrow {
  font-size: 10px;
}

.detail-content {
  margin-top: 10px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-title {
  font-size: 13px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.item-name {
  font-size: 13px;
  color: var(--text-primary);
}

.item-info {
  font-size: 12px;
  color: var(--text-muted);
}

.options-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 16px;
}

.import-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  cursor: pointer;
}

.option-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.radio-btn {
  margin-top: 2px;
}

.radio {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio.checked {
  border-color: var(--primary);
}

.radio.checked::after {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--primary);
  border-radius: 50%;
}

.option-content {
  flex: 1;
}

.option-title {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.import-action {
  margin-top: 20px;
  text-align: center;
}

.import-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(135deg, #34c759, #28a745);
  border-radius: 16px;
  cursor: pointer;
}

.import-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-btn .btn-text {
  color: #ffffff;
  font-weight: bold;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #ffebee;
  border-radius: 8px;
  margin-top: 10px;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  font-size: 14px;
  color: #c62828;
}
</style>
