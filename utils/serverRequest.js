import { SERVER_BASE_URL } from '@/utils/serverConfig.js'

/**
 * uni.request 统一封装（小程序 / H5 / App 通用）
 * - 自动拼接 baseUrl
 * - 自动携带 JWT（accessToken）
 * - 401 时尝试用 refreshToken 刷新并重放原请求，失败则清登录态
 * - 响应按后端 Result<T> 统一解包：成功返回 data，失败 Promise.reject(msg)
 */

const TOKEN_KEYS = {
  ACCESS: 'fitnote_access_token',
  REFRESH: 'fitnote_refresh_token',
  USER: 'fitnote_user_info',
}

export function getAccessToken() {
  return uni.getStorageSync(TOKEN_KEYS.ACCESS) || ''
}
export function getRefreshToken() {
  return uni.getStorageSync(TOKEN_KEYS.REFRESH) || ''
}
export function setTokens({ accessToken, refreshToken, user }) {
  if (accessToken) uni.setStorageSync(TOKEN_KEYS.ACCESS, accessToken)
  if (refreshToken) uni.setStorageSync(TOKEN_KEYS.REFRESH, refreshToken)
  if (user) uni.setStorageSync(TOKEN_KEYS.USER, user)
}
export function clearAuth() {
  uni.removeStorageSync(TOKEN_KEYS.ACCESS)
  uni.removeStorageSync(TOKEN_KEYS.REFRESH)
  uni.removeStorageSync(TOKEN_KEYS.USER)
}
export function getCurrentUser() {
  return uni.getStorageSync(TOKEN_KEYS.USER) || null
}

/**
 * 局部更新当前登录用户信息（合并写入），用于个人资料修改后刷新本地登录态。
 * @param {object} patch 需要覆盖的字段，如 { nickname, avatarUrl }
 * @returns {object} 更新后的 user
 */
export function updateCurrentUser(patch) {
  const cur = uni.getStorageSync(TOKEN_KEYS.USER) || {}
  const next = Object.assign({}, cur, patch || {})
  uni.setStorageSync(TOKEN_KEYS.USER, next)
  return next
}

function buildUrl(url) {
  if (/^https?:\/\//i.test(url)) return url
  const base = SERVER_BASE_URL.replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

let isRefreshing = false
let pendingQueue = []

async function refreshTokenIfNeeded() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ resolve, reject })
    })
  }
  isRefreshing = true
  try {
    const rt = getRefreshToken()
    if (!rt) throw new Error('NO_REFRESH_TOKEN')
    const res = await uni.request({
      url: buildUrl('/api/auth/refresh'),
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rt}`,
      },
    })
    const body = res.data || {}
    if (body.code !== 200 || !body.data) {
      throw new Error(body.message || 'REFRESH_FAILED')
    }
    // 后端 TokenRefreshVO：{ token, expiresIn }（无独立 refreshToken，复用同一 token）
    const newToken = body.data.token || body.data.accessToken
    if (!newToken) throw new Error('REFRESH_NO_TOKEN')
    setTokens({ accessToken: newToken, refreshToken: newToken })
    pendingQueue.forEach(q => q.resolve(newToken))
    pendingQueue = []
    return newToken
  } catch (e) {
    pendingQueue.forEach(q => q.reject(e))
    pendingQueue = []
    // 仅在确实存在旧 token 但被服务器拒绝时才清登录态；
    // 无 token / NO_REFRESH_TOKEN 不应清空可能仍存在的用户信息
    if (e.message !== 'NO_REFRESH_TOKEN') {
      clearAuth()
    }
    throw e
  } finally {
    isRefreshing = false
  }
}

/**
 * 通用请求方法
 * @param {object} opts
 * @param {string} opts.url
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [opts.method='GET']
 * @param {object} [opts.data]
 * @param {object} [opts.header]
 * @param {boolean} [opts.auth=true] 是否携带 token
 * @param {number} [opts.timeout=30000]
 */
export function request({
  url,
  method = 'GET',
  data,
  header = {},
  auth = true,
  timeout = 30000,
}) {
  const doRequest = (accessToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...header,
    }
    if (auth && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }
    return new Promise((resolve, reject) => {
      uni.request({
        url: buildUrl(url),
        method,
        data,
        header: headers,
        timeout,
        success: async (res) => {
          const body = res.data || {}
          // Result<T> 结构：{ code, message, data }
          if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 200) {
              resolve(body.data)
            } else if (body.code === 401) {
              // token 过期或未授权：尝试刷新一次再重放
              if (auth && !url.includes('/api/auth/refresh')) {
                try {
                  const newAt = await refreshTokenIfNeeded()
                  const retryRes = await request({ url, method, data, header, auth, timeout, _skipRefresh: true })
                  return resolve(retryRes)
                } catch (e) {
                  return reject(new Error(body.message || 'UNAUTHORIZED'))
                }
              }
              reject(new Error(body.message || 'UNAUTHORIZED'))
            } else if (body.code === 403) {
              reject(new Error(body.message || 'FORBIDDEN'))
            } else {
              reject(new Error(body.message || 'REQUEST_FAIL'))
            }
          } else {
            // 兼容非 Result 结构
            resolve(body)
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || 'NETWORK_ERROR'))
        },
      })
    })
  }

  if (!auth) return doRequest('')

  const at = getAccessToken()
  if (at) return doRequest(at)
  // 无 accessToken，先尝试刷新
  return refreshTokenIfNeeded().then(newAt => doRequest(newAt)).catch(() => doRequest(''))
}

/**
 * 上传文件到 Spring Boot 后端（multipart/form-data）
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} opts.filePath 本地文件路径（临时文件）
 * @param {string} [opts.name='file'] form-data 字段名
 * @param {object} [opts.formData] 额外表单字段
 * @param {boolean} [opts.auth=true]
 */
export function uploadFile({
  url,
  filePath,
  name = 'file',
  formData = {},
  auth = true,
}) {
  return new Promise((resolve, reject) => {
    const header = {}
    if (auth) {
      const at = getAccessToken()
      if (at) header.Authorization = `Bearer ${at}`
    }
    uni.uploadFile({
      url: buildUrl(url),
      filePath,
      name,
      formData,
      header,
      success: (res) => {
        let body
        try {
          body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch (e) {
          return reject(new Error('UPLOAD_RESPONSE_INVALID'))
        }
        if (body && body.code === 200) {
          resolve(body.data)
        } else {
          reject(new Error(body?.message || 'UPLOAD_FAIL'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || 'UPLOAD_NETWORK_ERROR')),
    })
  })
}

/**
 * 下载文件（返回 tempFilePath）
 */
export function downloadFile({ url, auth = true }) {
  return new Promise((resolve, reject) => {
    const header = {}
    if (auth) {
      const at = getAccessToken()
      if (at) header.Authorization = `Bearer ${at}`
    }
    uni.downloadFile({
      url: buildUrl(url),
      header,
      success: (res) => {
        if (res.statusCode === 200) resolve(res.tempFilePath)
        else reject(new Error('DOWNLOAD_' + res.statusCode))
      },
      fail: (err) => reject(new Error(err.errMsg || 'DOWNLOAD_NETWORK_ERROR')),
    })
  })
}

/**
 * 统一解析头像 URL（多端兼容）
 * ------------------------------------------------------
 * 支持的输入类型：
 *   1. 相对路径 /avatars/xxx.png → 拼 SERVER_BASE_URL（服务器本地模式）
 *   2. http://xxx / https://xxx → 直接返回
 *   3. cloud://xxx（微信云存储 fileID）→ 直接返回（小程序 <image> 原生支持）
 *   4. wxfile://xxx（小程序本地临时文件）→ 直接返回
 *   5. /static/xxx（项目内静态资源）→ 直接返回（uni-app 静态路径规范）
 *   6. data:image/xxx;base64,... → 直接返回
 * @param {string} url
 * @returns {string}
 */
export function resolveAvatarUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  // 绝对协议/内联资源：直接放行
  if (/^(https?:\/\/|cloud:\/\/|wxfile:\/\/|data:image\/)/i.test(s)) return s
  // uni-app 静态资源路径（/static/xxx 或 /@/static/xxx）直接放行
  if (/^\/(@\/)?static\//i.test(s)) return s
  // 其余作为相对路径，拼 SERVER_BASE_URL
  const base = (SERVER_BASE_URL || '').replace(/\/$/, '')
  const path = s.startsWith('/') ? s : '/' + s
  return base + path
}

export default {
  request,
  uploadFile,
  downloadFile,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAuth,
  getCurrentUser,
  updateCurrentUser,
  resolveAvatarUrl,
  SERVER_BASE_URL,
}
