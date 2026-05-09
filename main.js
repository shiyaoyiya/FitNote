import App from './App'
import { updateNavBar } from './utils/theme'

// #ifndef VUE3
import Vue from 'vue'
import uView from 'uview-ui'
import 'uview-ui/index.scss'
Vue.use(uView)
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.mixin({
  onShow() {
    updateNavBar()
  }
})
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
  createSSRApp
} from 'vue'
import {
  createPinia
} from 'pinia'
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.mixin({
    onShow() {
      updateNavBar()
    }
  })
  return {
    app,
    pinia
  }
}
// #endif