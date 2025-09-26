// stores/settings.js
import {
  defineStore
} from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: false, // 当前是否深色
  }),
  actions: {
    load() {
      const dm = uni.getStorageSync('darkMode')
      if (dm === 'auto') {
        const sys = uni.getSystemInfoSync().theme || 'light'
        this.darkMode = sys === 'dark'
      } else {
        this.darkMode = dm === true
      }
    },
    toggle() {
      // 切换循环 three-state: dark<->light<->auto
      const dm = uni.getStorageSync('darkMode')
      if (dm === 'auto') {
        this.darkMode = !this.darkMode
        uni.setStorageSync('darkMode', this.darkMode)
      } else {
        uni.setStorageSync('darkMode', 'auto')
        const sys = uni.getSystemInfoSync().theme || 'light'
        this.darkMode = sys === 'dark'
      }
    },
    persist() {
      uni.setStorageSync('darkMode', this.darkMode)
    }
  }
})