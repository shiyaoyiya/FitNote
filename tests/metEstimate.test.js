import { describe, it, expect } from 'vitest'
import { calcMetCalories, calcNetCalories, estimateMetFromHr, getMetPreset, MET_PRESETS } from '../utils/metEstimate.js'

describe('MET公式热量计算', () => {
  it('计算总消耗', () => {
    // 70kg, MET 6.0, 30分钟 (0.5小时)
    const total = calcMetCalories(6.0, 70, 30)
    expect(total).toBe(210) // 6.0 × 70 × 0.5 = 210
  })

  it('计算净消耗', () => {
    const net = calcNetCalories(6.0, 70, 30)
    expect(net).toBe(175) // (6.0-1) × 70 × 0.5 = 175
  })

  it('根据心率估算MET值', () => {
    const age = 30
    const maxHr = 220 - age // 190
    // 低强度: 心率 < 60% 最大心率
    expect(estimateMetFromHr(100, age)).toBe(2.0)
    // 中等强度: 心率 60-80% 最大心率
    expect(estimateMetFromHr(140, age)).toBe(4.0)
    // 大强度: 心率 > 80% 最大心率
    expect(estimateMetFromHr(170, age)).toBe(7.0)
  })

  it('获取预设MET值', () => {
    expect(getMetPreset('running').met).toBe(9.3)
    expect(getMetPreset('cycling').met).toBe(6.8)
    expect(getMetPreset('unknown').met).toBe(1.0)
  })

  it('负数输入返回0', () => {
    expect(calcMetCalories(-1, 70, 30)).toBe(0)
    expect(calcMetCalories(6.0, -1, 30)).toBe(0)
    expect(calcMetCalories(6.0, 70, -1)).toBe(0)
    expect(calcNetCalories(-1, 70, 30)).toBe(0)
    expect(calcNetCalories(6.0, -1, 30)).toBe(0)
    expect(calcNetCalories(6.0, 70, -1)).toBe(0)
  })

  it('零值输入返回0', () => {
    expect(calcMetCalories(0, 70, 30)).toBe(0)
    expect(calcMetCalories(6.0, 0, 30)).toBe(0)
    expect(calcMetCalories(6.0, 70, 0)).toBe(0)
    expect(calcNetCalories(0, 70, 30)).toBe(0)
    expect(calcNetCalories(6.0, 0, 30)).toBe(0)
    expect(calcNetCalories(6.0, 70, 0)).toBe(0)
  })

  it('大数值正常计算', () => {
    const result = calcMetCalories(10, 100, 60)
    expect(result).toBe(1000)
  })

  it('心率为0返回默认MET', () => {
    expect(estimateMetFromHr(0, 30)).toBe(2.0)
  })

  it('心率为负数返回默认MET', () => {
    expect(estimateMetFromHr(-1, 30)).toBe(2.0)
  })

  it('年龄为0返回默认MET', () => {
    expect(estimateMetFromHr(100, 0)).toBe(2.0)
  })

  it('年龄超过120返回默认MET', () => {
    expect(estimateMetFromHr(100, 130)).toBe(2.0)
  })

  it('心率超过最大心率仍返回高强度', () => {
    expect(estimateMetFromHr(220, 30)).toBe(7.0)
  })
})