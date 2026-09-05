import request from '@/utils/request'

export function getUserList(params) {
  return request({ url: '/admin/user/list', method: 'get', params })
}

export function getUserDetail(id) {
  return request({ url: `/admin/user/${id}`, method: 'get' })
}

/** 用户画像页：训练统计图（30天累计容量趋势 + 部位饼图 + 4大核心指标） */
export function getUserTrainingStats(id) {
  return request({ url: `/admin/user/${id}/training-stats`, method: 'get' })
}

/** 用户画像页：分页查该用户分享的模板（不区分审核状态） */
export function getUserShareTemplates(id, params) {
  return request({ url: `/admin/user/${id}/share-templates`, method: 'get', params })
}

export function banUser(id) {
  return request({ url: `/admin/user/${id}/ban`, method: 'put' })
}

export function unbanUser(id) {
  return request({ url: `/admin/user/${id}/unban`, method: 'put' })
}

export function getTodayNew() {
  return request({ url: '/admin/user/today-new', method: 'get' })
}
