// stores/dayDataCache.js
import {
  defineStore
} from 'pinia'

const DAYDATA_PREFIX = 'fitness_daydata_'
const INDEX_KEY = 'fitness_index'

export const useDayDataCacheStore = defineStore('dayDataCache', {
  state: () => ({
    // 缓存结构：Map<dateStr, dayData>
    cache: new Map(),
    // 日期索引：Set<dateStr>，记录所有有数据的日期
    dateIndex: new Set(),
    // 排序后的日期索引（降序），避免每次查询都排序
    sortedDates: [],
    // 索引是否已加载
    indexLoaded: false,
    // 已预加载的年月范围
    preloadedMonths: new Set(),
    // 月份概览缓存：Map<"year-month", { days: array, hasData: boolean }>
    monthCache: new Map(),
    // 周统计缓存：Map<"year-Www", number>
    weekStatsCache: new Map(),
    // 最大缓存条目数（防止内存溢出）
    MAX_CACHE_SIZE: 500,
    // 缓存淘汰时的保留数量
    CACHE_TRIM_SIZE: 100,
    // 数据版本号，每次 saveDayData 递增，用于触发 computed 重算
    cacheVersion: 0
  }),

  getters: {
    // 获取所有已缓存的日期
    cachedDates(state) {
      return Array.from(state.cache.keys())
    },

    // 获取所有有数据的日期（来自索引）
    indexedDates(state) {
      return Array.from(state.dateIndex)
    }
  },

  actions: {
    // ========== 核心 API ==========

    // 获取单个日期的数据（优先从缓存获取）
    getDayData(dateStr) {
      if (this.cache.has(dateStr)) {
        return this.cache.get(dateStr)
      }
      // 缓存中没有，从 storage 读取
      try {
        const key = DAYDATA_PREFIX + dateStr
        const dayData = uni.getStorageSync(key)
        this.cache.set(dateStr, dayData || {})
        this.trimCacheAsync()
        return dayData || {}
      } catch (e) {
        console.error(`读取日期数据失败: ${dateStr}`, e)
        return {}
      }
    },

    // 批量查询多个动作的最近一次训练记录
    batchGetLatestRecords(actNames, todayDateStr) {
      const results = {}
      const remaining = new Set(actNames)
      for (const dateStr of this.sortedDates) {
        if (dateStr === todayDateStr) continue
        if (remaining.size === 0) break
        let data
        if (this.cache.has(dateStr)) {
          data = this.cache.get(dateStr)
        } else {
          try { data = uni.getStorageSync(DAYDATA_PREFIX + dateStr) } catch (e) { continue }
        }
        if (!data || !data.entries) continue
        for (const actName of remaining) {
          if (data.entries[actName] && data.entries[actName].length > 0) {
            const entries = data.entries[actName]
            const computedTotal = entries.reduce((sum, e) => sum + (e.total || 0), 0)
            if (computedTotal <= 0) continue
            results[actName] = {
              date: dateStr,
              total: data.actions?.[actName] != null ? data.actions[actName] : Math.round(computedTotal * 100) / 100,
              entry: entries,
            }
            remaining.delete(actName)
          }
        }
      }
      return results
    },

    // 保存单个日期的数据（同时更新缓存和 storage）
    saveDayData(dateStr, dayData) {
      this.cache.set(dateStr, dayData)
      try {
        uni.setStorageSync(DAYDATA_PREFIX + dateStr, dayData)
      } catch (e) {
        console.error(`保存日期数据失败: ${dateStr}`, e)
      }
      this.cacheVersion++
      // 判断是否有实际活动数据
      const hasActivityData = this.checkHasActivity(dayData)
      if (hasActivityData) {
        this.dateIndex.add(dateStr)
        this.saveIndex()
      } else {
        // 如果没有活动数据但索引中有，需要移除
        if (this.dateIndex.has(dateStr)) {
          this.dateIndex.delete(dateStr)
          this.saveIndex()
        }
      }
      // 保持 sortedDates 同步
      this.sortedDates = Array.from(this.dateIndex).sort((a, b) => b.localeCompare(a))
      // 清除相关的周统计缓存
      this.clearRelatedWeekStatsCache(dateStr)
      // 清除相关月份缓存（确保月份视图能显示最新数据）
      const [year, month] = dateStr.split('-').map(Number)
      this.clearMonthCache(year, month)
      // trimCache 会在后台运行
      this.trimCacheAsync()
    },

    // 检查是否有实际活动数据
    checkHasActivity(dayData) {
      if (!dayData || typeof dayData !== 'object') {
        return false
      }
      // 如果是休息日，返回false
      if (dayData.isRestDay) {
        return false
      }
      // 检查templates是否有有效内容
      if (dayData.templates && typeof dayData.templates === 'object') {
        const templateKeys = Object.keys(dayData.templates)
        if (templateKeys.length > 0) {
          // 检查至少有一个模板有实际内容
          for (const tplName of templateKeys) {
            const tpl = dayData.templates[tplName]
            if (tpl && typeof tpl === 'object' && Object.keys(tpl).length > 0) {
              // 检查actionWeights是否有实际数据
              if (tpl.actionWeights && typeof tpl.actionWeights === 'object') {
                const actionKeys = Object.keys(tpl.actionWeights)
                // 至少有一个动作有数据（weight > 0）
                for (const actionName of actionKeys) {
                  if (tpl.actionWeights[actionName] > 0) {
                    return true
                  }
                }
              }
              // 或者检查totalWeight
              if (tpl.totalWeight && tpl.totalWeight > 0) {
                return true
              }
            }
          }
        }
      }
      return false
    },

    // 更新单个日期的数据（合并式更新）
    updateDayData(dateStr, updates) {
      const dayData = this.getDayData(dateStr)
      const updated = { ...dayData, ...updates }
      this.saveDayData(dateStr, updated)
      return updated
    },

    // ========== 索引管理 ==========

    // 快速判断某天是否有数据
    hasData(dateStr) {
      if (!this.dateIndex.has(dateStr)) return false
      if (this.cache.has(dateStr)) {
        const data = this.cache.get(dateStr)
        return !data.isRestDay && Object.keys(data.templates || {}).length > 0
      }
      // 不在缓存中但 index 有 → 可能有数据，返回 true
      return true
    },

    // 获取所有有数据的日期
    getDates() {
      return Array.from(this.dateIndex)
    },

    // 设置日期索引
    setIndex(dates) {
      this.dateIndex = new Set(dates)
      this.sortedDates = dates.slice().sort((a, b) => b.localeCompare(a))
      this.indexLoaded = true
    },

    // 构建索引（扫描 storage）
    buildIndex() {
      try {
        const info = uni.getStorageInfoSync()
        const allKeys = Array.isArray(info.keys) ? info.keys : []
        const dates = []

        allKeys.forEach(key => {
          if (key.startsWith(DAYDATA_PREFIX)) {
            const dateStr = key.slice(DAYDATA_PREFIX.length)
            if (dateStr) {
              dates.push(dateStr)
            }
          }
        })

        this.setIndex(dates)
        this.saveIndex()
        return dates
      } catch (error) {
        console.error('Failed to build index:', error)
        return []
      }
    },

    // 保存索引到 storage
    saveIndex() {
      try {
        const data = {
          version: 1,
          dates: Array.from(this.dateIndex),
          updatedAt: Date.now()
        }
        uni.setStorageSync(INDEX_KEY, data)
      } catch (error) {
        console.error('Failed to save index:', error)
      }
    },

    // 获取最早有数据的年份
    getEarliestYear() {
      if (this.dateIndex.size === 0) {
        return new Date().getFullYear()
      }
      const dates = Array.from(this.dateIndex)
      dates.sort()
      const earliestDate = dates[0]
      return parseInt(earliestDate.split('-')[0], 10)
    },

    // 获取所有有数据的年份列表
    getYearsWithData() {
      if (this.dateIndex.size === 0) {
        return [new Date().getFullYear()]
      }
      const years = new Set()
      for (const dateStr of this.dateIndex) {
        const year = parseInt(dateStr.split('-')[0], 10)
        years.add(year)
      }
      return Array.from(years).sort((a, b) => b - a) // 从大到小排序
    },

    // 从 storage 加载索引
    loadIndex(force = false) {
      if (this.indexLoaded && !force) {
        return
      }
      try {
        const data = uni.getStorageSync(INDEX_KEY)
        if (data && data.dates && Array.isArray(data.dates)) {
          this.setIndex(data.dates)
        } else {
          // 索引不存在或格式错误，构建索引
          this.buildIndex()
        }
      } catch (error) {
        // 加载失败，构建索引
        this.buildIndex()
      }
    },

    // 清空缓存
    clearCache() {
      this.cache = new Map()
      console.log('缓存已清空')
    },

    // ========== 增量加载 ==========

    // 预加载指定日期范围的数据（同步）
    preloadDateRange(startDate, endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      let loadedCount = 0

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDateStr(d)
        // 即使缓存中已有数据，也强制重新读取确保数据新鲜
        const key = DAYDATA_PREFIX + dateStr
        const dayData = uni.getStorageSync(key) || {}
        this.cache.set(dateStr, dayData)
        // 如果有数据，更新索引
        if (Object.keys(dayData).length > 0) {
          this.dateIndex.add(dateStr)
          loadedCount++
        }
      }
      console.log(`preloadDateRange: ${startDate} ~ ${endDate}, 加载了 ${loadedCount} 天数据`)
    },

    // 异步预加载某月数据
    preloadMonthsAsync(year, month) {
      const monthKey = `${year}-${month}`
      if (this.preloadedMonths.has(monthKey)) {
        return Promise.resolve()
      }

      return new Promise((resolve) => {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0)

        setTimeout(() => {
          this.preloadDateRange(this.formatDateStr(start), this.formatDateStr(end))
          this.preloadedMonths.add(monthKey)
          resolve()
        }, 0)
      })
    },

    // 异步预加载全年数据
    preloadYearAsync(year) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.preloadYearSync(year)
          resolve()
        }, 0)
      })
    },

    // 同步预加载全年数据
    preloadYearSync(year) {
      console.log(`开始同步预加载 ${year} 年数据`)
      const start = new Date(year, 0, 1)
      const end = new Date(year, 11, 31)
      this.preloadDateRange(this.formatDateStr(start), this.formatDateStr(end))
      console.log(`${year} 年数据预加载完成`)
    },

    // 预加载当前月份及其前后几个月的数据（用于首页）
    preloadAroundMonth(year, month, extraMonths = 1) {
      const start = new Date(year, month - extraMonths, 1)
      const end = new Date(year, month + 1 + extraMonths, 0)
      this.preloadDateRange(this.formatDateStr(start), this.formatDateStr(end))
    },

    // ========== 缓存管理 ==========

    // 异步淘汰过多缓存
    trimCacheAsync() {
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        setTimeout(() => {
          this.trimCache()
        }, 0)
      }
    },

    // 淘汰旧缓存（保留最近的）
    trimCache() {
      if (this.cache.size <= this.CACHE_TRIM_SIZE) {
        return
      }

      // 获取所有日期并排序（最近的在前）
      const sortedDates = Array.from(this.cache.keys())
        .filter(dateStr => this.dateIndex.has(dateStr))
        .sort((a, b) => a < b ? 1 : -1)

      // 保留最近的 CACHE_TRIM_SIZE 条
      const toKeep = new Set(sortedDates.slice(0, this.CACHE_TRIM_SIZE))

      // 删除不在保留列表中的条目
      for (const dateStr of this.cache.keys()) {
        if (!toKeep.has(dateStr)) {
          this.cache.delete(dateStr)
        }
      }
    },

    // 清除缓存
    clearCache() {
      this.cache.clear()
      this.preloadedMonths.clear()
      this.monthCache.clear()
      this.weekStatsCache.clear()
    },

    // 清除月份缓存（数据修改时调用）
    clearMonthCache(year, month) {
      const key = `${year}-${month}`
      this.monthCache.delete(key)
    },

    // 清除周统计缓存（数据修改时调用）
    clearWeekStatsCache(year, weekNumber) {
      const key = `${year}-W${weekNumber}`
      this.weekStatsCache.delete(key)
    },

    // 清除相关的周统计缓存（当某天数据修改时）
    clearRelatedWeekStatsCache(dateStr) {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      // 清除该天所在的周统计
      const weekNumber = this.getWeekNumber(date)
      this.clearWeekStatsCache(year, weekNumber)
    },

    // 清除所有数据（包括索引）
    clearAll() {
      this.clearCache()
      this.dateIndex.clear()
      this.indexLoaded = false
      uni.removeStorageSync(INDEX_KEY)
    },

    // ========== 辅助方法 ==========

    // 格式化日期
    formatDateStr(date) {
      const y = date.getFullYear()
      const m = date.getMonth() + 1
      const d = date.getDate()
      return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`
    },

    // 获取日期所在的周数
    getWeekNumber(date) {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    },

    // 获取某年某周的总重量（用于缓存）
    getWeekStats(year, weekNumber) {
      const key = `${year}-W${weekNumber}`
      if (this.weekStatsCache.has(key)) {
        return this.weekStatsCache.get(key)
      }
      return null
    },

    // 设置某年某周的总重量（用于缓存）
    setWeekStats(year, weekNumber, totalWeight) {
      const key = `${year}-W${weekNumber}`
      this.weekStatsCache.set(key, totalWeight)
    },

    // 获取月份缓存数据
    getMonthCache(year, month) {
      const key = `${year}-${month}`
      return this.monthCache.get(key)
    },

    // 设置月份缓存数据
    setMonthCache(year, month, data) {
      const key = `${year}-${month}`
      this.monthCache.set(key, data)
    }
  }
})
