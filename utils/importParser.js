/**
 * 解析导入的文本数�? * @param {string} text - 原始文本
 * @returns {Array} 解析后的动作和组数数�? */
export function parseImportText(text) {
  if (!text || typeof text !== 'string') {
    return []
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const result = []
  let currentAction = null

  for (const line of lines) {
    // 尝试解析动作�?    const actionName = parseActionName(line)
    if (actionName) {
      if (currentAction) {
        result.push(currentAction)
      }
      currentAction = {
        actionName,
        entries: []
      }
      continue
    }

    // 尝试解析组数
    if (currentAction) {
      const entries = parseEntries(line)
      if (entries.length > 0) {
        currentAction.entries.push(...entries)
      }
    }
  }

  if (currentAction && currentAction.entries.length > 0) {
    result.push(currentAction)
  }

  return result
}

/**
 * 使用动作库进行模糊匹�? * @param {string} text - 原始文本
 * @param {Array} actionNames - 现有动作名数�? * @returns {Array} 解析后的动作和组数数�? */
export function parseImportTextWithActions(text, actionNames = []) {
  if (!text || typeof text !== 'string') {
    return []
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const result = []
  let currentAction = null

  for (const line of lines) {
    // 尝试解析动作�?    let actionName = parseActionName(line)
    let entriesPart = line
    
    // 如果没有解析到动作名，尝试模糊匹�?    if (!actionName && actionNames.length > 0) {
      const matchResult = fuzzyMatchActionWithPosition(line, actionNames)
      if (matchResult) {
        actionName = matchResult.actionName
        entriesPart = matchResult.remaining
      }
    }
    
    if (actionName) {
      if (currentAction) {
        result.push(currentAction)
      }
      currentAction = {
        actionName,
        entries: []
      }
      
      // 如果同一行还有组数数据，解析�?      if (entriesPart !== line) {
        const entries = parseEntries(entriesPart)
        if (entries.length > 0) {
          currentAction.entries.push(...entries)
        }
      }
      continue
    }

    // 尝试解析组数
    if (currentAction) {
      const entries = parseEntries(line)
      if (entries.length > 0) {
        currentAction.entries.push(...entries)
      }
    }
  }

  if (currentAction && currentAction.entries.length > 0) {
    result.push(currentAction)
  }

  return result
}

/**
 * 解析动作�? * @param {string} line - 文本�? * @returns {string|null} 动作名或null
 */
function parseActionName(line) {
  // 格式1：数字编号开头，�?1. 卧推"
  const numberedMatch = line.match(/^\d+\.\s*(.+)/)
  if (numberedMatch) {
    return numberedMatch[1].trim()
  }

  // 格式2：动作名后跟冒号，如"卧推�?
  // 排除"第X组："这种格式，因为它应该是组数数�?  const colonMatch = line.match(/^([^�?]+)[�?]/)
  if (colonMatch) {
    const potentialAction = colonMatch[1].trim()
    // 如果匹配�?第X�?格式，返回null
    if (/^第\d+�?/.test(potentialAction)) {
      return null
    }
    return potentialAction
  }

  // 格式3：纯动作名（需要与现有动作库匹配）
  // 这个需要在调用时传入动作库进行匹配
  return null
}

/**
 * 解析组数
 * @param {string} line - 文本�? * @returns {Array} 解析后的组数数组
 */
function parseEntries(line) {
  const entries = []

  // 格式1：第X组：数字�?× 重量kg
  const stageFormat1 = line.match(/�?\d+)组[�?]\s*(\d+)\s*�?\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*kg?/)
  if (stageFormat1) {
    entries.push({
      reps: parseInt(stageFormat1[2]),
      weight: parseFloat(stageFormat1[3])
    })
    return entries
  }

  // 格式2：数字×重量（多个�?  const stageFormat2 = line.match(/(\d+)\s*[×xX*]\s*(\d+(?:\.\d+)?)/g)
  if (stageFormat2) {
    for (const match of stageFormat2) {
      const parts = match.match(/(\d+)\s*[×xX*]\s*(\d+(?:\.\d+)?)/)
      if (parts) {
        entries.push({
          reps: parseInt(parts[1]),
          weight: parseFloat(parts[2])
        })
      }
    }
    return entries
  }

  // 格式3：数字次 重量kg
  const stageFormat3 = line.match(/(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/g)
  if (stageFormat3) {
    for (const match of stageFormat3) {
      const parts = match.match(/(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/)
      if (parts) {
        entries.push({
          reps: parseInt(parts[1]),
          weight: parseFloat(parts[2])
        })
      }
    }
    return entries
  }

  // 格式4：数字组 数字�?重量kg
  const stageFormat4 = line.match(/(\d+)\s*组\s*(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/)
  if (stageFormat4) {
    const sets = parseInt(stageFormat4[1])
    const reps = parseInt(stageFormat4[2])
    const weight = parseFloat(stageFormat4[3])
    for (let i = 0; i < sets; i++) {
      entries.push({ reps, weight })
    }
    return entries
  }

  return entries
}

/**
 * 模糊匹配动作�? * @param {string} text - 文本
 * @param {Array} actionNames - 动作名数�? * @returns {string|null} 匹配的动作名或null
 */
export function fuzzyMatchAction(text, actionNames) {
  // �Ƴ��ո�ͱ��
  const cleanText = text.replace(/[\s��:����,��.]/g, '').toLowerCase()
  
  // ��������������������ƥ������Ķ�����
  const sortedActions = [...actionNames].sort((a, b) => b.length - a.length)
  
  for (const actionName of sortedActions) {
    const cleanAction = actionName.replace(/[\s��:����,��.]/g, '').toLowerCase()
    
    // ��ȫƥ��
    if (cleanText === cleanAction) {
      return actionName
    }
    
    // ����ƥ�䣨ֻ�е����������ȴ��ڵ���2ʱ��������
    if (cleanAction.length >= 2 && (cleanText.includes(cleanAction) || cleanAction.includes(cleanText))) {
      return actionName
    }
  }
  
  return null
}

/**
 * 模糊匹配动作名并返回位置信息
 * @param {string} text - 文本
 * @param {Array} actionNames - 动作名数�? * @returns {Object|null} { actionName, remaining } �?null
 */
function fuzzyMatchActionWithPosition(text, actionNames) {
  for (const actionName of actionNames) {
    // 尝试在文本开头匹配动作名
    const index = text.indexOf(actionName)
    if (index === 0) {
      return {
        actionName,
        remaining: text.substring(actionName.length).trim()
      }
    }
    
    // 尝试不区分大小写匹配
    const lowerText = text.toLowerCase()
    const lowerAction = actionName.toLowerCase()
    const lowerIndex = lowerText.indexOf(lowerAction)
    if (lowerIndex === 0) {
      return {
        actionName,
        remaining: text.substring(actionName.length).trim()
      }
    }
  }
  
  return null
}

