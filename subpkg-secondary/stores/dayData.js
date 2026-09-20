// stores/dayData.js
import {
  defineStore
} from 'pinia'

const DAYDATA_PREFIX = 'fitness_daydata_'

export const useDayDataStore = defineStore('dayData', {
  state: () => ({
    date: '',
    dayData: {
      templates: {},
      entries: {},
      actions: {}
    }
  }),
  getters: {
    templateNames(state) {
      return Object.keys(state.dayData.templates)
    }
  },
  actions: {
    load(date) {
      this.date = date
      const raw = uni.getStorageSync(DAYDATA_PREFIX + date) || {}
      this.dayData = {
        templates: raw.templates || {},
        entries: raw.entries || {},
        actions: raw.actions || {}
      }
    },
    save() {
      uni.setStorageSync(
        DAYDATA_PREFIX + this.date, {
          ...this.dayData
        }
      )
    },
    chooseTemplate(tpl) {
      // add to templates[] & actionOrder
      const name = tpl.name
      if (!this.dayData.templates[name]) {
        this.dayData.templates[name] = {
          totalWeight: 0,
          actionWeights: {},
          actionOrder: []
        }
        this.save()
      }
    },
    addEntry(actionName, reps, weight) {
      const dd = this.dayData
      // init arrays
      dd.entries[actionName] = dd.entries[actionName] || []
      // push
      const total = reps * weight
      dd.entries[actionName].push({
        input: `${reps}×${weight}`,
        total
      })
      // update actions map
      dd.actions[actionName] = dd.entries[actionName].reduce((s, i) => s + i.total, 0)
      // update template summary
      const tplNames = Object.keys(dd.templates)
      tplNames.forEach(name => {
        const tpl = dd.templates[name]
        tpl.actionWeights[actionName] = dd.actions[actionName]
        tpl.totalWeight = Object.values(tpl.actionWeights).reduce((a, b) => a + b, 0)
        // ensure in order
        if (!tpl.actionOrder.includes(actionName)) {
          tpl.actionOrder.push(actionName)
        }
      })
      this.save()
    },
    removeEntry(actionName, idx) {
      const dd = this.dayData
      dd.entries[actionName].splice(idx, 1)
      // recalc
      dd.actions[actionName] = dd.entries[actionName].reduce((s, i) => s + i.total, 0)
      Object.values(dd.templates).forEach(tpl => {
        tpl.actionWeights[actionName] = dd.actions[actionName]
        tpl.totalWeight = Object.values(tpl.actionWeights).reduce((a, b) => a + b, 0)
        tpl.actionOrder = tpl.actionOrder.filter(n => n !== actionName)
      })
      this.save()
    }
  }
})