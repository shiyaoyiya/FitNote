import { describe, it, expect } from 'vitest'
import { parseImportText, parseImportTextWithActions, fuzzyMatchAction } from '../utils/importParser.js'
import { mergeImportData, getNewActions } from '../utils/dataMerger.js'

describe('导出格式导入', () => {
  it('基本解析', () => {
    const text = `1. 卧推
第1组：10次 × 50kg
第2组：10次 × 50kg`
    const result = parseImportText(text)
    expect(result.length).toBe(1)
    expect(result[0].actionName).toBe('卧推')
    expect(result[0].entries.length).toBe(2)
    expect(result[0].entries[0].reps).toBe(10)
    expect(result[0].entries[0].weight).toBe(50)
    expect(result[0].entries[1].reps).toBe(10)
    expect(result[0].entries[1].weight).toBe(50)
  })

  it('多个动作解析', () => {
    const text = `1. 卧推
第1组：10次 × 50kg
第2组：10次 × 50kg
2. 深蹲
第1组：8次 × 80kg
第2组：8次 × 80kg`
    const result = parseImportText(text)
    expect(result.length).toBe(2)
    expect(result[0].actionName).toBe('卧推')
    expect(result[1].actionName).toBe('深蹲')
  })

  it('带日期标题', () => {
    const text = `6月18日：胸背腿
1. 卧推
第1组：10次 × 50kg
第2组：10次 × 50kg`
    const result = parseImportText(text)
    expect(result.length).toBe(1)
    expect(result[0].actionName).toBe('卧推')
    expect(result[0].entries.length).toBe(2)
  })
})

describe('简洁格式导入', () => {
  it('使用动作库匹配', () => {
    const text = `卧推 10×50 10×50 10×50
深蹲 8×80 8×80`
    const actionNames = ['卧推', '深蹲', '硬拉']
    const result = parseImportTextWithActions(text, actionNames)
    expect(result.length).toBe(2)
    expect(result[0].actionName).toBe('卧推')
    expect(result[0].entries.length).toBe(3)
    expect(result[0].entries[0].reps).toBe(10)
    expect(result[0].entries[0].weight).toBe(50)
    expect(result[1].actionName).toBe('深蹲')
    expect(result[1].entries.length).toBe(2)
    expect(result[1].entries[0].reps).toBe(8)
    expect(result[1].entries[0].weight).toBe(80)
  })

  it('无动作库时也能解析', () => {
    const text = `卧推 10×50 10×50 10×50
深蹲 8×80 8×80`
    const result = parseImportText(text)
    expect(result.length).toBe(2)
    expect(result[0].actionName).toBe('卧推')
    expect(result[0].entries.length).toBe(3)
    expect(result[1].actionName).toBe('深蹲')
    expect(result[1].entries.length).toBe(2)
  })
})

describe('自由文本格式导入', () => {
  it('冒号格式', () => {
    const text = `卧推：
10次 50kg`
    const result = parseImportText(text)
    expect(result.length).toBe(1)
    expect(result[0].actionName).toBe('卧推')
    expect(result[0].entries.length).toBe(1)
    expect(result[0].entries[0].reps).toBe(10)
    expect(result[0].entries[0].weight).toBe(50)
  })

  it('组数格式', () => {
    const text = `深蹲：
3组 8次 80kg`
    const result = parseImportText(text)
    expect(result.length).toBe(1)
    expect(result[0].actionName).toBe('深蹲')
    expect(result[0].entries.length).toBe(1)
    expect(result[0].entries[0].reps).toBe(8)
    expect(result[0].entries[0].weight).toBe(80)
  })

  it('多个动作', () => {
    const text = `卧推：
10次 50kg
深蹲：
3组 8次 80kg`
    const result = parseImportText(text)
    expect(result.length).toBe(2)
    expect(result[0].actionName).toBe('卧推')
    expect(result[1].actionName).toBe('深蹲')
  })
})

describe('错误处理', () => {
  it('空文本', () => {
    const result = parseImportText('')
    expect(result).toEqual([])
  })

  it('null 输入', () => {
    const result = parseImportText(null)
    expect(result).toEqual([])
  })

  it('undefined 输入', () => {
    const result = parseImportText(undefined)
    expect(result).toEqual([])
  })

  it('无法解析的文本', () => {
    const text = `这是一段无法解析的文本
没有任何训练数据`
    const result = parseImportText(text)
    expect(result).toEqual([])
  })

  it('动作名不匹配', () => {
    const text = `卧推 10×50`
    const actionNames = ['深蹲', '硬拉']
    const result = parseImportTextWithActions(text, actionNames)
    expect(result.length).toBe(1)
    expect(result[0].actionName).toBe('卧推')
    expect(result[0].entries.length).toBe(1)
  })

  it('部分动作名不匹配', () => {
    const text = `卧推 10×50
深蹲 8×80`
    const actionNames = ['卧推', '硬拉']
    const result = parseImportTextWithActions(text, actionNames)
    expect(result.length).toBe(2)
    expect(result[0].actionName).toBe('卧推')
    expect(result[1].actionName).toBe('深蹲')
  })
})

describe('数据合并', () => {
  it('追加到现有动作', () => {
    const existingData = {
      entries: {
        '卧推': [
          { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
        ]
      },
      actions: { '卧推': 500 }
    }
    const importedData = [
      { actionName: '卧推', entries: [{ reps: 10, weight: 50 }] }
    ]
    const { mergedData } = mergeImportData(existingData, importedData)
    expect(mergedData.entries['卧推'].length).toBe(2)
    expect(mergedData.actions['卧推']).toBe(1000)
  })

  it('添加新动作', () => {
    const existingData = {
      entries: {
        '卧推': [
          { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
        ]
      },
      actions: { '卧推': 500 }
    }
    const importedData = [
      { actionName: '深蹲', entries: [{ reps: 8, weight: 80 }] }
    ]
    const { mergedData } = mergeImportData(existingData, importedData, ['卧推', '深蹲'])
    expect(Object.keys(mergedData.entries).length).toBe(2)
    expect(mergedData.entries['深蹲'].length).toBe(1)
    expect(mergedData.actions['深蹲']).toBe(640)
  })

  it('模糊匹配动作名', () => {
    const existingData = {
      entries: {
        '卧推': [
          { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
        ]
      },
      actions: { '卧推': 500 }
    }
    const importedData = [
      { actionName: '卧推训练', entries: [{ reps: 10, weight: 50 }] }
    ]
    const { mergedData } = mergeImportData(existingData, importedData, ['卧推'])
    expect(mergedData.entries['卧推'].length).toBe(2)
    expect(mergedData.actions['卧推']).toBe(1000)
  })

  it('空数据处理', () => {
    const existingData = { entries: {}, actions: {} }
    const result1 = mergeImportData(existingData, [])
    expect(result1.mergedData).toEqual(existingData)
    const result2 = mergeImportData(existingData, null)
    expect(result2.mergedData).toEqual(existingData)
  })

  it('获取新动作', () => {
    const mergedData = {
      entries: { '卧推': [], '深蹲': [], '硬拉': [] }
    }
    const templateActions = ['卧推', '深蹲']
    const newActions = getNewActions(mergedData, templateActions)
    expect(newActions).toEqual(['硬拉'])
  })

  it('占位符处理', () => {
    const existingData = {
      entries: {
        '卧推': [
          { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
        ]
      },
      actions: { '卧推': 500 }
    }
    const importedData = [
      { actionName: '卧推', entries: [{ reps: 0, weight: 0 }] }
    ]
    const { mergedData } = mergeImportData(existingData, importedData)
    expect(mergedData.entries['卧推'].length).toBe(2)
    expect(mergedData.actions['卧推']).toBe(500)
  })
})

describe('模糊匹配函数', () => {
  it('完全匹配', () => {
    const result = fuzzyMatchAction('卧推', ['卧推', '深蹲', '硬拉'])
    expect(result).toBe('卧推')
  })

  it('包含匹配', () => {
    const result = fuzzyMatchAction('卧推训练', ['卧推', '深蹲', '硬拉'])
    expect(result).toBe('卧推')
  })

  it('不匹配', () => {
    const result = fuzzyMatchAction('引体向上', ['卧推', '深蹲', '硬拉'])
    expect(result).toBe(null)
  })
})
