# 深色/浅色模式切换功能设计

## 1. 背景与目标

### 背景
FitNote 小程序目前仅支持深色模式，随着功能迭代，需要为用户提供主题切换能力。用户要求在 index.vue 的"更多菜单"弹窗中添加模式切换按钮，并确保所有页面在浅色模式下均有良好的视觉呈现。

### 目标
- 在"更多菜单"弹窗中添加深色/浅色模式切换按钮
- 实现主题状态持久化存储
- 对所有页面进行浅色模式适配
- 确保切换性能最优，无明显闪烁

---

## 2. 技术方案

### 方案选择
**方案一：基于状态存储 + 全局CSS变量**

### 核心实现

#### 2.1 状态管理
- 扩展 `stores/daySettings.js`，添加 `isDarkMode` 状态
- 默认值为 `true`（深色模式）
- 提供 `toggleTheme()` 方法切换主题
- 在 `load()` / `save()` 中处理持久化

```javascript
// stores/daySettings.js
state: () => ({
  isDarkMode: true,
  // ... 现有状态
})

toggleTheme() {
  this.isDarkMode = !this.isDarkMode
  this.save()
}
```

#### 2.2 全局主题应用
- 在 `App.vue` 的根元素上绑定动态类 `:class="themeClass"`
- `themeClass` 值为 `'dark'` 或 `'light'`
- 在 `onLaunch` 时从 store 读取初始主题

```html
<!-- App.vue -->
<view class="app-root" :class="themeClass">
  <slot></slot>
</view>
```

#### 2.3 UI入口
- 在 `pages/index/index.vue` 的"更多菜单"弹窗（menu-panel）中添加菜单项
- 点击切换主题并关闭弹窗

```vue
<!-- index.vue 更多菜单 -->
<view class="menu-item" @click="onToggleTheme">
  <text class="menu-icon">{{ daySettingsStore.isDarkMode ? '🌙' : '☀️' }}</text>
  <text class="menu-text">{{ daySettingsStore.isDarkMode ? '切换浅色模式' : '切换深色模式' }}</text>
</view>
```

#### 2.4 样式适配策略

每个页面通过容器类的 `.dark` / `.light` 组合器切换样式：

```css
/* 深色模式（默认） */
.container.dark {
  background-color: #121212;
  color: #f7f7f7;
}

/* 浅色模式 */
.container.light {
  background-color: #f5f5f5;
  color: #333333;
}
```

---

## 3. 需要适配的页面清单

| 序号 | 文件路径 | 主要适配内容 |
|------|----------|-------------|
| 1 | App.vue | 引导页弹窗、首次启动弹窗 |
| 2 | pages/index/index.vue | 日历容器、纪念日卡片、底部Tab栏、弹窗 |
| 3 | pages/index/day.vue | 动作卡片、输入框、按钮、设置面板 |
| 4 | pages/actionLibrary/actionLibrary.vue | 搜索栏、分类标签、动作卡片、编辑弹窗 |
| 5 | pages/trainingStat/trainingStat.vue | 统计视图、筛选器 |
| 6 | pages/trainingStat/components/DatePicker.vue | 日期选择器 |
| 7 | pages/trainingStat/components/TrainingOverview.vue | 训练概览卡片 |
| 8 | pages/trainingStat/components/BodyPartGrid.vue | 肌群网格 |
| 9 | pages/trainingStat/components/BodyPartTrend.vue | 肌群趋势图 |
| 10 | pages/trainingStat/components/BodyPartManager.vue | 肌群管理器弹窗 |
| 11 | pages/trainingStat/components/BodyPartSelector.vue | 肌群选择器 |
| 12 | pages/templateManager/templateManager.vue | 模板列表、编辑弹窗 |
| 13 | pages/templateDetail/templateDetail.vue | 模板详情、动作列表 |
| 14 | pages/backup/backup.vue | 备份界面、按钮 |
| 15 | pages/actionHistory/actionHistory.vue | 历史记录列表 |
| 16 | pages/year/year.vue | 年历视图 |
| 17 | components/CalendarMonth.vue | 月历组件 |
| 18 | components/ActionCard.vue | 动作卡片组件 |
| 19 | components/DaySettings.vue | 日设置面板 |
| 20 | components/TimerModal.vue | 计时器弹窗 |
| 21 | components/TemplateSelector.vue | 模板选择器 |
| 22 | components/ProgressChart.vue | 进度图表 |
| 23 | components/TrainingSplitPlan.vue | 分化计划弹窗 |

---

## 4. 浅色模式配色规范

### 背景色
| 元素 | 深色模式 | 浅色模式 |
|------|---------|---------|
| 页面背景 | #121212 | #f5f5f5 |
| 卡片背景 | #1c1c1e / #1e1e1e | #ffffff |
| 弹窗背景 | #1e1e1e | #ffffff |
| Tab栏背景 | rgba(20, 20, 20, 0.8) | rgba(255, 255, 255, 0.85) |

### 文字色
| 元素 | 深色模式 | 浅色模式 |
|------|---------|---------|
| 主文字 | #f7f7f7 | #333333 |
| 次要文字 | #bbbbbb / #888888 | #666666 |
| 占位符文字 | #666666 | #999999 |

### 边框色
| 元素 | 深色模式 | 浅色模式 |
|------|---------|---------|
| 普通边框 | #333333 | #e0e0e0 |
| 分隔线 | #2a2a2a / #333 | #f0f0f0 |

### 特殊元素
| 元素 | 深色模式 | 浅色模式 |
|------|---------|---------|
| 图标背景 | #f2f2f2 | #191919 |
| 输入框背景 | #262626 | #ffffff |
| 按钮激活态 | #2a2a2a | #e0e0e0 |

---

## 5. 性能考虑

### 切换性能
- 主题切换仅切换1个CSS类（dark ↔ light）
- 无DOM节点重建，仅触发CSS重新计算
- 使用CSS继承和组合器，浏览器渲染引擎优化

### 启动性能
- 主题状态在 `onLaunch` 时同步读取
- 避免异步加载导致的主题闪烁

### 存储性能
- 使用 `uni.setStorageSync` / `uni.getStorageSync` 同步API
- 数据量极小（仅布尔值），无性能问题

---

## 6. 兼容性

- UniApp (Vue2) 环境
- 目标平台：Android（从 manifest.json 和 App.vue 中的 plus API 使用可知）
- CSS 组合器兼容性：主流浏览器均支持

---

## 7. 实施步骤

1. **状态管理**：修改 `stores/daySettings.js`，添加主题状态和方法
2. **全局应用**：修改 `App.vue`，绑定动态主题类
3. **UI入口**：修改 `pages/index/index.vue`，添加切换按钮
4. **逐页适配**：按清单顺序，逐一适配各页面和组件的浅色样式

---

## 8. 验收标准

- [ ] 切换按钮正确显示当前模式
- [ ] 点击切换后主题立即生效
- [ ] 关闭并重新打开小程序，主题保持上次选择
- [ ] 所有页面在浅色模式下无明显视觉问题
- [ ] 切换过程无闪烁或卡顿
