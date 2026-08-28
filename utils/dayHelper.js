// DayData 可选心率字段（训练结束且有手环数据时写入）：
//   heartRateAvg: number|null    本次平均心率
//   caloriesTotal: number|null   本次消耗热量 kcal
//   durationSec: number|null      本次训练时长(秒)

/**
 * 训练组类型
 */
export const ENTRY_TYPE = {
  NORMAL: 'normal',
  DECREASING: 'decreasing',
  PAUSED: 'paused',
  COMPOSITE: 'composite',
}

/**
 * 判断复合组的整体类型（子组与主组重量比较）
 * @param {Array} stages - 阶段数组
 * @returns {string} 'decreasing' | 'paused' | 'increasing' | 'mixed'
 */
export function getCompositeType(stages) {
  if (!stages || stages.length < 2) return null
  const mainWeight = stages[0].weight
  const subTypes = stages.slice(1).map(s => {
    if (s.weight === mainWeight) return 'paused'
    if (s.weight < mainWeight) return 'decreasing'
    return 'increasing'
  })
  const first = subTypes[0]
  if (subTypes.every(t => t === first)) return first
  return 'mixed'
}

/**
 * 创建单个阶段数据
 */
export function createStage(reps, weight, isUnilateral = false) {
  const repsNum = Number(reps)
  const weightNum = weight ? Number(weight) : 0
  const total = weightNum > 0
    ? Math.round(repsNum * weightNum * (isUnilateral ? 2 : 1) * 100) / 100
    : repsNum
  return { reps: repsNum, weight: weightNum, total }
}

/**
 * 构建训练条目
 * @param {string} type - normal | decreasing | paused
 * @param {Array} stages - 阶段数组 [{reps, weight}]
 * @param {boolean} isUnilateral - 是否单侧动作
 * @returns {object} entry
 */
export function buildEntry(type, stages, isUnilateral = false, bwMode) {
  const builtStages = stages
    .filter(s => s.reps && Number(s.reps) > 0)
    .map(s => createStage(s.reps, s.weight, isUnilateral))

  if (builtStages.length === 0) return null

  let total = builtStages.reduce((sum, s) => sum + s.total, 0)
  if (bwMode === 'assisted') total = -Math.abs(total)

  // 构建显示字符串
  const stageStrings = builtStages.map(s =>
    s.weight > 0 ? `${s.reps}×${s.weight}` : `${s.reps}`
  )
  const inputStr = stageStrings.join('+')

  return {
    input: inputStr,
    total,
    type: type || ENTRY_TYPE.NORMAL,
    stages: builtStages,
    ...(bwMode ? { bwMode } : {}),
  }
}

/**
 * 获取条目显示文本
 */
export function getEntryDisplayText(entry) {
  if (!entry || !entry.stages || entry.stages.length === 0) return ''
  const stageStrings = entry.stages.map(s => {
    if (entry.bwMode === 'bodyweight') return `${s.reps}次`
    if (entry.bwMode === 'assisted') return `${s.reps}次(-${s.weight}kg)`
    if (entry.bwMode === 'weighted') return `${s.reps}次(+${s.weight}kg)`
    return s.weight > 0 ? `${s.reps}×${s.weight}kg` : `${s.reps}次`
  })
  let text = stageStrings.join('+')
  if (entry.type === ENTRY_TYPE.DECREASING) text += ' 🔻递减'
  else if (entry.type === ENTRY_TYPE.PAUSED) text += ' ⏸暂停'
  else if (entry.type === ENTRY_TYPE.COMPOSITE) {
    const compType = getCompositeType(entry.stages)
    if (compType === 'decreasing') text += '(🔻递减)'
    else if (compType === 'paused') text += '(⏸暂停)'
    else if (compType === 'increasing') text += '(🔺递增)'
    else if (compType === 'mixed') text += '(🔗复合)'
  }
  return text
}

/**
 * 获取动作总容量
 */
export function getTotalWeight(entries) {
  if (!entries || entries.length === 0) return 0
  return Math.round(entries.reduce((sum, item) => sum + (item.total || 0), 0) * 100) / 100
}

/**
 * 获取动作总组数
 */
export function getTotalSets(entries) {
  if (!entries || entries.length === 0) return 0
  return entries.length
}

/**
 * 为兼容旧数据，将旧格式 entry 转为新格式
 * 旧: { input: "10×50", total: 500 }
 * 新: { input: "10×50", total: 500, type: "normal", stages: [{reps:10, weight:50, total:500}] }
 */
export function normalizeEntry(entry) {
  if (!entry) return null
  if (entry.isPlaceholder) return entry
  if (entry.stages && entry.stages.length > 0) return entry

  // 旧格式，解析 input 字符串
  const input = entry.input || ''
  const parts = input.split('+')
  const stages = parts.map(part => {
    const [reps, weight] = part.split('×')
    return createStage(Number(reps), weight ? Number(weight) : 0)
  })

  return {
    input: entry.input,
    total: entry.total,
    type: ENTRY_TYPE.NORMAL,
    stages,
    ...(entry.bwMode ? { bwMode: entry.bwMode } : {}),
  }
}

/**
 * 批量规范化条目数组（兼容旧数据）
 */
export function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return []
  return entries.map(e => normalizeEntry(e)).filter(Boolean)
}

/**
 * 创建占位条目（用于模板默认组数）
 * @param {number} targetSets - 目标组数
 * @param {number} currentSets - 当前已有组数
 * @param {string} type - 条目类型
 * @returns {Array} 填充后的 entries 数组
 */
export function fillPlaceholderEntries(targetSets, currentEntries = [], type = ENTRY_TYPE.NORMAL) {
  const result = currentEntries ? [...currentEntries] : []
  const currentCount = result.filter(e => !isPlaceholderEntry(e)).length
  const needToAdd = targetSets - currentCount

  if (needToAdd > 0) {
    for (let i = 0; i < needToAdd; i++) {
      result.push(createPlaceholderEntry(type))
    }
  } else if (needToAdd < 0) {
    for (let i = 0; i < Math.abs(needToAdd); i++) {
      const lastNonPlaceholder = -1
      for (let j = result.length - 1; j >= 0; j--) {
        if (!isPlaceholderEntry(result[j])) {
          result.splice(j, 1)
          break
        }
      }
    }
  }

  return result
}

/**
 * 创建单个占位条目
 */
export function createPlaceholderEntry(type = ENTRY_TYPE.NORMAL) {
  return {
    isPlaceholder: true,
    type: type || ENTRY_TYPE.NORMAL,
    input: '',
    total: 0,
    stages: []
  }
}

/**
 * 判断是否是占位条目
 */
export function isPlaceholderEntry(entry) {
  return entry && entry.isPlaceholder === true
}

/**
 * 获取有效条目数量（排除占位符）
 */
export function getFilledEntryCount(entries) {
  if (!Array.isArray(entries)) return 0
  return entries.filter(e => !isPlaceholderEntry(e)).length
}
