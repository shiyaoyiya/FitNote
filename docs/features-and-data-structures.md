# FitNote 项目功能与数据结构文档

> 技术栈：uni-app (Vue 3 + Pinia) / 微信小程序 + Android App  
> 存储方式：微信小程序本地存储 (`uni.setStorageSync` / `uni.getStorageSync`)  
> 版本：1.9.4

---

## 目录

1. [首页日历 (pages/index/index.vue)](#1-首页日历)
2. [训练日页面 (pages/index/day.vue)](#2-训练日页面)
3. [动作库 (pages/actionLibrary/actionLibrary.vue)](#3-动作库)
4. [动作历史 (pages/actionHistory/actionHistory.vue)](#4-动作历史)
5. [模板管理 (pages/templateManager/templateManager.vue)](#5-模板管理)
6. [模板详情 (pages/templateDetail/templateDetail.vue)](#6-模板详情)
7. [管理动作 (pages/manageActions/manageActions.vue)](#7-管理动作)
8. [训练统计 (pages/trainingStat/trainingStat.vue)](#8-训练统计)
9. [年度总览 (pages/year/year.vue)](#9-年度总览)
10. [数据备份 (pages/backup/backup.vue)](#10-数据备份)
11. [全局设置与主题](#11-全局设置与主题)
12. [纪念日功能](#12-纪念日功能)
13. [预设模板与动作初始化](#13-预设模板与动作初始化)

---

## 1. 首页日历

**页面**：`pages/index/index.vue`  
**组件**：`CalendarMonth`, `TrainingSplitPlan`

### 功能描述
- 月历视图展示（支持上/下月左右滑动切换）
- 每日单元格显示：模板配色背景、训练总重量
- 点击日期跳转到训练日页面
- 长按日期清空该日数据
- 今日快捷训练按钮，支持分化计划联动
- 底部导航栏：训练统计、数据备份、训练模板、动作库
- 纪念日列表（底部显示，支持增删改）
- 更多菜单：深色/浅色切换、液态玻璃切换、隐藏/显示快捷训练按钮、阅读说明

### 数据结构

```typescript
// 日数据缓存（内存 + Storage）
interface DayDataCache {
  cache: Map<string, DayData>       // 缓存的日数据
  dateIndex: Set<string>            // 有数据的日期索引 YYYY-MM-DD
  sortedDates: string[]             // 降序排列的日期
  preloadedMonths: Set<string>      // 已预加载的年月 "YYYY-M"
  monthCache: Map<string, MonthCacheData>       // 月份概览缓存
  weekStatsCache: Map<string, number>           // 周统计缓存 "YYYY-Www"
  MAX_CACHE_SIZE: 500
  CACHE_TRIM_SIZE: 100
}

interface MonthCacheData {
  days: DayCell[]
}

interface DayCell {
  key: string
  day: number | ''
  full: string           // YYYY-MM-DD
  isToday: boolean
  isEmpty: boolean
}

// 纪念日
interface Anniversary {
  title: string
  date: string           // YYYY-MM-DD
  daysText: string       // "X 天"
}
```

**Storage Key**：`fitness_index`（日期索引），`annivs`（纪念日 JSON 字符串）

---

## 2. 训练日页面

**页面**：`pages/index/day.vue`  
**组件**：`ActionCard`, `TimerModal`, `TemplateSelector`, `DaySettings`

### 功能描述
- 模板选择：弹出模板列表，选择后加载对应动作列表
- 动作卡片列表：每个卡片显示动作名、组数输入（次数 × 重量）
- 与上次训练自动对比（显示 +N/-N/持平）
- 支持多组编辑（正常组/递减组/暂停组）
- 计时休息（大肌群 180s / 小肌群 120s，可自定义）
- 有氧训练记录（名称 + 时长）
- 休息日标记（记录理由和颜色）
- 占位符组（根据模板预设组数自动生成空白组）
- 导出训练记录到剪贴板

### 数据结构

```typescript
// 每日训练数据（Storage 持久化）
// Storage Key: fitness_daydata_YYYY-MM-DD
interface DayData {
  templates: Record<string, TemplateDayData>    // 模板名 -> 当日模板数据
  entries: Record<string, Entry[]>              // 动作名 -> 训练组数组
  actions: Record<string, number>               // 动作名 -> 总容量(kg)
  isRestDay?: boolean                            // 是否休息日
  color?: string                                 // 当日配色
  restReason?: string                            // 休息理由
}

interface TemplateDayData {
  totalWeight: number                            // 总容量
  actionWeights: Record<string, number>          // 动作名 -> 容量
  actionOrder: string[]                          // 动作排序
  isAerobic?: boolean                            // 是否有氧
  color?: string                                 // 模板配色
}

interface Entry {
  input: string           // 显示文本 "10×50" 或 "10×50+8×40"
  total: number           // 该组总容量
  type: 'normal' | 'decreasing' | 'paused'
  stages: Stage[]
  isPlaceholder?: boolean
}

interface Stage {
  reps: number
  weight: number
  total: number
}
```

### dayHelper.js 工具函数

```typescript
const ENTRY_TYPE = {
  NORMAL: 'normal',
  DECREASING: 'decreasing',
  PAUSED: 'paused',
}

function createStage(reps, weight, isUnilateral): Stage
function buildEntry(type, stages, isUnilateral): Entry | null
function normalizeEntry(entry): Entry          // 旧数据兼容
function normalizeEntries(entries): Entry[]
function createPlaceholderEntry(type): Entry
function fillPlaceholderEntries(targetSets, currentEntries): Entry[]
function getTotalWeight(entries): number
function getTotalSets(entries): number
function getEntryDisplayText(entry): string
```

---

## 3. 动作库

**页面**：`pages/actionLibrary/actionLibrary.vue`

### 功能描述
- 按肌肉群分类展示所有动作（胸部/背部/肩部/手臂/腿部/腹部）
- 每个大类下分子类目（如胸部→上胸/中下胸）
- 搜索动作名称
- 新建动作（支持选择多肌群分类和子类目）
- 编辑动作（名称、分类、子类目、单侧标记）
- 侧滑删除动作（数据级联更新到所有日数据和模板）
- 展开/折叠分类
- 点击动作跳转到历史记录

### 数据结构

```typescript
// Store: action (Pinia)
// Storage Key: fitness_actions
interface ActionStore {
  actions: Action[]
  categories: Category[]
}

interface Action {
  id: string
  name: string
  categories: string[]              // ['chest', 'arms']
  subcategories: Record<string, string[]>   // { chest: ['upper_chest'], arms: ['biceps'] }
  categoryName: string              // 首个分类的中文名
  createdAt: string                 // ISO 日期
  isUnilateral: boolean             // 是否单侧动作
}

interface Category {
  id: string                        // chest | back | shoulders | arms | legs | abs
  name: string                      // 胸部 | 背部 | 肩部 | 手臂 | 腿部 | 腹部
}

// 分类常量
const CATEGORY_NAMES = {
  chest: '胸部', back: '背部', shoulders: '肩部',
  arms: '手臂', legs: '腿部', abs: '腹部'
}

const SUBCATEGORIES = {
  chest:         [{ id: 'upper_chest', name: '上胸' }, { id: 'mid_lower_chest', name: '中下胸' }],
  back:          [{ id: 'teres_major', name: '大圆' }, { id: 'upper_traps', name: '上斜方' },
                   { id: 'mid_lower_traps', name: '中下斜方' }, { id: 'lats', name: '背阔' },
                   { id: 'erector_spinae', name: '竖脊肌' }],
  shoulders:     [{ id: 'front_delt', name: '前束' }, { id: 'side_delt', name: '中束' },
                   { id: 'rear_delt', name: '后束' }],
  arms:          [{ id: 'biceps', name: '二头' }, { id: 'triceps', name: '三头' }],
  legs:          [{ id: 'quads', name: '股四头' }, { id: 'hamstrings', name: '腘绳' },
                   { id: 'calves', name: '小腿' }, { id: 'glutes', name: '臀部' }],
}
```

**动作名称自动分类**：通过 `CATEGORY_KEYWORDS` 关键词映射表根据动作名自动分类（如含"卧推"→胸部）。

---

## 4. 动作历史

**页面**：`pages/actionHistory/actionHistory.vue`  
**组件**：`ProgressChart`

### 功能描述
- 查看某个动作的历史训练记录
- 每次训练显示各组数据明细和总容量
- 与上一次训练对比增减量（绿色正/红色负/灰色持平）
- 折线图展示容量趋势（Canvas 绘制）
- 上滑加载更多（分页加载，每次 10 条）
- 支持重命名动作（自动更新所有日数据和模板）

### 数据结构

```typescript
// 页面数据
interface HistoryPageData {
  actionName: string
  allHist: HistoryRecord[]          // 全部历史记录
  allEnts: Entry[][]                // 对应的 entries
  displayCount: number              // 当前显示条数
  chartData: ChartDataPoint[]       // 折线图数据
}

interface HistoryRecord {
  displayDate: string               // YYYY/MM/DD
  totalToday: number                // 当日总容量
  diffValue: number                 // 与上次对比差值
}
```

---

## 5. 模板管理

**页面**：`pages/templateManager/templateManager.vue`

### 功能描述
- 展示所有训练模板列表（支持长按拖拽排序）
- 左滑删除模板
- 新建模板：输入名称 + 从动作库勾选动作 + 选择分类筛选
- 导入/导出模板（纯文本格式：`模板名：动作×组数`）
- 新建模板时支持从预设模板包快速创建（推日、拉日、腿日、臀日、上肢日、下肢日）
- 点击模板卡片进入模板详情编辑

### 数据结构

```typescript
// Store: template (Pinia)
// Storage Key: fitness_templates
interface TemplateStore {
  templates: Template[]
}

interface Template {
  id: string
  name: string                      // 模板名
  actions: string[]                 // 动作名称数组（有序）
  actionSets: Record<string, number>  // 动作名 -> 预设组数
  color: string                     // 主配色 Hex
  customColors: Array<{ name: string, value: string }>  // 自定义颜色
}
```

---

## 6. 模板详情

**页面**：`pages/templateDetail/templateDetail.vue`

### 功能描述
- 编辑模板名称
- 长按拖拽排序动作
- 左滑删除动作
- 设置每个动作的预设组数（2~5 组预设 + 自定义）
- 从动作库添加动作
- 设置模板配色（圆形色板选择）
- 点击动作跳转到该动作的历史记录
- 保存模板

### 数据结构

同模板管理中的 `Template` 数据结构，额外管理 `actionSets` 为每个动作预设组数。

---

## 7. 管理动作

**页面**：`pages/manageActions/manageActions.vue`

### 功能描述
- 当前训练日选中的动作排序管理
- 长按拖拽调整动作顺序
- 从动作库添加新动作到当日训练
- 保存排序后通过 `_pendingManageActions` 缓存传回 day.vue

### 数据结构

```typescript
// 跨页面通信
// Storage Key: _pendingManageActions（JSON.stringify 后的 string[] 动作名数组）
interface ManageActionsTransfer {
  newOrder: string[]                // 重排序后的动作名称列表
}
```

---

## 8. 训练统计

**页面**：`pages/trainingStat/trainingStat.vue`  
**子组件**：`DatePicker`, `TrainingOverview`, `BodyPartTrend`, `BodyPartGrid`, `BodyPartManager`  
**工具模块**：`statUtil.js`, `volumeHistory.js`

### 功能描述
- 月/年视图切换
- 三个统计维度：训练天数、训练组数、训练容量(kg)
- 概览卡片：显示所选时间范围的总量数据
- 身体部位趋势图（按周/按月柱状图）
- 身体部位网格卡片：展示各肌群的统计数据，带状态徽章（低/正常/高）
- 18 个子分类 + 3 个合并分类（胸部合并上胸+中下胸、背部合并部分子类、腿部合并股四头+腘绳）
- 身体部位管理器：长按拖拽排序、隐藏/恢复部位卡片

### statUtil.js 核心计算

```typescript
// 18 个子分类 + 3 个合并分类
const SUBCATEGORIES = {
  upper_chest: '上胸', mid_lower_chest: '中下胸',
  teres_major: '大圆', upper_traps: '上斜方', mid_lower_traps: '中下斜方',
  lats: '背阔', erector_spinae: '竖脊肌',
  front_delt: '前束', side_delt: '中束', rear_delt: '后束',
  biceps: '二头', triceps: '三头',
  quads: '股四头', hamstrings: '腘绳', calves: '小腿', glutes: '臀部',
  abs: '腹部',
}

const MERGED_CATEGORIES = {
  chest: { children: ['upper_chest', 'mid_lower_chest'] },
  back:  { children: ['teres_major', 'mid_lower_traps', 'lats'] },
  legs:  { children: ['quads', 'hamstrings'] },
}

function computeStats(year, month, periodType, dimension, actionStore, dayDataCacheStore): StatsResult
function computeSubcategoryTrendsForPeriod(year, month, periodType, actionStore, dayDataCacheStore): TrendsResult
function collectAllWeeklyVolume(year, month, periodType, actionStore, dayDataCacheStore): VolumeResult
```

### volumeHistory.js 容量历史追踪

```typescript
// Storage Key: training_volume_history
interface VolumeHistory {
  [bodyPartId: string]: {
    weeks: WeekVolume[]
  }
}

interface WeekVolume {
  weekStart: string       // YYYY-MM-DD（周一）
  sets: number            // 该周组数
}

// 固定范围（阶段 A 用）
const FIXED_RANGES = {
  chest: { low: 20, high: 40 },
  back:  { low: 24, high: 64 },
  legs:  { low: 20, high: 48 },
  // ... 9 个身体部位
}

// 功能
function getStatus(bodyPartId, history): 'low' | 'normal' | 'high' | null
function rebuildVolumeHistory(): void          // 从所有数据重建
function updateWeeklyVolume(bodyPartId, weekStart, sets): void
```

---

## 9. 年度总览

**页面**：`pages/year/year.vue`

### 功能描述
- 以年为单位展示 12 个月的日历缩略网格
- 每个月份格子展示：月标签 + 周几缩写 + 每日训练颜色标记
- 年份标题行：显示"X 年 · 共训练 N 天"
- 支持多年份滚动查看（从最早有数据年份到当前年份）
- 点击月份跳转到首页定位到该月

### 数据结构

```typescript
interface YearPageData {
  yearList: YearData[]
  loadedYears: Set<number>
}

interface YearData {
  year: number
  totalDays: number
  months: MonthData[]
}

interface MonthData {
  monthIndex: number          // 0-11
  days: YearDayCell[]
}

interface YearDayCell {
  key: string
  day: number | ''
  full: string                // YYYY-MM-DD
  isToday: boolean
  isEmpty: boolean
}
```

---

## 10. 数据备份

**页面**：`pages/backup/backup.vue`  
**工具**：`utils/backup.js`, `utils/cloudBackup.js`, `utils/cloudConfig.js`

### 功能描述
- **本地备份**：选择备份目录，备份所有数据（模板、动作、日数据、纪念日、索引），支持增量备份
- **本地导入**：从备份文件恢复数据
- **云端备份**（微信云开发）：上传数据到云端（最多 3 份），支持下载和删除
- **CSV 导出**：导出最近 90 天训练记录为 CSV 文件（在首页长按"数据备份"按钮触发）

### 数据结构

```typescript
// 备份配置
// Storage Key: backup_config
interface BackupConfig {
  defaultPath: string           // SAF URI
  lastBackupTime: string        // ISO 日期
  backupHistory: string[]
}

// 备份文件数据结构
interface BackupData {
  version: string               // '1.0'
  backupType: 'full' | 'incremental'
  backupTime: string            // ISO 日期
  data: {
    fitness_templates: Template[]
    fitness_actions: Action[]
    fitness_annivs: Anniversary[]
    fitness_daydata: Record<string, DayData>
  }
}

// 云端备份
// 云函数: backup
interface CloudBackup {
  backupId: string              // UUID
  createdAt: string             // ISO
  size: number                  // 字节数
}
```

### CSV 导出格式

```
日期,动作名称,组数,次数,重量
2024-01-01,卧推,1,10,50
2024-01-01,卧推,2,8,55
```

---

## 11. 全局设置与主题

**Store**：`stores/daySettings.js`  
**Storage Key**：`fitness_day_settings`

### 功能描述
- 深色/浅色模式切换
- 液态玻璃 UI 效果（毛玻璃背景）
- 自动开始计时（训练完成一组后自动弹出计时器）
- 自动填充数据（选择模板时自动填充上次训练数据）
- 气泡填充输入模式（`bubbleFill`）
- 大/小肌群计时器时长可自定义
- 今日训练快捷按钮显隐
- **分化训练计划**：
  - 循环模式：N 天一个循环（如 3 天循环：胸→背→腿）
  - 周计划模式：一周七天每天指定模板
  - 自动推算今日在循环中的位置

### 数据结构

```typescript
interface DaySettings {
  isDarkMode: boolean                  // 深色模式
  autoStartTimer: boolean              // 自动开始计时
  autoFillData: boolean                // 自动填充上次数据
  bubbleFill: boolean                  // 气泡填充
  heavyTimerDuration: number           // 大肌群计时秒数 (默认 180)
  lightTimerDuration: number           // 小肌群计时秒数 (默认 120)
  todayTrainBtnVisible: boolean        // 显示快捷训练按钮
  liquidGlassEnabled: boolean          // 液态玻璃效果
  splitPlan: SplitPlan                 // 分化训练计划
}

interface SplitPlan {
  enabled: boolean
  mode: 'cycle' | 'week'             // 循环/周计划
  cycleDays: CycleDay[]              // 循环模式
  weekPlan: WeekDay[]                // 周计划模式
  startOffset: number                 // 循环起始偏移
  lastActiveDate: string             // 最后训练日期 YYYY-MM-DD
}

interface CycleDay {
  template: string | null            // 模板名
  enabled: boolean                   // 是否启用
}

type WeekDay = CycleDay               // 同上，共 7 天
```

---

## 12. 纪念日功能

### 功能描述
- 首页底部展示纪念日列表
- 点击纪念日可编辑，长按可删除
- 自动计算从纪念日到今天的经过天数

### 数据结构

```typescript
// Storage Key: annivs（JSON 字符串数组）
interface Anniversary {
  title: string         // 纪念日标题
  date: string          // 日期 YYYY-MM-DD
  daysText: string      // 已过天数，如 "365 天"
}
```

---

## 13. 预设模板与动作初始化

**文件**：`stores/initActions.js`, `utils/presetTemplates.js`

### 功能描述
- 首次使用时自动加载初始动作库（约 100+ 个预设健身动作）
- 动作按 6 大肌群分类，细分到子类目
- 预设模板包：推日、拉日、腿日、臀日、上肢日、下肢日

### 数据结构

```typescript
// 初始动作预设
interface RawAction {
  name: string
  categories: string[]              // ['chest']
  subcategories: Record<string, string[]>   // { chest: ['upper_chest'] }
  isUnilateral?: boolean
}

// 预设模板包
interface PresetTemplatePack {
  name: string                      // "推日（胸肩三头）"
  actions: string[]                 // 动作名称数组
  color: string                     // 推荐配色 Hex
}

const PRESET_TEMPLATES = [
  { name: '推日（胸肩三头）', actions: ['史密斯卧推', '上斜哑铃卧推', ...], color: '#d44848' },
  { name: '拉日（背二头）',   actions: ['对握窄距下拉', 'V把绳索划船', ...], color: '#002fa7' },
  { name: '腿日',             actions: ['高脚杯深蹲', '罗马尼亚硬拉', ...], color: '#4DB6AC' },
  { name: '臀日',             actions: ['杠铃臀推', '保加利亚蹲', ...], color: '#f2b9b2' },
  { name: '上肢日',           actions: ['平板哑铃卧推', '上斜哑铃卧推', ...], color: '#8076a3' },
  { name: '下肢日',           actions: ['杠铃深蹲', '罗马尼亚硬拉', ...], color: '#eeb8c3' },
]
```

---

## 完整 Storage Key 汇总

| Key | 数据类型 | 说明 |
|-----|---------|------|
| `fitness_actions` | `Action[]` | 动作库 |
| `fitness_templates` | `Template[]` | 训练模板 |
| `fitness_daydata_YYYY-MM-DD` | `DayData` | 每日训练数据 |
| `fitness_day_settings` | `DaySettings` | 全局设置 |
| `fitness_index` | `{ version, dates, updatedAt }` | 日期索引 |
| `annivs` | `string (JSON)` | 纪念日数组 |
| `backup_config` | `BackupConfig` | 备份配置 |
| `training_volume_history` | `VolumeHistory` | 容量历史 |
| `training_stat_bodypart_config` | `{ order, visibility }` | 统计页配置 |
| `_pendingManageActions` | `string (JSON)` | 跨页通讯（临时） |
| `first_launch_done` | `boolean` | 首次启动标记 |
| `selectedYear` / `selectedMonth` | `string` | 跨页日期传递（临时） |

---

## 数据流图

```
┌─────────────────────────────────────────────────────────┐
│                    用户操作                              │
└──────────┬──────────────────────┬───────────────────────┘
           ▼                      ▼
    ┌──────────┐          ┌──────────────┐
    │  Pages   │◄────────►│  Components  │
    └────┬─────┘          └──────┬───────┘
         │                       │
         ▼                       ▼
    ┌─────────────────────────────────────┐
    │              Pinia Stores            │
    │  action │ dayData │ dayDataCache     │
    │  daySettings │ template              │
    └──────────────────┬──────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────┐
    │         uni.setStorageSync          │
    │     (微信小程序本地持久化)            │
    └─────────────────────────────────────┘

    备份流程:
    Store/Storage → utils/backup.js → 本地文件 (SAF)
    Store/Storage → utils/cloudBackup.js → 微信云开发
```
