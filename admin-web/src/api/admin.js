import request from '@/utils/request'

// 管理员列表
export function getAdminList(params) {
  return request({ url: '/admin/list', method: 'get', params })
}

// 新增/编辑管理员
export function saveAdmin(data) {
  return request({ url: '/admin/save', method: 'post', data })
}

// 重置密码
export function resetAdminPwd(id, newPassword) {
  return request({ url: `/admin/${id}/reset-pwd`, method: 'put', data: { newPassword } })
}

// 启停用
export function setAdminStatus(id, status) {
  return request({ url: `/admin/${id}/status`, method: 'put', params: { status } })
}

// 删除管理员
export function deleteAdmin(id) {
  return request({ url: `/admin/${id}`, method: 'delete' })
}

// ---------- 角色菜单 ----------

// 菜单树（完整3级含按钮）
export function getMenuTree() {
  return request({ url: '/admin/menu/tree', method: 'get' })
}

// 某角色已选菜单ID列表
export function getRoleMenuIds(roleCode) {
  return request({ url: '/admin/role/menu-ids', method: 'get', params: { roleCode } })
}

// 保存角色菜单绑定
export function saveRoleMenu(data) {
  return request({ url: '/admin/role/menu', method: 'post', data })
}
