# Day 页面四项 UI/交互修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 修复 FitNote 小程序中 day 页面的四个交互问题：递减组/暂停组确认逻辑、添加动作按钮样式、弹窗全屏居中、气泡快捷填充兼容递减组/暂停组。

**Architecture:** 修改三个现有 Vue 组件文件，不新增文件。按问题编号顺序依次实现，每个问题独立可测。

**Tech Stack:** uni-app (Vue 2), `<style scoped>`, uni API (showToast)

---

## Task 1: 递减组/暂停组确认按键优先调用主确认

**Files:**
- Modify: `components/ActionCard.vue:215-216`

在 `confirmExtraStages` 方法开头增加判断：若 `mainReps` 或 `mainWeight` 有值，直接调用 `confirmEntry()` 并 return。

- [ ] **Step 1: 修改 confirmExtraStages 方法**

在 `confirmExtraStages()` 方法的 `const validStages` 行之前插入：

```js
confirmExtraStages() {
  // 主输入框有内容时，走 confirmEntry 创建新 entry
  if (this.mainReps || this.mainWeight) {
    this.confirmEntry()
    return
  }
  const validStages = this.extraStages.filter(s => s.reps && Number(s.reps) > 0)
  // ... 原有逻辑不变
```

- [ ] **Step 2: 手动测试**

1. 打开 day 页面，添加一个动作
2. 先正常添加一组（输入次数和重量，点主 ✓）
3. 切换到「递减组」，添加递减阶段，在主输入框也输入内容
4. 点击递减阶段行的 ✓ 按钮
5. 验证：应创建新 entry（而非合并到最后一组）
6. 重复测试：主输入框不填内容时，点击 ✓ 应走原有逻辑（合并到最后一组）

- [ ] **Step 3: Commit**

```bash
git add components/ActionCard.vue
git commit -m "fix: 递减组/暂停组确认优先检查主输入框内容"
```

---

## Task 2: 添加动作按钮改为白色字体

**Files:**
- Modify: `components/DaySettings.vue:555-558`

- [ ] **Step 1: 修改 action-label 颜色**

```css
.action-label {
  font-size: 15px;
  color: #fff;
}
```

仅修改 `color: #eee` → `color: #fff`。

- [ ] **Step 2: 手动测试**

打开 day 页面设置面板，确认「添加动作」按钮文字为纯白色。

- [ ] **Step 3: Commit**

```bash
git add components/DaySettings.vue
git commit -m "fix: 添加动作按钮文字改为白色"
```

---

## Task 3: more-btn 弹窗 & 阅读说明全屏居中

**Files:**
- Modify: `components/CalendarMonth.vue` (模板 + 样式)

- [ ] **Step 1: 修改菜单弹窗居中**

`.menu-overlay` 样式（line 336-347）：将 `align-items: flex-end` 改为 `align-items: center`，去掉 `padding-bottom: 120px`。

```css
.menu-overlay {
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
```

- [ ] **Step 2: 修改阅读说明弹窗全屏居中**

`.guide-panel` 样式（line 415-425）：

```css
.guide-panel {
  position: relative;
  width: 90vw;
  max-height: 80vh;
  background-color: #1e1e1e;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 100000;
}
```

`.guide-body` 样式（line 472-478）：将 `max-height: 55vh` 改为 `max-height: 65vh`。

```css
.guide-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  max-height: 65vh;
  box-sizing: border-box;
}
```

- [ ] **Step 3: 去掉 guide-overlay 的 @click.self**

模板 line 73：将 `@click.self="showGuidePanel = false"` 从 `guide-overlay` 的 `<view>` 上移除（保留内部 `overlay-bg` 的点击关闭）。

```html
<view v-if="showGuidePanel" class="guide-overlay">
  <view class="overlay-bg" @click="showGuidePanel = false"></view>
  <view class="guide-panel fade-in">
```

- [ ] **Step 4: 手动测试**

1. 点击 more-btn（⋮），验证菜单弹窗出现在屏幕正中央
2. 点击「阅读说明」，验证说明弹窗全屏居中、宽度更大、内容可正常滚动
3. 点击遮罩层可关闭弹窗

- [ ] **Step 5: Commit**

```bash
git add components/CalendarMonth.vue
git commit -m "fix: more-btn 菜单和阅读说明弹窗改为全屏居中"
```

---

## Task 4: 气泡快捷填充兼容递减组/暂停组

**Files:**
- Modify: `components/ActionCard.vue` (data、模板、方法)

此任务分为 5 个子步骤，按顺序执行。

- [ ] **Step 4a: 新增 data 属性**

在 `data()` 中新增 `focusedStageIndex: -1`（line ~119 后）：

```js
data() {
  return {
    expanded: false,
    entryType: ENTRY_TYPE.NORMAL,
    mainReps: '',
    mainWeight: '',
    extraStages: [],
    // 气泡
    showBubble: false,
    bubbleContent: '',
    focusedField: '',
    focusedStageIndex: -1,
    // 长按删除 entry
    longPressTimer: null,
    pressedEntryIdx: -1,
    longPressThreshold: 500,
  }
},
```

- [ ] **Step 4b: 重写 getHistoryDataForGroup 方法**

替换 `getHistoryDataForGroup`（line 170-180）为：

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
},
```

- [ ] **Step 4c: 重写 onInputFocus 和 fillHistoryData**

替换 `onInputFocus`（line 156-166）为：

```js
onInputFocus(field) {
  this.focusedField = field
  this.focusedStageIndex = -1
  if (!this.bubbleFill) return
  const currentVal = field === 'reps' ? this.mainReps : this.mainWeight
  if (currentVal) return
  const history = this.getHistoryDataForGroup()
  if (!history) return
  this.bubbleContent = history.displayText
  this.showBubble = true
},
```

替换 `fillHistoryData`（line 181-197）为：

```js
fillHistoryData() {
  // 额外阶段单独填充
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
},
```

- [ ] **Step 4d: 新增 onExtraInputFocus 和 getHistoryDataForExtraStage 方法**

在 `fillHistoryData` 方法之后、`addExtraStage` 方法之前插入：

```js
onExtraInputFocus(stageIndex, field) {
  this.focusedField = field
  this.focusedStageIndex = stageIndex
  if (!this.bubbleFill) return
  const stage = this.extraStages[stageIndex]
  if (!stage) return
  const currentVal = field === 'reps' ? stage.reps : stage.weight
  if (currentVal) return
  const history = this.getHistoryDataForExtraStage(stageIndex)
  if (!history) return
  const typeLabel = this.entryType === 'decreasing' ? '递减' : '暂停'
  this.bubbleContent = `上次${typeLabel}${stageIndex + 1}：${history.reps}×${history.weight}kg，点击填入`
  this.showBubble = true
},
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
},
```

- [ ] **Step 4e: 额外阶段输入框绑定 focus/blur**

修改模板 line 43-45，给 extraStages 的 `<input>` 加上事件：

```html
<input type="digit" v-model="stage.reps" placeholder="次数" class="input-reps"
  @focus="onExtraInputFocus(i, 'reps')" @blur="onInputBlur" />
<text class="input-mult">×</text>
<input type="digit" v-model="stage.weight" placeholder="kg" class="input-weight"
  @focus="onExtraInputFocus(i, 'weight')" @blur="onInputBlur" />
```

- [ ] **Step 4f: 手动测试**

1. 场景 A（主输入框气泡 - 正常组历史）：添加动作，点击主输入框，验证气泡显示「上次：10×50kg，点击填入」，点击气泡验证主输入框被填充
2. 场景 B（主输入框气泡 - 递减组历史）：该动作上次记录过递减组，点击主输入框，验证气泡显示「上次：10×50+8×40 递减，点击填入」，点击气泡后验证主输入框 + 额外阶段行被自动创建并填入
3. 场景 C（额外阶段气泡）：切换到递减组，聚焦额外阶段的输入框，验证气泡显示「上次递减1：8×40kg，点击填入」
4. 场景 D（无历史）：新动作无历史数据，聚焦输入框不显示气泡

- [ ] **Step 4g: Commit**

```bash
git add components/ActionCard.vue
git commit -m "feat: 气泡快捷填充兼容递减组/暂停组历史数据"
```

---

## 最终验证

- [ ] 所有四个问题的功能在小程序模拟器/真机上运行正常
- [ ] 无控制台报错
- [ ] 提交记录清晰（4 个 commit）
