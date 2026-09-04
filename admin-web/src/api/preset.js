import request from '@/utils/request'

// 管理端：预设列表
export function getPresetPage(params) {
  return request({ url: '/admin/preset/page', method: 'get', params })
}

// 管理端：预设详情
export function getPresetDetail(id) {
  return request({ url: `/admin/preset/${id}`, method: 'get' })
}

// 管理端：新增/编辑
export function savePreset(data) {
  return request({ url: '/admin/preset', method: 'post', data })
}

// 管理端：启用/停用
export function setPresetEnabled(id, enabled) {
  return request({ url: `/admin/preset/${id}/enabled`, method: 'put', params: { enabled } })
}

// 管理端：删除
export function deletePreset(id) {
  return request({ url: `/admin/preset/${id}`, method: 'delete' })
}
