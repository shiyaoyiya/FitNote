# 液态玻璃样式继续优化实施文档

## 1. 当前状况

### 1.1 文件行数
- `liquid-glass.css`: **3244 行**（添加工具类后）
- 已重构的 `.vue` 文件：删除了 ~100 行重复代码

### 1.2 剩余可优化空间

| 分类 | 可替换样式数 | 预计删除行数 |
|------|------------|-------------|
| 弹窗面板类 | 5 个 | ~50 行 |
| 按钮类 | 15 个 | ~150 行 |
| 卡片类 | 10 个 | ~100 行 |
| 输入框类 | 8 个 | ~60 行 |
| 其他 | 20 个 | ~150 行 |
| **总计** | **58 个** | **~510 行** |

---

## 2. 可替换的样式清单

### 2.1 弹窗面板类（可替换为 `.glass-base`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 257-267 | `.split-panel` | 重复代码 | `.glass-base` |
| 270-280 | `.menu-panel` | 重复代码 | `.glass-base` |
| 283-293 | `.modal-panel` | 重复代码 | `.glass-base` |
| 303-313 | `.guide-panel` | 重复代码 | `.glass-base` |
| 372-382 | `.timer-panel` | 重复代码 | `.glass-base` |

**预计删除：~50 行**

### 2.2 按钮类（可替换为 `.glass-btn`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 201-214 | `.more-btn` | 重复代码 | `.glass-btn` |
| 353-369 | `.minimal-timer-btn`, `.minimal-settings-btn` | 重复代码 | `.glass-btn` |
| 400-409 | `.confirm-btn`, `.extra-confirm-btn` | 重复代码 | `.glass-btn` |
| 428-438 | `.quick-btn` | 重复代码 | `.glass-btn` |
| 441-452 | `.action-btn` | 重复代码 | `.glass-btn` |
| 478-493 | `.btn-create` | 重复代码 | `.glass-btn` |
| 495-508 | `.btn-save` | 重复代码 | `.glass-btn` |

**预计删除：~80 行**

### 2.3 蓝色主按钮类（可替换为 `.glass-btn-primary`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 454-464 | `.done-btn` | 重复代码 | `.glass-btn-primary` |

**预计删除：~10 行**

### 2.4 卡片类（可替换为 `.glass-card`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 696-706 | `.sort-card` | 重复代码 | `.glass-card` |
| 709-719 | `.picker-panel` | 重复代码 | `.glass-card` |
| 722-732 | `.selector-panel` | 重复代码 | `.glass-card` |
| 835-840 | `.color-option-item` | 重复代码 | `.glass-card` |
| 925-934 | `.manage-card` | 重复代码 | `.glass-card` |

**预计删除：~50 行**

### 2.5 输入框类（可替换为 `.glass-input`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 396-405 | `.search-bar-inner` | 重复代码 | `.glass-input` |
| 672-678 | `.search-inner` | 重复代码 | `.glass-input` |
| 742-753 | `.form-input` | 重复代码 | `.glass-input` |
| 882-892 | `.custom-set-input` | 重复代码 | `.glass-input` |
| 1012-1022 | `.detail-input` | 重复代码 | `.glass-input` |
| 1030-1041 | `.action-input` | 重复代码 | `.glass-input` |

**预计删除：~60 行**

### 2.6 胶囊按钮类（可替换为 `.glass-capsule`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 640-651 | `.category-tab` | 重复代码 | `.glass-capsule` |
| 849-859 | `.quick-set-btn` | 重复代码 | `.glass-capsule` |
| 865-875 | `.preset-set-btn` | 重复代码 | `.glass-capsule` |
| 944-955 | `.manage-btn-add` | 重复代码 | `.glass-capsule` |
| 957-968 | `.manage-btn-save` | 重复代码 | `.glass-capsule` |

**预计删除：~50 行**

### 2.7 选中态（可替换为 `.glass-selected`）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 427-433 | `.action-item.selected` | 重复代码 | `.glass-selected` |
| 653-660 | `.category-tab.active` | 重复代码 | `.glass-selected` |
| 782-788 | `.category-option.selected` | 重复代码 | `.glass-selected` |
| 802-808 | `.subcategory-option.selected` | 重复代码 | `.glass-selected` |
| 877-880 | `.preset-set-btn.selected` | 重复代码 | `.glass-selected` |

**预计删除：~30 行**

### 2.8 文字颜色类（可替换为工具类）

| 行号 | 选择器 | 当前状态 | 替换为 |
|------|--------|---------|--------|
| 196-198 | `.today-train-text` | 重复代码 | `.glass-text` |
| 216-218 | `.more-dots` | 重复代码 | `.glass-text` |
| 330-331 | `.card-name` | 重复代码 | `.glass-text` |
| 333-334 | `.card-count` | 重复代码 | `.glass-placeholder` |
| 336-337 | `.card-arrow` | 重复代码 | `.glass-placeholder` |
| 614-616 | `.sort-card-name` | 重复代码 | `.glass-text` |
| 618-619 | `.drag-handle` | 重复代码 | `.glass-placeholder` |

**预计删除：~20 行**

### 2.9 其他可优化样式

| 行号 | 选择器 | 说明 | 可替换性 |
|------|--------|------|---------|
| 220-239 | `.tab-bar-fixed` | 特殊布局，保留 | ❌ |
| 242-254 | `.tab-bar-fixed .tab-item` | 特殊样式，保留 | ❌ |
| 296-300 | `.overlay-bg` | 特殊样式，保留 | ❌ |
| 315-330 | `.save-row` | 特殊样式，保留 | ❌ |
| 332-338 | `.hr-toggle` | 特殊样式，保留 | ❌ |
| 341-349 | `.sq-share-fab` | 特殊样式，保留 | ❌ |
| 384-387 | `.timer-full-body` | 特殊样式，保留 | ❌ |
| 389-397 | `button` 默认边框 | 通用重置，保留 | ❌ |

---

## 3. 实施步骤

### 第一阶段：精简 liquid-glass.css（预计 4 小时）

#### 3.1 合并相同选择器

将以下选择器合并到一行：

```css
/* 之前 */
.container.liquid-glass .split-panel { ... }
.container.liquid-glass .menu-panel { ... }
.container.liquid-glass .modal-panel { ... }

/* 之后 */
.container.liquid-glass .split-panel,
.container.liquid-glass .menu-panel,
.container.liquid-glass .modal-panel {
  /* 使用 @extend 或重复属性 */
}
```

#### 3.2 替换为工具类

对于每个可替换的样式：

1. 在 HTML 中添加工具类
2. 删除 CSS 中的重复样式

**示例：**

```vue
<!-- 之前 -->
<view class="split-panel">

<!-- 之后 -->
<view class="split-panel glass-base">
```

```css
/* 之前 */
.container.liquid-glass .split-panel {
  background: var(--glass-bg) !important;
  border: none !important;
  box-shadow: ...;
  backdrop-filter: ...;
}

/* 之后 */
/* 删除此样式 */
```

---

### 第二阶段：重构各 .vue 文件（预计 6 小时）

#### 3.3 需要重构的文件

| 文件 | 可替换样式数 | 主要替换类 |
|------|------------|-----------|
| `components/CalendarMonth.vue` | 2 | `.glass-btn`, `.glass-text` |
| `components/DaySettings.vue` | 3 | `.glass-btn`, `.glass-input` |
| `components/MoreMenu.vue` | 2 | `.glass-btn`, `.glass-text` |
| `components/TimerModal.vue` | 5 | `.glass-btn`, `.glass-card`, `.glass-input` |
| `components/TemplateSelector.vue` | 3 | `.glass-btn`, `.glass-card` |
| `components/ActionCard.vue` | 4 | `.glass-btn`, `.glass-card`, `.glass-input` |
| `pages/trainingStat/components/BodyPartManager.vue` | 4 | `.glass-card`, `.glass-btn` |
| `pages/trainingStat/components/BodyPartGrid.vue` | 3 | `.glass-card`, `.glass-text` |
| `pages/trainingStat/components/BodyPartTrend.vue` | 2 | `.glass-card` |
| `pages/trainingStat/components/TrainingOverview.vue` | 3 | `.glass-card`, `.glass-text` |
| `pages/templateManager/components/TemplateCreate.vue` | 3 | `.glass-btn`, `.glass-input` |
| `pages/templateManager/components/TemplateImportExport.vue` | 4 | `.glass-btn`, `.glass-card`, `.glass-input` |
| `pages/templateManager/components/TemplateShare.vue` | 3 | `.glass-btn`, `.glass-card` |
| `pages/templateSquare/components/ShareDialog.vue` | 4 | `.glass-btn`, `.glass-card`, `.glass-input` |
| `pages/templateSquare/components/SortBar.vue` | 2 | `.glass-capsule`, `.glass-selected` |
| `pages/templateSquare/components/TagFilter.vue` | 2 | `.glass-capsule`, `.glass-selected` |
| `pages/templateSquare/components/TemplateCard.vue` | 2 | `.glass-card`, `.glass-text` |
| `pages/backup/backup.vue` | 2 | `.glass-card`, `.glass-text` |

**总计：~50 个样式需要替换**

#### 3.4 重构流程

对于每个文件：

1. **读取文件** - 找到所有 `.container.liquid-glass` 样式
2. **分析样式** - 判断是否可用工具类替代
3. **修改模板** - 在 HTML 中添加工具类
4. **删除样式** - 从 `<style>` 中删除重复代码
5. **测试验证** - 确保样式正常显示

---

### 第三阶段：验证与测试（预计 3 小时）

#### 3.5 测试清单

- [ ] 浅色模式下所有组件显示正常
- [ ] 深色模式下所有组件显示正常
- [ ] 液态玻璃开关功能正常
- [ ] 所有按钮点击效果正常（scale 0.96）
- [ ] 弹窗动画正常（popInGlass）
- [ ] Tab Bar 悬浮效果正常
- [ ] 搜索框聚焦效果正常
- [ ] 所有输入框样式正常
- [ ] 所有卡片样式正常
- [ ] 所有胶囊按钮样式正常

#### 3.6 回归测试页面

| 页面 | 测试要点 |
|------|---------|
| `pages/index/day.vue` | 计时器按钮、设置按钮、动作卡片 |
| `pages/backup/backup.vue` | 备份球体、导入按钮 |
| `pages/feedback/feedback.vue` | 表单、卡片、提交按钮 |
| `pages/announce/announce.vue` | 公告卡片、详情弹窗 |
| `pages/actionLibrary/actionLibrary.vue` | 搜索框、动作卡片、分类标签 |
| `pages/trainingStat/trainingStat.vue` | 统计卡片、部位选择 |
| `pages/templateManager/templateManager.vue` | 模板卡片、创建按钮 |
| `pages/templateSquare/templateSquare.vue` | 模板卡片、搜索、筛选 |

---

## 4. 时间估算

| 阶段 | 工作内容 | 预计时间 |
|------|---------|---------|
| 第一阶段 | 精简 liquid-glass.css | 4 小时 |
| 第二阶段 | 重构各 .vue 文件 | 6 小时 |
| 第三阶段 | 验证与测试 | 3 小时 |
| **总计** | | **13 小时** |

---

## 5. 预期成果

### 5.1 文件行数变化

| 文件 | 当前行数 | 预期行数 | 减少 |
|------|---------|---------|------|
| `liquid-glass.css` | 3244 行 | ~1000 行 | **~69%** |
| 各 `.vue` 文件 | ~200 行重复 | 0 行 | **100%** |

### 5.2 代码质量提升

1. **可维护性** - 样式集中管理，易于修改
2. **可复用性** - 工具类可在任何地方使用
3. **一致性** - 统一的玻璃效果，避免样式差异
4. **性能** - 减少 CSS 文件大小，提升加载速度

---

## 6. 风险与注意事项

### 6.1 潜在风险

1. **CSS 特异性** - 工具类可能被其他样式覆盖
2. **组件库冲突** - uni-app 内置组件可能有自己的样式
3. **深色/浅色模式切换** - 需要确保工具类正确响应模式变化

### 6.2 注意事项

1. **渐进式重构** - 不要一次性改完，分阶段进行
2. **保留回滚点** - 每完成一个阶段就提交 git
3. **测试验证** - 每次修改后都要测试
4. **文档更新** - 及时更新实施文档

---

## 7. 回滚方案

```bash
# 回滚到重构前的提交
git revert ae8c632

# 或者回滚到特定提交
git reset --hard <commit-hash>
```

---

## 8. 验收标准

- [ ] `liquid-glass.css` 行数减少到 1200 行以下
- [ ] 各 `.vue` 文件中的液态玻璃重复样式全部删除
- [ ] 所有页面在浅色/深色/液态玻璃模式下显示正常
- [ ] 无 CSS 报错或警告
- [ ] 所有交互效果正常（点击、动画、过渡）

---

## 附录 A：工具类使用速查表

| 场景 | 使用工具类 | 示例 |
|------|-----------|------|
| 普通按钮 | `.glass-btn` | `<button class="glass-btn">` |
| 主操作按钮 | `.glass-btn-primary` | `<button class="glass-btn-primary">` |
| 胶囊按钮 | `.glass-capsule` | `<view class="glass-capsule">` |
| 卡片容器 | `.glass-card` | `<view class="glass-card">` |
| 输入框 | `.glass-input` | `<input class="glass-input">` |
| 基础玻璃效果 | `.glass-base` | `<view class="glass-base">` |
| 选中态 | `.glass-selected` | `<view class="glass-selected">` |
| 主要文字 | `.glass-text` | `<text class="glass-text">` |
| 占位符文字 | `.glass-placeholder` | `<text class="glass-placeholder">` |
| 白色文字 | `.glass-text-active` | `<text class="glass-text-active">` |

---

## 附录 B：重构前后对比

### B.1 弹窗面板

**重构前：**
```css
.container.liquid-glass .split-panel {
  background: var(--glass-bg) !important;
  border: none !important;
  border-radius: 24rpx !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
}
```

**重构后：**
```vue
<view class="split-panel glass-base">
```

### B.2 按钮

**重构前：**
```css
.container.liquid-glass .more-btn {
  background: var(--glass-bg) !important;
  border: none !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
}

.container.liquid-glass .more-btn:active {
  transform: scale(0.96) !important;
}
```

**重构后：**
```vue
<view class="more-btn glass-btn">
```

---

**文档版本**: 1.0  
**创建日期**: 2026-09-08  
**作者**: AI Assistant
