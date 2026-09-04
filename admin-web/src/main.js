import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import ElementPlus from 'element-plus'
import * as Icons from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import hasPerm from './directives/hasPerm'
import { useUserStore } from './store/modules/user'
import { usePermissionStore } from './store/modules/permission'
import './utils/permission' // 注入全局路由守卫

const app = createApp(App)
for (const [k, v] of Object.entries(Icons)) {
  app.component(k, v)
}
app.use(pinia)
app.use(ElementPlus, { locale: zhCn })
app.directive('hasPerm', hasPerm)

// ⚡ 关键：在 app.use(router) 之前预恢复动态路由
// 因为 app.use(router) 会触发 router 初始化（解析当前 URL + 触发 beforeEach）
// 如果此时路由表只有 constantRoutes，访问 /dashboard 会因 to.matched 为空被重定向到 /403
// 所以先从 localStorage 读取 user state，提前 generateRoutes 把动态路由 addRoute 到路由表
const _user = useUserStore()
const _perm = usePermissionStore()
if (_user.token && _user.menus.length > 0 && !_perm.dynamicAdded) {
  _perm.generateRoutes(_user.menus)
}

app.use(router)

app.mount('#app')
