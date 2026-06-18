# TrainingSplitPlan 导出导入功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 TrainingSplitPlan.vue 组件添加导出导入功能，允许用户将分化计划导出为文本格式，也可以从文本格式导入分化计划。

**Architecture:** 在现有 TrainingSplitPlan.vue 组件中添加导入/导出按钮和弹窗，使用文本格式进行数据交换，与 templateManager 的 UI 风格保持一致。

**Tech Stack:** Vue.js, uni-app, 剪贴板 API

---

## 文件结构

**修改文件：**
- `components/TrainingSplitPlan.vue` - 添加导出导入功能

## 实现任务

### Task 1: 添加导入/导出按钮到标题栏

**Files:**
- Modify: `components/TrainingSplitPlan.vue:1-10`

- [ ] **Step 1: 修改标题栏结构**

在标题栏右侧添加导入/导出按钮，位于关闭按钮左侧：

```html
<view class="split-header">
  <text class="split-title">设置分化计划</text>
  <view class="header-actions">
    <text class="import-export-icon" @click="openImportExportPanel">📤</text>
    <text class="close-icon" @click="onClose">×</text>
  </view>
</view>
```

- [ ] **Step 2: 添加标题栏样式**

在 `<style scoped>` 中添加标题栏操作区域的样式：

```css
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
```

- [ ] **Step 3: 提交更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: add import/export button to split plan header"
```

### Task 2: 添加导入/导出弹窗状态和方法

**Files:**
- Modify: `components/TrainingSplitPlan.vue:140-178`

- [ ] **Step 1: 添加弹窗状态数据**

在 `data()` 中添加弹窗相关的状态：

```javascript
data() {
  return {
    localPlan: [],
    localMode: 'cycle',
    localWeekPlan: [],
    weekDayNames: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    // 新增导入/导出相关状态
    showImportExportPanel: false,
    importExportTab: 'export',
    importText: '',
    parsedPlan: null,
  }
}
```

- [ ] **Step 2: 添加打开/关闭弹窗方法**

在 `methods` 中添加打开和关闭弹窗的方法：

```javascript
openImportExportPanel() {
  this.showImportExportPanel = true
  this.importExportTab = 'export'
  this.importText = ''
  this.parsedPlan = null
},
closeImportExportPanel() {
  this.showImportExportPanel = false
},
```

- [ ] **Step 3: 提交更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: add import/export panel state and methods"
```

### Task 3: 实现导出功能

**Files:**
- Modify: `components/TrainingSplitPlan.vue:179-222`

- [ ] **Step 1: 添加导出方法**

在 `methods` 中添加导出计划的方法：

```javascript
exportPlan() {
  const plan = this.localMode === 'cycle' ? this.localPlan : this.localWeekPlan
  const modeText = this.localMode === 'cycle' ? '按天数' : '按周'
  const dayNames = this.localMode === 'cycle' 
    ? plan.map((_, idx) => `第${idx + 1}天`)
    : this.weekDayNames

  let text = `分化计划（${modeText}）：\n`
  
  plan.forEach((day, idx) => {
    if (day.enabled && day.template) {
      const template = this.templates.find(t => t.name === day.template)
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

  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
      this.closeImportExportPanel()
    }
  })
},
```

- [ ] **Step 2: 提交更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: implement export plan functionality"
```

### Task 4: 实现导入功能

**Files:**
- Modify: `components/TrainingSplitPlan.vue:179-222`

- [ ] **Step 1: 添加粘贴方法**

在 `methods` 中添加从剪贴板粘贴的方法：

```javascript
pasteFromClipboard() {
  uni.getClipboardData({
    success: (res) => {
      if (res && res.data) {
        this.importText = res.data
        const parsed = this.parsePlanText(res.data)
        this.parsedPlan = parsed
        if (!parsed) {
          uni.showToast({ title: '无法识别计划数据', icon: 'none' })
        }
      } else {
        uni.showToast({ title: '剪贴板为空', icon: 'none' })
      }
    },
    fail: () => {
      uni.showToast({ title: '获取剪贴板失败', icon: 'none' })
    }
  })
},
```

- [ ] **Step 2: 添加解析方法**

在 `methods` 中添加解析文本的方法：

```javascript
parsePlanText(text) {
  if (!text || !text.trim()) return null
  
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const firstLine = lines[0]
  let mode = 'cycle'
  if (firstLine.includes('按周')) {
    mode = 'week'
  }

  const plan = []
  let currentDay = null

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.includes('：休息')) {
      plan.push({ template: null, enabled: false })
      currentDay = null
    } else if (line.includes('（') && line.includes('）')) {
      const templateName = line.split('（')[1].split('）')[0]
      plan.push({ template: templateName, enabled: true })
      currentDay = plan.length - 1
    } else if (currentDay !== null && line.includes('×')) {
      // 解析动作数据（可选，用于验证）
    }
  }

  return { mode, plan }
},
```

- [ ] **Step 3: 添加应用导入计划的方法**

在 `methods` 中添加应用导入计划的方法：

```javascript
applyImportedPlan(parsed) {
  if (!parsed || !parsed.plan) return
  
  this.localMode = parsed.mode
  if (parsed.mode === 'cycle') {
    this.localPlan = parsed.plan
  } else {
    this.localWeekPlan = parsed.plan
  }
},
```

- [ ] **Step 4: 添加确认导入方法**

在 `methods` 中添加确认导入的方法：

```javascript
importPlan() {
  if (!this.parsedPlan) {
    uni.showToast({ title: '请先粘贴计划数据', icon: 'none' })
    return
  }
  
  this.applyImportedPlan(this.parsedPlan)
  uni.showToast({ title: '导入成功', icon: 'success' })
  this.closeImportExportPanel()
},
```

- [ ] **Step 5: 添加输入监听方法**

在 `methods` 中添加输入监听的方法：

```javascript
onImportTextInput() {
  this.parsedPlan = this.parsePlanText(this.importText)
},
```

- [ ] **Step 6: 提交更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: implement import plan functionality"
```

### Task 5: 添加导入/导出弹窗 UI

**Files:**
- Modify: `components/TrainingSplitPlan.vue:1-75`

- [ ] **Step 1: 添加弹窗模板**

在 `</view>` 之前添加导入/导出弹窗的模板：

```html
<view v-if="showImportExportPanel" class="popup-overlay" @click.self="closeImportExportPanel">
  <view class="overlay-bg" @click="closeImportExportPanel"></view>
  <view class="import-export-panel slide-up" @click.stop>
    <view class="panel-header">
      <text class="panel-title">导入/导出分化计划</text>
      <text class="close-btn" @click="closeImportExportPanel">×</text>
    </view>

    <view class="tab-bar">
      <view class="tab-item" :class="{ active: importExportTab === 'export' }" @click="importExportTab = 'export'">
        <text>导出</text>
      </view>
      <view class="tab-item" :class="{ active: importExportTab === 'import' }" @click="importExportTab = 'import'">
        <text>导入</text>
      </view>
    </view>

    <view class="panel-body" v-if="importExportTab === 'export'">
      <view class="export-preview">
        <text class="preview-label">预览：</text>
        <text class="preview-text">{{ exportPreview }}</text>
      </view>
    </view>

    <view class="panel-body" v-else>
      <view class="paste-btn-row">
        <view class="paste-btn" @click="pasteFromClipboard">
          <text>📋 粘贴</text>
        </view>
      </view>
      <textarea v-model="importText" class="import-textarea" placeholder="在此粘贴分化计划数据" @input="onImportTextInput"></textarea>
      <view v-if="parsedPlan" class="parse-result">
        <text class="parse-success">✓ 识别到 {{ parsedPlan.mode === 'cycle' ? '按天数' : '按周' }} 计划</text>
      </view>
    </view>

    <view class="panel-footer">
      <view class="btn-cancel-popup" @click="closeImportExportPanel">取消</view>
      <view class="btn-confirm-popup" @click="importExportTab === 'export' ? exportPlan() : importPlan()" :class="{ disabled: importExportTab === 'import' && !parsedPlan }">
        <text>{{ importExportTab === 'export' ? '复制到剪贴板' : '确认导入' }}</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 添加导出预览计算属性**

在 `computed` 中添加导出预览的计算属性：

```javascript
exportPreview() {
  const plan = this.localMode === 'cycle' ? this.localPlan : this.localWeekPlan
  const modeText = this.localMode === 'cycle' ? '按天数' : '按周'
  const dayNames = this.localMode === 'cycle' 
    ? plan.map((_, idx) => `第${idx + 1}天`)
    : this.weekDayNames

  let text = `分化计划（${modeText}）：\n`
  
  plan.forEach((day, idx) => {
    if (day.enabled && day.template) {
      text += `${dayNames[idx]}（${day.template}）\n`
    } else {
      text += `${dayNames[idx]}：休息\n`
    }
  })

  return text
},
```

- [ ] **Step 3: 提交更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: add import/export panel UI"
```

### Task 6: 添加弹窗样式

**Files:**
- Modify: `components/TrainingSplitPlan.vue:226-498`

- [ ] **Step 1: 添加弹窗基础样式**

在 `<style scoped>` 中添加弹窗的基础样式：

```css
.import-export-panel {
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

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.close-btn {
  font-size: 20px;
  color: var(--text-secondary);
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.export-preview {
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  padding: 12px;
}

.preview-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: block;
}

.preview-text {
  font-size: 13px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.paste-btn-row {
  margin-bottom: 12px;
}

.paste-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary);
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
}

.import-textarea {
  width: 100%;
  height: 200px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: var(--text-primary);
  box-sizing: border-box;
}

.parse-result {
  margin-top: 12px;
  padding: 8px;
  background: rgba(55, 155, 255, 0.1);
  border-radius: 8px;
}

.parse-success {
  color: var(--primary);
  font-size: 13px;
}

.panel-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel-popup {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 22px;
  color: var(--text-primary);
  font-size: 15px;
}

.btn-confirm-popup {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  border-radius: 22px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.btn-confirm-popup.disabled {
  opacity: 0.5;
}
```

- [ ] **Step 2: 提交更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: add import/export panel styles"
```

### Task 7: 测试和验证

**Files:**
- Test: `components/TrainingSplitPlan.vue`

- [ ] **Step 1: 测试导出功能**

1. 打开应用，进入设置分化计划页面
2. 设置一个分化计划（包含训练和休息天）
3. 点击 📤 按钮
4. 切换到导出标签页
5. 点击"复制到剪贴板"
6. 验证剪贴板内容是否正确

- [ ] **Step 2: 测试导入功能**

1. 复制以下文本到剪贴板：
```
分化计划（按天数）：
第1天（胸肌模板）：
杠铃卧推×4
哑铃飞鸟×3

第2天：休息

第3天（背肌模板）：
引体向上×4
杠铃划船×3
```
2. 点击 📤 按钮
3. 切换到导入标签页
4. 点击"粘贴"
5. 验证是否识别到计划
6. 点击"确认导入"
7. 验证计划是否正确导入

- [ ] **Step 3: 测试按周模式**

1. 切换到按周模式
2. 重复导出和导入测试
3. 验证格式是否正确

- [ ] **Step 4: 提交最终更改**

```bash
git add components/TrainingSplitPlan.vue
git commit -m "feat: complete training split plan import/export functionality"
```

## 自查清单

1. **规格覆盖：** 所有功能需求都已实现
2. **占位符扫描：** 没有 TBD、TODO 或模糊要求
3. **类型一致性：** 方法名和属性名保持一致

## 总结

本实现计划为 TrainingSplitPlan.vue 组件添加了完整的导出导入功能，包括：
- 标题栏按钮
- 导出/导入弹窗
- 文本格式解析
- 剪贴板操作
- 用户友好的 UI

所有功能都与 templateManager 的风格保持一致，用户体验良好。
