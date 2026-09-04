import request from '@/utils/request'

export function getStats() {
  return request({ url: '/dashboard/stats', method: 'get' })
}

export function getNewUserTrend() {
  return request({ url: '/dashboard/trend/new-users', method: 'get' })
}

export function getActiveUserTrend() {
  return request({ url: '/dashboard/trend/active-users', method: 'get' })
}
