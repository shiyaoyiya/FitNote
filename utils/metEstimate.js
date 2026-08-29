export const MET_PRESETS = {
  walking_slow: { name: '慢走', met: 2.8 },
  walking_fast: { name: '快走', met: 4.8 },
  running: { name: '跑步', met: 9.3 },
  jumping_rope: { name: '跳绳', met: 11.8 },
  cycling: { name: '骑行', met: 6.8 },
  swimming: { name: '游泳', met: 8.0 },
  aerobics: { name: '健身操', met: 6.0 },
  yoga: { name: '瑜伽', met: 3.0 },
  strength_training: { name: '力量训练', met: 5.0 },
  custom: { name: '自定义', met: 1.0 }
}

export function getMetPreset(activityType) {
  return MET_PRESETS[activityType] || MET_PRESETS.custom
}

export function calcMetCalories(met, weightKg, durationMin) {
  const durationHours = durationMin / 60
  return Math.round(met * weightKg * durationHours)
}

export function calcNetCalories(met, weightKg, durationMin) {
  const durationHours = durationMin / 60
  return Math.round((met - 1) * weightKg * durationHours)
}

export function estimateMetFromHr(hr, age) {
  const maxHr = 220 - age
  const hrPercent = hr / maxHr
  
  if (hrPercent < 0.6) {
    return 2.0 // 低强度
  } else if (hrPercent < 0.8) {
    return 4.0 // 中等强度
  } else {
    return 7.0 // 大强度
  }
}