const DAYDATA_PREFIX = 'fitness_daydata_'

const SUBCATEGORIES = {
  upper_chest: { id: 'upper_chest', name: '上胸' },
  mid_lower_chest: { id: 'mid_lower_chest', name: '中下胸' },
  teres_major: { id: 'teres_major', name: '大圆' },
  upper_traps: { id: 'upper_traps', name: '上斜方' },
  mid_lower_traps: { id: 'mid_lower_traps', name: '中下斜方' },
  lats: { id: 'lats', name: '背阔' },
  erector_spinae: { id: 'erector_spinae', name: '竖脊肌' },
  front_delt: { id: 'front_delt', name: '前束' },
  side_delt: { id: 'side_delt', name: '中束' },
  rear_delt: { id: 'rear_delt', name: '后束' },
  biceps: { id: 'biceps', name: '二头' },
  triceps: { id: 'triceps', name: '三头' },
  quads: { id: 'quads', name: '股四头' },
  hamstrings: { id: 'hamstrings', name: '腘绳' },
  calves: { id: 'calves', name: '小腿' },
  glutes: { id: 'glutes', name: '臀部' },
  abs: { id: 'abs', name: '腹部' },
}

const SUBCATEGORY_IDS = Object.keys(SUBCATEGORIES)

const CATEGORY_IDS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs']

const CATEGORY_NAMES = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  arms: '手臂',
  legs: '腿部',
  abs: '腹部',
}

const CATEGORY_TO_SUBS = {
  chest: ['upper_chest', 'mid_lower_chest'],
  back: ['teres_major', 'upper_traps', 'mid_lower_traps', 'lats', 'erector_spinae'],
  shoulders: ['front_delt', 'side_delt', 'rear_delt'],
  arms: ['biceps', 'triceps'],
  legs: ['quads', 'hamstrings', 'calves', 'glutes'],
  abs: ['abs'],
}

const MERGED_CATEGORIES = {
  chest: { id: 'chest', name: '胸部', children: ['upper_chest', 'mid_lower_chest'] },
  back: { id: 'back', name: '背部', children: ['teres_major', 'mid_lower_traps', 'lats'] },
  legs: { id: 'legs', name: '腿部', children: ['quads', 'hamstrings'] },
}

function isCategoryId(id) {
  return CATEGORY_IDS.includes(id)
}

function getSubcategoryForAction(action, categoryId) {
  const subs = action.subcategories?.[categoryId]
  if (subs && Array.isArray(subs) && subs.length > 0) {
    return subs[0]
  }
  for (const subId of SUBCATEGORY_IDS) {
    const sub = SUBCATEGORIES[subId]
    const parentCategory = getCategoryForSubcategory(subId)
    if (parentCategory === categoryId) {
      return subId
    }
  }
  return null
}

function getCategoryForSubcategory(subcategoryId) {
  const map = {
    upper_chest: 'chest',
    mid_lower_chest: 'chest',
    teres_major: 'back',
    upper_traps: 'back',
    mid_lower_traps: 'back',
    lats: 'back',
    erector_spinae: 'back',
    front_delt: 'shoulders',
    side_delt: 'shoulders',
    rear_delt: 'shoulders',
    biceps: 'arms',
    triceps: 'arms',
    quads: 'legs',
    hamstrings: 'legs',
    calves: 'legs',
    glutes: 'legs',
    abs: 'abs',
  }
  return map[subcategoryId]
}

function getKeysInPeriod(year, month, periodType) {
  const keys = []
  const info = uni.getStorageInfoSync()
  const dayKeys = info.keys.filter(k => k.startsWith(DAYDATA_PREFIX))

  for (const key of dayKeys) {
    const dateStr = key.replace(DAYDATA_PREFIX, '')
    const parts = dateStr.split('-')
    if (parts.length < 2) continue
    const keyYear = parseInt(parts[0])
    const keyMonth = parseInt(parts[1])

    if (periodType === 'year') {
      if (keyYear === year) {
        keys.push(key)
      }
    } else {
      if (keyYear === year && keyMonth === month + 1) {
        keys.push(key)
      }
    }
  }

  return keys.sort()
}

function getKeysInPeriodCached(year, month, periodType, dayDataCacheStore) {
  const keys = []
  const allDates = dayDataCacheStore.indexedDates

  if (allDates.length === 0) {
    return getKeysInPeriod(year, month, periodType)
  }

  for (const dateStr of allDates) {
    const parts = dateStr.split('-')
    if (parts.length < 2) continue
    const keyYear = parseInt(parts[0])
    const keyMonth = parseInt(parts[1])

    if (periodType === 'year') {
      if (keyYear === year) {
        keys.push(DAYDATA_PREFIX + dateStr)
      }
    } else {
      if (keyYear === year && keyMonth === month + 1) {
        keys.push(DAYDATA_PREFIX + dateStr)
      }
    }
  }

  return keys.sort()
}

function getDayData(key, dayDataCacheStore) {
  const dateStr = key.replace(DAYDATA_PREFIX, '')
  if (dayDataCacheStore) {
    const data = dayDataCacheStore.getDayData(dateStr)
    return data || {}
  }
  return uni.getStorageSync(key) || {}
}

function computeSubcategoryTrendsForPeriod(year, month, periodType, actionStore, dayDataCacheStore) {
  const subcategoryTrends = {}
  const categoryTrends = {}
  for (const subId of SUBCATEGORY_IDS) {
    subcategoryTrends[subId] = []
  }
  for (const catId of CATEGORY_IDS) {
    categoryTrends[catId] = []
  }

  const keys = dayDataCacheStore
    ? getKeysInPeriodCached(year, month, periodType, dayDataCacheStore)
    : getKeysInPeriod(year, month, periodType)

  const dateBuckets = {}
  for (const key of keys) {
    const dateStr = key.replace(DAYDATA_PREFIX, '')
    const parts = dateStr.split('-')
    const m = parseInt(parts[1])
    let bucket
    if (periodType === 'year') {
      bucket = `${m}月`
    } else {
      const dateObj = new Date(parseInt(parts[0]), m - 1, parseInt(parts[2]))
      const dayOfWeek = dateObj.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(dateObj)
      monday.setDate(dateObj.getDate() + mondayOffset)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const m1 = monday.getMonth() + 1
      const d1 = monday.getDate()
      const m2 = sunday.getMonth() + 1
      const d2 = sunday.getDate()
      if (m1 === m2) {
        bucket = `${m1}/${d1}-${d2}`
      } else {
        bucket = `${m1}/${d1}-${m2}/${d2}`
      }
    }
    if (!dateBuckets[bucket]) {
      dateBuckets[bucket] = []
    }
    dateBuckets[bucket].push(key)
  }

  function parseBucketStart(bucket) {
    if (bucket.includes('月')) {
      const month = parseInt(bucket)
      return { month, day: 1 }
    }
    const startPart = bucket.split('-')[0]
    const [month, day] = startPart.split('/').map(Number)
    return { month, day }
  }

  const bucketKeys = Object.keys(dateBuckets).sort((a, b) => {
    const aStart = parseBucketStart(a)
    const bStart = parseBucketStart(b)
    if (aStart.month !== bStart.month) return aStart.month - bStart.month
    return aStart.day - bStart.day
  })

  for (const bucket of bucketKeys) {
    const dayKeys = dateBuckets[bucket]
    const bucketStats = {}

    for (const subId of SUBCATEGORY_IDS) {
      bucketStats[subId] = { days: 0, sets: 0, volume: 0, dayCounted: false }
    }

    for (const key of dayKeys) {
      const data = getDayData(key, dayDataCacheStore)
      const templates = data.templates || {}
      const entries = data.entries || {}
      const dayAffectedSubs = new Set()

      if (Object.keys(templates).length > 0) {
        for (const tplName in templates) {
          const tpl = templates[tplName]
          const actionOrder = tpl.actionOrder || []
          const actionWeights = tpl.actionWeights || {}

          for (const actionName of actionOrder) {
            const action = actionStore.getActionByName(actionName)
            if (!action) continue

            const categories = action.categories || []
            for (const catId of categories) {
              const subId = getSubcategoryForAction(action, catId)
              if (!subId) continue

              dayAffectedSubs.add(subId)

              const weight = actionWeights[actionName] || 0
              bucketStats[subId].volume += weight

              const actionEntries = entries[actionName]
              if (actionEntries && Array.isArray(actionEntries)) {
                bucketStats[subId].sets += actionEntries.filter(e => !e.isPlaceholder).length
              } else {
                const totalWeight = actionWeights[actionName] || 0
                if (totalWeight > 0) {
                  bucketStats[subId].sets += 1
                }
              }
            }
          }
        }
      }

      for (const subId of dayAffectedSubs) {
        bucketStats[subId].days += 1
      }
    }

    for (const subId of SUBCATEGORY_IDS) {
      subcategoryTrends[subId].push({
        label: bucket,
        days: bucketStats[subId].days,
        sets: bucketStats[subId].sets,
        volume: Math.round(bucketStats[subId].volume),
      })
    }

    for (const catId of CATEGORY_IDS) {
      const subIds = CATEGORY_TO_SUBS[catId]
      let catSets = 0
      let catVolume = 0
      let catDays = 0
      for (const subId of subIds) {
        const trend = bucketStats[subId]
        catSets += trend.sets
        catVolume += trend.volume
        if (trend.days > catDays) catDays = trend.days
      }
      categoryTrends[catId].push({
        label: bucket,
        days: catDays,
        sets: catSets,
        volume: Math.round(catVolume),
      })
    }
  }

  return { subcategoryTrends, categoryTrends }
}

export function computeStats({ year, month, periodType, actionStore, dayDataCacheStore }) {
  let totalDays = 0
  let totalSets = 0
  let totalVolume = 0

  const keys = dayDataCacheStore
    ? getKeysInPeriodCached(year, month, periodType, dayDataCacheStore)
    : getKeysInPeriod(year, month, periodType)

  for (const key of keys) {
    const data = getDayData(key, dayDataCacheStore)
    const templates = data.templates || {}
    const entries = data.entries || {}

    if (Object.keys(templates).length > 0) {
      totalDays += 1
    }

    for (const tplName in templates) {
      const tpl = templates[tplName]
      const actionWeights = tpl.actionWeights || {}

      for (const actionName in actionWeights) {
        totalVolume += actionWeights[actionName] || 0

        const actionEntries = entries[actionName]
        if (actionEntries && Array.isArray(actionEntries)) {
          totalSets += actionEntries.filter(e => !e.isPlaceholder).length
        } else if ((actionWeights[actionName] || 0) > 0) {
          totalSets += 1
        }
      }
    }
  }

  const subcategoryTotals = []
  const { subcategoryTrends, categoryTrends } = computeSubcategoryTrendsForPeriod(year, month, periodType, actionStore, dayDataCacheStore)
  const dayAffectedMap = {}

  for (const key of keys) {
    const data = getDayData(key, dayDataCacheStore)
    const templates = data.templates || {}
    const entries = data.entries || {}
    const dateStr = key.replace(DAYDATA_PREFIX, '')
    const daySubs = new Set()

    for (const tplName in templates) {
      const tpl = templates[tplName]
      const actionOrder = tpl.actionOrder || []
      const actionWeights = tpl.actionWeights || {}

      for (const actionName of actionOrder) {
        const action = actionStore.getActionByName(actionName)
        if (!action) continue

        for (const catId of action.categories || []) {
          const subId = getSubcategoryForAction(action, catId)
          if (subId) daySubs.add(subId)
        }
      }
    }

    for (const subId of daySubs) {
      if (!dayAffectedMap[subId]) dayAffectedMap[subId] = new Set()
      dayAffectedMap[subId].add(dateStr)
    }
  }

  for (const subId of SUBCATEGORY_IDS) {
    let subVolume = 0
    let subSets = 0

    for (const key of keys) {
      const data = getDayData(key, dayDataCacheStore)
      const templates = data.templates || {}
      const entries = data.entries || {}

      for (const tplName in templates) {
        const tpl = templates[tplName]
        const actionOrder = tpl.actionOrder || []
        const actionWeights = tpl.actionWeights || {}

        for (const actionName of actionOrder) {
          const action = actionStore.getActionByName(actionName)
          if (!action) continue

          const actionSub = getSubcategoryForAction(action, action.categories?.[0] || '')
          if (actionSub !== subId) continue

          subVolume += actionWeights[actionName] || 0

          const actionEntries = entries[actionName]
          if (actionEntries && Array.isArray(actionEntries)) {
            subSets += actionEntries.filter(e => !e.isPlaceholder).length
          } else if ((actionWeights[actionName] || 0) > 0) {
            subSets += 1
          }
        }
      }
    }

    const subDays = dayAffectedMap[subId] ? dayAffectedMap[subId].size : 0

    subcategoryTotals.push({
      id: subId,
      name: SUBCATEGORIES[subId].name,
      days: subDays,
      sets: subSets,
      volume: Math.round(subVolume),
    })
  }

  return {
    totalDays,
    totalSets,
    totalVolume: Math.round(totalVolume),
    subcategoryTotals,
    subcategoryTrends,
    categoryTrends,
  }
}

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 取"参考日期往前推 N 天"窗口内的日数据 key。
 * refDateStr 为 'YYYY-MM-DD'，缺省用今天；窗口 = [refDate-(days-1), refDate]。
 */
function getKeysInRecentDays(days, dayDataCacheStore, refDateStr) {
  const allDates = dayDataCacheStore && dayDataCacheStore.indexedDates
    ? dayDataCacheStore.indexedDates
    : []

  const refDate = refDateStr
    ? new Date(parseInt(refDateStr.slice(0, 4)), parseInt(refDateStr.slice(5, 7)) - 1, parseInt(refDateStr.slice(8, 10)))
    : new Date()
  const cutoff = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cutoffStr = formatDateStr(cutoff)

  return allDates
    .filter(d => d >= cutoffStr && d <= refDateStr)
    .sort()
    .map(d => DAYDATA_PREFIX + d)
}

/**
 * 按"距参考日期 N 天"窗口聚合部位训练量（用于部位对比时间窗）。
 * refDate 为 'YYYY-MM-DD'，缺省用今天；同一份数据 + 相同 refDate 结果可复现。
 * 返回 { subcategoryTotals, categoryTotals, dayAffectedMap }，
 * 其中 days 均为窗口内实际训练天数（子类并集，无单周取 max 的口径混用）。
 */
export function computeBodyPartTotalsByDays({ days, actionStore, dayDataCacheStore, refDate }) {
  const keys = getKeysInRecentDays(days, dayDataCacheStore, refDate)

  const dayAffectedMap = {}
  for (const key of keys) {
    const data = getDayData(key, dayDataCacheStore)
    const templates = data.templates || {}
    const entries = data.entries || {}
    const dateStr = key.replace(DAYDATA_PREFIX, '')
    const daySubs = new Set()

    for (const tplName in templates) {
      const tpl = templates[tplName]
      const actionOrder = tpl.actionOrder || []

      for (const actionName of actionOrder) {
        const action = actionStore.getActionByName(actionName)
        if (!action) continue

        for (const catId of action.categories || []) {
          const subId = getSubcategoryForAction(action, catId)
          if (subId) daySubs.add(subId)
        }
      }
    }

    for (const subId of daySubs) {
      if (!dayAffectedMap[subId]) dayAffectedMap[subId] = new Set()
      dayAffectedMap[subId].add(dateStr)
    }
  }

  const subcategoryTotals = []
  for (const subId of SUBCATEGORY_IDS) {
    let subVolume = 0
    let subSets = 0

    for (const key of keys) {
      const data = getDayData(key, dayDataCacheStore)
      const templates = data.templates || {}
      const entries = data.entries || {}

      for (const tplName in templates) {
        const tpl = templates[tplName]
        const actionOrder = tpl.actionOrder || []
        const actionWeights = tpl.actionWeights || {}

        for (const actionName of actionOrder) {
          const action = actionStore.getActionByName(actionName)
          if (!action) continue

          const actionSub = getSubcategoryForAction(action, action.categories?.[0] || '')
          if (actionSub !== subId) continue

          subVolume += actionWeights[actionName] || 0

          const actionEntries = entries[actionName]
          if (actionEntries && Array.isArray(actionEntries)) {
            subSets += actionEntries.filter(e => !e.isPlaceholder).length
          } else if ((actionWeights[actionName] || 0) > 0) {
            subSets += 1
          }
        }
      }
    }

    const subDays = dayAffectedMap[subId] ? dayAffectedMap[subId].size : 0

    subcategoryTotals.push({
      id: subId,
      name: SUBCATEGORIES[subId].name,
      days: subDays,
      sets: subSets,
      volume: Math.round(subVolume),
    })
  }

  const categoryTotals = []
  for (const catId of CATEGORY_IDS) {
    const subIds = CATEGORY_TO_SUBS[catId]
    let catSets = 0
    let catVolume = 0
    const daySet = new Set()

    for (const subId of subIds) {
      const item = subcategoryTotals.find(s => s.id === subId)
      if (!item) continue
      catSets += item.sets
      catVolume += item.volume
      const dates = dayAffectedMap[subId]
      if (dates) {
        for (const d of dates) daySet.add(d)
      }
    }

    categoryTotals.push({
      id: catId,
      days: daySet.size,
      sets: catSets,
      volume: Math.round(catVolume),
    })
  }

  return { subcategoryTotals, categoryTotals, dayAffectedMap }
}

/**
 * 徽章判定用：按"判定部位 id"（合并 upper_chest/mid_lower_chest → chest 等）汇总
 * 窗口内总组数 sets 与训练日数 days（days 为子类日期并集）。
 * 返回 { [bodyPartId]: { sets, days } }。
 */
const BODY_PART_MERGE_MAP = {
  upper_chest: 'chest',
  mid_lower_chest: 'chest',
  teres_major: 'back',
  mid_lower_traps: 'back',
  lats: 'back',
  quads: 'legs',
  hamstrings: 'legs',
}

export function computeWindowTotalsByBodyPart({ refDate, days, actionStore, dayDataCacheStore }) {
  const { subcategoryTotals, dayAffectedMap } = computeBodyPartTotalsByDays({
    refDate,
    days,
    actionStore,
    dayDataCacheStore,
  })

  const merged = {}
  for (const item of subcategoryTotals) {
    const id = BODY_PART_MERGE_MAP[item.id] || item.id
    if (!merged[id]) merged[id] = { sets: 0, daySet: new Set() }
    merged[id].sets += item.sets
    const dateSet = dayAffectedMap[item.id]
    if (dateSet) {
      for (const d of dateSet) merged[id].daySet.add(d)
    }
  }

  const result = {}
  for (const [id, v] of Object.entries(merged)) {
    result[id] = { sets: v.sets, days: v.daySet.size }
  }
  return result
}

/**
 * 日期字符串偏移（'YYYY-MM-DD' + 天数偏移 → 'YYYY-MM-DD'），本地时区、纯函数。
 */
function shiftDateStr(dateStr, offsetDays) {
  const y = parseInt(dateStr.slice(0, 4))
  const m = parseInt(dateStr.slice(5, 7)) - 1
  const d = parseInt(dateStr.slice(8, 10))
  const date = new Date(y, m, d)
  date.setDate(date.getDate() + offsetDays)
  return formatDateStr(date)
}

/**
 * 取 [startDate, endDate]（含两端）内的日数据 key。
 * 纯函数：仅依赖 indexedDates 与字符串比较，跨设备可复现。
 */
function getKeysInRange(startDateStr, endDateStr, dayDataCacheStore) {
  const allDates = dayDataCacheStore && dayDataCacheStore.indexedDates
    ? dayDataCacheStore.indexedDates
    : []
  return allDates
    .filter(d => d >= startDateStr && d <= endDateStr)
    .sort()
    .map(d => DAYDATA_PREFIX + d)
}

/**
 * 按"判定部位 id"聚合指定日期范围内的总组数与训练日数（合并口径与
 * computeWindowTotalsByBodyPart 完全一致：组数累加、训练日为子类日期并集）。
 * 纯函数，用于自适应基线的历史窗口现算，不读写任何持久化派生状态。
 * 返回 { [bodyPartId]: { sets, days } }。
 */
export function computeBodyPartTotalsInRange({ startDate, endDate, actionStore, dayDataCacheStore }) {
  const keys = getKeysInRange(startDate, endDate, dayDataCacheStore)

  const subSets = {}
  const subDays = {}

  for (const key of keys) {
    const dateStr = key.replace(DAYDATA_PREFIX, '')
    const data = getDayData(key, dayDataCacheStore)
    const templates = data.templates || {}
    const entries = data.entries || {}
    const daySubs = new Set()

    for (const tplName in templates) {
      const tpl = templates[tplName]
      const actionOrder = tpl.actionOrder || []
      const actionWeights = tpl.actionWeights || {}

      for (const actionName of actionOrder) {
        const action = actionStore.getActionByName(actionName)
        if (!action) continue

        const actionSub = getSubcategoryForAction(action, action.categories?.[0] || '')
        if (!actionSub) continue

        daySubs.add(actionSub)

        const actionEntries = entries[actionName]
        let n = 0
        if (actionEntries && Array.isArray(actionEntries)) {
          n = actionEntries.filter(e => !e.isPlaceholder).length
        } else if ((actionWeights[actionName] || 0) > 0) {
          n = 1
        }
        if (n > 0) {
          subSets[actionSub] = (subSets[actionSub] || 0) + n
        }
      }
    }

    for (const subId of daySubs) {
      if (!subDays[subId]) subDays[subId] = new Set()
      subDays[subId].add(dateStr)
    }
  }

  const merged = {}
  for (const [subId, sets] of Object.entries(subSets)) {
    const id = BODY_PART_MERGE_MAP[subId] || subId
    if (!merged[id]) merged[id] = { sets: 0, daySet: new Set() }
    merged[id].sets += sets
    const ds = subDays[subId]
    if (ds) {
      for (const d of ds) merged[id].daySet.add(d)
    }
  }

  const result = {}
  for (const [id, v] of Object.entries(merged)) {
    result[id] = { sets: v.sets, days: v.daySet.size }
  }
  return result
}

/**
 * 自适应基线历史窗口聚合：当前判定窗口（最近 windowDays 天）之前的 historyDays 天
 * （默认 56 天 = 8 周），不包含当前窗口，避免观测值自我影响基线。
 * 返回 { [bodyPartId]: { sets, days } }，纯函数。
 */
export function computeAdaptiveBaselineByBodyPart({ refDate, windowDays = 14, historyDays = 56, actionStore, dayDataCacheStore }) {
  const endDate = shiftDateStr(refDate, -windowDays)
  const startDate = shiftDateStr(refDate, -(windowDays + historyDays - 1))
  return computeBodyPartTotalsInRange({ startDate, endDate, actionStore, dayDataCacheStore })
}

function collectWeeklyVolume(year, month, periodType, actionStore, dayDataCacheStore) {
  const weeklyVolume = {}

  const keys = dayDataCacheStore
    ? getKeysInPeriodCached(year, month, periodType, dayDataCacheStore)
    : getKeysInPeriod(year, month, periodType)

  for (const key of keys) {
    const dateStr = key.replace(DAYDATA_PREFIX, '')
    const parts = dateStr.split('-')
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    const dayOfWeek = dateObj.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(dateObj)
    monday.setDate(dateObj.getDate() + mondayOffset)
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

    if (!weeklyVolume[weekStart]) {
      weeklyVolume[weekStart] = {}
    }

    const data = getDayData(key, dayDataCacheStore)
    const templates = data.templates || {}
    const entries = data.entries || {}

    for (const tplName in templates) {
      const tpl = templates[tplName]
      const actionOrder = tpl.actionOrder || []
      const actionWeights = tpl.actionWeights || {}

      for (const actionName of actionOrder) {
        const action = actionStore.getActionByName(actionName)
        if (!action) continue

        for (const catId of action.categories || []) {
          const subId = getSubcategoryForAction(action, catId)
          if (!subId) continue

          if (!weeklyVolume[weekStart][subId]) {
            weeklyVolume[weekStart][subId] = 0
          }

          const actionEntries = entries[actionName]
          if (actionEntries && Array.isArray(actionEntries)) {
            weeklyVolume[weekStart][subId] += actionEntries.filter(e => !e.isPlaceholder).length
          } else if ((actionWeights[actionName] || 0) > 0) {
            weeklyVolume[weekStart][subId] += 1
          }
        }
      }
    }
  }

  return weeklyVolume
}

function collectAllWeeklyVolume(actionStore, dayDataCacheStore) {
  const weeklyVolume = {};

  const allDates = dayDataCacheStore && dayDataCacheStore.indexedDates
    ? dayDataCacheStore.indexedDates
    : [];

  for (const dateStr of allDates) {
    const parts = dateStr.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = dateObj.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + mondayOffset);
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    if (!weeklyVolume[weekStart]) {
      weeklyVolume[weekStart] = {};
    }

    const data = getDayData(DAYDATA_PREFIX + dateStr, dayDataCacheStore);
    const templates = data.templates || {};
    const entries = data.entries || {};

    for (const tplName in templates) {
      const tpl = templates[tplName];
      const actionOrder = tpl.actionOrder || [];
      const actionWeights = tpl.actionWeights || {};

      for (const actionName of actionOrder) {
        const action = actionStore.getActionByName(actionName);
        if (!action) continue;

        for (const catId of action.categories || []) {
          const subId = getSubcategoryForAction(action, catId);
          if (!subId) continue;

          if (!weeklyVolume[weekStart][subId]) {
            weeklyVolume[weekStart][subId] = 0;
          }

          const actionEntries = entries[actionName];
          if (actionEntries && Array.isArray(actionEntries)) {
            weeklyVolume[weekStart][subId] += actionEntries.filter(e => !e.isPlaceholder).length;
          } else if ((actionWeights[actionName] || 0) > 0) {
            weeklyVolume[weekStart][subId] += 1;
          }
        }
      }
    }
  }

  return weeklyVolume;
}

export {
  SUBCATEGORIES, SUBCATEGORY_IDS, CATEGORY_NAMES, CATEGORY_IDS, CATEGORY_TO_SUBS,
  isCategoryId, MERGED_CATEGORIES, collectWeeklyVolume, collectAllWeeklyVolume
}
