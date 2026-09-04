import req from '@/utils/request'

export function adminLogin(data) {
  return req.post('/auth/admin/login', data)
}

export function adminLogout() {
  return req.post('/auth/logout')
}

export function refreshToken() {
  return req.post('/auth/refresh')
}

export function getAdminMenus() {
  return req.get('/admin/me/menus') // 迭代 7 再实现后端
}
