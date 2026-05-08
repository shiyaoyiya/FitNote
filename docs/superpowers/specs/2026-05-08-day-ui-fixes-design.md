# Day 页面四项 UI/交互修复设计

## 概述

修复 FitNote 小程序中 day.vue 相关的四个交互问题：递减组/暂停组确认逻辑优化、添加动作按钮样式、index.vue 弹窗全屏居中、气泡快捷填充兼容递减组/暂停组。

---

## 问题 1：递减组/暂停组确认按键优先调用主确认

**文件**: `components/ActionCard.vue`

**现状**: 额外阶段行的 ✓ 按钮（line 48）直接调用 `confirmExtraStages`，将额外阶段合并到最后一个已有 entry。

**修改**: `confirmExtraStages` 方法（line 215）入口处增加判断：若 `mainReps` 或 `mainWeight` 有值，则直接调用 `confirmEntry()` 并 return。否则走原有逻辑。

```js
confirmExtraStages() {
  // 新增：主输入框有内容时走 confirmEntry
  if (this.mainReps || this.mainWeight) {
    this.confirmEntry()
    return
  }
  // 原有逻辑不变
  ...
}
```

---

## 问题 2：添加动作按钮改为白色字体

**文件**: `components/DaySettings.vue`

**现状**: `.action-label` 的 `color: #eee`（line ~554）。

**修改**: 改为 `color: #fff`。

---

## 问题 3：more-btn 弹窗 & 阅读说明全屏居中

**文件**: `components/CalendarMonth.vue`

### 3a. 菜单弹窗居中

**现状**: `.menu-overlay` 使用 `align-items: flex-end; padding-bottom: 120px`（line 344-346），菜单贴底显示。

**修改**: 改为 `align-items: center`，去掉 `padding-bottom`。

### 3b. 阅读说明弹窗全屏居中

**现状**: `.guide-panel` 为 `85vw / max-height: 70vh`（line 417-418）。

**修改**:
- `.guide-overlay` 去掉背景点击关闭的 `@click.self`（保留 overlay-bg 点击关闭），确保面板居中
- `.guide-panel` 改为更大尺寸：`width: 90vw; max-height: 80vh`，确保内容完全居中
- `.guide-body` 的 `max-height` 同步调整

---

## 问题 4：气泡快捷填充兼容递减组/暂停组

**文件**: `components/ActionCard.vue`

### 核心逻辑变化

当前：气泡只查找主阶段（stages[0]）的历史数据，点击后只填充 mainReps/mainWeight。

修改后：
- 主输入框聚焦时，查找历史数据的**所有阶段**（主阶段+递减/暂停阶段）
- 如果历史数据包含多个阶段，气泡显示完整数据，如「上次：10×50+8×40 递减，点击填入」
- 点击气泡后，**同时填充主输入框 + 自动创建额外阶段行并填入数据**
- 额外阶段的输入框也支持单独聚焦时显示气泡（辅助功能）

### 4a. 修改 onInputFocus：气泡展示完整历史

```js
onInputFocus(field) {
  this.focusedField = field
  this.focusedStageIndex = -1  // 主输入框
  if (!this.bubbleFill) return
  const currentVal = field === 'reps' ? this.mainReps : this.mainWeight
  if (currentVal) return
  const history = this.getHistoryDataForGroup()
  if (!history) return
  this.bubbleContent = history.displayText
  this.showBubble = true
}
```

### 4b. 修改 getHistoryDataForGroup：返回所有阶段数据

```js
getHistoryDataForGroup() {
  if (!this.latestRecord || !this.latestRecord.entry) return null
  const historyEntries = normalizeEntries(this.latestRecord.entry)
  const groupIndex = this.entries.length + 1
  if (groupIndex > historyEntries.length) return null
  const entry = historyEntries[groupIndex - 1]
  if (!entry || !entry.stages || !entry.stages[0]) return null
  const main = entry.stages[0]
  if (main.reps <= 0 && main.weight <= 0) return null

  // 构建显示文案
  const parts = entry.stages
    .filter(s => s.reps > 0)
    .map(s => s.weight > 0 ? `${s.reps}×${s.weight}kg` : `${s.reps}`)
  const typeSuffix = entry.type === 'decreasing' ? ' 递减' :
                     entry.type === 'paused' ? ' 暂停' : ''
  const displayText = `上次：${parts.join('+')}${typeSuffix}，点击填入`

  return {
    stages: entry.stages,
    type: entry.type || 'normal',
    displayText,
  }
}
```

### 4c. 修改 fillHistoryData：支持填充所有阶段

```js
fillHistoryData() {
  // 额外阶段单独填充（辅助功能）
  if (this.focusedStageIndex >= 0) {
    const history = this.getHistoryDataForExtraStage(this.focusedStageIndex)
    if (!history) return
    const stage = this.extraStages[this.focusedStageIndex]
    if (this.focusedField === 'reps' && !stage.reps) stage.reps = String(history.reps)
    if (this.focusedField === 'weight' && !stage.weight) stage.weight = String(history.weight)
    if (this.focusedField === 'reps' && !stage.weight) stage.weight = String(history.weight)
    if (this.focusedField === 'weight' && !stage.reps) stage.reps = String(history.reps)
    this.showBubble = false
    this.focusedStageIndex = -1
    return
  }

  // 主输入框填充：填充主阶段 + 自动创建额外阶段
  const history = this.getHistoryDataForGroup()
  if (!history) return
  const { stages, type } = history

  // 填充主输入
  if (!this.mainReps) this.mainReps = String(stages[0].reps)
  if (!this.mainWeight) this.mainWeight = String(stages[0].weight)

  // 如果历史有额外阶段（递减/暂停），自动创建并填充
  if (stages.length > 1) {
    this.entryType = type || ENTRY_TYPE.NORMAL
    this.extraStages = stages.slice(1).map(s => ({
      reps: String(s.reps),
      weight: s.weight > 0 ? String(s.weight) : ''
    }))
  }

  this.showBubble = false
}
```

### 4d. 额外阶段输入框绑定气泡（辅助功能）

给 extraStages 的 reps/weight `<input>`（line 43-45）加上：
- `@focus="onExtraInputFocus(i, 'reps')"` / `@focus="onExtraInputFocus(i, 'weight')"`
- `@blur="onInputBlur"`

新增 `onExtraInputFocus` 方法（复用 `getHistoryDataForExtraStage`，显示单阶段气泡）。

### 4e. 新增 getHistoryDataForExtraStage 方法

```js
getHistoryDataForExtraStage(stageIndex) {
  if (!this.latestRecord || !this.latestRecord.entry) return null
  const historyEntries = normalizeEntries(this.latestRecord.entry)
  const groupIndex = this.entries.length
  if (groupIndex > historyEntries.length) return null
  const entry = historyEntries[groupIndex - 1]
  if (!entry || !entry.stages) return null
  const stage = entry.stages[stageIndex + 1]
  if (!stage || (stage.reps <= 0 && stage.weight <= 0)) return null
  return { reps: stage.reps, weight: stage.weight }
}
```

### 4f. 新增 data 属性

- `focusedStageIndex: -1` — 区分主输入框（-1）和额外阶段索引（>=0）

---

## 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `components/ActionCard.vue` | confirmExtraStages 逻辑、气泡兼容额外阶段 |
| `components/DaySettings.vue` | action-label 颜色 |
| `components/CalendarMonth.vue` | menu-overlay 居中、guide-panel 尺寸 |
