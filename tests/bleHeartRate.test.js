import { describe, it, expect } from 'vitest'
import { parseHeartRate } from '../utils/bleHeartRate.js'

describe('BLE 心率解析', () => {
  it('uint8 心率解析', () => {
    const buf = new ArrayBuffer(2); const v = new Uint8Array(buf); v[0]=0x00; v[1]=142
    expect(parseHeartRate(buf)).toBe(142)
  })

  it('uint16 心率解析', () => {
    const buf = new ArrayBuffer(3); const v = new Uint8Array(buf); v[0]=0x01; v[1]=200; v[2]=0
    expect(parseHeartRate(buf)).toBe(200)
  })

  it('心率 0 返回 null', () => {
    const buf = new ArrayBuffer(2); const v = new Uint8Array(buf); v[0]=0; v[1]=0
    expect(parseHeartRate(buf)).toBe(null)
  })

  it('心率 >220 返回 null', () => {
    const buf = new ArrayBuffer(2); const v = new Uint8Array(buf); v[0]=0; v[1]=250
    expect(parseHeartRate(buf)).toBe(null)
  })

  it('数据过短返回 null', () => {
    expect(parseHeartRate(new ArrayBuffer(1))).toBe(null)
    expect(parseHeartRate(null)).toBe(null)
  })
})
