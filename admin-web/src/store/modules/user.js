import { defineStore } from 'pinia'
import { adminLogin, adminLogout, getAdminMenus } from '@/api/auth'
import router, { resetRouter } from '@/router'
import { usePermissionStore } from './permission'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    admin: null,       // {id, username, nickname, role}
    menus: [],         // 扁平菜单列表（登录接口返回），持久化
    permsSetArr: []    // 权限数组，便于持久化（Set 无法序列化）
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    perms: (s) => new Set(s.permsSetArr)
  },
  actions: {
    async login({ username, password }) {
      const { token, expiresIn, admin, menus } = await adminLogin({ username, password })
      this.token = token
      this.admin = admin
      this.menus = menus
      this.permsSetArr = menus.filter(m => m.perms).map(m => m.perms)
      const permStore = usePermissionStore()
      permStore.generateRoutes(menus)
      // 按当前角色的菜单计算第一个可跳转的菜单 path（优先找 Dashboard 即 /dashboard）
      const firstMenu = menus.find(m => m.type === 2 && m.path === '/dashboard')
        || menus.find(m => m.type === 2 && m.path)
      const target = firstMenu?.path || '/403'
      router.push(target)
      return { token, expiresIn, admin, menus }
    },
    async logout() {
      try { await adminLogout() } catch {}
      this.token = ''
      this.admin = null
      this.menus = []
      this.permsSetArr = []
      resetRouter()
      const permStore = usePermissionStore()
      permStore.reset()
      router.push('/login')
    },
    // 刷新页面恢复动态路由（token 持久化回来后，重新 addRoute）
    // 返回 true 表示本次调用执行了 addRoute（调用方需要 next({...to, replace:true}) 重新触发路由匹配）
    restoreRoutesIfNeeded() {
      if (this.token && this.menus.length > 0) {
        const permStore = usePermissionStore()
        if (!permStore.dynamicAdded) {
          permStore.generateRoutes(this.menus)
          return true
        }
      }
      return false
    }
  },
  persist: {
    pick: ['token', 'admin', 'menus', 'permsSetArr']
  }
})
