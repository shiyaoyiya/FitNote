import { createRouter, createWebHistory } from 'vue-router'
import LayoutMain from '@/layouts/LayoutMain.vue'

export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/Login.vue'),
    meta: { hidden: true }
  },
  {
    path: '/403',
    component: () => import('@/views/error/403.vue'),
    meta: { hidden: true }
  },
  {
    path: '/404',
    component: () => import('@/views/error/404.vue'),
    meta: { hidden: true }
  },
  {
    path: '/',
    name: 'LayoutRoot',
    component: LayoutMain,
    redirect: '/login',
    children: [
      // 动态路由通过 permission store.addRoute 注入到这里
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes
})

export function resetRouter() {
  const allNames = router.getRoutes().map(r => r.name).filter(Boolean)
  allNames.forEach(n => router.removeRoute(n))
  constantRoutes.forEach(r => router.addRoute(r))
}

export default router
