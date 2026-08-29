import assert from 'assert'
import { calcMetCalories, calcNetCalories, estimateMetFromHr, getMetPreset, MET_PRESETS } from '../utils/metEstimate.js'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++ }
  catch (e) { console.log(`✗ ${name}\n  ${e.message}`); failed++ }
}

test('计算总消耗', () => {
  // 70kg, MET 6.0, 30分钟 (0.5小时)
  const total = calcMetCalories(6.0, 70, 30)
  assert.strictEqual(total, 210) // 6.0 × 70 × 0.5 = 210
})

test('计算净消耗', () => {
  const net = calcNetCalories(6.0, 70, 30)
  assert.strictEqual(net, 175) // (6.0-1) × 70 × 0.5 = 175
})

test('根据心率估算MET值', () => {
  const age = 30
  const maxHr = 220 - age // 190
  // 低强度: 心率 < 60% 最大心率
  assert.strictEqual(estimateMetFromHr(100, age), 2.0)
  // 中等强度: 心率 60-80% 最大心率
  assert.strictEqual(estimateMetFromHr(140, age), 4.0)
  // 大强度: 心率 > 80% 最大心率
  assert.strictEqual(estimateMetFromHr(170, age), 7.0)
})

test('获取预设MET值', () => {
  assert.strictEqual(getMetPreset('running').met, 9.3)
  assert.strictEqual(getMetPreset('cycling').met, 6.8)
  assert.strictEqual(getMetPreset('unknown').met, 1.0)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)