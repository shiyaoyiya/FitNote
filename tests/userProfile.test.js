import assert from 'assert'
import { useUserInMemoryProfileStore } from '../stores/userProfile.js'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++ }
  catch (e) { console.log(`✗ ${name}\n  ${e.message}`); failed++ }
}

test('getMaxHeartRate = 220 - age', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ age: 30 })
  assert.strictEqual(s.getMaxHeartRate(), 190)
})

test('updateProfile 校验 age 越界拒绝', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ age: 200 }), /age/)
})

test('updateProfile 校验 weight 越界拒绝', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ weight: 5 }), /weight/)
})

test('gender 只接受 male/female', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ gender: 'x' }), /gender/)
})

test('档案完整时 isComplete=true', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ gender: 'male', age: 30, height: 175, weight: 75 })
  assert.strictEqual(s.isComplete(), true)
})

test('档案缺失时 isComplete=false', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ age: 30 })
  assert.strictEqual(s.isComplete(), false)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
