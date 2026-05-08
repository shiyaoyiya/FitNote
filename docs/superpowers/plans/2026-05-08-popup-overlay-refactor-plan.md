# 弹窗遮罩层重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 将 CalendarMonth 组件内的菜单弹窗和阅读说明弹窗提升到 index.vue 页面层级，修复 transform 导致 fixed 定位失效、遮罩层无法全屏的问题。

**Architecture:** CalendarMonth.vue 移除弹窗模板/数据/方法/样式，改为 emit 事件；index.vue 新增弹窗模板/数据/方法/样式，复用现有 popup-overlay 体系。

**Tech Stack:** uni-app (Vue 2), `<style scoped>`

---

## Task 1: CalendarMonth.vue — 移除弹窗，改为 emit

**Files:**
- Modify: `components/CalendarMonth.vue`

- [ ] **Step 1a: 修改 more-btn 的 @click 为 emit**

Line 6: 将 `@click="showMoreMenu = true"` 改为 `@click="$emit('open-more-menu')"`。

```html
<view class="more-btn" @click="$emit('open-more-menu')">
```

- [ ] **Step 1b: 删除菜单弹窗模板**

删除 lines 55-71（`<view v-if="showMoreMenu" ...> ... </view>` 整块）。

- [ ] **Step 1c: 删除阅读说明弹窗模板**

删除 lines 73-90（`<view v-if="showGuidePanel" ...> ... </view>` 整块）。

- [ ] **Step 1d: 删除 GUIDE_CONTENT 常量**

删除 lines 94-125（`const GUIDE_CONTENT = [...]` 整块）。

- [ ] **Step 1e: 更新 emits 声明**

Line 175: 将 `emits: ['open-anniv-popup', 'toggle-train-btn']` 改为：

```js
emits: ['date-click', 'date-longpress', 'go-to-year-page', 'open-anniv-popup', 'toggle-train-btn', 'open-more-menu'],
```

（包含已有的隐式 emit，加上新的 `open-more-menu`）

- [ ] **Step 1f: 删除 data 中的弹窗属性**

Lines 177-181: 删除 `showMoreMenu: false`、`showGuidePanel: false`、`GUIDE_CONTENT,`。

```js
data() {
  return {}
},
```

- [ ] **Step 1g: 删除弹窗相关方法**

删除 lines 196-207 中的 `onMenuReadGuide`、`onMenuAddAnniv`、`onMenuToggleTrainBtn` 三个方法。

保留 `handleDateClick`、`handleDateLongPress`、`handleGoToYearPage`、`handleOpenAnnivPopup`。

- [ ] **Step 1h: 删除弹窗相关样式**

删除 lines 336-441 中以下样式块：
- `.menu-overlay` (lines 336-346)
- `.menu-overlay .overlay-bg` (lines 348-355)
- `.guide-overlay .overlay-bg` (lines 357-364)
- `.menu-panel` (lines 366-374)
- `.menu-item` (lines 376-384)
- `.menu-item:active` (lines 387-389)
- `.menu-icon` (lines 391-394)
- `.menu-text` (lines 396-399)
- `.guide-overlay` (lines 401-412)
- `.guide-panel` (lines 414-424)
- `.fade-in` (lines 426-428)
- `@keyframes fadeIn` (lines 430-441)
- `.guide-header` 及后续 guide 相关样式（lines 443 到样式结束）

保留 `.calendar-month`、`.calendar-header`、`.more-btn`、`.calendar-grid` 等日历相关样式。

- [ ] **Step 1i: 验证**

打开小程序，CalendarMonth 组件的日历网格、标题、more-btn 应正常显示，点击 more-btn 不会报错（事件通过 emit 传递到父组件）。

- [ ] **Step 1j: Commit**

```bash
git add components/CalendarMonth.vue
git commit -m "refactor: CalendarMonth 弹窗提升到页面层级，移除组件内弹窗代码"
```

---

## Task 2: index.vue — 新增弹窗模板、数据、方法、样式

**Files:**
- Modify: `pages/index/index.vue`

- [ ] **Step 2a: 给三个 CalendarMonth 实例添加事件绑定**

在每个 `<CalendarMonth ...>` 标签上添加 `@open-more-menu="openMoreMenu"` 和 `@open-guide="openGuide"`。

Line 12（第一个实例末尾）：
```html
@toggle-train-btn="onToggleTrainBtn" @open-more-menu="openMoreMenu" @open-guide="openGuide" />
```

Line 20（第二个实例末尾）：
```html
@toggle-train-btn="onToggleTrainBtn" @open-more-menu="openMoreMenu" @open-guide="openGuide" />
```

Line 28（第三个实例末尾）：
```html
@toggle-train-btn="onToggleTrainBtn" @open-more-menu="openMoreMenu" @open-guide="openGuide" />
```

- [ ] **Step 2b: 在纪念日弹窗之前添加菜单弹窗模板**

在 line 89（`<!-- 纪念日输入弹窗 -->` 之前）插入：

```html
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
  </view>
</view>
```

- [ ] **Step 2c: 在纪念日弹窗之前添加阅读说明弹窗模板**

在菜单弹窗模板之后、纪念日弹窗之前插入：

```html
<!-- 阅读说明弹窗 -->
<view v-if="showGuidePanel" class="popup-overlay">
  <view class="overlay-bg" @click="showGuidePanel = false"></view>
  <view class="guide-panel fade-in">
    <view class="guide-header">
      <text class="guide-title">FitNote 功能说明</text>
      <text class="close-icon" @click="showGuidePanel = false">×</text>
    </view>
    <scroll-view class="guide-body" scroll-y="true" show-scrollbar="false">
      <view v-for="(item, idx) in GUIDE_CONTENT" :key="idx" class="guide-item">
        <text class="guide-icon">{{ item.icon }}</text>
        <view class="guide-content">
          <text class="guide-item-title">{{ item.title }}</text>
          <text class="guide-item-desc">{{ item.desc }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</view>
```

- [ ] **Step 2d: 添加 GUIDE_CONTENT 常量**

在 `export default` 之前（line ~187 附近，import 语句之后）插入：

```js
const GUIDE_CONTENT = [{
    icon: '📅',
    title: '日历浏览',
    desc: '首页展示月历，点击日期可查看/记录当日训练。左滑右滑切换月份，长按日期可清空该日记录'
  },
  {
    icon: '🏋️',
    title: '今日训练',
    desc: '点击"开始训练"按钮进入训练页面，从预设模板中选择，记录每个动作的重量和次数，自动计算与上次训练的对比'
  },
  {
    icon: '💪',
    title: '训练模板',
    desc: '在"训练模板"页面管理个人模板，支持创建、编辑、删除，添加/移除动作'
  },
  {
    icon: '📊',
    title: '训练统计',
    desc: '查看周/月训练总量，各肌群训练频次分析'
  },
  {
    icon: '📝',
    title: '纪念日',
    desc: '记录重要日期，首页底部展示已过去的天数'
  },
  {
    icon: '⏱️',
    title: '计时休息',
    desc: '记录训练组间休息时长，自动计时功能，支持自定义时长'
  },
]
```

- [ ] **Step 2e: 添加 data 属性**

在 data 中添加（`showAnnivPopup` 附近）：

```js
showMoreMenu: false,
showGuidePanel: false,
GUIDE_CONTENT,
```

- [ ] **Step 2f: 添加方法**

在 methods 中添加（`onToggleTrainBtn` 方法附近）：

```js
openMoreMenu() {
  this.showMoreMenu = true
},
openGuide() {
  this.showGuidePanel = true
},
onMenuReadGuide() {
  this.showMoreMenu = false
  this.showGuidePanel = true
},
onMenuAddAnniv() {
  this.showMoreMenu = false
  this.openAnnivPopup(null)
},
onMenuToggleTrainBtn() {
  this.showMoreMenu = false
  this.onToggleTrainBtn()
},
```

- [ ] **Step 2g: 添加弹窗样式**

在 style 中（`.popup-overlay` / `.modal-panel` 附近）添加菜单和阅读说明面板的样式：

```css
.menu-panel {
  position: relative;
  width: 90vw;
  max-width: 360px;
  background-color: #1e1e1e;
  border-radius: 16px;
  overflow: hidden;
  z-index: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #333;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #2a2a2a;
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.menu-text {
  font-size: 15px;
  color: #fff;
}

.guide-panel {
  position: relative;
  width: 90vw;
  max-height: 80vh;
  background-color: #1e1e1e;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.guide-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.guide-title {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.close-icon {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: #888;
  border-radius: 50%;
}

.close-icon:active {
  background-color: rgba(255, 255, 255, 0.1);
}

.guide-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  max-height: 65vh;
  box-sizing: border-box;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #2a2a2a;
}

.guide-item:last-child {
  border-bottom: none;
}

.guide-icon {
  font-size: 22px;
  margin-right: 12px;
  flex-shrink: 0;
}

.guide-content {
  flex: 1;
}

.guide-item-title {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.guide-item-desc {
  font-size: 12px;
  color: #aaa;
  line-height: 1.5;
}
```

注意：`.close-icon` 和 `.guide-body` 等类名可能与 index.vue 现有样式冲突。如果已有同名样式，需要加前缀或使用不同类名。

- [ ] **Step 2h: 手动测试**

1. 点击 more-btn（⋮），验证菜单弹窗全屏居中、遮罩层覆盖全屏
2. 点击菜单外的遮罩层可关闭
3. 点击「阅读说明」，验证说明弹窗全屏居中
4. 阅读说明弹窗内容可正常滚动
5. 点击遮罩层可关闭阅读说明弹窗
6. 点击「添加纪念日」关闭菜单后弹出纪念日弹窗
7. 点击「隐藏/显示训练按钮」功能正常
8. 底部 tab 栏、纪念日卡片无法穿透点击

- [ ] **Step 2i: Commit**

```bash
git add pages/index/index.vue
git commit -m "feat: 菜单弹窗和阅读说明弹窗提升到 index.vue 页面层级"
```

---

## 最终验证

- [ ] 所有弹窗全屏遮罩，无法穿透点击
- [ ] 弹窗屏幕居中
- [ ] 日历组件功能正常（点击日期、滑动切换月份等）
- [ ] 无控制台报错
