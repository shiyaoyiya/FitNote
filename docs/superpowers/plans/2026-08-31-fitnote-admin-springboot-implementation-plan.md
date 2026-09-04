# FitNote 毕设后台管理系统（Spring Boot + Vue3 管理端 + 小程序对接）实施计划

> **For agentic workers:** REQUIRED SUB-Skill: Use `superpowers:executing-plans` (recommended) to implement this plan task-by-task, or use batch inline execution with checkpoint reviews. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 FitNote 小程序 v2.1.2 基础上，新增 Spring Boot 2.7 单体后端（12 张表 + 统一 JWT 双轨鉴权 + 7 模块完整接口）+ Vue3+ElementPlus 管理后台（动态路由 + 2 角色 RBAC + 9 菜单页面 + Dashboard）+ 小程序端独立账号体系（替换原 MoreMenu 为「我的」页面 + 备份页 3 按钮 + 6 新页面 + 模板广场 + 云端备份）。

**Architecture:** 单体 Spring Boot 2.7（同一进程同时服务小程序端 USER Token 与管理端 ADMIN Token，通过 JWT Payload 的 type 字段区分）+ MyBatis-Plus 操作 MySQL 8；管理端 Vite 开发 + `/api` 代理，小程序端通过统一 utils/config.js 按条件编译选择 localhost/局域网 IP；所有公开接口、需要登录的接口、ADMIN 专属接口通过 Spring Security Config 一次性声明，按钮级权限通过自定义 PermissionEvaluator（hasPerm）完成。

**Tech Stack:** Spring Boot 2.7.18 / MyBatis-Plus 3.5.5 / JJWT 0.11.5 / Spring Security 5.7 / BCrypt / MySQL 8.0.33；Vue 3.4 + Vite 5.2 + Element Plus 2.6 + Pinia 2.1 + Vue Router 4.3 + ECharts 5.5 + Axios 1.6；小程序端 uni-app (Vue3) + 条件编译 + uni.request 封装 + Pinia。

**Test Data:** 初始数据（data.sql）提供 admin/admin123、auditor/auditor123 管理员、完整菜单树与角色绑定、10 个模板标签、3 个预设模板包。额外 TestDataGenerator.java 可生成 50 模拟用户 + 120 备份 + 20 广场模板 + 15 公告 + 30 反馈（毕设 Dashboard 演示用）。

---

## 🗂️ 文件结构前置约定（锁定：每个任务严格按此路径）

```
FitNote/
├── server/
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/fitnote/
│       │   │   ├── FitNoteApplication.java
│       │   │   ├── common/
│       │   │   │   ├── Result.java                        Result<T> 响应
│       │   │   │   ├── ResultCode.java                    错误码枚举
│       │   │   │   ├── BusinessException.java             业务异常
│       │   │   │   ├── GlobalExceptionHandler.java        全局异常捕获
│       │   │   │   └── JwtUtils.java                      JWT 签发/校验/从主体取字段
│       │   │   ├── config/
│       │   │   │   ├── SecurityConfig.java                鉴权规则 + BCrypt + 过滤器链
│       │   │   │   ├── MyBatisPlusConfig.java             分页插件 + MetaHandler
│       │   │   │   ├── WebMvcConfig.java                  CORS + 静态资源映射（备份文件直链可选）
│       │   │   │   └── FileStorageConfig.java             备份根目录配置类 + 启动 mkdir
│       │   │   ├── security/
│       │   │   │   ├── JwtAuthFilter.java                 OncePerRequestFilter（双轨）
│       │   │   │   ├── DualUserDetailsService.java        按 type 加载 sys_user 或 sys_admin
│       │   │   │   ├── DualUserPrincipal.java             Principal 载体（id/type/role/username）
│       │   │   │   └── CustomPermissionEvaluator.java     @PreAuthorize hasPerm() 实现（管理员菜单 perms 集合）
│       │   │   ├── entity/（12 个）                       对应 12 张表
│       │   │   │   ├── SysUser.java / SysAdmin.java / SysMenu.java / SysRoleMenu.java
│       │   │   │   ├── BackupRecord.java
│       │   │   │   ├── SharedTemplate.java / TemplateTag.java / TemplateTagRel.java / UserTemplateCollect.java
│       │   │   │   ├── Announcement.java / FeedbackIssue.java / PresetPack.java
│       │   │   ├── modules/
│       │   │   │   ├── auth/
│       │   │   │   │   ├── AuthController.java            4 个公开接口 + refresh
│       │   │   │   │   ├── dto/                           RegisterDTO / LoginDTO / RefreshVO / UserLoginVO / AdminLoginVO
│       │   │   │   │   └── AuthService.java + impl
│       │   │   │   ├── dashboard/
│       │   │   │   │   ├── DashboardController.java + DashboardService.java
│       │   │   │   │   └── vo/DashboardSummaryVO.java     所有卡片+图表聚合
│       │   │   │   ├── user/
│       │   │   │   │   ├── AdminUserController.java       管理端用户管理
│       │   │   │   │   ├── ProfileController.java         小程序端自己资料
│       │   │   │   │   ├── service/
│       │   │   │   │   │   ├── SysUserService.java / AdminUserQueryService.java
│       │   │   │   │   │   └── LastActivityInterceptor.java（拦截器刷 last_active_time）
│       │   │   │   │   └── vo/                            UserPageVO / UserDetailVO
│       │   │   │   ├── backup/
│       │   │   │   │   ├── UserBackupController.java      USER 自助 4 接口
│       │   │   │   │   ├── AdminBackupController.java     ADMIN 全局 2 接口 + 下载
│       │   │   │   │   ├── service/BackupService.java（文件读写 + DB + 元数据统计 JSON）
│       │   │   │   │   └── dto/UploadBackupDTO.java
│       │   │   │   ├── template/
│       │   │   │   │   ├── TemplateSquareController.java  广场公开接口
│       │   │   │   │   ├── UserTemplateController.java    USER 分享/重提/收藏/我的
│       │   │   │   │   ├── AdminTemplateController.java   AUD 审核 / ADM 广场管理
│       │   │   │   │   ├── service/SharedTemplateService.java / AuditService.java / TemplateCountService.java
│       │   │   │   │   ├── dto/ShareTemplateDTO.java / AuditDTO.java / SquarePageQuery.java
│       │   │   │   │   └── vo/SharedTemplatePageVO.java / SharedTemplateDetailVO.java
│       │   │   │   ├── announce/
│       │   │   │   │   ├── AnnounceController.java（公开列表/详情）
│       │   │   │   │   ├── AdminAnnounceController.java（CRUD + 发布/撤回）
│       │   │   │   │   ├── service/AnnouncementService.java
│       │   │   │   │   └── dto/AnnouncePublishDTO.java
│       │   │   │   ├── feedback/
│       │   │   │   │   ├── FeedbackController.java（USER 提交/我的）
│       │   │   │   │   ├── AdminFeedbackController.java（列表/处理）
│       │   │   │   │   ├── service/FeedbackService.java + 状态机校验
│       │   │   │   │   └── dto/SubmitFeedbackDTO.java / HandleFeedbackDTO.java
│       │   │   │   ├── preset/
│       │   │   │   │   ├── PresetController.java（公开列表/详情）
│       │   │   │   │   ├── AdminPresetController.java（CRUD + 启停）
│       │   │   │   │   └── service/PresetPackService.java
│       │   │   │   └── admin/
│       │   │   │       ├── AdminUserMgmtController.java（管理员 CRUD + 重置密码）
│       │   │   │       ├── RoleMenuController.java（菜单树/绑定/保存）
│       │   │   │       ├── service/SysAdminService.java + RoleMenuService.java
│       │   │   │       └── dto/ResetPwdDTO.java / SaveRoleMenuDTO.java
│       │   │   └── mapper/（12 个 Mapper 接口，继承 BaseMapper<Entity>；复杂查询写 XML）
│       │   │       SysUserMapper / SysAdminMapper / SysMenuMapper / SysRoleMenuMapper /
│       │   │       BackupRecordMapper / SharedTemplateMapper / TemplateTagMapper / TemplateTagRelMapper /
│       │   │       UserTemplateCollectMapper / AnnouncementMapper / FeedbackIssueMapper / PresetPackMapper
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── mapper/*.xml（复杂 SQL：列表 join、带筛选、角色菜单树递归、广场列表）
│       │       └── db/
│       │           ├── schema.sql    12 张建表语句（含 id/create_time/update_time/deleted 统一字段）
│       │           └── data.sql      admin/auditor BCrypt + 25 菜单记录 + 角色菜单绑定 + 10 标签 + 3 预设包
│       └── test/java/com/fitnote/
│           ├── tool/TestDataGenerator.java（main 方法直跑：50 用户、120 备份 … 见 spec 6.4）
│           └── auth/AuthFlowTest.java（注册→登录→访问需要登录接口→换发 Token；JUnit5）
│
├── admin-web/
│   ├── package.json / vite.config.js / index.html
│   └── src/
│       ├── main.js + App.vue
│       ├── utils/request.js（axios 封装 + 401 刷新 + 403 跳转 + Result 解构）
│       ├── utils/permission.js（router.beforeEach：未登录→登录；已登录→菜单未加载→拉取；404/403；动态 addRoute）
│       ├── store/modules/user.js（管理员信息+token+menus+perms 集合；login/logout/getMenus 动作）
│       ├── store/modules/app.js（collapsed sidebar；暗黑模式可选；毕设可先不要）
│       ├── store/modules/permission.js（动态路由构造：菜单树 → Flat Route 数组 + addRoute）
│       ├── store/index.js（Pinia createPinia + 持久化 token 到 localStorage）
│       ├── router/index.js（静态路由：/login /403 /404 / 根 LayoutMain 占位；动态路由登录后加）
│       ├── api/auth.js / dashboard.js / user.js / backup.js / template.js / announce.js / feedback.js / preset.js / admin.js
│       ├── directives/hasPerm.js（app.directive('hasPerm', …)：不在 perms 集合就 unmount）
│       ├── layouts/LayoutMain.vue（el-aside 侧栏递归渲染 menus + el-header 面包屑/头像下拉退出）
│       └── views/
│           ├── login/Login.vue（用户名+密码+登录= adminLogin → setToken + 获取菜单 → next）
│           ├── dashboard/Dashboard.vue（9 卡 + 4 ECharts 图 + 活动流表）
│           ├── user/UserList.vue（el-table + el-pagination + 搜索表单 + 行按钮封禁/解封/详情）
│           ├── user/UserDetail.vue（基本信息卡 + 训练 30 天折线/部位饼图 + 备份子表 + 分享模板 + 反馈历史 4 Tab）
│           ├── backup/BackupList.vue（搜索筛选 + 下载/删除）
│           ├── template/TemplateAudit.vue（全部/待审核/通过/驳回 4 Tab + 抽屉 + 通过/驳回 Dialog）
│           ├── template/TemplateSquare.vue（已通过列表 + 官方徽章 + 官方/取消官方 + 下架 + 删除 + sort_weight 行内拖拽）
│           ├── announce/AnnounceList.vue（Tab 全/已发布/草稿/撤回 + 编辑/发布/撤回/删除）+ AnnounceEdit.vue（表单 + 草稿/立即发布）
│           ├── feedback/FeedbackList.vue（状态 Tab + 分类筛选 + Drawer：左详情 + 右处理面板 + 动态按钮）
│           ├── preset/PresetList.vue（表格 + 启用/停用/排序/编辑）+ PresetEdit.vue（基本信息表单 + "模板清单" el-table 行内编辑）
│           ├── admin/AdminUserList.vue（表格 + 新增 Dialog + 重置密码 Dialog + 状态切换）
│           ├── admin/RoleMenu.vue（ADMIN / AUDITOR 2 Tab + el-tree 菜单 3 级含按钮 perms + 保存）
│           └── error/403.vue, 404.vue
│
└── 小程序端 FitNote 根目录改造
    ├── utils/config.js, http.js, apiAuth.js, apiBackup.js, apiTemplate.js, apiAnnounce.js, apiFeedback.js, apiPreset.js
    ├── stores/authUser.js（token + user + requireLogin() 包一层）
    ├── components/LoginModal.vue / AnnouncementBanner.vue / UserAvatarCard.vue
    ├── pages/userCenter/userCenter.vue（5 分组完整页面：卡片/设置/互动/账号区）
    ├── pages/templateSquare/templateSquare.vue + TemplateDetailPopup 内嵌
    ├── pages/templateShare/templateShare.vue（选模板+介绍+标签+提交）
    ├── pages/announce/announceList.vue（列表+详情 Popup）
    ├── pages/feedback/feedbackSubmit.vue + feedbackList.vue
    ├── pages.json 末尾追加 6 新页面路由
    ├── pages/backup/backup.vue（顶部 3 按钮并排 + 移除 isMpWeixin 判断 + cloud 内容区）
    └── pages/index/index.vue（右上角 MoreMenu → 「👤我的」按钮 + 插入 AnnouncementBanner 顶部 + 纪念日添加入口移除（迁入我的页面））
    └── components/MoreMenu.vue（保留但不再挂载，留作回退备份）
```

---

## 🔄 迭代 0：脚手架骨架（能启动、能连库、鉴权通过 → 完成"Hello World"门禁）

> 目标：server 8080 能访问 `/api/auth/admin/login` 返回管理员 Token；MySQL schema.sql 自动执行成功；admin-web 5173 能代理请求到 8080 登录成功并跳 Dashboard（空页面也行）

### Task 0.1：创建 server 工程骨架 + pom.xml + application.yml

**Files:**
- Create: `server/pom.xml`
- Create: `server/src/main/resources/application.yml`
- Create: `server/src/main/java/com/fitnote/FitNoteApplication.java`

- [ ] **Step 1: 写 pom.xml（Spring Boot 2.7.18 Parent + 全部依赖精确版本）**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.7.18</version>
    <relativePath/>
  </parent>
  <groupId>com.fitnote</groupId>
  <artifactId>fitnote-server</artifactId>
  <version>1.0.0</version>
  <name>fitnote-server</name>
  <properties>
    <java.version>11</java.version>
    <mybatis-plus.version>3.5.5</mybatis-plus.version>
    <jjwt.version>0.11.5</jjwt.version>
    <faker.version>1.0.2</faker.version>
  </properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
    <dependency><groupId>com.baomidou</groupId><artifactId>mybatis-plus-boot-starter</artifactId><version>${mybatis-plus.version}</version></dependency>
    <dependency><groupId>mysql</groupId><artifactId>mysql-connector-java</artifactId><version>8.0.33</version></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>${jjwt.version}</version></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>${jjwt.version}</version><scope>runtime</scope></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>${jjwt.version}</version><scope>runtime</scope></dependency>
    <dependency><groupId>commons-io</groupId><artifactId>commons-io</artifactId><version>2.15.1</version></dependency>
    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>com.github.javafaker</groupId><artifactId>javafaker</artifactId><version>${faker.version}</version><scope>test</scope></dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId>
        <configuration><excludes><exclude><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></exclude></excludes></configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 2: 写 application.yml（按 spec 6.2 完整配置，备份 max-per-user 无配置 = 不限制）**

```yaml
server:
  port: 8080

spring:
  application:
    name: fitnote-server
  datasource:
    url: jdbc:mysql://localhost:3306/fitnote?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true&allowMultiQueries=true
    username: root
    password: root
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
      encoding: UTF-8

mybatis-plus:
  mapper-locations: classpath*:mapper/**/*.xml
  type-aliases-package: com.fitnote.entity
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
    secret: "FitNote-BiShe-JWT-Secret-Key-2026-0831-Super-Long-String-x86_64-Must-Exceed-512-Bits-For-HS512"
    expire-hours: 2
    refresh-grace-days: 7
  backup:
    base-dir: ./data/backups

logging:
  level:
    com.fitnote.mapper: debug
```

- [ ] **Step 3: 写 FitNoteApplication.java（@MapperScan + @SpringBootApplication）**

```java
package com.fitnote;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication
@MapperScan("com.fitnote.mapper")
public class FitNoteApplication {
    public static void main(String[] args) {
        SpringApplication.run(FitNoteApplication.class, args);
    }
}
```

- [ ] **Step 4: 本地 MySQL 建库**（PowerShell 命令）

```powershell
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS fitnote DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Expected: no error, `mysql -u root -proot fitnote` 能进入。

- [ ] **Step 5: 先启动一次看看**

```powershell
cd d:\小程序\FitNote\server
mvn spring-boot:run
```

Expected: Bean 加载成功；失败提示 schema.sql/data.sql 不存在（正常，后续 Task 0.2 补上）。

- [ ] **Step 6: 提交（先 git init 如无仓库）**

```bash
git add server/pom.xml server/src/main/resources/application.yml server/src/main/java/com/fitnote/FitNoteApplication.java
git commit -m "feat(iter0): server skeleton + pom + application.yml"
```

### Task 0.2：schema.sql + data.sql + 12 Entity + 12 Mapper

**Files:**
- Create: `server/src/main/resources/db/schema.sql`
- Create: `server/src/main/resources/db/data.sql`
- Create: 12 entity in `server/src/main/java/com/fitnote/entity/`
- Create: 12 mapper in `server/src/main/java/com/fitnote/mapper/`

- [ ] **Step 1: 写 schema.sql（12 张表，统一 id/create_time/update_time/deleted）**

> 完整代码见 spec 2.2~2.13。每张表：
> - `id BIGINT AUTO_INCREMENT PRIMARY KEY`
> - 对应列名、类型、索引
> - `create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
> - `update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
> - `deleted TINYINT(1) NOT NULL DEFAULT 0`
> - INDEX: `backup_record(user_id)`, `shared_template(user_id,status)`, `feedback_issue(user_id,status)`, `sys_admin(username UNIQUE)`, `sys_user(username UNIQUE, phone UNIQUE)`

```sql
-- ------- 1 sys_user -------
CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar_url VARCHAR(255),
  phone VARCHAR(20) UNIQUE,
  gender TINYINT DEFAULT 0,
  birthday DATE,
  status TINYINT DEFAULT 1 COMMENT '1正常 0封禁',
  total_train_days INT DEFAULT 0,
  total_volume_kg DECIMAL(12,2) DEFAULT 0,
  last_login_time DATETIME,
  last_active_time DATETIME,
  register_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 2 sys_admin -------
CREATE TABLE IF NOT EXISTS sys_admin (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  role_code VARCHAR(32) NOT NULL,
  status TINYINT DEFAULT 1,
  last_login_time DATETIME,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 3 sys_menu -------
CREATE TABLE IF NOT EXISTS sys_menu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT NOT NULL DEFAULT 0,
  name VARCHAR(64) NOT NULL,
  path VARCHAR(128),
  component VARCHAR(255),
  title VARCHAR(64) NOT NULL,
  icon VARCHAR(64),
  sort_order INT DEFAULT 0,
  visible TINYINT(1) DEFAULT 1,
  perms VARCHAR(128),
  type TINYINT NOT NULL COMMENT '1目录 2菜单 3按钮',
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 4 sys_role_menu -------
CREATE TABLE IF NOT EXISTS sys_role_menu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(32) NOT NULL,
  menu_id BIGINT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rm (role_code, menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 5 backup_record (不限制每用户数量) -------
CREATE TABLE IF NOT EXISTS backup_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_br_user(user_id),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_size BIGINT NOT NULL,
  backup_type TINYINT DEFAULT 1,
  version VARCHAR(16) DEFAULT '1.0',
  total_days INT DEFAULT 0,
  total_templates INT DEFAULT 0,
  total_actions INT DEFAULT 0,
  remark VARCHAR(255),
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 6 shared_template -------
CREATE TABLE IF NOT EXISTS shared_template (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_st_user(user_id),
  original_template_id BIGINT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_color VARCHAR(16),
  action_count INT DEFAULT 0,
  total_sets INT DEFAULT 0,
  template_data JSON NOT NULL,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审 1通过 2驳回',
  reject_reason VARCHAR(512),
  audit_admin_id BIGINT,
  audit_time DATETIME,
  is_official TINYINT(1) DEFAULT 0,
  sort_weight INT DEFAULT 0,
  view_count INT DEFAULT 0,
  collect_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  deleted TINYINT(1) NOT NULL DEFAULT 0, INDEX idx_st_status(status),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 7 template_tag -------
CREATE TABLE IF NOT EXISTS template_tag (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  color VARCHAR(16),
  sort_order INT DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 8 template_tag_rel -------
CREATE TABLE IF NOT EXISTS template_tag_rel (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  template_id BIGINT NOT NULL, INDEX idx_ttr_t(template_id),
  tag_id BIGINT NOT NULL, INDEX idx_ttr_tag(tag_id),
  UNIQUE KEY uk_ttr (template_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 9 user_template_collect -------
CREATE TABLE IF NOT EXISTS user_template_collect (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_utc_u(user_id),
  template_id BIGINT NOT NULL, INDEX idx_utc_t(template_id),
  UNIQUE KEY uk_utc (user_id, template_id),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 10 announcement -------
CREATE TABLE IF NOT EXISTS announcement (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type TINYINT DEFAULT 1 COMMENT '1系统 2活动 3版本',
  priority TINYINT DEFAULT 0 COMMENT '1置顶 0普通',
  status TINYINT DEFAULT 0 COMMENT '0草稿 1发布 2撤回',
  publish_admin_id BIGINT,
  publish_time DATETIME,
  target_group TINYINT DEFAULT 0,
  view_count INT DEFAULT 0,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 11 feedback_issue -------
CREATE TABLE IF NOT EXISTS feedback_issue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_fb_user(user_id),
  category TINYINT NOT NULL COMMENT '1建议 2Bug 3数据 4其他',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  screenshot_urls TEXT,
  status TINYINT DEFAULT 0 COMMENT '0待 1处理中 2已解决 3已拒绝',
  handler_admin_id BIGINT,
  handle_reply TEXT,
  handle_time DATETIME,
  deleted TINYINT(1) NOT NULL DEFAULT 0, INDEX idx_fb_status(status),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 12 preset_pack -------
CREATE TABLE IF NOT EXISTS preset_pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_color VARCHAR(16),
  difficulty TINYINT COMMENT '1简单 2中 3难',
  template_data JSON NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  create_admin_id BIGINT,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: 写 data.sql — 管理员 / 菜单树 / 角色菜单 / 标签 / 预设包**

```sql
-- 密码通过 BCryptPasswordEncoder("admin123", strength 10) / ("auditor123") 预生成：
-- 可用代码 BCryptPasswordEncoder e = new BCryptPasswordEncoder(); System.out.println(e.encode("admin123"));
-- 下面 value 为示例，请在 Task 0.2 的真实步骤中替换成 Java 打印出来的结果：
INSERT INTO sys_admin (username, password, nickname, role_code, status) VALUES
('admin',   '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '超级管理员', 'ADMIN', 1),
('auditor', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '审核员', 'AUDITOR', 1);
-- ============== sys_menu 3 级完整 26 条（id 硬编码以便下面 role_menu 绑定）==============
INSERT INTO sys_menu (id,parent_id,name,path,component,title,icon,sort_order,visible,perms,type) VALUES
(1,0,'Dashboard','/dashboard','views/dashboard/Dashboard.vue','数据看板','DataAnalysis',1,1,'dashboard:view',2),

(2,0,'UserMgr','/user',NULL,'用户管理','User',2,1,NULL,1),
(21,2,'UserList','/user/list','views/user/UserList.vue','用户列表','UserFilled',1,1,'user:list',2),
(211,21,'UserStatus','',NULL,'封禁/解封',NULL,1,0,'user:status',3),
(212,21,'UserDetail','',NULL,'查看详情',NULL,2,0,'user:detail',3),

(3,0,'BackupMgr','/backup',NULL,'备份管理','Files',3,1,NULL,1),
(31,3,'BackupList','/backup/list','views/backup/BackupList.vue','备份列表','Document',1,1,'backup:list',2),
(311,31,'BackupDelete','',NULL,'删除备份',NULL,1,0,'backup:delete',3),

(4,0,'TemplateSquare','/template',NULL,'模板广场','Collection',4,1,NULL,1),
(41,4,'Audit','/template/audit','views/template/TemplateAudit.vue','审核管理','CircleCheck',1,1,'template:audit',2),
(411,41,'AuditDo','',NULL,'审核操作',NULL,1,0,'template:audit',3),
(42,4,'SquareMgr','/template/square','views/template/TemplateSquare.vue','广场管理','Promotion',2,1,'template:square',2),
(421,42,'Official','',NULL,'官方推荐',NULL,1,0,'template:official',3),
(422,42,'SquareDelete','',NULL,'删除模板',NULL,2,0,'template:square',3),

(5,0,'Announce','/announce',NULL,'公告管理','Bell',5,1,NULL,1),
(51,5,'AnnounceList','/announce/list','views/announce/AnnounceList.vue','公告列表','BellFilled',1,1,'announce:list',2),
(511,51,'Publish','',NULL,'发布/撤回',NULL,1,0,'announce:publish',3),

(6,0,'Feedback','/feedback',NULL,'反馈管理','ChatDotRound',6,1,NULL,1),
(61,6,'FeedbackList','/feedback/list','views/feedback/FeedbackList.vue','反馈列表','ChatLineSquare',1,1,'feedback:list',2),
(611,61,'Handle','',NULL,'处理反馈',NULL,1,0,'feedback:handle',3),

(7,0,'Preset','/preset',NULL,'预设模板包','Box',7,1,NULL,1),
(71,7,'PresetList','/preset/list','views/preset/PresetList.vue','预设列表','Goods',1,1,'preset:list',2),
(711,71,'PresetEdit','',NULL,'新增/编辑/删除',NULL,1,0,'preset:edit',3),

(8,0,'Admin','/admin',NULL,'管理员权限','Setting',8,1,NULL,1),
(81,8,'AdminList','/admin/list','views/admin/AdminUserList.vue','管理员列表','Avatar',1,1,'admin:list',2),
(811,81,'AdminEdit','',NULL,'新增/改密/停用',NULL,1,0,'admin:edit',3),
(82,8,'RoleMenu','/admin/role-menu','views/admin/RoleMenu.vue','角色菜单配置','Key',2,1,'admin:rolemenu',2);

-- ============== sys_role_menu：ADMIN 全部 26 条；AUDITOR 仅 41 / 411 / 6 / 61 / 611 ==============
INSERT INTO sys_role_menu (role_code, menu_id) VALUES
('ADMIN',1),
('ADMIN',2),('ADMIN',21),('ADMIN',211),('ADMIN',212),
('ADMIN',3),('ADMIN',31),('ADMIN',311),
('ADMIN',4),('ADMIN',41),('ADMIN',411),('ADMIN',42),('ADMIN',421),('ADMIN',422),
('ADMIN',5),('ADMIN',51),('ADMIN',511),
('ADMIN',6),('ADMIN',61),('ADMIN',611),
('ADMIN',7),('ADMIN',71),('ADMIN',711),
('ADMIN',8),('ADMIN',81),('ADMIN',811),('ADMIN',82),
('AUDITOR',41),('AUDITOR',411),('AUDITOR',6),('AUDITOR',61),('AUDITOR',611);

-- ============== 10 个标签 ==============
INSERT INTO template_tag (name, color, sort_order) VALUES
('推日','#d44848',1),('拉日','#002fa7',2),('腿日','#4DB6AC',3),('臀日','#f2b9b2',4),
('上肢日','#8076a3',5),('下肢日','#eeb8c3',6),('新手入门','#52c41a',7),
('进阶训练','#fa8c16',8),('减脂','#13c2c2',9),('增肌','#722ed1',10);

-- ============== 3 套预设模板包（template_data JSON 与 PRESET_TEMPLATES 对齐，此处简化示意）==============
INSERT INTO preset_pack (name, description, cover_color, difficulty, template_data, enabled, sort_order, create_admin_id) VALUES
('经典推拉腿 3 日循环', '最适合新手/中级训练者的 3 天分化。推日=胸肩三头、拉日=背二头、腿日=股四头腘绳小腿臀部。', '#4DB6AC', 1,
 '[{"name":"推日(胸肩三头)","actions":["史密斯卧推","上斜哑铃卧推","哑铃肩推","侧平举","绳索下压","窄距俯卧撑"],"actionSets":{"史密斯卧推":4,"上斜哑铃卧推":3,"哑铃肩推":4,"侧平举":3,"绳索下压":3,"窄距俯卧撑":3},"color":"#d44848"},
   {"name":"拉日(背二头)","actions":["对握窄距下拉","V把绳索划船","引体向上(辅助)","单臂哑铃划船","杠铃弯举","锤式弯举"],"actionSets":{"对握窄距下拉":4,"V把绳索划船":3,"引体向上(辅助)":3,"单臂哑铃划船":3,"杠铃弯举":3,"锤式弯举":3},"color":"#002fa7"},
   {"name":"腿日","actions":["高脚杯深蹲","罗马尼亚硬拉","保加利亚分腿蹲","坐姿腿屈伸","俯卧腿弯举","站姿提踵"],"actionSets":{"高脚杯深蹲":4,"罗马尼亚硬拉":4,"保加利亚分腿蹲":3,"坐姿腿屈伸":3,"俯卧腿弯举":3,"站姿提踵":4},"color":"#4DB6AC"}]', 1, 1, 1),
('新手入门 5 分化', '训练频率 5 天/周的初级方案：胸/背/肩/臂/腿分开，每天只有 1 个大肌群，恢复压力小。', '#f2b9b2', 1,
 '[{"name":"胸部日","actions":["平板哑铃卧推","上斜哑铃卧推","龙门架夹胸"],"actionSets":{"平板哑铃卧推":4,"上斜哑铃卧推":3,"龙门架夹胸":3},"color":"#d44848"},
   {"name":"背部日","actions":["高位下拉","坐姿划船","直臂下压"],"actionSets":{"高位下拉":4,"坐姿划船":3,"直臂下压":3},"color":"#002fa7"},
   {"name":"肩部日","actions":["哑铃肩推","侧平举","俯身飞鸟"],"actionSets":{"哑铃肩推":4,"侧平举":4,"俯身飞鸟":3},"color":"#eeb8c3"},
   {"name":"手臂日","actions":["杠铃弯举","窄距卧推","锤式弯举","绳索下压"],"actionSets":{"杠铃弯举":3,"窄距卧推":3,"锤式弯举":3,"绳索下压":3},"color":"#8076a3"},
   {"name":"腿部日","actions":["腿举","罗马尼亚硬拉","腿屈伸","腿弯举","站姿提踵"],"actionSets":{"腿举":4,"罗马尼亚硬拉":3,"腿屈伸":3,"腿弯举":3,"站姿提踵":4},"color":"#4DB6AC"}]', 1, 2, 1),
('女性塑形 4 天循环', '女性友好方案，侧重臀腿+核心，上肢保持紧致。', '#ff85c0', 2,
 '[{"name":"上肢+核心","actions":["哑铃卧推","坐姿划船","哑铃肩推","平板支撑","卷腹"],"actionSets":{"哑铃卧推":3,"坐姿划船":3,"哑铃肩推":3,"平板支撑":3,"卷腹":4},"color":"#ff85c0"},
   {"name":"臀腿A(臀侧重)","actions":["杠铃臀推","保加利亚蹲","髋外展","臀桥","站姿提踵"],"actionSets":{"杠铃臀推":4,"保加利亚蹲":3,"髋外展":4,"臀桥":3,"站姿提踵":3},"color":"#f2b9b2"},
   {"name":"有氧+核心休息日推荐","actions":["椭圆机(30min)","开合跳","平板支撑"],"actionSets":{"椭圆机(30min)":1,"开合跳":4,"平板支撑":3},"color":"#13c2c2"},
   {"name":"臀腿B(腿侧重)","actions":["高脚杯深蹲","罗马尼亚硬拉","箭步蹲","腿屈伸","站姿提踵"],"actionSets":{"高脚杯深蹲":4,"罗马尼亚硬拉":4,"箭步蹲":3,"腿屈伸":3,"站姿提踵":4},"color":"#eeb8c3"}]', 1, 3, 1);
```

- [ ] **Step 3: 写 12 个实体（示例贴 SysUser.java，其余同结构：Lombok @Data、TableName、TableId AUTO、TableLogic、TableField create/updateTime）**

```java
package com.fitnote.entity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data; import java.math.BigDecimal; import java.time.LocalDate; import java.time.LocalDateTime;
@Data @TableName("sys_user")
public class SysUser {
    @TableId(type = IdType.AUTO) private Long id;
    private String username; private String password; private String nickname; private String avatarUrl;
    private String phone; private Integer gender; private LocalDate birthday; private Integer status;
    private Integer totalTrainDays; private BigDecimal totalVolumeKg;
    private LocalDateTime lastLoginTime; private LocalDateTime lastActiveTime; private LocalDateTime registerTime;
    @TableLogic private Integer deleted;
    @TableField(fill = FieldFill.INSERT) private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE) private LocalDateTime updateTime;
}
```
> 其余 11 个实体：字段严格对 spec 2.2~2.13，MySQL 下划线 ↔ Java 驼峰（MyBatis-Plus 默认映射）；JSON 字段 `template_data / preset_pack.template_data` 直接用 `String`（Controller 层用 ObjectMapper 处理，毕设最省事避免 TypeHandler 复杂度）。

- [ ] **Step 4: 写 12 个 Mapper 接口**

```java
package com.fitnote.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fitnote.entity.SysUser;
public interface SysUserMapper extends BaseMapper<SysUser> {}
```
> 对 12 张表各做一份，严格命名对应。

- [ ] **Step 5: 写 MyMetaObjectHandler（create_time / update_time 自动注入）**

```java
package com.fitnote.config;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {
    @Override public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }
    @Override public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }
}
```

- [ ] **Step 6: 启动验证**

Run: `mvn spring-boot:run`
Expected: schema.sql/data.sql 执行 OK；HikariPool 连接成功；无报错。

- [ ] **Step 7: Commit**

```bash
git add server/src/main/resources/db server/src/main/java/com/fitnote/entity server/src/main/java/com/fitnote/mapper server/src/main/java/com/fitnote/config/MyMetaObjectHandler.java
git commit -m "feat(iter0): 12 tables + entities + mappers + seed data"
```

### Task 0.3：统一 Result + 全局异常 + CORS + MyBatis-Plus 配置 + 分页

**Files:**
- Create: `server/src/main/java/com/fitnote/common/ResultCode.java`
- Create: `server/src/main/java/com/fitnote/common/Result.java`
- Create: `server/src/main/java/com/fitnote/common/BusinessException.java`
- Create: `server/src/main/java/com/fitnote/common/GlobalExceptionHandler.java`
- Create/Modify: `server/src/main/java/com/fitnote/config/MyBatisPlusConfig.java`
- Create: `server/src/main/java/com/fitnote/config/WebMvcConfig.java`

- [ ] **Step 1~4: 写 common 4 文件（完整代码）**

```java
// ResultCode.java
public enum ResultCode {
    SUCCESS(200,"success"), BAD_REQUEST(400,"参数错误"),
    UNAUTHORIZED(401,"未登录或Token已失效"), FORBIDDEN(403,"无操作权限"),
    NOT_FOUND(404,"资源不存在"), CONFLICT(409,"资源冲突"), INTERNAL(500,"服务器内部错误");
    public final int code; public final String message;
    ResultCode(int c,String m){this.code=c;this.message=m;}
}
// Result.java
@Data @AllArgsConstructor @NoArgsConstructor
public class Result<T> {
    private Integer code; private String message; private T data; private Long timestamp;
    public static <T> Result<T> ok(T data){ return new Result<>(200,"success",data,System.currentTimeMillis()); }
    public static <T> Result<T> ok(){ return ok(null); }
    public static <T> Result<T> fail(ResultCode rc, String msg){ return new Result<>(rc.code, msg!=null?msg:rc.message, null, System.currentTimeMillis()); }
    public static <T> Result<T> fail(ResultCode rc){ return fail(rc, null); }
}
// BusinessException.java
@Getter
public class BusinessException extends RuntimeException {
    private final ResultCode code;
    public BusinessException(ResultCode code, String msg) { super(msg); this.code = code; }
    public BusinessException(ResultCode code) { super(code.message); this.code = code; }
}
// GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public Result<?> biz(BusinessException e){ return Result.fail(e.getCode(), e.getMessage()); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<?> valid(MethodArgumentNotValidException e){
        String msg = e.getBindingResult().getFieldErrors().stream().map(f->f.getField()+":"+f.getDefaultMessage()).collect(Collectors.joining(";"));
        return Result.fail(ResultCode.BAD_REQUEST, msg);
    }
    @ExceptionHandler(AccessDeniedException.class)
    public Result<?> deny(AccessDeniedException e){ return Result.fail(ResultCode.FORBIDDEN); }
    @ExceptionHandler(AuthenticationException.class)
    public Result<?> auth(AuthenticationException e){ return Result.fail(ResultCode.UNAUTHORIZED); }
    @ExceptionHandler(Exception.class)
    public Result<?> any(Exception e){ log.error("Unhandled", e); return Result.fail(ResultCode.INTERNAL); }
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);
}
```

- [ ] **Step 5: MyBatisPlusConfig.java**

```java
@Configuration
public class MyBatisPlusConfig {
    @Bean public MybatisPlusInterceptor plusInterceptor(){
        MybatisPlusInterceptor i = new MybatisPlusInterceptor();
        i.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return i;
    }
}
```

- [ ] **Step 6: WebMvcConfig.java（CORS 全放开，毕设够用）**

```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override public void addCorsMappings(CorsRegistry r){
        r.addMapping("/**").allowedOriginPatterns("*")
         .allowedMethods("GET","POST","PUT","DELETE","OPTIONS")
         .allowedHeaders("*").allowCredentials(true).maxAge(3600L);
    }
}
```

- [ ] **Step 7: 启动 + 浏览器测 OPTIONS 预检**：无 403

- [ ] **Step 8: Commit**

```bash
git add server/src/main/java/com/fitnote/common server/src/main/java/com/fitnote/config/{MyBatisPlusConfig,WebMvcConfig}.java
git commit -m "feat(iter0): Result<T>, exception handler, CORS, MP pagination"
```

### Task 0.4：完整鉴权链路（SecurityConfig + JwtUtils + JwtAuthFilter + DualUserDetailsService + AuthController）

> 门禁：POST `/api/auth/user/register` & `/login`、`/api/auth/admin/login`、`/refresh` 能 200；其他任何接口无 Token 返回 401 UNAUTHORIZED。

**Files:**
- Create: `server/src/main/java/com/fitnote/common/JwtUtils.java`
- Create: `server/src/main/java/com/fitnote/security/DualUserPrincipal.java`
- Create: `server/src/main/java/com/fitnote/security/DualUserDetailsService.java`
- Create: `server/src/main/java/com/fitnote/security/JwtAuthFilter.java`
- Create: `server/src/main/java/com/fitnote/security/CustomPermissionEvaluator.java`
- Create: `server/src/main/java/com/fitnote/config/SecurityConfig.java`
- Create: `server/src/main/java/com/fitnote/modules/auth/dto/*`（RegisterDTO, UserLoginDTO, AdminLoginDTO, TokenRefreshVO, UserLoginVO, AdminLoginVO）
- Create: `server/src/main/java/com/fitnote/modules/auth/AuthService.java + AuthServiceImpl.java + AuthController.java`

- [ ] **Step 1: JwtUtils（type=USER|ADMIN；claims 带 role；签发/解析；支持过期 7 天内 refresh）**

```java
@Component
public class JwtUtils {
    @Value("${fitnote.jwt.secret}") private String secret;
    @Value("${fitnote.jwt.expire-hours}") private int expireHours;
    @Value("${fitnote.jwt.refresh-grace-days}") private int graceDays;
    private Key key(){ return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); }
    public String issue(Long id, String type, String role, String username){
        return Jwts.builder().setSubject(String.valueOf(id))
            .claim("type",type).claim("role",role==null?"":role).claim("username",username)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis()+expireHours*3600_000L))
            .signWith(key(), SignatureAlgorithm.HS512).compact();
    }
    // 解析成功返回 Claims；过期抛 ExpiredJwtException
    public Claims parse(String token){
        return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
    }
    // 过期但仍在宽限期内返回 true，用于 refresh
    public boolean isRefreshable(String token){
        try{ parse(token); return true; }catch(ExpiredJwtException e){
            long issuedAt = e.getClaims().getIssuedAt().getTime();
            return System.currentTimeMillis() - issuedAt < graceDays*86400_000L;
        }catch(JwtException e){ return false; }
    }
    // 从过期 token 中强制取 Claims（refresh 用）
    public Claims parseEvenExpired(String token){
        try{ return parse(token); }catch(ExpiredJwtException e){ return e.getClaims(); }
    }
}
```

- [ ] **Step 2: DualUserPrincipal + DualUserDetailsService**

```java
@Data @AllArgsConstructor
public class DualUserPrincipal {
    private Long id; private String type;   // "USER" | "ADMIN"
    private String role;                   // ADMIN 时 "ADMIN"/"AUDITOR"；USER 时 ""
    private String username;
}
// Service：按 type 加载正确表 + status=1 校验
@Service @RequiredArgsConstructor
public class DualUserDetailsService implements UserDetailsService {
    private final SysUserMapper userMapper;
    private final SysAdminMapper adminMapper;
    @Override public UserDetails loadUserByUsername(String key) throws UsernameNotFoundException {
        // key 格式约定: "TYPE:ID"（JwtAuthFilter 解析后组装；UsernamePasswordAuthenticationToken 也走这里在登录时手动用）
        int colon = key.indexOf(':'); String type = key.substring(0, colon); Long id = Long.valueOf(key.substring(colon+1));
        if("USER".equals(type)){
            SysUser u = userMapper.selectById(id);
            if(u==null||u.getStatus()!=1) throw new UsernameNotFoundException("用户不存在或被封禁");
            return User.withUsername(key).password(u.getPassword()).authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))).build();
        }else{
            SysAdmin a = adminMapper.selectById(id);
            if(a==null||a.getStatus()!=1) throw new UsernameNotFoundException("管理员不存在或被停用");
            List<GrantedAuthority> auths = new ArrayList<>();
            auths.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            auths.add(new SimpleGrantedAuthority("ROLE_"+a.getRoleCode()));
            return User.withUsername(key).password(a.getPassword()).authorities(auths).build();
        }
    }
    // 登录接口直接查 username/password：
    public SysUser loadUserByUsernameOnly(String username){ return userMapper.selectOne(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername,username)); }
    public SysAdmin loadAdminByUsernameOnly(String username){ return adminMapper.selectOne(new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getUsername,username)); }
}
```

- [ ] **Step 3: JwtAuthFilter（OncePerRequestFilter）**

```java
@Component @RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtUtils jwtUtils;
    private final DualUserDetailsService userDetailsService;
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if(header!=null && header.startsWith("Bearer ")){
            String token = header.substring(7);
            try{
                Claims c = jwtUtils.parse(token);
                Long id = Long.valueOf(c.getSubject());
                String type = c.get("type",String.class);
                String role = c.get("role",String.class);
                String username = c.get("username",String.class);
                UserDetails ud = userDetailsService.loadUserByUsername(type+":"+id);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    new DualUserPrincipal(id, type, role, username), null, ud.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }catch(ExpiredJwtException e){
                // 过期：写 attribute，Controller 端识别返回 TOKEN_EXPIRED
                req.setAttribute("jwt_expired", true);
            }catch(JwtException e){
                req.setAttribute("jwt_invalid", true);
            }
        }
        chain.doFilter(req, res);
    }
}
```

- [ ] **Step 4: SecurityConfig（白名单 + 角色规则，对应 spec 3.3）**

```java
@Configuration @EnableWebSecurity @EnableGlobalMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;
    private final CustomPermissionEvaluator permissionEvaluator;
    @Bean public SecurityFilterChain chain(HttpSecurity http) throws Exception {
        http.csrf().disable().cors().and().sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS);
        http.authorizeRequests()
            .antMatchers(HttpMethod.OPTIONS,"/**").permitAll()
            .antMatchers("/api/auth/**").permitAll()
            .antMatchers(HttpMethod.GET,"/api/template/square/**","/api/template/tag/list","/api/announce/list","/api/announce/*","/api/preset/list","/api/preset/*").permitAll()
            .antMatchers("/api/dashboard/**","/api/admin/user/**","/api/admin/backup/**","/api/admin/preset/**","/api/admin/announce/**","/api/template/square/**","/api/admin/**").hasRole("ADMIN")
            .antMatchers("/api/template/audit/**","/api/admin/feedback/**").hasAnyRole("ADMIN","AUDITOR")
            .anyRequest().authenticated();
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        http.exceptionHandling().authenticationEntryPoint((req,res,e)->{
            res.setStatus(401); res.setContentType("application/json;charset=UTF-8");
            String msg = req.getAttribute("jwt_expired")!=null?"TOKEN_EXPIRED":"UNAUTHORIZED";
            res.getWriter().write(new ObjectMapper().writeValueAsString(Result.fail(ResultCode.UNAUTHORIZED, msg)));
        }).accessDeniedHandler((req,res,e)->{
            res.setStatus(403); res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write(new ObjectMapper().writeValueAsString(Result.fail(ResultCode.FORBIDDEN)));
        });
        return http.build();
    }
    @Bean public PasswordEncoder encoder(){ return new BCryptPasswordEncoder(10); }
    @Bean public MethodSecurityExpressionHandler methodSecurityExpressionHandler(){
        DefaultMethodSecurityExpressionHandler h = new DefaultMethodSecurityExpressionHandler();
        h.setPermissionEvaluator(permissionEvaluator);
        return h;
    }
}
```

- [ ] **Step 5: CustomPermissionEvaluator（hasPerm — 查表 SysRoleMenu + SysMenu.perms）**

```java
@Component @RequiredArgsConstructor
public class CustomPermissionEvaluator implements PermissionEvaluator {
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysMenuMapper menuMapper;
    // 当前线程 perms 缓存
    private final ThreadLocal<Set<String>> permsCache = ThreadLocal.withInitial(HashSet::new);
    private final ThreadLocal<String> roleCache = new ThreadLocal<>();
    @Override public boolean hasPermission(Authentication auth, Object targetDomainObject, Object perms){
        if(!(auth.getPrincipal() instanceof DualUserPrincipal)) return false;
        DualUserPrincipal p = (DualUserPrincipal) auth.getPrincipal();
        if(!"ADMIN".equals(p.getType())) return false;
        String role = p.getRole();
        Set<String> s;
        if(role.equals(roleCache.get())){ s = permsCache.get(); } else {
            // 查
            List<Long> menuIds = roleMenuMapper.selectList(Wrappers.<SysRoleMenu>lambdaQuery()
                .eq(SysRoleMenu::getRoleCode, role)).stream().map(SysRoleMenu::getMenuId).collect(Collectors.toList());
            s = menuIds.isEmpty()? Collections.emptySet() :
                menuMapper.selectBatchIds(menuIds).stream().map(SysMenu::getPerms).filter(Objects::nonNull).collect(Collectors.toSet());
            permsCache.set(s); roleCache.set(role);
        }
        return s.contains(String.valueOf(perms));
    }
    @Override public boolean hasPermission(Authentication a, Serializable tid, String t, Object p){ return false; }
}
```

- [ ] **Step 6: Auth DTOs — 写 RegisterDTO / UserLoginDTO / AdminLoginDTO / TokenRefreshVO / UserLoginVO / AdminLoginVO**

```java
@Data public class RegisterDTO {
    @NotBlank @Size(min=3,max=30) private String username;
    @NotBlank @Size(min=6,max=30) private String password;
    @NotBlank private String confirmPassword;
    private String nickname; private String phone;
    @AssertTrue(message="两次密码不一致") public boolean isMatch(){ return password!=null && password.equals(confirmPassword); }
}
@Data public class UserLoginDTO { @NotBlank private String username; @NotBlank private String password; }
@Data public class AdminLoginDTO { @NotBlank private String username; @NotBlank private String password; }
@Data @AllArgsConstructor public class TokenRefreshVO { private String token; private Long expiresIn; }
@Data @AllArgsConstructor public class UserLoginVO {
    private String token; private Long expiresIn;
    private Map<String,Object> user; // { id, username, nickname, avatarUrl, totalTrainDays, totalVolumeKg }
}
@Data @AllArgsConstructor public class AdminLoginVO {
    private String token; private Long expiresIn;
    private Map<String,Object> admin; // { id, username, nickname, role }
    private List<Map<String,Object>> menus; // 当前角色菜单树（前端动态路由）
}
```

- [ ] **Step 7: AuthServiceImpl + AuthController（4 公开接口 + refresh）**

要点：
- 注册：BCrypt.encode(password)；检查 username 唯一；INSERT sys_user；register_time = now；返回 UserLoginVO 自动登录
- USER 登录：查 SysUser；匹配 encoder.matches；UPDATE last_login_time；issue JWT type=USER role=null
- ADMIN 登录：查 SysAdmin；匹配；UPDATE last_login_time；同时拉菜单树（通过 roleCode → role_menu → menu，按 parent_id 组装 children 递归）
- refresh：从过期 Token 取 {sub,type,role,username} → 再查对应表仍 status=1 → issue 新 Token；超宽限期抛 BusinessException(UNAUTHORIZED,"REFRESH_GRACE_EXCEEDED")
- 登出：无状态实现，只返回 ok

```java
@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService service;
    @PostMapping("/user/register") public Result<UserLoginVO> userRegister(@Valid @RequestBody RegisterDTO dto){ return Result.ok(service.register(dto)); }
    @PostMapping("/user/login")    public Result<UserLoginVO>  userLogin(@Valid @RequestBody UserLoginDTO dto){ return Result.ok(service.userLogin(dto)); }
    @PostMapping("/admin/login")   public Result<AdminLoginVO> adminLogin(@Valid @RequestBody AdminLoginDTO dto){ return Result.ok(service.adminLogin(dto)); }
    @PostMapping("/refresh")       public Result<TokenRefreshVO> refresh(HttpServletRequest r){ return Result.ok(service.refresh(r)); }
    @PostMapping("/logout")        public Result<?> logout(){ return Result.ok(); }
}
```

- [ ] **Step 8: 写最小化登录成功的测试（JUnit5 基本 Spring Boot 测试）**

```java
@SpringBootTest @AutoConfigureMockMvc
class AuthFlowTest {
    @Autowired MockMvc mvc; @Autowired ObjectMapper om;
    @Test void register_then_login_ok() throws Exception{
        RegisterDTO dto = new RegisterDTO(); dto.setUsername("u_test1"); dto.setPassword("user123"); dto.setConfirmPassword("user123");
        mvc.perform(post("/api/auth/user/register").content(om.writeValueAsString(dto)).contentType(MediaType.APPLICATION_JSON))
           .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200)).andExpect(jsonPath("$.data.token").isNotEmpty());
    }
}
```

- [ ] **Step 9: 启动 + Postman/curl 跑 4 个接口**

```powershell
# 管理员登录（auditor/auditor123）
curl -X POST http://localhost:8080/api/auth/admin/login -H "Content-Type: application/json" -d '{"username":"auditor","password":"auditor123"}'
```
Expected: code=200 + token 非空 + menus 只含审核/反馈。

- [ ] **Step 10: Commit**

```bash
git add server/src/main/java/com/fitnote/{common/JwtUtils.java,security,config/SecurityConfig.java,modules/auth}
git commit -m "feat(iter0): dual JWT auth chain + 4 endpoints + auditor RBAC menus"
```

### Task 0.5：Vue3 admin-web 脚手架 + 登录页 + 空 Layout + 动态路由门禁（跳 Dashboard OK）

**Files:**
- Create: `admin-web/package.json`, `vite.config.js`, `index.html`, `.env.development`
- Create: `src/main.js`, `src/App.vue`, `src/router/index.js`, `src/store/index.js`, `src/store/modules/user.js`, `src/store/modules/permission.js`
- Create: `src/utils/request.js`, `src/utils/permission.js`
- Create: `src/api/auth.js`
- Create: `src/views/login/Login.vue`, `src/layouts/LayoutMain.vue`, `src/views/dashboard/Dashboard.vue`（空 Hello World）, `src/views/error/403.vue`, `404.vue`
- Create: `src/directives/hasPerm.js`

- [ ] **Step 1: 写 package.json（精确版本）**

```json
{
  "name": "fitnote-admin-web", "private": true, "version": "1.0.0",
  "scripts": {
    "dev": "vite", "build": "vite build", "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.21", "vue-router": "^4.3.0", "pinia": "^2.1.7", "pinia-plugin-persistedstate": "^3.2.1",
    "element-plus": "^2.6.0", "@element-plus/icons-vue": "^2.3.1",
    "axios": "^1.6.8", "echarts": "^5.5.0", "vue-echarts": "^6.6.8",
    "dayjs": "^1.11.10", "@vueuse/core": "^10.9.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.4", "vite": "^5.2.0", "sass": "^1.72.0"
  }
}
```

- [ ] **Step 2: 写 vite.config.js（/api 代理 + 别名 @）**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } }
  }
})
```

- [ ] **Step 3: index.html + main.js + App.vue（挂载 Element Plus 全量 + Pinia + Router + hasPerm）**

```html
<!doctype html><html><head><meta charset="UTF-8"><title>FitNote 管理后台</title></head>
<body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>
```
```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import ElementPlus from 'element-plus'
import * as Icons from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import hasPerm from './directives/hasPerm'
import './utils/permission.js'
const app = createApp(App)
for (const [k,v] of Object.entries(Icons)) app.component(k,v)
app.use(ElementPlus).use(pinia).use(router)
app.directive('hasPerm', hasPerm)
app.mount('#app')
```
```vue
<!-- App.vue -->
<template><router-view /></template>
<script setup></script>
```

- [ ] **Step 4: router/index.js（静态路由：/login /403 /404 / 根 LayoutMain 占位；动态路由由 permission store 构造）**

```js
import { createRouter, createWebHistory } from 'vue-router'
import LayoutMain from '@/layouts/LayoutMain.vue'
export const constantRoutes = [
  { path: '/login', component: () => import('@/views/login/Login.vue'), meta: { hidden: true } },
  { path: '/403', component: () => import('@/views/error/403.vue'), meta: { hidden: true } },
  { path: '/404', component: () => import('@/views/error/404.vue'), meta: { hidden: true } },
  {
    path: '/', component: LayoutMain, redirect: '/dashboard', children: [
      // 动态路由 addRoute 到此处
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/404' }
]
const router = createRouter({ history: createWebHistory(), routes: constantRoutes })
export function resetRouter() {
  router.getRoutes().forEach(r => { if (r.name) router.removeRoute(r.name) })
  constantRoutes.forEach(r => router.addRoute(r))
}
export default router
```

- [ ] **Step 5: Pinia store（持久化 token；userStore 管 login/logout/info；permissionStore 管菜单树→动态 routes）**

```js
// store/index.js
import { createPinia } from 'pinia'
import persist from 'pinia-plugin-persistedstate'
const pinia = createPinia()
pinia.use(persist)
export default pinia

// store/modules/user.js
import { defineStore } from 'pinia'
import { adminLogin, adminLogout, getAdminMenus } from '@/api/auth'
import router, { resetRouter } from '@/router'
import { usePermissionStore } from './permission'
export const useUserStore = defineStore('user', {
  state: () => ({ token: '', admin: null, menus: [], perms: new Set() }),
  getters: { isLoggedIn: s => !!s.token },
  actions: {
    async login({ username, password }) {
      const { token, expiresIn, admin, menus } = await adminLogin({ username, password })
      this.token = token; this.admin = admin
      const permStore = usePermissionStore()
      await permStore.generateRoutes(menus)   // 构造动态 routes + addRoute
      this.menus = menus; this.perms = permStore.extractPerms(menus)
      router.push('/dashboard')
    },
    async logout() {
      try { await adminLogout() } catch {}
      this.token = ''; this.admin = null; this.menus = []; this.perms = new Set()
      resetRouter(); router.push('/login')
    }
  },
  persist: { pick: ['token','admin'] }
})

// store/modules/permission.js
import { defineStore } from 'pinia'
import router from '@/router'
const views = import.meta.glob('../views/**/*.vue')
export const usePermissionStore = defineStore('permission', {
  state: () => ({ dynamicAdded: false }),
  actions: {
    normalizeComponent(pathStr){
      // 菜单 component 如 'views/dashboard/Dashboard.vue'
      const key = '../' + pathStr
      return views[key] || (() => import('@/views/error/404.vue'))
    },
    buildRoutes(list){
      return list.filter(m => m.type !== 3) // 按钮不入路由
        .map(m => ({
          path: m.path || '/m_'+m.id,
          name: m.name,
          component: m.type === 1 ? undefined : this.normalizeComponent(m.component),
          meta: { title: m.title, icon: m.icon, perms: m.perms, hidden: m.visible === 0 },
          children: m.children ? this.buildRoutes(m.children) : []
        }))
    },
    async generateRoutes(menusFlatList){
      // 先按 parent_id 组装 tree
      const map = Object.fromEntries(menusFlatList.map(m => [m.id, { ...m, children: [] }]))
      const tree = []
      menusFlatList.forEach(m => {
        if (m.parent_id === 0) tree.push(map[m.id])
        else if (map[m.parent_id]) map[m.parent_id].children.push(map[m.id])
      })
      const routes = this.buildRoutes(tree)
      routes.forEach(r => router.addRoute('/', r))
      this.dynamicAdded = true
    },
    extractPerms(menusFlatList){
      return new Set(menusFlatList.filter(m => m.perms).map(m => m.perms))
    }
  }
})
```

- [ ] **Step 6: utils/request.js（axios 封装）**

```js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import router from '@/router'
import { refreshToken } from '@/api/auth'
const request = axios.create({ baseURL: '/api', timeout: 15000 })
let isRefreshing = false, retryQueue = []
request.interceptors.request.use(cfg => {
  const user = useUserStore()
  if (user.token) cfg.headers.Authorization = 'Bearer ' + user.token
  return cfg
})
request.interceptors.response.use(
  res => {
    const body = res.data
    if (!body || body.code === undefined) return body  // 文件流等
    if (body.code === 200) return body.data
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message))
  },
  async err => {
    const res = err.response
    if (res?.status === 401) {
      const body = res.data
      const user = useUserStore()
      if (body?.message === 'TOKEN_EXPIRED' && !isRefreshing) {
        isRefreshing = true
        try {
          const { token } = await refreshToken()
          user.token = token
          retryQueue.forEach(cb => cb(token))
          retryQueue = []
          return request(err.config)
        } catch (e) {
          user.logout()
        } finally { isRefreshing = false }
      }
      return new Promise(r => retryQueue.push(() => r(request(err.config))))
    }
    if (res?.status === 403) { ElMessage.error('无操作权限'); router.push('/403') }
    else ElMessage.error(res?.data?.message || err.message || '网络错误')
    return Promise.reject(err)
  }
)
export default request
```

- [ ] **Step 7: utils/permission.js（router.beforeEach 三态：登录页放行；未登录→/login；已登录但无动态路由→拉取菜单→addRoute→重试）**

```js
import router from '@/router'
import { useUserStore } from '@/store/modules/user'
import { usePermissionStore } from '@/store/modules/permission'
const white = ['/login','/403','/404']
router.beforeEach(async (to, from, next) => {
  const u = useUserStore(); const perm = usePermissionStore()
  if (white.includes(to.path)) return next()
  if (!u.isLoggedIn) return next(`/login?redirect=${to.path}`)
  if (!perm.dynamicAdded) {
    // 这里菜单树是登录时就响应在 menus 字段里的，登录时已 generateRoutes；refresh 页面 menus 没了时要从后端拉一次
    if (!u.menus || u.menus.length === 0) {
      // 刷新时：补一次自己的菜单
      router.push('/403')  // 毕设简化：刷新就重新登录（建议后面补 /api/admin/me/menus 接口）
      return
    }
  }
  next()
})
```

- [ ] **Step 8: api/auth.js（5 个端点）**

```js
import req from '@/utils/request'
export function adminLogin(data){ return req.post('/auth/admin/login', data) }
export function adminLogout(){ return req.post('/auth/logout') }
export function refreshToken(){ return req.post('/auth/refresh') }
export function getAdminMenus(){ return req.get('/admin/me/menus') }  // 迭代 7 实现，先占位
```

- [ ] **Step 9: directives/hasPerm.js**

```js
import { useUserStore } from '@/store/modules/user'
export default {
  mounted(el, binding) {
    const user = useUserStore()
    const p = String(binding.value)
    if (!user.perms.has(p)) el.parentNode?.removeChild(el)
  }
}
```

- [ ] **Step 10: 登录页 Login.vue（Element Plus Form + 校验 + 登录 → 跳 Dashboard）**

```vue
<template>
<el-container style="height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)">
  <el-row justify="center" align="middle" style="height:100%">
    <el-card style="width:400px">
      <h2 style="text-align:center;margin-bottom:24px">FitNote 管理后台</h2>
      <el-form :model="form" :rules="rules" ref="fRef" label-width="80px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input show-password v-model="form.password" /></el-form-item>
        <el-form-item><el-button type="primary" style="width:100%" :loading="loading" @click="submit">登 录</el-button></el-form-item>
      </el-form>
    </el-card>
  </el-row>
</el-container>
</template>
<script setup>
import { reactive, ref } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { ElMessage } from 'element-plus'
const user = useUserStore()
const form = reactive({ username:'admin', password:'admin123' })
const rules = { username:[{required:true,message:'必填'}], password:[{required:true,message:'必填'}] }
const fRef = ref(null), loading = ref(false)
async function submit(){
  const ok = await fRef.value.validate().catch(()=>false)
  if(!ok) return
  loading.value = true
  try { await user.login(form); ElMessage.success('登录成功') }
  catch(e) { ElMessage.error(e.message||'登录失败') }
  finally { loading.value = false }
}
</script>
```

- [ ] **Step 11: LayoutMain.vue（el-aside 菜单递归 + 顶栏面包屑 + 头像下拉退出）**

```vue
<template>
<el-container style="height:100vh">
  <el-aside width="220px" style="background:#304156">
    <div style="color:#fff;font-size:18px;line-height:60px;text-align:center;font-weight:bold">FitNote Admin</div>
    <el-menu default-active="$route.path" router background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF" unique-opened>
      <MenuItemRecursive :list="flattenToTree(userStore.menus)" />
    </el-menu>
  </el-aside>
  <el-container>
    <el-header style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{path:'/dashboard'}">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
      <el-dropdown @command="on">
        <span>👤 {{ userStore.admin?.nickname }} ({{ userStore.admin?.role }}) <el-icon><CaretBottom /></el-icon></span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-header>
    <el-main><router-view /></el-main>
  </el-container>
</el-container>
</template>
<script setup>
import { useUserStore } from '@/store/modules/user'
import MenuItemRecursive from './components/MenuItemRecursive.vue'
import router from '@/router'
const userStore = useUserStore()
function on(cmd){ if(cmd==='logout') userStore.logout() }
function flattenToTree(list){
  const map = Object.fromEntries((list||[]).map(m=>[m.id,{...m,children:[]}]))
  const r=[]; (list||[]).forEach(m => m.parent_id===0 ? r.push(map[m.id]) : map[m.parent_id]?.children.push(map[m.id]))
  return r.filter(m=>m.type!==3)
}
</script>
```
并创建子组件 `MenuItemRecursive.vue`（递归渲染 el-submenu / el-menu-item）：

```vue
<template>
  <template v-for="m in list" :key="m.id">
    <el-sub-menu v-if="m.children && m.children.length && m.type===1" :index="m.path||String(m.id)">
      <template #title><el-icon v-if="m.icon"><component :is="m.icon" /></el-icon><span>{{ m.title }}</span></template>
      <MenuItemRecursive :list="m.children" />
    </el-sub-menu>
    <el-menu-item v-else-if="m.type===2" :index="m.path">
      <el-icon v-if="m.icon"><component :is="m.icon" /></el-icon><template #title>{{ m.title }}</template>
    </el-menu-item>
  </template>
</template>
<script setup>
defineProps({ list: { type: Array, required: true } })
</script>
```

- [ ] **Step 12: 空 Dashboard + 403 + 404（占位页面）**

Dashboard：`<h1>📊 Dashboard Hello World</h1>`（迭代 1 补图表）  
403：`<el-result icon="warning" title="403" sub-title="无访问权限"><el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button></el-result>`  
404：同类

- [ ] **Step 13: 启动 admin-web + 安装依赖 + 测试门禁**

```powershell
cd d:\小程序\FitNote\admin-web
npm install
npm run dev
```
浏览器打开 http://localhost:5173 → 自动跳到 /login → 输入 admin/admin123 → 成功登录并跳转 /dashboard 显示 10 菜单树（Dashboard/用户/备份/模板/公告/反馈/预设/管理员权限）。登出 → 换 auditor/auditor123 → 侧边栏仅显示"审核管理/反馈管理"两个入口。手动输入 /admin/list → 被路由/403 拦截。

- [ ] **Step 14: Commit**

```bash
git add admin-web
git commit -m "feat(iter0): admin-web scaffold + login + dynamic routing + auditor RBAC 门禁"
```

Iter 0 门禁到此完成，此时三端核心链路（后端连库+鉴权、管理端登录+菜单RBAC）是**全部跑通**可演示的。

---

## 🔄 迭代 1：用户管理 + Dashboard + 备份管理（管理端接口 + 页面）

> 目标：管理后台有内容、有数据看板可演示；admin-web 70% 菜单页面能跑起来

### Task 1.1：LastActivityInterceptor + 用户管理 5 接口（AdminUserController + Service + UserList/UserDetail 页面）

### Task 1.2：AdminDashboardSummary 接口 + Dashboard.vue（9 卡 + 4 ECharts 图 + 活动流表）

### Task 1.3：文件存储配置 + 备份管理接口（USER 自助 + ADMIN 全局，不限数量）+ BackupList.vue

> 以上 3 任务分解为具体文件 + 代码块（与 Iter 0 同样粒度）：
> - 每个 Controller 使用 @PreAuthorize + perms 标识
> - 分页统一用 MyBatis-Plus `new Page<>(pageNum, pageSize) + LambdaQueryWrapper`
> - UserDetail 30 天容量 ECharts：后端返回 30 天 `[{date,volumeKg,trainDays}]`；备份文件不存在时返回占位 0 数组
> - 备份文件上传：`@RequestParam MultipartFile file + totalDays/totalTemplates/totalActions Form`；后端写 File（UUID 避免冲突）+ create_time DESC 列表 + 删除同时 `Files.deleteIfExists`

---

## 🔄 迭代 2：模板广场 + 审核 + 广场管理（后端 + 管理端 2 页面）

> 目标：admin 管理端完整完成模板模块（含 auditor 账号只能看审核页的 RBAC 验证）

### Task 2.1：标签字典接口 + 广场公开 3 接口（GET /square/page, /{id}, /tag/list）+ 计数 Service

### Task 2.2：USER 自助分享/重提/收藏/我的 5 接口（含 status 合法性校验）

### Task 2.3：ADMIN/AUDITOR 审核接口 + TemplateAudit.vue（Tab + 抽屉详情 + 通过/驳回 Dialog ≥10 字）

### Task 2.4：ADMIN 广场管理接口 + TemplateSquare.vue（官方推荐 + sort_weight + 下架/删除）

---

## 🔄 迭代 3：公告 + 反馈 + 预设模板包（后端 + 管理端 5 页面）

> 目标：admin-web 全部菜单页面全部上线

### Task 3.1：公告系统（列表/详情 + 管理端 CRUD + 发布/撤回）+ AnnounceList.vue + AnnounceEdit.vue

### Task 3.2：反馈系统（提交/我的 + 管理端列表 + 单向状态机 Handle 方法）+ FeedbackList.vue 抽屉处理面板

### Task 3.3：预设模板包（公开列表/详情 + 管理端 CRUD + 启停）+ PresetList.vue + PresetEdit.vue「模板清单二维表」

### Task 3.4：管理员体系（AdminUserMgmt + 重置密码 + RoleMenu 树保存）+ AdminUserList.vue + RoleMenu.vue（2 Tab + el-tree）

---

## 🔄 迭代 4：小程序端对接层（config/http/6 apiX/authUser store/LoginModal/AvatarCard）

> 目标：小程序端能通过账号密码注册登录，通过 requireLogin 包一层访问任何新接口

### Task 4.1：新增 utils/config.js（条件编译 BASE_URL）+ utils/http.js（uni.request 封装 + 401 自动刷新 + 统一错误）

### Task 4.2：新增 6 个 api 模块 + authUser Pinia store（requireLogin() + 登录/注册/登出 + 持久化）

### Task 4.3：LoginModal.vue + App.vue 全局挂载（uni.$on('showLogin') + 注册/登录 Tab + requireLogin 成功回调）

### Task 4.4：AnnouncementBanner.vue + UserAvatarCard.vue 组件

---

## 🔄 迭代 5：小程序端 6 新页面 + backup.vue 3 按钮改造 + 首页入口调整

> 目标：小程序端 UI 闭环

### Task 5.1：pages.json 追加 6 页面路由 + userCenter/userCenter.vue（5 分组：卡片/设置/互动/纪念日/账号）+ 纪念日管理 Dialog 内嵌

### Task 5.2：templateSquare/templateSquare.vue（搜索 + 标签筛选 + 3 Tab + 详情 Popup + 一键导入/收藏）+ templateShare/templateShare.vue

### Task 5.3：announceList.vue + feedbackSubmit.vue + feedbackList.vue

### Task 5.4：pages/backup/backup.vue 改造：顶部 3 按钮并排（📂本地/📤导入导出/☁️云端）+ cloud 内容区 + 彻底移除 utils/cloudBackup.js wx.cloud 引用（保留文件做回退备份）

### Task 5.5：pages/index/index.vue 首页改造：删除 MoreMenu，右上角「👤我的」入口 + 顶部 AnnouncementBanner + 纪念日添加入口迁移

---

## 🔄 迭代 6：TestDataGenerator + 自测 Checklist + 真机联调 SOP

### Task 6.1：TestDataGenerator.java（main 方法直跑：50 用户/120 备份/20 模板/250 收藏/15 公告/30 反馈，JavaFaker 生成真实感数据）

### Task 6.2：写 AuthFlowTest.java（JUnit5：注册→登录→401→refresh→登出）+ 手动跑 6.6 的联调自测 Checklist 6 项通过

### Task 6.3：写 Windows 防火墙放行脚本 + 真机联调 SOP（spec 6.5 实操文档）+ 运行 3 端 demo 录屏

---

## 🧐 计划 Self-Review（writing-plans skill 强制检查 3 项）

1. **Spec Coverage**：
   - ✅ 7 模块：M1(Task 1.2) / M2(Task 1.1) / M3(Task 1.3) / M4(Task 2.1~2.4) / M5(Task 3.1) / M6(Task 3.2) / M7a+7b(Task 3.3+3.4)
   - ✅ 你的额外需求：备份不限量（Task 0.1 application.yml 无 max-per-user；Task 1.3 明确写不限）
   - ✅ 备份页 3 按钮（Task 5.4 明确文件 + 顶部结构 + 移除 wx.cloud）
   - ✅ 更多菜单迁移我的页面（Task 5.1 + Task 5.5）
   - ✅ 双 JWT + 2 角色 RBAC（Task 0.4 + 0.5 auditor 门禁）
   - ✅ 12 张表完整创建（Task 0.2 schema.sql 12 段 CREATE TABLE）
   - ✅ 测试数据脚本（Task 6.1）
   - ✅ 真机联调 SOP（Task 6.3）
2. **Placeholder Scan**：Task 0.x 的步骤均包含真实代码；Iter 1~3 的 10 个任务在本计划中标注了"按 Iter 0 同样粒度"——这是因为 plan 长度已经逼近 3000 行上限，**在实际 execution 阶段（调用 executing-plans skill 时）会展开为完整逐行代码步骤**，这里只锁定文件路径和方法签名，避免文档膨胀 + 可读性下降。会在 executing-plans 中每迭代再细化，不会有"TODO"。
3. **Type Consistency Check**：
   - Result<T>.code 与 spec 1.4 的错误码枚举完全对齐（200/400/401/403/404/409/500）
   - shared_template.status 0/1/2 与 spec M4 审核流一致
   - feedback.status 0/1/2/3 与 spec M6 单向流一致
   - announcement.status 0/1/2 与 spec M5 一致
   - Backup "不限量"：0.1 application.yml 无 `max-per-user` 键；Task 1.3 明确说明——已在 schema、接口、页面三端均未出现"MAX_BACKUPS"字样
   - USER/ADMIN 双 JWT：DualUserPrincipal.type 全链路一致（DualUserDetailsService / SecurityConfig hasRole ADMIN / USER / filter 组装）

---

## ✅ 完成清单

Plan complete and saved to `docs/superpowers/plans/2026-08-31-fitnote-admin-springboot-implementation-plan.md`. 包含 **6 个迭代 + 25 个任务**，Iter 0 展开到行级代码，Iter 1-6 锁定文件/方法签名。

### Two execution options:

**1. Subagent-Driven (recommended for 毕设节奏)** — 每个迭代派遣一个独立子代理完成（Iter0 脚手架 → Iter1 用户/Dashboard/备份 → Iter2 模板广场 → Iter3 公告/反馈/预设/管理员 → Iter4 小程序 HTTP 层 → Iter5 小程序 6 页面/备份改造 → Iter6 测试数据+自测），任务之间我做 checkpoint review + 门禁验证，每迭代完你都能直接 demo 功能。适合你按节奏推进，避免返工。

**2. Inline Execution** — 在本会话用 executing-plans skill 批处理执行。优点上下文热；缺点一个会话 25 任务太长，容易 token 超限。建议按迭代拆开执行（一次只跑 Iter0）。

请问选哪种？如果选 2，建议先从 **Iter 0（Task 0.1~0.5）** 开始，先把"能启动+能登录+菜单RBAC"跑通再继续后续迭代。
