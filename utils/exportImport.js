/**
 * 格式化模板数据为文本
 * @param {Array} templates - 模板数组
 * @returns {string} 格式化后的文本
 */
export function formatTemplates(templates) {
  if (!templates || templates.length === 0) return ''

  let text = '=== 模板数据 ===\n'
  templates.forEach((tpl, idx) => {
    if (idx > 0) text += '\n'
    text += `${tpl.name}：\n`
    if (tpl.actions && tpl.actions.length > 0) {
      tpl.actions.forEach(act => {
        const sets = (tpl.actionSets && tpl.actionSets[act]) || 4
        text += `${act}×${sets}\n`
      })
    }
  })
  return text
}

/**
 * 格式化分化计划为文本
 * @param {Object} splitPlan - 分化计划对象
 * @param {Array} templates - 模板数组
 * @returns {string} 格式化后的文本
 */
export function formatSplitPlan(splitPlan, templates) {
  if (!splitPlan || !splitPlan.enabled) return ''

  const plan = splitPlan.mode === 'cycle' ? splitPlan.cycleDays : splitPlan.weekPlan
  const modeText = splitPlan.mode === 'cycle' ? '按天数' : '按周'
  const dayNames = splitPlan.mode === 'cycle'
    ? plan.map((_, idx) => `第${idx + 1}天`)
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  let text = '=== 分化计划 ===\n'
  text += `分化计划（${modeText}）：\n`

  plan.forEach((day, idx) => {
    if (day.enabled && day.template) {
      const template = templates.find(t => t.name === day.template)
      text += `${dayNames[idx]}（${day.template}）：\n`
      if (template && template.actions) {
        template.actions.forEach(action => {
          const sets = (template.actionSets && template.actionSets[action]) || 4
          text += `${action}×${sets}\n`
        })
      }
    } else {
      text += `${dayNames[idx]}：休息\n`
    }
    text += '\n'
  })

  return text
}

/**
 * 格式化训练数据为文本
 * @param {Object} dayData - 训练数据对象，键为日期，值为训练数据
 * @returns {string} 格式化后的文本
 */
export function formatDayData(dayData) {
  if (!dayData || Object.keys(dayData).length === 0) return ''

  let text = '=== 训练数据 ===\n'

  Object.keys(dayData).sort().reverse().forEach(date => {
    const data = dayData[date]
    if (!data || data.isRestDay) return

    // 获取模板名称
    const templateNames = data.templates ? Object.keys(data.templates) : []
    const templateName = templateNames.length > 0 ? templateNames[templateNames.length - 1] : '未知模板'

    // 获取动作列表 - 优先使用 actionOrder 保持原始顺序
    const tplInfo = data.templates ? data.templates[templateName] : null
    const actions = (tplInfo && Array.isArray(tplInfo.actionOrder) && tplInfo.actionOrder.length > 0)
      ? tplInfo.actionOrder
      : (data.entries ? Object.keys(data.entries) : [])
    if (actions.length === 0) return

    text += `${date}（${templateName}）：\n`

    actions.forEach((actName, actionIdx) => {
      const entries = data.entries[actName] || []
      // 过滤掉占位符条目（没有实际数据的条目）
      const filledEntries = entries.filter(e => e && !e.isPlaceholder && e.stages && e.stages.length > 0)
      if (filledEntries.length === 0) return

      text += `${actionIdx + 1}. ${actName}\n`
      filledEntries.forEach((entry, entryIdx) => {
        const stage = entry.stages[0]
        if (stage) {
          const reps = stage.reps || 0
          const weight = stage.weight || 0
          text += `第${entryIdx + 1}组：${reps}次 × ${weight}kg\n`
        }
      })
      text += '\n'
    })
  })

  return text
}

/**
 * 导出数据到剪贴板
 * @param {Object} options - 导出选项
 * @param {Array} options.templates - 选中的模板数组
 * @param {Object} options.splitPlan - 分化计划对象
 * @param {Object} options.dayData - 训练数据对象
 * @returns {Promise<boolean>} 是否成功
 */
export async function exportToClipboard(options) {
  const { templates, splitPlan, dayData } = options

  let text = ''

  if (templates && templates.length > 0) {
    text += formatTemplates(templates) + '\n\n'
  }

  if (splitPlan && splitPlan.enabled) {
    text += formatSplitPlan(splitPlan, templates || []) + '\n\n'
  }

  if (dayData && Object.keys(dayData).length > 0) {
    text += formatDayData(dayData) + '\n\n'
  }

  text = text.trim()

  if (!text) {
    throw new Error('没有可导出的数据')
  }

  return new Promise((resolve, reject) => {
    uni.setClipboardData({
      data: text,
      success: () => resolve(true),
      fail: () => reject(new Error('复制到剪贴板失败'))
    })
  })
}

/**
 * 解析模板数据
 * @param {string} text - 模板文本
 * @returns {Array} 模板数组
 */
function parseTemplates(text) {
  const templates = []
  // 统一换行符
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n').filter(l => l.trim())

  let currentTemplate = null

  lines.forEach(line => {
    if (line.endsWith('：') || line.endsWith(':')) {
      // 模板名称行
      if (currentTemplate) {
        templates.push(currentTemplate)
      }
      currentTemplate = {
        name: line.replace(/[：:]$/, '').trim(),
        actions: [],
        actionSets: {},
        id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
        createdAt: new Date().toISOString()
      }
    } else if (currentTemplate && line.includes('×')) {
      // 动作行
      const match = line.match(/^(.+?)×(\d+)$/)
      if (match) {
        const actionName = match[1].trim()
        const sets = parseInt(match[2])
        currentTemplate.actions.push(actionName)
        currentTemplate.actionSets[actionName] = sets
      }
    }
  })

  if (currentTemplate) {
    templates.push(currentTemplate)
  }

  return templates
}

/**
 * 解析分化计划
 * @param {string} text - 分化计划文本
 * @returns {Object} 分化计划对象
 */
function parseSplitPlan(text) {
  // 统一换行符
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n').filter(l => l.trim())

  let mode = 'cycle'
  let cycleDays = []
  let weekPlan = []

  // 解析模式
  const modeMatch = text.match(/分化计划（(按天数|按周)）/)
  if (modeMatch) {
    mode = modeMatch[1] === '按天数' ? 'cycle' : 'week'
  }

  lines.forEach(line => {
    if (line.includes('（') && line.includes('）') && !line.startsWith('分化计划')) {
      // 有模板的天
      const dayMatch = line.match(/^(.*?)（(.*?)）/)
      if (dayMatch) {
        const templateName = dayMatch[2]

        const dayObj = { template: templateName, enabled: true }

        if (mode === 'cycle') {
          cycleDays.push(dayObj)
        } else {
          weekPlan.push(dayObj)
        }
      }
    } else if (line.includes('：休息')) {
      // 休息天
      const dayObj = { template: null, enabled: false }

      if (mode === 'cycle') {
        cycleDays.push(dayObj)
      } else {
        weekPlan.push(dayObj)
      }
    }
  })

  return {
    enabled: true,
    mode,
    cycleDays,
    weekPlan,
    startOffset: 0,
    lastActiveDate: ''
  }
}

/**
 * 解析训练数据
 * @param {string} text - 训练数据文本
 * @returns {Object} 训练数据对象
 */
function parseDayData(text) {
  const dayData = {}
  // 统一换行符，支持 \r\n 和 \n
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n').filter(l => l.trim())

  let currentDate = null
  let currentData = null
  let currentActionName = null

  lines.forEach((line, idx) => {
    // 日期行：2026-06-21（模板名）：- 使用更宽松的匹配
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})[\(（](.*?)[\)）]/)
    if (dateMatch) {
      if (currentDate && currentData) {
        dayData[currentDate] = currentData
      }

      currentDate = dateMatch[1]
      const templateName = dateMatch[2]
      currentData = {
        templates: {
          [templateName]: {
            totalWeight: 0,
            actionWeights: {},
            actionOrder: []
          }
        },
        entries: {},
        actions: {},
        isRestDay: false
      }
      currentActionName = null
      return
    }

    // 动作行：1. 卧推 或 1.卧推
    const actionMatch = line.match(/^\d+[.．]\s*(.+)$/)
    if (actionMatch && currentData) {
      currentActionName = actionMatch[1].trim()
      const templateName = Object.keys(currentData.templates)[0]
      if (templateName) {
        currentData.templates[templateName].actionOrder.push(currentActionName)
      }
      currentData.entries[currentActionName] = []
      currentData.actions[currentActionName] = 0
      return
    }

    // 组数行：第1组：10次 × 60kg - 支持多种空格
    const setMatch = line.match(/^第(\d+)组[：:](\d+)次\s*[×xX]\s*(\d+(\.\d+)?)kg$/)
    if (setMatch && currentData && currentActionName) {
      const reps = parseInt(setMatch[2])
      const weight = parseFloat(setMatch[3])
      const total = Math.round(reps * weight * 100) / 100
      
      const entry = {
        isPlaceholder: false,
        type: 'normal',
        input: `${reps}×${weight}`,
        total: total,
        stages: [{
          reps: reps,
          weight: weight,
          total: total
        }]
      }
      currentData.entries[currentActionName].push(entry)
      
      // 更新动作总重量
      currentData.actions[currentActionName] = (currentData.actions[currentActionName] || 0) + total
      
      // 更新模板中的动作权重和总重量
      const templateName = Object.keys(currentData.templates)[0]
      if (templateName) {
        currentData.templates[templateName].actionWeights[currentActionName] = 
          currentData.actions[currentActionName]
        currentData.templates[templateName].totalWeight = 
          Object.values(currentData.templates[templateName].actionWeights).reduce((a, b) => a + b, 0)
      }
    }
  })

  if (currentDate && currentData) {
    dayData[currentDate] = currentData
  }

  return dayData
}

/**
 * 解析导入的文本数据
 * @param {string} text - 要解析的文本
 * @returns {Object} 解析结果
 */
export function parseImportText(text) {
  if (!text || !text.trim()) {
    return { templates: [], splitPlan: null, dayData: {} }
  }

  const result = {
    templates: [],
    splitPlan: null,
    dayData: {}
  }

  // 按分隔符分割文本
  const sections = text.split(/===.*?===/).filter(s => s.trim())
  const sectionHeaders = text.match(/===.*?===/g) || []

  sections.forEach((section, idx) => {
    const header = sectionHeaders[idx] || ''
    const content = section.trim()

    if (header.includes('模板数据')) {
      result.templates = parseTemplates(content)
    } else if (header.includes('分化计划')) {
      result.splitPlan = parseSplitPlan(content)
    } else if (header.includes('训练数据')) {
      result.dayData = parseDayData(content)
    }
  })

  return result
}

/**
 * 从剪贴板导入数据
 * @returns {Promise<Object>} 解析后的数据
 */
export async function importFromClipboard() {
  return new Promise((resolve, reject) => {
    uni.getClipboardData({
      success: (res) => {
        if (res && res.data) {
          try {
            const parsed = parseImportText(res.data)
            resolve(parsed)
          } catch (err) {
            reject(new Error('无法解析剪贴板中的数据'))
          }
        } else {
          reject(new Error('剪贴板为空'))
        }
      },
      fail: () => {
        reject(new Error('获取剪贴板失败'))
      }
    })
  })
}
