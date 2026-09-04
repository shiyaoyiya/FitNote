/**
 * 微信云开发登录前端封装（无云函数版）
 * ------------------------------------------------------
 * 核心思路：云数据库每次写入都会自动注入 _openid 字段（无需云函数），
 * 我们直接用前端 db.collection('users').add() 写一条用户记录，
 * 然后通过 _openid 查回来拿到用户 _id，就完成了登录。
 *
 * 这个方案不需要部署任何云函数，纯前端即可实现：
 *   - cloudLogin()     → wx.login + db.users.where(_openid) 查/建用户
 *   - uploadAvatar()   → wx.cloud.uploadFile（云存储，本来就不用云函数）
 *   - cloudUpdateProfile() → db.users.doc(_id).update()
 *   - cloudLogout()    → 清本地存储
 *
 * 依赖前提：
 *   1. 云开发已开通，wx.cloud.init({ env: '你的环境ID' }) 已执行
 *   2. 云数据库已创建 users 集合（权限：仅创建者可读写）
 *   3. 云存储默认权限（上传下载需登录）
 *
 * 微信头像/昵称获取（2022 年 10 月后规范）：
 *   - 头像：<button open-type="chooseAvatar" @chooseavatar> → 临时文件路径
 *   - 昵称：<input type="nickname" @blur> → 用户输入值
 */

const USERS_COLLECTION = 'users'

const TOKEN_KEYS = {
  ACCESS: 'fitnote_access_token',
  REFRESH: 'fitnote_refresh_token',
  USER: 'fitnote_user_info',
  LOGIN_MODE: 'fitnote_login_mode', // 'cloud' | 'server'
}

function _ensureCloudReady() {
  if (!wx.cloud || typeof wx.cloud.database !== 'function') {
    throw new Error('CLOUD_NOT_INIT')
  }
}

function _db() {
  return wx.cloud.database()
}

/**
 * 判断当前是否云开发登录模式
 */
export function isCloudLoginMode() {
  return uni.getStorageSync(TOKEN_KEYS.LOGIN_MODE) === 'cloud'
}

/**
 * 获取当前登录模式：'cloud' | 'server' | ''
 */
export function getLoginMode() {
  return uni.getStorageSync(TOKEN_KEYS.LOGIN_MODE) || ''
}

/**
 * 微信登录（无云函数版）
 *
 * 流程：
 *   1. wx.login() —— 让微信给当前会话分配 openid（不拿 code 换 token，
 *      因为云数据库自动注入 _openid，我们不需要 code）
 *   2. db.collection('users').where({ _openid }).get() —— 查有没有老用户
 *   3a. 有 → 直接返回 user + isNew=false
 *   3b. 无 → db.collection('users').add({...}) 建一条 → 返回 user + isNew=true
 *   4. 存本地登录态（复用 serverRequest.js 的 key）
 *
 * @returns {Promise<{user:object, isNew:boolean}>}
 */
export async function cloudLogin() {
  _ensureCloudReady()

  // Step 1: wx.login —— 这个调用本身不返回 token，
  // 但能确保当前会话的 openid 已经绑定到云数据库连接上
  await new Promise((resolve, reject) => {
    wx.login({
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg || 'WX_LOGIN_FAIL')),
    })
  })

  const db = _db()
  const col = db.collection(USERS_COLLECTION)

  // Step 2: 尝试通过 _openid 查现有用户
  // 注意：微信云开发里 _openid 是系统字段，可以直接 where 查询
  // 但在 where 里写 _openid 时，需要用 __openid 或者直接不传条件
  // 更简单的做法：不加 where 条件，直接 get()，系统会自动只返回当前用户的记录
  const existingRes = await col.limit(1).get()
  const existingList = (existingRes && existingRes.data) || []

  if (existingList.length > 0) {
    const u = existingList[0]
    const user = {
      id: u._id,
      openid: u._openid,
      nickname: u.nickname || '微信用户',
      avatarUrl: u.avatarUrl || '',
    }
    _saveLocalSession(user)
    return { user, isNew: false }
  }

  // Step 3: 新用户 → 直接 add 一条，_openid 会被云运行时自动注入
  const addRes = await col.add({
    data: {
      nickname: '微信用户',
      avatarUrl: '',
      createTime: db.serverDate(),
    },
  })

  // add 返回只有 _id，再查一次拿到完整记录（含自动注入的 _openid）
  const detailRes = await col.doc(addRes._id).get()
  const u = detailRes.data
  const user = {
    id: u._id,
    openid: u._openid,
    nickname: u.nickname || '微信用户',
    avatarUrl: u.avatarUrl || '',
  }
  _saveLocalSession(user)
  return { user, isNew: true }
}

/**
 * 上传头像到云存储
 * @param {string} tempFilePath chooseAvatar 返回的临时文件路径
 * @returns {Promise<string>} fileID（如 cloud://xxx.xxx.xxx/avatars/12345.jpg）
 */
export async function uploadAvatar(tempFilePath) {
  if (!tempFilePath) throw new Error('NO_FILE_PATH')
  _ensureCloudReady()
  const timestamp = Date.now()
  const cloudPath = `avatars/${timestamp}.jpg`
  const res = await wx.cloud.uploadFile({
    cloudPath,
    filePath: tempFilePath,
  })
  if (!res || !res.fileID) {
    throw new Error('AVATAR_UPLOAD_FAIL')
  }
  return res.fileID
}

/**
 * 更新用户资料（昵称 + 头像）—— 无云函数版，直接 db.update
 * @param {object} opts
 * @param {string} [opts.nickname]
 * @param {string} [opts.avatarUrl] 云存储 fileID
 * @returns {Promise<object>} 更新后的 user
 */
export async function cloudUpdateProfile({ nickname, avatarUrl } = {}) {
  _ensureCloudReady()

  const patch = {}
  if (nickname) patch.nickname = String(nickname).slice(0, 30)
  if (avatarUrl) patch.avatarUrl = String(avatarUrl)

  if (Object.keys(patch).length === 0) {
    throw new Error('NO_FIELDS')
  }

  const db = _db()
  const col = db.collection(USERS_COLLECTION)

  // 查当前用户记录（权限规则确保只有自己的记录）
  const existingRes = await col.limit(1).get()
  const list = (existingRes && existingRes.data) || []
  if (list.length === 0) {
    throw new Error('USER_NOT_FOUND')
  }
  const record = list[0]

  // 直接 update —— 权限规则确保只有自己能更
  await col.doc(record._id).update({ data: patch })

  const user = {
    id: record._id,
    openid: record._openid,
    nickname: patch.nickname || record.nickname || '微信用户',
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : (record.avatarUrl || ''),
  }
  _saveLocalSession(user)
  return user
}

/**
 * 退出云开发登录
 */
export function cloudLogout() {
  uni.removeStorageSync(TOKEN_KEYS.ACCESS)
  uni.removeStorageSync(TOKEN_KEYS.REFRESH)
  uni.removeStorageSync(TOKEN_KEYS.USER)
  uni.removeStorageSync(TOKEN_KEYS.LOGIN_MODE)
}

// ---------- 内部 ----------

function _saveLocalSession(user) {
  uni.setStorageSync(TOKEN_KEYS.USER, user)
  // 占位 token，让 isLoggedIn() 返回 true
  uni.setStorageSync(TOKEN_KEYS.ACCESS, `cloud_${user.openid}`)
  uni.setStorageSync(TOKEN_KEYS.REFRESH, `cloud_${user.openid}`)
  uni.setStorageSync(TOKEN_KEYS.LOGIN_MODE, 'cloud')
}

export default {
  isCloudLoginMode,
  getLoginMode,
  cloudLogin,
  uploadAvatar,
  cloudUpdateProfile,
  cloudLogout,
}
