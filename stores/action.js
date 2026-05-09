import { defineStore } from 'pinia'
import { useTemplateStore } from './template.js'
import { getInitialActions, getInitialActionNames } from './initActions.js'

const STORAGE_KEY = 'fitness_actions'
const DAYDATA_PREFIX = 'fitness_daydata_'

// 旧分类到新分类的映射（数据迁移用）
const LEGACY_CATEGORY_MAP = {
  core: 'abs',
  cardio: 'abs',
  other: 'abs',
}

const CATEGORY_KEYWORDS = {
  chest: ['哑铃卧推', '杠铃卧推', '上斜卧推', '下斜卧推', '史密斯卧推', '卧推', '哑铃飞鸟', '龙门架飞鸟', '蝴蝶机夹胸', '夹胸', '飞鸟', '上斜', '下斜', '胸'],
  back: ['引体向上', '引体', '高位下拉', '坐姿划船', '杠铃划船', '哑铃划船', '单臂划船', '划船', '硬拉', '罗马尼亚硬拉', '山羊挺身', '挺身', '下拉', '大剪刀', 'Keslo', '梅多斯', '直臂下压', 'T杠', '背'],
  shoulders: ['哑铃推举', '杠铃推举', '阿诺德推举', '推举', '侧平举', '前平举', '面拉', '直立划船', '耸肩', '实力推', 'Y举', '肩'],
  arms: ['杠铃弯举', '哑铃弯举', '锤式弯举', '牧师凳弯举', '弯举', '臂屈伸', '绳索下压', '三头下压', '锤式', '绳索', '肱二', '肱三', '手臂', '二头', '三头', '窄距卧推', 'JM推举'],
  legs: ['杠铃深蹲', '哑铃深蹲', '高脚杯深蹲', '深蹲', '腿举', '腿弯举', '腿屈伸', '直腿硬拉', '弓箭步', '臀推', '臀桥', '保加利亚', '倒蹬', '提踵', '髋外展', '髋内收', '后踢腿', '腿'],
  abs: ['卷腹', '平板支撑', '平板', '举腿', '悬垂举腿', '俄罗斯转体', '俄罗斯', '核心', '腹', '仰卧', '两头起', '龙门架卷腹'],
}

const CATEGORY_NAMES = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  arms: '手臂',
  legs: '腿部',
  abs: '腹部',
}

const SUBCATEGORIES = {
  chest: [
    { id: 'upper_chest', name: '上胸' },
    { id: 'mid_lower_chest', name: '中下胸' },
  ],
  back: [
    { id: 'teres_major', name: '大圆' },
    { id: 'upper_traps', name: '上斜方' },
    { id: 'mid_lower_traps', name: '中下斜方' },
    { id: 'lats', name: '背阔' },
    { id: 'erector_spinae', name: '竖脊肌' },
  ],
  shoulders: [
    { id: 'front_delt', name: '前束' },
    { id: 'side_delt', name: '中束' },
    { id: 'rear_delt', name: '后束' },
  ],
  arms: [
    { id: 'biceps', name: '二头' },
    { id: 'triceps', name: '三头' },
  ],
  legs: [
    { id: 'quads', name: '股四头' },
    { id: 'hamstrings', name: '腘绳' },
    { id: 'calves', name: '小腿' },
    { id: 'glutes', name: '臀部' },
  ],
}

function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function detectCategoryByName(name) {
  const sortedEntries = Object.entries(CATEGORY_KEYWORDS).map(([cat, kws]) => {
    const sorted = [...kws].sort((a, b) => b.length - a.length)
    return [cat, sorted]
  })
  for (const [category, keywords] of sortedEntries) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) return category
    }
  }
  return 'abs'
}

function getCategoryName(categoryId) {
  return CATEGORY_NAMES[categoryId] || '腹部'
}

function normalizeAction(raw) {
  const id = raw.id || generateId()
  const name = raw.name
  const createdAt = raw.createdAt || new Date().toISOString()

  let categories = raw.categories
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    const oldCat = raw.category || detectCategoryByName(raw.name)
    const mapped = LEGACY_CATEGORY_MAP[oldCat] || oldCat
    categories = [mapped]
  } else {
    categories = categories.map(c => LEGACY_CATEGORY_MAP[c] || c)
  }

  const subcategories = raw.subcategories || {}

  return {
    id,
    name,
    categories,
    subcategories,
    categoryName: getCategoryName(categories[0]),
    createdAt,
    isUnilateral: raw.isUnilateral || false,
  }
}

export const useActionStore = defineStore('action', {
  state: () => ({
    actions: [],
    categories: [
      { id: 'chest', name: '胸部' },
      { id: 'back', name: '背部' },
      { id: 'shoulders', name: '肩部' },
      { id: 'arms', name: '手臂' },
      { id: 'legs', name: '腿部' },
      { id: 'abs', name: '腹部' },
    ],
  }),

  getters: {
    actionNames(state) {
      return state.actions.map(a => a.name)
    },
    actionCount(state) {
      return state.actions.length
    },
    categoryCounts(state) {
      const counts = {}
      state.categories.forEach(c => { counts[c.id] = 0 })
      state.actions.forEach(a => {
        a.categories.forEach(catId => {
          if (counts[catId] !== undefined) counts[catId]++
        })
      })
      return counts
    },
  },

  actions: {
    load() {
      const raw = uni.getStorageSync(STORAGE_KEY) || []
      if (!Array.isArray(raw)) {
        this.actions = []
        return
      }
      if (raw.length > 0 && typeof raw[0] === 'string') {
        this.migrateFromLegacy(raw)
      } else if (raw.length > 0 && typeof raw[0] === 'object') {
        this.actions = raw.map(a => normalizeAction(a))
      } else {
        this.initActions()
      }
    },

    save() {
      uni.setStorageSync(STORAGE_KEY, this.actions)
    },

    addAction(name, categoryIds) {
      if (!name) return
      const exists = this.actions.some(a => a.name === name)
      if (exists) return
      let catIds = categoryIds
      if (!catIds || (Array.isArray(catIds) && catIds.length === 0)) {
        const detected = detectCategoryByName(name)
        catIds = [detected]
      } else if (typeof catIds === 'string') {
        catIds = [catIds]
      }
      this.actions.push({
        id: generateId(),
        name: name,
        categories: catIds,
        subcategories: {},
        categoryName: getCategoryName(catIds[0]),
        createdAt: new Date().toISOString(),
        isUnilateral: false,
      })
      this.save()
    },

    removeActionByIndex(idx) {
      if (idx < 0 || idx >= this.actions.length) return
      this.actions.splice(idx, 1)
      this.save()
    },

    removeActionById(id) {
      const idx = this.actions.findIndex(a => a.id === id)
      if (idx === -1) return
      this.actions.splice(idx, 1)
      this.save()
    },

    updateAction(id, { name, categories, subcategories, isUnilateral }) {
      const action = this.actions.find(a => a.id === id)
      if (!action) return
      if (name && name !== action.name) {
        const oldName = action.name
        action.name = name
        this._renameActionInDayData(oldName, name)
        this._renameActionInTemplates(oldName, name)
      }
      if (categories) {
        const catIds = Array.isArray(categories) ? categories : [categories]
        action.categories = catIds
        action.categoryName = getCategoryName(catIds[0])
      }
      if (subcategories) {
        action.subcategories = subcategories
      }
      if (typeof isUnilateral === 'boolean') {
        action.isUnilateral = isUnilateral
      }
      this.save()
    },

    renameAction(oldName, newName) {
      if (!newName || oldName === newName) return
      const action = this.actions.find(a => a.name === oldName)
      if (action) {
        action.name = newName
        this.save()
      }
      this._renameActionInDayData(oldName, newName)
      this._renameActionInTemplates(oldName, newName)
    },

    _renameActionInDayData(oldName, newName) {
      const info = uni.getStorageInfoSync()
      info.keys.forEach(key => {
        if (!key.startsWith(DAYDATA_PREFIX)) return
        const dd = uni.getStorageSync(key) || {}
        if (dd.entries?.[oldName]) {
          dd.entries[newName] = dd.entries[oldName]
          delete dd.entries[oldName]
        }
        if (dd.actions && dd.actions.hasOwnProperty(oldName)) {
          dd.actions[newName] = dd.actions[oldName]
          delete dd.actions[oldName]
        }
        if (dd.templates) {
          Object.values(dd.templates).forEach(tplObj => {
            if (tplObj.actionWeights?.hasOwnProperty(oldName)) {
              tplObj.actionWeights[newName] = tplObj.actionWeights[oldName]
              delete tplObj.actionWeights[oldName]
            }
            if (Array.isArray(tplObj.actionOrder)) {
              const p = tplObj.actionOrder.indexOf(oldName)
              if (p !== -1) tplObj.actionOrder.splice(p, 1, newName)
            }
          })
        }
        uni.setStorageSync(key, dd)
      })
    },

    _renameActionInTemplates(oldName, newName) {
      const tplStore = useTemplateStore()
      tplStore.load()
      tplStore.templates.forEach(tpl => {
        const p = tpl.actions.indexOf(oldName)
        if (p !== -1) tpl.actions.splice(p, 1, newName)
      })
      tplStore.save()
    },

    migrateFromLegacy(rawArray) {
      this.actions = rawArray.map(name => ({
        id: generateId(),
        name: name,
        categories: [detectCategoryByName(name)],
        subcategories: {},
        categoryName: getCategoryName(detectCategoryByName(name)),
        createdAt: new Date().toISOString(),
        isUnilateral: false,
      }))
      this.save()
    },

    initActions() {
      const initialActions = getInitialActions()
      const existingNames = new Set(this.actions.map(a => a.name))
      const newActions = initialActions.filter(a => !existingNames.has(a.name))
      if (newActions.length > 0) {
        this.actions.push(...newActions)
        this.save()
      }
    },

    getActionsByCategory(categoryId) {
      if (categoryId === 'all') return this.actions
      return this.actions.filter(a => a.categories.includes(categoryId))
    },

    getActionsByCategoryAndSubcategory(categoryId, subcategoryId) {
      return this.actions.filter(a => {
        if (!a.categories.includes(categoryId)) return false
        if (!subcategoryId) return true
        const subs = a.subcategories?.[categoryId]
        return subs && subs.includes(subcategoryId)
      })
    },

    getSubcategories(categoryId) {
      return SUBCATEGORIES[categoryId] || []
    },

    getAllSubcategories() {
      return SUBCATEGORIES
    },

    searchActions(keyword) {
      if (!keyword || !keyword.trim()) return this.actions
      const q = keyword.trim().toLowerCase()
      return this.actions.filter(a => a.name.toLowerCase().includes(q))
    },

    detectCategoryByName(name) {
      return detectCategoryByName(name)
    },

    getActionByName(name) {
      return this.actions.find(a => a.name === name) || null
    },

    getActionById(id) {
      return this.actions.find(a => a.id === id) || null
    },
  },
})
