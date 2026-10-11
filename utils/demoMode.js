/**
 * 演示模式（Demo Mode）
 * ------------------------------------------------------
 * 用途：H5 部署到 GitHub Pages 等纯静态托管时，后端（Spring Boot）无法随站部署。
 * 演示模式在"后端不可达"时提供一条零依赖入口：写入一个本地演示用户，
 * 让访客无需注册即可体验全部本地功能（训练记录 / 模板 / 统计 / 身体数据等）。
 *
 * 说明：
 * - isLoggedIn() 的实现是「本地存在 user 即视为已登录」（见 utils/serverBackup.js），
 *   因此写入演示用户即可通过应用的登录检查，无需真实后端。
 * - 走后端的操作（云端备份、公告、通知、反馈、社区）在演示模式下请求会失败，
 *   应用自带错误提示，不影响本地核心功能。
 */
import { setTokens, clearAuth } from '@/utils/serverRequest.js'

const DEMO_MODE_KEY = 'fitnote_demo_mode'
const DEMO_USER = {
  id: 'demo-user',
  username: 'demo',
  nickname: '演示用户',
  avatarUrl: '',
  isDemo: true,
}

/** 当前是否为演示模式 */
export function isDemoMode() {
  try {
    return uni.getStorageSync(DEMO_MODE_KEY) === '1'
  } catch (e) {
    return false
  }
}

/** 进入演示模式：写入本地演示用户 */
export function enterDemoMode() {
  uni.setStorageSync(DEMO_MODE_KEY, '1')
  setTokens({
    accessToken: 'demo-token',
    refreshToken: 'demo-token',
    user: DEMO_USER,
  })
}

/** 退出演示模式：清除本地演示用户与标记 */
export function exitDemoMode() {
  uni.removeStorageSync(DEMO_MODE_KEY)
  clearAuth()
}
