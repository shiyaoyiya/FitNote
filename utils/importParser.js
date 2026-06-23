/**
 * 解析导入的文本数据
 * @param {string} text - 原始文本
 * @returns {Array} 解析后的动作和组数数组
 */
export function parseImportText(text) {
  if (!text || typeof text !== 'string') {
    return []
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const result = []
  let currentAction = null

  for (const line of lines) {
    const actionResult = parseActionNameWithRemaining(line)
    if (actionResult) {
      if (currentAction) {
        result.push(currentAction)
      }
      currentAction = { actionName: actionResult.name, entries: [] }
      if (actionResult.remaining) {
        const entries = parseEntries(actionResult.remaining)
        if (entries.length > 0) {
          currentAction.entries.push(...entries)
        }
      }
      continue
    }
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
 * 使用动作库进行模糊匹配
 */
export function parseImportTextWithActions(text, actionNames = []) {
  if (!text || typeof text !== 'string') {
    return []
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const result = []
  let currentAction = null

  for (const line of lines) {
    let actionResult = parseActionNameWithRemaining(line)
    let actionName = actionResult ? actionResult.name : null
    let entriesPart = actionResult ? actionResult.remaining : line

    if (!actionName && actionNames.length > 0) {
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
      currentAction = { actionName, entries: [] }
      if (entriesPart) {
        const entries = parseEntries(entriesPart)
        if (entries.length > 0) {
          currentAction.entries.push(...entries)
        }
      }
      continue
    }

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

function parseActionName(line) {
  const result = parseActionNameWithRemaining(line)
  return result ? result.name : null
}

function parseActionNameWithRemaining(line) {
  const numberedMatch = line.match(/^\d+\.\s*(.+)/)
  if (numberedMatch) {
    return { name: numberedMatch[1].trim(), remaining: '' }
  }

  const colonMatch = line.match(/^([^：:]+)[：:](.*)/)
  if (colonMatch) {
    const potentialAction = colonMatch[1].trim()
    if (/^第\d+组$/.test(potentialAction)) return null
    if (/^\d+月\d+日/.test(potentialAction)) return null
    return { name: potentialAction, remaining: colonMatch[2].trim() }
  }

  // 格式3：动作名 + 数据（如"对握窄距下拉 30kg 7个"）
  const hasData = /\d+\s*(kg|个|次|组|[✖️xX×*])/.test(line)
  if (hasData) {
    const match = line.match(/^(.+?)\s*(\d+\s*(?:kg|个|次|组|[✖️xX×*]).*)$/)
    if (match && match[1]) {
      const actionName = match[1].trim()
      if (/^\d+月\d+日/.test(actionName)) return null
      if (/^\d+$/.test(actionName)) return null
      // 排除以数字+组/次开头的格式（如"3组 8次"）
      if (/^\d+\s*(组|次)/.test(actionName)) return null
      return { name: actionName, remaining: match[2].trim() }
    }
  }

  return null
}

/**
 * 解析组数 - 支持一行多个重量组
 */
function parseEntries(line) {
  const entries = []

  // 格式1：第X组：数字次 × 重量kg
  const f1 = line.match(/第(\d+)组[：:]\s*(\d+)\s*次?\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*kg?/)
  if (f1) {
    entries.push({ reps: parseInt(f1[2]), weight: parseFloat(f1[3]) })
    return entries
  }

  // 格式9：重量✖️次数个 组数组（如：20✖️15个 四组）— 优先于格式2
  const f9 = line.match(/(\d+(?:\.\d+)?)\s*(?:✖\uFE0F?|×|x|X|\*)\s*(\d+)\s*个?\s*(\d+|[一二两三四五六七八九十]+)\s*组/)
  if (f9) {
    const weight = parseFloat(f9[1])
    const reps = parseInt(f9[2])
    let sets = parseInt(f9[3])
    if (isNaN(sets)) sets = cnNum(f9[3])
    for (let i = 0; i < sets; i++) entries.push({ reps, weight })
    return entries
  }

  // 格式9b：重量✖️次数个（如：20✖️15个，无组数，默认1组）— 优先于格式2
  const f9b = line.match(/(\d+(?:\.\d+)?)\s*(?:✖\uFE0F?|×|x|X|\*)\s*(\d+)\s*个/)
  if (f9b) {
    entries.push({ reps: parseInt(f9b[2]), weight: parseFloat(f9b[1]) })
    return entries
  }

  // 格式2：数字×重量（多个，如 10×50 10×50）
  const f2 = line.match(/(\d+)\s*[×xX*✖]\uFE0F?\s*(\d+(?:\.\d+)?)/g)
  if (f2 && f2.length > 0) {
    for (const match of f2) {
      const parts = match.match(/(\d+)\s*[×xX*✖]\uFE0F?\s*(\d+(?:\.\d+)?)/)
      if (parts) {
        entries.push({ reps: parseInt(parts[1]), weight: parseFloat(parts[2]) })
      }
    }
    if (entries.length > 0) return entries
  }

  // 格式3：数字次 重量kg
  const f3 = line.match(/(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/g)
  if (f3) {
    for (const match of f3) {
      const parts = match.match(/(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/)
      if (parts) {
        entries.push({ reps: parseInt(parts[1]), weight: parseFloat(parts[2]) })
      }
    }
    if (entries.length > 0) return entries
  }

  // 格式4：数字组 数字次 重量kg
  const f4 = line.match(/(\d+)\s*组\s*(\d+)\s*次\s*(\d+(?:\.\d+)?)\s*kg/)
  if (f4) {
    const sets = parseInt(f4[1])
    const reps = parseInt(f4[2])
    const weight = parseFloat(f4[3])
    for (let i = 0; i < sets; i++) entries.push({ reps, weight })
    return entries
  }

  // 格式5+：按重量分段解析（支持一行多个重量组）
  // 先找所有 "数字kg" 的位置，按此分段
  const kgPositions = []
  const kgRe = /(\d+(?:\.\d+)?)\s*kg/g
  let kgMatch
  while ((kgMatch = kgRe.exec(line)) !== null) {
    kgPositions.push({
      weight: parseFloat(kgMatch[1]),
      start: kgMatch.index,
      end: kgMatch.index + kgMatch[0].length
    })
  }

  if (kgPositions.length > 0) {
    for (let i = 0; i < kgPositions.length; i++) {
      const segStart = kgPositions[i].end
      const segEnd = (i + 1 < kgPositions.length) ? kgPositions[i + 1].start : line.length
      const segment = line.substring(segStart, segEnd).trim()
      const weight = kgPositions[i].weight
      const parsed = parseRepsAndSets(segment, weight)
      if (parsed.length > 0) entries.push(...parsed)
    }
    if (entries.length > 0) return entries
  }

  // 格式10：重量kg 次数个（单组，如：26kg 15个）
  const f10 = line.match(/(\d+(?:\.\d+)?)\s*kg\s*(\d+)\s*个/g)
  if (f10) {
    for (const match of f10) {
      const parts = match.match(/(\d+(?:\.\d+)?)\s*kg\s*(\d+)\s*个/)
      if (parts) {
        entries.push({ reps: parseInt(parts[2]), weight: parseFloat(parts[1]) })
      }
    }
    if (entries.length > 0) return entries
  }

  return entries
}

/**
 * 解析一段文本中的次数和组数（已去掉重量部分）
 */
function parseRepsAndSets(segment, weight) {
  const entries = []

  // 匹配组数：✖️数字组、✖️数字
  const setsRe = /(?:✖\uFE0F?|×|x|X|\*)\s*(\d+)\s*组?/
  const setsMatch = segment.match(setsRe)
  let sets = setsMatch ? parseInt(setsMatch[1]) : 1

  // 匹配中文数字组数（如：四组）
  if (!setsMatch) {
    const cnMatch = segment.match(/([一二两三四五六七八九十]+)\s*组/)
    if (cnMatch) sets = cnNum(cnMatch[1])
  }

  // 匹配所有次数（如：7个、11个、10个、9个）
  const repsMatches = segment.match(/(\d+)\s*个/g)
  if (repsMatches) {
    if (repsMatches.length === 1) {
      // 单个次数：重复 sets 次
      const reps = parseInt(repsMatches[0].match(/(\d+)/)[1])
      for (let i = 0; i < sets; i++) entries.push({ reps, weight })
    } else {
      // 多个次数：sets 表示总组数，每个次数一组
      // 如果 sets 未指定（=1），则每个次数各一组
      for (const repsMatch of repsMatches) {
        const reps = parseInt(repsMatch.match(/(\d+)/)[1])
        entries.push({ reps, weight })
      }
    }
  } else {
    // 如果没有"个"，尝试匹配纯数字次数（如：15✖️4 中的 15）
    const numRe = /\b(\d+)\s*(?:✖\uFE0F?|×|x|X|\*)/
    const numMatch = segment.match(numRe)
    if (numMatch) {
      const reps = parseInt(numMatch[1])
      for (let i = 0; i < sets; i++) entries.push({ reps, weight })
    }
  }

  return entries
}

function cnNum(str) {
  const map = { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 }
  return map[str] || 1
}

/**
 * 模糊匹配动作名
 */
export function fuzzyMatchAction(text, actionNames) {
  const cleanText = text.replace(/[\s：:、，,。.]/g, '').toLowerCase()
  const sorted = [...actionNames].sort((a, b) => b.length - a.length)

  for (const name of sorted) {
    const clean = name.replace(/[\s：:、，,。.]/g, '').toLowerCase()
    if (cleanText === clean) return name
    if (clean.length >= 2 && (cleanText.includes(clean) || clean.includes(cleanText))) return name
  }
  return null
}

/**
 * 模糊匹配动作名并返回位置信息
 */
function fuzzyMatchActionWithPosition(text, actionNames) {
  const sorted = [...actionNames].sort((a, b) => b.length - a.length)

  for (const name of sorted) {
    if (text.indexOf(name) === 0) {
      return { actionName: name, remaining: text.substring(name.length).trim() }
    }
    if (text.toLowerCase().indexOf(name.toLowerCase()) === 0) {
      return { actionName: name, remaining: text.substring(name.length).trim() }
    }
  }
  return null
}
