import router from '@/router'
import { useUserStore } from '@/store/modules/user'

const whiteList = ['/login', '/403', '/404']

router.beforeEach(async (to, from, next) => {
  const user = useUserStore()
  const justAdded = user.restoreRoutesIfNeeded()

  // 已登录 + 经由 catch-all 重定向到 /404 + 原地址非白名单 → 视为越权
  if (
    user.isLoggedIn &&
    to.path === '/404' &&
    to.redirectedFrom &&
    !whiteList.includes(to.redirectedFrom.path)
  ) {
    return next('/403')
  }

  // 已登录用户访问登录页 → 跳后台首页
  if (user.isLoggedIn && to.path === '/login') {
    return next('/dashboard')
  }

  if (whiteList.includes(to.path)) return next()

  if (!user.isLoggedIn) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 动态路由刚被 addRoute 但当前导航的 to.matched 还是旧的 → 用 path 重新解析（不能用 {...to}，会复制旧的 matched）
  if (justAdded && to.matched.length === 0) {
    return next({ path: to.path, query: to.query, hash: to.hash, replace: true })
  }

  // 已登录 + 非白名单 + 动态路由不匹配 → 视为无权限
  if (to.matched.length === 0) {
    return next('/403')
  }

  next()
})
