import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import router from '@/router'
import { refreshToken } from '@/api/auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000
})

let isRefreshing = false
let retryQueue = []

function flushRetryQueue(newToken) {
  retryQueue.forEach(cb => cb(newToken))
  retryQueue = []
}

request.interceptors.request.use(config => {
  const user = useUserStore()
  if (user.token) {
    config.headers = config.headers || {}
    config.headers.Authorization = 'Bearer ' + user.token
  }
  return config
}, Promise.reject)

request.interceptors.response.use(
  resp => {
    const body = resp.data
    // 文件流等非 JSON
    if (!body || typeof body.code === 'undefined') return body
    if (body.code === 200) return body.data
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message || 'UNKNOWN'))
  },
  async err => {
    const resp = err.response
    if (resp?.status === 401) {
      const msg = resp?.data?.message
      const user = useUserStore()
      if (msg === 'TOKEN_EXPIRED' && !isRefreshing) {
        isRefreshing = true
        try {
          const { token } = await refreshToken()
          user.token = token
          flushRetryQueue(token)
          return request(err.config)
        } catch (e) {
          flushRetryQueue(null)
          user.logout()
        } finally {
          isRefreshing = false
        }
      } else if (msg === 'TOKEN_EXPIRED') {
        return new Promise(resolve => retryQueue.push((t) => {
          if (t) {
            err.config.headers.Authorization = 'Bearer ' + t
            resolve(request(err.config))
          }
        }))
      } else {
        user.logout()
      }
    } else if (resp?.status === 403) {
      ElMessage.error('无操作权限')
      router.push('/403')
    } else {
      ElMessage.error(resp?.data?.message || err.message || '网络错误')
    }
    return Promise.reject(err)
  }
)

export default request
