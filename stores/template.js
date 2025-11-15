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
      const arr = uni.getStorageSync('fitness_templates')
      this.templates = Array.isArray(arr) ? arr : []
      // 兼容老数据：如果模板没有 id，则给它补 id
      let patched = false
      this.templates = this.templates.map(t => {
        if (!t.id) {
          patched = true
          return {
            id: String(Date.now()) + Math.random().toString(36).slice(2),
            ...t
          }
        }
        return t
      })
      if (patched) this.save()
    },
    save() {
      uni.setStorageSync('fitness_templates', this.templates)
    },
    // 添加模板：生成唯一 id
    addTemplate(name) {
      if (!name) return
      if (this.templates.find(t => t.name === name)) return
      this.templates.push({
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        name,
        actions: [],
        color: '',
        customColors: []
      })
      this.save()
    },
    // 通过 id 更新名字（不触碰 dayData）
    renameTemplate(id, newName) {
      const tpl = this.templates.find(t => t.id === id)
      if (!tpl) return
      tpl.name = newName
      this.save()
    },
    updateTemplate(id, payload) {
      const tpl = this.templates.find(t => t.id === id)
      if (!tpl) return
      Object.assign(tpl, payload)
      this.save()
    },
    removeTemplate(id) {
      const idx = this.templates.findIndex(t => t.id === id)
      if (idx !== -1) {
        this.templates.splice(idx, 1)
        this.save()
      }
    },
    // small helper: find by name
    findByName(name) {
      return this.templates.find(t => t.name === name)
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