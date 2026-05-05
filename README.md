# FitNote 健身记录小程序

<p align="center">
  <img src="https://img.shields.io/badge/uni-app-v3-4K高清?style=flat-square" alt="uni-app">
  <img src="https://img.shields.io/badge/Vue-3.x-green?style=flat-square" alt="Vue">
  <img src="https://img.shields.io/badge/Pinia-v3-orange?style=flat-square" alt="Pinia">
</p>

FitNote 是一款专为健身爱好者设计的训练记录小程序，帮助你科学规划训练、追踪进步，让每一次挥汗都有迹可循。

## 功能模块

### 1. 智能训练日历
- 月历形式直观展示训练计划，左右滑动切换月份
- 颜色区分不同训练部位，一眼看清整月训练安排
- 点击日期进入训练记录，长按标记休息日

### 2. 训练记录与执行
- 快速从动作库选择训练动作
- 组数记录：重量(kg) + 次数，支持逐组录入
- **上次对比**：完成一组后自动显示与上次同动作的重量对比
- 内置组间休息倒计时（默认3分钟）
- 点击动作查看历史训练记录

### 3. 动作库管理
- 自定义添加/编辑/删除训练动作
- 按部位分类管理动作
- 查看动作使用频率和历史

### 4. 模板系统
- 创建训练模板（胸部日、背肌日等）
- 为模板设置颜色标识
- 快速将模板应用到指定日期

### 5. 训练统计
- **部位状态监测**：智能算法分析近期各部位刺激强度
- **BodyPartGrid**：部位肌肉群网格展示
- **BodyPartManager**：拖拽编辑部位卡片
- **BodyPartTrend**：部位训练趋势分析
- 周/月训练量统计和对比

### 6. 数据备份
- 一键导出训练数据为 JSON 文件
- 支持数据导入，恢复训练记录

## 技术栈

| 技术 | 用途 |
|------|------|
| [uni-app](https://uniapp.dcloud.io/) | 跨平台小程序框架 |
| [Vue 3](https://vuejs.org/) | 前端框架 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vant WeApp](https://vant-contrib.gitee.io/vant-weapp) | UI 组件库 |
| [uView UI](https://www.uviewui.com/) | UI 组件库 |
| [SortableJS](https://sortablejs.github.io/Sortable/) | 拖拽排序 |

## 页面结构

```
pages/
├── index/              # 首页日历
│   ├── index.vue       # 月历视图
│   └── day.vue         # 日训练详情
├── actionHistory/      # 动作历史
├── actionLibrary/      # 动作库管理
├── templateDetail/     # 模板详情编辑
├── templateManager/    # 模板管理
├── trainingStat/       # 训练统计
│   └── components/     # 统计组件
│       ├── BodyPartGrid.vue
│       ├── BodyPartManager.vue
│       ├── BodyPartSelector.vue
│       ├── BodyPartTrend.vue
│       ├── DatePicker.vue
│       └── TrainingOverview.vue
├── year/               # 年度总览
└── backup/             # 数据备份
```

## 状态管理

```
stores/
├── action.js          # 动作库状态
├── dayData.js         # 日训练数据
├── dayDataCache.js    # 数据缓存
├── initActions.js     # 初始动作数据
└── template.js        # 训练模板
```

## 快速开始

```bash
# 克隆项目
git clone https://github.com/shiyaoyiya/FitNote.git

# 安装依赖
npm install

# 使用 HBuilderX 打开项目
# 运行到微信小程序开发者工具
```

## 开发指南

### 添加新页面
1. 在 `pages/` 目录下创建页面
2. 在 `pages.json` 的 `pages` 数组中添加路径配置
3. 如需状态管理，在 `stores/` 目录下创建 store

### 代码规范
- 使用 Vue 3 Composition API
- 遵循 uni-app 开发规范
- 组件命名使用 PascalCase

## 数据存储

所有数据存储在本地，无需后端服务：
- 训练数据、动作库、模板等通过 Pinia + localStorage 持久化
- 支持导出/导入 JSON 进行备份

## License

MIT License
