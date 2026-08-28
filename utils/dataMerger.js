/**
 * 合并导入数据到现有数据
 * @param {Object} existingData - 现有训练数据
 * @param {Array} importedData - 导入的训练数据
 * @param {Array} actionNames - 现有动作名数组（本地动作库）
 * @param {Array} templateActions - 当天模板的动作列表
 * @returns {Object} { mergedData, matchResults }
 */
export function mergeImportData(existingData, importedData, actionNames = [], templateActions = []) {
  if (!existingData || !importedData || importedData.length === 0) {
    return { mergedData: existingData, matchResults: [] }
  }

  const result = {
    ...existingData,
    entries: { ...existingData.entries },
    actions: { ...existingData.actions }
  }

  const matchResults = []

  for (const importedAction of importedData) {
    const { actionName, entries } = importedAction

    if (!actionName || !entries || entries.length === 0) {
      continue
    }

    // 查找匹配：先查当天模板，再查动作库
    const matches = findAllMatches(actionName, templateActions, actionNames)

    let finalName = actionName
    let needConfirm = false

    if (matches.length === 1) {
      // 只有一个匹配，直接使用
      finalName = matches[0]
    } else if (matches.length > 1) {
      // 多个匹配，需要用户选择
      matchResults.push({
        importedName: actionName,
        entries,
        matches,
        selected: matches[0] // 默认选第一个
      })
      continue // 先跳过，等用户选择后再处理
    }
    // matches.length === 0 时，使用原始动作名（新增动作）

    const formattedEntries = entries.map(entry => ({
      input: `${entry.reps}×${entry.weight}`,
      total: entry.reps * entry.weight,
      type: 'normal',
      stages: [{
        reps: entry.reps,
        weight: entry.weight,
        total: entry.reps * entry.weight
      }]
    }))

    if (result.entries[finalName]) {
      // 合并时过滤掉占位符
      const validEntries = result.entries[finalName].filter(e => !e.isPlaceholder)
      result.entries[finalName] = [
        ...validEntries,
        ...formattedEntries
      ]
    } else {
      result.entries[finalName] = formattedEntries
    }

    result.actions[finalName] = result.entries[finalName].reduce(
      (sum, entry) => sum + (entry.total || 0), 0
    )
  }

  return { mergedData: result, matchResults }
}

/**
 * 应用用户选择的匹配结果
 */
export function applyMatchSelections(mergedData, matchResults, selections) {
  const result = {
    ...mergedData,
    entries: { ...mergedData.entries },
    actions: { ...mergedData.actions }
  }

  for (let i = 0; i < matchResults.length; i++) {
    const matchResult = matchResults[i]
    const selectedName = selections[i] || matchResult.selected
    const entries = matchResult.entries

    const formattedEntries = entries.map(entry => ({
      input: `${entry.reps}×${entry.weight}`,
      total: entry.reps * entry.weight,
      type: 'normal',
      stages: [{
        reps: entry.reps,
        weight: entry.weight,
        total: entry.reps * entry.weight
      }]
    }))

    if (result.entries[selectedName]) {
      // 合并时过滤掉占位符
      const validEntries = result.entries[selectedName].filter(e => !e.isPlaceholder)
      result.entries[selectedName] = [
        ...validEntries,
        ...formattedEntries
      ]
    } else {
      result.entries[selectedName] = formattedEntries
    }

    result.actions[selectedName] = result.entries[selectedName].reduce(
      (sum, entry) => sum + (entry.total || 0), 0
    )
  }

  return result
}

/**
 * 查找所有匹配的动作名（模糊匹配）
 * @param {string} actionName - 要匹配的动作名
 * @param {Array} templateActions - 当天模板的动作列表（优先）
 * @param {Array} allActionNames - 所有动作名（本地动作库）
 * @returns {Array} 匹配的动作名列表
 */
function findAllMatches(actionName, templateActions, allActionNames) {
  const cleanName = actionName.replace(/[\s：:、，,。.]/g, '').toLowerCase()

  // 1. 先检查是否有精确匹配
  for (const name of templateActions) {
    const clean = name.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    if (clean === cleanName) return [name]
  }
  for (const name of allActionNames) {
    const clean = name.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    if (clean === cleanName) return [name]
  }

  // 2. 模糊匹配，收集所有匹配结果及其分数
  const matchScores = []

  // 先查当天模板的动作（优先级更高）
  for (const name of templateActions) {
    const clean = name.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    if (isActionMatch(cleanName, clean)) {
      const score = getMatchScore(cleanName, clean) + 50 // 模板动作加50分优先级
      matchScores.push({ name, score })
    }
  }

  // 再查所有动作库
  for (const name of allActionNames) {
    if (matchScores.some(m => m.name === name)) continue
    const clean = name.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    if (isActionMatch(cleanName, clean)) {
      const score = getMatchScore(cleanName, clean)
      matchScores.push({ name, score })
    }
  }

  // 按分数降序排序
  matchScores.sort((a, b) => b.score - a.score)

  // 取最高分的所有结果
  if (matchScores.length === 0) return []
  const maxScore = matchScores[0].score
  const topMatches = matchScores.filter(m => m.score === maxScore)

  // 如果最高分只有一个结果，直接返回（不用选择）
  if (topMatches.length === 1) return [topMatches[0].name]

  // 如果有多个相同最高分的结果，返回全部让用户选择
  return topMatches.map(m => m.name)
}

/**
 * 判断两个动作名是否匹配
 * @param {string} name1 - 动作名1（已清理）
 * @param {string} name2 - 动作名2（已清理）
 * @returns {boolean} 是否匹配
 */
function isActionMatch(name1, name2) {
  // 完全匹配
  if (name1 === name2) return true

  // 一个包含另一个
  if (name1.includes(name2) || name2.includes(name1)) return true

  // 提取关键词匹配（如 "宽距下拉" 和 "宽距高位下拉" 都包含 "宽距" 和 "下拉"）
  const keywords1 = extractKeywords(name1)
  const keywords2 = extractKeywords(name2)

  // 如果两个关键词列表有交集，且交集占比较高
  const intersection = keywords1.filter(k => keywords2.includes(k))
  if (intersection.length >= 2) return true
  if (intersection.length >= 1 && (intersection.length >= keywords1.length * 0.5 || intersection.length >= keywords2.length * 0.5)) return true

  return false
}

/**
 * 计算匹配分数（用于排序）
 * @param {string} name1 - 要匹配的动作名（已清理）
 * @param {string} name2 - 现有动作名（已清理）
 * @returns {number} 匹配分数，越高越匹配
 */
function getMatchScore(name1, name2) {
  // 完全匹配
  if (name1 === name2) return 1000

  // 一个包含另一个
  if (name1.includes(name2)) return 500 + name2.length
  if (name2.includes(name1)) return 500 + name1.length

  // 关键词匹配
  const keywords1 = extractKeywords(name1)
  const keywords2 = extractKeywords(name2)
  const intersection = keywords1.filter(k => keywords2.includes(k))

  return intersection.length * 100
}

/**
 * 提取动作名中的关键词
 * @param {string} name - 动作名（已清理）
 * @returns {Array} 关键词列表
 */
function extractKeywords(name) {
  // 常见动作关键词
  const allKeywords = [
    '宽距', '窄距', '对握', '反手', '正手',
    '高位', '下拉', '划船', '卧推', '推举',
    '弯举', '臂屈伸', '飞鸟', '夹胸',
    '深蹲', '硬拉', '腿举', '腿屈伸',
    '上斜', '下斜', '平板', '坐姿', '站姿',
    '杠铃', '哑铃', '绳索', '器械', '悍马'
  ]

  const found = []
  for (const keyword of allKeywords) {
    if (name.includes(keyword)) {
      found.push(keyword)
    }
  }
  return found
}

/**
 * 查找匹配的动作名（单个）
 * @param {string} actionName - 要匹配的动作名
 * @param {Array} actionNames - 现有动作名数组
 * @returns {string|null} 匹配的动作名或null
 */
function findMatchingAction(actionName, actionNames) {
  if (!actionName || !actionNames || actionNames.length === 0) {
    return null
  }

  if (actionNames.includes(actionName)) {
    return actionName
  }

  const cleanName = actionName.replace(/[\s：:、，,。.]/g, '').toLowerCase()

  for (const existingName of actionNames) {
    const cleanExisting = existingName.replace(/[\s：:、，,。.]/g, '').toLowerCase()

    if (cleanName === cleanExisting) {
      return existingName
    }

    if (cleanName.includes(cleanExisting) || cleanExisting.includes(cleanName)) {
      return existingName
    }
  }

  return null
}

/**
 * 检查是否需要添加新动作到模板
 * @param {Object} mergedData - 合并后的数据
 * @param {Array} templateActions - 模板中的动作列表
 * @returns {Array} 需要添加的新动作列表
 */
export function getNewActions(mergedData, templateActions = []) {
  if (!mergedData || !mergedData.entries) {
    return []
  }

  const existingActions = new Set(templateActions)
  const newActions = []

  for (const actionName of Object.keys(mergedData.entries)) {
    if (!existingActions.has(actionName)) {
      newActions.push(actionName)
    }
  }

  return newActions
}
