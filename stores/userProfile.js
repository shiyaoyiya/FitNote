// stores/userProfile.js
// 身体数据档案：性别/出生年月/身高/体重，热量估算与心率档位基础
// age 由出生年月实时倒推（getter），避免固定年龄不随时间更新

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
  return p
}

// 纯逻辑工厂（无 uni 依赖，便于单测）
export function useUserInMemoryProfileStore(initial = {}) {
  let state = {
    gender: null,
    birthDate: null,
    height: null,
    weight: null,
    weightHistory: [],
    updatedAt: null,
    ...initial,
  }
  return {
    get state() { return state },
    get age() { return computeAge(state.birthDate) },
    updateProfile(patch) {
      const valid = clampValidate(patch)
      if (valid.weight !== undefined && valid.weight !== state.weight) {
        state.weightHistory = [...state.weightHistory, { date: new Date().toISOString().slice(0, 10), weight: valid.weight }]
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
    weightHistory: [],
    updatedAt: null,
  }),
  getters: {
    // age 由出生年月实时倒推
    age: (state) => computeAge(state.birthDate),
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
          if (data.weightHistory !== undefined) this.weightHistory = data.weightHistory
          if (data.updatedAt !== undefined) this.updatedAt = data.updatedAt
        }
      } catch (e) { /* 首次无数据 */ }
    },
    updateProfile(patch) {
      const valid = clampValidate(patch)
      if (valid.weight !== undefined && valid.weight !== this.weight) {
        this.weightHistory = [...this.weightHistory, { date: new Date().toISOString().slice(0, 10), weight: valid.weight }]
      }
      Object.assign(this, valid, { updatedAt: new Date().toISOString() })
      this.save()
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        gender: this.gender, birthDate: this.birthDate, height: this.height,
        weight: this.weight, weightHistory: this.weightHistory, updatedAt: this.updatedAt,
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
