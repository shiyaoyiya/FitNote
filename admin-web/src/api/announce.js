import request from '@/utils/request'

// 管理端：公告列表
export function getAnnouncePage(params) {
  return request({ url: '/admin/announce/page', method: 'get', params })
}

// 管理端：公告详情
export function getAnnounceDetail(id) {
  return request({ url: `/admin/announce/${id}`, method: 'get' })
}

// 管理端：新增/编辑+草稿保存/立即发布（body.action=1立即发布 =0草稿）
export function saveAnnounce(data) {
  return request({ url: '/admin/announce', method: 'post', data })
}

// 管理端：发布
export function publishAnnounce(id) {
  return request({ url: `/admin/announce/${id}/publish`, method: 'put' })
}

// 管理端：撤回
export function withdrawAnnounce(id) {
  return request({ url: `/admin/announce/${id}/withdraw`, method: 'put' })
}

// 管理端：删除
export function deleteAnnounce(id) {
  return request({ url: `/admin/announce/${id}`, method: 'delete' })
}
