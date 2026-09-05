/**
 * 社区模块 API：模板广场 / 系统公告 / 反馈与建议（路由分发版）
 * ------------------------------------------------------
 * 策略：先 ping 本地 Spring Boot 服务器
 *   - 可达 → 走本地接口（/api/template/** 等）
 *   - 不可达 → 走微信云开发（云数据库 shared_templates 集合，纯前端直连）
 *
 * 模板广场 4 个方法已接入路由：
 *   listSquareTemplates / listTemplateTags / getTemplateDetail
 *   downloadTemplate / shareTemplate
 * 公告 / 反馈 / 个人资料 仍只走本地接口（不常用，按需再迁移）。
 */
import { request, uploadFile } from '@/utils/serverRequest.js'
import { isLocalServerAvailable } from '@/utils/serverBackup.js'
// #ifdef MP-WEIXIN
import {
  listSquareTemplatesCloud,
  listTemplateTagsCloud,
  getTemplateDetailCloud,
  downloadTemplateCloud,
  shareTemplateCloud,
} from '@/utils/cloudCommunity.js'
// #endif

// ===== 模板广场（本地实现，私有） =====

function _listSquareTemplatesLocal({ page = 1, size = 10, keyword = '', tagId = null, sort = 'hot' } = {}) {
  return request({
    url: '/api/template/square/page',
    method: 'GET',
    auth: false,
    data: { page, size, keyword, tagId, sort },
  }).then((res) => ({
    total: res?.total ?? 0,
    list: res?.list || res?.records || [],
  }))
}

function _listTemplateTagsLocal() {
  return request({
    url: '/api/template/tag/list',
    method: 'GET',
    auth: false,
  })
}

function _getTemplateDetailLocal(id) {
  return request({
    url: `/api/template/square/${id}`,
    method: 'GET',
    auth: false,
  })
}

function _downloadTemplateLocal(id) {
  return request({
    url: `/api/template/square/${id}/download`,
    method: 'GET',
    auth: true,
  })
}

function _shareTemplateLocal(dto) {
  return request({
    url: '/api/template/share',
    method: 'POST',
    auth: true,
    data: dto,
  })
}

// ===== 模板广场（路由分发导出版） =====

/**
 * 分页查询广场模板（自动路由）
 * @param {object} opts { page, size, keyword, tagId, sort: 'hot'|'latest' }
 */
export async function listSquareTemplates({ page = 1, size = 10, keyword = '', tagId = null, sort = 'hot' } = {}) {
  if (await isLocalServerAvailable()) return _listSquareTemplatesLocal({ page, size, keyword, tagId, sort })
  // #ifdef MP-WEIXIN
  return listSquareTemplatesCloud({ page, size, keyword, tagId, sort })
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

/** 标签列表（自动路由） */
export async function listTemplateTags() {
  if (await isLocalServerAvailable()) return _listTemplateTagsLocal()
  // #ifdef MP-WEIXIN
  return listTemplateTagsCloud()
  // #endif
  // #ifndef MP-WEIXIN
  return []
  // #endif
}

/** 模板详情（自动路由；公开，但下载需登录） */
export async function getTemplateDetail(id) {
  if (await isLocalServerAvailable()) return _getTemplateDetailLocal(id)
  // #ifdef MP-WEIXIN
  return getTemplateDetailCloud(id)
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

/** 下载模板（自动路由；需登录，返回模板 JSON 字符串） */
export async function downloadTemplate(id) {
  if (await isLocalServerAvailable()) return _downloadTemplateLocal(id)
  // #ifdef MP-WEIXIN
  return downloadTemplateCloud(id)
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

/**
 * 分享模板到广场（自动路由；需登录）
 * @param {object} dto { name, description, coverColor, actionCount, totalSets, templateData, tagIds? }
 * @returns {Promise<number|string>} 新建的 shared_template id（本地是 number，云开发是 _id 字符串）
 */
export async function shareTemplate(dto) {
  if (await isLocalServerAvailable()) return _shareTemplateLocal(dto)
  // #ifdef MP-WEIXIN
  return shareTemplateCloud(dto)
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('本地服务器不可达，且当前端无云开发能力')
  // #endif
}

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

// 导出新的API函数
export {
  fetchSquareTemplates,
  fetchTemplateDetail,
  fetchTemplateTags,
  downloadTemplateById,
  shareTemplateToSquare
} from './api/templateSquare.js'

export default {
  listSquareTemplates,
  listTemplateTags,
  getTemplateDetail,
  downloadTemplate,
  shareTemplate,
  listAnnounces,
  getAnnounceDetail,
  submitFeedback,
  listMyFeedback,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
}
