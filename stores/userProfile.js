// stores/userProfile.js
// 身体数据档案：性别/出生年月/身高/体重/活动系数，热量估算与心率档位基础
// age 由出生年月实时倒推（getter），避免固定年龄不随时间更新
// TDEE 通过 Mifflin-St Jeor 公式计算基础代谢 × 活动系数

const STORAGE_KEY = 'fitness_user_profile'

// 由出生年月(YYYY-MM)计算当前年龄
function computeAge(birthDate) {
  if (!birthDate) return 0
  const m = /^(\d{4})-(\d{2})$/.exec(birthDate)
  if (!m) return 0
  const by = Number(m[1]), bm = Number(m[2])
  const now = new Date()
  let age = now.getFullYear() - by
  if (now.getMonth() + 1 < bm) age--
  return age > 0 ? age : 0
}

// 当前日期 YYYY-MM-DD
function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Mifflin-St Jeor 基础代谢（kcal/天）
// 男：10×体重(kg) + 6.25×身高(cm) − 5×年龄 + 5
// 女：10×体重(kg) + 6.25×身高(cm) − 5×年龄 − 161
export function calcBMR(gender, weight, height, age) {
  const w = Number(weight)
  const h = Number(height)
  const a = Number(age)
  if (!w || !h || !a || !['male', 'female'].includes(gender)) return null
  const base = 10 * w + 6.25 * h - 5 * a
  return Math.round((gender === 'male' ? base + 5 : base - 161) * 10) / 10
}

// TDEE = BMR × 活动系数
export function calcTDEE(gender, weight, height, age, activityFactor) {
  const bmr = calcBMR(gender, weight, height, age)
  if (bmr === null) return null
  const f = Number(activityFactor)
  if (!f || f < 1 || f > 2.5) return null
  return Math.round(bmr * f)
}

function clampValidate(patch) {
  const p = { ...patch }
  if (p.gender !== undefined && !['male', 'female'].includes(p.gender)) {
    throw new Error('gender 必须为 male 或 female')
  }
  if (p.birthDate !== undefined) {
    const m = /^(\d{4})-(\d{2})$/.exec(p.birthDate)
    if (!m) throw new Error('出生年月格式应为 YYYY-MM')
    const y = Number(m[1]), mo = Number(m[2])
    const curY = new Date().getFullYear()
    if (y < 1900 || y > curY) throw new Error('出生年份不合理')
    if (mo < 1 || mo > 12) throw new Error('出生月份 1-12')
  }
  if (p.height !== undefined && (p.height < 100 || p.height > 250)) {
    throw new Error('height 必须在 100-250 之间')
  }
  if (p.weight !== undefined && (p.weight < 20 || p.weight > 300)) {
    throw new Error('weight 必须在 20-300 之间')
  }
  if (p.activityFactor !== undefined && (p.activityFactor < 1 || p.activityFactor > 2.5)) {
    throw new Error('活动系数必须在 1.0-2.5 之间')
  }
  return p
}

// 记录体重历史：同一天只保留最新一条（x 轴以天为单位，避免同天多点）
function pushWeightHistory(history, weight) {
  const date = todayStr()
  const next = Array.isArray(history) ? history.slice() : []
  const last = next[next.length - 1]
  if (last && last.date === date) {
    next[next.length - 1] = { date, weight }
  } else {
    next.push({ date, weight })
  }
  return next
}

// 纯逻辑工厂（无 uni 依赖，便于单测）
export function useUserInMemoryProfileStore(initial = {}) {
  let state = {
    gender: null,
    birthDate: null,
    height: null,
    weight: null,
    activityFactor: null,
    weightHistory: [],
    updatedAt: null,
    ...initial,
  }
  return {
    get state() { return state },
    get age() { return computeAge(state.birthDate) },
    getBMR() {
      return calcBMR(state.gender, state.weight, state.height, this.age)
    },
    getTDEE() {
      return calcTDEE(state.gender, state.weight, state.height, this.age, state.activityFactor || 1.2)
    },
    updateProfile(patch) {
      const valid = clampValidate(patch)
      if (valid.weight !== undefined && valid.weight !== state.weight) {
        state.weightHistory = pushWeightHistory(state.weightHistory, valid.weight)
      }
      state = { ...state, ...valid, updatedAt: new Date().toISOString() }
    },
    getMaxHeartRate() {
      const a = this.age
      return a ? 220 - a : 0
    },
    isComplete() {
      return !!(state.gender && state.birthDate && state.height && state.weight)
    },
    toProfile() {
      return { gender: state.gender, age: this.age, height: state.height, weight: state.weight }
    },
  }
}

// Pinia 正式 store（运行时用，封装 uni 存储）
import { defineStore } from 'pinia'

export const useUserProfileStore = defineStore('userProfile', {
  state: () => ({
    gender: null,
    birthDate: null,
    height: null,
    weight: null,
    activityFactor: null,
    weightHistory: [],
    updatedAt: null,
  }),
  getters: {
    // age 由出生年月实时倒推
    age: (state) => computeAge(state.birthDate),
    // Mifflin-St Jeor 基础代谢（kcal/天）
    bmr: (state) => calcBMR(state.gender, state.weight, state.height, computeAge(state.birthDate)),
    // TDEE = BMR × 活动系数（未设置活动系数时按 1.2 保守估算）
    tdee: (state) => calcTDEE(state.gender, state.weight, state.height, computeAge(state.birthDate), state.activityFactor || 1.2),
  },
  actions: {
    load() {
      try {
        const raw = uni.getStorageSync(STORAGE_KEY)
        if (raw) {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          // 逐字段赋值，避免 Object.assign 覆盖 getter
          if (data.gender !== undefined) this.gender = data.gender
          if (data.birthDate !== undefined) this.birthDate = data.birthDate
          if (data.height !== undefined) this.height = data.height
          if (data.weight !== undefined) this.weight = data.weight
          if (data.activityFactor !== undefined) this.activityFactor = data.activityFactor
          if (data.weightHistory !== undefined) this.weightHistory = data.weightHistory
          if (data.updatedAt !== undefined) this.updatedAt = data.updatedAt
        }
      } catch (e) { /* 首次无数据 */ }
    },
    updateProfile(patch) {
      const valid = clampValidate(patch)
      if (valid.weight !== undefined && valid.weight !== this.weight) {
        this.weightHistory = pushWeightHistory(this.weightHistory, valid.weight)
      }
      Object.assign(this, valid, { updatedAt: new Date().toISOString() })
      this.save()
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        gender: this.gender, birthDate: this.birthDate, height: this.height,
        weight: this.weight, activityFactor: this.activityFactor,
        weightHistory: this.weightHistory, updatedAt: this.updatedAt,
      }))
    },
    getMaxHeartRate() {
      const a = this.age
      return a ? 220 - a : 0
    },
    isComplete() {
      return !!(this.gender && this.birthDate && this.height && this.weight)
    },
    toProfile() {
      return { gender: this.gender, age: this.age, height: this.height, weight: this.weight }
    },
  },
})
