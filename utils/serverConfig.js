/**
 * 后端服务地址配置
 * ------------------------------------------------------
 * 手机基座 / 真机调试 / H5局域网测试 场景：
 *   请把 ENV_MODE 改为 'lan' 并把 LAN_HOST 改成你电脑的局域网 IP，
 *   确保手机和电脑处于同一个 Wi-Fi（不能是校园网/企业网等 AP 隔离的网络）。
 * 本机 H5 调试（浏览器访问 localhost）：
 *   用 'local' 即可，走本机回环 127.0.0.1。
 * 已部署到服务器 / 生产环境：
 *   用 'prod'，在 PROD_HOST 填你的公网域名。
 * ------------------------------------------------------
 * 查看本机 LAN IP：Windows PowerShell 执行 `ipconfig`，找到和手机同网段的 IPv4。
 *   示例：192.168.1.180（本会话当前电脑 LAN IP）
 */
const ENV_MODE = 'lan' // 'local' | 'lan' | 'prod'

const LOCAL_HOST = 'http://127.0.0.1:8080'
const LAN_HOST = 'http://192.168.1.180:8080' // ← 需要时改成你自己的 IP
const PROD_HOST = 'https://your-domain.com'

const HOST_MAP = {
  local: LOCAL_HOST,
  lan: LAN_HOST,
  prod: PROD_HOST,
}

export const SERVER_BASE_URL = HOST_MAP[ENV_MODE] || LOCAL_HOST
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
}