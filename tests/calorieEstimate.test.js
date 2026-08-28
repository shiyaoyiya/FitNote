import assert from 'assert'
import { calcKcalPerMin, calcSessionKcal, estimateAvgHr } from '../utils/calorieEstimate.js'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++ }
  catch (e) { console.log(`✗ ${name}\n  ${e.message}`); failed++ }
}

const male = { gender: 'male', age: 30, weight: 75 }
const female = { gender: 'female', age: 25, weight: 60 }

test('男性 142bpm 每分钟消耗为正且合理(8-14)', () => {
  const k = calcKcalPerMin(142, male)
  assert.ok(k > 8 && k < 14, `got ${k}`)
})

test('女性消耗低于同心率男性(总体更低)', () => {
  const km = calcKcalPerMin(150, male)
  const kf = calcKcalPerMin(150, female)
  assert.ok(kf < km)
})

test('心率 0 或负 截断为 0', () => {
  assert.strictEqual(calcKcalPerMin(0, male), 0)
  assert.strictEqual(calcKcalPerMin(-5, male), 0)
})

test('档案缺失返回 0', () => {
  assert.strictEqual(calcKcalPerMin(142, null), 0)
  assert.strictEqual(calcKcalPerMin(142, {}), 0)
})

test('calcSessionKcal 按采样累计', () => {
  const samples = [{ hr: 140, durMin: 10 }, { hr: 150, durMin: 20 }]
  const total = calcSessionKcal(samples, male)
  const expected = calcKcalPerMin(140, male) * 10 + calcKcalPerMin(150, male) * 20
  assert.ok(Math.abs(total - expected) < 0.001)
})

test('estimateAvgHr 按时长加权平均', () => {
  const avg = estimateAvgHr([{ hr: 140, durMin: 10 }, { hr: 160, durMin: 10 }])
  assert.strictEqual(avg, 150)
})

test('calcSessionKcal 忽略无效心率采样', () => {
  const total = calcSessionKcal([{ hr: 0, durMin: 5 }, { hr: 150, durMin: 10 }], male)
  assert.ok(total > 0)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
