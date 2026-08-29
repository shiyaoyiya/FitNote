import { describe, it, expect } from 'vitest'
import { calculateHrTrend, getTrendIcon, getTrendColor } from '../utils/heartRateTrend.js'

describe('心率趋势计算', () => {
  it('计算上升趋势', () => {
    const hrHistory = [100, 102, 105, 110, 115, 120, 125, 130]
    const result = calculateHrTrend(hrHistory)
    expect(result.trend).toBe('up')
    expect(result.change).toBeGreaterThan(0)
  })

  it('计算下降趋势', () => {
    const hrHistory = [130, 128, 125, 120, 115, 110, 105, 100]
    const result = calculateHrTrend(hrHistory)
    expect(result.trend).toBe('down')
    expect(result.change).toBeLessThan(0)
  })

  it('计算稳定趋势', () => {
    const hrHistory = [120, 121, 119, 120, 121, 120, 119, 120]
    const result = calculateHrTrend(hrHistory)
    expect(result.trend).toBe('stable')
  })

  it('hrHistory 为 null 时返回稳定', () => {
    const result = calculateHrTrend(null)
    expect(result.trend).toBe('stable')
    expect(result.change).toBe(0)
  })

  it('hrHistory 为空数组时返回稳定', () => {
    const result = calculateHrTrend([])
    expect(result.trend).toBe('stable')
    expect(result.change).toBe(0)
  })

  it('hrHistory 包含非数字元素时返回稳定', () => {
    const result = calculateHrTrend([100, 'abc', 105])
    expect(result.trend).toBe('stable')
    expect(result.change).toBe(0)
  })

  it('hrHistory 包含 NaN 时返回稳定', () => {
    const result = calculateHrTrend([100, NaN, 105])
    expect(result.trend).toBe('stable')
    expect(result.change).toBe(0)
  })

  it('windowSize 为 0 时使用默认值', () => {
    const hrHistory = [100, 102, 105, 110, 115, 120, 125, 130]
    const result = calculateHrTrend(hrHistory, 0)
    expect(result.trend).toBe('up')
  })

  it('windowSize 为负数时使用默认值', () => {
    const hrHistory = [100, 102, 105, 110, 115, 120, 125, 130]
    const result = calculateHrTrend(hrHistory, -3)
    expect(result.trend).toBe('up')
  })

  it('windowSize 大于数组长度时正常计算', () => {
    const hrHistory = [100, 102, 105, 110, 115]
    const result = calculateHrTrend(hrHistory, 10)
    expect(result.trend).toBe('stable')
  })

  it('hrHistory 只有一个元素时返回稳定', () => {
    const result = calculateHrTrend([100])
    expect(result.trend).toBe('stable')
    expect(result.change).toBe(0)
  })

  it('windowSize 非整数时使用默认值', () => {
    const hrHistory = [100, 102, 105, 110, 115, 120, 125, 130]
    const result = calculateHrTrend(hrHistory, 2.5)
    expect(result.trend).toBe('up')
  })

  it('获取趋势图标', () => {
    expect(getTrendIcon('up')).toBe('↑')
    expect(getTrendIcon('down')).toBe('↓')
    expect(getTrendIcon('stable')).toBe('→')
  })

  it('获取趋势颜色', () => {
    expect(getTrendColor('up')).toBe('#ef4444')
    expect(getTrendColor('down')).toBe('#3b82f6')
    expect(getTrendColor('stable')).toBe('#22c55e')
  })
})