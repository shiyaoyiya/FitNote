import { describe, it, expect } from 'vitest'
import { calcKcalPerMin, calcSessionKcal, estimateAvgHr } from '../utils/calorieEstimate.js'

describe('热量估算', () => {
  const male = { gender: 'male', age: 30, weight: 75 }
  const female = { gender: 'female', age: 25, weight: 60 }

  it('男性 142bpm 每分钟消耗为正且合理(8-14)', () => {
    const k = calcKcalPerMin(142, male)
    expect(k > 8 && k < 14).toBe(true)
  })

  it('女性消耗低于同心率男性(总体更低)', () => {
    const km = calcKcalPerMin(150, male)
    const kf = calcKcalPerMin(150, female)
    expect(kf < km).toBe(true)
  })

  it('心率 0 或负 截断为 0', () => {
    expect(calcKcalPerMin(0, male)).toBe(0)
    expect(calcKcalPerMin(-5, male)).toBe(0)
  })

  it('档案缺失返回 0', () => {
    expect(calcKcalPerMin(142, null)).toBe(0)
    expect(calcKcalPerMin(142, {})).toBe(0)
  })

  it('calcSessionKcal 按采样累计', () => {
    const samples = [{ hr: 140, durMin: 10 }, { hr: 150, durMin: 20 }]
    const total = calcSessionKcal(samples, male)
    const expected = calcKcalPerMin(140, male) * 10 + calcKcalPerMin(150, male) * 20
    expect(Math.abs(total - expected) < 0.001).toBe(true)
  })

  it('estimateAvgHr 按时长加权平均', () => {
    const avg = estimateAvgHr([{ hr: 140, durMin: 10 }, { hr: 160, durMin: 10 }])
    expect(avg).toBe(150)
  })

  it('calcSessionKcal 忽略无效心率采样', () => {
    const total = calcSessionKcal([{ hr: 0, durMin: 5 }, { hr: 150, durMin: 10 }], male)
    expect(total > 0).toBe(true)
  })
})
