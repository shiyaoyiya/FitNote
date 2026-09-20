/**
 * 社区模块 API：系统公告 / 反馈与建议 / 站内通知 / 个人资料
 * ------------------------------------------------------
 * 说明：这些功能仅走本地 Spring Boot 接口，不支持云开发模式。
 */
import { request, uploadFile } from '@/utils/serverRequest.js'

// ===== 系统公告 =====

/**
 * 公告列表（公开，无需登录）
 * @param {object} opts { page, size, type: 1系统|2活动|3版本 }
 */
export function listAnnounces({ page = 1, size = 10, type = null } = {}) {
  return request({
    url: '/api/announce/list',
    method: 'GET',
    auth: false,
    data: { page, size, type },
  }).then((res) => ({
    total: res?.total ?? 0,
    list: res?.list || res?.records || [],
  }))
}

/** 公告详情 */
export function getAnnounceDetail(id) {
  return request({
    url: `/api/announce/${id}`,
    method: 'GET',
    auth: false,
  })
}

// ===== 反馈与建议 =====

/**
 * 提交反馈（需登录）
 * @param {object} dto { category: 1建议|2Bug|3数据|4其他, title, content, screenshotUrls }
 */
export function submitFeedback(dto) {
  return request({
    url: '/api/feedback/submit',
    method: 'POST',
    auth: true,
    data: dto,
  })
}

/** 我的反馈列表（需登录） */
export function listMyFeedback({ page = 1, size = 10 } = {}) {
  return request({
    url: '/api/feedback/mine',
    method: 'GET',
    auth: true,
    data: { page, size },
  }).then((res) => ({
    total: res?.total ?? 0,
    list: res?.list || res?.records || [],
  }))
}

// ===== 站内通知（模板驳回 / 下架 / 反馈处理结果等） =====

/**
 * 当前用户的通知列表（需登录）
 * @param {object} opts { page, size, isRead: 0未读|1已读|null全部 }
 */
export function listMyNotifications({ page = 1, size = 10, isRead = null } = {}) {
  return request({
    url: '/api/notification/list',
    method: 'GET',
    auth: true,
    data: { page, size, isRead },
  }).then((res) => ({
    total: res?.total ?? 0,
    list: res?.list || res?.records || [],
  }))
}

/** 标记单条通知为已读（需登录） */
export function markNotificationRead(id) {
  return request({
    url: `/api/notification/${id}/read`,
    method: 'PUT',
    auth: true,
  })
}

/** 全部通知标记已读（需登录） */
export function markAllNotificationsRead() {
  return request({
    url: '/api/notification/read-all',
    method: 'PUT',
    auth: true,
  })
}

/** 当前用户未读通知数（需登录） */
export function getUnreadNotificationCount() {
  return request({
    url: '/api/notification/unread-count',
    method: 'GET',
    auth: true,
  }).then((res) => Number(res?.unread ?? 0))
}

// ===== 个人资料 =====

/**
 * 获取当前登录用户的个人资料（需登录）
 * 返回字段：id, username, nickname, avatarUrl, phone, gender, birthday,
 *           totalTrainDays, totalVolumeKg, registerTime
 */
export function getMyProfile() {
  return request({
    url: '/api/user/profile',
    method: 'GET',
    auth: true,
  })
}

/**
 * 修改当前登录用户的个人资料（需登录）
 * @param {object} patch { nickname?, avatarUrl?, phone?, gender?, birthday? }
 */
export function updateMyProfile(patch) {
  return request({
    url: '/api/user/profile',
    method: 'PUT',
    auth: true,
    data: patch,
  })
}

/**
 * 上传当前用户头像（multipart/form-data，需登录）
 * @param {string} filePath 本地临时图片路径
 * @returns {Promise<string>} 后端返回的头像相对路径 /avatars/xxx.png
 */
export function uploadMyAvatar(filePath) {
  return uploadFile({
    url: '/api/user/avatar',
    filePath,
    name: 'file',
    auth: true,
  })
}

export default {
  listAnnounces,
  getAnnounceDetail,
  submitFeedback,
  listMyFeedback,
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
}
