// stores/template.js
import {
  defineStore
} from 'pinia'

const STORAGE_KEY = 'fitness_templates'
const DAYDATA_PREFIX = 'fitness_daydata_'

export const useTemplateStore = defineStore('template', {
  state: () => ({
    templates: []
  }),

  actions: {
    /** 从本地读取所有模板 */
    load() {
      const arr = uni.getStorageSync(STORAGE_KEY) || []
      this.templates = Array.isArray(arr) ? arr : []
    },

    /** 保存当前所有模板到本地 */
    save() {
      uni.setStorageSync(STORAGE_KEY, this.templates)
    },

    /** 新增一个空模板（只设名称） */
    addTemplate(name) {
      if (name && !this.templates.find(t => t.name === name)) {
        this.templates.push({
          name,
          actions: [],
          color: '',
          customColors: []
        })
        this.save()
      }
    },

    /** 删除某个模板（按名） */
    removeTemplate(name) {
      this.templates = this.templates.filter(t => t.name !== name)
      this.save()
    },

    /**
     * 重命名模板，并迁移所有 dayData 中对旧名的引用
     * @param {string} oldName 
     * @param {string} newName 
     */
    rename(oldName, newName) {
      if (!newName || oldName === newName) return
      // 修改列表
      const tpl = this.templates.find(t => t.name === oldName)
      if (tpl) tpl.name = newName

      // 遍历 dayData，迁移 key
      const info = uni.getStorageInfoSync()
      info.keys.forEach(key => {
        if (!key.startsWith(DAYDATA_PREFIX)) return
        const dd = uni.getStorageSync(key) || {}
        if (dd.templates?.[oldName]) {
          dd.templates[newName] = dd.templates[oldName]
          delete dd.templates[oldName]
          uni.setStorageSync(key, dd)
        }
      })

      this.save()
    },
    /**
     * 检查一个模板是否在任何“日数据”中被引用
     * @param {string} templateName
     * @returns {boolean}
     */
    isUsed(templateName) {
      const info = uni.getStorageInfoSync()
      return info.keys.some(key => {
        if (!key.startsWith(DAYDATA_PREFIX)) return false
        const dd = uni.getStorageSync(key) || {}
        return !!(dd.templates && dd.templates[templateName])
      })
    },
    /**
     * 读取某个模板的“详情”副本
     * @param {string} templateName 
     * @returns {{ actions: string[], color: string, customColors: {name,value}[] }}
     */
    loadTemplateDetail(templateName) {
      const tpl = this.templates.find(t => t.name === templateName)
      return {
        actions: tpl?.actions.slice() || [],
        color: tpl?.color || '',
        customColors: tpl?.customColors?.slice() || []
      }
    },

    /** 在模板动作列表尾部添加一个动作 */
    addAction(templateName, actionName) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (tpl && actionName && !tpl.actions.includes(actionName)) {
        tpl.actions.push(actionName)
        this.save()
      }
    },

    /** 从模板中删除指定下标的动作 */
    removeAction(templateName, idx) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (tpl && tpl.actions[idx] != null) {
        tpl.actions.splice(idx, 1)
        this.save()
      }
    },

    /** 交换模板中两个动作的位置 */
    moveAction(templateName, fromIndex, toIndex) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (!tpl) return
      const a = tpl.actions
      if (
        fromIndex < 0 || fromIndex >= a.length ||
        toIndex < 0 || toIndex >= a.length
      ) return
      const tmp = a[fromIndex]
      a[fromIndex] = a[toIndex]
      a[toIndex] = tmp
      this.save()
    },

    /** 设置模板主配色 */
    setColor(templateName, colorValue) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (tpl) {
        tpl.color = colorValue
        this.save()
      }
    },

    /** 清空模板主配色 */
    clearColor(templateName) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (tpl) {
        tpl.color = ''
        this.save()
      }
    },

    /** 添加一个自定义色（去重） */
    addCustomColor(templateName, name, value) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (!tpl) return
      tpl.customColors = tpl.customColors || []
      const exists = tpl.customColors.some(c => c.value.toLowerCase() === value.toLowerCase())
      if (!exists) {
        tpl.customColors.unshift({
          name,
          value
        })
        this.save()
      }
    },

    /** 删除自定义色 */
    removeCustomColor(templateName, idx) {
      const tpl = this.templates.find(t => t.name === templateName)
      if (tpl?.customColors && tpl.customColors[idx]) {
        tpl.customColors.splice(idx, 1)
        this.save()
      }
    }
  }
})