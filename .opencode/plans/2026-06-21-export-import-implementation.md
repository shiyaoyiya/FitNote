# 导出导入数据功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将backup.vue页面中的"云端备份"标签页替换为"导出导入数据"标签页，支持将模板、分化计划、天数数据导出为文本格式并复制到剪贴板，以及从剪贴板导入数据。

**Architecture:** 采用组件化设计，将导出和导入功能分离为独立组件，通过事件与父组件通信。复用现有的导出格式化逻辑，实现统一的导入解析器。

**Tech Stack:** Vue.js, uni-app, Pinia (状态管理), uni-app API (剪贴板、存储)

---

## 文件结构

### 创建文件
- `components/ExportImportTab.vue` - 导出导入标签页主组件
- `components/ExportTab.vue` - 导出标签页组件
- `components/ImportTab.vue` - 导入标签页组件
- `components/DateRangePicker.vue` - 日期范围选择器组件
- `utils/exportImport.js` - 导出导入工具函数

### 修改文件
- `pages/backup/backup.vue` - 修改标签栏和内容区域

## 任务分解

### Task 1: 创建导出导入工具函数

**Files:**
- Create: `utils/exportImport.js`

- [ ] **Step 1: 创建导出格式化函数**

```javascript
/**
 * 格式化模板数据为文本
 * @param {Array} templates - 模板数组
 * @returns {string} 格式化后的文本
 */
export function formatTemplates(templates) {
  if (!templates || templates.length === 0) return ''
  
  let text = '=== 模板数据 ===\n'
  templates.forEach((tpl, idx) => {
    if (idx > 0) text += '\n'
    text += `${tpl.name}：\n`
    if (tpl.actions && tpl.actions.length > 0) {
      tpl.actions.forEach(act => {
        const sets = (tpl.actionSets && tpl.actionSets[act]) || 4
        text += `${act}×${sets}\n`
      })
    }
  })
  return text
}

/**
 * 格式化分化计划为文本
 * @param {Object} splitPlan - 分化计划对象
 * @param {Array} templates - 模板数组
 * @returns {string} 格式化后的文本
 */
export function formatSplitPlan(splitPlan, templates) {
  if (!splitPlan || !splitPlan.enabled) return ''
  
  const plan = splitPlan.mode === 'cycle' ? splitPlan.cycleDays : splitPlan.weekPlan
  const modeText = splitPlan.mode === 'cycle' ? '按天数' : '按周'
  const dayNames = splitPlan.mode === 'cycle'
    ? plan.map((_, idx) => `第${idx + 1}天`)
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  
  let text = '=== 分化计划 ===\n'
  text += `分化计划（${modeText}）：\n`
  
  plan.forEach((day, idx) => {
    if (day.enabled && day.template) {
      const template = templates.find(t => t.name === day.template)
      text += `${dayNames[idx]}（${day.template}）：\n`
      if (template && template.actions) {
        template.actions.forEach(action => {
          const sets = (template.actionSets && template.actionSets[action]) || 4
          text += `${action}×${sets}\n`
        })
      }
    } else {
      text += `${dayNames[idx]}：休息\n`
    }
    text += '\n'
  })
  
  return text
}

/**
 * 格式化训练数据为文本
 * @param {Object} dayData - 训练数据对象，键为日期，值为训练数据
 * @returns {string} 格式化后的文本
 */
export function formatDayData(dayData) {
  if (!dayData || Object.keys(dayData).length === 0) return ''
  
  let text = '=== 训练数据 ===\n'
  
  Object.keys(dayData).sort().reverse().forEach(date => {
    const data = dayData[date]
    if (!data || !data.chosenActions || data.chosenActions.length === 0) return
    
    text += `${date}（${data.templateName || '未知模板'}）：\n`
    
    data.chosenActions.forEach((actName, actionIdx) => {
      const entries = data.actionEntries ? data.actionEntries[actionIdx] : []
      const filledEntries = entries ? entries.filter(e => !e.isPlaceholder) : []
      if (filledEntries.length === 0) return
      
      text += `${actionIdx + 1}. ${actName}\n`
      filledEntries.forEach((entry, entryIdx) => {
        const stage = entry.stages && entry.stages[0]
        if (stage) {
          const reps = stage.reps
          const weight = stage.weight
          text += `第${entryIdx + 1}组：${reps}次 × ${weight}kg\n`
        }
      })
      text += '\n'
    })
  })
  
  return text
}

/**
 * 导出数据到剪贴板
 * @param {Object} options - 导出选项
 * @param {Array} options.templates - 选中的模板数组
 * @param {Object} options.splitPlan - 分化计划对象
 * @param {Object} options.dayData - 训练数据对象
 * @returns {Promise<boolean>} 是否成功
 */
export async function exportToClipboard(options) {
  const { templates, splitPlan, dayData } = options
  
  let text = ''
  
  if (templates && templates.length > 0) {
    text += formatTemplates(templates) + '\n\n'
  }
  
  if (splitPlan && splitPlan.enabled) {
    text += formatSplitPlan(splitPlan, templates) + '\n\n'
  }
  
  if (dayData && Object.keys(dayData).length > 0) {
    text += formatDayData(dayData) + '\n\n'
  }
  
  text = text.trim()
  
  if (!text) {
    throw new Error('没有可导出的数据')
  }
  
  return new Promise((resolve, reject) => {
    uni.setClipboardData({
      data: text,
      success: () => resolve(true),
      fail: (err) => reject(new Error('复制到剪贴板失败'))
    })
  })
}
```

- [ ] **Step 2: 创建导入解析函数**

```javascript
/**
 * 解析导入的文本数据
 * @param {string} text - 要解析的文本
 * @returns {Object} 解析结果
 */
export function parseImportText(text) {
  if (!text || !text.trim()) {
    return { templates: [], splitPlan: null, dayData: {} }
  }
  
  const result = {
    templates: [],
    splitPlan: null,
    dayData: {}
  }
  
  // 按分隔符分割文本
  const sections = text.split(/===.*?===/).filter(s => s.trim())
  const sectionHeaders = text.match(/===.*?===/g) || []
  
  sections.forEach((section, idx) => {
    const header = sectionHeaders[idx] || ''
    const content = section.trim()
    
    if (header.includes('模板数据')) {
      result.templates = parseTemplates(content)
    } else if (header.includes('分化计划')) {
      result.splitPlan = parseSplitPlan(content)
    } else if (header.includes('训练数据')) {
      result.dayData = parseDayData(content)
    }
  })
  
  return result
}

/**
 * 解析模板数据
 * @param {string} text - 模板文本
 * @returns {Array} 模板数组
 */
function parseTemplates(text) {
  const templates = []
  const lines = text.split('\n').filter(l => l.trim())
  
  let currentTemplate = null
  
  lines.forEach(line => {
    if (line.endsWith('：') || line.endsWith(':')) {
      // 模板名称行
      if (currentTemplate) {
        templates.push(currentTemplate)
      }
      currentTemplate = {
        name: line.replace(/[：:]$/, '').trim(),
        actions: [],
        actionSets: {}
      }
    } else if (currentTemplate && line.includes('×')) {
      // 动作行
      const match = line.match(/^(.+?)×(\d+)$/)
      if (match) {
        const actionName = match[1].trim()
        const sets = parseInt(match[2])
        currentTemplate.actions.push(actionName)
        currentTemplate.actionSets[actionName] = sets
      }
    }
  })
  
  if (currentTemplate) {
    templates.push(currentTemplate)
  }
  
  return templates
}

/**
 * 解析分化计划
 * @param {string} text - 分化计划文本
 * @returns {Object} 分化计划对象
 */
function parseSplitPlan(text) {
  const lines = text.split('\n').filter(l => l.trim())
  
  let mode = 'cycle'
  let cycleDays = []
  let weekPlan = []
  
  // 解析模式
  const modeMatch = text.match(/分化计划（(按天数|按周)）/)
  if (modeMatch) {
    mode = modeMatch[1] === '按天数' ? 'cycle' : 'week'
  }
  
  lines.forEach(line => {
    if (line.includes('（') && line.includes('）')) {
      // 有模板的天
      const dayMatch = line.match(/^(.*?)（(.*?)）/)
      if (dayMatch) {
        const dayName = dayMatch[1]
        const templateName = dayMatch[2]
        
        const dayObj = { template: templateName, enabled: true }
        
        if (mode === 'cycle') {
          cycleDays.push(dayObj)
        } else {
          weekPlan.push(dayObj)
        }
      }
    } else if (line.includes('：休息')) {
      // 休息天
      const dayName = line.split('：')[0]
      const dayObj = { template: null, enabled: false }
      
      if (mode === 'cycle') {
        cycleDays.push(dayObj)
      } else {
        weekPlan.push(dayObj)
      }
    }
  })
  
  return {
    enabled: true,
    mode,
    cycleDays,
    weekPlan,
    startOffset: 0,
    lastActiveDate: ''
  }
}

/**
 * 解析训练数据
 * @param {string} text - 训练数据文本
 * @returns {Object} 训练数据对象
 */
function parseDayData(text) {
  const dayData = {}
  const lines = text.split('\n').filter(l => l.trim())
  
  let currentDate = null
  let currentData = null
  let currentActionIdx = -1
  
  lines.forEach(line => {
    // 日期行：2026-06-21（模板名）：
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})（(.*?)）/)
    if (dateMatch) {
      if (currentDate && currentData) {
        dayData[currentDate] = currentData
      }
      
      currentDate = dateMatch[1]
      currentData = {
        templateName: dateMatch[2],
        chosenActions: [],
        actionEntries: []
      }
      currentActionIdx = -1
      return
    }
    
    // 动作行：1. 卧推
    const actionMatch = line.match(/^\d+\.\s+(.+)$/)
    if (actionMatch && currentData) {
      currentData.chosenActions.push(actionMatch[1])
      currentData.actionEntries.push([])
      currentActionIdx = currentData.chosenActions.length - 1
      return
    }
    
    // 组数行：第1组：10次 × 60kg
    const setMatch = line.match(/^第(\d+)组：(\d+)次 × (\d+)kg$/)
    if (setMatch && currentData && currentActionIdx >= 0) {
      const entry = {
        stages: [{
          reps: parseInt(setMatch[2]),
          weight: parseInt(setMatch[3])
        }],
        isPlaceholder: false
      }
      currentData.actionEntries[currentActionIdx].push(entry)
    }
  })
  
  if (currentDate && currentData) {
    dayData[currentDate] = currentData
  }
  
  return dayData
}

/**
 * 从剪贴板导入数据
 * @returns {Promise<Object>} 解析后的数据
 */
export async function importFromClipboard() {
  return new Promise((resolve, reject) => {
    uni.getClipboardData({
      success: (res) => {
        if (res && res.data) {
          try {
            const parsed = parseImportText(res.data)
            resolve(parsed)
          } catch (err) {
            reject(new Error('无法解析剪贴板中的数据'))
          }
        } else {
          reject(new Error('剪贴板为空'))
        }
      },
      fail: () => {
        reject(new Error('获取剪贴板失败'))
      }
    })
  })
}
```

- [ ] **Step 3: 测试工具函数**

创建测试文件 `tests/utils/exportImport.test.js`：

```javascript
import { formatTemplates, formatSplitPlan, formatDayData, parseImportText } from '@/utils/exportImport'

describe('exportImport', () => {
  test('formatTemplates', () => {
    const templates = [
      {
        name: '胸肌训练',
        actions: ['卧推', '飞鸟'],
        actionSets: { '卧推': 4, '飞鸟': 3 }
      }
    ]
    const result = formatTemplates(templates)
    expect(result).toContain('=== 模板数据 ===')
    expect(result).toContain('胸肌训练：')
    expect(result).toContain('卧推×4')
    expect(result).toContain('飞鸟×3')
  })
  
  test('parseImportText', () => {
    const text = `=== 模板数据 ===
胸肌训练：
卧推×4
飞鸟×3

=== 训练数据 ===
2026-06-21（胸肌训练）：
1. 卧推
第1组：10次 × 60kg
第2组：8次 × 70kg`
    
    const result = parseImportText(text)
    expect(result.templates).toHaveLength(1)
    expect(result.templates[0].name).toBe('胸肌训练')
    expect(result.dayData['2026-06-21']).toBeDefined()
  })
})
```

- [ ] **Step 4: 运行测试**

```bash
npm test -- tests/utils/exportImport.test.js
```

- [ ] **Step 5: 提交代码**

```bash
git add utils/exportImport.js tests/utils/exportImport.test.js
git commit -m "feat: add export/import utility functions"
```

### Task 2: 创建日期范围选择器组件

**Files:**
- Create: `components/DateRangePicker.vue`

- [ ] **Step 1: 创建日期范围选择器组件**

```vue
<template>
  <view class="date-range-picker">
    <view class="picker-header">
      <text class="picker-title">选择日期范围</text>
      <view class="picker-mode-switch">
        <view 
          :class="['mode-btn', { active: mode === 'range' }]" 
          @click="mode = 'range'"
        >
          范围选择
        </view>
        <view 
          :class="['mode-btn', { active: mode === 'multi' }]" 
          @click="mode = 'multi'"
        >
          多选日期
        </view>
      </view>
    </view>
    
    <!-- 范围选择模式 -->
    <view v-if="mode === 'range'" class="range-mode">
      <view class="date-inputs">
        <view class="date-input-group">
          <text class="input-label">开始日期</text>
          <picker mode="date" :value="startDate" @change="onStartDateChange">
            <view class="date-input">{{ startDate || '选择日期' }}</view>
          </picker>
        </view>
        <text class="separator">至</text>
        <view class="date-input-group">
          <text class="input-label">结束日期</text>
          <picker mode="date" :value="endDate" @change="onEndDateChange">
            <view class="date-input">{{ endDate || '选择日期' }}</view>
          </picker>
        </view>
      </view>
      <view class="range-info" v-if="startDate && endDate">
        <text class="info-text">已选择 {{ selectedDates.length }} 天</text>
        <text class="info-hint" v-if="filteredCount > 0">
          （已过滤 {{ filteredCount }} 天无数据日期）
        </text>
      </view>
    </view>
    
    <!-- 多选模式 -->
    <view v-if="mode === 'multi'" class="multi-mode">
      <view class="calendar-header">
        <view class="nav-btn" @click="prevMonth">◀</view>
        <text class="current-month">{{ currentYear }}年{{ currentMonth }}月</text>
        <view class="nav-btn" @click="nextMonth">▶</view>
      </view>
      <view class="calendar-grid">
        <view class="weekday" v-for="day in weekDays" :key="day">{{ day }}</view>
        <view 
          v-for="day in calendarDays" 
          :key="day.date"
          :class="['calendar-day', { 
            'other-month': !day.currentMonth,
            'selected': isSelected(day.date),
            'has-data': day.hasData,
            'no-data': !day.hasData
          }]"
          @click="toggleDate(day)"
        >
          <text class="day-number">{{ day.day }}</text>
          <view class="data-indicator" v-if="day.hasData"></view>
        </view>
      </view>
      <view class="selected-dates">
        <text class="selected-title">已选日期：</text>
        <view class="date-tags">
          <view 
            class="date-tag" 
            v-for="date in selectedDates" 
            :key="date"
            @click="removeDate(date)"
          >
            <text>{{ formatDate(date) }}</text>
            <text class="remove-btn">×</text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="picker-actions">
      <view class="btn-cancel" @click="onCancel">取消</view>
      <view class="btn-confirm" @click="onConfirm">确认选择</view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    availableDates: {
      type: Array,
      default: () => []
    },
    initialDates: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      mode: 'range',
      startDate: '',
      endDate: '',
      selectedDates: [...this.initialDates],
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      weekDays: ['日', '一', '二', '三', '四', '五', '六']
    }
  },
  computed: {
    calendarDays() {
      const days = []
      const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1)
      const lastDay = new Date(this.currentYear, this.currentMonth, 0)
      
      // 填充上个月的日期
      const startDay = firstDay.getDay()
      const prevMonthLastDay = new Date(this.currentYear, this.currentMonth - 1, 0).getDate()
      
      for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i
        const date = this.formatDateStr(this.currentYear, this.currentMonth - 1, day)
        days.push({
          day,
          date,
          currentMonth: false,
          hasData: this.availableDates.includes(date)
        })
      }
      
      // 当前月的日期
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = this.formatDateStr(this.currentYear, this.currentMonth, i)
        days.push({
          day: i,
          date,
          currentMonth: true,
          hasData: this.availableDates.includes(date)
        })
      }
      
      // 填充下个月的日期
      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        const date = this.formatDateStr(this.currentYear, this.currentMonth + 1, i)
        days.push({
          day: i,
          date,
          currentMonth: false,
          hasData: this.availableDates.includes(date)
        })
      }
      
      return days
    },
    filteredCount() {
      if (!this.startDate || !this.endDate) return 0
      const start = new Date(this.startDate)
      const end = new Date(this.endDate)
      let count = 0
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDate(d)
        if (!this.availableDates.includes(dateStr)) {
          count++
        }
      }
      
      return count
    }
  },
  methods: {
    formatDateStr(year, month, day) {
      const m = month.toString().padStart(2, '0')
      const d = day.toString().padStart(2, '0')
      return `${year}-${m}-${d}`
    },
    formatDate(date) {
      if (typeof date === 'string') return date
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    onStartDateChange(e) {
      this.startDate = e.detail.value
      this.updateRangeSelection()
    },
    onEndDateChange(e) {
      this.endDate = e.detail.value
      this.updateRangeSelection()
    },
    updateRangeSelection() {
      if (!this.startDate || !this.endDate) return
      
      const start = new Date(this.startDate)
      const end = new Date(this.endDate)
      const dates = []
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDate(d)
        if (this.availableDates.includes(dateStr)) {
          dates.push(dateStr)
        }
      }
      
      this.selectedDates = dates
    },
    isSelected(date) {
      return this.selectedDates.includes(date)
    },
    toggleDate(day) {
      if (!day.currentMonth) return
      
      const idx = this.selectedDates.indexOf(day.date)
      if (idx >= 0) {
        this.selectedDates.splice(idx, 1)
      } else {
        this.selectedDates.push(day.date)
      }
    },
    removeDate(date) {
      const idx = this.selectedDates.indexOf(date)
      if (idx >= 0) {
        this.selectedDates.splice(idx, 1)
      }
    },
    prevMonth() {
      if (this.currentMonth === 1) {
        this.currentMonth = 12
        this.currentYear--
      } else {
        this.currentMonth--
      }
    },
    nextMonth() {
      if (this.currentMonth === 12) {
        this.currentMonth = 1
        this.currentYear++
      } else {
        this.currentMonth++
      }
    },
    onCancel() {
      this.$emit('cancel')
    },
    onConfirm() {
      this.$emit('confirm', this.selectedDates)
    }
  }
}
</script>

<style scoped>
.date-range-picker {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.picker-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.picker-mode-switch {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 2px;
}

.mode-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-radius: 6px;
}

.mode-btn.active {
  background: var(--primary);
  color: #ffffff;
}

.range-mode {
  margin-bottom: 20px;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-input-group {
  flex: 1;
}

.input-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.date-input {
  background: var(--bg-tertiary);
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  color: var(--text-primary);
}

.separator {
  color: var(--text-muted);
  margin-top: 20px;
}

.range-info {
  margin-top: 10px;
  text-align: center;
}

.info-text {
  font-size: 14px;
  color: var(--text-primary);
}

.info-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.multi-mode {
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.nav-btn {
  padding: 8px;
  color: var(--primary);
  cursor: pointer;
}

.current-month {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 15px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  padding: 5px;
}

.calendar-day {
  position: relative;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.calendar-day.other-month {
  opacity: 0.3;
}

.calendar-day.selected {
  background: var(--primary);
}

.calendar-day.selected .day-number {
  color: #ffffff;
}

.calendar-day.has-data {
  background: var(--bg-tertiary);
}

.calendar-day.no-data {
  opacity: 0.5;
}

.day-number {
  font-size: 14px;
  color: var(--text-primary);
}

.data-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}

.selected-dates {
  margin-top: 15px;
}

.selected-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.date-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.date-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-tertiary);
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  color: var(--text-primary);
}

.remove-btn {
  color: var(--danger);
  cursor: pointer;
}

.picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--text-primary);
}

.btn-confirm {
  padding: 10px 20px;
  background: var(--primary);
  border-radius: 8px;
  color: #ffffff;
}
</style>
```

- [ ] **Step 2: 测试日期选择器组件**

在 `backup.vue` 中临时使用组件进行测试。

- [ ] **Step 3: 提交代码**

```bash
git add components/DateRangePicker.vue
git commit -m "feat: add date range picker component"
```

### Task 3: 创建导出标签页组件

**Files:**
- Create: `components/ExportTab.vue`

- [ ] **Step 1: 创建导出标签页组件**

```vue
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
            <text class="template-actions">{{ template.actions ? template.actions.length : 0 }}个动作</text>
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

export default {
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
            if (data && data.chosenActions && data.chosenActions.length > 0) {
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

.template-actions {
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
```

- [ ] **Step 2: 测试导出标签页组件**

在 `backup.vue` 中临时使用组件进行测试。

- [ ] **Step 3: 提交代码**

```bash
git add components/ExportTab.vue
git commit -m "feat: add export tab component"
```

### Task 4: 创建导入标签页组件

**Files:**
- Create: `components/ImportTab.vue`

- [ ] **Step 1: 创建导入标签页组件**

```vue
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
                <text class="item-info">{{ data.chosenActions ? data.chosenActions.length : 0 }}个动作</text>
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
          if (this.importMode === 'overwrite') {
            const daySettingsStore = useDaySettingsStore()
            daySettingsStore.splitPlan = splitPlan
            daySettingsStore.save()
          } else {
            const daySettingsStore = useDaySettingsStore()
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
              
              daySettingsStore.save()
            }
          }
        }
        
        // 导入训练数据
        if (dayData && Object.keys(dayData).length > 0) {
          const DAYDATA_PREFIX = 'fitness_daydata_'
          
          Object.keys(dayData).forEach(date => {
            const key = DAYDATA_PREFIX + date
            const importedData = dayData[date]
            
            if (this.importMode === 'overwrite') {
              uni.setStorageSync(key, importedData)
            } else {
              const existing = uni.getStorageSync(key) || {}
              const merged = this.mergeDayData(existing, importedData)
              uni.setStorageSync(key, merged)
            }
          })
          
          // 重建索引
          const cacheStore = useDayDataCacheStore()
          cacheStore.buildIndex()
          cacheStore.clearCache()
        }
        
        uni.showToast({
          title: '导入成功',
          icon: 'success'
        })
        
        this.$emit('import-success')
        this.parsedData = null
        
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
      
      if (imported.chosenActions && imported.chosenActions.length > 0) {
        merged.chosenActions = imported.chosenActions
        merged.actionEntries = imported.actionEntries
        merged.templateName = imported.templateName
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
```

- [ ] **Step 2: 测试导入标签页组件**

在 `backup.vue` 中临时使用组件进行测试。

- [ ] **Step 3: 提交代码**

```bash
git add components/ImportTab.vue
git commit -m "feat: add import tab component"
```

### Task 5: 修改 backup.vue 文件

**Files:**
- Modify: `pages/backup/backup.vue`

- [ ] **Step 1: 修改标签栏**

将标签栏中的"☁️ 云端备份"改为"📤 导出导入"。

```vue
<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
    <view class="tab-bar">
      <view :class="['tab-item', { active: activeTab === 'local' }]" @click="switchTab('local')">
        📂 本地备份
      </view>
      <view :class="['tab-item', { active: activeTab === 'exportImport' }]" @click="switchTab('exportImport')">
        📤 导出导入
      </view>
    </view>
```

- [ ] **Step 2: 添加导出导入标签页内容**

替换原来的云端备份标签页内容。

```vue
    <!-- 其他内容保持不变 -->
    
    <view v-if="activeTab === 'exportImport'" class="tab-content">
      <view class="export-import-tabs">
        <view 
          :class="['sub-tab', { active: exportImportTab === 'export' }]" 
          @click="exportImportTab = 'export'"
        >
          📤 导出
        </view>
        <view 
          :class="['sub-tab', { active: exportImportTab === 'import' }]" 
          @click="exportImportTab = 'import'"
        >
          📥 导入
        </view>
      </view>
      
      <view class="export-import-content">
        <ExportTab 
          v-if="exportImportTab === 'export'" 
          @export-success="onExportSuccess"
        />
        <ImportTab 
          v-if="exportImportTab === 'import'" 
          @import-success="onImportSuccess"
        />
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 3: 更新 script 部分**

```javascript
<script>
  import {
    backupData,
    getFriendlyBackupPath,
    chooseBackupPath,
    isAndroidApp,
    chooseBackupFile,
    readBackupFile,
  } from '@/utils/backup.js'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import ExportTab from '@/components/ExportTab.vue'
  import ImportTab from '@/components/ImportTab.vue'

  export default {
    components: {
      ExportTab,
      ImportTab
    },
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        dayDataCacheStore: useDayDataCacheStore(),
        backupPath: '',
        lastBackupTime: '',
        isBackingUp: false,
        isRestoring: false,
        backupProgress: 0,
        backupStatus: {
          type: '',
          message: ''
        },
        activeTab: 'local',
        exportImportTab: 'export'
      }
    },
    
    // ... 其他方法保持不变
    
    methods: {
      // ... 其他方法保持不变
      
      switchTab(tab) {
        this.activeTab = tab
      },
      
      onExportSuccess() {
        // 导出成功后的处理
      },
      
      onImportSuccess() {
        // 导入成功后的处理
        // 可能需要刷新某些数据
      }
    }
  }
</script>
```

- [ ] **Step 4: 添加样式**

```css
<style scoped>
  /* 其他样式保持不变 */
  
  .export-import-tabs {
    display: flex;
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 16px;
  }
  
  .sub-tab {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 14px;
    transition: all 0.3s;
  }
  
  .sub-tab.active {
    background: var(--primary);
    color: #ffffff;
  }
  
  .export-import-content {
    flex: 1;
    overflow-y: auto;
  }
</style>
```

- [ ] **Step 5: 删除云端备份相关代码**

删除不再需要的云端备份相关代码，包括：
- `cloudBackups` 数据属性
- `isUploading` 和 `isDownloading` 数据属性
- `loadCloudBackups`、`handleCloudUpload`、`handleCloudDownload`、`restoreDataFromCloud`、`handleCloudDelete`、`formatTime`、`formatSize` 方法
- 相关的导入语句

- [ ] **Step 6: 测试修改后的页面**

运行应用，测试：
1. 标签栏显示正确
2. 可以切换到导出导入标签页
3. 导出功能正常工作
4. 导入功能正常工作

- [ ] **Step 7: 提交代码**

```bash
git add pages/backup/backup.vue
git commit -m "feat: replace cloud backup with export/import functionality"
```

### Task 6: 集成测试

- [ ] **Step 1: 测试导出功能**

1. 创建几个测试模板
2. 设置分化计划
3. 添加一些训练数据
4. 测试导出所有数据类型
5. 测试只导出模板
6. 测试只导出训练数据
7. 验证剪贴板中的文本格式正确

- [ ] **Step 2: 测试导入功能**

1. 复制之前导出的文本
2. 测试导入功能
3. 验证数据正确导入
4. 测试覆盖导入模式
5. 测试合并导入模式
6. 验证数据合并正确

- [ ] **Step 3: 测试错误处理**

1. 测试未选择数据时导出
2. 测试空剪贴板导入
3. 测试无效格式导入
4. 验证错误提示正确显示

- [ ] **Step 4: 提交最终代码**

```bash
git add -A
git commit -m "feat: complete export/import data functionality"
```

## 执行选项

**Plan complete and saved to `.opencode/plans/2026-06-21-export-import-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
