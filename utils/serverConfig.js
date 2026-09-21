/**
 * 后端服务地址配置
 * ------------------------------------------------------
 * 支持用户在小程序内动态配置服务器地址，切换网络（WiFi/手机热点）时
 * 只需在设置页修改 IP 即可，无需改代码重新编译。
 *
 * 优先级：用户自定义地址（localStorage）> ENV_MODE 静态配置 > H5 自动检测
 *
 * 本机 H5 调试（浏览器访问 localhost）：用 'local'
 * 局域网调试：用 'lan'，并在设置页输入电脑当前 IP
 * 生产环境：用 'prod'
 * ------------------------------------------------------
 * 查看本机 LAN IP：Windows PowerShell 执行 `ipconfig`，找到和手机同网段的 IPv4。
 */
const ENV_MODE = 'lan' // 'local' | 'lan' | 'prod'

const LOCAL_HOST = 'http://127.0.0.1:8080'
const LAN_HOST = 'http://10.72.69.74:8080' // 默认 fallback IP
const PROD_HOST = 'https://your-domain.com'
const SERVER_PORT = '8080'

const HOST_MAP = {
  local: LOCAL_HOST,
  lan: LAN_HOST,
  prod: PROD_HOST,
}

const CUSTOM_URL_STORAGE_KEY = 'fitnote_custom_server_url'

/**
 * 读取用户自定义服务器地址（小程序内设置页配置）
 */
export function getCustomServerUrl() {
  try {
    return uni.getStorageSync(CUSTOM_URL_STORAGE_KEY) || ''
  } catch (e) {
    return ''
  }
}

/**
 * 设置用户自定义服务器地址
 * @param {string} url 形如 http://192.168.1.100:8080
 */
export function setCustomServerUrl(url) {
  if (url) {
    uni.setStorageSync(CUSTOM_URL_STORAGE_KEY, url)
  } else {
    uni.removeStorageSync(CUSTOM_URL_STORAGE_KEY)
  }
}

/**
 * 自动记住当前成功连接的地址（写入自定义地址，下次优先尝试）
 * 仅对小程序/App 生效：这些端无法像 H5 一样用 location 自动推导服务器地址，
 * 记住最近一次可达的地址可避免用户每次切换网络都要重新手动配置。
 */
export function rememberCurrentBaseUrl() {
  // #ifndef H5
  const base = getServerBaseUrl()
  if (base && base !== getCustomServerUrl()) {
    setCustomServerUrl(base)
  }
  // #endif
}

/**
 * 动态解析服务器基础 URL（每次调用都读取最新配置）
 * 优先级：用户自定义地址 > H5 自动检测 > ENV_MODE 静态配置
 */
export function getServerBaseUrl() {
  const customUrl = getCustomServerUrl()
  if (customUrl) return customUrl.replace(/\/$/, '')

  const raw = HOST_MAP[ENV_MODE] || LOCAL_HOST
  // #ifdef H5
  if (ENV_MODE === 'lan' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:${SERVER_PORT}`
    }
  }
  // #endif
  return raw
}

// 保留静态导出以兼容已有引用，但实际请求应使用 getServerBaseUrl()
export const SERVER_BASE_URL = getServerBaseUrl()
export const SERVER_ENV = ENV_MODE

// ============ 微信云开发配置 ============
// 使用前请在微信公众平台 → 开发管理 → 云开发 开通环境，
// 把下方 CLOUD_ENV 改为你创建的环境 ID（形如 fitnote-cloud-1abc23）
// 并在云开发控制台 → 数据库 创建集合 backup_records
// 权限规则设为「仅创建者可读写」（默认）
export const CLOUD_ENV = 'cloudbase-d0g4u0lfg00aec1b5' // ← 改为你的云开发环境 ID
export const CLOUD_DB_COLLECTION = 'backup_records' // 备份记录集合名
export const CLOUD_STORAGE_PREFIX = 'backups' // 云存储目录前缀

export default {
  SERVER_BASE_URL,
  SERVER_ENV,
  CLOUD_ENV,
  CLOUD_DB_COLLECTION,
  CLOUD_STORAGE_PREFIX,
  getServerBaseUrl,
  getCustomServerUrl,
  setCustomServerUrl,
  rememberCurrentBaseUrl,
}