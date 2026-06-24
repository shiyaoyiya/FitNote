# FitNote 健身记录小程序

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.9-blue?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/uni--app-v3-4fc08d?style=flat-square" alt="uni-app">
  <img src="https://img.shields.io/badge/Vue-3.x-4fc08d?style=flat-square" alt="Vue">
  <img src="https://img.shields.io/badge/Pinia-v3-f7d336?style=flat-square" alt="Pinia">
  <img src="https://img.shields.io/badge/WeChat-小程序-07c160?style=flat-square" alt="微信小程序">
</p>

FitNote 是一款专为健身爱好者打造的训练记录小程序，帮助你科学规划训练、追踪进步，让每一次挥汗都有迹可循。

## 功能特性

### 智能训练日历
- 月历形式直观展示训练计划，左右滑动切换月份
- 颜色区分不同训练部位，一眼看清整月训练安排
- 点击日期进入训练记录，长按标记休息日
- 支持年度总览，快速跳转任意月份

### 训练记录与执行
- 快速从动作库或模板选择训练动作
- 组数记录：重量(kg) + 次数，支持逐组录入
- **上次对比**：完成一组后自动显示与上次同动作的重量对比
- 内置组间休息倒计时（支持自定义时长）
- 点击动作查看历史训练记录
- 支持动作卡片拖拽排序

### 动作库管理
- 自定义添加/编辑/删除训练动作
- 按部位分类管理动作（胸、背、肩、手臂、腿、核心、有氧等）
- 查看动作使用频率和历史记录
- 内置丰富的预设动作库

### 训练模板系统
- 创建训练模板（胸部日、背肌日、腿部日等）
- 为模板设置颜色标识，日历中一目了然
- 快速将模板应用到指定日期
- 支持分化训练计划设置
- 分化计划模板名称自动同步

### 训练统计分析
- **部位状态监测**：智能算法分析近期各部位刺激强度
- **BodyPartGrid**：部位肌肉群网格可视化展示
- **BodyPartManager**：拖拽编辑部位卡片排序
- **BodyPartTrend**：部位训练趋势分析图表
- 周/月训练量统计和对比
- 容量历史追踪

### 数据备份与恢复
- **按日期范围导出**：选择起止日期，精确导出指定时段数据
- **多格式支持**：JSON 格式完整备份，CSV 格式便于表格分析
- **智能导入**：粘贴文本自动解析，模糊匹配动作名称
- **数据合并**：导入时自动识别重复记录，支持覆盖或跳过策略
- **实时预览**：导入前预览解析结果，确认后一键合并
- **云备份功能**：基于微信云开发的数据云端备份

### 个性化设置
- 深色/浅色主题切换
- 纪念日功能：记录重要日期，首页展示已过去天数
- 首次启动引导说明

## 技术栈

| 技术 | 用途 |
|------|------|
| [uni-app](https://uniapp.dcloud.io/) | 跨平台小程序框架 |
| [Vue 3](https://vuejs.org/) | 前端框架（Composition API） |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vant WeApp](https://vant-contrib.gitee.io/vant-weapp) | UI 组件库 |
| [uView UI](https://www.uviewui.com/) | UI 组件库 |
| [SortableJS](https://sortablejs.github.io/Sortable/) | 拖拽排序 |
| [Vue Draggable](https://github.com/SortableJS/Vue.Draggable) | Vue 拖拽组件 |
| [微信云开发](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html) | 云端数据备份 |

## 项目结构

```
FitNote/
├── App.vue                 # 应用入口
├── main.js                 # 主入口文件
├── manifest.json           # 应用配置
├── pages.json              # 页面路由配置
├── pages/                  # 页面目录
│   ├── index/              # 首页日历
│   │   ├── index.vue       # 月历视图
│   │   └── day.vue         # 日训练详情
│   ├── actionHistory/      # 动作历史
│   ├── actionLibrary/      # 动作库管理
│   ├── manageActions/      # 管理动作
│   ├── templateDetail/     # 模板详情编辑
│   ├── templateManager/    # 模板管理
│   ├── trainingStat/       # 训练统计
│   │   └── components/     # 统计组件
│   ├── year/               # 年度总览
│   └── backup/             # 数据备份
├── components/             # 公共组件
│   ├── ActionCard.vue      # 动作卡片
│   ├── CalendarMonth.vue   # 月历组件
│   ├── DateRangePicker.vue # 日期范围选择器
│   ├── DaySettings.vue     # 日期设置
│   ├── ExportTab.vue       # 数据导出面板
│   ├── ImportTab.vue       # 数据导入面板
│   ├── ImportDataModal.vue # 导入数据弹窗
│   ├── ProgressChart.vue   # 进度图表
│   ├── TemplateSelector.vue # 模板选择器
│   ├── TimerModal.vue      # 计时器弹窗
│   └── TrainingSplitPlan.vue # 分化计划
├── stores/                 # Pinia 状态管理
│   ├── action.js           # 动作库状态
│   ├── dayData.js          # 日训练数据
│   ├── dayDataCache.js     # 数据缓存
│   ├── daySettings.js      # 日期设置
│   ├── initActions.js      # 初始动作数据
│   └── template.js         # 训练模板
├── utils/                  # 工具函数
│   ├── backup.js           # 备份功能
│   ├── canvasHelper.js     # Canvas 辅助
│   ├── cloudBackup.js      # 云备份
│   ├── cloudConfig.js      # 云开发配置
│   ├── color.js            # 颜色处理
│   ├── dataMerger.js       # 数据合并（智能去重）
│   ├── dayHelper.js        # 日期辅助
│   ├── exportImport.js     # 导出导入核心逻辑
│   ├── importParser.js     # 导入文本解析（模糊匹配）
│   ├── presetTemplates.js  # 预设模板
│   ├── theme.js            # 主题管理
│   └── trainingAnalyzer.js # 训练分析
├── cloudfunctions/         # 微信云函数
│   └── getOpenId/          # 获取用户 OpenID
├── static/                 # 静态资源
├── tests/                  # 测试文件
│   └── importIntegration.test.js # 导入功能集成测试
└── docs/                   # 项目文档
```

## 快速开始

### 环境要求
- [HBuilderX](https://www.dcloud.io/hbuilderx.html) 3.0+
- 微信开发者工具
- Node.js 14+

### 安装运行

```bash
# 克隆项目
git clone https://github.com/shiyaoyiya/FitNote.git

# 进入项目目录
cd FitNote

# 安装依赖
npm install

# 使用 HBuilderX 打开项目
# 运行到微信小程序开发者工具
```

### 微信小程序配置
1. 在 `manifest.json` 中配置你的小程序 AppID
2. 如需使用云备份功能，配置云开发环境 ID
3. 在微信开发者工具中开启"不校验合法域名"

## 开发指南

### 添加新页面
1. 在 `pages/` 目录下创建页面文件夹
2. 在 `pages.json` 的 `pages` 数组中添加页面路径
3. 如需状态管理，在 `stores/` 目录下创建对应的 store

### 代码规范
- 使用 Vue 3 Composition API
- 组件命名使用 PascalCase
- 遵循 uni-app 跨平台开发规范
- 使用 Pinia 进行状态管理

## 数据存储

- **本地存储**：训练数据、动作库、模板等通过 Pinia + localStorage 持久化
- **云存储**：支持微信云开发进行云端数据备份
- **文件导出**：支持导出 JSON/CSV 格式进行本地备份

## 版本历史

### v2.0.9 (当前版本)
- 新增数据导出面板，支持按日期范围导出
- 新增数据导入面板，支持智能文本解析
- 新增 DateRangePicker 日期范围选择组件
- 优化数据合并算法，支持模糊匹配动作名称
- 修复导入数据编码问题
- 修复分化计划模板同步逻辑

### v2.0.0
- 新增导入/导出功能设计文档
- 实现数据导入弹窗组件
- 实现智能数据合并器
- 实现导入文本解析器

### v1.9.0
- 新增训练统计页面
- 新增部位管理功能
- 优化动作库交互

### v1.8.0
- 新增年度总览
- 新增纪念日功能
- 优化日历滑动体验

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

[MIT](LICENSE) License

## 联系方式

如有问题或建议，欢迎通过以下方式联系：
- GitHub Issues: [提交问题](https://github.com/shiyaoyiya/FitNote/issues)

---

<p align="center">Made with 💪 for fitness enthusiasts</p>
