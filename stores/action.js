// stores/action.js
import {
  defineStore
} from 'pinia'
import {
  useTemplateStore
} from './template.js'

const STORAGE_KEY = 'fitness_actions'
const DAYDATA_PREFIX = 'fitness_daydata_'

export const useActionStore = defineStore('action', {
  state: () => ({
    actions: []
  }),
  actions: {
    load() {
      const arr = uni.getStorageSync(STORAGE_KEY) || []
      this.actions = Array.isArray(arr) ? arr : []
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, this.actions)
    },
    addAction(name) {
      if (!name || this.actions.includes(name)) return
      this.actions.push(name)
      this.save()
    },
    removeActionByIndex(idx) {
      if (idx < 0 || idx >= this.actions.length) return
      this.actions.splice(idx, 1)
      this.save()
    },
    renameAction(oldName, newName) {
      if (!newName || oldName === newName) return

      // 1. 更新动作列表
      const idx = this.actions.indexOf(oldName)
      if (idx !== -1) {
        this.actions.splice(idx, 1, newName)
        this.save()
      }

      // 2. 遍历所有 dayData
      const info = uni.getStorageInfoSync()
      info.keys.forEach(key => {
        if (!key.startsWith(DAYDATA_PREFIX)) return
        const dd = uni.getStorageSync(key) || {}

        // —— 迁移 entries 下的旧名字 —— 
        if (dd.entries?.[oldName]) {
          dd.entries[newName] = dd.entries[oldName]
          delete dd.entries[oldName]
        }

        // —— 迁移 dayData.actions —— 
        if (dd.actions && dd.actions.hasOwnProperty(oldName)) {
          dd.actions[newName] = dd.actions[oldName]
          delete dd.actions[oldName]
        }

        // —— 迁移 templates 里的 actionWeights 和 actionOrder —— 
        if (dd.templates) {
          Object.values(dd.templates).forEach(tplObj => {
            // actionWeights
            if (tplObj.actionWeights?.hasOwnProperty(oldName)) {
              tplObj.actionWeights[newName] = tplObj.actionWeights[oldName]
              delete tplObj.actionWeights[oldName]
            }
            // actionOrder
            if (Array.isArray(tplObj.actionOrder)) {
              const p = tplObj.actionOrder.indexOf(oldName)
              if (p !== -1) tplObj.actionOrder.splice(p, 1, newName)
            }
          })
        }

        uni.setStorageSync(key, dd)
      })

      // 3. 更新全局模板里的动作引用（原来就有）
      const tplStore = useTemplateStore()
      tplStore.load()
      tplStore.templates.forEach(tpl => {
        const p = tpl.actions.indexOf(oldName)
        if (p !== -1) tpl.actions.splice(p, 1, newName)
      })
      tplStore.save()
    },

  }
})