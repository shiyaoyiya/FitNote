import assert from 'assert'
import { parseImportText, parseImportTextWithActions, fuzzyMatchAction } from '../utils/importParser.js'
import { mergeImportData, getNewActions } from '../utils/dataMerger.js'

console.log('开始导入功能集成测�?..\n')

// 测试计数�?let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`�?${name}`)
    passed++
  } catch (error) {
    console.log(`�?${name}`)
    console.log(`  ${error.message}`)
    failed++
  }
}

// Step 1: 测试导出格式导入
console.log('\n=== Step 1: 测试导出格式导入 ===')

test('导出格式 - 基本解析', () => {
  const text = `1. 卧推
�?组：10�?× 50kg
�?组：10�?× 50kg`

  const result = parseImportText(text)
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].actionName, '卧推')
  assert.strictEqual(result[0].entries.length, 2)
  assert.strictEqual(result[0].entries[0].reps, 10)
  assert.strictEqual(result[0].entries[0].weight, 50)
  assert.strictEqual(result[0].entries[1].reps, 10)
  assert.strictEqual(result[0].entries[1].weight, 50)
})

test('导出格式 - 多个动作解析', () => {
  const text = `1. 卧推
�?组：10�?× 50kg
�?组：10�?× 50kg
2. 深蹲
�?组：8�?× 80kg
�?组：8�?× 80kg`

  const result = parseImportText(text)
  assert.strictEqual(result.length, 2)
  assert.strictEqual(result[0].actionName, '卧推')
  assert.strictEqual(result[1].actionName, '深蹲')
})

test('导出格式 - 带日期标�?, () => {
  const text = `6�?8日：胸背�?1. 卧推
�?组：10�?× 50kg
�?组：10�?× 50kg`

  const result = parseImportText(text)
  // 日期标题会被解析为动作名，但没有组数数据，所以会被添加到结果�?  assert.strictEqual(result.length, 2)
  assert.strictEqual(result[0].actionName, '6�?8�?)
  assert.strictEqual(result[0].entries.length, 0)
  assert.strictEqual(result[1].actionName, '卧推')
  assert.strictEqual(result[1].entries.length, 2)
})

// Step 2: 测试简洁格式导�?console.log('\n=== Step 2: 测试简洁格式导�?===')

test('简洁格�?- 使用动作库匹�?, () => {
  const text = `卧推 10×50 10×50 10×50
深蹲 8×80 8×80`
  const actionNames = ['卧推', '深蹲', '硬拉']

  const result = parseImportTextWithActions(text, actionNames)
  assert.strictEqual(result.length, 2)
  assert.strictEqual(result[0].actionName, '卧推')
  assert.strictEqual(result[0].entries.length, 3)
  assert.strictEqual(result[0].entries[0].reps, 10)
  assert.strictEqual(result[0].entries[0].weight, 50)
  assert.strictEqual(result[1].actionName, '深蹲')
  assert.strictEqual(result[1].entries.length, 2)
  assert.strictEqual(result[1].entries[0].reps, 8)
  assert.strictEqual(result[1].entries[0].weight, 80)
})

test('简洁格�?- 无动作库时解析失�?, () => {
  const text = `卧推 10×50 10×50 10×50
深蹲 8×80 8×80`

  const result = parseImportText(text)
  // 没有动作库匹配，简洁格式无法解�?  assert.strictEqual(result.length, 0)
})

// Step 3: 测试自由文本格式导入
console.log('\n=== Step 3: 测试自由文本格式导入 ===')

test('自由文本格式 - 冒号格式', () => {
  const text = `卧推�?10�?50kg`

  const result = parseImportText(text)
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].actionName, '卧推')
  assert.strictEqual(result[0].entries.length, 1)
  assert.strictEqual(result[0].entries[0].reps, 10)
  assert.strictEqual(result[0].entries[0].weight, 50)
})

test('自由文本格式 - 组数格式', () => {
  const text = `深蹲�?3�?8�?80kg`

  const result = parseImportText(text)
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].actionName, '深蹲')
  // 格式3 (数字�?重量kg) 优先于格�?匹配，所以只匹配�?8�?80kg 一�?  assert.strictEqual(result[0].entries.length, 1)
  assert.strictEqual(result[0].entries[0].reps, 8)
  assert.strictEqual(result[0].entries[0].weight, 80)
})

test('自由文本格式 - 多个动作', () => {
  const text = `卧推�?10�?50kg
深蹲�?3�?8�?80kg`

  const result = parseImportText(text)
  assert.strictEqual(result.length, 2)
  assert.strictEqual(result[0].actionName, '卧推')
  assert.strictEqual(result[1].actionName, '深蹲')
})

// Step 4: 测试错误处理
console.log('\n=== Step 4: 测试错误处理 ===')

test('错误处理 - 空文�?, () => {
  const result = parseImportText('')
  assert.deepStrictEqual(result, [])
})

test('错误处理 - null 输入', () => {
  const result = parseImportText(null)
  assert.deepStrictEqual(result, [])
})

test('错误处理 - undefined 输入', () => {
  const result = parseImportText(undefined)
  assert.deepStrictEqual(result, [])
})

test('错误处理 - 无法解析的文�?, () => {
  const text = `这是一段无法解析的文本
没有任何训练数据`

  const result = parseImportText(text)
  assert.deepStrictEqual(result, [])
})

test('错误处理 - 动作名不匹配', () => {
  const text = `卧推 10×50`
  const actionNames = ['深蹲', '硬拉']

  const result = parseImportTextWithActions(text, actionNames)
  // 使用动作库匹配时，如果动作名不在库中，应该返回空数组
  assert.strictEqual(result.length, 0)
})

test('错误处理 - 部分动作名不匹配', () => {
  const text = `卧推 10×50
深蹲 8×80`
  const actionNames = ['卧推', '硬拉']

  const result = parseImportTextWithActions(text, actionNames)
  // 只有匹配的动作会被解�?  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].actionName, '卧推')
})

// Step 5: 测试数据合并
console.log('\n=== Step 5: 测试数据合并 ===')

test('数据合并 - 追加到现有动�?, () => {
  const existingData = {
    entries: {
      '卧推': [
        { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
      ]
    },
    actions: { '卧推': 500 }
  }

  const importedData = [
    {
      actionName: '卧推',
      entries: [{ reps: 10, weight: 50 }]
    }
  ]

  const result = mergeImportData(existingData, importedData)
  assert.strictEqual(result.entries['卧推'].length, 2)
  assert.strictEqual(result.actions['卧推'], 1000)
})

test('数据合并 - 添加新动�?, () => {
  const existingData = {
    entries: {
      '卧推': [
        { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
      ]
    },
    actions: { '卧推': 500 }
  }

  const importedData = [
    {
      actionName: '深蹲',
      entries: [{ reps: 8, weight: 80 }]
    }
  ]

  const result = mergeImportData(existingData, importedData, ['卧推', '深蹲'])
  assert.strictEqual(Object.keys(result.entries).length, 2)
  assert.strictEqual(result.entries['深蹲'].length, 1)
  assert.strictEqual(result.actions['深蹲'], 640)
})

test('数据合并 - 模糊匹配动作�?, () => {
  const existingData = {
    entries: {
      '卧推': [
        { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
      ]
    },
    actions: { '卧推': 500 }
  }

  const importedData = [
    {
      actionName: '卧推训练',
      entries: [{ reps: 10, weight: 50 }]
    }
  ]

  const result = mergeImportData(existingData, importedData, ['卧推'])
  assert.strictEqual(result.entries['卧推'].length, 2)
  assert.strictEqual(result.actions['卧推'], 1000)
})

test('数据合并 - 空数据处�?, () => {
  const existingData = {
    entries: {},
    actions: {}
  }

  const result1 = mergeImportData(existingData, [])
  assert.deepStrictEqual(result1, existingData)

  const result2 = mergeImportData(existingData, null)
  assert.deepStrictEqual(result2, existingData)
})

test('数据合并 - 获取新动�?, () => {
  const mergedData = {
    entries: {
      '卧推': [],
      '深蹲': [],
      '硬拉': []
    }
  }

  const templateActions = ['卧推', '深蹲']
  const newActions = getNewActions(mergedData, templateActions)
  assert.deepStrictEqual(newActions, ['硬拉'])
})

test('数据合并 - 占位符处�?, () => {
  const existingData = {
    entries: {
      '卧推': [
        { input: '10×50', total: 500, type: 'normal', stages: [{ reps: 10, weight: 50, total: 500 }] }
      ]
    },
    actions: { '卧推': 500 }
  }

  const importedData = [
    {
      actionName: '卧推',
      entries: [{ reps: 0, weight: 0 }]
    }
  ]

  const result = mergeImportData(existingData, importedData)
  assert.strictEqual(result.entries['卧推'].length, 2)
  // 占位符数据应该被添加，但不影响总重�?  assert.strictEqual(result.actions['卧推'], 500)
})

// 测试模糊匹配函数
console.log('\n=== 额外测试：模糊匹配函�?===')

test('模糊匹配 - 完全匹配', () => {
  const result = fuzzyMatchAction('卧推', ['卧推', '深蹲', '硬拉'])
  assert.strictEqual(result, '卧推')
})

test('模糊匹配 - 包含匹配', () => {
  const result = fuzzyMatchAction('卧推训练', ['卧推', '深蹲', '硬拉'])
  assert.strictEqual(result, '卧推')
})

test('模糊匹配 - 不匹�?, () => {
  const result = fuzzyMatchAction('引体向上', ['卧推', '深蹲', '硬拉'])
  assert.strictEqual(result, null)
})

// 测试总结
console.log('\n=== 测试总结 ===')
console.log(`通过: ${passed}`)
console.log(`失败: ${failed}`)
console.log(`总计: ${passed + failed}`)

if (failed > 0) {
  console.log('\n�?有测试失�?')
  process.exit(1)
} else {
  console.log('\n�?所有测试通过!')
  process.exit(0)
}



