# TemplateManager UI 完全重构设计文档

## 概述

对 `pages/templateManager/templateManager.vue` 进行完全重构，将2852行的单文件组件拆分成多个可维护的组件，改进交互体验，统一视觉风格。

## 目标

1. **组件拆分**：将大文件拆分成多个小组件，提高可维护性
2. **交互改进**：优化拖拽、侧滑、弹窗等交互方式
3. **视觉统一**：统一所有弹窗和卡片的视觉风格

## 当前问题分析

### 代码结构问题
- 单文件2852行，难以维护
- 多个弹窗逻辑混杂在一起
- 拖拽、侧滑等交互逻辑与UI混杂

### 交互问题
- 拖拽反馈不够直观
- 侧滑删除动画不够流畅
- 弹窗样式不统一

### 视觉问题
- 卡片样式不一致
- 按钮样式多样
- 弹窗风格各异

## 新组件架构

### 文件结构
```
pages/templateManager/
├── templateManager.vue          # 主页面（容器）
├── components/
│   ├── TemplateList.vue         # 模板列表（拖拽排序）
│   ├── TemplateCard.vue         # 单个模板卡片（侧滑删除）
│   ├── TemplateSquare.vue       # 模板广场（搜索、筛选、网格）
│   ├── TemplateCreate.vue       # 新建模板弹窗
│   ├── TemplateImportExport.vue # 导入导出弹窗
│   ├── TemplateShare.vue        # 分享弹窗
│   └── TemplateDetail.vue       # 广场模板详情弹窗
```

### 组件职责

#### 1. templateManager.vue（主页面）
**职责**：
- 页面容器，管理整体布局
- Tab切换（我的模板/模板广场）
- 状态管理（loading、activeTab等）
- 全局事件处理

**代码预估**：~200行

#### 2. TemplateList.vue（模板列表）
**职责**：
- 渲染模板列表
- 实现拖拽排序功能
- 管理拖拽状态

**代码预估**：~150行

#### 3. TemplateCard.vue（模板卡片）
**职责**：
- 渲染单个模板卡片
- 实现侧滑删除功能
- 处理点击事件

**代码预估**：~100行

#### 4. TemplateSquare.vue（模板广场）
**职责**：
- 搜索和筛选功能
- 标签chips
- 网格卡片展示
- 排序功能

**代码预估**：~200行

#### 5. TemplateCreate.vue（新建模板弹窗）
**职责**：
- 模板名称输入
- 动作搜索和选择
- 颜色选择
- 创建确认

**代码预估**：~150行

#### 6. TemplateImportExport.vue（导入导出弹窗）
**职责**：
- 导出模板选择
- 导入文本解析
- 冲突处理

**代码预估**：~200行

#### 7. TemplateShare.vue（分享弹窗）
**职责**：
- 选择要分享的模板
- 填写分享信息
- 生成分享码

**代码预估**：~100行

#### 8. TemplateDetail.vue（广场详情弹窗）
**职责**：
- 展示模板详情
- 动作列表
- 导入/分享按钮

**代码预估**：~150行

## 交互改进

### 1. 拖拽排序
- **触发方式**：长按500ms触发
- **视觉反馈**：
  - 被拖拽卡片缩放1.05倍
  - 添加深色阴影
  - 其他卡片平滑移动
- **动画效果**：
  - 使用CSS transform实现平滑移动
  - 添加0.2s过渡动画

### 2. 侧滑删除
- **触发方式**：手指水平滑动
- **视觉反馈**：
  - 卡片跟随手指移动
  - 显示删除按钮
- **动画效果**：
  - 使用CSS transform实现侧滑
  - 添加0.2s过渡动画
  - 支持弹性回弹

### 3. 弹窗系统
- **弹出方式**：底部弹出
- **动画效果**：
  - 从底部滑入，0.28s
  - 使用cubic-bezier(0.22, 0.61, 0.36, 1)缓动函数
- **背景处理**：
  - 半透明黑色背景
  - 点击背景关闭弹窗

## 视觉风格统一

### 1. 卡片设计
```css
.action-card {
  background: var(--bg-secondary);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  overflow: hidden;
}

.card-color-bar {
  width: 12rpx;
  flex-shrink: 0;
  align-self: stretch;
}
```

### 2. 按钮设计
```css
/* 主按钮 */
.btn-primary {
  background: var(--primary);
  border-radius: 44rpx;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(55, 155, 255, 0.3);
}

/* 次按钮 */
.btn-secondary {
  background: var(--bg-tertiary);
  border-radius: 44rpx;
  color: var(--text-primary);
}
```

### 3. 弹窗设计
```css
.popup-panel {
  background: var(--bg-secondary);
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.25);
  max-height: 86vh;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--border-color);
}
```

### 4. 颜色系统
- 主色调：`var(--primary)` (#379bff)
- 危险色：`var(--danger)` (#ff5a5d)
- 成功色：`var(--success)` (#10b981)
- 背景色：
  - 主背景：`var(--bg-primary)`
  - 次背景：`var(--bg-secondary)`
  - 三级背景：`var(--bg-tertiary)`
- 文本色：
  - 主文本：`var(--text-primary)`
  - 次文本：`var(--text-secondary)`
  - 占位符：`var(--text-muted)`

## 实现步骤

### 阶段1：组件拆分
1. 创建components目录
2. 提取TemplateCard组件
3. 提取TemplateList组件
4. 提取TemplateCreate组件
5. 提取TemplateImportExport组件
6. 提取TemplateShare组件
7. 提取TemplateDetail组件
8. 提取TemplateSquare组件
9. 重构templateManager主页面

### 阶段2：交互优化
1. 优化拖拽排序逻辑
2. 优化侧滑删除逻辑
3. 优化弹窗动画
4. 添加交互反馈

### 阶段3：视觉统一
1. 统一卡片样式
2. 统一按钮样式
3. 统一弹窗样式
4. 统一颜色系统
5. 优化响应式布局

## 测试计划

### 功能测试
- [ ] 模板列表显示正常
- [ ] 拖拽排序功能正常
- [ ] 侧滑删除功能正常
- [ ] 新建模板功能正常
- [ ] 导入导出功能正常
- [ ] 分享功能正常
- [ ] 广场模板详情正常

### 交互测试
- [ ] 拖拽反馈流畅
- [ ] 侧滑动画流畅
- [ ] 弹窗动画流畅
- [ ] 触摸响应正常

### 视觉测试
- [ ] 卡片样式统一
- [ ] 按钮样式统一
- [ ] 弹窗样式统一
- [ ] 颜色系统正确
- [ ] 响应式布局正常

## 风险评估

### 技术风险
- **拖拽排序**：使用movable-view组件，需要确保兼容性
- **侧滑删除**：使用CSS transform，需要确保动画流畅
- **弹窗动画**：使用CSS动画，需要确保性能

### 业务风险
- **功能回归**：需要确保所有现有功能正常
- **用户体验**：需要确保新交互方式用户接受

### 缓解措施
- 分阶段实现，每阶段进行测试
- 保留原有功能，逐步替换
- 充分测试，确保兼容性

## 成功标准

1. **代码质量**：组件拆分合理，代码可维护性提高
2. **交互体验**：拖拽、侧滑、弹窗交互流畅
3. **视觉效果**：样式统一，符合设计规范
4. **功能完整**：所有现有功能正常
5. **性能表现**：无卡顿，动画流畅

## 后续维护

1. **文档更新**：更新组件使用文档
2. **代码审查**：定期进行代码审查
3. **性能监控**：监控页面性能
4. **用户反馈**：收集用户反馈，持续优化