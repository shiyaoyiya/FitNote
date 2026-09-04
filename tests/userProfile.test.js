import { describe, it, expect } from 'vitest'
import { useUserInMemoryProfileStore } from '../stores/userProfile.js'

// 与实现同源计算，避免测试依赖固定日期
function ageOf(birthDate) {
  const m = /^(\d{4})-(\d{2})$/.exec(birthDate)
  const by = Number(m[1]), bm = Number(m[2])
  const now = new Date()
  let a = now.getFullYear() - by
  if (now.getMonth() + 1 < bm) a--
  return a
}

describe('用户档案 Store', () => {
  it('age getter 从出生年月倒推', () => {
    const s = useUserInMemoryProfileStore()
    s.updateProfile({ birthDate: '2000-01' })
    expect(s.age).toBe(ageOf('2000-01'))
  })

  it('getMaxHeartRate = 220 - age(由出生年月倒推)', () => {
    const s = useUserInMemoryProfileStore()
    s.updateProfile({ birthDate: '1996-05' })
    expect(s.getMaxHeartRate()).toBe(220 - ageOf('1996-05'))
  })

  it('birthDate 格式校验', () => {
    const s = useUserInMemoryProfileStore()
    expect(() => s.updateProfile({ birthDate: 'abc' })).toThrow(/格式/)
  })

  it('birthDate 年份不合理', () => {
    const s = useUserInMemoryProfileStore()
    expect(() => s.updateProfile({ birthDate: '1899-01' })).toThrow(/年份/)
    expect(() => s.updateProfile({ birthDate: '3000-01' })).toThrow(/年份/)
  })

  it('birthDate 月份校验', () => {
    const s = useUserInMemoryProfileStore()
    expect(() => s.updateProfile({ birthDate: '2000-13' })).toThrow(/月份/)
    expect(() => s.updateProfile({ birthDate: '2000-00' })).toThrow(/月份/)
  })

  it('gender 校验', () => {
    const s = useUserInMemoryProfileStore()
    expect(() => s.updateProfile({ gender: 'x' })).toThrow(/gender/)
  })

  it('weight 越界校验', () => {
    const s = useUserInMemoryProfileStore()
    expect(() => s.updateProfile({ weight: 5 })).toThrow(/weight/)
  })

  it('isComplete 用 birthDate', () => {
    const s = useUserInMemoryProfileStore()
    s.updateProfile({ gender: 'male', birthDate: '1996-05', height: 175, weight: 75 })
    expect(s.isComplete()).toBe(true)
  })

  it('档案缺失 isComplete=false', () => {
    const s = useUserInMemoryProfileStore()
    s.updateProfile({ birthDate: '1996-05' })
    expect(s.isComplete()).toBe(false)
  })

  it('toProfile 返回倒推 age', () => {
    const s = useUserInMemoryProfileStore()
    s.updateProfile({ gender: 'male', birthDate: '1996-05', height: 175, weight: 75 })
    const p = s.toProfile()
    expect(p.age).toBe(ageOf('1996-05'))
    expect(p.gender).toBe('male')
  })
})
