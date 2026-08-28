# FitNote Code Wiki

> 健身记录小程序 · 结构化代码文档
> 技术栈：uni-app (Vue 3 Composition API) + Pinia + 微信小程序 / Android App
> 当前版本：v2.1.2（manifest.json versionCode 212）

---

## 目录

1. [项目概览](#1-项目概览)
2. [整体架构](#2-整体架构)
3. [目录结构](#3-目录结构)
4. [分层职责与模块说明](#4-分层职责与模块说明)
5. [数据流与状态管理](#5-数据流与状态管理)
6. [页面层（Pages）职责](#6-页面层pages职责)
7. [组件层（Components）职责](#7-组件层components职责)
8. [状态层（Stores）关键类与函数](#8-状态层stores关键类与函数)
9. [工具层（Utils）关键函数](#9-工具层utils关键函数)
10. [统计模块（trainingStat）](#10-统计模块trainingstat)
11. [云端与跨平台能力](#11-云端与跨平台能力)
12. [依赖关系](#12-依赖关系)
13. [项目运行方式](#13-项目运行方式)
14. [数据模型与存储约定](#14-数据模型与存储约定)
15. [附录](#15-附录)

---

## 1. 项目概览

FitNote 是一款面向健身爱好者的训练记录小程序，核心能力包括：

- **智能训练日历**：月历/年度视图，按模板配色区分训练部位，长按清空、点击进入当日训练。
- **训练记录与执行**：从动作库/模板选择动作，逐组录入重量+次数，自动与上次对比，内置组间休息计时器，支持递减组/暂停组/复合组与占位符组。
- **动作库管理**：6 大肌群 + 18 子类目，按关键词自动分类，侧滑删除级联更新所有日数据与模板。
- **训练模板系统**：创建/编辑模板、拖拽排序、配色、预设组数；支持"分化训练计划"（循环模式 / 周计划模式，自动推算今日位置）。
- **训练统计分析**：周/月柱状趋势、部位网格可视化、容量历史追踪与状态徽章（低/正常/高）。
- **数据备份与恢复**：本地 SAF 文件备份（全量/增量）、CSV 导出、剪贴板文本导入（智能模糊匹配）、微信云开发云端备份。
- **个性化设置**：深色/浅色主题、液态玻璃 UI、纪念日、首次启动引导。

---

## 2. 整体架构

FitNote 采用 uni-app 跨平台框架，编译产物同时支持微信小程序与 Android App。整体为**分层 + 单向数据流**架构：

```
┌──────────────────────────────────────────────────────────┐
│                        用户操作                           │
└──────────┬───────────────────────────────┬───────────────┘
           ▼                               ▼
    ┌─────────────┐               ┌───────────────┐
    │   Pages     │◄──── 事件 ───►│  Components   │
    │ (路由页面)   │               │ (可复用 UI)    │
    └──────┬──────┘               └───────┬───────┘
           │                               │
           ▼                               ▼
    ┌──────────────────────────────────────────────┐
    │               Pinia Stores                   │
    │  action │ dayData │ dayDataCache             │
    │  daySettings │ template │ initActions        │
    └────────────────────┬─────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌─────────────────┐      ┌──────────────────┐
   │  utils/* 工具层  │      │ uni.* Storage    │
   │ (纯函数业务逻辑) │      │ (本地持久化)      │
   └─────────────────┘      └──────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  跨平台 I/O                             │
   │  H5: Blob 下载                          │
   │  MP-WEIXIN: wx.cloud / FileSystemManager │
   │  APP-PLUS: Android SAF + plus.io        │
   └─────────────────────────────────────────┘
```

**架构要点：**

- **状态集中**：业务数据全部沉淀在 Pinia stores，stores 内部封装 `load()/save()`，与 `uni.setStorageSync` 双向同步。
- **工具层无状态**：`utils/*` 为纯函数模块，不持有状态，由 stores/pages 组合调用，便于测试与复用。
- **跨平台条件编译**：通过 `// #ifdef MP-WEIXIN / APP-PLUS / H5` 区分平台行为，主要差异集中在文件 I/O（[backup.js](file:///d:/小程序/FitNote/utils/backup.js)）与 Canvas（[canvasHelper.js](file:///d:/小程序/FitNote/utils/canvasHelper.js)）。
- **全局混入**：[main.js](file:///d:/小程序/FitNote/main.js) 通过 `app.mixin({ onShow(){ updateNavBar() } })` 在每次页面显示时同步导航栏主题色。

---

## 3. 目录结构

```
FitNote/
├── App.vue                 # 应用入口（云开发初始化、引导页、ActivityResult 监听）
├── main.js                 # Vue 3 + Pinia 启动、全局 onShow 混入
├── manifest.json           # 应用配置（AppID、Android 权限、版本）
├── pages.json              # 页面路由配置（10 个页面）
├── index.html              # H5 入口模板
├── uni.scss                # uni-app 全局样式变量
├── vue.config.js           # Vue CLI 配置
│
├── pages/                  # 页面目录
│   ├── index/              # 首页（月历 index.vue / 训练日 day.vue）
│   ├── actionHistory/      # 动作历史
│   ├── actionLibrary/      # 动作库管理
│   ├── manageActions/      # 当日动作排序管理
│   ├── templateDetail/     # 模板详情编辑
│   ├── templateManager/    # 模板列表管理
│   ├── trainingStat/       # 训练统计（含 components/、statUtil.js、volumeHistory.js）
│   ├── year/               # 年度总览
│   └── backup/             # 数据备份与恢复
│
├── components/             # 公共可复用组件（16 个）
│   ├── ActionCard.vue          # 动作卡片（组数录入、上次对比）
│   ├── CalendarMonth.vue       # 月历网格
│   ├── DateRangePicker.vue     # 日期范围选择器
│   ├── DayDetailPopup.vue      # 有氧/休息日详情弹窗
│   ├── DaySettings.vue          # 训练日设置面板
│   ├── EditEntryPopup.vue      # 编辑单组记录弹窗
│   ├── ExportTab.vue           # 数据导出面板
│   ├── GuidePopup.vue          # 首次启动引导
│   ├── ImportDataModal.vue     # 智能导入数据弹窗
│   ├── ImportTab.vue           # 数据导入面板
│   ├── MoreMenu.vue            # 首页更多菜单
│   ├── ProgressChart.vue       # 容量趋势折线图（Canvas）
│   ├── TemplateSelector.vue    # 模板/有氧/休息选择器
│   ├── TimerModal.vue          # 组间休息计时器
│   ├── TrainingSplitPlan.vue   # 分化训练计划设置
│   └── AnniversarySection.vue  # 纪念日区域
│
├── stores/                 # Pinia 状态管理（6 个 store）
│   ├── action.js           # 动作库
│   ├── dayData.js          # 单日训练数据（已较少直接使用，多由 dayDataCache 替代）
│   ├── dayDataCache.js     # 日数据缓存 + 日期索引（性能核心）
│   ├── daySettings.js      # 全局设置 + 主题 + 分化计划
│   ├── initActions.js      # 预设动作库（约 100+ 动作）
│   └── template.js         # 训练模板
│
├── utils/                  # 工具函数（13 个模块）
│   ├── backup.js           # 本地备份/恢复/CSV（跨平台 I/O 核心）
│   ├── canvasHelper.js     # 跨平台 Canvas 管理
│   ├── cloudBackup.js      # 微信云开发云端备份
│   ├── cloudConfig.js      # 云开发环境配置
│   ├── color.js            # 颜色处理（对比色、主题色生成）
│   ├── dataMerger.js       # 导入数据智能合并（模糊匹配）
│   ├── dayHelper.js        # 训练组数据构建与规范化
│   ├── exportImport.js     # 文本格式导入/导出（模板/分化计划/训练数据）
│   ├── importParser.js     # 文本解析（多格式容错）
│   ├── presetTemplates.js  # 预设模板包（推拉腿等）
│   ├── theme.js            # 导航栏主题同步、日期格式化
│   └── trainingAnalyzer.js # 智能模板推荐分析
│
├── composables/
│   └── useDebounce.js      # 防抖 composable
│
├── cloudfunctions/         # 微信云函数
│   └── getOpenId/          # 获取用户 OpenID（云端备份鉴权）
│
├── static/                 # 静态资源（图标、音效、liquid-glass.css）
├── tests/                  # 测试
│   └── importIntegration.test.js
└── docs/                   # 项目文档（设计稿、计划、本 Wiki）
```

---

## 4. 分层职责与模块说明

### 4.1 入口层

| 文件 | 职责 |
|------|------|
| [main.js](file:///d:/小程序/FitNote/main.js) | 创建 SSR App 实例，注册 Pinia，全局 `onShow` 混入调用 `updateNavBar()` 同步导航栏色；Vue2 分支注册 uView UI |
| [App.vue](file:///d:/小程序/FitNote/App.vue) | `onLaunch` 初始化微信云开发、加载 template/daySettings store、首次启动引导、Android `onActivityResult` 监听（处理 SAF 文件/文件夹选择 requestCode 1001/1002/1003/1005）；定义全局 Design Token（深/浅色 CSS 变量）与弹窗基础样式 |
| [pages.json](file:///d:/小程序/FitNote/pages.json) | 10 个页面路由与导航栏标题配置，全局深色导航栏 `#121212` |
| [manifest.json](file:///d:/小程序/FitNote/manifest.json) | uni-app AppID `__UNI__0B27BED`、微信 AppID `wxea4d8a557d8391ee`、Android targetSdkVersion 35、云开发 `cloud: true` |

### 4.2 状态层（Stores）

所有 store 使用 Pinia `defineStore`，通过 `uni.getStorageSync/setStorageSync` 实现本地持久化。详见 [第 8 节](#8-状态层stores关键类与函数)。

### 4.3 工具层（Utils）

纯函数模块，无 Pinia 依赖（除 [trainingAnalyzer.js](file:///d:/小程序/FitNote/utils/trainingAnalyzer.js) 导入预设模板）。详见 [第 9 节](#9-工具层utils关键函数)。

### 4.4 视图层

- **Pages**：路由级页面，组合 stores + components 完成业务流程。详见 [第 6 节](#6-页面层pages职责)。
- **Components**：可复用 UI 单元，通过 `props` 接收数据、`emit` 事件上报。详见 [第 7 节](#7-组件层components职责)。

---

## 5. 数据流与状态管理

### 5.1 单向数据流

```
用户操作 → Page/Component 事件 → Store action → state 变更 → save() → Storage
                ↑                                                      │
                └────────────── 响应式渲染 ◄──────────────────────────┘
```

Store 的 `save()` 内部调用 `uni.setStorageSync`，保证内存态与持久化同步。读取时优先走缓存（`dayDataCacheStore`），未命中再读 Storage。

### 5.2 缓存策略（性能核心）

[dayDataCache.js](file:///d:/小程序/FitNote/stores/dayDataCache.js) 是性能关键模块：

- **内存缓存**：`Map<dateStr, dayData>`，最大 500 条，超出后保留最近 100 条（`trimCache`）。
- **日期索引**：`Set<dateStr>` 持久化于 `fitness_index`，避免遍历全部 Storage keys。
- **预加载**：`preloadAroundMonth` / `preloadYearAsync` 按需加载月/年数据，月份去重 `preloadedMonths`。
- **派生缓存**：`monthCache`（月份概览）、`weekStatsCache`（周统计），数据变更时通过 `clearMonthCache/clearRelatedWeekStatsCache` 失效。
- **版本号**：`cacheVersion` 递增触发 computed 重算。

### 5.3 跨页通信

- **事件总线**：`uni.$on / uni.$emit`（如 `themeChanged`）。
- **Storage 中转**：`_pendingManageActions`（JSON 字符串数组）从 manageActions 页传回 day.vue。
- **日期传递**：`selectedYear / selectedMonth` 临时 Storage key。

---

## 6. 页面层（Pages）职责

| 页面 | 文件 | 职责 |
|------|------|------|
| 首页月历 | [pages/index/index.vue](file:///d:/小程序/FitNote/pages/index/index.vue) | 月历滑动切换、模板配色背景、长按清空、今日快捷训练按钮（联动分化计划）、底部 Tab 导航（统计/备份/模板/动作库）、纪念日区、更多菜单、有氧/休息日详情弹窗、CSV 导出（长按备份按钮） |
| 训练日 | [pages/index/day.vue](file:///d:/小程序/FitNote/pages/index/day.vue) | 模板选择、动作卡片列表、逐组录入与上次对比、递减/暂停/复合组、占位符组、计时器、设置面板、智能导入数据、编辑单组记录 |
| 动作历史 | [pages/actionHistory/actionHistory.vue](file:///d:/小程序/FitNote/pages/actionHistory/actionHistory.vue) | 单动作历史记录、与上次对比、Canvas 折线趋势图、上滑分页加载（10 条/页）、重命名（级联更新） |
| 动作库 | [pages/actionLibrary/actionLibrary.vue](file:///d:/小程序/FitNote/pages/actionLibrary/actionLibrary.vue) | 按肌群分类展示、子类目、搜索、新建/编辑动作（多分类、单侧标记）、侧滑删除（级联）、跳转历史 |
| 管理动作 | [pages/manageActions/manageActions.vue](file:///d:/小程序/FitNote/pages/manageActions/manageActions.vue) | 当日动作拖拽排序、添加新动作、结果经 `_pendingManageActions` 回传 |
| 模板管理 | [pages/templateManager/templateManager.vue](file:///d:/小程序/FitNote/pages/templateManager/templateManager.vue) | 模板列表、长按拖拽排序、左滑删除、新建（含预设模板包快速创建）、文本导入导出 |
| 模板详情 | [pages/templateDetail/templateDetail.vue](file:///d:/小程序/FitNote/pages/templateDetail/templateDetail.vue) | 编辑模板名、动作拖拽排序、预设组数设置、配色选择、添加动作 |
| 训练统计 | [pages/trainingStat/trainingStat.vue](file:///d:/小程序/FitNote/pages/trainingStat/trainingStat.vue) | 月/年切换、三维度统计（天数/组数/容量）、部位趋势柱状图、部位网格（状态徽章）、部位管理器（排序/显隐） |
| 年度总览 | [pages/year/year.vue](file:///d:/小程序/FitNote/pages/year/year.vue) | 12 月缩略网格、年份滚动、训练天数汇总、点击跳转首页定位 |
| 数据备份 | [pages/backup/backup.vue](file:///d:/小程序/FitNote/pages/backup/backup.vue) | 本地全量/增量备份、SAF 路径选择、文件恢复（覆盖/合并）、云端备份列表/下载/删除 |

---

## 7. 组件层（Components）职责

| 组件 | 职责 | 关键 props / events |
|------|------|---------------------|
| [ActionCard.vue](file:///d:/小程序/FitNote/components/ActionCard.vue) | 单动作录入卡片，多组 stages 编辑、上次对比徽章、占位符填充 | `action-name` `entries` `diff` `latest-record` `bubble-fill` `is-bodyweight`；emit `confirm-entry` `update-entry` `delete-action` `delete-entry` `edit-entry` `go-history` |
| [CalendarMonth.vue](file:///d:/小程序/FitNote/components/CalendarMonth.vue) | 单月日历网格，渲染模板配色与训练量 | `year` `month` `month-days` `get-template-color` `get-total-weight` `is-aerobic-day` 等；emit `date-click` `date-longpress` `go-to-year-page` `toggle-train-btn` `open-more-menu` |
| [DateRangePicker.vue](file:///d:/小程序/FitNote/components/DateRangePicker.vue) | 日期范围选择（用于导出） | emit 选定起止日期 |
| [DayDetailPopup.vue](file:///d:/小程序/FitNote/components/DayDetailPopup.vue) | 有氧训练/休息日详情编辑弹窗 | `type` `detail`；emit `color-change` `save-edit` |
| [DaySettings.vue](file:///d:/小程序/FitNote/components/DaySettings.vue) | 训练日设置面板（计时、自动填充、导入导出） | `available-actions` `chosen-actions` `settings`；emit `add-action` `save-sort` `toggle-*` `set-heavy-timer` `export-data` `import-data` |
| [EditEntryPopup.vue](file:///d:/小程序/FitNote/components/EditEntryPopup.vue) | 编辑单组训练记录（递减/暂停/复合组） | `entry-idx` `entry`；emit `save` |
| [ExportTab.vue](file:///d:/小程序/FitNote/components/ExportTab.vue) | 数据导出面板（日期范围、JSON/CSV） | — |
| [GuidePopup.vue](file:///d:/小程序/FitNote/components/GuidePopup.vue) | 首次启动功能引导 | `visible`；emit `close` |
| [ImportDataModal.vue](file:///d:/小程序/FitNote/components/ImportDataModal.vue) | 智能导入弹窗（粘贴文本预览、多匹配选择） | `action-names`；emit `confirm` |
| [ImportTab.vue](file:///d:/小程序/FitNote/components/ImportTab.vue) | 数据导入面板 | — |
| [MoreMenu.vue](file:///d:/小程序/FitNote/components/MoreMenu.vue) | 首页更多菜单（主题、液态玻璃、快捷按钮、引导） | `visible` `is-dark-mode` `train-btn-visible` `liquid-glass-enabled`；emit `toggle-*` `read-guide` `add-anniv` |
| [ProgressChart.vue](file:///d:/小程序/FitNote/components/ProgressChart.vue) | Canvas 容量趋势折线图 | 图表数据点 |
| [TemplateSelector.vue](file:///d:/小程序/FitNote/components/TemplateSelector.vue) | 模板/有氧/休息日选择器 | `templates` `date`；emit `select-template` `save-aerobic` `save-rest` |
| [TimerModal.vue](file:///d:/小程序/FitNote/components/TimerModal.vue) | 组间休息倒计时（自定义时长、音效） | `visible` `default-duration` `quick-settings`；emit `complete` `time-change` |
| [TrainingSplitPlan.vue](file:///d:/小程序/FitNote/components/TrainingSplitPlan.vue) | 分化训练计划设置（循环/周计划） | `templates` `mode` `cycle-days` `week-plan`；emit `save` `close` |
| [AnniversarySection.vue](file:///d:/小程序/FitNote/components/AnniversarySection.vue) | 纪念日列表（增删改、自动计算天数） | ref 暴露 `openAdd()` |

---

## 8. 状态层（Stores）关键类与函数

### 8.1 [useActionStore](file:///d:/小程序/FitNote/stores/action.js) — 动作库

**Storage Key**：`fitness_actions`

**State**：`actions: Action[]`、`categories: Category[]`

**核心 actions**：
- `load()` — 读取并兼容旧格式（字符串数组→对象）、触发数据迁移 `migrateFromLegacy`、空时 `initActions`。
- `save()` — 写入 Storage。
- `addAction(name, categoryIds, bodyweightMode)` — 去重添加，无分类时 `detectCategoryByName` 自动归类。
- `updateAction(id, {...})` — 更新；改名时级联更新所有日数据与模板（`_renameActionInDayData` / `_renameActionInTemplates`）。
- `removeActionById(id)` / `removeActionByIndex(idx)` — 删除并保存。
- `getActionsByCategory` / `getActionsByCategoryAndSubcategory` / `getSubcategories` / `getAllSubcategories` / `searchActions` / `getActionByName` / `getActionById` — 查询接口。

**内部常量**：
- `CATEGORY_KEYWORDS` — 动作名→肌群的关键词映射表（用于自动分类）。
- `LEGACY_CATEGORY_MAP` — 旧分类（core/cardio/other）→abs 的迁移映射。
- `SUBCATEGORIES` — 各肌群的子类目定义（上胸/中下胸、背阔/竖脊肌等）。

### 8.2 [useDayDataStore](file:///d:/小程序/FitNote/stores/dayData.js) — 单日训练数据

**Storage Key 前缀**：`fitness_daydata_` + 日期

**State**：`date`、`dayData: { templates, entries, actions }`

**核心 actions**：`load(date)`、`save()`、`chooseTemplate(tpl)`、`addEntry(actionName, reps, weight)`（自动更新模板汇总与 actionOrder）、`removeEntry(actionName, idx)`。

> 注：新代码多直接使用 `dayDataCacheStore`，此 store 保留兼容。

### 8.3 [useDayDataCacheStore](file:///d:/小程序/FitNote/stores/dayDataCache.js) — 日数据缓存与索引（性能核心）

**Storage Key**：`fitness_index`（日期索引）

**State**：`cache: Map`、`dateIndex: Set`、`sortedDates: string[]`、`indexLoaded`、`preloadedMonths`、`monthCache`、`weekStatsCache`、`MAX_CACHE_SIZE=500`、`CACHE_TRIM_SIZE=100`、`cacheVersion`。

**核心 actions**：
- `getDayData(dateStr)` — 优先缓存命中，否则读 Storage 并入缓存。
- `batchGetLatestRecords(actNames, todayDateStr)` — 倒序遍历 `sortedDates` 批量查最近一次训练记录（用于"上次对比"）。
- `saveDayData(dateStr, dayData)` — 写缓存+Storage，更新索引，失效相关月份/周缓存，递增 `cacheVersion`。
- `checkHasActivity(dayData)` — 判断日数据是否含有效训练（休息日/空模板不算）。
- `hasData(dateStr)` / `getDates()` / `getYearsWithData()` / `getEarliestYear()` — 索引查询。
- `buildIndex()` / `loadIndex(force)` / `setIndex(dates)` / `saveIndex()` — 索引构建与持久化。
- `preloadDateRange` / `preloadMonthsAsync` / `preloadYearAsync` / `preloadYearSync` / `preloadAroundMonth` — 增量预加载。
- `trimCacheAsync` / `trimCache` — LRU 式淘汰。
- `clearCache` / `clearMonthCache` / `clearWeekStatsCache` / `clearRelatedWeekStatsCache` / `clearAll` — 缓存失效。
- `formatDateStr(date)` / `getWeekNumber(date)` — 日期辅助。

### 8.4 [useDaySettingsStore](file:///d:/小程序/FitNote/stores/daySettings.js) — 全局设置与分化计划

**Storage Key**：`fitness_day_settings`

**State**：`isDarkMode`、`autoStartTimer`、`autoFillData`、`bubbleFill`、`heavyTimerDuration(180)`、`lightTimerDuration(120)`、`todayTrainBtnVisible`、`liquidGlassEnabled`、`splitPlan`。

**核心 actions**：
- `load()` / `save()` — 持久化。
- `toggleTheme` / `toggleAutoStartTimer` / `toggleAutoFillData` / `toggleBubbleFill` / `toggleTodayTrainBtn` / `toggleLiquidGlass` — 开关切换。
- `setHeavyTimerDuration` / `setLightTimerDuration` — 计时器时长。
- `toggleSplitPlan` / `saveSplitPlan(planData)` — 分化计划。
- `getWeekDayPlan(dateStr)` / `getTodayWeekTemplate(dateStr)` — 周计划查询（按 getDay 推算周几）。
- `advanceCycleOffset(todayDate)` — 循环模式推进偏移（首次记录不推进，后续按天数差推进）。
- `getCycleIndex(todayDate, dayDataCacheStore)` — 推算今日在循环中的位置（调用 `_inferCycleOffset` 扫描近 14 天训练历史匹配分化模板）。
- `updateSplitPlanTemplateName(oldName, newName)` — 模板重命名时同步分化计划引用。

### 8.5 [useTemplateStore](file:///d:/小程序/FitNote/stores/template.js) — 训练模板

**Storage Key**：`fitness_templates`

**核心 actions**：`load`（兼容补 id）/ `save` / `addTemplate` / `addAerobic` / `renameTemplate`（同步分化计划引用，重名阻止）/ `updateTemplate` / `removeTemplate` / `addAction` / `removeAction` / `moveAction` / `setActionSets` / `setColor` / `clearColor` / `addCustomColor` / `removeCustomColor` / `findByName` / `isUsed`（检查是否被日数据引用）/ `loadTemplateDetail`。

### 8.6 [initActions.js](file:///d:/小程序/FitNote/stores/initActions.js) — 预设动作库

- `RAW_ACTIONS` — 约 100+ 预设动作常量数组，覆盖胸/背/肩/手臂/腿/腹 6 大肌群及子类目，含 `isUnilateral`、`bodyweightMode` 标记。
- `getInitialActions()` — 返回带 id/createdAt 的完整 Action 数组。
- `getInitialActionNames()` — 仅返回动作名数组。

---

## 9. 工具层（Utils）关键函数

### 9.1 [dayHelper.js](file:///d:/小程序/FitNote/utils/dayHelper.js) — 训练组数据构建

训练组（Entry）的核心数据建模工具，定义了"阶段（Stage）→组（Entry）"的层级结构。

- `ENTRY_TYPE` — 常量：`normal` / `decreasing`（递减组）/ `paused`（暂停组）/ `composite`（复合组）。
- `getCompositeType(stages)` — 判断复合组整体类型（递减/暂停/递增/混合）。
- `createStage(reps, weight, isUnilateral)` — 创建单阶段，单侧动作容量×2。
- `buildEntry(type, stages, isUnilateral, bwMode)` — 构建完整 Entry（过滤空 reps、计算 total、生成 input 字符串、支持自重辅助模式取负）。
- `getEntryDisplayText(entry)` — 渲染显示文本（含 🔻递减/⏸暂停/🔗复合 标记）。
- `getTotalWeight(entries)` / `getTotalSets(entries)` — 汇总。
- `normalizeEntry(entry)` / `normalizeEntries(entries)` — 旧格式（无 stages）兼容转换。
- `createPlaceholderEntry(type)` / `fillPlaceholderEntries(targetSets, currentEntries, type)` / `isPlaceholderEntry(entry)` / `getFilledEntryCount(entries)` — 占位符组管理（根据模板预设组数生成空白组）。

### 9.2 [dataMerger.js](file:///d:/小程序/FitNote/utils/dataMerger.js) — 导入数据智能合并

- `mergeImportData(existingData, importedData, actionNames, templateActions)` — 合并导入：先查当天模板动作，再查动作库；唯一匹配直接用，多匹配收集待用户选择，无匹配则按原名新增。
- `applyMatchSelections(mergedData, matchResults, selections)` — 应用用户多匹配选择。
- `getNewActions(mergedData, templateActions)` — 返回需新增到模板的动作列表。
- 内部：`findAllMatches`（精确→模糊，模板动作+50 分优先级）、`isActionMatch`（包含/关键词交集）、`getMatchScore`（完全=1000、包含=500+长度、关键词=100×交集数）、`extractKeywords`（宽距/窄距/卧推等关键词抽取）。

### 9.3 [importParser.js](file:///d:/小程序/FitNote/utils/importParser.js) — 文本解析（多格式容错）

- `parseImportText(text)` — 基础解析（动作名+组数）。
- `parseImportTextWithActions(text, actionNames)` — 结合动作库模糊匹配解析。
- `parseEntries(line)` — 支持近 10 种格式：`第X组：N次×Wkg`、`W✖N个 四组`、`N×W N×W`、`N次 Wkg`、`N组 N次 Wkg`、按 kg 分段、`Wkg N个` 等。
- `parseRepsAndSets(segment, weight)` — 段内次数/组数解析（含中文数字）。
- `fuzzyMatchAction(text, actionNames)` / `fuzzyMatchActionWithPosition` — 模糊匹配动作名。
- `cnNum(str)` — 中文数字转换。

### 9.4 [exportImport.js](file:///d:/小程序/FitNote/utils/exportImport.js) — 文本格式导入/导出

- `formatTemplates(templates)` / `formatSplitPlan(splitPlan, templates)` / `formatDayData(dayData)` — 格式化为可读文本（`=== 模板数据 ===` / `=== 分化计划 ===` / `=== 训练数据 ===` 分节）。
- `exportToClipboard(options)` — 导出至剪贴板。
- `parseImportText(text)` — 解析三节文本（`parseTemplates` / `parseSplitPlan` / `parseDayData`）。
- `importFromClipboard()` — 从剪贴板读取并解析。

### 9.5 [backup.js](file:///d:/小程序/FitNote/utils/backup.js) — 本地备份/恢复/CSV（跨平台 I/O 核心）

**配置**：`getBackupConfig` / `saveBackupConfig` / `loadBackupConfig`（`backup_config`）。

**数据收集**：`collectFullData` / `collectFullDataWithProgress(dayDataCacheStore, onProgress)`（带进度批处理 50 条/批）/ `collectIncrementalData(lastBackupTime)`。

**备份**：`backupData(backupType, dayDataCacheStore, onProgress)` — 全量/增量，生成 `训练备份-YYYY-MM-DD-HH:MM:SS.json`。

**写入**：`writeBackupFile(payload, customPath)` — 按平台分发：
- H5：`downloadForH5`（Blob+`<a download>`）。
- Android SAF：`content://` 路径用 DocumentFile 创建文件；权限失效回退 `writeWithCreateDocument`（ACTION_CREATE_DOCUMENT, requestCode 1005），再回退 `writeBackupDefault`。
- 小程序：`uni.getFileSystemManager().writeFile`。

**恢复**：`readBackupFile(filePath)`（支持 Blob/content:// URI 用 ContentResolver/普通路径用 plus.io.FileReader/小程序 fs）、`validateBackupPayload`、`restoreData(filePath, overwrite)`（覆盖 `clearAllData` 或合并 `mergeArraysUnique`，含 `migrateActionsIfNeeded` 旧数据迁移）。

**SAF 权限**：`checkSAFPermission` / `ensureSAFPermission` / `requestSAFPermissionAgain`（requestCode 1003）/ `chooseBackupPath`（requestCode 1001）/ `chooseBackupFile`（requestCode 1002）/ `listBackupFilesFromSAF` / `isFolderUri` / `getFolderUriFromFileUri` / `decodeBackupPath` / `getFriendlyBackupPath` / `validateAndFixBackupPath`。

**CSV**：`exportToCSV(dates, dayDataCacheStore)`（含 BOM 头，UTF-8 中文兼容）、`writeCSVFile(csvContent, fileName)`。

**导出常量**：`BACKUP_CONFIG_KEY` `TEMPLATE_KEY` `ACTION_KEY` `DAYDATA_PREFIX` `BACKUP_VERSION` `INDEX_KEY`。

### 9.6 [cloudBackup.js](file:///d:/小程序/FitNote/utils/cloudBackup.js) — 微信云开发云端备份

基于 `wx.cloud`，最多保留 3 份（`MAX_BACKUPS`）。

- `getOpenId()` — 调用云函数 `getOpenId` 获取 openid。
- `listUserBackups()` / `countUserBackups()` — 查询 `backups` 集合（`status: 'active'`）。
- `uploadToCloud()` — 收集全量数据→写临时文件→`uploadFile` 至 `backups/{openid}/{timestamp}.json`→记录元数据到 `backups` 集合，超限自动 `deleteOldestBackup`。
- `downloadFromCloud(backupId)` — 查记录→`downloadFile`→读临时文件解析。
- `deleteBackup(backupId)` / `deleteOldestBackup()` — 删云存储文件+置 `status: 'deleted'`。
- `collectFullData()` — 同 backup.js 的全量收集逻辑。

### 9.7 [trainingAnalyzer.js](file:///d:/小程序/FitNote/utils/trainingAnalyzer.js) — 智能模板推荐

- `analyzeTrainingPattern(dayDataCacheStore, templateStore, actionStore)` — 扫描近 28 天训练，统计各肌群次数，找出 `missedParts`（未训练）与 `trainedParts`，按"覆盖缺少肌群"评分推荐最佳模板，返回 `{ suggestion, reason, trainedParts, missedParts, recommendedTemplate }`。
- 复用 `presetTemplates.js` 的 `getPresetTemplatePacks`。

### 9.8 [color.js](file:///d:/小程序/FitNote/utils/color.js) — 颜色处理

- `getContrastColor(hex)` — 根据亮度返回黑/白前景色。
- `PRESET_COLORS` — 11 种预设配色（清水蓝、克莱因蓝等）。
- `generateThemeMethod2(color, mode)` — 由主色生成 surface 色（深色×0.15，浅色×0.3+255×0.7），用于导航栏与液态玻璃背景。

### 9.9 [theme.js](file:///d:/小程序/FitNote/utils/theme.js) — 主题与日期

- `updateNavBar()` — 读 `fitness_day_settings`，按自定义色经 `generateThemeMethod2` 计算导航栏背景，调用 `uni.setNavigationBarColor`。
- `formatDate(dateObj)` / `formatDateStr(date)` — 日期格式化为 `YYYY-MM-DD`。

### 9.10 [canvasHelper.js](file:///d:/小程序/FitNote/utils/canvasHelper.js) — 跨平台 Canvas

- `getSystemInfo()` — 平台信息缓存（H5 用 `window`，其余用 `uni.getSystemInfo`）。
- `CanvasManager` 类 — 统一 Canvas 节点获取与 2D 上下文初始化（H5 直接 `getContext('2d')`+scale，小程序/App 用 `uni.createCanvasContext`），提供 `init/clearRect/draw/getContext/getCanvas/ready`。
- `measureTextWidth(ctx, text)` — 兼容平台文本宽度测量。

### 9.11 [presetTemplates.js](file:///d:/小程序/FitNote/utils/presetTemplates.js) — 预设模板包

`getPresetTemplatePacks()` 返回 6 个预设：推日（胸肩三头）、拉日（背二头）、腿日、臀日、上肢日、下肢日，各带推荐配色。

### 9.12 [useDebounce.js](file:///d:/小程序/FitNote/composables/useDebounce.js)

`useDebounce(fn, delay=200)` — 标准防抖，返回带 `cancel()` 的函数。

---

## 10. 统计模块（trainingStat）

### 10.1 [statUtil.js](file:///d:/小程序/FitNote/pages/trainingStat/statUtil.js)

定义 18 个子分类（`SUBCATEGORIES`）与 3 个合并分类（`MERGED_CATEGORIES`：胸部合并上胸+中下胸、背部合并部分、腿部合并股四头+腘绳）。

- `computeStats({ year, month, periodType, actionStore, dayDataCacheStore })` — 计算总天数/总组数/总容量、各子分类总量与趋势，按周/月分桶（`computeSubcategoryTrendsForPeriod`）。
- `collectWeeklyVolume(year, month, periodType, actionStore, dayDataCacheStore)` — 按周一为起点收集每周各部位组数。
- `collectAllWeeklyVolume(actionStore, dayDataCacheStore)` — 全历史周组数（用于重建容量历史）。
- 辅助：`getKeysInPeriod` / `getKeysInPeriodCached`（走索引）/ `getDayData` / `getSubcategoryForAction` / `getCategoryForSubcategory`。

### 10.2 [volumeHistory.js](file:///d:/小程序/FitNote/pages/trainingStat/volumeHistory.js)

**Storage Key**：`training_volume_history`

按身体部位记录每周组数，用于状态徽章判断。

- `FIXED_RANGES` — 9 个部位的固定区间（chest 20-40、back 24-64 等），阶段 A（<8 周历史）用。
- `getStatus(bodyPartId, history)` — 取近 2 周组数与固定区间比较，返回 `low/normal/high`。
- `getAdaptiveStatus(bodyPartId, history)` — 阶段 B（≥8 周）自适应：用加权均值算 baseline，±30% 阈值判断。
- `computeWeightedMean(weeksData)` — 加权均值（越近权重越大）。
- `updateBaseline(bodyPartId, history)` — `0.8×旧baseline + 0.2×本周` 滚动更新。
- `updateWeeklyVolume(weeklyVolumeMap, history)` / `rebuildVolumeHistory(fullWeeklyVolumeMap)` — 周数据写入/全量重建。
- `getMappedBodyPartId(subId)` — 子分类→部位映射（upper_chest→chest 等）。

### 10.3 子组件

| 组件 | 职责 |
|------|------|
| [DatePicker.vue](file:///d:/小程序/FitNote/pages/trainingStat/components/DatePicker.vue) | 月/年周期选择 |
| [TrainingOverview.vue](file:///d:/小程序/FitNote/pages/trainingStat/components/TrainingOverview.vue) | 总量概览卡片 |
| [BodyPartTrend.vue](file:///d:/小程序/FitNote/pages/trainingStat/components/BodyPartTrend.vue) | 部位趋势柱状图 |
| [BodyPartGrid.vue](file:///d:/小程序/FitNote/pages/trainingStat/components/BodyPartGrid.vue) | 部位网格卡片（状态徽章） |
| [BodyPartManager.vue](file:///d:/小程序/FitNote/pages/trainingStat/components/BodyPartManager.vue) | 部位拖拽排序与显隐管理 |
| [BodyPartSelector.vue](file:///d:/小程序/FitNote/pages/trainingStat/components/BodyPartSelector.vue) | 部位选择 |

---

## 11. 云端与跨平台能力

### 11.1 云函数 [getOpenId](file:///d:/小程序/FitNote/cloudfunctions/getOpenId/index.js)

Node.js 云函数，基于 `wx-server-sdk`，返回调用者的 `OPENID/APPID/UNIONID`，用于云端备份的用户隔离鉴权。

### 11.2 云开发配置

- [cloudConfig.js](file:///d:/小程序/FitNote/utils/cloudConfig.js)：`env: 'fitnote-cloud-xxxx'`、`database: 'backups'`、`maxBackups: 3`。
- [App.vue](file:///d:/小程序/FitNote/App.vue) `onLaunch` 中 `wx.cloud.init({ env: 'fitnote-cloud-xxxx', traceUser: true })`。
- manifest.json `mp-weixin.cloud: true`。

### 11.3 Android SAF 集成

[App.vue](file:///d:/小程序/FitNote/App.vue) 的 `setupActivityResultListener` 覆写 `main.onActivityResult`，处理 4 个请求码：

| requestCode | 用途 | 回调全局变量 |
|-------------|------|--------------|
| 1001 | `ACTION_OPEN_DOCUMENT_TREE` 选备份文件夹 | `_safBackupResolve/Reject` |
| 1002 | `ACTION_OPEN_DOCUMENT` 选备份文件 | `_safFileResolve/Reject` |
| 1003 | `ACTION_OPEN_DOCUMENT_TREE` 重新授权 | `_safPermissionResolve/Reject` |
| 1005 | `ACTION_CREATE_DOCUMENT` 创建文件 | `_createDocResolve/Reject` + `_createDocContent/FileName` |

均做 3 秒防重复处理与 `takePersistableUriPermission` 权限持久化（兼容 Android 15）。

---

## 12. 依赖关系

### 12.1 生产依赖（[package.json](file:///d:/小程序/FitNote/package.json)）

| 依赖 | 版本 | 用途 |
|------|------|------|
| pinia | ^3.0.3 | 状态管理 |
| @vant/weapp | ^1.11.7 | 微信小程序 UI 组件库 |
| uview-ui | ^2.0.38 | uni-app UI 组件库（Vue2 分支使用） |
| sortablejs | ^1.15.6 | 原生拖拽排序 |
| vuedraggable | ^2.24.3 | Vue 拖拽组件封装 |

### 12.2 模块依赖图（关键路径）

```
pages/index/index.vue
  ├─ stores: action, template, dayDataCache, daySettings
  ├─ utils: trainingAnalyzer, backup(exportToCSV/writeCSVFile)
  └─ components: CalendarMonth, TrainingSplitPlan, AnniversarySection,
                 DayDetailPopup, MoreMenu, GuidePopup

pages/index/day.vue
  ├─ stores: template, dayDataCache, action, daySettings
  ├─ utils: theme, dayHelper, dataMerger
  └─ components: TimerModal, TemplateSelector, ActionCard,
                 DaySettings, ImportDataModal, EditEntryPopup

stores/action.js → stores/template.js（改名级联）, stores/initActions.js
stores/template.js → stores/daySettings.js（改名同步分化计划）
stores/daySettings.js → stores/dayDataCache.js（推断循环偏移）

utils/trainingAnalyzer.js → utils/presetTemplates.js
utils/theme.js → utils/color.js
utils/dataMerger.js →（无外部依赖，纯函数）
pages/trainingStat/* → utils/dayHelper（间接，通过 entries 结构）
```

### 12.3 外部服务依赖

- **微信云开发**：云函数 `getOpenId`、云存储 `wx.cloud.uploadFile/downloadFile`、数据库 `backups` 集合。
- **Android 系统 API**：`plus.android` 调用 `Intent`、`DocumentFile`、`ContentResolver`（SAF）。
- **本地存储**：`uni.setStorageSync/getStorageSync/getStorageInfoSync`（微信小程序本地存储）。

---

## 13. 项目运行方式

### 13.1 环境要求

- [HBuilderX](https://www.dcloud.io/hbuilderx.html) 3.0+（uni-app 官方 IDE）
- 微信开发者工具（用于微信小程序预览/调试）
- Node.js 14+（依赖安装）
- （可选）Android Studio / 真机（用于 App 端调试）

### 13.2 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/shiyaoyiya/FitNote.git
cd FitNote

# 2. 安装依赖
npm install

# 3. 用 HBuilderX 打开项目目录
#    - 运行 → 运行到小程序模拟器 → 微信开发者工具
#    - 或：运行 → 运行到手机或模拟器 → Android（App 端）
```

### 13.3 微信小程序配置

1. 在 [manifest.json](file:///d:/小程序/FitNote/manifest.json) 中替换 `mp-weixin.appid` 为你的小程序 AppID。
2. 如需云备份：在 [App.vue](file:///d:/小程序/FitNote/App.vue) `onLaunch` 与 [cloudConfig.js](file:///d:/小程序/FitNote/utils/cloudConfig.js) 中替换 `fitnote-cloud-xxxx` 为你的云开发环境 ID；部署 `cloudfunctions/getOpenId` 云函数；在云控制台创建 `backups` 集合。
3. 微信开发者工具中开启"不校验合法域名"（`mp-weixin.setting.urlCheck: false` 已配置）。

### 13.4 Android App 配置

- `manifest.json` 已配置 Android 权限（存储、网络等），`targetSdkVersion: 35`，`minSdkVersion: 21`。
- 备份功能依赖 SAF（Storage Access Framework），运行时由 `chooseBackupPath` 拉起系统文件夹选择器。

### 13.5 测试

```bash
# 导入功能集成测试
npm test tests/importIntegration.test.js
```

---

## 14. 数据模型与存储约定

### 14.1 核心 Storage Key 汇总

| Key | 类型 | 说明 |
|-----|------|------|
| `fitness_actions` | `Action[]` | 动作库 |
| `fitness_templates` | `Template[]` | 训练模板 |
| `fitness_daydata_YYYY-MM-DD` | `DayData` | 每日训练数据 |
| `fitness_day_settings` | `DaySettings` | 全局设置 + 分化计划 |
| `fitness_index` | `{version, dates, updatedAt}` | 日期索引 |
| `annivs` | `string(JSON)` | 纪念日数组 |
| `backup_config` | `BackupConfig` | 备份配置 |
| `training_volume_history` | `VolumeHistory` | 容量历史 |
| `training_stat_bodypart_config` | `{order, visibility}` | 统计页部位配置 |
| `_pendingManageActions` | `string(JSON)` | 跨页通讯（临时） |
| `first_launch_done` | `boolean` | 首次启动标记 |
| `selectedYear` / `selectedMonth` | `string` | 跨页日期传递（临时） |

### 14.2 核心数据结构

```typescript
interface Action {
  id: string
  name: string
  categories: string[]                       // ['chest', 'arms']
  subcategories: Record<string, string[]>    // { chest: ['upper_chest'] }
  categoryName: string                       // 首个分类中文名
  createdAt: string                          // ISO
  isUnilateral: boolean                      // 单侧动作
  bodyweightMode?: boolean
}

interface Template {
  id: string
  name: string
  actions: string[]                          // 有序动作名
  actionSets: Record<string, number>         // 动作名→预设组数
  color: string                              // 主配色 Hex
  customColors: Array<{ name: string; value: string }>
  isAerobic?: boolean
}

interface DayData {
  templates: Record<string, TemplateDayData>
  entries: Record<string, Entry[]>           // 动作名→训练组
  actions: Record<string, number>            // 动作名→总容量
  isRestDay?: boolean
  color?: string
  restReason?: string
}

interface TemplateDayData {
  totalWeight: number
  actionWeights: Record<string, number>
  actionOrder: string[]
  isAerobic?: boolean
  color?: string
}

interface Entry {
  input: string           // "10×50" 或 "10×50+8×40"
  total: number           // 该组总容量
  type: 'normal' | 'decreasing' | 'paused' | 'composite'
  stages: Stage[]
  isPlaceholder?: boolean
  bwMode?: 'bodyweight' | 'assisted' | 'weighted'
}

interface Stage {
  reps: number
  weight: number
  total: number
}

interface DaySettings {
  isDarkMode: boolean
  autoStartTimer: boolean
  autoFillData: boolean
  bubbleFill: boolean
  heavyTimerDuration: number                 // 默认 180
  lightTimerDuration: number                 // 默认 120
  todayTrainBtnVisible: boolean
  liquidGlassEnabled: boolean
  splitPlan: SplitPlan
}

interface SplitPlan {
  enabled: boolean
  mode: 'cycle' | 'week'
  cycleDays: CycleDay[]                       // 循环模式
  weekPlan: WeekDay[]                         // 周计划模式（7 天）
  startOffset: number
  lastActiveDate: string                      // YYYY-MM-DD
}

interface BackupData {
  version: string                             // '1.0'
  backupType: 'full' | 'incremental'
  backupTime: string                          // ISO
  data: {
    fitness_templates: Template[]
    fitness_actions: Action[]
    fitness_annivs: Anniversary[]
    fitness_daydata: Record<string, DayData>
  }
}
```

### 14.3 肌群分类体系

| 大类 | id | 子类目 |
|------|----|--------|
| 胸部 | chest | upper_chest(上胸)、mid_lower_chest(中下胸) |
| 背部 | back | teres_major(大圆)、upper_traps(上斜方)、mid_lower_traps(中下斜方)、lats(背阔)、erector_spinae(竖脊肌) |
| 肩部 | shoulders | front_delt(前束)、side_delt(中束)、rear_delt(后束) |
| 手臂 | arms | biceps(二头)、triceps(三头) |
| 腿部 | legs | quads(股四头)、hamstrings(腘绳)、calves(小腿)、glutes(臀部) |
| 腹部 | abs | abs(腹部) |

**合并分类**（统计页用）：chest = upper_chest + mid_lower_chest；back = teres_major + mid_lower_traps + lats；legs = quads + hamstrings。

---

## 15. 附录

### 15.1 全局 Design Token

[App.vue](file:///d:/小程序/FitNote/App.vue) `<style>` 定义深色/浅色两套 CSS 变量（`.container.dark` / `.container.light`），涵盖背景层（bg-primary/secondary/tertiary/card/input）、文本层（primary/secondary/muted/placeholder）、语义色（primary/success/danger/warning）、图表色（chart-text/label）等，配合 `static/css/liquid-glass.css` 实现液态玻璃效果。

### 15.2 跨平台条件编译

项目大量使用 uni-app 条件编译指令区分平台：

```javascript
// #ifdef MP-WEIXIN    // 仅微信小程序
// #ifdef APP-PLUS     // 仅 App（含 Android）
// #ifdef H5           // 仅 H5
// #ifndef VUE3         // Vue2 分支
// #ifdef VUE3          // Vue3 分支
```

### 15.3 版本演进要点

- **v2.1.2**（当前）：Android 15 适配（targetSdkVersion 35）、SAF 权限持久化兼容。
- **v2.0.9**：数据导出面板、智能文本导入、DateRangePicker、模糊匹配合并算法。
- **v2.0.0**：导入/导出功能、智能数据合并器、导入文本解析器。
- **v1.9.0**：训练统计页、部位管理、动作库交互优化。
- **v1.8.0**：年度总览、纪念日、日历滑动体验。

### 15.4 相关文档

- [README.md](file:///d:/小程序/FitNote/README.md) — 项目说明
- [docs/features-and-data-structures.md](file:///d:/小程序/FitNote/docs/features-and-data-structures.md) — 功能与数据结构详细文档
- `docs/specs/`、`docs/superpowers/plans/`、`docs/superpowers/specs/` — 各功能设计稿与实施计划
