# 液态玻璃 UI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 FitNote 的更多弹窗中添加液态玻璃 UI 开关，开启后所有按钮、输入框、卡片、弹窗面板、Tab Bar 切换为毛玻璃风格

**Architecture:** 新建全局 CSS 文件 `static/css/liquid-glass.css` 集中定义所有玻璃样式，通过 `.container.liquid-glass` 祖先类名控制开关；`daySettingsStore` 新增 `liquidGlassEnabled` 状态持久化开关选择；7 个页面根容器增加动态类名绑定。

**Tech Stack:** uni-app (Vue 2), CSS Custom Properties, Pinia, CSS Animations

---

### Task 1: daySettingsStore 新增液态玻璃状态

**Files:**
- Modify: `stores/daySettings.js:5-38`

- [ ] **Step 1: 在 state 中添加 liquidGlassEnabled**

在 `stores/daySettings.js` 的 `state` 对象中 `todayTrainBtnVisible` 之后新增一行：

```js
liquidGlassEnabled: false,
```

- [ ] **Step 2: 在 load() 中恢复状态**

在 `load()` 方法中 `todayTrainBtnVisible` 恢复逻辑之后新增：

```js
if (data.hasOwnProperty('liquidGlassEnabled')) this.liquidGlassEnabled = !!data.liquidGlassEnabled
```

- [ ] **Step 3: 在 save() 中持久化**

在 `save()` 方法的返回对象中新增：

```js
liquidGlassEnabled: this.liquidGlassEnabled,
```

- [ ] **Step 4: 新增 toggleLiquidGlass action**

在 `toggleTheme()` 方法之后新增：

```js
toggleLiquidGlass() {
  this.liquidGlassEnabled = !this.liquidGlassEnabled
  this.save()
},
```

- [ ] **Step 5: Commit**

```bash
git add stores/daySettings.js
git commit -m "feat(store): add liquidGlassEnabled state and toggle"
```

---

### Task 2: 创建全局液态玻璃 CSS 文件

**Files:**
- Create: `static/css/liquid-glass.css`

- [ ] **Step 1: 创建 CSS 变量体系**

创建 `static/css/liquid-glass.css`，写入浅色/深色模式 CSS 变量：

```css
/* ===== 液态玻璃 UI 全局样式 ===== */
/* 开关：在根容器添加 .liquid-glass 类名 */

/* ===== 浅色模式变量 ===== */
.container.liquid-glass.light {
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-text: #1a1a1a;
  --glass-shadow-outer: rgba(0, 0, 0, 0.08);
  --glass-shadow-inner: rgba(255, 255, 255, 0.3);
  --glass-placeholder: rgba(0, 0, 0, 0.45);
  --glass-edge: rgba(255, 255, 255, 0.6);
  --focus-glow: rgba(0, 122, 255, 0.6);
}

/* ===== 深色模式变量 ===== */
.container.liquid-glass.dark {
  --glass-bg: rgba(0, 0, 0, 0.35);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-text: #ffffff;
  --glass-shadow-outer: rgba(0, 0, 0, 0.3);
  --glass-shadow-inner: rgba(255, 255, 255, 0.08);
  --glass-placeholder: rgba(255, 255, 255, 0.35);
  --glass-edge: rgba(255, 255, 255, 0.15);
  --focus-glow: rgba(0, 122, 255, 0.8);
}
```

- [ ] **Step 2: 写入流动高光动画和基础玻璃类**

```css
/* ===== 流动高光动画 ===== */
@keyframes glass-shine {
  0% { background-position: 200% 0; }
  100% { background-position: -100% 0; }
}

/* ===== 通用基础玻璃背景 ===== */
.container.liquid-glass .glass-bg {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg);
  background-blend-mode: overlay;
  animation: glass-shine 5s ease-in-out infinite;
  border: 1px solid var(--glass-border);
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 16px var(--glass-shadow-outer);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  color: var(--glass-text);
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}

/* backdrop-filter 降级 */
@supports not ((backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px))) {
  .container.liquid-glass .glass-bg {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

/* ===== 通用玻璃按钮 ===== */
.container.liquid-glass .glass-btn {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg);
  background-blend-mode: overlay;
  animation: glass-shine 5s ease-in-out infinite;
  border: 1px solid var(--glass-border);
  border-radius: 60rpx;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 16px var(--glass-shadow-outer);
  color: var(--glass-text);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s, box-shadow 0.15s;
}

.container.liquid-glass .glass-btn:active {
  transform: scale(0.96);
  box-shadow:
    inset 0 2px 6px var(--glass-shadow-inner),
    0 2px 8px var(--glass-shadow-outer);
}

/* ===== 通用玻璃面板（弹窗） ===== */
.container.liquid-glass .glass-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg);
  background-blend-mode: overlay;
  animation: glass-shine 5s ease-in-out infinite;
  border: 1px solid var(--glass-border);
  border-radius: 24rpx;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer);
  color: var(--glass-text);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

/* ===== 通用玻璃输入框 ===== */
.container.liquid-glass .glass-input {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16rpx;
  color: var(--glass-text);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.container.liquid-glass .glass-input:focus,
.container.liquid-glass .glass-input[focused] {
  border-color: var(--focus-glow);
  box-shadow: 0 0 0 2px var(--focus-glow);
}

.container.liquid-glass .glass-input::placeholder {
  color: var(--glass-placeholder);
}
```

- [ ] **Step 3: 写入 index.vue 元素覆盖样式**

```css
/* ===== index.vue ===== */

/* 今日训练按钮 */
.container.liquid-glass .today-train-btn {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 60rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 16px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

.container.liquid-glass .today-train-btn:active {
  transform: scale(0.96) !important;
}

.container.liquid-glass .today-train-text {
  color: var(--glass-text) !important;
}

/* Tab Bar 悬浮（仅液态玻璃下） */
.container.liquid-glass .tab-bar-fixed {
  bottom: 16px !important;
  left: 16px !important;
  right: 16px !important;
  width: auto !important;
  border-radius: 20rpx !important;
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 更多菜单弹窗 */
.container.liquid-glass .menu-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 通用弹窗 panel */
.container.liquid-glass .modal-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}
```

- [ ] **Step 4: 写入 day.vue 元素覆盖样式**

```css
/* ===== day.vue ===== */

/* 底部保存行 */
.container.liquid-glass .save-row {
  background: var(--glass-bg) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
  border-top: 1px solid var(--glass-border) !important;
}

/* 计时器/设置按钮 */
.container.liquid-glass .minimal-timer-btn,
.container.liquid-glass .minimal-settings-btn {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 60rpx !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 12px var(--glass-shadow-outer) !important;
}

.container.liquid-glass .minimal-timer-btn:active,
.container.liquid-glass .minimal-settings-btn:active {
  transform: scale(0.96) !important;
}
```

- [ ] **Step 5: 写入 templateManager.vue 元素覆盖样式**

```css
/* ===== templateManager.vue ===== */

.container.liquid-glass .btn-create {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 60rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 16px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

.container.liquid-glass .btn-create:active {
  transform: scale(0.96) !important;
}
```

- [ ] **Step 6: 写入 templateDetail.vue 元素覆盖样式**

```css
/* ===== templateDetail.vue ===== */

.container.liquid-glass .color-picker-card {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 40rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

.container.liquid-glass .action-picker-panel,
.container.liquid-glass .set-selector-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}
```

- [ ] **Step 7: 写入 actionLibrary.vue 元素覆盖样式**

```css
/* ===== actionLibrary.vue ===== */

/* 新建动作按钮 */
.container.liquid-glass .btn-add-action {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 60rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 16px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

.container.liquid-glass .btn-add-action:active {
  transform: scale(0.96) !important;
}

.container.liquid-glass .btn-add-icon,
.container.liquid-glass .btn-add-label {
  color: var(--glass-text) !important;
}

/* 分类展开按钮 */
.container.liquid-glass .section-header-right {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 分类标签 */
.container.liquid-glass .category-tab {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 20rpx !important;
  color: var(--glass-text) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 搜索框 */
.container.liquid-glass .search-inner {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 20rpx !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 新建动作弹窗 */
.container.liquid-glass .popup-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 32rpx 32rpx 0 0 !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 -8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}
```

- [ ] **Step 8: 写入 backup.vue 元素覆盖样式**

```css
/* ===== backup.vue ===== */

/* Tab 标签 */
.container.liquid-glass .tab-item {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 16rpx !important;
  color: var(--glass-text) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

.container.liquid-glass .tab-item.active {
  border-color: var(--focus-glow) !important;
  box-shadow: 0 0 0 1px var(--focus-glow) !important;
}

/* 状态卡片 */
.container.liquid-glass .status-card.card {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 32rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 备份球体 */
.container.liquid-glass .backup-orb {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent) 0% 0% / 200% 100%,
    linear-gradient(135deg, rgba(0,122,255,0.4), rgba(0,86,179,0.4)) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow:
    inset 0 2px 4px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* 次要按钮 */
.container.liquid-glass .btn-secondary {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24rpx !important;
  color: var(--glass-text) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 12px var(--glass-shadow-outer) !important;
}
```

- [ ] **Step 9: 写入 trainingStat（含子组件）元素覆盖样式**

```css
/* ===== trainingStat.vue 及子组件 ===== */

/* BodyPartManager 排序卡片 */
.container.liquid-glass .sort-card {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 16rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 4px 12px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* DatePicker 选择面板 */
.container.liquid-glass .picker-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24rpx !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}

/* BodyPartSelector 选择面板 */
.container.liquid-glass .selector-panel {
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent) 0% 0% / 200% 100%,
    var(--glass-bg) !important;
  background-blend-mode: overlay !important;
  animation: glass-shine 5s ease-in-out infinite !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 32rpx 32rpx 0 0 !important;
  box-shadow:
    inset 0 1px 2px var(--glass-shadow-inner),
    0 -8px 32px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
}
```

- [ ] **Step 10: 写入 Tab 图标颜色适配**

液态玻璃模式下，`.icon-base` 的图标颜色需要适配：

```css
.container.liquid-glass .icon-base {
  background-color: var(--glass-text) !important;
}
```

- [ ] **Step 11: Commit**

```bash
git add static/css/liquid-glass.css
git commit -m "feat(css): add liquid-glass global stylesheet with all glass styles"
```

---

### Task 3: App.vue 导入全局 CSS

**Files:**
- Modify: `App.vue:1-65`

- [ ] **Step 1: 在 App.vue 中 import CSS**

在 `App.vue` 的 `<script>` 中（或通过 `style` 标签）导入。由于是全局 CSS，在 `App.vue` 的 `<style>` 顶部添加：

```css
@import '@/static/css/liquid-glass.css';
```

找到 `App.vue` 的 `<style>` 标签（第 525 行），在 `/* 全局根容器配置 */` 注释之前添加上述 import。

- [ ] **Step 2: Commit**

```bash
git add App.vue
git commit -m "feat(app): import liquid-glass global stylesheet"
```

---

### Task 4: index.vue — 添加开关 + liquid-glass 类名

**Files:**
- Modify: `pages/index/index.vue:2,93-113,1319-1342`

- [ ] **Step 1: 根容器添加 liquid-glass 类名绑定**

第 2 行：
```html
<view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
```

- [ ] **Step 2: 更多弹窗增加开关项**

在 `.menu-panel` 内 `onToggleTheme` 项之后新增：

```html
<view class="menu-item" @click="onToggleLiquidGlass">
  <text class="menu-icon">✨</text>
  <text class="menu-text">{{ daySettingsStore.liquidGlassEnabled ? '关闭液态玻璃' : '开启液态玻璃' }}</text>
</view>
```

- [ ] **Step 3: 新增 onToggleLiquidGlass 方法**

在 `methods` 中 `onToggleTheme` 之后新增：

```js
onToggleLiquidGlass() {
  this.daySettingsStore.toggleLiquidGlass()
  this.showMoreMenu = false
  uni.showToast({
    title: this.daySettingsStore.liquidGlassEnabled ? '已开启液态玻璃' : '已关闭液态玻璃',
    icon: 'none'
  })
  uni.$emit('liquidGlassChanged', this.daySettingsStore.liquidGlassEnabled)
},
```

- [ ] **Step 4: Commit**

```bash
git add pages/index/index.vue
git commit -m "feat(index): add liquid-glass toggle in more menu and class binding"
```

---

### Task 5: day.vue — 添加 liquid-glass 类名

**Files:**
- Modify: `pages/index/day.vue:2`

- [ ] **Step 1: 根容器添加类名绑定**

第 2 行：
```html
<view class="container" :class="{ dark: settingsStore.isDarkMode, light: !settingsStore.isDarkMode, 'liquid-glass': settingsStore.liquidGlassEnabled }">
```

- [ ] **Step 2: Commit**

```bash
git add pages/index/day.vue
git commit -m "feat(day): add liquid-glass class binding"
```

---

### Task 6: templateManager.vue — 添加 liquid-glass 类名

**Files:**
- Modify: `pages/templateManager/templateManager.vue:2`

- [ ] **Step 1: 根容器添加类名绑定**

第 2 行：
```html
<view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
```

- [ ] **Step 2: Commit**

```bash
git add pages/templateManager/templateManager.vue
git commit -m "feat(templateManager): add liquid-glass class binding"
```

---

### Task 7: templateDetail.vue — 添加 liquid-glass 类名

**Files:**
- Modify: `pages/templateDetail/templateDetail.vue:2`

- [ ] **Step 1: 根容器添加类名绑定**

第 2 行：
```html
<view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
```

- [ ] **Step 2: Commit**

```bash
git add pages/templateDetail/templateDetail.vue
git commit -m "feat(templateDetail): add liquid-glass class binding"
```

---

### Task 8: actionLibrary.vue — 添加 liquid-glass 类名

**Files:**
- Modify: `pages/actionLibrary/actionLibrary.vue:2`

- [ ] **Step 1: 根容器添加类名绑定**

第 2 行：
```html
<view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
```

- [ ] **Step 2: Commit**

```bash
git add pages/actionLibrary/actionLibrary.vue
git commit -m "feat(actionLibrary): add liquid-glass class binding"
```

---

### Task 9: backup.vue — 添加 liquid-glass 类名

**Files:**
- Modify: `pages/backup/backup.vue:2`

- [ ] **Step 1: 根容器添加类名绑定**

第 2 行：
```html
<view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
```

- [ ] **Step 2: Commit**

```bash
git add pages/backup/backup.vue
git commit -m "feat(backup): add liquid-glass class binding"
```

---

### Task 10: trainingStat.vue — 添加 liquid-glass 类名

**Files:**
- Modify: `pages/trainingStat/trainingStat.vue:2`

- [ ] **Step 1: 根容器添加类名绑定**

第 2 行：
```html
<scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }" scroll-y>
```

- [ ] **Step 2: Commit**

```bash
git add pages/trainingStat/trainingStat.vue
git commit -m "feat(trainingStat): add liquid-glass class binding"
```
