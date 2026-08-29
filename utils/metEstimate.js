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

/**
 * 计算MET公式总消耗热量
 * @param {number} met - 代谢当量 (MET值, 须 >= 0)
 * @param {number} weightKg - 体重 (公斤)
 * @param {number} durationMin - 运动时长 (分钟)
 * @returns {number} 总消耗热量 (kcal)
 */
export function calcMetCalories(met, weightKg, durationMin) {
  if (met < 0 || weightKg <= 0 || durationMin <= 0) {
    return 0
  }
  const durationHours = durationMin / 60
  return Math.round(met * weightKg * durationHours)
}

/**
 * 计算净消耗热量 (扣除基础代谢)
 * @param {number} met - 代谢当量 (MET值, 须 > 1)
 * @param {number} weightKg - 体重 (公斤)
 * @param {number} durationMin - 运动时长 (分钟)
 * @returns {number} 净消耗热量 (kcal)
 */
export function calcNetCalories(met, weightKg, durationMin) {
  if (met <= 0 || weightKg <= 0 || durationMin <= 0) {
    return 0
  }
  const durationHours = durationMin / 60
  return Math.round((met - 1) * weightKg * durationHours)
}

/**
 * 根据心率估算MET值
 * @param {number} hr - 当前心率 (bpm)
 * @param {number} age - 年龄 (岁)
 * @returns {number} 估算的MET值 (2.0=低强度, 4.0=中等, 7.0=高强度)
 */
export function estimateMetFromHr(hr, age) {
  if (hr <= 0 || age <= 0 || age > 120) {
    return 2.0
  }
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