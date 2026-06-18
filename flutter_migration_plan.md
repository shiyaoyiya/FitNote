# FitNote 项目 Flutter 迁移计划

## 一、项目现状分析

### 1.1 技术栈概览

| 分类 | 当前技术 | Flutter 对应方案 |
|------|----------|-----------------|
| 框架 | UniApp (Vue3) | Flutter SDK (Android) |
| 状态管理 | Pinia (6 个 Store) | Riverpod |
| UI 组件 | uView UI + 自定义组件 | Material 3 + 自定义 Widget |
| 数据存储 | uni.setStorageSync (键值对) | Hive (NoSQL) |
| 云服务 | 微信云开发 | ~~已移除~~ |
| 目标平台 | 微信小程序 + Android + iOS | **仅 Android** |

### 1.2 核心功能模块

| 模块 | 功能描述 | 页面路径 |
|------|----------|----------|
| 日历浏览 | 月历视图、滑动切换、训练标记、颜色编码 | pages/index/index.vue |
| 每日训练 | 模板选择、动作记录（普通/递减/暂停）、计时器、自动填充 | pages/index/day.vue |
| 动作历史 | 单动作历史记录、进度图表（容量/1RM）、分页加载 | pages/actionHistory/actionHistory.vue |
| 模板详情 | 编辑模板、拖拽排序、颜色管理、动作搜索 | pages/templateDetail/templateDetail.vue |
| 模板管理 | 创建/删除/排序模板、导入导出（剪贴板文本格式）、冲突解决 | pages/templateManager/templateManager.vue |
| 动作库 | 分类浏览、搜索、增删改、自动分类检测 | pages/actionLibrary/actionLibrary.vue |
| 训练统计 | 周/月总量、肌群趋势图、肌群网格、badge 状态 | pages/trainingStat/trainingStat.vue |
| 数据备份 | 本地备份/恢复（SAF）、CSV 导出、旧数据导入 | pages/backup/backup.vue |
| 年度总览 | 12 月迷你日历、训练天数统计、懒加载年份 | pages/year/year.vue |
| 日内动作管理 | 拖拽排序动作、删除、添加 | pages/manageActions/manageActions.vue |
| 纪念日管理 | CRUD 纪念日、颜色选择 | 首页集成 |
| 训练分化计划 | 循环模式 / 周模式、偏移推算 | 首页集成 |
| 主题切换 | 深色/浅色模式 + 液态玻璃效果 | 全局 |

### 1.3 数据模型（完整）

**DayData（每日训练数据）** — 存储键 `fitness_daydata_<YYYY-MM-DD>`
```typescript
{
  templates: { [name: string]: { totalWeight: number, actionWeights: {}, actionOrder: [] } },
  entries: { [actionName: string]: Entry[] },  // Entry 支持 normal/decreasing/paused 三种类型
  actions: { [actionName: string]: number },    // 动作 → 组数
  isRestDay: boolean,
  restReason: string,
  color: string,
  isAerobic?: boolean,
  aerobicName?: string,
  aerobicDuration?: number
}
```

**Entry（训练记录条目）** — 三种类型
```typescript
// 普通组
{ type: 'normal', input: '12×60', total: 720 }

// 递减组（多阶段）
{ type: 'decreasing', stages: [{ reps: 12, weight: 60 }, { reps: 10, weight: 50 }], total: 1220 }

// 暂停组（多阶段，含暂停时间）
{ type: 'paused', stages: [{ reps: 8, weight: 80 }, { pauseSec: 15, reps: 5, weight: 80 }], total: 1040 }
```

**Template（训练模板）** — 存储键 `fitness_templates`
```typescript
{
  id: string,
  name: string,
  actions: string[],           // 动作名列表
  actionSets: { [name: number] },  // 每个动作的组数
  actionOrder: string[],       // 排序后的动作名
  actionWeights: {},           // 动作重量记录
  color: string,
  customColors: string[],      // 自定义颜色列表
  isAerobic?: boolean
}
```

**Action（动作）** — 存储键 `fitness_actions`
```typescript
{
  id: string,
  name: string,
  categories: string[],        // 大类：['胸部']
  subcategories: { [category: string]: string[] },  // 子分类：{ '胸部': ['上胸'] }
  isUnilateral: boolean        // 是否单侧动作
}
```

**DaySettings（训练设置）** — 存储键 `fitness_day_settings`
```typescript
{
  isDarkMode: boolean,
  autoStartTimer: boolean,
  autoFillData: boolean,
  bubbleFill: boolean,
  heavyTimerDuration: number,  // 大肌群计时器秒数（默认 180）
  lightTimerDuration: number,  // 小肌群计时器秒数（默认 120）
  todayTrainBtnVisible: boolean,
  liquidGlassEnabled: boolean,
  splitPlan: {
    enabled: boolean,
    mode: 'cycle' | 'week',
    cycleDays: string[],       // 循环模式：每天的模板名
    weekPlan: string[],        // 周模式：周一到周日的模板名
    startOffset: number,       // 循环偏移量
    lastActiveDate: string
  }
}
```

**Anniversary（纪念日）** — 存储键 `annivs`
```typescript
{
  id: string,
  name: string,
  date: string,  // YYYY-MM-DD
  color: string
}
```

**BodyPartConfig（肌群配置）** — 存储键 `training_stat_bodypart_config`
```typescript
{
  order: string[],      // 肌群排序
  visible: { [part: boolean] }  // 可见性
}
```

**BackupConfig（备份配置）** — 存储键 `backup_config`
```typescript
{
  backupPath: string,   // Android SAF URI
  lastBackupTime: number
}
```

### 1.4 工具模块清单

| 模块 | 说明 | 关键导出 |
|------|------|----------|
| dayHelper.js | Entry 数据结构工厂、占位条目、文本解析 | `ENTRY_TYPE`, `buildEntry()`, `fillPlaceholderEntries()`, `getEntryDisplayText()`, `getTotalWeight()` |
| color.js | 对比色计算、预设色板（11色）、主题生成 | `getContrastColor()`, `PRESET_COLORS`, `generateThemeMethod2()` |
| canvasHelper.js | 跨平台 Canvas 管理 | `CanvasManager` 类, `measureTextWidth()` |
| trainingAnalyzer.js | 基于 28 天历史的智能模板推荐 | `analyzeTrainingPattern()` |
| presetTemplates.js | 6 套预设模板包 | 推日/拉日/腿日/臀日/上肢日/下肢日 |
| backup.js | 本地备份/恢复、SAF 权限、CSV 导出、备份版本控制（1536 行） | `backupData()`, `restoreData()`, `exportToCSV()`, `ensureSAFPermission()` |
| theme.js | 导航栏颜色管理 | `updateNavBar()`, `formatDate()` |

### 1.5 组件清单

| 组件 | 说明 |
|------|------|
| CalendarMonth | 月历网格，训练日颜色编码，长按清空 |
| ActionCard | 动作记录卡片，支持三种 Entry 类型，历史气泡填充，差值显示 |
| TimerModal | Canvas 环形倒计时，音频通知，振动，快速设置（大/小肌群） |
| TemplateSelector | 模板/有氧/休息日选择弹窗，预设模板包导入 |
| DaySettings | 训练设置面板（自动计时、自动填充、气泡填充、分化计划） |
| ProgressChart | Canvas 折线图，容量/1RM 切换，PR 标记，触摸十字线 |
| TrainingSplitPlan | 分化计划配置（循环/周模式），模板选择器 |
| DatePicker | 年/月滚轮选择器 |
| TrainingOverview | 训练总量概览（天数、组数、容量） |
| BodyPartTrend | 肌群趋势折线图 |
| BodyPartGrid | 肌群统计网格，badge 状态（低/正常/高） |
| BodyPartManager | 肌群排序管理，可见性开关 |

### 1.6 存储键汇总

| 键模式 | 用途 | 来源 |
|--------|------|------|
| `fitness_templates` | 模板数组 | template store |
| `fitness_actions` | 动作数组 | action store |
| `fitness_daydata_<date>` | 每日训练数据 | dayDataCache store |
| `fitness_index` | 日期索引（快速查询） | dayDataCache store |
| `fitness_day_settings` | 用户设置 | daySettings store |
| `fitness_timer_duration` | 计时器时长 | TimerModal |
| `fitness_card_expanded` | 卡片展开状态 | ActionCard |
| `annivs` | 纪念日数组（JSON 字符串） | index.vue |
| `backup_config` | 备份配置 | backup.js |
| `last_backup_time` | 最后备份时间 | backup.vue |
| `first_launch_done` | 首次启动标记 | App.vue |
| `actionCategoryCollapsed` | 分类折叠状态 | actionLibrary.vue |
| `training_stat_bodypart_config` | 肌群配置 | trainingStat.vue |
| `training_volume_history` | 周训练量历史 | volumeHistory |
| `temp_template_actions_backup` | 临时状态（页面间传递） | templateDetail.vue |
| `_pendingManageActions` | 临时动作排序 | manageActions.vue |
| `selectedYear` / `selectedMonth` | 年度页→首页导航 | year.vue |

---

## 二、迁移策略

### 2.1 整体架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        FitNote Flutter (Android)                │
├─────────────────────────────────────────────────────────────────┤
│                         UI Layer                                │
│  [CalendarMonth] [ActionCard] [TimerModal] [TemplateSelector]   │
│  [ProgressChart] [TrainingSplitPlan] [DaySettings] [...]        │
├─────────────────────────────────────────────────────────────────┤
│                     State Management (Riverpod)                 │
│  [DayDataProvider] [DayDataCacheProvider] [TemplateProvider]     │
│  [ActionProvider] [SettingsProvider] [StatsProvider]            │
├─────────────────────────────────────────────────────────────────┤
│                       Service Layer                             │
│  [StorageService] [BackupService] [CSVService]                  │
├─────────────────────────────────────────────────────────────────┤
│                          Data Layer                             │
│                        [Hive (NoSQL)]                           │
├─────────────────────────────────────────────────────────────────┤
│                         Utils                                   │
│  [DayHelper] [ColorHelper] [CanvasHelper] [DateHelper]          │
│  [TrainingAnalyzer] [PresetTemplates]                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 状态管理方案：Riverpod

选择 Riverpod（性能优先考量）：
- 编译时安全，无运行时异常
- 无需 Context 即可访问状态
- 天然支持异步操作和缓存（`AsyncNotifier`）
- 比 Bloc 样板代码少 60%+，比 Provider 更灵活
- `keepAlive` 可模拟原项目的 LRU 缓存行为

### 2.3 数据存储方案：Hive

选择 Hive（而非 SharedPreferences）：
- 原项目数据结构复杂（嵌套对象、Map、Array），SharedPreferences 只支持基本类型
- Hive 是 NoSQL，可直接存储 Dart 对象，与原项目 `uni.setStorageSync` 的使用模式最接近
- 读写性能优于 SQLite（适合日历页面需要批量读取 `fitness_daydata_*` 的场景）
- 支持 TypeAdapter 序列化，便于后续版本升级

---

## 三、迁移步骤

### 阶段 1：项目初始化与基础配置（3天）

| 任务 | 描述 | 状态 |
|------|------|------|
| 1.1 | 创建 Flutter 项目，配置 Android 签名和包名 `com.fitnote.app` | 待执行 |
| 1.2 | 配置项目结构（见第四节） | 待执行 |
| 1.3 | 添加依赖并确认兼容性 | 待执行 |
| 1.4 | 实现主题系统（深色/浅色 + 液态玻璃） | 待执行 |
| 1.5 | 配置 Android 权限（存储、振动、文件访问） | 待执行 |

**依赖清单**：

```yaml
dependencies:
  # 状态管理
  flutter_riverpod: ^2.x

  # 本地存储
  hive: ^2.x
  hive_flutter: ^1.x

  # UI / 交互
  flutter_slidable: ^3.x          # 侧滑操作
  fl_chart: ^0.x                  # 图表（替代已停维的 charts_flutter）
  reorderables: ^0.x              # 拖拽排序

  # 工具
  intl: ^0.x                      # 日期处理
  csv: ^5.x                       # CSV 生成
  path_provider: ^2.x             # 文件路径
  share_plus: ^7.x                # 分享文件
  audioplayers: ^5.x              # 计时器音频通知
  file_picker: ^6.x               # 文件选择（导入备份）
  uuid: ^4.x                      # 生成唯一 ID

dev_dependencies:
  hive_generator: ^2.x            # TypeAdapter 代码生成
  build_runner: ^2.x
  flutter_lints: ^3.x
```

### 阶段 2：数据层迁移（4天）

| 任务 | 描述 | 状态 |
|------|------|------|
| 2.1 | 定义 Hive 数据模型 + TypeAdapter（DayData, Entry, Template, Action, DaySettings, Anniversary, BodyPartConfig） | 待执行 |
| 2.2 | 实现 StorageService — 封装 Hive 读写，兼容原 `fitness_*` 键名 | 待执行 |
| 2.3 | 实现 DayDataCacheService — LRU 缓存（500条上限）、日期索引、月预加载 | 待执行 |
| 2.4 | 迁移工具函数（DayHelper, ColorHelper, DateHelper, TrainingAnalyzer, PresetTemplates） | 待执行 |
| 2.5 | 内置 156 个预设动作数据（assets 或 seed data） | 待执行 |
| 2.6 | 实现 **旧数据导入工具** — 解析原 uni.setStorageSync 格式的 JSON，迁移到 Hive | 待执行 |
| 2.7 | 实现 CSV 导出功能 | 待执行 |
| 2.8 | 实现本地备份/恢复（备份为 JSON 文件，支持导入旧格式备份） | 待执行 |

**旧数据导入方案（重点）**：
```
导入流程：
1. 用户选择旧版导出的 JSON 文件（通过 file_picker）
2. 解析 JSON，识别数据格式版本（v1.0）
3. 逐条写入 Hive：
   - fitness_templates → templates box
   - fitness_actions → actions box
   - fitness_daydata_* → daydata box
   - annivs → anniversaries box
   - fitness_day_settings → settings box
4. 构建日期索引（fitness_index）
5. 显示迁移摘要（导入了多少天数据、多少模板等）
6. 支持覆盖/合并两种导入模式
```

### 阶段 3：状态管理实现（3天）

| 任务 | 描述 | 状态 |
|------|------|------|
| 3.1 | DayDataNotifier — 加载/保存单日数据、添加/删除 Entry、选择模板 | 待执行 |
| 3.2 | DayDataCacheNotifier — 缓存管理、索引构建、批量查询最新记录 | 待执行 |
| 3.3 | TemplateNotifier — CRUD、排序、颜色管理、动作排序 | 待执行 |
| 3.4 | ActionNotifier — CRUD、分类过滤、搜索、自动分类检测、动作重命名联动 | 待执行 |
| 3.5 | SettingsNotifier — 主题、计时器、自动填充、分化计划（含循环偏移推算） | 待执行 |
| 3.6 | StatsNotifier — 肌群统计、周/月训练量、badge 状态计算 | 待执行 |

### 阶段 4：UI 组件迁移（12天）

| 任务 | 描述 | 状态 |
|------|------|------|
| **页面** | | |
| 4.1 | 首页（home）— 日历 + 纪念日 + 分化计划 + 底部 TabBar | 待执行 |
| 4.2 | 每日训练页（day）— 模板选择 + ActionCard 列表 + 计时器 + 设置 | 待执行 |
| 4.3 | 动作历史页（actionHistory）— 进度图表 + 历史列表 + 分页 | 待执行 |
| 4.4 | 模板详情页（templateDetail）— 拖拽排序 + 颜色选择 + 动作搜索 | 待执行 |
| 4.5 | 模板管理页（templateManager）— 排序 + 导入导出 + 冲突解决 | 待执行 |
| 4.6 | 动作库页（actionLibrary）— 分类 Tab + 搜索 + CRUD | 待执行 |
| 4.7 | 训练统计页（trainingStat）— 概览 + 肌群趋势 + 肌群网格 + 管理 | 待执行 |
| 4.8 | 数据备份页（backup）— 本地备份/恢复 + CSV 导出 + 旧数据导入 | 待执行 |
| 4.9 | 年度总览页（year）— 12 月迷你日历 + 懒加载 | 待执行 |
| 4.10 | 日内动作管理页（manageActions）— 拖拽排序 + 删除 + 添加 | 待执行 |
| **通用组件** | | |
| 4.11 | CalendarMonth — 月历网格 Widget | 待执行 |
| 4.12 | ActionCard — 动作记录卡片（三种 Entry 类型） | 待执行 |
| 4.13 | TimerModal — 环形倒计时（CustomPainter） | 待执行 |
| 4.14 | ProgressChart — 折线图（fl_chart） | 待执行 |
| 4.15 | TemplateSelector — 模板选择弹窗 | 待执行 |
| 4.16 | DaySettings — 设置面板 | 待执行 |
| 4.17 | TrainingSplitPlan — 分化计划配置 | 待执行 |

### 阶段 5：交互与动画（3天）

| 任务 | 描述 | 状态 |
|------|------|------|
| 5.1 | 日历滑动切换月份（PageView + cubic-bezier 动画） | 待执行 |
| 5.2 | 侧滑删除（flutter_slidable） | 待执行 |
| 5.3 | 拖拽排序（reorderables / 手势检测） | 待执行 |
| 5.4 | 液态玻璃效果（BackdropFilter + ClipRRect） | 待执行 |
| 5.5 | 模态弹窗动画（fadeIn scale 0.9→1） | 待执行 |
| 5.6 | 面板滑入动画（slideUp translateY 100%→0） | 待执行 |
| 5.7 | 备份按钮呼吸动画（AnimatedContainer scale） | 待执行 |
| 5.8 | 分类折叠动画（AnimatedSize） | 待执行 |
| 5.9 | 振动反馈（HapticFeedback） | 待执行 |
| 5.10 | 页面路由转场动画 | 待执行 |

### 阶段 6：测试与验证（3天）

| 任务 | 描述 | 状态 |
|------|------|------|
| 6.1 | 功能测试 — 10 个页面逐一验证 | 待执行 |
| 6.2 | 旧数据导入测试 — 验证原 uni 格式 JSON 能正确导入 | 待执行 |
| 6.3 | 备份/恢复测试 — 备份文件能在新旧版本间互导 | 待执行 |
| 6.4 | 性能测试 — 日历年份滚动、大量 daydata 读取 | 待执行 |
| 6.5 | Android 权限测试 — SAF 文件访问、振动 | 待执行 |
| 6.6 | 发布前检查 — APK 签名、版本号、图标 | 待执行 |

---

## 四、文件结构规划

```
fitnote_flutter/
├── lib/
│   ├── main.dart                          # 入口文件
│   ├── app.dart                           # MaterialApp + 主题配置
│   │
│   ├── models/                            # Hive 数据模型
│   │   ├── day_data.dart                  # DayData + Entry + Stage
│   │   ├── template.dart                  # Template
│   │   ├── action.dart                    # Action
│   │   ├── day_settings.dart              # DaySettings + SplitPlan
│   │   ├── anniversary.dart               # Anniversary
│   │   ├── body_part_config.dart          # BodyPartConfig
│   │   └── backup_config.dart             # BackupConfig
│   │
│   ├── providers/                         # Riverpod Providers
│   │   ├── day_data_provider.dart         # 单日数据 + 缓存
│   │   ├── template_provider.dart         # 模板管理
│   │   ├── action_provider.dart           # 动作库
│   │   ├── settings_provider.dart         # 设置 + 主题
│   │   └── stats_provider.dart            # 统计数据
│   │
│   ├── services/                          # 服务层
│   │   ├── storage_service.dart           # Hive 封装
│   │   ├── backup_service.dart            # 备份/恢复 + 旧数据导入
│   │   └── csv_service.dart               # CSV 导出
│   │
│   ├── utils/                             # 工具函数
│   │   ├── day_helper.dart                # Entry 工厂、占位条目、文本解析
│   │   ├── color_helper.dart              # 对比色、预设色板、主题生成
│   │   ├── date_helper.dart               # 日期格式化
│   │   ├── canvas_helper.dart             # Canvas 管理
│   │   ├── training_analyzer.dart         # 智能模板推荐
│   │   └── preset_templates.dart          # 6 套预设模板包
│   │
│   ├── widgets/                           # 通用组件
│   │   ├── calendar_month.dart            # 月历网格
│   │   ├── action_card.dart               # 动作记录卡片
│   │   ├── timer_modal.dart               # 环形倒计时
│   │   ├── template_selector.dart         # 模板选择弹窗
│   │   ├── day_settings_panel.dart        # 设置面板
│   │   ├── progress_chart.dart            # 进度折线图
│   │   ├── training_split_plan.dart       # 分化计划配置
│   │   ├── date_picker.dart               # 年/月选择器
│   │   ├── training_overview.dart         # 训练概览
│   │   ├── body_part_trend.dart           # 肌群趋势图
│   │   ├── body_part_grid.dart            # 肌群网格
│   │   ├── body_part_manager.dart         # 肌群管理
│   │   └── liquid_glass.dart              # 液态玻璃效果
│   │
│   ├── views/                             # 页面视图
│   │   ├── home/
│   │   │   ├── home_page.dart             # 首页（日历 + 纪念日 + TabBar）
│   │   │   └── widgets/
│   │   │       ├── anniversary_card.dart
│   │   │       └── bottom_tab_bar.dart
│   │   ├── day/
│   │   │   └── day_page.dart              # 每日训练
│   │   ├── action_history/
│   │   │   └── action_history_page.dart   # 动作历史
│   │   ├── template_detail/
│   │   │   └── template_detail_page.dart  # 模板详情
│   │   ├── template_manager/
│   │   │   └── template_manager_page.dart # 模板管理
│   │   ├── action_library/
│   │   │   └── action_library_page.dart   # 动作库
│   │   ├── training_stat/
│   │   │   └── training_stat_page.dart    # 训练统计
│   │   ├── backup/
│   │   │   └── backup_page.dart           # 数据备份
│   │   ├── year/
│   │   │   └── year_page.dart             # 年度总览
│   │   └── manage_actions/
│   │       └── manage_actions_page.dart   # 日内动作管理
│   │
│   └── data/                              # 内置数据
│       └── initial_actions.dart           # 156 个预设动作
│
├── assets/
│   ├── sounds/
│   │   └── notification.mp3               # 计时器音频
│   ├── icons/                             # SVG/PNG 图标
│   └── images/                            # 启动图等
│
├── android/                               # Android 原生配置
│   └── app/
│       └── src/
│           └── main/
│               └── AndroidManifest.xml    # 权限声明
│
└── pubspec.yaml
```

---

## 五、关键技术要点

### 5.1 旧数据迁移（重点）

原项目所有数据存储在 `uni.setStorageSync` 中（键值对 JSON），迁移方案：

1. **首次启动检测**：检查 Hive 中是否有数据，若无则弹出导入引导
2. **文件导入**：用户选择旧版导出的 JSON 文件
3. **格式解析**：
   ```
   旧格式: { templates: [...], actions: [...], daydata: { "2026-01-01": {...}, ... }, annivs: [...] }
   ```
4. **逐条转换**：旧 JSON 对象 → Dart Model → 写入 Hive Box
5. **索引重建**：遍历所有 `daydata` 生成 `fitness_index`
6. **兼容保留**：保留原键名命名规则，确保旧备份文件仍可导入

### 5.2 本地备份方案

```
备份文件格式 (JSON):
{
  "version": "2.0",
  "timestamp": 1716800000000,
  "data": {
    "templates": [...],
    "actions": [...],
    "daydata": { "2026-01-01": {...}, ... },
    "annivs": [...],
    "settings": {...}
  }
}

兼容性：
- v2.0 格式：Flutter 新版
- v1.0 格式：原 uni-app 导出的备份，导入时自动转换
```

备份/恢复流程：
- 备份：序列化所有 Hive Box → JSON → 保存到用户选择的目录（SAF）或应用内目录
- 恢复：读取 JSON 文件 → 解析版本 → 覆盖/合并写入 Hive → 重建索引
- 选择目录：使用 `file_picker` 包替代原 Android SAF 手动调用

### 5.3 主题系统

```dart
// 使用 Riverpod 管理主题状态
@riverpod
class ThemeNotifier extends _$ThemeNotifier {
  @override
  ThemeMode build() => ThemeMode.dark;  // 默认深色

  void toggle() {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    ref.read(settingsProvider.notifier).toggleTheme();
  }
}

// 深色主题
final darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: Color(0xFF121212),
  colorScheme: ColorScheme.dark(primary: Color(0xFF379bff)),
);

// 浅色主题
final lightTheme = ThemeData(
  brightness: Brightness.light,
  scaffoldBackgroundColor: Color(0xFFF5F5F5),
  colorScheme: ColorScheme.light(primary: Color(0xFF379bff)),
);
```

### 5.4 液态玻璃效果

使用 `BackdropFilter` + `ClipRRect` 实现：

```dart
class LiquidGlass extends StatelessWidget {
  final Widget child;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return child;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white.withOpacity(0.08)
                : Colors.white.withOpacity(0.6),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: child,
        ),
      ),
    );
  }
}
```

### 5.5 DayDataCache — LRU 缓存策略

原项目 `dayDataCache.js` 实现了复杂的缓存机制，Flutter 迁移要点：

- 使用 `LinkedHashMap` 实现 LRU（最近最少使用），上限 500 条
- 日期索引用 `Set<String>` 存储，启动时从 Hive 加载
- 月预加载：进入日历时预加载当月前后各 1 个月的数据
- 批量查询：`batchGetLatestRecords()` 用于自动填充历史记录

### 5.6 训练分化计划

`daySettings.js` 中的 `splitPlan` 逻辑较复杂：

- **循环模式**：N 天为一个周期，每天指定模板，支持偏移量自动推算
- **周模式**：周一到周日各指定模板
- **偏移推算**：`_inferCycleOffset()` 根据最近 14 天训练历史推算当前应该在周期的第几天
- 迁移时需保持此逻辑完整性

### 5.7 训练统计 — 肌群分析

- 遍历所有 `fitness_daydata_*`，按动作分类聚合
- 周训练量历史（`training_volume_history`）用于 badge 状态判定（低/正常/高）
- 肌群排序和可见性可由用户自定义（`bodyPartConfig`）

### 5.8 动作重命名联动

原项目 `action.js` 的 `renameAction()` 会联动更新：
- 所有 `fitness_daydata_*` 中的 `entries` 键名
- 所有 `fitness_templates` 中的 `actions` 和 `actionOrder`
- 迁移时需保持此联动逻辑

### 5.9 Android 权限配置

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />  <!-- Android 11+ SAF -->
```

---

## 六、风险与注意事项

| 风险点 | 描述 | 应对策略 |
|--------|------|----------|
| 旧数据兼容 | 用户已有的 uni-app 数据需导入 Flutter 版 | 实现专用导入工具，支持 v1.0 和 v2.0 格式 |
| 备份文件兼容 | 用户已导出的备份文件必须能导入新版 | 保留原 JSON 格式解析，自动识别版本 |
| 日历性能 | 大量 daydata 读取可能导致卡顿 | LRU 缓存 + 月预加载 + 懒加载年份 |
| 拖拽排序 | 原项目用 movable-view 实现，Flutter 方案不同 | 使用 reorderables 或自定义手势检测 |
| Canvas 图表 | 原项目用 uni.createCanvasContext，Flutter 用 CustomPainter | 重写为 CustomPainter，fl_chart 替代 |
| 液态玻璃 | 1073 行 CSS 需转为 Flutter Widget | 提取核心效果（blur + 半透明 + 边框），封装为可复用 Widget |
| SAF 文件操作 | 原项目深度使用 Android SAF API | 使用 file_picker 包简化，必要时写 Platform Channel |
| 156 个预设动作 | 中文名、分类、子分类需完整迁移 | 作为内置数据打包，启动时 seed 到 Hive |
| 动作重命名联动 | 重命名需更新所有 daydata 和 templates | 在 ActionNotifier 中实现事务性更新 |

---

## 七、时间估算

| 阶段 | 天数 | 备注 |
|------|------|------|
| 项目初始化 | 3 | 环境搭建、Android 配置、依赖确认 |
| 数据层 | 4 | 7 个模型 + 缓存服务 + 旧数据导入 + 备份恢复 |
| 状态管理 | 6 | 6 个 Notifier（含缓存、联动逻辑） |
| UI 组件 | 12 | 10 个页面 + 12 个通用组件 |
| 交互动画 | 3 | 10 种动画效果 |
| 测试验证 | 3 | 功能、数据迁移、性能、权限 |
| **总计** | **31天** | |

---

## 八、后续计划

1. **第一阶段（3天）**：项目初始化、Android 配置、主题系统
2. **第二阶段（4天）**：数据模型、存储服务、156 个预设动作、旧数据导入工具
3. **第三阶段（6天）**：全部 Riverpod Notifier 实现
4. **第四阶段（8天）**：核心页面（首页、日训练、模板管理、动作库）
5. **第五阶段（4天）**：剩余页面（统计、备份、年度总览、动作历史、管理动作）
6. **第六阶段（3天）**：交互动画、液态玻璃
7. **第七阶段（3天）**：测试、优化、发布

---

**文档版本**: v2.0
**更新日期**: 2026-05-27
**适用项目**: FitNote UniApp → Flutter 迁移（仅 Android）
**变更说明**: 补全遗漏页面/组件/数据模型/工具函数，移除云备份和小程序支持，明确旧数据导入方案，修正依赖和时间估算
