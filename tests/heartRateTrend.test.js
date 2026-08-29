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