// src/stores/main.js
import {
  defineStore
} from 'pinia'
import {
  ref,
  reactive
} from 'vue'

export const useMainStore = defineStore('main', () => {
  // —— state —— 
  const templates = ref([]) // 全局模板列表
  const actions = ref([]) // 全局动作列表
  const dayData = reactive({}) // key = 'YYYY-MM-DD'，value = 当天数据对象

  // —— getters —— 
  function getDayData(date) {
    // 返回一个对象引用（保证响应式）
    if (!dayData[date]) dayData[date] = {
      templates: {},
      actions: {},
      entries: {}
    }
    return dayData[date]
  }

  // —— actions —— 
  function loadTemplates() {
    const arr = uni.getStorageSync('fitness_templates')
    templates.value = Array.isArray(arr) ? arr : []
  }

  function saveTemplates() {
    uni.setStorageSync('fitness_templates', templates.value)
  }

  function loadActions() {
    const arr = uni.getStorageSync('fitness_actions')
    actions.value = Array.isArray(arr) ? arr : []
  }

  function saveActions() {
    uni.setStorageSync('fitness_actions', actions.value)
  }

  function loadDayData(date) {
    const raw = uni.getStorageSync('fitness_daydata_' + date)
    dayData[date] = raw && typeof raw === 'object' ? raw : {
      templates: {},
      actions: {},
      entries: {}
    }
  }

  function saveDayData(date) {
    uni.setStorageSync('fitness_daydata_' + date, dayData[date])
  }

  return {
    // state
    templates,
    actions,
    dayData,
    // getters
    getDayData,
    // actions
    loadTemplates,
    saveTemplates,
    loadActions,
    saveActions,
    loadDayData,
    saveDayData
  }
})