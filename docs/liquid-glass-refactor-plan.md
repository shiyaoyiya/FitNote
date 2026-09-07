# 液态玻璃样式重构实施文档

## 1. 问题分析

### 1.1 当前状况
- `liquid-glass.css` 共 **3123 行**，维护困难
- 大量重复的玻璃效果样式在多个文件中
- 按页面/组件组织，难以复用

### 1.2 重复代码分布

| 文件 | 重复行数 | 说明 |
|------|---------|------|
| `static/css/liquid-glass.css` | ~2500 行 | 主要样式文件 |
| `pages/index/day.vue` | ~20 行 | 按钮、面板样式 |
| `pages/backup/backup.vue` | ~15 行 | 备份球体、按钮 |
| `pages/feedback/feedback.vue` | ~10 行 | 卡片、提交按钮 |
| `pages/announce/announce.vue` | ~5 行 | 卡片、弹窗 |
| `pages/actionLibrary/actionLibrary.vue` | ~5 行 | 搜索框 |
| `components/ExportTab.vue` | ~20 行 | 导出按钮 |
| `components/ImportTab.vue` | ~20 行 | 导入按钮 |
| `pages/templateManager/components/TemplateSquareTab.vue` | ~30 行 | 按钮样式 |

**总重复代码：约 300+ 行**

---

## 2. 重构目标

### 2.1 目标行数
- `liquid-glass.css`: 3123 行 → **~500 行**（减少 80%+）
- 各 `.vue` 文件：删除重复样式，改用工具类

### 2.2 目标结构

```css
/* ===== 1. CSS 变量（~50 行） ===== */

/* ===== 2. 工具类（~150 行） ===== */

/* ===== 3. 通用组件（~200 行） ===== */

/* ===== 4. 动画（~50 行） ===== */

/* ===== 5. 页面特有样式（~50 行） ===== */
```

---

## 3. 实施步骤

### 第一阶段：提取工具类（预计 2 小时）

#### 3.1 分析现有样式模式

从现有代码中提取以下重复模式：

```css
/* 模式 1：基础玻璃效果 */
background: var(--glass-bg);
backdrop-filter: blur(12px) saturate(140%);
-webkit-backdrop-filter: blur(12px) saturate(140%);
box-shadow:
  0 0 0 0.5px var(--glass-edge) inset,
  0 1px 3px var(--glass-shadow-inner) inset,
  0 1px 4px var(--glass-shadow-outer);
border: none;

/* 模式 2：卡片玻璃效果 */
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.06);
border-top: 1px solid rgba(255, 255, 255, 0.12);
box-shadow:
  0 1px 5px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.08);
border-radius: 24rpx;

/* 模式 3：按钮激活态 */
transform: scale(0.96);
```

#### 3.2 创建工具类定义

```css
/* ===== 工具类定义 ===== */

/* 基础玻璃效果 - 用于输入框、标签等 */
.glass-base {
  background: var(--glass-bg) !important;
  border: none !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
}

/* 卡片玻璃效果 - 用于面板、卡片容器 */
.glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 1px 5px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border-radius: 24rpx;
  overflow: hidden;
}

/* 按钮玻璃效果 */
.glass-btn {
  background: var(--glass-bg) !important;
  border: none !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 3px var(--glass-shadow-inner) inset,
    0 1px 4px var(--glass-shadow-outer) !important;
  color: var(--glass-text) !important;
}

.glass-btn:active {
  transform: scale(0.96) !important;
}

/* 输入框玻璃效果 */
.glass-input {
  background: var(--glass-bg) !important;
  border: none !important;
  -webkit-backdrop-filter: blur(8px) saturate(120%) !important;
  backdrop-filter: blur(8px) saturate(120%) !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 2px var(--glass-shadow-inner) inset !important;
  color: var(--glass-text) !important;
}

.glass-input::placeholder {
  color: var(--glass-placeholder) !important;
}

/* 胶囊按钮（小尺寸） */
.glass-capsule {
  background: var(--glass-bg) !important;
  border: none !important;
  border-radius: 20px !important;
  -webkit-backdrop-filter: blur(8px) saturate(120%) !important;
  backdrop-filter: blur(8px) saturate(120%) !important;
  box-shadow:
    0 0 0 0.5px var(--glass-edge) inset,
    0 1px 2px var(--glass-shadow-inner) inset !important;
  color: var(--glass-text) !important;
}

/* 胶囊按钮激活态 */
.glass-capsule:active {
  transform: scale(0.96) !important;
}

/* 蓝色渐变按钮（主操作） */
.glass-btn-primary {
  background: linear-gradient(135deg,
    rgba(55, 155, 255, 0.7) 0%,
    rgba(0, 72, 255, 0.7) 100%) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.4) !important;
  box-shadow:
    0 4px 16px rgba(55, 155, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  color: #fff !important;
}

.glass-btn-primary:active {
  transform: scale(0.96) !important;
}

/* 选中态 */
.glass-selected {
  border-color: var(--focus-glow) !important;
  box-shadow:
    0 0 0 1px var(--focus-glow),
    inset 0 1px 3px var(--glass-shadow-inner) !important;
}

/* 激活态文字 */
.glass-text-active {
  color: #ffffff !important;
}

/* 占位符文字 */
.glass-placeholder {
  color: var(--glass-placeholder) !important;
}

/* 主要文字 */
.glass-text {
  color: var(--glass-text) !important;
}
```

---

### 第二阶段：重构 liquid-glass.css（预计 3 小时）

#### 3.3 新文件结构

```css
/* ============================================
   液态玻璃 UI 全局样式
   版本: 2.0
   行数目标: ~500 行
   ============================================ */

/* ===== 1. CSS 变量定义（~50 行） ===== */

/* 浅色模式变量 */
.container.liquid-glass.light {
  --glass-bg: rgba(252, 252, 254, 0.7);
  --glass-border: rgba(200, 210, 230, 0.6);
  --glass-text: #1a1a1a;
  --glass-shadow-outer: rgba(0, 0, 0, 0.2);
  --glass-shadow-inner: rgba(255, 255, 255, 0.55);
  --glass-placeholder: rgba(0, 0, 0, 0.45);
  --glass-edge: rgba(255, 255, 255, 0.65);
  --focus-glow: rgba(0, 122, 255, 0.6);
  --glass-grid-bg: rgba(245, 245, 245, 0.1);
  --glass-btn-bg: rgba(255, 255, 255, 0.6);
  --glass-float: 0 8px 24px rgba(0, 0, 0, 0.06);
}

/* 深色模式变量 */
.container.liquid-glass.dark {
  --glass-bg: rgba(0, 0, 0, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-text: #ffffff;
  --glass-shadow-outer: rgba(0, 0, 0, 0.4);
  --glass-shadow-inner: rgba(255, 255, 255, 0.1);
  --glass-placeholder: rgba(255, 255, 255, 0.35);
  --glass-edge: rgba(255, 255, 255, 0.2);
  --focus-glow: rgba(0, 122, 255, 0.8);
  --glass-grid-bg: rgba(129, 129, 129, 0.1);
  --glass-btn-bg: rgba(10, 10, 10, 0.85);
  --glass-float: 0 8px 24px rgba(200, 200, 200, 0.05);
}

/* ===== 2. 工具类（~150 行） ===== */
/* 上面已定义 */

/* ===== 3. 通用组件（~200 行） ===== */

/* Tab Bar 悬浮 */
.container.liquid-glass .tab-bar-fixed { ... }

/* 弹窗面板通用样式 */
.container.liquid-glass .modal-panel,
.container.liquid-glass .split-panel,
.container.liquid-glass .menu-panel { ... }

/* ===== 4. 动画（~50 行） ===== */

@keyframes popInGlass { ... }

/* ===== 5. 页面特有样式（~50 行） ===== */
/* 只保留无法抽象的样式 */
```

---

### 第三阶段：重构各 .vue 文件（预计 4 小时）

#### 3.4 逐个文件重构

**day.vue**
```vue
<!-- 删除重复样式，改用工具类 -->
<view class="day-action-btn half glass-btn-primary">
```

**backup.vue**
```vue
<!-- 删除重复样式，改用工具类 -->
<view class="backup-orb glass-btn-primary">
```

**feedback.vue**
```vue
<!-- 删除重复样式，改用工具类 -->
<view class="card glass-card">
<button class="btn-primary glass-btn-primary">
```

**ExportTab.vue / ImportTab.vue**
```vue
<!-- 删除重复样式，改用工具类 -->
<button class="export-btn glass-btn">
<button class="import-btn glass-btn">
```

---

### 第四阶段：验证与测试（预计 2 小时）

#### 3.5 测试清单

- [ ] 浅色模式下所有组件显示正常
- [ ] 深色模式下所有组件显示正常
- [ ] 液态玻璃开关功能正常
- [ ] 所有按钮点击效果正常（scale 0.96）
- [ ] 弹窗动画正常（popInGlass）
- [ ] Tab Bar 悬浮效果正常
- [ ] 搜索框聚焦效果正常

---

## 4. 时间估算

| 阶段 | 工作内容 | 预计时间 |
|------|---------|---------|
| 第一阶段 | 提取工具类定义 | 2 小时 |
| 第二阶段 | 重构 liquid-glass.css | 3 小时 |
| 第三阶段 | 重构各 .vue 文件 | 4 小时 |
| 第四阶段 | 验证与测试 | 2 小时 |
| **总计** | | **11 小时** |

---

## 5. 风险与注意事项

### 5.1 潜在风险
1. **CSS 特异性问题** - 工具类可能被其他样式覆盖，需要使用 `!important`
2. **组件库冲突** - uni-app 内置组件可能有自己的样式
3. **深色/浅色模式切换** - 需要确保工具类正确响应模式变化

### 5.2 注意事项
1. 保持渐进式重构，不要一次性改完
2. 每完成一个阶段就进行测试
3. 保留 git 提交历史，方便回滚

---

## 6. 回滚方案

如果重构后出现问题，可以使用以下命令回滚：

```bash
# 回滚到重构前的提交
git revert 6d1271d

# 或者回滚到特定提交
git reset --hard <commit-hash>
```

---

## 7. 验收标准

- [ ] `liquid-glass.css` 行数减少到 600 行以下
- [ ] 各 `.vue` 文件中的液态玻璃重复样式全部删除
- [ ] 所有页面在浅色/深色/液态玻璃模式下显示正常
- [ ] 无 CSS 报错或警告

---

## 附录 A：工具类使用示例

### A.1 按钮

```vue
<!-- 基础玻璃按钮 -->
<button class="my-btn glass-btn">取消</button>

<!-- 蓝色主按钮 -->
<button class="my-btn glass-btn-primary">确认</button>

<!-- 胶囊按钮 -->
<button class="my-btn glass-capsule">标签</button>
```

### A.2 卡片

```vue
<!-- 玻璃卡片 -->
<view class="my-card glass-card">
  <text class="title glass-text">标题</text>
  <text class="desc glass-placeholder">描述</text>
</view>
```

### A.3 输入框

```vue
<!-- 玻璃输入框 -->
<input class="my-input glass-input" placeholder="请输入" />
```

### A.4 选中态

```vue
<!-- 可选中的胶囊按钮 -->
<view
  class="tag glass-capsule"
  :class="{ 'glass-selected': isActive }"
  @click="toggle"
>
  标签
</view>
```

---

**文档版本**: 1.0  
**创建日期**: 2026-09-08  
**作者**: AI Assistant
