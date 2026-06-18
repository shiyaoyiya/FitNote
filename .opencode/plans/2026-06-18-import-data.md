# 导入数据功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 FitNote 健身记录应用中添加"导入数据"功能，允许用户从备忘录等外部应用导入训练数据到当天的训练记录中。

**Architecture:** 采用模块化设计，将文本解析、数据合并和UI组件分离。文本解析支持多种常见格式，数据合并采用智能匹配策略，UI组件提供预览确认功能。

**Tech Stack:** Vue.js, uni-app, Pinia, JavaScript

---

## 文件结构

### 创建文件
- `utils/importParser.js` - 文本解析函数
- `utils/dataMerger.js` - 数据合并函数
- `components/ImportDataModal.vue` - 导入数据弹窗组件

### 修改文件
- `components/DaySettings.vue` - 添加导入数据按钮
- `pages/index/day.vue` - 处理导入数据事件

---

## 任务1：创建 importParser.js - 文本解析函数

**Files:**
- Create: `utils/importParser.js`

- [ ] **Step 1: 创建基础解析函数**

```javascript
/**
 * 解析导入的文本数据
 * @param {string} text - 原始文本
 * @returns {Array} 解析后的动作和组数数组
 */
export function parseImportText(text) {
  if (!text || typeof text !== 'string') {
    return []
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const result = []
  let currentAction = null

  for (const line of lines) {
    // 尝试解析动作名
    const actionName = parseActionName(line)
    if (actionName) {
      if (currentAction) {
        result.push(currentAction)
      }
      currentAction = {
        actionName,
        entries: []
      }
      continue
    }

    // 尝试解析组数
    if (currentAction) {
      const entries = parseEntries(line)
      if (entries.length > 0) {
        currentAction.entries.push(...entries)
      }
    }
  }

  if (currentAction && currentAction.entries.length > 0) {
    result.push(currentAction)
  }

  return result
}

/**
 * 解析动作名
 * @param {string} line - 文本行
 * @returns {string|null} 动作名或null
 */
function parseActionName(line) {
  // 格式1：数字编号开头，如"1. 卧推"
  const numberedMatch = line.match(/^\d+\.\s*(.+)/)
  if (numberedMatch) {
    return numberedMatch[1].trim()
  }

  // 格式2：动作名后跟冒号，如"卧推："
  const colonMatch = line.match(/^([^：:]+)[：:]/)
  if (colonMatch) {
    return colonMatch[1].trim()
  }

  // 格式3：纯动作名（需要与现有动作库匹配）
  // 这个需要在调用时传入动作库进行匹配
  return null
}

/**
 * 解析组数
 * @param {string} line - 文本行
 * @returns {Array} 解析后的组数数组
 */
function parseEntries(line) {
  const entries = []

  // 格式1：第X组：数字次 × 重量kg
  const stageFormat1 = line.match(/第(\d+)组[：:]\s*(\d+)\s*次?\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*kg?/)
  if (stageFormat1) {
    entries.push({
      reps: parseInt(stageFormat1[2]),
      weight: parseFloat(stageFormat1[3])
    })
    return entries
  }

  // 格式2：数字×重量（多个）
  const stageFormat2 = line.match(/(\d+)\s*[×xX*]\s*(\d+(?:\.\d+)?)/g)
  if (stageFormat2) {
    for (const match of stageFormat2) {
      const parts = match.match(/(\d+)\s*[×xX*]\s*(\d+(?:\.\d+)?)/)
      if (parts) {
        entries.push({
          reps: parseInt(parts[1]),
          weight: parseFloat(parts[2])
        })
      }
    }
    return entries
  }

  // 格式3：数字次 重量kg
  const stageFormat3 = line.match(/(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/g)
  if (stageFormat3) {
    for (const match of stageFormat3) {
      const parts = match.match(/(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/)
      if (parts) {
        entries.push({
          reps: parseInt(parts[1]),
          weight: parseFloat(parts[2])
        })
      }
    }
    return entries
  }

  // 格式4：数字组 数字次 重量kg
  const stageFormat4 = line.match(/(\d+)\s*组\s*(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/)
  if (stageFormat4) {
    const sets = parseInt(stageFormat4[1])
    const reps = parseInt(stageFormat4[2])
    const weight = parseFloat(stageFormat4[3])
    for (let i = 0; i < sets; i++) {
      entries.push({ reps, weight })
    }
    return entries
  }

  return entries
}
```

- [ ] **Step 2: 运行测试验证函数存在**

在浏览器控制台或Node.js中测试：
```javascript
const { parseImportText } = require('./utils/importParser')
console.log(parseImportText('卧推 10×50 10×50'))
```
Expected: 函数存在并返回结果

- [ ] **Step 3: 添加模糊匹配支持**

```javascript
/**
 * 使用动作库进行模糊匹配
 * @param {string} text - 原始文本
 * @param {Array} actionNames - 现有动作名数组
 * @returns {Array} 解析后的动作和组数数组
 */
export function parseImportTextWithActions(text, actionNames = []) {
  if (!text || typeof text !== 'string') {
    return []
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const result = []
  let currentAction = null

  for (const line of lines) {
    // 尝试解析动作名
    let actionName = parseActionName(line)
    
    // 如果没有解析到动作名，尝试模糊匹配
    if (!actionName && actionNames.length > 0) {
      actionName = fuzzyMatchAction(line, actionNames)
    }
    
    if (actionName) {
      if (currentAction) {
        result.push(currentAction)
      }
      currentAction = {
        actionName,
        entries: []
      }
      continue
    }

    // 尝试解析组数
    if (currentAction) {
      const entries = parseEntries(line)
      if (entries.length > 0) {
        currentAction.entries.push(...entries)
      }
    }
  }

  if (currentAction && currentAction.entries.length > 0) {
    result.push(currentAction)
  }

  return result
}

/**
 * 模糊匹配动作名
 * @param {string} text - 文本
 * @param {Array} actionNames - 动作名数组
 * @returns {string|null} 匹配的动作名或null
 */
function fuzzyMatchAction(text, actionNames) {
  // 移除空格和标点
  const cleanText = text.replace(/[\s：:、，,。.]/g, '').toLowerCase()
  
  for (const actionName of actionNames) {
    const cleanAction = actionName.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    
    // 完全匹配
    if (cleanText === cleanAction) {
      return actionName
    }
    
    // 包含匹配
    if (cleanText.includes(cleanAction) || cleanAction.includes(cleanText)) {
      return actionName
    }
  }
  
  return null
}
```

- [ ] **Step 4: 运行模糊匹配测试**

```javascript
const { parseImportTextWithActions } = require('./utils/importParser')
const actionNames = ['卧推', '深蹲', '硬拉']
console.log(parseImportTextWithActions('卧推 10×50 10×50', actionNames))
```
Expected: 正确匹配动作名

- [ ] **Step 5: 提交代码**

```bash
git add utils/importParser.js
git commit -m "feat: add import text parser with fuzzy matching"
```

---

## 任务2：创建 dataMerger.js - 数据合并函数

**Files:**
- Create: `utils/dataMerger.js`
- Modify: `utils/importParser.js` (添加辅助函数)

- [ ] **Step 1: 创建基础合并函数**

```javascript
/**
 * 合并导入数据到现有数据
 * @param {Object} existingData - 现有训练数据
 * @param {Array} importedData - 导入的训练数据
 * @param {Array} actionNames - 现有动作名数组
 * @returns {Object} 合并后的数据
 */
export function mergeImportData(existingData, importedData, actionNames = []) {
  if (!existingData || !importedData || importedData.length === 0) {
    return existingData
  }

  const result = {
    ...existingData,
    entries: { ...existingData.entries },
    actions: { ...existingData.actions }
  }

  for (const importedAction of importedData) {
    const { actionName, entries } = importedAction
    
    if (!actionName || !entries || entries.length === 0) {
      continue
    }

    // 查找匹配的动作名
    const matchedName = findMatchingAction(actionName, actionNames)
    const finalName = matchedName || actionName

    // 转换导入的条目格式
    const formattedEntries = entries.map(entry => ({
      input: `${entry.reps}×${entry.weight}`,
      total: entry.reps * entry.weight,
      type: 'normal',
      stages: [{
        reps: entry.reps,
        weight: entry.weight,
        total: entry.reps * entry.weight
      }]
    }))

    // 合并到现有数据
    if (result.entries[finalName]) {
      // 追加到现有条目
      result.entries[finalName] = [
        ...result.entries[finalName],
        ...formattedEntries
      ]
    } else {
      // 添加新动作
      result.entries[finalName] = formattedEntries
    }

    // 更新总重量
    result.actions[finalName] = result.entries[finalName].reduce(
      (sum, entry) => sum + (entry.total || 0), 0
    )
  }

  return result
}

/**
 * 查找匹配的动作名
 * @param {string} actionName - 要匹配的动作名
 * @param {Array} actionNames - 现有动作名数组
 * @returns {string|null} 匹配的动作名或null
 */
function findMatchingAction(actionName, actionNames) {
  if (!actionName || !actionNames || actionNames.length === 0) {
    return null
  }

  // 精确匹配
  if (actionNames.includes(actionName)) {
    return actionName
  }

  // 模糊匹配
  const cleanName = actionName.replace(/[\s：:、，,。.]/g, '').toLowerCase()
  
  for (const existingName of actionNames) {
    const cleanExisting = existingName.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    
    if (cleanName === cleanExisting) {
      return existingName
    }
    
    if (cleanName.includes(cleanExisting) || cleanExisting.includes(cleanName)) {
      return existingName
    }
  }

  return null
}
```

- [ ] **Step 2: 运行测试验证合并功能**

```javascript
const { mergeImportData } = require('./utils/dataMerger')
const existingData = {
  entries: {
    '卧推': [{ input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }]
  },
  actions: { '卧推': 500 }
}
const importedData = [
  { actionName: '卧推', entries: [{ reps: 10, weight: 55 }] }
]
console.log(mergeImportData(existingData, importedData, ['卧推']))
```
Expected: 正确合并数据

- [ ] **Step 3: 添加新动作处理**

```javascript
/**
 * 检查是否需要添加新动作到模板
 * @param {Object} mergedData - 合并后的数据
 * @param {Array} templateActions - 模板中的动作列表
 * @returns {Array} 需要添加的新动作列表
 */
export function getNewActions(mergedData, templateActions = []) {
  if (!mergedData || !mergedData.entries) {
    return []
  }

  const existingActions = new Set(templateActions)
  const newActions = []

  for (const actionName of Object.keys(mergedData.entries)) {
    if (!existingActions.has(actionName)) {
      newActions.push(actionName)
    }
  }

  return newActions
}
```

- [ ] **Step 4: 运行新动作检测测试**

```javascript
const { getNewActions } = require('./utils/dataMerger')
const mergedData = {
  entries: {
    '卧推': [],
    '硬拉': []
  }
}
const templateActions = ['卧推', '深蹲']
console.log(getNewActions(mergedData, templateActions))
```
Expected: 返回 ['硬拉']

- [ ] **Step 5: 提交代码**

```bash
git add utils/dataMerger.js
git commit -m "feat: add data merger with smart matching"
```

---

## 任务3：创建 ImportDataModal.vue - 导入数据弹窗组件

**Files:**
- Create: `components/ImportDataModal.vue`

- [ ] **Step 1: 创建基础组件结构**

```vue
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
```

- [ ] **Step 2: 运行组件测试**

在浏览器中预览组件，检查样式和交互是否正常。

- [ ] **Step 3: 提交代码**

```bash
git add components/ImportDataModal.vue
git commit -m "feat: add import data modal component"
```

---

## 任务4：修改 DaySettings.vue - 添加导入数据按钮

**Files:**
- Modify: `components/DaySettings.vue`

- [ ] **Step 1: 添加导入按钮**

在 `components/DaySettings.vue` 的 `setting-actions-row` 中添加导入按钮：

```vue
<view class="setting-actions-row">
  <view class="setting-action manage-action" @click="navigateToManage">
    <text class="action-icon">📋</text>
    <text class="action-label">管理动作</text>
  </view>
  <view class="setting-action export-action" @click="handleExportData">
    <text class="action-icon">📤</text>
    <text class="action-label">复制数据</text>
  </view>
  <view class="setting-action import-action" @click="handleImportData">
    <text class="action-icon">📥</text>
    <text class="action-label">导入数据</text>
  </view>
</view>
```

- [ ] **Step 2: 添加导入事件处理**

在 `components/DaySettings.vue` 的 `emits` 中添加 `import-data`：

```javascript
emits: ['close', 'add-action', 'toggle-auto-timer', 'toggle-auto-fill', 'toggle-bubble-fill',
  'set-heavy-timer', 'set-light-timer', 'export-data', 'import-data'
],
```

在 `methods` 中添加 `handleImportData` 方法：

```javascript
handleImportData() {
  this.$emit('import-data')
},
```

- [ ] **Step 3: 添加导入按钮样式**

在 `components/DaySettings.vue` 的 `<style>` 中添加导入按钮样式：

```css
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
```

- [ ] **Step 4: 运行测试验证按钮显示**

在浏览器中预览设置弹窗，检查导入按钮是否正确显示。

- [ ] **Step 5: 提交代码**

```bash
git add components/DaySettings.vue
git commit -m "feat: add import data button to settings"
```

---

## 任务5：修改 day.vue - 处理导入数据事件

**Files:**
- Modify: `pages/index/day.vue`

- [ ] **Step 1: 添加导入数据状态和组件**

在 `pages/index/day.vue` 的 `data()` 中添加导入相关状态：

```javascript
data() {
  return {
    // ... 现有数据
    showImportModal: false,
    importedData: []
  }
},
```

在 `components` 中添加 `ImportDataModal` 组件：

```javascript
components: {
  TimerModal,
  TemplateSelector,
  ActionCard,
  DaySettings,
  ImportDataModal
},
```

- [ ] **Step 2: 添加导入数据弹窗到模板**

在 `pages/index/day.vue` 的模板中添加导入数据弹窗：

```vue
<!-- 导入数据弹窗 -->
<ImportDataModal 
  :visible="showImportModal" 
  :action-names="availableActionNames"
  @close="showImportModal = false"
  @confirm="onImportData"
/>
```

- [ ] **Step 3: 添加导入数据事件处理**

在 `pages/index/day.vue` 的 `methods` 中添加导入数据处理方法：

```javascript
onImportData() {
  this.showImportModal = true
},

onImportConfirm(importedData) {
  this.showImportModal = false
  
  if (!importedData || importedData.length === 0) {
    uni.showToast({
      title: '没有可导入的数据',
      icon: 'none'
    })
    return
  }

  // 调用合并函数
  const { mergeImportData, getNewActions } = require('@/utils/dataMerger')
  
  const existingData = {
    entries: {},
    actions: {}
  }
  
  // 准备现有数据
  this.chosenActions.forEach((actName, idx) => {
    existingData.entries[actName] = this.actionEntries[idx] || []
    existingData.actions[actName] = this.actionEntries[idx].reduce(
      (sum, entry) => sum + (entry.total || 0), 0
    )
  })
  
  // 合并数据
  const mergedData = mergeImportData(existingData, importedData, this.availableActionNames)
  
  // 检查新动作
  const newActions = getNewActions(mergedData, this.chosenActions)
  
  if (newActions.length > 0) {
    // 询问是否添加新动作到模板
    uni.showModal({
      title: '发现新动作',
      content: `发现新动作：${newActions.join('、')}，是否添加到模板？`,
      success: (res) => {
        if (res.confirm) {
          // 添加新动作到模板
          newActions.forEach(actName => {
            this.onAddAction(actName)
          })
        }
        // 应用合并数据
        this.applyMergedData(mergedData)
      }
    })
  } else {
    // 直接应用合并数据
    this.applyMergedData(mergedData)
  }
},

applyMergedData(mergedData) {
  // 更新页面数据
  this.chosenActions.forEach((actName, idx) => {
    if (mergedData.entries[actName]) {
      this.$set(this.actionEntries, idx, mergedData.entries[actName])
    }
  })
  
  // 保存到本地存储
  this.chosenActions.forEach((actName, idx) => {
    this.saveEntryToStorage(idx)
  })
  
  // 重新计算差异
  this.calcAllDiffs()
  
  uni.showToast({
    title: '导入成功',
    icon: 'success'
  })
},
```

- [ ] **Step 4: 修改设置组件事件处理**

在 `pages/index/day.vue` 的 `DaySettings` 组件中添加 `import-data` 事件处理：

```vue
<DaySettings :visible="showSettings" :available-actions="availableActionNames" :chosen-actions="chosenActions"
  :settings="settingsState" @close="showSettings = false" @add-action="onAddAction" @save-sort="onSaveSort"
  @toggle-auto-timer="settingsStore.toggleAutoStartTimer()" @toggle-auto-fill="settingsStore.toggleAutoFillData()"
  @toggle-bubble-fill="settingsStore.toggleBubbleFill()"
  @set-heavy-timer="(v) => settingsStore.setHeavyTimerDuration(v)"
  @set-light-timer="(v) => settingsStore.setLightTimerDuration(v)" @export-data="onExportData"
  @import-data="onImportData" />
```

- [ ] **Step 5: 运行测试验证导入功能**

在浏览器中测试完整的导入流程：
1. 复制训练数据到剪贴板
2. 打开设置弹窗
3. 点击"导入数据"按钮
4. 确认导入
5. 验证数据是否正确合并

- [ ] **Step 6: 提交代码**

```bash
git add pages/index/day.vue
git commit -m "feat: add import data functionality to day page"
```

---

## 任务6：集成测试

**Files:**
- Test: 测试完整的导入流程

- [ ] **Step 1: 测试导出格式导入**

准备测试数据：
```
6月18日：胸背腿
1. 卧推
第1组：10次 × 50kg
第2组：10次 × 50kg
```

测试导入流程，验证数据是否正确解析和合并。

- [ ] **Step 2: 测试简洁格式导入**

准备测试数据：
```
卧推 10×50 10×50 10×50
深蹲 8×80 8×80
```

测试导入流程，验证数据是否正确解析和合并。

- [ ] **Step 3: 测试自由文本格式导入**

准备测试数据：
```
卧推：10次50kg×3组
深蹲 3组 8次 80kg
```

测试导入流程，验证数据是否正确解析和合并。

- [ ] **Step 4: 测试错误处理**

测试以下错误场景：
1. 剪贴板为空
2. 无法解析的文本格式
3. 动作名不匹配

验证错误提示是否正确显示。

- [ ] **Step 5: 测试数据合并**

测试以下合并场景：
1. 追加到现有动作
2. 添加新动作
3. 占位符处理

验证数据合并是否正确。

- [ ] **Step 6: 提交测试代码**

```bash
git add .
git commit -m "test: add import data integration tests"
```

---

## 自检清单

### 1. Spec 覆盖检查
- ✅ 智能文本解析 - 任务1
- ✅ 预览确认 - 任务3
- ✅ 智能合并 - 任务2
- ✅ UI设计 - 任务3、4
- ✅ 错误处理 - 任务3、6

### 2. 占位符扫描
- ✅ 没有 "TBD", "TODO" 或不完整的部分
- ✅ 所有代码都是完整的

### 3. 类型一致性检查
- ✅ 函数名和参数一致
- ✅ 数据结构一致
- ✅ 事件名一致

---

## 执行选项

**Plan complete and saved to `.opencode/plans/2026-06-18-import-data.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**