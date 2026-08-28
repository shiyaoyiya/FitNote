// stores/userProfile.js
// 身体数据档案：年龄/性别/身高/体重，热量估算与心率档位基础

const STORAGE_KEY = 'fitness_user_profile'

function clampValidate(patch) {
  const p = { ...patch }
  if (p.gender !== undefined && !['male', 'female'].includes(p.gender)) {
    throw new Error('gender 必须为 male 或 female')
  }
  if (p.age !== undefined && (p.age < 5 || p.age > 100)) {
    throw new Error('age 必须在 5-100 之间')
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
    age: null,
    height: null,
    weight: null,
    weightHistory: [],
    updatedAt: null,
    ...initial,
  }
  return {
    get state() { return state },
    updateProfile(patch) {
      const valid = clampValidate(patch)
      if (valid.weight !== undefined && valid.weight !== state.weight) {
        state.weightHistory = [...state.weightHistory, { date: new Date().toISOString().slice(0, 10), weight: valid.weight }]
      }
      state = { ...state, ...valid, updatedAt: new Date().toISOString() }
    },
    getMaxHeartRate() {
      return state.age ? 220 - state.age : 0
    },
    isComplete() {
      return !!(state.gender && state.age && state.height && state.weight)
    },
    toProfile() {
      return { gender: state.gender, age: state.age, height: state.height, weight: state.weight }
    },
  }
}

// Pinia 正式 store（运行时用，封装 uni 存储）
import { defineStore } from 'pinia'

export const useUserProfileStore = defineStore('userProfile', {
  state: () => ({
    gender: null,
    age: null,
    height: null,
    weight: null,
    weightHistory: [],
    updatedAt: null,
  }),
  actions: {
    load() {
      try {
        const raw = uni.getStorageSync(STORAGE_KEY)
        if (raw) {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          Object.assign(this, data)
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
        gender: this.gender, age: this.age, height: this.height,
        weight: this.weight, weightHistory: this.weightHistory, updatedAt: this.updatedAt,
      }))
    },
    getMaxHeartRate() {
      return this.age ? 220 - this.age : 0
    },
    isComplete() {
      return !!(this.gender && this.age && this.height && this.weight)
    },
    toProfile() {
      return { gender: this.gender, age: this.age, height: this.height, weight: this.weight }
    },
  },
})
