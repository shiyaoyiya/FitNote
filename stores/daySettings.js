import { defineStore } from 'pinia'

const SETTINGS_KEY = 'fitness_day_settings'

export const useDaySettingsStore = defineStore('daySettings', {
  state: () => ({
    isDarkMode: true,
    autoStartTimer: false,
    autoFillData: false,
    bubbleFill: true,
    heavyTimerDuration: 180,
    lightTimerDuration: 120,
    todayTrainBtnVisible: true,
    splitPlan: {
      enabled: false,
      mode: 'cycle',
      cycleDays: [
        { template: null, enabled: false },
        { template: null, enabled: false },
        { template: null, enabled: false },
        { template: null, enabled: false },
        { template: null, enabled: false },
        { template: null, enabled: false },
        { template: null, enabled: false },
      ],
      startOffset: 0,
      lastActiveDate: '',
    },
  }),

  actions: {
    load() {
      try {
        const data = uni.getStorageSync(SETTINGS_KEY)
        if (data) {
          if (data.hasOwnProperty('isDarkMode')) this.isDarkMode = !!data.isDarkMode
          this.autoStartTimer = !!data.autoStartTimer
          this.autoFillData = !!data.autoFillData
          if (data.hasOwnProperty('bubbleFill')) this.bubbleFill = !!data.bubbleFill
          if (data.heavyTimerDuration) this.heavyTimerDuration = data.heavyTimerDuration
          if (data.lightTimerDuration) this.lightTimerDuration = data.lightTimerDuration
          if (data.hasOwnProperty('todayTrainBtnVisible')) this.todayTrainBtnVisible = !!data.todayTrainBtnVisible
          if (data.splitPlan) {
            // 兼容旧格式：如果有 weeklyPlan 但没有 cycleDays，转换为新格式
            if (data.splitPlan.weeklyPlan && !data.splitPlan.cycleDays) {
              const cycleDays = []
              for (let i = 1; i <= 7; i++) {
                const day = data.splitPlan.weeklyPlan[i]
                cycleDays.push({
                  template: day ? day.template : null,
                  enabled: day ? !!day.enabled : false,
                })
              }
              this.splitPlan = {
                enabled: !!data.splitPlan.enabled,
                mode: 'cycle',
                cycleDays,
                startOffset: 0,
                lastActiveDate: '',
              }
            } else {
              this.splitPlan = {
                enabled: !!data.splitPlan.enabled,
                mode: data.splitPlan.mode || 'cycle',
                cycleDays: data.splitPlan.cycleDays || this.splitPlan.cycleDays,
                startOffset: data.splitPlan.startOffset || 0,
                lastActiveDate: data.splitPlan.lastActiveDate || '',
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    },

    save() {
      uni.setStorageSync(SETTINGS_KEY, {
        isDarkMode: this.isDarkMode,
        autoStartTimer: this.autoStartTimer,
        autoFillData: this.autoFillData,
        bubbleFill: this.bubbleFill,
        heavyTimerDuration: this.heavyTimerDuration,
        lightTimerDuration: this.lightTimerDuration,
        todayTrainBtnVisible: this.todayTrainBtnVisible,
        splitPlan: this.splitPlan,
      })
    },

    toggleAutoStartTimer() {
      this.autoStartTimer = !this.autoStartTimer
      this.save()
    },

    toggleAutoFillData() {
      this.autoFillData = !this.autoFillData
      this.save()
    },

    toggleBubbleFill() {
      this.bubbleFill = !this.bubbleFill
      this.save()
    },

    toggleTodayTrainBtn() {
      this.todayTrainBtnVisible = !this.todayTrainBtnVisible
      this.save()
    },

    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      this.save()
    },

    setHeavyTimerDuration(seconds) {
      this.heavyTimerDuration = seconds
      this.save()
    },

    setLightTimerDuration(seconds) {
      this.lightTimerDuration = seconds
      this.save()
    },

    toggleSplitPlan() {
      this.splitPlan.enabled = !this.splitPlan.enabled
      this.save()
    },

    saveSplitPlan(cycleDays) {
      this.splitPlan.cycleDays = cycleDays
      this.save()
    },

    /**
     * 确认今天已使用分化计划，记录日期。
     * @param {string} todayDate - 格式 'YYYY-MM-DD'
     */
    advanceCycleOffset(todayDate) {
      if (!this.splitPlan.enabled) return
      if (this.splitPlan.lastActiveDate === todayDate) return
      if (this.splitPlan.cycleDays.length === 0) return

      // 首次使用：记录日期，不推进 offset
      if (!this.splitPlan.lastActiveDate) {
        this.splitPlan.lastActiveDate = todayDate
        this.save()
        return
      }

      // 更新 lastActiveDate，offset 的推进由 getCycleIndex 按天数差自动计算
      this.splitPlan.lastActiveDate = todayDate
      this.save()
    },

    /**
     * 获取今天的循环索引（0-based）
     * 根据最近训练历史推断当前在循环中的位置
     * @param {string} todayDate - 格式 'YYYY-MM-DD'
     * @param {object} dayDataCacheStore - 日数据缓存 store（用于查历史）
     * @returns {number}
     */
    getCycleIndex(todayDate, dayDataCacheStore) {
      const len = this.splitPlan.cycleDays.length
      if (len === 0) return 0

      // 如果有 lastActiveDate，优先用日期差推算
      if (this.splitPlan.lastActiveDate) {
        const last = new Date(this.splitPlan.lastActiveDate.replace(/\./g, '/').replace(/-/g, '/'))
        const today = new Date(todayDate.replace(/\./g, '/').replace(/-/g, '/'))
        const diffDays = Math.round((today - last) / 86400000)
        return ((this.splitPlan.startOffset + diffDays) % len + len) % len
      }

      // 首次使用：扫描最近训练历史推断循环位置
      if (dayDataCacheStore) {
        const offset = this._inferCycleOffset(todayDate, dayDataCacheStore)
        this.splitPlan.startOffset = offset
        this.splitPlan.lastActiveDate = todayDate
        this.save()
        return offset
      }

      return 0
    },

    /**
     * 根据最近训练历史推断循环偏移量
     * 从最近的训练日反推：找到历史中最近一个与循环中某天模板匹配的训练日，
     * 然后计算今天应该在哪一天
     */
    _inferCycleOffset(todayDate, dayDataCacheStore) {
      const cycleDays = this.splitPlan.cycleDays
      const len = cycleDays.length
      if (len === 0) return 0

      const today = new Date(todayDate.replace(/\./g, '/').replace(/-/g, '/'))
      const dates = dayDataCacheStore.sortedDates || []

      // 构建模板名 → 循环索引的映射（只取有模板且启用的天）
      const tplToCycleIdx = {}
      cycleDays.forEach((day, idx) => {
        if (day.enabled && day.template) {
          tplToCycleIdx[day.template] = idx
        }
      })

      // 从最近的日期往前找，找到第一个匹配循环模板的训练日
      for (const dateStr of dates) {
        if (dateStr >= todayDate) continue
        const data = dayDataCacheStore.getDayData(dateStr)
        if (!data || data.isRestDay) continue
        const tplNames = Object.keys(data.templates || {})
        for (const tplName of tplNames) {
          if (tplToCycleIdx.hasOwnProperty(tplName)) {
            const cycleIdx = tplToCycleIdx[tplName]
            const trainDate = new Date(dateStr.replace(/\./g, '/').replace(/-/g, '/'))
            const daysDiff = Math.round((today - trainDate) / 86400000)
            // 今天的位置 = (那天的循环位置 + 间隔天数) % 长度
            return ((cycleIdx + daysDiff) % len + len) % len
          }
        }
      }

      return 0
    },
  },
})
