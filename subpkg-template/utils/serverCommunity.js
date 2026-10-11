/**
 * 模板广场模块 API（路由分发版）
 * ------------------------------------------------------
 * 策略：先 ping 本地 Spring Boot 服务器
 *   - 可达 → 走本地接口（/api/template/** 等）
 *   - 不可达 → 走微信云开发（云数据库 shared_templates 集合，纯前端直连）
 */
import { request, getAccessToken } from '@/utils/serverRequest.js'
import { isLocalServerAvailable } from '@/utils/serverBackup.js'
import { getCachedTemplateDetail } from './templateCache.js'
// #ifdef MP-WEIXIN
import {
  listSquareTemplatesCloud,
  listTemplateTagsCloud,
  getTemplateDetailCloud,
  downloadTemplateCloud,
  shareTemplateCloud,
} from './cloudCommunity.js'
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
  // 登录态下携带 token 访问详情，后端才能返回当前用户真实的收藏状态（collected）；
  // 未登录时匿名访问仍可用（collected=false），不影响公开浏览
  const token = getAccessToken()
  return request({
    url: `/api/template/square/${id}`,
    method: 'GET',
    auth: false,
    header: token ? { Authorization: `Bearer ${token}` } : {},
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

function _collectTemplateLocal(id) {
  return request({
    url: `/api/template/collect/${id}`,
    method: 'POST',
    auth: true,
  })
}

function _uncollectTemplateLocal(id) {
  return request({
    url: `/api/template/collect/${id}`,
    method: 'DELETE',
    auth: true,
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
  return { total: 0, list: [] }
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

/** 模板详情（自动路由；公开，但下载需登录）
 * 本地/云开发均不可达时，回退到本地详情缓存（离线可看动作清单） */
export async function getTemplateDetail(id) {
  let detail = null
  try {
    if (await isLocalServerAvailable()) {
      detail = await _getTemplateDetailLocal(id)
    } else {
      // #ifdef MP-WEIXIN
      detail = await getTemplateDetailCloud(id)
      // #endif
    }
  } catch (e) {
    // 网络异常：继续走缓存兜底
  }
  if (!detail) {
    // 离线兜底：返回缓存的详情（含 templateData）
    const cached = getCachedTemplateDetail(id)
    if (cached) return cached
  }
  return detail
}

/** 下载模板（自动路由；需登录，返回模板 JSON 字符串）
 * 本地/云开发均不可达时，回退到本地详情缓存的 templateData（离线可导入） */
export async function downloadTemplate(id) {
  let data = null
  try {
    if (await isLocalServerAvailable()) {
      data = await _downloadTemplateLocal(id)
    } else {
      // #ifdef MP-WEIXIN
      data = await downloadTemplateCloud(id)
      // #endif
    }
  } catch (e) {
    // 网络异常：继续走缓存兜底
  }
  if (!data) {
    // 离线兜底：从详情缓存中提取 templateData
    const cached = getCachedTemplateDetail(id)
    if (cached && cached.templateData) return cached.templateData
  }
  return data
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
  throw new Error('服务器不可达，请检查网络连接后重试')
  // #endif
}

/** 收藏模板（自动路由；需登录） */
export async function collectTemplate(id) {
  if (await isLocalServerAvailable()) return _collectTemplateLocal(id)
  throw new Error('服务器不可达，无法收藏')
}

/** 取消收藏（自动路由；需登录） */
export async function uncollectTemplate(id) {
  if (await isLocalServerAvailable()) return _uncollectTemplateLocal(id)
  throw new Error('服务器不可达，无法取消收藏')
}

export default {
  listSquareTemplates,
  listTemplateTags,
  getTemplateDetail,
  downloadTemplate,
  shareTemplate,
  collectTemplate,
  uncollectTemplate,
}
