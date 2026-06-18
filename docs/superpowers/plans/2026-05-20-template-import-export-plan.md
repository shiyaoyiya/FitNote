# 模板导入导出功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为templateManager页面添加模板导入导出功能，支持选择导出多个模板为易读文本格式，粘贴文本自动识别导入，处理同名模板冲突。

**Architecture:** 修改templateManager.vue添加底部按钮和导入导出弹窗，在liquid-glass.css中添加对应的液态玻璃样式。

**Tech Stack:** Vue 2.x, uni-app, CSS

---

## 文件结构

- **修改：** `pages/templateManager/templateManager.vue` - 主要功能实现
- **修改：** `static/css/liquid-glass.css` - 液态玻璃样式适配

---

## 任务

### Task 1: 修改底部栏，添加导入/导出按钮

**Files:**
- Modify: `pages/templateManager/templateManager.vue:44-56, 820-860`

- [ ] **Step 1: 修改底部栏HTML结构**

将原来的单个按钮改为两个按钮并排：

```html
<view class="bottom-bar">
  <view class="btn-import-export" @click="openImportExportPanel">
    <text class="btn-icon">📤</text>
    <text class="btn-label">导入/导出</text>
  </view>
  <view class="btn-create" @click="openCreatePanel">
    <text class="btn-create-icon">+</text>
    <text class="btn-create-label">新建模板</text>
  </view>
</view>
```

- [ ] **Step 2: 添加底部栏CSS样式**

在style标签中添加：

```css
.bottom-bar {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 40rpx;
}

.btn-import-export {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  height: 88rpx;
  background: #333;
  border-radius: 44rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.container.light .btn-import-export {
  background: #e0e0e0;
  color: #333;
}

.btn-icon {
  font-size: 32rpx;
}

.btn-label {
  font-size: 28rpx;
}

.btn-create {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 88rpx;
  background: #379bff;
  border-radius: 44rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(55, 155, 255, 0.3);
}
```

- [ ] **Step 3: 在data中添加新状态变量**

```javascript
data() {
  return {
    // ... 现有变量
    showImportExportPanel: false,
    importExportTab: 'export',
    selectedExportTemplates: [],
    importText: '',
    parsedTemplates: [],
    showConflictPanel: false,
    conflictItems: []
  }
}
```

- [ ] **Step 4: 添加openImportExportPanel方法**

```javascript
openImportExportPanel() {
  this.showImportExportPanel = true
  this.importExportTab = 'export'
  this.selectedExportTemplates = []
  this.importText = ''
  this.parsedTemplates = []
}
```

---

### Task 2: 添加导入导出弹窗UI结构

**Files:**
- Modify: `pages/templateManager/templateManager.vue:115-120`

- [ ] **Step 1: 在创建模板弹窗后面添加导入导出弹窗**

```html
<view v-if="showImportExportPanel" class="popup-overlay" @click.self="closeImportExportPanel">
  <view class="overlay-bg" @click="closeImportExportPanel"></view>
  <view class="popup-panel import-export-panel slide-up" @click.stop>
    <view class="panel-header">
      <text class="panel-title">导入/导出模板</text>
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
      <view class="select-all-row">
        <view class="select-all-btn" @click="toggleSelectAll">
          <text v-if="selectedExportTemplates.length === filteredTemplates.length">✓ 取消全选</text>
          <text v-else>☐ 全选</text>
        </view>
      </view>
      <scroll-view class="template-list" scroll-y="true">
        <view v-for="(tpl, idx) in filteredTemplates" :key="tpl.id" class="template-checkbox-item" @click="toggleTemplateSelect(tpl)">
          <view class="checkbox-box" :class="{ checked: isTemplateSelected(tpl) }">
            <text v-if="isTemplateSelected(tpl)" class="checkbox-check">✓</text>
          </view>
          <view class="template-info">
            <text class="template-name">{{ tpl.name }}</text>
            <text class="template-count">{{ tpl.actions ? tpl.actions.length : 0 }}个动作</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="panel-body" v-else>
      <view class="paste-btn-row">
        <view class="paste-btn" @click="pasteFromClipboard">
          <text>📋 粘贴</text>
        </view>
      </view>
      <textarea 
        v-model="importText" 
        class="import-textarea" 
        placeholder="在此粘贴模板数据...

格式示例：
胸部训练：
卧推×4
飞鸟×3"
        @input="onImportTextInput"
      ></textarea>
      <view v-if="parsedTemplates.length > 0" class="parse-result">
        <text class="parse-success">✓ 识别到 {{ parsedTemplates.length }} 个模板</text>
      </view>
    </view>

    <view class="panel-footer">
      <view class="btn-cancel-popup" @click="closeImportExportPanel">取消</view>
      <view class="btn-confirm-popup" @click="confirmImportExport" :class="{ disabled: !canConfirmImportExport }">
        <text>{{ importExportTab === 'export' ? '确认导出' : '确认导入' }}</text>
      </view>
    </view>
  </view>
</view>

<view v-if="showConflictPanel" class="popup-overlay" @click.self="closeConflictPanel">
  <view class="overlay-bg" @click="closeConflictPanel"></view>
  <view class="popup-panel conflict-panel slide-up" @click.stop>
    <view class="panel-header">
      <text class="panel-title">模板名称冲突</text>
      <text class="close-btn" @click="closeConflictPanel">×</text>
    </view>
    <view class="panel-body">
      <view v-for="(item, idx) in conflictItems" :key="idx" class="conflict-item">
        <text class="conflict-name">{{ item.name }}</text>
        <view class="conflict-options">
          <view class="conflict-option" :class="{ active: item.action === 'overwrite' }" @click="setConflictAction(idx, 'overwrite')">覆盖</view>
          <view class="conflict-option" :class="{ active: item.action === 'rename' }" @click="setConflictAction(idx, 'rename')">重命名</view>
          <view class="conflict-option" :class="{ active: item.action === 'skip' }" @click="setConflictAction(idx, 'skip')">跳过</view>
        </view>
      </view>
    </view>
    <view class="panel-footer">
      <view class="btn-cancel-popup" @click="closeConflictPanel">取消</view>
      <view class="btn-confirm-popup" @click="confirmConflictResolve">确认</view>
    </view>
  </view>
</view>
```

---

### Task 3: 添加导入导出弹窗CSS样式

**Files:**
- Modify: `pages/templateManager/templateManager.vue:1228-1230`

- [ ] **Step 1: 在style标签末尾添加新样式**

```css
.tab-bar {
  display: flex;
  border-bottom: 1rpx solid #333;
}

.container.light .tab-bar {
  border-bottom-color: #e0e0e0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #999;
  border-bottom: 3rpx solid transparent;
}

.tab-item.active {
  color: #379bff;
  border-bottom-color: #379bff;
}

.select-all-row {
  padding: 10rpx 0;
}

.select-all-btn {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 16rpx;
  background: #333;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #fff;
}

.container.light .select-all-btn {
  background: #e0e0e0;
  color: #333;
}

.template-list {
  max-height: 500rpx;
}

.template-checkbox-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #333;
}

.container.light .template-checkbox-item {
  border-bottom-color: #e0e0e0;
}

.checkbox-box {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #666;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-box.checked {
  background: #379bff;
  border-color: #379bff;
}

.checkbox-check {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.template-name {
  font-size: 28rpx;
  color: #fff;
}

.container.light .template-name {
  color: #333;
}

.template-count {
  font-size: 22rpx;
  color: #999;
}

.paste-btn-row {
  margin-bottom: 16rpx;
}

.paste-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #379bff;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #fff;
}

.import-textarea {
  width: 100%;
  height: 300rpx;
  background: #2c2c2e;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #fff;
  box-sizing: border-box;
}

.container.light .import-textarea {
  background: #fff;
  border: 1rpx solid #e0e0e0;
  color: #333;
}

.import-textarea::placeholder {
  color: #666;
}

.parse-result {
  margin-top: 16rpx;
  padding: 12rpx;
  background: rgba(55, 155, 255, 0.1);
  border-radius: 8rpx;
}

.parse-success {
  color: #379bff;
  font-size: 24rpx;
}

.panel-footer {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx 40rpx;
}

.btn-cancel-popup {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
}

.container.light .btn-cancel-popup {
  background: #e0e0e0;
  color: #333;
}

.btn-confirm-popup {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #379bff;
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.btn-confirm-popup.disabled {
  opacity: 0.5;
}

.conflict-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #333;
}

.container.light .conflict-item {
  border-bottom-color: #e0e0e0;
}

.conflict-name {
  font-size: 28rpx;
  color: #fff;
  display: block;
  margin-bottom: 12rpx;
}

.container.light .conflict-name {
  color: #333;
}

.conflict-options {
  display: flex;
  gap: 12rpx;
}

.conflict-option {
  flex: 1;
  padding: 12rpx;
  text-align: center;
  background: #333;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #fff;
}

.container.light .conflict-option {
  background: #e0e0e0;
  color: #333;
}

.conflict-option.active {
  background: #379bff;
  color: #fff;
}
```

---

### Task 4: 实现导出功能核心逻辑

**Files:**
- Modify: `pages/templateManager/templateManager.vue:590-595`

- [ ] **Step 1: 添加导出相关方法**

```javascript
closeImportExportPanel() {
  this.showImportExportPanel = false
},

isTemplateSelected(tpl) {
  return this.selectedExportTemplates.some(t => t.id === tpl.id)
},

toggleTemplateSelect(tpl) {
  const idx = this.selectedExportTemplates.findIndex(t => t.id === tpl.id)
  if (idx === -1) {
    this.selectedExportTemplates.push(tpl)
  } else {
    this.selectedExportTemplates.splice(idx, 1)
  }
},

toggleSelectAll() {
  if (this.selectedExportTemplates.length === this.filteredTemplates.length) {
    this.selectedExportTemplates = []
  } else {
    this.selectedExportTemplates = [...this.filteredTemplates]
  }
},

exportTemplates() {
  if (this.selectedExportTemplates.length === 0) {
    uni.showToast({ title: '请选择要导出的模板', icon: 'none' })
    return
  }
  
  let text = ''
  this.selectedExportTemplates.forEach((tpl, idx) => {
    if (idx > 0) text += '\n\n'
    text += `${tpl.name}：\n`
    if (tpl.actions && tpl.actions.length > 0) {
      tpl.actions.forEach(act => {
        const sets = (tpl.actionSets && tpl.actionSets[act]) || 4
        text += `${act}×${sets}\n`
      })
    }
  })
  
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
      this.closeImportExportPanel()
    }
  })
}
```

---

### Task 5: 实现导入功能核心逻辑

**Files:**
- Modify: `pages/templateManager/templateManager.vue:595-600`

- [ ] **Step 1: 添加导入相关方法**

```javascript
pasteFromClipboard() {
  uni.getClipboardData({
    success: (res) => {
      this.importText = res.data
      this.onImportTextInput()
    }
  })
},

parseTemplateText(text) {
  const templates = []
  if (!text.trim()) return templates
  
  const tplBlocks = text.trim().split(/\n\s*\n/)
  
  tplBlocks.forEach(block => {
    const lines = block.trim().split('\n')
    if (!lines.length) return
    
    const nameLine = lines[0]
    if (!nameLine.endsWith('：')) return
    
    const name = nameLine.slice(0, -1).trim()
    if (!name) return
    
    const actions = []
    const actionSets = {}
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const match = line.match(/^(.+)×(\d+)$/)
      if (match) {
        const actName = match[1].trim()
        const sets = parseInt(match[2])
        if (actName && sets > 0) {
          actions.push(actName)
          actionSets[actName] = sets
        }
      }
    }
    
    if (actions.length > 0) {
      templates.push({
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        name,
        actions,
        actionSets,
        actionOrder: [...actions],
        actionWeights: {},
        color: '',
        customColors: [],
        isAerobic: false
      })
    }
  })
  
  return templates
},

onImportTextInput() {
  this.parsedTemplates = this.parseTemplateText(this.importText)
},

checkConflicts(templates) {
  const conflicts = []
  templates.forEach(tpl => {
    const exists = this.templateStore.templates.some(t => t.name === tpl.name)
    if (exists) {
      conflicts.push({
        name: tpl.name,
        action: 'skip',
        template: tpl
      })
    }
  })
  return conflicts
},

resolveConflictsAndImport() {
  this.conflictItems.forEach(item => {
    if (item.action === 'skip') return
    
    let newName = item.name
    if (item.action === 'rename') {
      let idx = 1
      while (this.templateStore.templates.some(t => t.name === `${newName} (${idx})`)) {
        idx++
      }
      newName = `${newName} (${idx})`
    }
    
    const tpl = { ...item.template }
    tpl.id = String(Date.now()) + Math.random().toString(36).slice(2)
    tpl.name = newName
    this.templateStore.templates.push(tpl)
  })
  
  this.templateStore.save()
  uni.showToast({ title: '导入成功', icon: 'success' })
  this.closeConflictPanel()
  this.closeImportExportPanel()
}
```

---

### Task 6: 实现导入导出确认和冲突处理逻辑

**Files:**
- Modify: `pages/templateManager/templateManager.vue:600-605`

- [ ] **Step 1: 添加剩余的方法**

```javascript
get canConfirmImportExport() {
  if (this.importExportTab === 'export') {
    return this.selectedExportTemplates.length > 0
  } else {
    return this.parsedTemplates.length > 0
  }
},

confirmImportExport() {
  if (this.importExportTab === 'export') {
    this.exportTemplates()
  } else {
    this.startImport()
  }
},

startImport() {
  if (this.parsedTemplates.length === 0) {
    uni.showToast({ title: '未能识别到模板数据', icon: 'none' })
    return
  }
  
  const conflicts = this.checkConflicts(this.parsedTemplates)
  
  if (conflicts.length > 0) {
    this.conflictItems = conflicts
    this.showConflictPanel = true
  } else {
    this.parsedTemplates.forEach(tpl => {
      this.templateStore.templates.push(tpl)
    })
    this.templateStore.save()
    uni.showToast({ title: '导入成功', icon: 'success' })
    this.closeImportExportPanel()
  }
},

closeConflictPanel() {
  this.showConflictPanel = false
  this.conflictItems = []
},

setConflictAction(idx, action) {
  this.conflictItems[idx].action = action
},

confirmConflictResolve() {
  const conflictTplNames = this.conflictItems.map(c => c.name)
  const nonConflictTpls = this.parsedTemplates.filter(t => !conflictTplNames.includes(t.name))
  
  nonConflictTpls.forEach(tpl => {
    this.templateStore.templates.push(tpl)
  })
  
  this.resolveConflictsAndImport()
}
```

---

### Task 7: 添加液态玻璃样式适配

**Files:**
- Modify: `static/css/liquid-glass.css:990-995`

- [ ] **Step 1: 在liquid-glass.css末尾添加新样式**

```css
/* === 导入导出弹窗样式 === */
.container.liquid-glass .import-export-panel,
.container.liquid-glass .conflict-panel {
  background: var(--glass-bg) !important;
  border: none !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
}

.container.liquid-glass .tab-item {
  color: var(--glass-text);
  opacity: 0.6;
}

.container.liquid-glass .tab-item.active {
  color: #379bff;
  opacity: 1;
}

.container.liquid-glass .select-all-btn,
.container.liquid-glass .btn-cancel-popup {
  background: var(--glass-btn-bg) !important;
  color: var(--glass-text) !important;
  border: none !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
}

.container.liquid-glass .template-name,
.container.liquid-glass .conflict-name {
  color: var(--glass-text) !important;
}

.container.liquid-glass .import-textarea {
  background: var(--glass-bg) !important;
  border: none !important;
  color: var(--glass-text) !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
}

.container.liquid-glass .import-textarea::placeholder {
  color: var(--glass-placeholder) !important;
}

.container.liquid-glass .conflict-option {
  background: var(--glass-btn-bg) !important;
  color: var(--glass-text) !important;
  border: none !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
}

.container.liquid-glass .conflict-option.active {
  background: rgba(55, 155, 255, 0.6) !important;
  color: #fff !important;
}

.container.liquid-glass .btn-import-export {
  background: var(--glass-bg) !important;
  border: none !important;
  color: var(--glass-text) !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
}
```

---

### Task 8: 测试完整功能

**Files:**
- Test: 手动测试

- [ ] **Step 1: 测试导出功能**
  1. 打开templateManager页面
  2. 点击"导入/导出"按钮
  3. 切换到"导出"标签
  4. 选择几个模板
  5. 点击"确认导出"
  6. 验证剪贴板内容格式正确

- [ ] **Step 2: 测试导入功能**
  1. 打开导入/导出弹窗，切换到"导入"标签
  2. 粘贴测试数据
  3. 验证能正确识别模板
  4. 确认导入
  5. 验证模板已添加

- [ ] **Step 3: 测试冲突处理**
  1. 导入已存在的模板
  2. 验证冲突弹窗显示
  3. 测试覆盖、重命名、跳过三种方式
  4. 验证结果正确

- [ ] **Step 4: 测试液态玻璃样式**
  1. 开启液态玻璃效果
  2. 验证所有弹窗样式正确
