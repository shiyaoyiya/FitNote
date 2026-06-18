/**
 * 合并导入数据到现有数据
 * @param {Object} existingData - 现有训练数据
 * @param {Array} importedData - 导入的训练数据
 * @param {Array} actionNames - 现有动作名数组
 * @returns {Object} 合并后的数据
 */
export function mergeImportData(existingData, importedData, actionNames = []) {
  if (!existingData || !importedData || importedData.length === 0) {
    return existingData
  }

  const result = {
    ...existingData,
    entries: { ...existingData.entries },
    actions: { ...existingData.actions }
  }

  for (const importedAction of importedData) {
    const { actionName, entries } = importedAction
    
    if (!actionName || !entries || entries.length === 0) {
      continue
    }

    const matchedName = findMatchingAction(actionName, actionNames)
    const finalName = matchedName || actionName

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
      result.entries[finalName] = [
        ...result.entries[finalName],
        ...formattedEntries
      ]
    } else {
      result.entries[finalName] = formattedEntries
    }

    result.actions[finalName] = result.entries[finalName].reduce(
      (sum, entry) => sum + (entry.total || 0), 0
    )
  }

  return result
}

/**
 * 查找匹配的动作名
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
