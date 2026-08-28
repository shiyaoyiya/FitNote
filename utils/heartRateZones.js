// utils/heartRateZones.js
// 心率 5 档定义与判定，基于最大心率(220-年龄)

const ZONE_DEFS = [
  { label: '热身', color: '#3b82f6', minPct: 0.50, maxPct: 0.60 },
  { label: '燃脂', color: '#22c55e', minPct: 0.60, maxPct: 0.70 },
  { label: '有氧', color: '#eab308', minPct: 0.70, maxPct: 0.80 },
  { label: '无氧', color: '#f97316', minPct: 0.80, maxPct: 0.90 },
  { label: '极限', color: '#ef4444', minPct: 0.90, maxPct: 1.00 },
]

export function getMaxHeartRate(age) {
  return 220 - age
}

export function getZones(age) {
  const max = getMaxHeartRate(age)
  return ZONE_DEFS.map((z, i) => ({
    index: i,
    label: z.label,
    color: z.color,
    min: Math.round(max * z.minPct),
    max: Math.round(max * z.maxPct),
    minPct: z.minPct,
    maxPct: z.maxPct,
    rangeText: `${Math.round(max * z.minPct)}-${Math.round(max * z.maxPct)}`,
  }))
}

export function getZone(hr, age) {
  if (!hr || hr <= 0) return null
  const max = getMaxHeartRate(age)
  const ratio = hr / max
  if (ratio < ZONE_DEFS[0].minPct) return null // 静息
  if (ratio >= ZONE_DEFS[4].maxPct) {
    return { ...ZONE_DEFS[4], index: 4, min: Math.round(max * 0.90), max: Math.round(max * 1.00), rangeText: `${Math.round(max * 0.90)}-${max}` }
  }
  for (let i = 0; i < ZONE_DEFS.length; i++) {
    const z = ZONE_DEFS[i]
    if (ratio >= z.minPct && ratio < z.maxPct) {
      return { index: i, label: z.label, color: z.color, min: Math.round(max * z.minPct), max: Math.round(max * z.maxPct), rangeText: `${Math.round(max * z.minPct)}-${Math.round(max * z.maxPct)}` }
    }
  }
  return null
}
