import request from '@/utils/request'

// 管理端：反馈分页
export function getFeedbackPage(params) {
  return request({ url: '/admin/feedback/page', method: 'get', params })
}

// 管理端：反馈详情
export function getFeedbackDetail(id) {
  return request({ url: `/admin/feedback/${id}`, method: 'get' })
}

// 管理端：处理反馈（toStatus:1处理中/2已解决/3已拒绝, reply）
export function handleFeedback(id, data) {
  return request({ url: `/admin/feedback/${id}/handle`, method: 'put', data })
}
