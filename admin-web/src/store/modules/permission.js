import { defineStore } from 'pinia'
import router from '@/router'
import ParentView from '@/layouts/ParentView.vue'

const modules = import.meta.glob('../../views/**/*.vue')

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    dynamicAdded: false
  }),
  actions: {
    normalizeComponent(pathStr) {
      if (!pathStr) return undefined
      // data.sql 中 component 统一写 views/xxx/Aaa.vue；glob key 的形式是 ../../views/xxx/Aaa.vue
      const key = '../../' + pathStr.replace(/^\/+/, '')
      return modules[key] || (() => import('@/views/error/404.vue'))
    },
    buildRoutes(flatList) {
      const allIds = new Set(flatList.map(m => m.id))
      const map = Object.fromEntries(flatList.map(m => [m.id, { ...m, children: [] }]))
      const tree = []
      flatList.forEach(m => {
        if (m.type === 3) return   // 按钮不入路由
        // 父级缺失（例如 auditor 有审核管理但没有「模板广场」父目录）：上浮成 root
        const hasParent = m.parent_id !== 0 && allIds.has(m.parent_id)
        if (m.parent_id === 0 || !hasParent) {
          tree.push(map[m.id])
        } else if (map[m.parent_id]) {
          map[m.parent_id].children.push(map[m.id])
        } else {
          tree.push(map[m.id])
        }
      })
      const toRoute = (nodes) => nodes.map(n => {
        const hasChildren = n.children && n.children.some(c => c.type !== 3 && c.type !== undefined)
        let comp
        if (n.type === 1) {
          // 目录型：有 children 用 ParentView 嵌 <router-view>，无 children 用空
          comp = hasChildren ? ParentView : undefined
        } else {
          comp = this.normalizeComponent(n.component)
        }
        return {
          path: n.path || ('/m_' + n.id),
          name: n.name,
          component: comp,
          meta: {
            title: n.title,
            icon: n.icon,
            hidden: n.visible === 0,
            perms: n.perms
          },
          children: hasChildren ? toRoute(n.children) : undefined,
          redirect: n.type === 1 && hasChildren ? (n.children.find(c => c.type !== 3)?.path || undefined) : undefined
        }
      })
      return toRoute(tree)
    },
    generateRoutes(menusFlatList) {
      const routes = this.buildRoutes(menusFlatList)
      routes.forEach(r => {
        router.addRoute('LayoutRoot', r)
      })
      // 固定补充：预设编辑页（PresetList 同目录，不在菜单中显示）
      router.addRoute('LayoutRoot', {
        path: '/preset/edit',
        name: 'PresetEdit',
        component: () => import('@/views/preset/PresetEdit.vue'),
        meta: { title: '预设编辑', icon: 'Goods', hidden: true, perms: 'preset:edit' }
      })
      this.dynamicAdded = true
    },
    extractPerms(menusFlatList) {
      return new Set((menusFlatList || []).filter(m => m.perms).map(m => m.perms))
    },
    reset() {
      this.dynamicAdded = false
    }
  }
})
