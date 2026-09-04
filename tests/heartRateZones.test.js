import { describe, it, expect } from 'vitest'
import { getZones, getZone } from '../utils/heartRateZones.js'

describe('心率区间', () => {
  it('getZones 返回 5 档，顺序与颜色正确', () => {
    const zones = getZones(30) // age 30 → maxHR 190
    expect(zones.length).toBe(5)
    expect(zones[0].label).toBe('热身')
    expect(zones[0].color).toBe('#3b82f6')
    expect(zones[4].label).toBe('极限')
    expect(zones[4].color).toBe('#ef4444')
  })

  it('getZone 在无氧档(80-90%) 返回橙色无氧', () => {
    // maxHR 190, 无氧 152-171
    const z = getZone(160, 30)
    expect(z.label).toBe('无氧')
    expect(z.color).toBe('#f97316')
    expect(z.index).toBe(3)
  })

  it('getZone 低于 50% 返回 null（静息）', () => {
    expect(getZone(80, 30)).toBe(null)
  })

  it('getZone 超过 100% 钳制到极限档', () => {
    const z = getZone(200, 30)
    expect(z.label).toBe('极限')
  })

  it('getZones 各档 min/max 基于年龄正确', () => {
    const zones = getZones(40) // maxHR 180
    expect(zones[2].max).toBe(144) // 有氧 70-80% → 144
  })
})
