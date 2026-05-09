// utils/trainingAnalyzer.js
// 智能模板推荐分析器：分析最近训练记录，推荐互补肌群的模板

const ALL_CATEGORIES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs']

const CATEGORY_NAMES = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  arms: '手臂',
  legs: '腿部',
  abs: '腹部',
}

// 动作名 -> 肌群分类关键词（与 action.js 中一致）
const CATEGORY_KEYWORDS = {
  chest: ['哑铃卧推', '杠铃卧推', '上斜卧推', '下斜卧推', '史密斯卧推', '卧推', '哑铃飞鸟', '龙门架飞鸟', '蝴蝶机夹胸', '夹胸', '飞鸟', '上斜', '下斜', '胸'],
  back: ['引体向上', '引体', '高位下拉', '坐姿划船', '杠铃划船', '哑铃划船', '单臂划船', '划船', '硬拉', '罗马尼亚硬拉', '山羊挺身', '挺身', '下拉', '大剪刀', 'Keslo', '梅多斯', '直臂下压', 'T杠', '背'],
  shoulders: ['哑铃推举', '杠铃推举', '阿诺德推举', '推举', '侧平举', '前平举', '面拉', '直立划船', '耸肩', '实力推', 'Y举', '肩'],
  arms: ['杠铃弯举', '哑铃弯举', '锤式弯举', '牧师凳弯举', '弯举', '臂屈伸', '绳索下压', '三头下压', '锤式', '绳索', '肱二', '肱三', '手臂', '二头', '三头', '窄距卧推', 'JM推举'],
  legs: ['杠铃深蹲', '哑铃深蹲', '高脚杯深蹲', '深蹲', '腿举', '腿弯举', '腿屈伸', '直腿硬拉', '弓箭步', '臀推', '臀桥', '保加利亚', '倒蹬', '提踵', '髋外展', '髋内收', '后踢腿', '腿'],
  abs: ['卷腹', '平板支撑', '平板', '举腿', '悬垂举腿', '俄罗斯转体', '俄罗斯', '核心', '腹', '仰卧', '两头起', '龙门架卷腹'],
}

function detectCategoryByName(name) {
  const sortedEntries = Object.entries(CATEGORY_KEYWORDS).map(([cat, kws]) => {
    const sorted = [...kws].sort((a, b) => b.length - a.length)
    return [cat, sorted]
  })
  for (const [category, keywords] of sortedEntries) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) return category
    }
  }
  return 'abs'
}

function formatDateStr(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`
}

/**
 * 分析最近训练模式，推荐互补模板
 * @param {Object} dayDataCacheStore - dayDataCache store 实例
 * @param {Object} templateStore - template store 实例
 * @param {Object} actionStore - action store 实例
 * @returns {{ suggestion: string, reason: string, trainedParts: string[], missedParts: string[], recommendedTemplate: string|null }}
 */
export function analyzeTrainingPattern(dayDataCacheStore, templateStore, actionStore) {
  const today = new Date()
  const lookbackDays = 28
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - lookbackDays)

  // 统计每个肌群在最近28天内的训练次数
  const categoryCount = {}
  ALL_CATEGORIES.forEach(c => { categoryCount[c] = 0 })

  // 遍历最近28天
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateStr(d)
    const dayData = dayDataCacheStore.getDayData(dateStr)
    if (!dayData || !dayData.templates) continue

    // 遍历该日的模板
    for (const tplName in dayData.templates) {
      const tpl = dayData.templates[tplName]
      if (!tpl || !tpl.actionWeights) continue

      // 遍历该模板的动作
      for (const actionName in tpl.actionWeights) {
        if (tpl.actionWeights[actionName] <= 0) continue
        const cat = detectCategoryByName(actionName)
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      }
    }
  }

  // 找出训练最频繁和最缺少的肌群
  const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])
  const trainedParts = sorted.filter(([, count]) => count > 0).map(([cat]) => cat)
  const missedParts = sorted.filter(([, count]) => count === 0).map(([cat]) => cat)

  // 推荐逻辑：优先推荐训练次数最少的肌群对应的模板
  // 查找现有模板中最匹配"需要训练肌群"的那个
  const templates = templateStore.templates || []
  let bestTemplate = null
  let bestScore = -1

  for (const tpl of templates) {
    if (tpl.isAerobic) continue
    const actions = tpl.actions || []
    if (actions.length === 0) continue

    // 计算该模板覆盖"缺少肌群"的得分
    let score = 0
    const tplCategories = new Set()
    for (const actionName of actions) {
      const cat = detectCategoryByName(actionName)
      tplCategories.add(cat)
      // 缺少的肌群权重更高
      if (missedParts.includes(cat)) {
        score += 3
      } else {
        // 已训练但次数少的肌群也有加分
        const count = categoryCount[cat] || 0
        score += Math.max(0, 1 - count * 0.1)
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestTemplate = tpl.name
    }
  }

  // 生成推荐原因
  let reason = ''
  if (missedParts.length > 0) {
    const missedNames = missedParts.map(c => CATEGORY_NAMES[c] || c).join('、')
    reason = `最近${lookbackDays}天未训练：${missedNames}`
  } else if (trainedParts.length > 0) {
    const leastTrained = sorted[sorted.length - 1]
    reason = `${CATEGORY_NAMES[leastTrained[0]] || leastTrained[0]}训练次数最少（${leastTrained[1]}次），建议加强`
  } else {
    reason = '暂无训练记录，建议开始第一次训练'
  }

  return {
    suggestion: bestTemplate || '暂无推荐',
    reason,
    trainedParts,
    missedParts,
    recommendedTemplate: bestTemplate,
  }
}

import { getPresetTemplatePacks } from './presetTemplates.js'

/**
 * 获取预设推荐模板包（推拉腿分化等）
 * @returns {Array<{name: string, actions: string[], color: string}>}
 */
export { getPresetTemplatePacks }
