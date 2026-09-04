import request from '@/utils/request'

export function getUserList(params) {
  return request({ url: '/admin/user/list', method: 'get', params })
}

export function getUserDetail(id) {
  return request({ url: `/admin/user/${id}`, method: 'get' })
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
