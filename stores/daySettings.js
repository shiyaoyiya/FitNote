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
    liquidGlassEnabled: false,
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
      weekPlan: [
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
          if (data.hasOwnProperty('liquidGlassEnabled')) this.liquidGlassEnabled = !!data.liquidGlassEnabled
          if (data.splitPlan) {
            const cycleDays = data.splitPlan.cycleDays || []
            const weekPlan = data.splitPlan.weekPlan || [
              { template: null, enabled: false },
              { template: null, enabled: false },
              { template: null, enabled: false },
              { template: null, enabled: false },
              { template: null, enabled: false },
              { template: null, enabled: false },
              { template: null, enabled: false },
            ]
            this.splitPlan = {
              enabled: !!data.splitPlan.enabled,
              mode: data.splitPlan.mode || 'cycle',
              cycleDays,
              weekPlan,
              startOffset: data.splitPlan.startOffset || 0,
              lastActiveDate: data.splitPlan.lastActiveDate || '',
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
        liquidGlassEnabled: this.liquidGlassEnabled,
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

    toggleLiquidGlass() {
      this.liquidGlassEnabled = !this.liquidGlassEnabled
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

    saveSplitPlan(planData) {
      if (typeof planData === 'object' && planData.mode) {
        this.splitPlan.mode = planData.mode
        this.splitPlan.cycleDays = planData.cycleDays
        this.splitPlan.weekPlan = planData.weekPlan
      } else {
        this.splitPlan.mode = 'cycle'
        this.splitPlan.cycleDays = planData
      }
      this.save()
    },

    /**
     * 获取指定日期的周计划
     * @param {string} dateStr - 格式 'YYYY-MM-DD'
     * @returns {object} { template, enabled } 或 null
     */
    getWeekDayPlan(dateStr) {
      if (this.splitPlan.mode !== 'week') return null
      const date = new Date(dateStr.replace(/\./g, '/').replace(/-/g, '/'))
      const weekday = date.getDay()
      const dayIndex = weekday === 0 ? 6 : weekday - 1
      return this.splitPlan.weekPlan[dayIndex] || null
    },

    /**
     * 获取今天的周计划模板名
     * @param {string} dateStr - 格式 'YYYY-MM-DD'
     * @returns {string|null}
     */
    getTodayWeekTemplate(dateStr) {
      const plan = this.getWeekDayPlan(dateStr)
      if (plan && plan.enabled && plan.template) {
        return plan.template
      }
      return null
    },

    /**
     * 确认今天已使用分化计划，记录日期并推进循环偏移。
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

      // 将 startOffset 推进到上一次训练日实际使用的索引位置，
      // 确保下次 getCycleIndex 能正确计算下一轮位置
      const last = new Date(this.splitPlan.lastActiveDate.replace(/\./g, '/').replace(/-/g, '/'))
      const today = new Date(todayDate.replace(/\./g, '/').replace(/-/g, '/'))
      const diffDays = Math.round((today - last) / 86400000)
      const len = this.splitPlan.cycleDays.length
      this.splitPlan.startOffset = ((this.splitPlan.startOffset + diffDays) % len + len) % len
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

      if (dayDataCacheStore) {
        const offset = this._inferCycleOffset(todayDate, dayDataCacheStore)
        this.splitPlan.startOffset = offset
        this.splitPlan.lastActiveDate = todayDate
        this.save()
        return offset
      }

      return this.splitPlan.startOffset || 0
    },

    /**
     * 根据最近训练历史推断循环偏移量
     * 直接扫描近 14 天的训练数据，找到最近一个匹配分化模板的训练日，
     * 然后计算今天在循环中的位置。
     */
    _inferCycleOffset(todayDate, dayDataCacheStore) {
      const cycleDays = this.splitPlan.cycleDays
      const len = cycleDays.length
      if (len === 0) return 0

      const today = new Date(todayDate.replace(/\./g, '/').replace(/-/g, '/'))

      const tplToCycleIdx = {}
      cycleDays.forEach((day, idx) => {
        if (day.enabled && day.template) {
          tplToCycleIdx[day.template] = idx
        }
      })

      for (let i = 1; i <= 14; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${dd}`
        const data = dayDataCacheStore.getDayData(dateStr)
        if (!data || data.isRestDay) continue
        const tplNames = Object.keys(data.templates || {})
        for (const tplName of tplNames) {
          if (tplToCycleIdx.hasOwnProperty(tplName)) {
            return ((tplToCycleIdx[tplName] + i) % len + len) % len
          }
        }
      }

      return 0
    },

    updateSplitPlanTemplateName(oldName, newName) {
      if (this.splitPlan.cycleDays) {
        this.splitPlan.cycleDays.forEach(day => {
          if (day.template === oldName) {
            day.template = newName
          }
        })
      }

      if (this.splitPlan.weekPlan) {
        this.splitPlan.weekPlan.forEach(day => {
          if (day.template === oldName) {
            day.template = newName
          }
        })
      }

      this.save()
    },
  },
})
