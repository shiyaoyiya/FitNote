import assert from 'assert'
import { getZones, getZone } from '../utils/heartRateZones.js'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++ }
  catch (e) { console.log(`✗ ${name}\n  ${e.message}`); failed++ }
}

test('getZones 返回 5 档，顺序与颜色正确', () => {
  const zones = getZones(30) // age 30 → maxHR 190
  assert.strictEqual(zones.length, 5)
  assert.strictEqual(zones[0].label, '热身')
  assert.strictEqual(zones[0].color, '#3b82f6')
  assert.strictEqual(zones[4].label, '极限')
  assert.strictEqual(zones[4].color, '#ef4444')
})

test('getZone 在无氧档(80-90%) 返回橙色无氧', () => {
  // maxHR 190, 无氧 152-171
  const z = getZone(160, 30)
  assert.strictEqual(z.label, '无氧')
  assert.strictEqual(z.color, '#f97316')
  assert.strictEqual(z.index, 3)
})

test('getZone 低于 50% 返回 null（静息）', () => {
  assert.strictEqual(getZone(80, 30), null)
})

test('getZone 超过 100% 钳制到极限档', () => {
  const z = getZone(200, 30)
  assert.strictEqual(z.label, '极限')
})

test('getZones 各档 min/max 基于年龄正确', () => {
  const zones = getZones(40) // maxHR 180
  assert.strictEqual(zones[2].max, 144) // 有氧 70-80% → 144
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
