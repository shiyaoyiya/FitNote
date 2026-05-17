# 液态玻璃（Liquid Glass）UI 设计文档

## 概述

为 FitNote uni-app 项目添加「液态玻璃」UI 风格开关，在更多弹窗中控制。开启后所有按钮、搜索框、卡片、弹窗面板、Tab Bar 等关键 UI 元素切换为毛玻璃质感风格。

## 状态管理

### daySettingsStore 变更

- 新增 `state.liquidGlassEnabled: boolean`（默认 `false`）
- 新增 `toggleLiquidGlass()` action，切换值并调用 `save()`
- `save()` 中持久化 `liquidGlassEnabled` 字段
- `load()` 中恢复该字段

## 开关入口

`index.vue` 的更多弹窗（`.menu-panel`）中增加一行：

```
✨ 开启液态玻璃 / 关闭液态玻璃
```

调用 `daySettingsStore.toggleLiquidGlass()`，同时 `uni.$emit('liquidGlassChanged')` 通知其他页面。

## 类名透传

所有 7 个页面根容器增加 `liquid-glass` 动态类：

```html
<view class="container" :class="{
  dark: store.isDarkMode,
  light: !store.isDarkMode,
  'liquid-glass': store.liquidGlassEnabled
}">
```

涉及的页面：
- `pages/index/index.vue`
- `pages/index/day.vue`
- `pages/templateManager/templateManager.vue`
- `pages/templateDetail/templateDetail.vue`
- `pages/actionLibrary/actionLibrary.vue`
- `pages/backup/backup.vue`
- `pages/trainingStat/trainingStat.vue`

## CSS 组织

新建 `static/css/liquid-glass.css`，在 `App.vue` 中全局导入：

```js
// App.vue
import '@/static/css/liquid-glass.css'
```

### CSS 变量体系

所有样式以 `.container.liquid-glass` 为祖先选择器，配合 `.dark` / `.light` 切换：

```css
/* ===== 浅色模式 ===== */
.container.liquid-glass.light {
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-text: #1a1a1a;
  --glass-shadow-outer: rgba(0, 0, 0, 0.08);
  --glass-shadow-inner: rgba(255, 255, 255, 0.3);
  --glass-placeholder: rgba(0, 0, 0, 0.45);
  --glass-edge: rgba(255, 255, 255, 0.6);
  --glass-highlight: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
}

/* ===== 深色模式 ===== */
.container.liquid-glass.dark {
  --glass-bg: rgba(0, 0, 0, 0.35);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-text: #ffffff;
  --glass-shadow-outer: rgba(0, 0, 0, 0.3);
  --glass-shadow-inner: rgba(255, 255, 255, 0.08);
  --glass-placeholder: rgba(255, 255, 255, 0.35);
  --glass-edge: rgba(255, 255, 255, 0.15);
  --glass-highlight: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
}
```

### 通用玻璃类

以 `--glass-*` 变量驱动的可复用类：

- `.glass-bg` — 基础玻璃背景 + 内外阴影 + 圆角
- `.glass-btn` — 按钮（按压缩放 0.96、内阴影加深）
- `.glass-panel` — 弹窗/面板（强化阴影）
- `.glass-input` — 输入框（聚焦时边框变蓝）
- `.glass-tabbar` — Tab Bar 悬浮样式

### 流动高光

所有玻璃元素通过 `::before` 伪元素实现：

```css
.glass-bg::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--glass-highlight);
  background-size: 200% 100%;
  animation: glass-shine 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes glass-shine {
  0% { transform: translateX(-100%) skewX(-15deg); }
  50% { transform: translateX(100%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
}
```

## 覆盖的目标元素

每个元素在 `.container.liquid-glass` 下用原始类名选择器重写样式，仅修改 `background`、`border`、`box-shadow`、`border-radius`、`color`，不影响布局和交互逻辑。

### index.vue

| 目标 | 说明 |
|---|---|
| `.today-train-btn` | 玻璃按钮，取消渐变背景 |
| `.tab-bar-fixed` | 悬浮底部 + 圆角 + 间距（仅液态下悬浮） |
| `.menu-panel` | 玻璃面板 |
| `.modal-panel` | 玻璃弹窗 |
| `TrainingSplitPlan` 内部 | 由组件自身 class 覆盖 |

### day.vue

| 目标 | 说明 |
|---|---|
| `.save-row` | 玻璃底栏 |
| `.modal-panel` | 玻璃弹窗 |
| `.minimal-timer-btn`, `.minimal-settings-btn` | 玻璃按钮 |

### templateManager.vue

| 目标 | 说明 |
|---|---|
| `.btn-create` | 玻璃按钮 |

### templateDetail.vue

| 目标 | 说明 |
|---|---|
| `.color-picker-card` | 玻璃卡片 |
| `.action-picker-panel` | 玻璃面板 |
| `.set-selector-panel` | 玻璃面板 |

### actionLibrary.vue

| 目标 | 说明 |
|---|---|
| `.btn-add-action` | 玻璃按钮 |
| `.section-header-right` | 玻璃圆形按钮 |
| `.category-tab` | 玻璃标签 |
| `.search-inner` | 玻璃搜索框 |
| `.popup-panel` | 玻璃面板 |

### backup.vue

| 目标 | 说明 |
|---|---|
| `.tab-item` | 玻璃标签 |
| `.status-card` | 玻璃卡片 |
| `.backup-orb` | 玻璃球体 |
| `.btn-secondary` | 玻璃按钮 |

### trainingStat.vue（含子组件）

| 目标 | 说明 |
|---|---|
| `.sort-card`（BodyPartManager.vue） | 玻璃卡片 |
| `.picker-panel`（DatePicker.vue） | 玻璃面板 |
| `.selector-panel`（BodyPartSelector.vue） | 玻璃面板 |

## 交互相应

- 按钮按压态：`transform: scale(0.96)` + 内阴影加深 + 背景略微变暗
- 输入框聚焦态：边框变为 `var(--focus-glow)`，毛玻璃增强
- 禁用 `-webkit-tap-highlight-color: transparent`
- 使用 `:active`（跨端兼容）

## backdrop-filter 降级

```css
@supports (backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)) {
  .container.liquid-glass .glass-bg {
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
  }
}
/* 不支持时仅保留半透背景 + 阴影，视觉无断裂 */
```

## 不涉及变更

- 不修改任何组件逻辑（仅 CSS + 根类名）
- 不新增 npm 依赖
- 不修改后端或云函数
- 不影响现有深色/浅色模式
