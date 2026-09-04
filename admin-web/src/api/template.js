import request from '@/utils/request'

// 审核列表（支持 status 筛选：null=全部,0,1,2）
export function getAuditList(params) {
  return request({ url: '/admin/template/audit/page', method: 'get', params })
}

// 审核详情（含 templateData，供抽屉预览）
export function getAuditDetail(id) {
  return request({ url: `/admin/template/audit/${id}`, method: 'get' })
}

// 审核操作：status=1 通过 / status=2 驳回（rejectReason 必填）
export function auditTemplate(id, data) {
  return request({ url: `/admin/template/audit/${id}`, method: 'put', data })
}

// 广场列表（复用公开接口，仅返回 status=1）
export function getSquareList(params) {
  return request({ url: '/template/square/page', method: 'get', params })
}

// 设为/取消官方（isOfficial:0/1, sortWeight）
export function setOfficial(id, data) {
  return request({ url: `/admin/template/square/${id}/official`, method: 'put', data })
}

// 删除广场模板（逻辑删除）
export function deleteSquareTemplate(id) {
  return request({ url: `/admin/template/square/${id}`, method: 'delete' })
}
