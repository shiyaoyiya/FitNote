# 深色/浅色模式切换功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 FitNote 小程序中实现深色/浅色模式切换功能，状态持久化，所有页面支持浅色模式

**Architecture:** 基于 Pinia store 存储主题状态，App.vue 根元素绑定动态类，CSS 通过 `.dark` / `.light` 组合器实现样式切换

**Tech Stack:** UniApp (Vue2), Pinia, CSS Custom Properties

---

## 文件修改清单

| 序号 | 文件路径 | 操作 | 职责 |
|------|----------|------|------|
| 1 | stores/daySettings.js | 修改 | 添加主题状态和切换方法 |
| 2 | App.vue | 修改 | 绑定动态主题类 |
| 3 | pages/index/index.vue | 修改 | 添加切换按钮到更多菜单 |
| 4 | pages/index/day.vue | 修改 | 适配浅色模式样式 |
| 5 | pages/actionLibrary/actionLibrary.vue | 修改 | 适配浅色模式样式 |
| 6 | pages/trainingStat/trainingStat.vue | 修改 | 适配浅色模式样式 |
| 7 | pages/trainingStat/components/*.vue | 修改 | 适配浅色模式样式 |
| 8 | pages/templateManager/templateManager.vue | 修改 | 适配浅色模式样式 |
| 9 | pages/templateDetail/templateDetail.vue | 修改 | 适配浅色模式样式 |
| 10 | pages/backup/backup.vue | 修改 | 适配浅色模式样式 |
| 11 | pages/actionHistory/actionHistory.vue | 修改 | 适配浅色模式样式 |
| 12 | pages/year/year.vue | 修改 | 适配浅色模式样式 |
| 13 | components/*.vue | 修改 | 适配浅色模式样式 |

---

## 实施任务

### Task 1: 状态管理 - 添加主题状态和方法

**Files:**
- Modify: `stores/daySettings.js`

- [ ] **Step 1: 在 state 中添加 isDarkMode 状态**

在 `state: () => ({` 中添加新状态，默认值为 `true`（深色模式）：

```javascript
state: () => ({
  isDarkMode: true,
  // ... 现有状态保持不变
  autoStartTimer: false,
  autoFillData: false,
  bubbleFill: true,
  // ...
}),
```

- [ ] **Step 2: 在 load() 方法中加载主题状态**

在 load() 方法中读取 isDarkMode：

```javascript
load() {
  try {
    const data = uni.getStorageSync(SETTINGS_KEY)
    if (data) {
      // 添加这一行：读取主题状态，默认 true
      if (data.hasOwnProperty('isDarkMode')) this.isDarkMode = !!data.isDarkMode
      // ... 现有代码保持不变
    }
  } catch (e) {
    // ignore
  }
},
```

- [ ] **Step 3: 在 save() 方法中保存主题状态**

确保 save() 方法保存 isDarkMode：

```javascript
save() {
  uni.setStorageSync(SETTINGS_KEY, {
    isDarkMode: this.isDarkMode,
    // ... 现有其他状态
    autoStartTimer: this.autoStartTimer,
    autoFillData: this.autoFillData,
    // ...
  })
},
```

- [ ] **Step 4: 添加 toggleTheme() 方法**

在 actions 中添加新方法：

```javascript
toggleTheme() {
  this.isDarkMode = !this.isDarkMode
  this.save()
},
```

---

### Task 2: 全局应用 - App.vue 绑定动态主题类

**Files:**
- Modify: `App.vue`

- [ ] **Step 1: 在 data 中添加 themeClass 状态**

```javascript
data() {
  return {
    showGuide: false,
    guideChecked: false,
    themeClass: 'dark',  // 新增
  }
},
```

- [ ] **Step 2: 在 onLaunch 中初始化主题类**

```javascript
onLaunch() {
  console.log('App Launch')
  const templateStore = useTemplateStore()
  templateStore.load()

  // 新增：初始化主题
  const daySettingsStore = useDaySettingsStore()
  daySettingsStore.load()
  this.themeClass = daySettingsStore.isDarkMode ? 'dark' : 'light'

  this.checkFirstLaunch()
  this.setupActivityResultListener()
},
```

- [ ] **Step 3: 修改模板中的根元素**

将：
```html
<view class="app-root">
```
改为：
```html
<view class="app-root" :class="themeClass">
```

- [ ] **Step 4: 添加 onShow 监听主题变化**

```javascript
onShow: function() {
  console.log('App Show')
  // 每次显示页面时检查主题是否变化
  const daySettingsStore = useDaySettingsStore()
  daySettingsStore.load()
  const newClass = daySettingsStore.isDarkMode ? 'dark' : 'light'
  if (this.themeClass !== newClass) {
    this.themeClass = newClass
  }
},
```

---

### Task 3: UI入口 - 在更多菜单添加切换按钮

**Files:**
- Modify: `pages/index/index.vue`

- [ ] **Step 1: 在 menu-panel 中添加切换菜单项**

找到"更多菜单弹窗"部分，在现有菜单项后添加：

```vue
<!-- 更多菜单弹窗 -->
<view v-if="showMoreMenu" class="popup-overlay" @click.self="showMoreMenu = false">
  <view class="overlay-bg" @click="showMoreMenu = false"></view>
  <view class="menu-panel fade-in" @click.stop>
    <view class="menu-item" @click="onMenuReadGuide">
      <text class="menu-icon">📖</text>
      <text class="menu-text">阅读说明</text>
    </view>
    <view class="menu-item" @click="onMenuAddAnniv">
      <text class="menu-icon">📝</text>
      <text class="menu-text">添加纪念日</text>
    </view>
    <view class="menu-item" @click="onMenuToggleTrainBtn">
      <text class="menu-icon">{{ todayTrainBtnVisible ? '👁' : '🙈' }}</text>
      <text class="menu-text">{{ todayTrainBtnVisible ? '隐藏快捷训练按钮' : '显示快捷训练按钮' }}</text>
    </view>
    <!-- 新增：主题切换 -->
    <view class="menu-item" @click="onToggleTheme">
      <text class="menu-icon">{{ daySettingsStore.isDarkMode ? '☀️' : '🌙' }}</text>
      <text class="menu-text">{{ daySettingsStore.isDarkMode ? '切换浅色模式' : '切换深色模式' }}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 添加 onToggleTheme 方法**

在 methods 中添加：

```javascript
onToggleTheme() {
  this.daySettingsStore.toggleTheme()
  this.showMoreMenu = false
  uni.showToast({
    title: this.daySettingsStore.isDarkMode ? '已切换为深色模式' : '已切换为浅色模式',
    icon: 'none'
  })
  // 通知 App.vue 更新主题
  uni.$emit('themeChanged', this.daySettingsStore.isDarkMode ? 'dark' : 'light')
},
```

- [ ] **Step 3: 修改 menu-panel 样式支持浅色模式**

找到 menu-panel 样式，添加浅色模式版本：

```css
/* 更多菜单弹窗 */
.menu-panel {
  position: relative;
  width: 90vw;
  max-width: 360px;
  background-color: #1e1e1e;
  border-radius: 16px;
  overflow: hidden;
  z-index: 1;
}

/* 新增浅色模式 */
.container.light .menu-panel {
  background-color: #ffffff;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #333;
}

/* 新增浅色模式 */
.container.light .menu-item {
  border-bottom: 1px solid #e0e0e0;
}

.menu-item:active {
  background-color: #2a2a2a;
}

/* 新增浅色模式 */
.container.light .menu-item:active {
  background-color: #f0f0f0;
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.menu-text {
  font-size: 15px;
  color: #fff;
}

/* 新增浅色模式 */
.container.light .menu-text {
  color: #333333;
}
```

- [ ] **Step 4: 修改 overlay-bg 样式支持浅色模式**

```css
.overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7) !important;
}
```

---

### Task 4: App.vue 浅色模式样式适配

**Files:**
- Modify: `App.vue`

- [ ] **Step 1: 添加浅色模式引导弹窗样式**

在 `<style>` 块中找到 `.guide-panel`，添加浅色模式版本：

```css
.guide-panel {
  width: 85vw;
  max-height: 75vh;
  background-color: #1e1e1e;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 新增浅色模式 */
.app-root.light .guide-panel {
  background-color: #ffffff;
}
```

- [ ] **Step 2: 添加浅色模式引导页头部样式**

```css
.guide-header {
  padding: 18px 16px;
  text-align: center;
  border-bottom: 1px solid #333;
}

/* 新增浅色模式 */
.app-root.light .guide-header {
  border-bottom: 1px solid #e0e0e0;
}

.guide-title {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

/* 新增浅色模式 */
.app-root.light .guide-title {
  color: #333333;
}

.guide-subtitle {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

/* 新增浅色模式 */
.app-root.light .guide-subtitle {
  color: #666666;
}
```

- [ ] **Step 3: 添加浅色模式引导页内容样式**

```css
.guide-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #2a2a2a;
}

/* 新增浅色模式 */
.app-root.light .guide-item {
  border-bottom: 1px solid #f0f0f0;
}

.guide-item-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

/* 新增浅色模式 */
.app-root.light .guide-item-title {
  color: #333333;
}

.guide-item-desc {
  font-size: 13px;
  color: #aaa;
  line-height: 1.5;
}

/* 新增浅色模式 */
.app-root.light .guide-item-desc {
  color: #666666;
}
```

- [ ] **Step 4: 添加浅色模式页脚样式**

```css
.guide-footer {
  padding: 12px 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.guide-checkbox-label {
  font-size: 14px;
  color: #aaa;
}

/* 新增浅色模式 */
.app-root.light .guide-checkbox-label {
  color: #666666;
}
```

- [ ] **Step 5: 添加浅色模式确认按钮样式**

```css
.guide-confirm-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #379bff, #2d82d6);
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

/* 新增浅色模式 - 按钮样式保持一致 */
.app-root.light .guide-confirm-btn {
  /* 保持渐变色，但确保文字颜色正确 */
  color: #fff;
}
```

---

### Task 5: pages/index/day.vue 浅色模式适配

**Files:**
- Modify: `pages/index/day.vue`

- [ ] **Step 1: 查看 day.vue 完整样式**

读取 day.vue 文件的完整样式部分，识别需要适配的元素

- [ ] **Step 2: 适配动作卡片列表**

添加浅色模式样式（基于现有的深色模式）：

```css
.container.light .action-list {
  background-color: #f5f5f5;
}
```

- [ ] **Step 3: 适配输入框样式**

```css
.container.light .action-input,
.container.light .big-input {
  background-color: #ffffff;
  border-color: #e0e0e0;
  color: #333333;
}
```

- [ ] **Step 4: 适配按钮样式**

```css
.container.light .save-row .minimal-timer-btn,
.container.light .save-row .minimal-settings-btn {
  background-color: #ffffff;
  color: #333333;
}

.container.light .save-row .minimal-timer-btn:active,
.container.light .save-row .minimal-settings-btn:active {
  background-color: #f0f0f0;
}
```

- [ ] **Step 5: 适配弹窗样式**

```css
.container.light .modal-panel {
  background-color: #ffffff;
}

.container.light .modal-header {
  border-bottom: 1px solid #e0e0e0;
}

.container.light .modal-title {
  color: #333333;
}

.container.light .close-icon {
  color: #999999;
}
```

---

### Task 6: pages/actionLibrary/actionLibrary.vue 浅色模式适配

**Files:**
- Modify: `pages/actionLibrary/actionLibrary.vue`

- [ ] **Step 1: 适配搜索栏样式**

读取文件并添加浅色模式样式

- [ ] **Step 2: 适配分类标签样式**

- [ ] **Step 3: 适配动作卡片样式**

- [ ] **Step 4: 适配编辑弹窗样式**

---

### Task 7: pages/trainingStat/* 浅色模式适配

**Files:**
- Modify: `pages/trainingStat/trainingStat.vue`
- Modify: `pages/trainingStat/components/DatePicker.vue`
- Modify: `pages/trainingStat/components/TrainingOverview.vue`
- Modify: `pages/trainingStat/components/BodyPartGrid.vue`
- Modify: `pages/trainingStat/components/BodyPartTrend.vue`
- Modify: `pages/trainingStat/components/BodyPartManager.vue`
- Modify: `pages/trainingStat/components/BodyPartSelector.vue`

- [ ] **Step 1: 适配 trainingStat.vue 主页面样式**

- [ ] **Step 2: 适配 DatePicker 日期选择器样式**

- [ ] **Step 3: 适配 TrainingOverview 训练概览样式**

- [ ] **Step 4: 适配 BodyPartGrid 肌群网格样式**

- [ ] **Step 5: 适配 BodyPartTrend 肌群趋势样式**

- [ ] **Step 6: 适配 BodyPartManager 肌群管理器弹窗样式**

- [ ] **Step 7: 适配 BodyPartSelector 肌群选择器样式**

---

### Task 8: pages/templateManager/templateManager.vue 浅色模式适配

**Files:**
- Modify: `pages/templateManager/templateManager.vue`

- [ ] **Step 1: 适配模板列表样式**

- [ ] **Step 2: 适配编辑弹窗样式**

---

### Task 9: pages/templateDetail/templateDetail.vue 浅色模式适配

**Files:**
- Modify: `pages/templateDetail/templateDetail.vue`

- [ ] **Step 1: 适配模板详情页样式**

---

### Task 10: pages/backup/backup.vue 浅色模式适配

**Files:**
- Modify: `pages/backup/backup.vue`

- [ ] **Step 1: 适配备份页面样式**

---

### Task 11: pages/actionHistory/actionHistory.vue 浅色模式适配

**Files:**
- Modify: `pages/actionHistory/actionHistory.vue`

- [ ] **Step 1: 适配历史记录页面样式**

---

### Task 12: pages/year/year.vue 浅色模式适配

**Files:**
- Modify: `pages/year/year.vue`

- [ ] **Step 1: 适配年历页面样式**

---

### Task 13: components/* 组件浅色模式适配

**Files:**
- Modify: `components/CalendarMonth.vue`
- Modify: `components/ActionCard.vue`
- Modify: `components/DaySettings.vue`
- Modify: `components/TimerModal.vue`
- Modify: `components/TemplateSelector.vue`
- Modify: `components/ProgressChart.vue`
- Modify: `components/TrainingSplitPlan.vue`

- [ ] **Step 1: 适配 CalendarMonth 月历组件样式**

- [ ] **Step 2: 适配 ActionCard 动作卡片组件样式**

- [ ] **Step 3: 适配 DaySettings 日设置组件样式**

- [ ] **Step 4: 适配 TimerModal 计时器弹窗样式**

- [ ] **Step 5: 适配 TemplateSelector 模板选择器样式**

- [ ] **Step 6: 适配 ProgressChart 进度图表样式**

- [ ] **Step 7: 适配 TrainingSplitPlan 分化计划弹窗样式**

---

## 浅色模式通用样式参考

每个页面适配时可参考以下通用样式规则：

```css
/* 页面背景 */
.container.light {
  background-color: #f5f5f5;
  color: #333333;
}

/* 卡片背景 */
.container.light .card,
.container.light .panel {
  background-color: #ffffff;
}

/* 弹窗背景 */
.container.light .modal-panel,
.container.light .popup-panel {
  background-color: #ffffff;
}

/* 标题文字 */
.container.light .title,
.container.light .modal-title,
.container.light .panel-title {
  color: #333333;
}

/* 次要文字 */
.container.light .subtitle,
.container.light .hint,
.container.light .placeholder {
  color: #999999;
}

/* 边框 */
.container.light .border,
.container.light .divider {
  border-color: #e0e0e0;
}

/* 输入框 */
.container.light input,
.container.light textarea {
  background-color: #ffffff;
  border-color: #e0e0e0;
  color: #333333;
}

/* 按钮 */
.container.light .btn:active {
  background-color: #e0e0e0;
}

/* 图标 */
.container.light .icon-base {
  background-color: #191919;
}
```

---

## 验收检查清单

- [ ] 切换按钮正确显示当前模式图标（深色显示☀️，浅色显示🌙）
- [ ] 点击切换后主题立即生效，无闪烁
- [ ] 关闭并重新打开小程序，主题保持上次选择
- [ ] 所有页面在浅色模式下无明显视觉问题（文字可读、背景对比度足够）
- [ ] 切换过程流畅，无明显卡顿
