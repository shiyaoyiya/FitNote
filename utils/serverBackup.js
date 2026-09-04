/**
 * 云端备份统一入口（路由分发版）
 * ------------------------------------------------------
 * 策略：先 ping 本地 Spring Boot 服务器
 *   - 可达 → 走本地接口（POST /api/backup/upload 等）
 *   - 不可达 → 走微信云开发（云存储 + 云数据库）
 *
 * 调用方零感知：listServerBackups/uploadToServer/downloadFromServer
 * /deleteServerBackup 这 4 个导出方法名保持不变。
 *
 * 兼容性：MP-WEIXIN / APP-PLUS (Android/iOS) / H5 三端条件编译。
 *  - MP-WEIXIN 在本地不可达时会自动降级到云开发
 *  - H5 / APP-PLUS 本地不可达时直接抛错（无云开发能力）
 */
import {
  request,
  uploadFile,
  downloadFile,
  setTokens,
  clearAuth,
  getCurrentUser,
} from '@/utils/serverRequest.js'
import {
  SERVER_BASE_URL
} from '@/utils/serverConfig.js'
// #ifdef MP-WEIXIN
import {
  listCloudBackups as _listCloudBackups,
  uploadToCloud as _uploadToCloud,
  downloadFromCloud as _downloadFromCloud,
  deleteCloudBackup as _deleteCloudBackup,
} from '@/utils/cloudBackup.js'
// #endif

const BACKUP_VERSION = '1.0'
const MAX_BACKUPS = 5 // 最多保留 5 份云端备份
const TEMPLATE_KEY = 'fitness_templates'
const ACTION_KEY = 'fitness_actions'
const DAYDATA_PREFIX = 'fitness_daydata_'
const ANNIV_KEY = 'annivs'

// ------------------------------------------------------------------
// 收集 / 还原 全量数据（和本地备份完全一致，保证互通） 
// ------------------------------------------------------------------
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function collectFullData() {
  const templates = uni.getStorageSync(TEMPLATE_KEY) || []
  const actions = uni.getStorageSync(ACTION_KEY) || []
  const rawAnnivs = uni.getStorageSync(ANNIV_KEY) || '[]'
  let annivs = []
  try {
    annivs = JSON.parse(rawAnnivs)
    if (!Array.isArray(annivs)) annivs = []
  } catch (e) {
    annivs = []
  }
  const info = uni.getStorageInfoSync()
  const daydata = {};
  (info.keys || []).forEach((key) => {
    if (key.startsWith(DAYDATA_PREFIX)) {
      const date = key.slice(DAYDATA_PREFIX.length)
      const value = uni.getStorageSync(key) || {}
      daydata[date] = value
    }
  })
  return {
    version: BACKUP_VERSION,
    backupType: 'full',
    backupTime: new Date().toISOString(),
    data: {
      fitness_templates: Array.isArray(templates) ? templates : [],
      fitness_actions: Array.isArray(actions) ? actions : [],
      fitness_annivs: annivs,
      fitness_daydata: daydata,
    },
  }
}

/**
 * 把备份数据写回本地 Storage（恢复）
 * @param {object} backupData collectFullData() 生成的结构
 * @param {'overwrite'|'merge'} mode
 */
export function applyBackupToLocal(backupData, mode = 'overwrite') {
  const payload = backupData && backupData.data ? backupData.data : backupData
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份数据结构不正确')
  }
  const tplArr = Array.isArray(payload.fitness_templates) ? payload.fitness_templates : []
  const actArr = Array.isArray(payload.fitness_actions) ? payload.fitness_actions : []
  const annivsArr = Array.isArray(payload.fitness_annivs) ? payload.fitness_annivs : []
  const daydata = payload.fitness_daydata || {}

  const mergeArraysUnique = (arrA, arrB) => {
    const a = Array.isArray(arrA) ? arrA.slice() : []
    const b = Array.isArray(arrB) ? arrB : []
    b.forEach((item) => {
      if (!a.some((x) => JSON.stringify(x) === JSON.stringify(item))) a.push(item)
    })
    return a
  }

  if (mode === 'overwrite') {
    const info = uni.getStorageInfoSync();
    (info.keys || []).forEach((k) => {
      if (
        k === TEMPLATE_KEY ||
        k === ACTION_KEY ||
        k === ANNIV_KEY ||
        k === 'fitness_index' ||
        k.startsWith(DAYDATA_PREFIX)
      ) {
        uni.removeStorageSync(k)
      }
    })
    uni.setStorageSync(TEMPLATE_KEY, tplArr)
    uni.setStorageSync(ACTION_KEY, actArr)
    if (annivsArr.length) uni.setStorageSync(ANNIV_KEY, JSON.stringify(annivsArr))
    Object.keys(daydata).forEach((date) => {
      uni.setStorageSync(DAYDATA_PREFIX + date, daydata[date] || {})
    })
  } else {
    const curTpl = uni.getStorageSync(TEMPLATE_KEY) || []
    const curAct = uni.getStorageSync(ACTION_KEY) || []
    uni.setStorageSync(TEMPLATE_KEY, mergeArraysUnique(curTpl, tplArr))
    uni.setStorageSync(ACTION_KEY, mergeArraysUnique(curAct, actArr))
    if (annivsArr.length) {
      let curAnniv = []
      try {
        curAnniv = JSON.parse(uni.getStorageSync(ANNIV_KEY) || '[]')
      } catch (e) {}
      uni.setStorageSync(ANNIV_KEY, JSON.stringify(mergeArraysUnique(curAnniv, annivsArr)))
    }
    Object.keys(daydata).forEach((date) => {
      const key = DAYDATA_PREFIX + date
      const existed = uni.getStorageSync(key) || {}
      uni.setStorageSync(key, Object.assign({}, existed, daydata[date] || {}))
    })
  }
  uni.$emit && uni.$emit('backup-restored')
}

// ------------------------------------------------------------------
// 用户体系（账号密码）
// 后端：AuthController
//   POST /api/auth/user/register  → UserLoginVO
//   POST /api/auth/user/login     → UserLoginVO
//   POST /api/auth/refresh        → TokenRefreshVO
// ------------------------------------------------------------------
export function registerUser({
  username,
  password,
  confirmPassword,
  nickname
}) {
  return request({
    url: '/api/auth/user/register',
    method: 'POST',
    auth: false,
    data: {
      username,
      password,
      confirmPassword,
      nickname
    },
  })
}

export async function loginUser({
  username,
  password
}) {
  // 后端 UserLoginVO：{ token, expiresIn, user:{id,username,nickname,...} }
  // 后端无独立 refreshToken，refresh 接口使用同一 token（在过期宽限期内可续签）
  const vo = await request({
    url: '/api/auth/user/login',
    method: 'POST',
    auth: false,
    data: {
      username,
      password
    },
  })
  setTokens({
    accessToken: vo.token,
    refreshToken: vo.token,
    user: vo.user,
  })
  return vo
}

export function logoutUser() {
  clearAuth()
}

export function isLoggedIn() {
  return !!getCurrentUser()
}

export function me() {
  return getCurrentUser()
}

// ------------------------------------------------------------------
// 备份接口（用户侧 UserBackupController）
//   POST   /api/backup/upload            上传（multipart file + note）
//   GET    /api/backup/list              仅当前用户备份（分页）
//   GET    /api/backup/download/{id}     仅当前用户下载
//   DELETE /api/backup/{id}              仅当前用户删除
// 备份内容以 JSON 文件形式上传，和本地备份完全兼容
// ------------------------------------------------------------------

// ============ 路由分发：连通性检测 ============
export const BACKUP_MODE = {
  LOCAL: 'local',
  CLOUD: 'cloud',
  UNKNOWN: 'unknown',
}

// 缓存最近一次检测结果，避免每次操作都 ping；TTL 5 秒
let _localAvailableCache = null
let _localAvailableExpiry = 0
// 同步供 UI 读取的当前模式
let _currentBackupMode = BACKUP_MODE.UNKNOWN

/**
 * 同步获取当前备份模式（'local' | 'cloud' | 'unknown'）
 * 调用 isLocalServerAvailable 后此值会被更新
 */
export function getCurrentBackupMode() {
  return _currentBackupMode
}

/**
 * ping 本地 Spring Boot 服务器，判断是否可达
 * 结果缓存 5 秒；force=true 时强制重测
 * @param {boolean} [force=false]
 * @returns {Promise<boolean>}
 */
export async function isLocalServerAvailable(force = false) {
  const now = Date.now()
  if (!force && _localAvailableCache !== null && now < _localAvailableExpiry) {
    return _localAvailableCache
  }
  try {
    await request({
      url: '/api/preset/list',
      method: 'GET',
      auth: false,
      data: { page: 1, size: 1 },
      timeout: 3000, // 短超时
    })
    _localAvailableCache = true
    _localAvailableExpiry = now + 5000
    _currentBackupMode = BACKUP_MODE.LOCAL
    return true
  } catch (e) {
    _localAvailableCache = false
    _localAvailableExpiry = now + 5000
    // #ifdef MP-WEIXIN
    _currentBackupMode = BACKUP_MODE.CLOUD
    // #endif
    // #ifndef MP-WEIXIN
    _currentBackupMode = BACKUP_MODE.UNKNOWN
    // #endif
    return false
  }
}

// ============ 本地实现（私有，命名前缀 _xxxLocal） ============

async function _listServerBackupsLocal(page = 1, size = 20, keyword = '') {
  const res = await request({
    url: '/api/backup/list',
    method: 'GET',
    data: {
      page,
      size,
      keyword
    },
  })
  // 后端返回 PageVO<BackupListVO>：{ total, list }
  return {
    total: res?.total ?? 0,
    list: res?.list || res?.records || [],
  }
}

async function _deleteServerBackupLocal(id) {
  return request({
    url: `/api/backup/${id}`,
    method: 'DELETE',
  })
}

/**
 * 上传当前数据到本地 Spring Boot 服务器
 */
async function _uploadToServerLocal({
  onProgress,
  note
} = {}) {
  const payload = collectFullData()
  const timestamp = Date.now()
  const filename = `fitnote_backup_${timestamp}.json`
  const content = JSON.stringify(payload)

  // 1) 超限删除最旧（注意：此处必须调用本地版，避免路由递归）
  try {
    const page = await _listServerBackupsLocal(1, 100)
    const list = page.list || []
    if (list.length >= MAX_BACKUPS) {
      const oldest = list[list.length - 1]
      if (oldest && oldest.id) await _deleteServerBackupLocal(oldest.id)
    }
  } catch (e) {
    // 首次或失败不阻塞上传
  }

  onProgress && onProgress(20)

  // #ifdef H5
  const result = await _uploadH5(content, filename, note)
  onProgress && onProgress(100)
  return result
  // #endif

  // #ifndef H5
  const tempFilePath = _getTempFilePath(filename)
  await _writeTempFile(tempFilePath, content)
  try {
    onProgress && onProgress(50)
    const result = await uploadFile({
      url: '/api/backup/upload',
      filePath: tempFilePath,
      name: 'file',
      formData: note ? {
        note
      } : {},
    })
    onProgress && onProgress(100)
    return result
  } finally {
    _removeTempFile(tempFilePath)
  }
  // #endif
}

function _getTempFilePath(filename) {
  // #ifdef MP-WEIXIN
  return `${wx.env.USER_DATA_PATH}/${filename}`
  // #endif
  // #ifdef APP-PLUS
  return `_doc/${filename}`
  // #endif
  // #ifndef MP-WEIXIN || APP-PLUS
  return filename
  // #endif
}

function _writeTempFile(path, content) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    const fs = wx.getFileSystemManager()
    fs.writeFile({
      filePath: path,
      data: content,
      encoding: 'utf8',
      success: resolve,
      fail: reject,
    })
    // #endif
    // #ifdef APP-PLUS
    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
      fs.root.getFile(path.replace('_doc/', ''), {
        create: true
      }, (entry) => {
        entry.createWriter((w) => {
          w.onwrite = resolve
          w.onerror = reject
          w.write(content)
        }, reject)
      }, reject)
    }, reject)
    // #endif
  })
}

function _removeTempFile(path) {
  try {
    // #ifdef MP-WEIXIN
    const fs = wx.getFileSystemManager()
    fs.unlinkSync(path)
    // #endif
    // #ifdef APP-PLUS
    plus.io.resolveLocalFileSystemURL('_doc/' + (path.split('/').pop() || ''), (entry) => {
      entry.remove && entry.remove(() => {}, () => {})
    }, () => {})
    // #endif
  } catch (e) {}
}

// H5：fetch 直传
function _uploadH5(jsonContent, filename, note) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([jsonContent], {
      type: 'application/json'
    })
    const fd = new FormData()
    fd.append('file', blob, filename)
    if (note) fd.append('note', note)

    const at = uni.getStorageSync('fitnote_access_token') || ''
    const headers = {}
    if (at) headers.Authorization = `Bearer ${at}`

    const base = (SERVER_BASE_URL || '').replace(/\/$/, '')
    fetch(base + '/api/backup/upload', {
        method: 'POST',
        body: fd,
        headers
      })
      .then((r) => r.json())
      .then((body) => {
        if (body && body.code === 200) resolve(body.data)
        else reject(new Error(body?.message || 'UPLOAD_FAIL'))
      })
      .catch(reject)
  })
}

/**
 * 从本地 Spring Boot 服务器下载备份并返回 backupData（尚未写入本地）
 * 写入本地请调用 applyBackupToLocal(backupData, 'overwrite'|'merge')
 */
async function _downloadFromServerLocal(id) {
  const at = uni.getStorageSync('fitnote_access_token') || ''
  const base = (SERVER_BASE_URL || '').replace(/\/$/, '')

  // #ifdef H5
  const resp = await fetch(base + `/api/backup/download/${id}`, {
    headers: at ? {
      Authorization: `Bearer ${at}`
    } : {},
  })
  if (!resp.ok) throw new Error('DOWNLOAD_' + resp.status)
  return await resp.json()
  // #endif

  // #ifdef MP-WEIXIN || APP-PLUS
  const tempPath = await downloadFile({
    url: `/api/backup/download/${id}`,
    auth: true
  })
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: tempPath,
      encoding: 'utf8',
      success: (r) => {
        try {
          resolve(JSON.parse(r.data))
        } catch (e) {
          reject(new Error('JSON_PARSE_FAIL'))
        }
      },
      fail: reject,
    })
    // #endif
    // #ifdef APP-PLUS
    plus.io.resolveLocalFileSystemURL(tempPath, (entry) => {
      entry.file((f) => {
        const reader = new plus.io.FileReader()
        reader.onloadend = (e) => {
          try {
            resolve(JSON.parse(e.target.result))
          } catch (err) {
            reject(new Error('JSON_PARSE_FAIL'))
          }
        }
        reader.onerror = reject
        reader.readAsText(f, 'utf-8')
      }, reject)
    }, reject)
    // #endif
  })
  // #endif
}

// ============ 路由分发版（导出，保持原 API 签名） ============
// 调用方零感知：本地可达走 Spring Boot，不可达走微信云开发

/**
 * 列出当前用户的云端备份（自动路由）
 */
export async function listServerBackups(page = 1, size = 20, keyword = '') {
  if (await isLocalServerAvailable()) {
    return _listServerBackupsLocal(page, size, keyword)
  }
  // #ifdef MP-WEIXIN
  return _listCloudBackups(page, size)
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

/**
 * 删除云端备份（自动路由）
 */
export async function deleteServerBackup(id) {
  if (await isLocalServerAvailable()) {
    return _deleteServerBackupLocal(id)
  }
  // #ifdef MP-WEIXIN
  return _deleteCloudBackup(id)
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

/**
 * 上传当前数据到云端（自动路由）
 * @param {object} opts
 * @param {(p:number)=>void} [opts.onProgress]
 * @param {string} [opts.note]
 */
export async function uploadToServer({
  onProgress,
  note
} = {}) {
  if (await isLocalServerAvailable()) {
    return _uploadToServerLocal({ onProgress, note })
  }
  // #ifdef MP-WEIXIN
  // 云开发分支：在此处收集 payload，传给 cloudBackup 避免循环依赖
  const payload = collectFullData()
  return _uploadToCloud({ onProgress, note, payload })
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

/**
 * 从云端下载备份并返回 backupData（自动路由，尚未写入本地）
 * 写入本地请调用 applyBackupToLocal(backupData, 'overwrite'|'merge')
 */
export async function downloadFromServer(id) {
  if (await isLocalServerAvailable()) {
    return _downloadFromServerLocal(id)
  }
  // #ifdef MP-WEIXIN
  return _downloadFromCloud(id)
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

export default {
  MAX_BACKUPS,
  BACKUP_MODE,
  collectFullData,
  applyBackupToLocal,
  registerUser,
  loginUser,
  logoutUser,
  isLoggedIn,
  me,
  isLocalServerAvailable,
  getCurrentBackupMode,
  listServerBackups,
  deleteServerBackup,
  uploadToServer,
  downloadFromServer,
}