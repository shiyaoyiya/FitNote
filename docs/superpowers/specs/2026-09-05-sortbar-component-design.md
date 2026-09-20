# SortBar排序栏组件设计文档

## 概述
SortBar是一个排序选项栏组件，允许用户在模板广场页面选择不同的排序方式（最新、热门、下载）。

## 设计目标
1. 提供清晰的排序选项切换
2. 与现有组件风格保持一致
3. 与Pinia store集成，实现状态管理

## 组件设计

### 接口
- **Props**: 无
- **Events**: 无（通过store直接管理状态）
- **Slots**: 无

### 状态管理
- 使用`useTemplateSquareStore`获取当前排序状态
- 点击排序选项时调用`store.setSort(key)`方法

### 排序选项
- `latest`: 最新
- `popular`: 热门  
- `downloads`: 下载

### UI设计
- 水平排列的排序选项
- 选中状态使用主题色背景和白色文字
- 未选中状态使用次级背景色和次级文字色
- 圆角药丸形状设计

## 样式规范
- 使用CSS变量：`--primary`, `--bg-tertiary`, `--text-secondary`
- 间距：8px gap
- 圆角：999px（药丸形状）
- 字体大小：24rpx
- 内边距：8rpx 20rpx

## 实现文件
- 创建文件：`pages/templateSquare/components/SortBar.vue`

## 测试计划
1. 组件渲染测试
2. 排序选项点击测试
3. 状态同步测试
4. 样式显示测试

## 依赖
- Vue3 Composition API
- Pinia store: `useTemplateSquareStore`
- CSS变量系统

## 兼容性
- uni-app跨平台兼容
- 响应式设计