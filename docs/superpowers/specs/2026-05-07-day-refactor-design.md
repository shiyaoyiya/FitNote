# FitNote 全量优化设计方案

日期：2026-05-07
版本：v1.0

## 分阶段执行计划

| 阶段 | 内容 | 依赖 | 工作量 |
|------|------|------|--------|
| 一 | 性能与架构清理 | 无 | 中 |
| 二 | 交互体验（快捷按钮 + 分化计划） | 阶段一 | 中 |
| 三 | 数据可视化（图表 + 热力图） | 阶段一 | 中 |
| 四 | 智能化 + 导出 + 新用户引导 | 阶段三 | 大 |

---

## 阶段一：性能与架构清理

### 1.1 存储写入竞态修复 + 去重双写

**文件：** `pages/index/day.vue`

**问题：** `saveEntryToStorage` 使用异步 `uni.getStorage` + `uni.setStorage`，且与 `dayDataCacheStore.saveDayData` 双重写入同一 key。

**改动：**

```javascript
saveEntryToStorage(idx) {
  const actName = this.chosenActions[idx]
  const todayDateStr = this.formatDateStr(new Date(this.date))
  const key = this.DAYDATA_PREFIX + todayDateStr
  const raw = uni.getStorageSync(key) || {}
  const dayData = {
    templates: raw.templates || {},
    actions: raw.actions || {},
    entries: raw.entries || {},
  }
  dayData.entries[actName] = this.actionEntries[idx] || []
  dayData.actions[actName] = getTotalWeight(this.actionEntries[idx])
  const tplInfo = dayData.templates[this.chosenTplName] || { totalWeight: 0, actionWeights: {}, actionOrder: [...this.chosenActions] }
  tplInfo.actionWeights[actName] = dayData.actions[actName]
  tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => a + b, 0)
  dayData.templates[this.chosenTplName] = tplInfo
  // 统一由 cacheStore 写入
  this.dayDataCacheStore.saveDayData(todayDateStr, dayData)
  delete this.actionLatestRecordCache[actName]
  this.calcActionLatestRecord(actName)
}
```

### 1.2 历史记录查询 N+1 优化

**文件：** `stores/dayDataCache.js`

**改动：**

- 新增 `sortedDates: []` 字段
- `setIndex()` 时用 `localeCompare` 一次性排序，避免每次查询创建 Date 对象
- 新增 `batchGetLatestRecords(actNames, todayDateStr)` 方法，一次遍历日期批量查询所有动作

### 1.3 diff 计算批量合并

**文件：** `pages/index/day.vue`

**改动：**

- `calcAllDiffs` 改为调用 `batchGetLatestRecords`，同步批量计算
- 移除 `chosenActions` watcher（与 calcAllDiffs 功能重叠）
- 移除 `preloadActionLatestRecordCache` 方法

### 1.4 冗余代码清理

**文件：** `pages/index/day.vue`

**删除内容：**
- 模板中的排序弹窗（movable-area / movable-view / sort-footer）约 25 行
- 对应的 sort 相关 data：`sortedActions`, `itemY`, `isDragMode`, `dragIdx`, `isDragTriggered`, `lastTargetIdx`, `rowHeight`, `sortLongPressTimer`, `sortLongPressThreshold` 等
- 对应的 methods：`openSortModal`, `initSortPositions`, `onSortTouchStart/Move/End`, `onSortDragTrigger/Move/End`, `smoothSortPositions`, `saveSort`, `cancelSort` 等
- 对应的 CSS：`.sort-modal-overlay` 及所有排序相关样式

**`_loadDayData` 简化：**
- 移除重复的 `this.actionStore.load()`
- 移除冗余的 `uni.getStorageSync` fallback
- `setTimeout(..., 100)` → `this.$nextTick()`

### 1.5 日历渲染 I/O 优化

**文件：** `stores/dayDataCache.js`

**改动：**

```javascript
hasData(dateStr) {
  if (!this.dateIndex.has(dateStr)) return false
  if (this.cache.has(dateStr)) {
    const data = this.cache.get(dateStr)
    return !data.isRestDay && Object.keys(data.templates || {}).length > 0
  }
  // 不在缓存中但 index 有 → 可能有数据，返回 true
  return true
}
```

---

## 阶段二：交互体验优化

### 2.1 今日训练快捷按钮

**文件：** `pages/index/index.vue`

- 日历下方新增悬浮按钮「▶ 一键训练」
- 点击根据分化计划跳转到 `day.vue?date=xxx&tpl=模板名`
- 长按弹出分化计划设置弹窗
- 按钮文字动态显示如「周一：胸部力量」或「今日休息 ☕」

**文件：** `pages/index/day.vue`

- `onLoad` 增加 `tpl` 参数处理，自动调用 `onSelectTemplate`

### 2.2 分化计划设置

**新组件：** `components/TrainingSplitPlan.vue`

- 7 个开关（周一到周日），训练日可选择对应模板
- 数据结构：

```javascript
{
  enabled: true,
  weeklyPlan: {
    1: { template: '胸部力量', enabled: true },
    2: { template: null, enabled: false },
    // ... 周三到周日
  }
}
```

**存储：** `uni.setStorageSync('fitness_split_plan', plan)`

---

## 阶段三：数据可视化

### 3.1 动作进步图表

**新组件：** `components/ProgressChart.vue`

- 原生 Canvas 绘制折线图
- X 轴日期，Y 轴最大单组重量
- PR 点用 🏆 标注
- 时间范围：1月 / 3月 / 6月 / 1年

**接入：** 在 `actionHistory.vue` 中引入 ProgressChart

**数据来源：** 复用 `buildActionHistory()` 提取 `{ date, maxWeight, totalVolume }`

### 3.2 身体部位热力图

**改造：** `trainingStat.vue` 中的 BodyPartGrid

- 改为 SVG 人体轮廓图布局
- 颜色深浅映射本月训练频次
- 点击部位下钻查看详细记录
- 均衡度评分：各部位训练次数标准差

---

## 阶段四：智能化 + 导出 + 引导

### 4.1 智能模板推荐

**新文件：** `utils/trainingAnalyzer.js`

- 分析最近 28 天训练日的模板 → 动作分类映射
- 识别互补肌群推荐下一个模板
- 首页显示推荐卡片

### 4.2 多格式导出

**新/改页面：** 导出功能

- CSV 格式：日期,模板,动作,各组数据,当日总容量
- 时间范围筛选
- `uni.getFileSystemManager` 写入 + `uni.openDocument` 打开

### 4.3 新用户引导

- 无数据时模板选择弹窗增加「推荐模板包」
- 一键导入预设模板组合（推拉腿、上下身等）
