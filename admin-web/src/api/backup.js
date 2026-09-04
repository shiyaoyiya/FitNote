import request from '@/utils/request'

export function getBackupList(params) {
  return request({ url: '/admin/backup/list', method: 'get', params })
}

export function getBackupDetail(id) {
  return request({ url: `/admin/backup/${id}`, method: 'get' })
}

export function deleteBackup(id) {
  return request({ url: `/admin/backup/${id}`, method: 'delete' })
}
