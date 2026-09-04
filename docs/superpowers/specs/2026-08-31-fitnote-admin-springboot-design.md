# FitNote 毕设版 · 后台管理系统 + 独立账号体系 设计文档

> **版本**：1.0
> **创建日期**：2026-08-31
> **状态**：待用户评审
> **适用阶段**：毕设功能扩展（原 FitNote v2.1.2 基础上新增 Spring Boot 后端 + Vue3 管理后台 + 小程序端账号对接）

---

## 0. 需求与决策汇总

### 0.1 功能模块清单（7 个）

| 编号 | 模块 | 说明 |
|---|---|---|
| M1 | 📊 数据看板 Dashboard | 管理后台首页，聚合用户/训练/模板/反馈指标 |
| M2 | 👤 用户管理 | 小程序用户列表 + 详情 + 封禁/解封 |
| M3 | 💾 云端备份管理 | 用户云端备份全生命周期：上传/列表/下载/删除 + 管理端全局查看，**不限制用户备份数量** |
| M4 | 📚 模板分享广场（含审核） | 3 状态审核流（待审核/已通过/已驳回）+ 广场展示 + 浏览/收藏/下载计数 |
| M5 | 📢 公告 / 系统消息推送 | 草稿/已发布/已撤回 + 置顶 + 小程序首页 Banner |
| M6 | 📮 反馈 / Issue 管理 | 用户 4 类反馈 + 单向工作流（待处理/处理中/已解决/已拒绝）+ 处理回复 |
| M7 | 🔑 管理员账号/RBAC + 📦 预设模板包管理 | 2 角色（超级管理员 ADMIN + 审核员 AUDITOR）+ 菜单级 RBAC + 线上官方预设模板包 |

### 0.2 关键技术决策（用户已确认）

| 决策项 | 结果 |
|---|---|
| 后端框架 | Spring Boot 2.7.x + MyBatis-Plus 3.5.x（单体） |
| 数据库 | MySQL 8.0 |
| 后台前端 | Vue 3 + Vite + Element Plus + Pinia + ECharts |
| 目录结构 | FitNote 根目录下 `server/`（后端） + `admin-web/`（管理后台），与小程序代码同级 |
| 管理员 RBAC | 2 角色：ADMIN（全权限） + AUDITOR（仅模板审核 / 反馈处理） |
| 小程序用户体系 | **纯账号密码**，完全不绑定微信 openid |
| 模板审核工作流 | 3 状态：待审核(0) / 已通过(1) / 已驳回(2) + 驳回原因 + 重新提交 |
| 云端备份数量 | **不限数量**（每用户可任意份） |
| 备份页 UI 结构 | 顶部 3 按钮并排：【📂 本地备份】 / 【📤 导出导入】 / 【☁️ 云端备份】 |
| 首页入口调整 | 原「更多菜单」入口改为「我的」，所有原 MoreMenu 功能迁入「我的」页面 |
| 架构方案 | 方案一：单体 Spring Boot + 2 套独立前端（小程序 + 管理后台），所有线上数据统一存入 MySQL |

---

## 1. 整体架构 + 目录结构 + 技术栈清单

### 1.1 三端总体架构

```
                         ┌─────────────────────────────────┐
                         │        Spring Boot 单体后端       │
                         │          IP:8080 /api/*          │
                         │                                 │
┌───────────────┐ HTTPS  │  ┌───────────────────────────┐  │  HTTPS  ┌───────────────┐
│               │ JWT    │  │   Filter: JwtAuthFilter   │  │  JWT     │               │
│  FitNote      ├───────►│  └────────────┬──────────────┘  │◄────────┤  admin-web    │
│  小程序端     │        │               │                 │         │  管理后台     │
│  (uni-app)    │        │     ┌─────────▼─────────┐       │         │  (Vue3+Elem+) │
│               │        │     │  Controller 层     │       │         │               │
│  • 登录/注册  │        │     │  (7 模块 REST API) │       │         │  • 管理员登录 │
│  • 训练记录   │        │     └─────────┬─────────┘       │         │  • RBAC菜单   │
│  • 模板上传   │        │               │                 │         │  • 7功能模块  │
│  • 备份/下载  │        │     ┌─────────▼─────────┐       │         │  • 数据看板   │
│  • 模板广场   │        │     │   Service 层      │       │         │               │
│  • 公告展示   │        │     │  (纯业务逻辑)     │       │         └───────────────┘
│  • 反馈提交   │        │     └─────────┬─────────┘       │
└───────────────┘        │               │                 │
                         │     ┌─────────▼─────────┐       │
                         │     │   MyBatis-Plus     │       │
                         │     │   Mapper / Base    │       │
                         │     └─────────┬─────────┘       │
                         │               │                 │
                         │     ┌─────────▼──────────┐      │
                         │     │  MySQL 8.0 (fitnote)│      │
                         │     │  12 张业务表       │      │
                         │     └────────────────────┘      │
                         │                                 │
                         │  附加：本地文件存储（备份JSON）   │
                         └─────────────────────────────────┘
```

### 1.2 项目目录结构

```
FitNote/
├── App.vue, pages.json, manifest.json, main.js, uni.scss ...  (现有小程序代码，根目录保留)
├── pages/, components/, stores/, utils/, tests/, static/       (现有小程序目录，不动)
│
├── server/                                              ← 【新增】Spring Boot 后端
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/fitnote/
│       │   ├── FitNoteApplication.java
│       │   ├── common/                     ← 通用：Result<T>、BusinessException、全局异常处理器、常量、JwtUtils
│       │   ├── config/                     ← SecurityConfig、MyBatisPlusConfig、WebMvcConfig(CORS)、FileUploadConfig
│       │   ├── security/                   ← JwtAuthFilter、UserDetailsServiceImpl(双轨)、PermissionEvaluator(hasPerm)
│       │   ├── modules/
│       │   │   ├── auth/                   ← 认证：小程序端注册/登录、管理员登录、登出、刷新Token
│       │   │   ├── dashboard/              ← 模块1 数据看板聚合接口
│       │   │   ├── user/                   ← 模块2 用户管理（管理端） + 我的资料（小程序端）
│       │   │   ├── backup/                 ← 模块3 云端备份：文件存储 + 元数据 CRUD
│       │   │   ├── template/               ← 模块4 模板广场：分享/审核/广场/收藏/下载
│       │   │   ├── announce/               ← 模块5 公告：发布/撤回/置顶
│       │   │   ├── feedback/               ← 模块6 反馈：提交/列表/处理
│       │   │   ├── preset/                 ← 模块7a 预设模板包：管理 + 公开列表
│       │   │   └── admin/                  ← 模块7b 管理员账号/RBAC + 菜单树/角色菜单绑定
│       │   └── entity/                     ← 12 个 MyBatis-Plus 实体（对应 12 张表）
│       ├── resources/
│       │   ├── application.yml
│       │   ├── mapper/                     ← 自定义 SQL XML（复杂查询）
│       │   └── db/
│       │       ├── schema.sql              ← 建 12 张表（首次启动 auto init）
│       │       └── data.sql                ← 初始数据：管理员/菜单树/角色菜单/模板标签/预设模板包
│       └── test/java/com/fitnote/tool/
│           └── TestDataGenerator.java      ← 测试数据脚本（50 用户 + 20 模板 + 30 反馈 + 15 公告 + 120 备份）
│
└── admin-web/                                       ← 【新增】Vue3 管理后台
    ├── package.json
    ├── vite.config.js                               ← /api 代理到 http://localhost:8080
    ├── index.html
    └── src/
        ├── api/                          ← 按模块分文件：auth.js / dashboard.js / user.js / backup.js / template.js ...
        ├── router/index.js               ← 静态基础路由 + 登录后动态 addRoute（按 sys_menu）
        ├── store/                        ← Pinia：appStore(布局主题) / userStore(管理员+token) / permissionStore(菜单树+perms)
        ├── utils/
        │   ├── request.js                ← Axios 封装：统一注入 Token / 401 自动刷新 / 403 跳转 / Result 解构
        │   └── permission.js             ← router.beforeEach 动态路由守卫 + 404/403 兜底
        ├── layouts/
        │   └── LayoutMain.vue            ← 侧边栏(el-menu 递归根据菜单树渲染) + 顶栏(面包屑/头像/下拉退出)
        ├── views/
        │   ├── login/Login.vue
        │   ├── dashboard/Dashboard.vue              ← 9 卡片 + 4 图 (ECharts)
        │   ├── user/UserList.vue, UserDetail.vue
        │   ├── backup/BackupList.vue
        │   ├── template/TemplateAudit.vue (含抽屉详情), TemplateSquare.vue
        │   ├── announce/AnnounceList.vue, AnnounceEdit.vue
        │   ├── feedback/FeedbackList.vue (含抽屉处理面板)
        │   ├── preset/PresetList.vue, PresetEdit.vue
        │   ├── admin/AdminUserList.vue, RoleMenu.vue
        │   └── error/403.vue, 404.vue
        ├── directives/hasPerm.js         ← 按钮级权限自定义指令
        └── App.vue + main.js
```

### 1.3 技术栈清单（精确版本）

| 层级 | 技术 | 版本 | 用途 |
|---|---|---|---|
| **后端 server** | Spring Boot | 2.7.18 | 应用框架 |
| | Spring Security + Spring Web | 随 Boot 2.7 | 认证与授权 / REST |
| | MyBatis-Plus Boot Starter | 3.5.5 | 持久层 |
| | MySQL Connector/J | 8.0.33 | JDBC |
| | JJWT (io.jsonwebtoken:jjwt-api/impl/jackson) | 0.11.5 | JWT 签发与校验 |
| | commons-io | 2.15.1 | 文件流工具 |
| | Lombok | 1.18.30 | 简化 POJO |
| | spring-boot-starter-validation | 2.7.x | 入参 @Valid 校验 |
| | JavaFaker (test scope) | 1.0.2 | 测试数据生成 |
| **前端 admin-web** | Vue | ^3.4.21 | 框架 |
| | Vite | ^5.2.0 | 构建 |
| | Element Plus | ^2.6.0 | UI 组件库 |
| | Pinia | ^2.1.7 | 状态管理 |
| | Vue Router | ^4.3.0 | 路由（动态 addRoute）|
| | Axios | ^1.6.8 | HTTP |
| | ECharts + vue-echarts | ^5.5.0 / ^6.6.8 | Dashboard 图表 |
| | @element-plus/icons-vue | ^2.3.1 | 图标 |
| **小程序端 FitNote** | 现有 uni-app + Vue3 + Pinia | — | 仅加 HTTP 封装层 + 6 新页面，不动核心训练流程 |

### 1.4 统一接口响应格式 Result<T>

所有接口统一返回：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": 1700000000000
}
```

错误码约定：
| code | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 参数校验失败 / 业务前置条件不满足 |
| 401 | 未登录 / Token 失效（message = TOKEN_EXPIRED 时前端尝试刷新） |
| 403 | 无权限（角色 / perms 拒绝 / 账号被封禁） |
| 404 | 资源不存在 |
| 409 | 资源冲突（用户名重复 / 唯一键冲突） |
| 500 | 服务器内部错误（全局异常捕获兜底） |

---

## 2. 数据库 ER 设计（12 张表）

### 2.1 表总览

| 编号 | 表名 | 说明 | 归属模块 |
|---|---|---|---|
| T1 | `sys_user` | 小程序端用户（账号密码体系） | 认证 / 用户管理 |
| T2 | `sys_admin` | 管理后台管理员（ADMIN / AUDITOR）| RBAC |
| T3 | `sys_menu` | 后台菜单树（动态路由数据源） | RBAC |
| T4 | `sys_role_menu` | 角色-菜单 N:N 绑定 | RBAC |
| T5 | `backup_record` | 用户云端备份元数据 | 备份管理 |
| T6 | `shared_template` | 广场模板（3 状态 + 计数）| 模板广场 |
| T7 | `template_tag` | 模板标签字典 | 模板广场 |
| T8 | `template_tag_rel` | 模板-标签 N:N | 模板广场 |
| T9 | `user_template_collect` | 用户收藏广场模板 | 模板广场 |
| T10 | `announcement` | 公告系统消息 | 公告 |
| T11 | `feedback_issue` | 用户反馈 Issue | 反馈 |
| T12 | `preset_pack` | 官方预设模板包（线上版）| 预设模板包 |

> **设计原则**：
> - 每张表都含 `id BIGINT AUTO_INCREMENT PK`、`create_time DATETIME DEFAULT CURRENT_TIMESTAMP`、`update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`、`deleted TINYINT(1) DEFAULT 0`（逻辑删除）
> - 用户的"训练日 DayData"默认**只存在小程序本地 Storage**；仅用户主动点「云端备份」时才把完整 JSON 打包为备份文件 → 磁盘 + `backup_record` 元数据
> - 所有外键关系为**逻辑关联**（不加 SQL FOREIGN KEY 约束），便于毕设阶段手动改数据

### 2.2 T1 sys_user — 小程序用户

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AI | 用户 ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 登录用户名 |
| password | VARCHAR(255) | NOT NULL | BCrypt hash |
| nickname | VARCHAR(50) | | 昵称 |
| avatar_url | VARCHAR(255) | NULL | 头像 URL |
| phone | VARCHAR(20) | NULL, UNIQUE | 手机号（选填）|
| gender | TINYINT | DEFAULT 0 | 0=未设置 1=男 2=女 |
| birthday | DATE | NULL | 生日 |
| status | TINYINT | DEFAULT 1 | 1=正常 0=封禁 |
| total_train_days | INT | DEFAULT 0 | 累计训练天数（每次备份解析统计后更新） |
| total_volume_kg | DECIMAL(12,2) | DEFAULT 0 | 累计训练容量 kg |
| last_login_time | DATETIME | NULL | |
| last_active_time | DATETIME | NULL | 每次调后端接口时刷新（拦截器） |
| register_time | DATETIME | NOT NULL | |
| deleted / create_time / update_time | | | |

### 2.3 T2 sys_admin — 后台管理员

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AI | |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 登录名 |
| password | VARCHAR(255) | NOT NULL | BCrypt |
| nickname | VARCHAR(50) | | 显示名 |
| role_code | VARCHAR(32) | NOT NULL | `ADMIN` 或 `AUDITOR` |
| status | TINYINT | DEFAULT 1 | 1=正常 0=停用 |
| last_login_time | DATETIME | NULL | |
| deleted / create_time / update_time | | | |

### 2.4 T3 sys_menu — 菜单树

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AI | |
| parent_id | BIGINT | DEFAULT 0 | 父 ID，0=一级 |
| name | VARCHAR(64) | NOT NULL | 路由/组件名（唯一）|
| path | VARCHAR(128) | | 路由路径 |
| component | VARCHAR(255) | | 前端组件相对路径 |
| title | VARCHAR(64) | NOT NULL | 菜单中文名 |
| icon | VARCHAR(64) | | Element Plus 图标名 |
| sort_order | INT | DEFAULT 0 | 排序 |
| visible | TINYINT(1) | DEFAULT 1 | 侧边栏是否显示 |
| perms | VARCHAR(128) | | 按钮级权限标识，如 `template:audit` |
| type | TINYINT | NOT NULL | 1=目录 2=菜单 3=按钮 |
| deleted / create_time / update_time | | | |

### 2.5 T4 sys_role_menu — 角色-菜单 N:N

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK |
| role_code | VARCHAR(32) NOT NULL, INDEX | `ADMIN` / `AUDITOR` |
| menu_id | BIGINT NOT NULL | FK → sys_menu.id |
| UNIQUE KEY (role_code, menu_id) | | |
| create_time | | |

初始绑定（data.sql）：
- ADMIN → 全部菜单/按钮（约 25 条）
- AUDITOR → 仅"模板审核菜单(含按钮)"+ "反馈管理菜单(含按钮)"

### 2.6 T5 backup_record — 云端备份（**不限制用户备份数量**）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AI | |
| user_id | BIGINT | NOT NULL, INDEX | sys_user.id |
| file_name | VARCHAR(255) | NOT NULL | 展示名：`FitNote-backup-YYYY-MM-DD-HH-mm-ss.json` |
| file_path | VARCHAR(512) | NOT NULL | 磁盘路径：`data/backups/{userId}/{backupId}.json` |
| file_size | BIGINT | NOT NULL | 字节数 |
| backup_type | TINYINT | DEFAULT 1 | 1=全量（毕设当前支持）2=增量（字段预留） |
| version | VARCHAR(16) | DEFAULT '1.0' | 与小程序 BACKUP_VERSION 对齐 |
| total_days | INT | DEFAULT 0 | 解析 JSON 后的训练天数 |
| total_templates | INT | DEFAULT 0 | |
| total_actions | INT | DEFAULT 0 | |
| remark | VARCHAR(255) | NULL | 用户备注（UI 可选）|
| deleted / create_time / update_time | | | |

> 文件存储：jar 同级目录 `data/backups/{userId}/{id}.json`

### 2.7 T6 shared_template — 广场模板

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AI | |
| user_id | BIGINT | NOT NULL, INDEX | 分享者 |
| original_template_id | BIGINT | NULL | 衍生模板的原模板 ID（可 NULL） |
| name | VARCHAR(100) | NOT NULL | |
| description | TEXT | NULL | 模板介绍文字 |
| cover_color | VARCHAR(16) | NULL | Hex 色 |
| action_count | INT | DEFAULT 0 | 冗余 |
| total_sets | INT | DEFAULT 0 | 冗余 |
| template_data | JSON | NOT NULL | { actions:[], actionSets:{}, color, customColors }，与小程序 Template 结构一致 |
| status | TINYINT | NOT NULL DEFAULT 0 | 0=待审核 1=已通过 2=已驳回 |
| reject_reason | VARCHAR(512) | NULL | status=2 时必填 |
| audit_admin_id | BIGINT | NULL | sys_admin.id |
| audit_time | DATETIME | NULL | |
| is_official | TINYINT(1) | DEFAULT 0 | 官方推荐徽章 |
| sort_weight | INT | DEFAULT 0 | 官方推荐排序权重 |
| view_count | INT | DEFAULT 0 | 浏览量 |
| collect_count | INT | DEFAULT 0 | 收藏量 |
| download_count | INT | DEFAULT 0 | 下载/导入量 |
| deleted / create_time / update_time | | | |

### 2.8 T7 template_tag — 标签字典

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(32) UNIQUE | 推日 / 拉日 / 腿日 / 臀日 / 上肢日 / 下肢日 / 新手入门 / 进阶训练 / 减脂 / 增肌 |
| color | VARCHAR(16) | 展示色 |
| sort_order | INT DEFAULT 0 | |
| create_time | | |

### 2.9 T8 template_tag_rel — N:N

| 字段 | 类型 |
|---|---|
| id BIGINT PK |
| template_id BIGINT NOT NULL, INDEX |
| tag_id BIGINT NOT NULL |
| UNIQUE (template_id, tag_id) |

### 2.10 T9 user_template_collect — 用户收藏

| 字段 | 类型 |
|---|---|
| id BIGINT PK |
| user_id BIGINT NOT NULL, INDEX |
| template_id BIGINT NOT NULL, INDEX |
| UNIQUE (user_id, template_id) |
| create_time |

### 2.11 T10 announcement — 公告

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK | |
| title | VARCHAR(200) NOT NULL | |
| content | TEXT NOT NULL | 正文（纯文本）|
| type | TINYINT DEFAULT 1 | 1=系统公告 2=活动通知 3=版本更新 |
| priority | TINYINT DEFAULT 0 | 1=置顶（首页 Banner）0=普通 |
| status | TINYINT DEFAULT 0 | 0=草稿 1=已发布 2=已撤回 |
| publish_admin_id | BIGINT | sys_admin.id |
| publish_time | DATETIME NULL | |
| target_group | TINYINT DEFAULT 0 | 0=全体（毕设简化）|
| view_count | INT DEFAULT 0 | |
| deleted / create_time / update_time | | |

### 2.12 T11 feedback_issue — 反馈

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT NOT NULL, INDEX | |
| category | TINYINT NOT NULL | 1=功能建议 2=Bug 3=数据异常 4=其他 |
| title | VARCHAR(200) NOT NULL | |
| content | TEXT NOT NULL | |
| screenshot_urls | TEXT NULL | 截图 URL 逗号分隔（预留）|
| status | TINYINT DEFAULT 0 | 0=待处理 1=处理中 2=已解决 3=已拒绝（单向流转）|
| handler_admin_id | BIGINT NULL | sys_admin.id |
| handle_reply | TEXT NULL | |
| handle_time | DATETIME NULL | |
| deleted / create_time / update_time | | |

### 2.13 T12 preset_pack — 预设模板包

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(100) NOT NULL | 如「经典推拉腿 3 日循环」 |
| description | TEXT NULL | 介绍 |
| cover_color | VARCHAR(16) | |
| difficulty | TINYINT | 1=简单 2=中等 3=困难 |
| template_data | JSON NOT NULL | 包内多个模板：[ { name, actions:[], actionSets:{}, color }... ] |
| enabled | TINYINT(1) DEFAULT 1 | 启用/停用 |
| sort_order | INT DEFAULT 0 | |
| create_admin_id | BIGINT | sys_admin.id |
| deleted / create_time / update_time | | |

### 2.14 关系连线

```
sys_user 1──N backup_record
sys_user 1──N shared_template (作者)
sys_user 1──N user_template_collect N──1 shared_template
shared_template N──N template_tag (via template_tag_rel)
sys_admin 1──N shared_template.audit_admin_id
sys_admin 1──N announcement.publish_admin_id
sys_admin 1──N feedback_issue.handler_admin_id
sys_admin.role_code ──N:N── sys_menu (via sys_role_menu)
```

---

## 3. 认证与鉴权（双 JWT 体系 + RBAC 矩阵）

### 3.1 双轨 JWT Payload

小程序用户 Token 与管理员 Token 共用同一签发/校验链路，通过 `type` 字段区分：

```json
{
  "sub": "10001",
  "type": "USER" | "ADMIN",
  "role": "ADMIN" | "AUDITOR" | null,
  "username": "liao",
  "iat": 1700000000,
  "exp": 1700007200
}
```

策略：
- Access Token 有效期 2 小时
- 过期后 7 天内可凭旧 Token 调 `/auth/refresh` 换发新 Token（无需 refreshToken 独立字段）
- **不引入 Redis**；用户 `status=0` 封禁通过每次鉴权查库 + JWT 过期窗口兜底

### 3.2 公开白名单（Spring Security）

```
POST /api/auth/**                         登录/注册/刷新/登出
GET  /api/template/square/**              广场列表/详情/标签字典
GET  /api/announce/list, /api/announce/{id}
GET  /api/preset/list, /api/preset/{id}
OPTIONS /**                               CORS 预检
```

### 3.3 URL 级角色权限（Spring Security Config 摘要）

```java
.antMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")                 // 管理员体系：仅 ADMIN
.antMatchers("/api/dashboard/**").hasAuthority("ROLE_ADMIN")
.antMatchers("/api/user/**").hasAuthority("ROLE_ADMIN")                   // 管理端"用户管理"
.antMatchers("/api/admin/backup/**").hasAuthority("ROLE_ADMIN")
.antMatchers("/api/preset/**").hasAuthority("ROLE_ADMIN")                  // 预设包管理
.antMatchers("/api/announce/**").hasAuthority("ROLE_ADMIN")                // 公告管理
.antMatchers("/api/template/audit/**").hasAnyRole("ADMIN", "AUDITOR")       // 审核：双角色
.antMatchers("/api/admin/feedback/**").hasAnyRole("ADMIN", "AUDITOR")       // 反馈处理：双角色
.antMatchers("/api/template/square/**").hasRole("ADMIN")                    // 广场"官方推荐/下架"：仅 ADMIN
.antMatchers("/api/user/**", "/api/backup/**", "/api/template/share",      // USER 自己的功能
             "/api/template/collect/**", "/api/feedback/**").authenticated()
.anyRequest().authenticated();
```

### 3.4 按钮级 hasPerm

实现 `CustomPermissionEvaluator.hasPermission(auth, targetDomain, perms)`：
1. 若当前 Authentication 不是 ADMIN 类型 → 直接 false
2. 查 sys_admin.role_code → 连 sys_role_menu + sys_menu → 取该管理员所有 perms 非空字符串集合
3. 判断传入 perms 是否在集合内
4. 首次计算后结果缓存到 Authentication.details（`Map<String,Set<String>>`），同一请求内不再查库

### 3.5 RBAC 权限矩阵（节选，完整 data.sql 初始化所有菜单）

| 菜单 | path | perms | ADMIN | AUDITOR |
|---|---|---|---|---|
| 数据看板 | /dashboard | `dashboard:view` | ✅ | ❌ |
| 用户列表 | /user/list | `user:list` / `user:status` / `user:detail` | ✅ | ❌ |
| 备份管理 | /backup/list | `backup:list` / `backup:delete` | ✅ | ❌ |
| 模板审核 | /template/audit | `template:audit` | ✅ | ✅ |
| 广场管理 | /template/square | `template:square` / `template:official` | ✅ | ❌ |
| 公告管理 | /announce/list | `announce:list` / `announce:publish` | ✅ | ❌ |
| 反馈管理 | /feedback/list | `feedback:list` / `feedback:handle` | ✅ | ✅ |
| 预设模板包 | /preset/list | `preset:list` / `preset:edit` | ✅ | ❌ |
| 管理员列表 | /admin/list | `admin:list` / `admin:edit` | ✅ | ❌ |
| 角色菜单绑定 | /admin/role-menu | `admin:rolemenu` | ✅ | ❌ |

### 3.6 密码加密

- 统一 `BCryptPasswordEncoder`，strength=10
- `data.sql` 默认账号：
  - admin / admin123
  - auditor / auditor123
- 小程序测试用户（TestDataGenerator 生成）统一 user1~user50 / user123

---

## 4. 7 功能模块详细设计

> 每个模块 4 维度：状态流转图、管理后台页面、小程序端对应页面、核心接口表

### 🔷 M1 数据看板 Dashboard

**管理页**：`views/dashboard/Dashboard.vue`
- 4 张指标卡：总用户数 / 今日新增 / 今日活跃 / 累计训练容量 kg
- ECharts：近 7 日活跃 + 训练容量双 Y 轴折线图、训练部位饼图、Top10 热门动作、Top10 热门模板
- 3 迷你卡：待审核模板数 / 待处理反馈数 / 置顶公告数
- 实时动态流（最新 10 条：注册 / 备份 / 分享模板）

**接口**：`GET /api/dashboard/summary` → 权限 `dashboard:view`（ADMIN）

---

### 🔷 M2 用户管理

**状态流**：
```
注册(status=1) → 正常 → 管理员封禁(status=0) → 解封(status=1)
```

**管理页**：
- `UserList.vue`：关键词/日期范围/状态筛选 + 分页；列：头像、用户名、昵称、性别、注册日、最后活跃、训练天数、累计容量、状态 badge；操作（详情/封禁/解封）
- `UserDetail.vue`：基本信息 + 训练摘要 ECharts（30 天容量折线 + 部位饼图）+ 历史备份列表 + 分享模板列表 + 反馈历史

**接口**：

| 方法 | URL | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/user/page` | `user:list` | 分页+筛选 |
| GET | `/api/admin/user/{id}` | `user:detail` | 详情聚合 |
| PUT | `/api/admin/user/{id}/status` | `user:status` | 封禁/解封 |
| GET | `/api/admin/user/{id}/backup/page` | `backup:list` | 备份列表 |
| GET | `/api/admin/user/{id}/template/shared` | `template:square` | 分享模板 |

---

### 🔷 M3 云端备份

**状态流**：
```
小程序点 [上传云端] → 写入文件 data/backups/{userId}/{id}.json → INSERT backup_record
用户/管理员 删除 → deleted=1（磁盘文件同步删除，毕设直接真删除也可）
```

**用户备份不限数量**：所有涉及备份数量判断的代码、配置、SQL 均不做上限截断。

**管理页**：`BackupList.vue` — 按用户名/文件名/日期范围/大小搜索；列：备份 ID、所属用户（可点进用户详情）、文件名、大小、训练天数/模板数/动作数、上传时间；操作（下载 / 删除）

**备份页 UI 结构（小程序端 backup.vue）**
> **顶部按钮区改为 3 按钮并排（等宽卡片式），下方渲染对应内容区，不再做 `isMpWeixin` Tab 判断**

```
┌────────────────────────────────────────────────────┐
│  顶部 3 按钮区（main-action-zone 之上）                │
│  ┌─────────────┬───────────────┬──────────────┐   │
│  │ 📂 本地备份  │  📤 导出导入  │  ☁️ 云端备份  │   │ ← activeTab 三选一
│  └─────────────┴───────────────┴──────────────┘   │
├────────────────────────────────────────────────────┤
│  下方对应内容区：                                     │
│                                                     │
│  activeTab=local → 原本地备份 UI（路径卡 + 大球按钮 + 导入历史按钮）不变
│  activeTab=exportImport → 原 ExportTab + ImportTab（导出/子选 子Tab）不变
│  activeTab=cloud  → 新增云端备份区（见下）          │
└────────────────────────────────────────────────────┘
```

**activeTab=cloud 云端备份区 UI**：
```
┌────────────────────────────────────────────┐
│  登录状态条：未登录 → 【立即登录使用云端备份】 │
│              已登录 →  👤 li***o  训练 XX 天 │
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │  ☁️  大圆形上传按钮                   │ │
│  │  文本：上传至云端                     │ │ ← 点击 → requireLogin → collectFullData → uni.uploadFile
│  │  子文本：不限制备份数量               │ │
│  └──────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│  我的备份列表（不限数量，分页上拉加载）：     │
│  ┌────────────────────────────────────┐  │
│  │ 📦 FitNote-backup-2026-08-29...   │  │
│  │ 📅 2026-08-29 10:30  💾 1.2 MB     │  │
│  │ 📊 86天训练 / 5模板 / 112动作       │  │
│  │ [下载覆盖] [下载合并] [删除]        │  │
│  └────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**核心接口（USER 自助 + ADMIN 全局两套完全分开）**：

| 角色 | 方法 | URL | 权限 | 说明 |
|---|---|---|---|---|
| USER | POST | `/api/user/backup/upload` | 登录 | multipart：file=json + totalDays/totalTemplates/totalActions |
| USER | GET | `/api/user/backup/page` | 登录 | 分页（按 create_time desc，**不做条数限制**）|
| USER | GET | `/api/user/backup/{id}/download` | 登录 + 资源归属校验 | 以 attachment 方式返回 JSON 文件流 |
| USER | DELETE | `/api/user/backup/{id}` | 登录 + 归属 | 删除（磁盘 + DB）|
| ADMIN | GET | `/api/admin/backup/page` | `backup:list` | 全局列表，支持按 userId/日期范围/keyword 筛选 |
| ADMIN | DELETE | `/api/admin/backup/{id}` | `backup:delete` | 删除任意备份 |

---

### 🔷 M4 模板分享广场（含审核）

**状态流**：
```
用户分享 → 待审核(0) ──审核通过──► 已通过(1) ──► 官方推荐置顶
              │                        │
              │驳回(填原因)            │管理员下架=驳回(填"不合规")
              ▼                        ▼
           已驳回(2) ◄─────────────────┘
              │ 显示驳回原因
              └── 用户 [修改/重新提交] → 回到待审核(0) + 清空 audit_admin_id/audit_time
```

**管理页**：
- `TemplateAudit.vue`（AUDITOR 可见）— Tab 全部/待审核/通过/驳回；行展开抽屉显示模板介绍 + 动作清单 + 配色；操作按钮：【通过】 / 【驳回】（驳回 Dialog 必填原因，≥10 字）
- `TemplateSquare.vue`（仅 ADMIN）— 已通过模板；操作：【设为/取消官方推荐 + sort_weight 拖拽排序】 / 【强制下架（即驳回填原因）】 / 【删除】

**小程序端页**：
- `pages/templateSquare/templateSquare.vue` — 搜索栏 + 标签筛选 chips + Tab（热门推荐/最新/我的收藏）+ 卡瀑布；详情 Popup（动作列表+标签+介绍）+ 3 大按钮：收藏 / 一键导入 / 返回。「一键导入」= 调 `GET {id}/download` 拿 template_data → 直接写入本地 `stores/template.js`（复用 addTemplate 方法）+ download_count +1
- `pages/templateShare/templateShare.vue` — 从模板管理选自己的模板 → 自动填充 + 填介绍 ≥20 字 + 勾标签 → 提交
- 我的页面「我分享的模板」：列表 + 状态 badge + 驳回原因（若 status=2 显示"重新提交"）

**核心接口**：

| 角色 | 方法 | URL | 权限 | 说明 |
|---|---|---|---|---|
| ALL | GET | `/api/template/square/page` | permitAll | 广场列表（仅 status=1），支持 keyword/tagId/sort(hot/latest) |
| ALL | GET | `/api/template/square/{id}` | permitAll | 详情 view_count+1 |
| ALL | GET | `/api/template/tag/list` | permitAll | 字典 |
| USER | GET | `/api/template/square/{id}/download` | 登录 | 完整 template_data，download_count+1 |
| USER | POST | `/api/template/share` | 登录 | 提交分享（status=0）|
| USER | PUT | `/api/template/share/{id}/resubmit` | 登录 + 归属 | 驳回后重提 → status=0 |
| USER | GET/DELETE/POST | `/api/template/collect/{id}` | 登录 | 收藏 / 取消 / 我的收藏列表 |
| USER | GET | `/api/template/mine/page` | 登录 | 我分享的模板（含驳回原因）|
| ADM+AUD | GET | `/api/admin/template/audit/page` | `template:audit` | 审核列表（所有状态可筛选）|
| ADM+AUD | PUT | `/api/admin/template/audit/{id}` | `template:audit` | `{ status: 1或2, rejectReason }`，记录 audit_admin_id + time |
| ADMIN | PUT | `/api/admin/template/square/{id}/official` | `template:official` | 官方 + 排序 |
| ADMIN | DELETE | `/api/admin/template/square/{id}` | `template:square` | 逻辑删 |

---

### 🔷 M5 公告 / 系统消息

**状态流**：`草稿(0) → 管理员点发布 → 已发布(1) → 撤回 → 已撤回(2)`

**管理页**：
- `AnnounceList.vue` — Tab 全部/已发布/草稿/撤回；列：标题/类型徽章/优先级徽章/发布人/时间/浏览量；操作：【编辑】【发布】【撤回】【删除】
- `AnnounceEdit.vue` — 表单（标题/类型下拉/优先级 switch/正文 textarea）+ 两个按钮：【保存草稿】【立即发布】

**小程序端**：
- 首页顶部 `AnnouncementBanner` 组件：横向滚动展示 priority=1 公告标题，点击跳转公告中心
- `pages/announce/announceList.vue`：所有已发布公告列表 + 点击展示详情（view_count+1）

**接口**：

| 角色 | 方法 | URL | 权限 |
|---|---|---|---|
| ALL | GET | `/api/announce/list` | permitAll | 已发布公告列表（按 priority desc + publish_time desc） |
| ALL | GET | `/api/announce/{id}` | permitAll | 详情 view_count+1 |
| ADMIN | POST | `/api/admin/announce` | `announce:publish` | 新建（默认草稿） |
| ADMIN | PUT | `/api/admin/announce/{id}` | `announce:publish` | 编辑 |
| ADMIN | PUT | `/api/admin/announce/{id}/publish` | `announce:publish` | 发布（写 publish_admin_id + publish_time，status=1）|
| ADMIN | PUT | `/api/admin/announce/{id}/withdraw` | `announce:publish` | 撤回 status=2 |
| ADMIN | DELETE | `/api/admin/announce/{id}` | `announce:publish` | 删除 |

---

### 🔷 M6 反馈 / Issue

**状态流**（单向前进，简化实现）：
```
提交(0待处理) → 管理员点[开始处理] → 处理中(1) → [标记已解决填回复] → 已解决(2)
                                          └──→ [拒绝填原因] → 已拒绝(3)
```

**管理页**：
- `FeedbackList.vue`：Tab 按状态分 + 分类筛选 + 时间范围；列：标题/分类徽章/提交人/提交时间/状态/处理人；点击行 Drawer 展示左侧（提交人+分类+标题+内容+截图占位）右侧（状态+处理回复 textarea + 开始处理/已解决/拒绝 动态按钮）

**小程序端**：
- `pages/feedback/feedbackSubmit.vue` — 分类下拉 / 标题 / 内容 / 提交
- `pages/feedback/feedbackList.vue` — 我的反馈列表（含处理回复）

**接口**：

| 角色 | 方法 | URL | 权限 |
|---|---|---|---|
| USER | POST | `/api/feedback` | 登录 | 提交 |
| USER | GET | `/api/feedback/mine/page` | 登录 | 我提交的 |
| USER | GET | `/api/feedback/{id}` | 登录 + 归属 | 详情（带处理回复） |
| ADM+AUD | GET | `/api/admin/feedback/page` | `feedback:list` | 全局 + 筛选 |
| ADM+AUD | PUT | `/api/admin/feedback/{id}/handle` | `feedback:handle` | `{ nextStatus: 1/2/3, handleReply }`，合法性校验（只能前进不能后退，起始 status+1 对应合法 nextStatus）自动写 handler/handle_time |

---

### 🔷 M7 管理员账号 / RBAC + 预设模板包

#### 7a 管理员账号与 RBAC

**管理页（仅 ADMIN）**：
- `AdminUserList.vue`：管理员列表（用户名/昵称/角色 tag/状态/最后登录）；新增 Dialog；重置密码 Dialog；切换状态
- `RoleMenu.vue`：左侧 Tab 切换 ADMIN / AUDITOR → 右侧 el-tree 显示 sys_menu 完整 3 级树（含按钮级 perms 节点）；当前角色已绑定 menuIds 勾在树上；底部【保存】→ 先删再批量插 sys_role_menu

**接口**：

| 方法 | URL | 权限 |
|---|---|---|
| GET | `/api/admin/admin-user/page` | `admin:list` |
| POST | `/api/admin/admin-user` | `admin:edit` | 新增（密码 BCrypt 加密后入库）|
| PUT | `/api/admin/admin-user/{id}` | `admin:edit` | 编辑昵称/角色/状态 |
| PUT | `/api/admin/admin-user/{id}/reset-pwd` | `admin:edit` | 重置密码 |
| GET | `/api/admin/menu/tree` | `admin:rolemenu` | 完整菜单树（用于角色绑定页）|
| GET | `/api/admin/role-menu/{roleCode}` | `admin:rolemenu` | 某角色已绑定 menuIds |
| PUT | `/api/admin/role-menu/{roleCode}` | `admin:rolemenu` | `{ menuIds:[] }` 先删后批量插入 |
| GET | `/api/admin/me/menus` | ADMIN 登录 | 返回该管理员可见菜单树（登录接口响应中已带）|

#### 7b 预设模板包

**管理页**：
- `PresetList.vue`：列表（名称/难度 tag/模板数/启用/排序/操作）
- `PresetEdit.vue`：名称/介绍/难度/配色/启用 switch/排序号；核心"模板清单表格"（每行=子模板：模板名/色值/动作×组数二维表格，动作可从下拉选，行数动态增删）

**小程序端**：
- 注册成功后引导弹窗「🎉 注册成功！要不要导入官方推荐的训练模板包？」→ 勾选预设包 → 一键写入 `stores/template.js`
- 老用户入口：模板管理 → 更多 → 【导入官方模板包】

**接口**：

| 角色 | 方法 | URL | 权限 |
|---|---|---|---|
| ALL | GET | `/api/preset/list` | permitAll | 启用列表 |
| ALL | GET | `/api/preset/{id}` | permitAll | 详情（完整 template_data）|
| ADMIN | GET | `/api/admin/preset/page` | `preset:list` | |
| ADMIN | POST | `/api/admin/preset` | `preset:edit` | |
| ADMIN | PUT | `/api/admin/preset/{id}` | `preset:edit` | |
| ADMIN | PUT | `/api/admin/preset/{id}/toggle` | `preset:edit` | 启用/停用 |
| ADMIN | DELETE | `/api/admin/preset/{id}` | `preset:edit` | 删除 |

---

## 5. 小程序端改造点

### 5.1 改造原则（4 条）

1. **本地数据为主，云端数据为辅**：训练日/动作库/模板日常读写仍走 Pinia + uni.setStorageSync，不做实时同步
2. **云端功能按需触发**：仅用户点按钮（上传备份/分享模板/收藏/提交反馈）才 HTTP 请求
3. **游客模式保留**：训练功能不登录也能正常用；需要身份的操作先弹 LoginModal
4. **后端地址配置驱动**：`utils/config.js` 单文件维护 BASE_URL，环境用 `#ifdef` 自动切换

### 5.2 新增文件清单

```
utils/
  ├── config.js                     # BASE_URL + 环境条件编译（H5 / MP / APP-PLUS 分别）
  ├── http.js                       # uni.request 封装（Token 注入 + 401 自动刷新 + 统一错误 Toast）
  ├── apiAuth.js                    # 注册/登录/刷新/登出
  ├── apiBackup.js                  # 用户端自助备份：上传/列表/下载/删除
  ├── apiTemplate.js                # 模板广场：分享/重提/广场/下载/收藏/我的
  ├── apiAnnounce.js                # 公告：列表/详情
  ├── apiFeedback.js                # 反馈：提交/我的列表/详情
  └── apiPreset.js                  # 预设模板包：列表/详情
stores/
  └── authUser.js                   # Pinia：token + user + requireLogin() 封装
components/
  ├── LoginModal.vue                # 注册/登录 Tab 弹窗（全局 uni.$on('showLogin')）
  ├── AnnouncementBanner.vue        # 首页顶部滚动公告（只渲染 priority=1）
  └── UserAvatarCard.vue            # 头像+昵称+训练天数卡（用于我的页）
pages/                              # 6 个新页面（全部注册到 pages.json）
  ├── userCenter/userCenter.vue     # ★ 我的页面：替换原 MoreMenu 入口
  ├── templateSquare/templateSquare.vue
  ├── templateShare/templateShare.vue
  ├── announce/announceList.vue
  ├── feedback/feedbackSubmit.vue
  └── feedback/feedbackList.vue
```

### 5.3 首页入口改造（pages/index/index.vue）

- **删除**：右上角「⋯」MoreMenu 按钮 + 组件挂载
- **新增**：右上角「👤 我的」按钮 → `uni.navigateTo('/pages/userCenter/userCenter')`
- **新增**：月历顶部插入 `<AnnouncementBanner />`（首页看公告）
- 纪念日列表：首页底部保留展示；「添加纪念日」迁入我的页纪念日管理内

### 5.4 「我的」页面 5 个分组（完整替代原 MoreMenu）

```
① 用户卡片（顶部）： 头像 + 昵称/未登录引导 + 登录/注册按钮 + 训练天数/累计容量
② 我的数据 2×3 卡： ☁️云端备份  📦导入官方模板包  📚模板广场  🚀分享模板  🌟我的收藏  📝我分享的模板
③ 设置与外观列表：   🌙主题切换  ✨液态玻璃  👁快捷训练按钮  ⏱计时器设置  📅分化计划
④ 信息 & 互动列表：  📅纪念日管理  📢公告中心  📮我的反馈  📖阅读说明  ℹ️关于FitNote
⑤ 账号区（登录后显）：🔒修改密码  🚪退出登录（二次确认）
```

原 MoreMenu 的 6 个菜单项（阅读说明/添加纪念日/快捷训练按钮/主题切换/液态玻璃）**全部迁入③④分组**，功能逻辑与原先保持一致（emit 改 store 方法调用）。

### 5.5 `utils/config.js` — BASE_URL + 环境自动切换

```
// H5 开发者工具：         DEV_URL = http://localhost:8080
// 微信小程序开发者工具：    DEV_URL = http://localhost:8080（勾"不校验合法域名"）
// APP-PLUS 真机/基座：    DEVICE_URL = http://{局域网IP}:8080（必须手机连同一 Wi-Fi）
```

用 `#ifdef H5` / `#ifdef MP-WEIXIN` / `#ifdef APP-PLUS` 三套条件编译自动选。真机测试前只改 `LOCAL_NETWORK_IP` 一行即可。

### 5.6 `utils/http.js` 关键逻辑

1. `needAuth=true` 时拼 `Authorization: Bearer {token}` 头
2. 统一结果解构：只返回 `res.data.data`（body 有 Result 封装）
3. 401 时：尝试 `refreshToken()` 一次 → 成功 → 重放原请求；失败 → `authStore.logout()` + `uni.$emit('showLogin')`
4. 403：Toast「无操作权限」
5. 网络失败：Toast「网络连接失败，请检查后端服务是否启动」；不影响本地训练功能

### 5.7 `stores/authUser.js` — requireLogin() 封装

所有页面调用云端接口前统一包一层：
```javascript
await authStore.requireLogin(() => this.actualCloudAction(), '使用云端备份')
```
未登录时自动弹 LoginModal；登录成功后自动重试原 action；用户取消弹窗 throw "用户取消登录"。

### 5.8 备份页 backup.vue 改造要点

- 删除原 `isMpWeixin` 分支判断 + 顶部 2 Tab（本地备份/导出导入）切换
- 替换为 **顶部 3 按钮并排**（`activeTab`：local / exportImport / cloud）+ 对应下方内容 v-if
- activeTab=cloud：LoginModal 未登录提示条 + 大圆形上传按钮 + 不限数量的备份列表卡
- **彻底废弃 `utils/cloudBackup.js`（原 wx.cloud 云开发版云端备份）**：不再 import；云函数 `getOpenId` 仅保留但不调用（毕设答辩说明"已迁移至 Spring Boot 账号体系"）
- 上传备份前：先复用现有 `utils/backup.js` 里的 `collectFullData()` 取 JSON → `uni.getFileSystemManager().writeFileSync` 到临时文件 → `uni.uploadFile` 调后端 `/api/user/backup/upload`
- 下载备份后：复用现有 `utils/dataMerger.js` 合并 / 覆盖两种策略，不重写

---

## 6. 部署 + 真机联调 + 测试数据

### 6.1 启动顺序

```
① 启动 MySQL 3306，`CREATE DATABASE fitnote DEFAULT CHARSET utf8mb4`
② 启动 Spring Boot server（8080）→ schema.sql + data.sql 自动建表+灌初始数据
③ 启动 admin-web Vite（5173）→ vite 代理 /api → 8080
④ FitNote 小程序：
   ├─ 编译到 H5（日常开发 + 毕设答辩主力）
   ├─ 编译到微信开发者工具（勾"不校验合法域名"，本地联调）
   └─ 运行到手机基座 APP-PLUS（真机演示）
```

### 6.2 application.yml 关键配置

```yaml
server:
  port: 8080

spring:
  application:
    name: fitnote-server
  datasource:
    url: jdbc:mysql://localhost:3306/fitnote?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: root        # ← TODO: 改你本地密码
    driver-class-name: com.mysql.cj.jdbc.Driver
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB
  sql:
    init:
      mode: always
      schema-locations: classpath:db/schema.sql
      data-locations: classpath:db/data.sql

mybatis-plus:
  mapper-locations: classpath*:mapper/**/*.xml
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

fitnote:
  jwt:
    secret: "FitNote-BiShe-JWT-Secret-Key-2026-0831-Super-Long-String-x86_64"
    expire-hours: 2
    refresh-grace-days: 7
  backup:
    base-dir: ./data/backups
    # max-per-user 已移除：不限制备份数量
```

### 6.3 毕设答辩演示「三场景」

| 场景 | 操作 | 展示内容 |
|---|---|---|
| **1 号主力（浏览器）** | Chrome 双标签：左 admin-web / 右 FitNote H5 | 注册→登录→公告即时展示→分享模板→审核（auditor 号展示 RBAC 限制菜单）→通过→广场展示→一键导入→备份上传→管理端看全部 |
| **2 号辅助（真机）** | 微信开发者工具真机调试 + 手机 | BLE 心率广播训练分析 + 通知栏计时器 + 真实 UI |
| **3 号开场** | admin-web Dashboard 全屏 | 50+ 模拟用户 + 20 模板 + 30 反馈 → 数据大屏视觉冲击 |

### 6.4 TestDataGenerator.java（毕设演示数据脚本）

直接 main 方法 Run（不启动 Spring），DriverManager 直连 DB，生成：

| 数据项 | 数量 | 说明 |
|---|---|---|
| sys_user | 50 | user1~user50 / user123 |
| backup_record | 120 | 每用户 2~4 份备份，真实写 `data/backups/` JSON 占位文件 |
| shared_template | 20 | 15 已通过 + 5 待审核，均带动作/标签/衍生关系，随机浏览/收藏/下载量 |
| user_template_collect | 250 | 50 用户 × 随机 5 模板 |
| announcement | 15 | 类型/优先级/状态 混合，带发布人 |
| feedback_issue | 30 | 四个分类 × 四种状态混合，已处理带 admin 回复 handler/reply/time |
| sys_user.total_train_days / total_volume_kg | 已填 | Dashboard 指标卡真实值 |

可选：用 JavaFaker 生成中文昵称/句子，让数据"看起来像真的"。

### 6.5 真机联调 SOP

```
1) 查电脑局域网 IP：PowerShell → ipconfig → 无线局域网 IPv4
2) 改 FitNote/utils/config.js LOCAL_NETWORK_IP = 步骤1 IP
3) Windows 防火墙放行 8080（或管理员 PS：
   New-NetFirewallRule -DisplayName "FitNote Server 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow）
4) 手机与电脑连同一 Wi-Fi（不能用 Web 认证校园 AP，通常客户端隔离）
5) HBuilderX → 运行到 Android 基座 → 进入"我的"尝试注册
6) 备选：手机开热点 → 电脑连 → 重新查 IP，同上面流程
```

### 6.6 联调自测 Checklist（交付前过一遍）

| 模块 | 操作 | 预期 |
|---|---|---|
| 🔑 认证 | 注册→登出→登录；错误密码；等 2h+Token 过期时再访问 | 统一 Result / 401 自动刷新再失败弹 LoginModal |
| 👤 RBAC | admin 看全菜单；auditor 只看 2 菜单；auditor 手输 `/admin/list` | 菜单/URL/按钮三级均正确拦截 → 403 页 |
| 📚 模板广场 | user1 分享 → 审核列表有 → auditor 通过 → user2 广场搜到 → 导入 + 计数 +1 → 驳回看原因 → 重提 → 再通过 | 全链路闭环 |
| 💾 云端备份 | 上传 → 管理端列表有 → 下载 → 删除；用户不限备份数 | 上传/下载/删除成功 + 不限数量 |
| 📢 公告 | 发布置顶 → 首页 Banner 出现 → 撤回 → Banner 消失 | |
| 📮 反馈 | 用户提交 → 管理端待处理=1 → 处理回复 → 用户看"已解决+回复" | 单向状态流转，记录正确 |

---

## 7. 范围排除（YAGNI 边界声明）

本设计**不包含**以下内容，避免毕设工作量失控：
- ❌ Redis / Token 黑名单（简化方案：7 天 refresh grace + DB 查用户状态）
- ❌ 小程序每天自动上传训练明细到 MySQL（训练数据依然本地优先，云端备份是显式操作）
- ❌ 微信 openid / 一键登录 / 多登录方式（用户确认纯账号密码体系）
- ❌ 第三方支付 / 短信验证码 / 邮件
- ❌ 多级 RBAC / 部门 / 岗位（仅 2 个固定角色）
- ❌ 富文本编辑器、文件对象存储（OSS/COS），公告用纯文本、备份存本地磁盘
- ❌ 原 `utils/cloudBackup.js` 微信云开发备份的兼容模式：**直接迁移至 Spring Boot HTTP 版**，不再维护 wx.cloud 版逻辑

---

**文档版本**：1.0
**编写日期**：2026-08-31
**下一步**：用户评审本文档 → 无修改或修改完毕 → 启动 writing-plans 生成迭代实施计划
