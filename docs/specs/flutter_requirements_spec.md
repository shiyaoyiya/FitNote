# FitNote Flutter Android 版需求文档

## 1. 项目概述

### 1.1 项目背景
FitNote 是一款专为健身爱好者打造的训练记录应用，帮助用户科学规划训练、追踪进步。本需求文档基于原 UniApp 微信小程序版本，迁移至 Flutter 框架，仅支持 Android 平台，**移除云备份功能**。

### 1.2 产品定位
- **目标用户**：健身爱好者、力量训练者、健身新手
- **核心价值**：简单高效的训练记录工具，帮助用户系统化管理训练计划和进度追踪

### 1.3 技术定位
| 分类 | 技术方案 |
|------|----------|
| 框架 | Flutter SDK 3.x (Android 原生) |
| 状态管理 | Riverpod |
| UI 组件 | Material 3 + 自定义 Widget |
| 数据存储 | Hive (NoSQL) |
| 目标平台 | Android 10+ |

---

## 2. 功能需求

### 2.1 核心功能模块

#### 2.1.1 智能训练日历
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-001 | 月历形式直观展示训练计划，左右滑动切换月份 | 高 |
| FR-002 | 颜色区分不同训练部位，一眼看清整月训练安排 | 高 |
| FR-003 | 点击日期进入训练记录，长按标记休息日 | 高 |
| FR-004 | 支持年度总览，快速跳转任意月份 | 中 |

#### 2.1.2 训练记录与执行
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-005 | 快速从动作库或模板选择训练动作 | 高 |
| FR-006 | 组数记录：重量(kg) + 次数，支持逐组录入 | 高 |
| FR-007 | 上次对比：完成一组后自动显示与上次同动作的重量对比 | 高 |
| FR-008 | 内置组间休息倒计时（支持自定义时长） | 高 |
| FR-009 | 点击动作查看历史训练记录 | 中 |
| FR-010 | 支持动作卡片拖拽排序 | 中 |
| FR-011 | 支持三种训练记录类型：普通组、递减组、暂停组 | 高 |
| FR-040 | 单侧动作（如单臂哑铃弯举）自动翻倍重量计算 | 中 |
| FR-041 | 占位条目：根据模板配置的组数自动显示空位，引导用户完成训练 | 中 |
| FR-042 | 暂停组支持暂停秒数记录（pauseSec），用于记录组间暂停时长 | 中 |
| FR-043 | 每日训练支持动作卡片拖拽排序，记录当日动作顺序 | 中 |

#### 2.1.3 动作库管理
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-012 | 自定义添加/编辑/删除训练动作 | 高 |
| FR-013 | 按部位分类管理动作（胸、背、肩、手臂、腿、核心、有氧等） | 高 |
| FR-014 | 查看动作使用频率和历史记录 | 中 |
| FR-015 | 内置丰富的预设动作库（156个） | 高 |
| FR-016 | 动作搜索功能 | 高 |
| FR-017 | 动作重命名联动更新历史数据 | 中 |
| FR-044 | 动作支持多部位分类（如卧推同时属于胸部和手臂） | 中 |
| FR-045 | 子分类管理（如胸部→上胸/中下胸，背部→大圆肌/上斜方/中下背/背阔/竖脊肌） | 中 |

#### 2.1.4 训练模板系统
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-018 | 创建训练模板（胸部日、背肌日、腿部日等） | 高 |
| FR-019 | 为模板设置颜色标识，日历中一目了然 | 高 |
| FR-020 | 快速将模板应用到指定日期 | 高 |
| FR-021 | 支持分化训练计划设置（循环模式/周模式） | 高 |
| FR-022 | 模板导入导出功能（剪贴板文本格式） | 中 |
| FR-023 | 模板冲突解决机制 | 中 |
| FR-046 | 为模板中每个动作设置目标组数 | 高 |
| FR-047 | 自定义颜色面板：用户可保存常用颜色到模板 | 中 |
| FR-048 | 预设模板包：内置 PPL、上下肢分化等经典训练方案 | 中 |

#### 2.1.5 训练统计分析
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-024 | 部位状态监测：智能算法分析近期各部位刺激强度 | 高 |
| FR-025 | BodyPartGrid：部位肌肉群网格可视化展示 | 高 |
| FR-026 | BodyPartTrend：部位训练趋势分析图表 | 高 |
| FR-027 | 周/月训练量统计和对比 | 高 |
| FR-028 | 容量历史追踪 | 中 |
| FR-029 | 肌群排序和可见性自定义 | 中 |
| FR-049 | 容量维度切换：支持按重量、组数、次数三种维度查看统计 | 高 |
| FR-050 | PR（个人记录）标记：自动识别并标记各动作的历史最大重量 | 中 |
| FR-051 | 训练概览卡片：展示当月/年训练天数、总组数、总容量 | 中 |
| FR-052 | 智能模板推荐：分析近28天训练数据，推荐薄弱部位对应的模板 | 中 |

#### 2.1.6 数据备份与恢复（**不含云备份**）
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-030 | 一键导出训练数据为 JSON 文件 | 高 |
| FR-031 | 支持数据导入，恢复训练记录 | 高 |
| FR-032 | 支持 CSV 格式导出 | 中 |
| FR-033 | 旧版 UniApp 数据导入工具 | 高 |
| FR-053 | 增量备份：仅导出自上次备份以来的变更数据 | 中 |
| FR-054 | 备份元数据：记录备份类型、时间、设备信息、应用版本 | 低 |

#### 2.1.7 个性化设置
| 需求编号 | 功能描述 | 优先级 |
|----------|----------|--------|
| FR-034 | 深色/浅色主题切换 | 高 |
| FR-035 | 液态玻璃视觉效果 | 中 |
| FR-036 | 纪念日功能：记录重要日期，首页展示已过去天数 | 中 |
| FR-037 | 首次启动引导说明 | 高 |
| FR-038 | 计时器时长自定义（大/小肌群） | 中 |
| FR-039 | 自动填充历史数据开关 | 中 |
| FR-055 | 分化计划循环偏移量自动推断：根据历史训练记录自动计算当前循环位置 | 中 |

---

## 3. 数据模型

### 3.1 DayData（每日训练数据）

```dart
class DayData {
  Map<String, dynamic> templates;  // 模板使用记录
  Map<String, List<Entry>> entries;  // 动作训练记录
  Map<String, int> actions;  // 动作 → 组数
  Map<String, List<String>> actionOrder;  // 模板 → 当日动作排序
  bool isRestDay;  // 是否休息日
  String restReason;  // 休息原因
  String color;  // 训练颜色标识
  bool? isAerobic;  // 是否有氧训练
  String? aerobicName;  // 有氧名称
  int? aerobicDuration;  // 有氧时长(分钟)
}
```

### 3.2 Entry（训练记录条目）

支持三种类型：
- **普通组**：`{ type: 'normal', input: '12×60', total: 720, isPlaceholder: false }`
- **递减组**：`{ type: 'decreasing', stages: [{ reps: 12, weight: 60 }, ...], total: 1220, isPlaceholder: false }`
- **暂停组**：`{ type: 'paused', stages: [{ reps: 8, weight: 80 }, { pauseSec: 15, reps: 5, weight: 80 }], total: 1040, isPlaceholder: false }`

```dart
class Entry {
  String input;      // 显示字符串，如 "10×50"
  double total;      // 计算总重量/容量
  String type;       // 'normal' | 'decreasing' | 'paused'
  List<Stage> stages;  // 多阶段支持（递减组、暂停组）
  bool isPlaceholder;  // 是否为占位条目（未填写的模板空位）
}

class Stage {
  int reps;
  double weight;
  double total;
  int? pauseSec;  // 暂停秒数，暂停组专用
}
```

### 3.3 Template（训练模板）

```dart
class Template {
  String id;
  String name;
  List<String> actions;  // 动作名列表
  Map<String, int> actionSets;  // 每个动作的目标组数
  String color;  // 模板颜色（Hex）
  List<CustomColor> customColors;  // 用户自定义颜色面板
  bool? isAerobic;  // 是否有氧模板
}

class CustomColor {
  String name;   // 颜色名称
  String value;  // Hex 颜色值
}
```

### 3.4 Action（动作）

```dart
class Action {
  String id;
  String name;
  List<String> categories;  // 大类：['chest', 'arms']
  Map<String, List<String>> subcategories;  // 子分类映射
  String categoryName;  // 主分类显示名，如 "胸部"
  String createdAt;  // ISO 时间戳
  bool isUnilateral;  // 是否单侧动作（重量自动×2）
}

// 预设分类体系：
// chest(胸部) → upper_chest, mid_lower_chest
// back(背部) → teres_major, upper_traps, mid_lower_traps, lats, erector_spinae
// shoulders(肩部) → front_delt, side_delt, rear_delt
// arms(手臂) → biceps, triceps
// legs(腿部) → quads, hamstrings, calves, glutes
// abs(腹部)
```

### 3.5 DaySettings（训练设置）

```dart
class DaySettings {
  bool isDarkMode;  // 深色模式
  bool autoStartTimer;  // 自动开始计时
  bool autoFillData;  // 自动填充数据
  bool bubbleFill;  // 气泡填充
  int heavyTimerDuration;  // 大肌群计时器秒数（默认180）
  int lightTimerDuration;  // 小肌群计时器秒数（默认120）
  bool todayTrainBtnVisible;  // 今日训练按钮可见
  bool liquidGlassEnabled;  // 液态玻璃效果
  SplitPlan splitPlan;  // 分化计划配置
}

class SplitPlan {
  bool enabled;
  String mode;  // 'cycle' | 'week'
  List<String> cycleDays;  // 循环模式：每天的模板名
  List<String> weekPlan;  // 周模式：周一到周日的模板名
  int startOffset;  // 循环偏移量
  String lastActiveDate;
}
```

### 3.6 Anniversary（纪念日）

```dart
class Anniversary {
  String id;
  String title;    // 纪念日标题
  String date;     // YYYY-MM-DD
  String daysText; // 计算后的天数文本
}
```

### 3.7 BackupPayload（备份数据结构）

```dart
class BackupPayload {
  String version;           // 数据格式版本号
  String backupType;        // 'full' | 'incremental'
  String backupTime;        // ISO 时间戳
  String? lastBackupTime;   // 上次备份时间（增量备份用）
  BackupData data;
  BackupMetadata metadata;
}

class BackupData {
  List<Template> templates;
  List<Action> actions;
  List<Anniversary> anniversaries;
  Map<String, DayData> daydata;  // 日期 → 训练数据
}

class BackupMetadata {
  String appVersion;
  String deviceInfo;
}
```

---

## 4. 页面结构

### 4.1 页面列表

| 页面名称 | 功能描述 | 路由路径 |
|----------|----------|----------|
| 首页（日历） | 月历视图、纪念日展示、底部导航 | `/home` |
| 每日训练 | 模板选择、动作记录、计时器、设置 | `/day` |
| 动作历史 | 单动作历史记录、进度图表 | `/actionHistory` |
| 模板详情 | 编辑模板、拖拽排序、颜色管理 | `/templateDetail` |
| 模板管理 | 创建/删除/排序模板、导入导出 | `/templateManager` |
| 动作库 | 分类浏览、搜索、增删改 | `/actionLibrary` |
| 训练统计 | 周/月总量、肌群趋势、肌群网格 | `/trainingStat` |
| 数据备份 | 本地备份/恢复、CSV导出、旧数据导入 | `/backup` |
| 年度总览 | 12月迷你日历、训练天数统计 | `/year` |
| 日内动作管理 | 拖拽排序动作、删除、添加 | `/manageActions` |

### 4.2 导航结构

```
首页（日历）
├── 每日训练页（点击日期）
│   ├── 动作历史页（点击动作卡片）
│   └── 日内动作管理页（管理按钮）
├── 年度总览页（点击年份）
├── 动作库页（底部导航）
├── 模板管理页（底部导航）
├── 训练统计页（底部导航）
└── 数据备份页（底部导航）
```

---

## 5. 核心组件

### 5.1 通用组件清单

| 组件名称 | 功能描述 |
|----------|----------|
| CalendarMonth | 月历网格，训练日颜色编码，长按清空，支持左右滑动切换月份 |
| ActionCard | 动作记录卡片，支持三种Entry类型，历史气泡填充，差值显示，单侧动作标记 |
| TimerModal | 环形倒计时，音频通知，振动，快速设置（大肌群180s/小肌群120s） |
| TemplateSelector | 模板/有氧/休息日选择弹窗，预设模板包导入 |
| DaySettings | 训练设置面板（自动计时、自动填充、气泡填充、分化计划） |
| ProgressChart | 折线图，容量/1RM切换，PR标记，触摸十字线 |
| TrainingSplitPlan | 分化计划配置（循环/周模式），模板选择器，自动偏移推断 |
| DatePicker | 年/月滚轮选择器 |
| TrainingOverview | 训练总量概览（天数、组数、容量） |
| BodyPartTrend | 肌群趋势折线图 |
| BodyPartGrid | 肌群统计网格，badge状态（低/正常/高） |
| BodyPartManager | 肌群排序管理，可见性开关 |
| BodyPartSelector | 肌群选择器，用于动作分类时选择部位 |
| LiquidGlass | 液态玻璃效果包装组件 |
| TrainingAnalyzer | 智能分析引擎，分析近28天训练推荐薄弱部位模板 |
| VolumeDimensionToggle | 容量维度切换控件（重量/组数/次数） |
| PRBadge | 个人记录徽章，标记历史最大重量 |

---

## 6. 非功能需求

### 6.1 性能要求
| 需求编号 | 描述 |
|----------|------|
| NFR-001 | 日历页面滑动流畅，支持大量历史数据（1000+天） |
| NFR-002 | 数据备份/恢复操作在10秒内完成 |
| NFR-003 | 页面跳转响应时间 < 300ms |
| NFR-009 | 数据缓存策略：内存缓存 + 日期索引，日历渲染需毫秒级响应 |
| NFR-010 | 统计页面支持月/年维度切换时无明显卡顿 |

### 6.2 兼容性要求
| 需求编号 | 描述 |
|----------|------|
| NFR-004 | 支持 Android 10 及以上版本 |
| NFR-005 | 支持从 UniApp 版本导入数据（v1.0格式） |
| NFR-006 | 支持不同屏幕尺寸和分辨率 |
| NFR-011 | 数据版本兼容：支持多种历史数据格式的自动迁移（旧版字符串动作列表→新版对象格式） |
| NFR-012 | 增量备份兼容：增量备份文件可独立恢复，也可叠加在全量备份之上恢复 |

### 6.3 安全性要求
| 需求编号 | 描述 |
|----------|------|
| NFR-007 | 用户数据仅存储在本地设备，不上传云端 |
| NFR-008 | 备份文件加密存储（可选） |

---

## 7. 数据存储方案

### 7.1 Hive Box 设计

| Box 名称 | 存储内容 | 说明 |
|----------|----------|------|
| `daydata` | 每日训练数据 | 按日期索引（key: `YYYY-MM-DD`） |
| `templates` | 训练模板 | 数组存储 |
| `actions` | 动作库 | 数组存储 |
| `settings` | 用户设置 | 单文档 |
| `anniversaries` | 纪念日 | 数组存储 |
| `stats` | 统计数据缓存 | 包括周训练量历史、PR记录 |
| `index` | 日期索引 | 维护所有有数据的日期集合，加速日历渲染 |

### 7.2 缓存策略

应用需实现多层缓存以保证流畅体验：

1. **内存缓存**：常用数据（当前月/周）常驻内存，避免频繁读取 Hive
2. **日期索引**：`index` box 维护所有有训练数据的日期集合，日历渲染时无需遍历 daydata
3. **月视图缓存**：按 `年-月` 缓存当月所有天的训练状态
4. **周统计缓存**：按 `年-W周` 缓存每周训练量
5. **缓存淘汰**：内存缓存超过 500 条时自动淘汰最久未访问的数据

### 7.3 旧数据迁移方案

支持从 UniApp 版本导入数据：
1. 用户选择旧版导出的 JSON 文件
2. 解析 JSON，识别数据格式版本（v1.0）
3. 逐条转换并写入 Hive
4. 构建日期索引
5. 显示迁移摘要

---

## 8. 技术选型

### 8.1 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| flutter_riverpod | ^2.x | 状态管理 |
| hive | ^2.x | 本地存储 |
| hive_flutter | ^1.x | Hive Flutter 集成 |
| hive_generator | ^2.x | Hive TypeAdapter 代码生成 |
| build_runner | ^2.x | 代码生成工具 |
| flutter_slidable | ^3.x | 侧滑操作 |
| fl_chart | ^0.x | 图表组件 |
| reorderables | ^0.x | 拖拽排序 |
| intl | ^0.x | 日期处理 |
| csv | ^5.x | CSV生成 |
| path_provider | ^2.x | 文件路径 |
| share_plus | ^7.x | 分享文件 |
| audioplayers | ^5.x | 计时器音频 |
| file_picker | ^6.x | 文件选择 |
| uuid | ^4.x | 唯一ID生成 |
| go_router | ^14.x | 声明式路由管理 |
| flutter_local_notifications | ^17.x | 计时器完成本地通知 |
| vibration | ^2.x | 计时器完成振动反馈 |

---

## 9. 功能优先级汇总

### 高优先级（必须实现）
- 日历浏览与训练记录
- 动作库管理（含预设动作、多部位分类、子分类）
- 训练模板系统（含每个动作目标组数配置）
- 训练统计分析（含容量维度切换、训练概览卡片）
- 本地数据备份/恢复（不含云备份）
- 旧数据导入工具
- 深色/浅色主题切换
- 首次启动引导

### 中优先级（建议实现）
- 年度总览
- 纪念日功能
- 液态玻璃效果
- CSV导出
- 模板导入导出
- 肌群排序和可见性自定义
- 智能模板推荐（训练分析器）
- PR（个人记录）标记
- 增量备份
- 占位条目与单侧动作支持
- 暂停组暂停秒数记录
- 自定义颜色面板
- 预设模板包
- 分化计划偏移量自动推断

---

**文档版本**: v1.1  
**更新日期**: 2026-05-27  
**适用项目**: FitNote Flutter Android 版  
**变更说明**: 基于原 UniApp 版本迁移，移除云备份功能，保留核心训练记录功能。v1.1 补充智能推荐、增量备份、容量维度切换、PR标记、占位条目、单侧动作、缓存策略等遗漏需求。