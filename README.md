# FitNote 健身记录小程序

<p align="center">
  <img src="https://img.shields.io/badge/version-2.2.0-blue?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/uni--app-v3-4fc08d?style=flat-square" alt="uni-app">
  <img src="https://img.shields.io/badge/Vue-3.x-4fc08d?style=flat-square" alt="Vue">
  <img src="https://img.shields.io/badge/Pinia-v3-f7d336?style=flat-square" alt="Pinia">
  <img src="https://img.shields.io/badge/WeChat-小程序-07c160?style=flat-square" alt="微信小程序">
  <img src="https://img.shields.io/badge/Spring_Boot-3.x-6db33f?style=flat-square" alt="Spring Boot">
  <img src="https://img.shields.io/badge/Element_Plus-2.x-409eff?style=flat-square" alt="Element Plus">
</p>

FitNote 是一款专为健身爱好者打造的训练记录小程序，帮助你科学规划训练、追踪进步，让每一次挥汗都有迹可循。

项目采用三端架构：**微信小程序（用户端）** + **Spring Boot 后端服务** + **Vue 3 管理后台**，提供完整的健身训练记录与社区分享解决方案。

## 架构概览

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│   小程序 (用户端)  │◄──►│  Spring Boot 后端服务  │◄──►│  Vue 3 管理后台 (Admin) │
│  uni-app + Vue 3 │     │  REST API + JWT 认证  │     │  Element Plus + ECharts│
│  Pinia + 本地存储  │     │  MySQL + MyBatis-Plus │     │  液态玻璃深色主题       │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
```

## 功能特性

### 小程序端（用户端）

#### 智能训练日历
- 月历形式直观展示训练计划，左右滑动切换月份
- 颜色区分不同训练部位，一眼看清整月训练安排
- 点击日期进入训练记录，长按标记休息日
- 支持年度总览，快速跳转任意月份

#### 训练记录与执行
- 快速从动作库或模板选择训练动作
- 组数记录：重量(kg) + 次数，支持逐组录入
- **上次对比**：完成一组后自动显示与上次同动作的重量对比
- 内置组间休息倒计时（支持自定义时长）
- 点击动作查看历史训练记录
- 支持动作卡片拖拽排序

#### 动作库管理
- 自定义添加/编辑/删除训练动作
- 按部位分类管理动作（胸、背、肩、手臂、腿、核心、有氧等）
- 查看动作使用频率和历史记录
- 内置丰富的预设动作库

#### 训练模板系统
- 创建训练模板（胸部日、背肌日、腿部日等）
- 为模板设置颜色标识，日历中一目了然
- 快速将模板应用到指定日期
- 支持分化训练计划设置
- 分化计划模板名称自动同步

#### 训练统计分析
- **部位状态监测**：智能算法分析近期各部位刺激强度
- **BodyPartGrid**：部位肌肉群网格可视化展示
- **BodyPartManager**：拖拽编辑部位卡片排序
- **BodyPartTrend**：部位训练趋势分析图表
- 周/月训练量统计和对比
- 容量历史追踪

#### 模板广场（社区分享）
- 用户分享训练模板到模板广场
- 浏览/收藏其他用户分享的模板
- 按部位标签筛选模板
- 最新/热门排序
- 模板导入与一键应用

#### 数据备份与恢复
- **按日期范围导出**：选择起止日期，精确导出指定时段数据
- **多格式支持**：JSON 格式完整备份，CSV 格式便于表格分析
- **智能导入**：粘贴文本自动解析，模糊匹配动作名称
- **数据合并**：导入时自动识别重复记录，支持覆盖或跳过策略
- **实时预览**：导入前预览解析结果，确认后一键合并
- **云端备份**：训练数据云端备份与恢复，支持跨设备同步

#### 用户系统
- 微信一键登录 / 账号注册登录
- 个人资料管理
- 训练统计数据云端同步
- 收藏模板管理

#### 其他功能
- 公告通知系统
- 用户反馈与建议提交
- 深色/浅色/液态玻璃主题切换
- 纪念日功能：记录重要日期，首页展示已过去天数
- 首次启动引导说明

### 管理后台（Admin Web）

#### 仪表盘
- 用户增长趋势图表
- 模板分享与审核统计
- 反馈处理率
- 备份活跃度

#### 用户管理
- 用户列表与详情查看
- 训练统计分析
- 账号启用/禁用

#### 管理员管理
- 管理员账号增删改
- 角色权限分配（菜单级权限控制）

#### 模板审核
- 用户分享模板审核（通过/驳回）
- 官方模板上下架管理
- 模板标签管理

#### 公告管理
- 发布/编辑/删除公告
- 公告推送通知

#### 反馈管理
- 用户反馈列表与处理
- 反馈状态跟踪

#### 备份管理
- 用户备份记录查看
- 备份数据预览

### 后端服务

#### 技术架构
- Spring Boot 3.x + Spring Security + JWT
- MyBatis-Plus + MySQL
- RESTful API 设计

#### 功能模块
| 模块 | 说明 |
|------|------|
| Auth | 用户注册/登录（账号+微信）、JWT 令牌管理 |
| User | 用户资料、训练统计、收藏模板 |
| Template | 模板分享、模板广场、审核管理 |
| Backup | 云端备份与恢复、备份记录管理 |
| Feedback | 用户反馈提交与处理 |
| Announcement | 公告管理与推送 |
| Notification | 站内通知系统 |
| Dashboard | 管理后台数据统计 |
| Admin | 管理员管理与角色权限 |

## 技术栈

### 小程序端
| 技术 | 用途 |
|------|------|
| [uni-app](https://uniapp.dcloud.io/) | 跨平台小程序框架 |
| [Vue 3](https://vuejs.org/) | 前端框架（Composition API） |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vant WeApp](https://vant-contrib.gitee.io/vant-weapp) | UI 组件库 |
| [uView UI](https://www.uviewui.com/) | UI 组件库 |
| [SortableJS](https://sortablejs.github.io/Sortable/) | 拖拽排序 |
| [微信云开发](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html) | 云端数据备份 |

### 后端服务
| 技术 | 用途 |
|------|------|
| [Spring Boot 3.x](https://spring.io/projects/spring-boot) | 后端框架 |
| [Spring Security](https://spring.io/projects/spring-security) | 认证与授权 |
| [MyBatis-Plus](https://baomidou.com/) | ORM 框架 |
| [MySQL](https://www.mysql.com/) | 关系型数据库 |
| [JWT](https://jwt.io/) | 令牌认证 |

### 管理后台
| 技术 | 用途 |
|------|------|
| [Vue 3](https://vuejs.org/) | 前端框架 |
| [Element Plus](https://element-plus.org/) | UI 组件库 |
| [ECharts](https://echarts.apache.org/) | 数据可视化 |
| [Vue Router](https://router.vuejs.org/) | 路由管理 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |

## 项目结构

```
FitNote/
├── pages/                      # 小程序主包页面
│   ├── index/                  # 首页日历 + 训练日详情
│   ├── manageActions/          # 管理动作
│   └── templateDetail/         # 模板详情编辑
├── subpkg-training/            # 训练相关分包
│   ├── trainingAnalysis/       # 训练分析
│   ├── actionHistory/          # 动作历史
│   ├── actionLibrary/          # 动作库管理
│   ├── trainingStat/           # 训练统计
│   ├── year/                   # 年度总览
│   ├── backup/                 # 数据备份
│   ├── profile/                # 个人中心
│   ├── announce/               # 公告
│   ├── feedback/               # 用户反馈
│   └── notification/           # 消息通知
├── subpkg-template/            # 模板相关分包
│   ├── templateManager/        # 模板管理
│   └── templateSquare/         # 模板广场
├── subpkg-secondary/           # 次要功能分包
├── components/                 # 公共组件
├── composables/                # 组合式函数
├── mixins/                     # 混入
├── stores/                     # Pinia 状态管理
├── utils/                      # 工具函数
├── cloudfunctions/             # 微信云函数
├── static/                     # 静态资源
├── tests/                      # 测试文件
│
├── server/                     # Spring Boot 后端服务
│   ├── src/main/java/com/fitnote/
│   │   ├── config/             # 配置类
│   │   ├── entity/             # 实体类
│   │   ├── mapper/             # MyBatis-Plus Mapper
│   │   ├── modules/            # 业务模块
│   │   │   ├── admin/          # 管理员管理
│   │   │   ├── announce/       # 公告管理
│   │   │   ├── auth/           # 认证授权
│   │   │   ├── backup/         # 备份管理
│   │   │   ├── dashboard/      # 仪表盘
│   │   │   ├── feedback/       # 反馈管理
│   │   │   ├── notification/   # 通知管理
│   │   │   ├── template/       # 模板管理
│   │   │   └── user/           # 用户管理
│   │   ├── security/           # 安全模块
│   │   └── support/            # 辅助工具
│   └── src/main/resources/
│       ├── application.yml     # 应用配置
│       └── db/                 # 数据库脚本
│
├── admin-web/                  # Vue 3 管理后台
│   ├── src/
│   │   ├── views/              # 页面视图
│   │   │   ├── dashboard/      # 仪表盘
│   │   │   ├── user/           # 用户管理
│   │   │   ├── admin/          # 管理员管理
│   │   │   ├── template/       # 模板审核
│   │   │   ├── backup/         # 备份管理
│   │   │   ├── feedback/       # 反馈管理
│   │   │   ├── announce/       # 公告管理
│   │   │   └── login/          # 登录页
│   │   ├── layouts/            # 布局组件
│   │   ├── styles/             # 全局样式
│   │   └── router/             # 路由配置
│   └── public/                 # 静态资源
│
├── docs/                       # 项目文档
├── scripts/                    # 脚本工具
├── manifest.json               # 小程序应用配置
├── pages.json                  # 页面路由配置
└── App.vue                     # 应用入口
```

## 快速开始

### 小程序端

#### 环境要求
- [HBuilderX](https://www.dcloud.io/hbuilderx.html) 3.0+
- 微信开发者工具
- Node.js 14+

#### 安装运行
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

#### 微信小程序配置
1. 在 `manifest.json` 中配置你的小程序 AppID
2. 如需使用云备份功能，配置云开发环境 ID
3. 在微信开发者工具中开启"不校验合法域名"

### 后端服务

#### 环境要求
- JDK 17+
- Maven 3.8+
- MySQL 8.0+

#### 安装运行
```bash
cd server

# 配置数据库连接
# 编辑 src/main/resources/application.yml

# 初始化数据库
mysql -u root -p < src/main/resources/db/schema.sql
mysql -u root -p < src/main/resources/db/data.sql

# 编译运行
mvn clean package -DskipTests
java -jar target/fitnote-server-1.0.0.jar
```

### 管理后台

#### 环境要求
- Node.js 16+
- npm 或 pnpm

#### 安装运行
```bash
cd admin-web

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build
```

## 开发指南

### 添加新页面（小程序）
1. 在 `pages/` 或对应分包目录下创建页面文件夹
2. 在 `pages.json` 的 `pages` 数组中添加页面路径
3. 如需状态管理，在 `stores/` 目录下创建对应的 store

### 代码规范
- 使用 Vue 3 Composition API
- 组件命名使用 PascalCase
- 遵循 uni-app 跨平台开发规范
- 使用 Pinia 进行状态管理
- 后端遵循 RESTful API 设计规范

## 数据存储

- **本地存储**：训练数据、动作库、模板等通过 Pinia + localStorage 持久化
- **云端存储**：MySQL 数据库，支持云端备份与跨设备同步
- **文件导出**：支持导出 JSON/CSV 格式进行本地备份

## 版本历史

### v2.2.0 (当前版本)
- 新增模板广场社区分享功能（分享/收藏/导入）
- 新增用户反馈与公告通知系统
- 新增 Spring Boot 后端服务（JWT 认证 + RESTful API）
- 新增 Vue 3 管理后台（仪表盘/用户/模板审核/备份/反馈/公告管理）
- 新增云端数据备份与恢复
- 新增液态玻璃主题
- 液态玻璃样式重构：新增 glass-card / glass-panel / glass-btn 工具类
- 优化 liquid-glass.css，减少 192 行重复代码
- .gitignore 优化，排除编译产物和运行时数据

### v2.1.0
- 新增数据导出面板，支持按日期范围导出
- 新增数据导入面板，支持智能文本解析
- 新增 DateRangePicker 日期范围选择组件
- 优化数据合并算法，支持模糊匹配动作名称
- 修复导入数据编码问题
- 修复分化计划模板同步逻辑

### v2.0.0
- 实现导入/导出功能设计
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
- Gitee 仓库: [Gitee 镜像](https://gitee.com/shiyaoyiya/fit-note)

---

<p align="center">Made with 💪 for fitness enthusiasts</p>
