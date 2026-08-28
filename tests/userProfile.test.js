import assert from 'assert'
import { useUserInMemoryProfileStore } from '../stores/userProfile.js'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++ }
  catch (e) { console.log(`✗ ${name}\n  ${e.message}`); failed++ }
}

// 与实现同源计算，避免测试依赖固定日期
function ageOf(birthDate) {
  const m = /^(\d{4})-(\d{2})$/.exec(birthDate)
  const by = Number(m[1]), bm = Number(m[2])
  const now = new Date()
  let a = now.getFullYear() - by
  if (now.getMonth() + 1 < bm) a--
  return a
}

test('age getter 从出生年月倒推', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ birthDate: '2000-01' })
  assert.strictEqual(s.age, ageOf('2000-01'))
})

test('getMaxHeartRate = 220 - age(由出生年月倒推)', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ birthDate: '1996-05' })
  assert.strictEqual(s.getMaxHeartRate(), 220 - ageOf('1996-05'))
})

test('birthDate 格式校验', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ birthDate: 'abc' }), /格式/)
})

test('birthDate 年份不合理', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ birthDate: '1899-01' }), /年份/)
  assert.throws(() => s.updateProfile({ birthDate: '3000-01' }), /年份/)
})

test('birthDate 月份校验', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ birthDate: '2000-13' }), /月份/)
  assert.throws(() => s.updateProfile({ birthDate: '2000-00' }), /月份/)
})

test('gender 校验', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ gender: 'x' }), /gender/)
})

test('weight 越界校验', () => {
  const s = useUserInMemoryProfileStore()
  assert.throws(() => s.updateProfile({ weight: 5 }), /weight/)
})

test('isComplete 用 birthDate', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ gender: 'male', birthDate: '1996-05', height: 175, weight: 75 })
  assert.strictEqual(s.isComplete(), true)
})

test('档案缺失 isComplete=false', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ birthDate: '1996-05' })
  assert.strictEqual(s.isComplete(), false)
})

test('toProfile 返回倒推 age', () => {
  const s = useUserInMemoryProfileStore()
  s.updateProfile({ gender: 'male', birthDate: '1996-05', height: 175, weight: 75 })
  const p = s.toProfile()
  assert.strictEqual(p.age, ageOf('1996-05'))
  assert.strictEqual(p.gender, 'male')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
