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

/** 获取备份完整预览数据（概览、模板、训练数据、动作、纪念日） */
export function getBackupPreview(id) {
  return request({ url: `/admin/backup/${id}/preview`, method: 'get' })
}

/** 获取备份中的模板列表（用于在线预览） */
export function getBackupTemplates(id) {
  return request({ url: `/admin/backup/${id}/templates`, method: 'get' })
}

/** 导出备份中的模板为 JSON 格式（兼容备份导入格式） */
export function exportBackupTemplates(id) {
  return request({
    url: `/admin/backup/${id}/export-templates`,
    method: 'get',
    responseType: 'blob'
  })
}

/** 下载完整备份文件（原始 JSON，需携带登录 token，经 axios 以 blob 形式下载） */
export function downloadBackup(id) {
  return request({
    url: `/admin/backup/${id}/download`,
    method: 'get',
    responseType: 'blob'
  })
}
