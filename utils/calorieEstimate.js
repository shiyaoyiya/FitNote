// utils/calorieEstimate.js
// Keytel 公式：基于心率估算每分钟热量消耗

// 男 kcal/min = (-55.0969 + 0.6309×HR + 0.1988×age + 0.2017×weight) / 4.184
// 女 kcal/min = (-20.4022 + 0.4472×HR - 0.1263×age + 0.074×weight) / 4.184
export function calcKcalPerMin(hr, profile) {
  if (!profile || !profile.gender || !profile.age || !profile.weight) return 0
  if (!hr || hr <= 0) return 0
  const { age, weight, gender } = profile
  let raw
  if (gender === 'male') {
    raw = (-55.0969 + 0.6309 * hr + 0.1988 * age + 0.2017 * weight) / 4.184
  } else {
    raw = (-20.4022 + 0.4472 * hr - 0.1263 * age + 0.074 * weight) / 4.184
  }
  return raw > 0 ? raw : 0
}

// samples: [{hr, durMin}]，累计总消耗
export function calcSessionKcal(samples, profile) {
  if (!Array.isArray(samples)) return 0
  let total = 0
  for (const s of samples) {
    if (!s.hr || s.hr <= 0 || !s.durMin) continue
    total += calcKcalPerMin(s.hr, profile) * s.durMin
  }
  return total
}

// 按时长加权平均心率
export function estimateAvgHr(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return 0
  let sumW = 0, sumDur = 0
  for (const s of samples) {
    if (!s.hr || s.hr <= 0 || !s.durMin) continue
    sumW += s.hr * s.durMin
    sumDur += s.durMin
  }
  return sumDur > 0 ? Math.round(sumW / sumDur) : 0
}
