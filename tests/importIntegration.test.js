import { describe, it, expect, afterEach } from 'vitest'
import { parseImportText, parseImportTextWithActions, fuzzyMatchAction } from '../utils/importParser.js'
import { mergeImportData, getNewActions, applyMatchSelections } from '../utils/dataMerger.js'
import { parseImportText as parseBackupImportText } from '../utils/exportImport.js'
import { migrateActionsIfNeeded, collectFullData } from '../utils/backup.js'
import { applyBackupToLocal } from '../utils/serverBackup.js'

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

describe('导入容量与手动录入口径一致（单侧×2 / 自重模式）', () => {
  it('单侧动作导入时容量×2', () => {
    const existingData = { entries: {}, actions: {} }
    const importedData = [
      { actionName: '单臂绳索下拉', entries: [{ reps: 10, weight: 40 }] }
    ]
    const actionMeta = {
      '单臂绳索下拉': { isUnilateral: true, bodyweightMode: false }
    }
    const { mergedData } = mergeImportData(existingData, importedData, ['单臂绳索下拉'], [], actionMeta)
    const entry = mergedData.entries['单臂绳索下拉'][0]
    expect(entry.total).toBe(800) // 10×40×2
    expect(entry.stages[0].total).toBe(800)
    expect(mergedData.actions['单臂绳索下拉']).toBe(800)
  })

  it('非单侧动作导入时不加倍', () => {
    const existingData = { entries: {}, actions: {} }
    const importedData = [
      { actionName: '绳索下压', entries: [{ reps: 10, weight: 40 }] }
    ]
    const actionMeta = {
      '绳索下压': { isUnilateral: false, bodyweightMode: false }
    }
    const { mergedData } = mergeImportData(existingData, importedData, ['绳索下压'], [], actionMeta)
    expect(mergedData.entries['绳索下压'][0].total).toBe(400)
  })

  it('不传 actionMeta 时保持旧行为（不加倍）', () => {
    const existingData = { entries: {}, actions: {} }
    const importedData = [
      { actionName: '单臂绳索下拉', entries: [{ reps: 10, weight: 40 }] }
    ]
    const { mergedData } = mergeImportData(existingData, importedData)
    expect(mergedData.entries['单臂绳索下拉'][0].total).toBe(400)
  })

  it('动作库匹配到单侧动作后同样×2', () => {
    const existingData = { entries: {}, actions: {} }
    const importedData = [
      { actionName: '单臂绳索下拉', entries: [{ reps: 9, weight: 40 }] }
    ]
    const actionMeta = {
      '单臂绳索下拉': { isUnilateral: true, bodyweightMode: false }
    }
    const { mergedData } = mergeImportData(existingData, importedData, ['单臂绳索下拉'], [], actionMeta)
    expect(mergedData.entries['单臂绳索下拉'][0].total).toBe(720) // 9×40×2
  })

  it('用户选择匹配结果后容量仍按选中动作计算', () => {
    const existingData = { entries: {}, actions: {} }
    const importedData = [
      { actionName: '绳索下拉', entries: [{ reps: 10, weight: 40 }] }
    ]
    const actionMeta = {
      '绳索下压': { isUnilateral: false, bodyweightMode: false },
      '绳索臂屈伸': { isUnilateral: true, bodyweightMode: false }
    }
    const { mergedData, matchResults } = mergeImportData(
      existingData,
      importedData,
      ['绳索下压', '绳索臂屈伸'],
      ['绳索下压', '绳索臂屈伸'],
      actionMeta
    )
    expect(matchResults.length).toBe(1)
    // 用户选择 绳索臂屈伸（单侧）→ 容量×2
    const result = applyMatchSelections(mergedData, matchResults, ['绳索臂屈伸'], actionMeta)
    expect(result.entries['绳索臂屈伸'][0].total).toBe(800) // 10×40×2
  })

  it('助力模式导入容量为负值', () => {
    const existingData = { entries: {}, actions: {} }
    const importedData = [
      { actionName: '引体向上', entries: [{ reps: 8, weight: 10 }] }
    ]
    const actionMeta = {
      '引体向上': { isUnilateral: false, bodyweightMode: 'assisted' }
    }
    const { mergedData } = mergeImportData(existingData, importedData, ['引体向上'], [], actionMeta)
    const entry = mergedData.entries['引体向上'][0]
    expect(entry.total).toBe(-80)
    expect(entry.bwMode).toBe('assisted')
  })

  it('备份导入（exportImport）同样按单侧×2计算容量', () => {
    const text = `=== 训练数据 ===
2026-09-20（背+后束+三头）：
1. 单臂绳索下拉
第1组：10次 × 40kg
第2组：9次 × 40kg
2. 绳索下压
第1组：11次 × 22.5kg`
    const actionMeta = {
      '单臂绳索下拉': { isUnilateral: true, bodyweightMode: false },
      '绳索下压': { isUnilateral: false, bodyweightMode: false }
    }
    const parsed = parseBackupImportText(text, actionMeta)
    const dayData = parsed.dayData['2026-09-20']
    expect(dayData.entries['单臂绳索下拉'][0].total).toBe(800) // 10×40×2
    expect(dayData.entries['单臂绳索下拉'][1].total).toBe(720) // 9×40×2
    expect(dayData.entries['绳索下压'][0].total).toBe(247.5) // 11×22.5
    expect(dayData.actions['单臂绳索下拉']).toBe(1520)
  })
})

describe('备份功能完整性（动作库与动作标记）', () => {
  it('本地备份恢复（migrateActionsIfNeeded）保留 isUnilateral/bodyweightMode 等字段', () => {
    const rawActions = [
      {
        id: 'a1',
        name: '单臂绳索下拉',
        categories: ['back'],
        subcategories: {},
        categoryName: '背部',
        createdAt: '2026-01-01T00:00:00.000Z',
        isUnilateral: true,
        bodyweightMode: false
      },
      {
        id: 'a2',
        name: '引体向上',
        categories: ['back'],
        subcategories: {},
        categoryName: '背部',
        createdAt: '2026-01-01T00:00:00.000Z',
        isUnilateral: false,
        bodyweightMode: 'assisted'
      }
    ]
    const migrated = migrateActionsIfNeeded(rawActions)
    expect(migrated[0].isUnilateral).toBe(true)
    expect(migrated[0].name).toBe('单臂绳索下拉')
    expect(migrated[1].bodyweightMode).toBe('assisted')
    expect(migrated[1].isUnilateral).toBe(false)
    // 分类仍被正确归一化
    expect(migrated[0].categories).toEqual(['back'])
  })

  it('旧版字符串动作库仍能迁移为对象（兼容旧备份）', () => {
    const migrated = migrateActionsIfNeeded(['卧推', '深蹲'])
    expect(migrated.length).toBe(2)
    expect(typeof migrated[0]).toBe('object')
    expect(migrated[0].name).toBe('卧推')
    expect(migrated[0].categories[0]).toBe('chest')
  })

  it('文本备份动作库 round-trip：单侧/自重标记无损', () => {
    const { formatActions } = require('../utils/exportImport.js')
    const actions = [
      {
        id: 'a1',
        name: '单臂绳索下拉',
        categories: ['back'],
        subcategories: {},
        categoryName: '背部',
        createdAt: '2026-01-01T00:00:00.000Z',
        isUnilateral: true,
        bodyweightMode: false
      },
      {
        id: 'a2',
        name: '引体向上',
        categories: ['back'],
        subcategories: {},
        categoryName: '背部',
        createdAt: '2026-01-01T00:00:00.000Z',
        isUnilateral: false,
        bodyweightMode: 'assisted'
      }
    ]
    const text = formatActions(actions)
    expect(text.startsWith('=== 动作库 ===\n')).toBe(true)
    const parsed = parseBackupImportText(text + '\n=== 训练数据 ===\n')
    expect(parsed.actions.length).toBe(2)
    expect(parsed.actions[0]).toEqual(actions[0])
    expect(parsed.actions[1]).toEqual(actions[1])
  })

  it('文本备份无动作库区块时 actions 为空数组（向后兼容）', () => {
    const parsed = parseBackupImportText('=== 模板数据 ===\n胸日：\n卧推×4\n')
    expect(parsed.actions).toEqual([])
    expect(parsed.templates.length).toBe(1)
  })
})

describe('备份覆盖范围（动作分类 / 日设置 / 个人档案）', () => {
  // 极简 uni storage mock，仅覆盖备份收集/恢复用到的 API
  function mockUni(store) {
    global.uni = {
      getStorageSync: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : ''),
      setStorageSync: (k, v) => { store[k] = v },
      removeStorageSync: (k) => { delete store[k] },
      getStorageInfoSync: () => ({ keys: Object.keys(store) }),
      $emit: () => {},
    }
  }

  afterEach(() => {
    delete global.uni
  })

  it('本地备份收集（collectFullData）包含分类/日设置/个人档案', () => {
    const store = {
      fitness_templates: [{ name: '胸日' }],
      fitness_actions: [{ name: '卧推', isUnilateral: false }],
      annivs: '[]',
      'fitness_daydata_2026-09-20': { templates: {}, entries: {} },
      fitness_day_settings: { isDarkMode: true, splitPlan: { enabled: true } },
      fitness_categories: [{ id: 'c1', name: '自定义分类', isDefault: false }],
      fitness_user_profile: '{"gender":"male","weight":70}',
    }
    mockUni(store)
    const data = collectFullData()
    expect(data.fitness_categories).toEqual([{ id: 'c1', name: '自定义分类', isDefault: false }])
    expect(data.fitness_day_settings.isDarkMode).toBe(true)
    expect(data.fitness_user_profile).toBe('{"gender":"male","weight":70}')
    expect(data.fitness_templates).toEqual([{ name: '胸日' }])
    expect(data.fitness_actions).toEqual([{ name: '卧推', isUnilateral: false }])
  })

  it('云端恢复（applyBackupToLocal）覆盖模式：写回分类/日设置/个人档案并清除旧值', () => {
    const store = {
      fitness_templates: [{ name: '旧模板' }],
      fitness_actions: [{ name: '旧动作' }],
      annivs: '[]',
      'fitness_daydata_2026-09-19': { templates: {}, entries: {} },
      fitness_day_settings: { isDarkMode: false },
      fitness_categories: [{ id: 'old' }],
      fitness_user_profile: '{"weight":60}',
      fitness_index: { some: 'index' },
    }
    mockUni(store)
    applyBackupToLocal({
      data: {
        fitness_templates: [{ name: '新模板' }],
        fitness_actions: [{ name: '新动作', isUnilateral: true }],
        fitness_annivs: [{ id: 'a1' }],
        fitness_daydata: { '2026-09-21': { templates: {}, entries: {} } },
        fitness_day_settings: { isDarkMode: true, splitPlan: { enabled: true, mode: 'cycle', cycleDays: [] } },
        fitness_categories: [{ id: 'c1', name: '自定义', isDefault: false }],
        fitness_user_profile: '{"gender":"male","weight":70}',
      }
    }, 'overwrite')
    expect(store.fitness_templates).toEqual([{ name: '新模板' }])
    expect(store['fitness_daydata_2026-09-19']).toBeUndefined()
    expect(store['fitness_daydata_2026-09-21']).toEqual({ templates: {}, entries: {} })
    expect(store.fitness_day_settings.isDarkMode).toBe(true)
    expect(store.fitness_categories).toEqual([{ id: 'c1', name: '自定义', isDefault: false }])
    expect(store.fitness_user_profile).toBe('{"gender":"male","weight":70}')
  })

  it('云端恢复（applyBackupToLocal）合并模式：分类按项合并，档案后写覆盖', () => {
    const store = {
      fitness_templates: [{ name: '旧模板' }],
      fitness_actions: [{ name: '旧动作' }],
      annivs: '[]',
      fitness_day_settings: { isDarkMode: false },
      fitness_categories: [{ id: 'c1', name: '自定义', isDefault: false }],
      fitness_user_profile: '{"weight":60}',
    }
    mockUni(store)
    applyBackupToLocal({
      data: {
        fitness_templates: [{ name: '新模板' }],
        fitness_actions: [{ name: '新动作' }],
        fitness_annivs: [],
        fitness_daydata: {},
        fitness_categories: [
          { id: 'c1', name: '自定义', isDefault: false },
          { id: 'c2', name: '另一分类', isDefault: false },
        ],
        fitness_user_profile: '{"gender":"female","weight":55}',
      }
    }, 'merge')
    expect(store.fitness_templates).toEqual([{ name: '旧模板' }, { name: '新模板' }])
    expect(store.fitness_categories.length).toBe(2)
    expect(store.fitness_categories[1].id).toBe('c2')
    expect(store.fitness_user_profile).toBe('{"gender":"female","weight":55}')
    expect(store.fitness_day_settings.isDarkMode).toBe(false) // 无新值保留旧值
  })
})
