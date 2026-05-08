# 弹窗遮罩层重构设计

## 概述

将 CalendarMonth 组件内的菜单弹窗和阅读说明弹窗提升到 index.vue 页面层级，解决 `position: fixed` 在 `transform` 祖先元素内失效导致遮罩层无法全屏的问题。

## 根因

CalendarMonth 渲染在 `.calendar-slide-container` 内，该元素有 `transform: translateX(...)`。CSS 规范中，`position: fixed` 在有 `transform` 的祖先内部会相对于该祖先定位而非视口，导致遮罩层无法覆盖全屏，底层元素可被穿透点击。

## 方案

### CalendarMonth.vue

**移除：**
- `<view v-if="showMoreMenu">` 模板块（lines 55-71）
- `<view v-if="showGuidePanel">` 模板块（lines 73-90，含 GUIDE_CONTENT）
- `showMoreMenu`、`showGuidePanel` data 属性
- `onMenuReadGuide`、`onMenuAddAnniv`、`onMenuToggleTrainBtn` 方法
- `GUIDE_CONTENT` 常量
- `.menu-overlay`、`.guide-overlay` 及其子元素的样式

**新增 emit：**
- more-btn `@click` → `$emit('open-more-menu')`
- 保留 `open-anniv-popup` emit（已有）
- 保留 `toggle-train-btn` emit（已有）

### index.vue

**新增 data：**
- `showMoreMenu: false`
- `showGuidePanel: false`
- `GUIDE_CONTENT` 常量（从 CalendarMonth 搬入）

**新增模板：** 在纪念日弹窗之后添加：
1. 菜单弹窗（menu-overlay）— 三个菜单项：阅读说明、添加纪念日、隐藏/显示训练按钮
2. 阅读说明弹窗（guide-overlay）— 使用 scroll-view 展示功能说明

**样式：** 复用现有 `popup-overlay`、`overlay-bg`、`modal-panel` 体系

**事件处理：**
- `open-more-menu` → `showMoreMenu = true`
- 菜单「阅读说明」→ `showMoreMenu = false; showGuidePanel = true`
- 菜单「添加纪念日」→ `showMoreMenu = false; openAnnivPopup(null)`
- 菜单「隐藏/显示训练按钮」→ `showMoreMenu = false; onToggleTrainBtn()`

## 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `components/CalendarMonth.vue` | 移除弹窗模板/数据/方法/样式，改为 emit |
| `pages/index/index.vue` | 新增弹窗模板/数据/方法/样式 |
