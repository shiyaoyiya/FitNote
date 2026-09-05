/**
 * 模板广场API封装
 */

/**
 * 分页查询广场模板
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.tagId - 标签ID
 * @param {string} params.sort - 排序方式 (latest/popular/downloads)
 * @returns {Promise<object>} 模板列表
 */
export async function fetchSquareTemplates({ page = 1, size = 10, keyword = '', tagId = null, sort = 'latest' } = {}) {
  const { request } = await import('@/utils/serverRequest.js')
  return request({
    url: '/api/template/square/page',
    method: 'GET',
    auth: false,
    data: { page, size, keyword, tagId, sort }
  }).then((res) => ({
    total: res?.total ?? 0,
    list: res?.list || res?.records || []
  }))
}

/**
 * 获取模板详情
 * @param {number} id - 模板ID
 * @returns {Promise<object>} 模板详情
 */
export async function fetchTemplateDetail(id) {
  const { request } = await import('@/utils/serverRequest.js')
  return request({
    url: `/api/template/square/${id}`,
    method: 'GET',
    auth: false
  })
}

/**
 * 获取标签列表
 * @returns {Promise<Array>} 标签列表
 */
export async function fetchTemplateTags() {
  const { request } = await import('@/utils/serverRequest.js')
  return request({
    url: '/api/template/tag/list',
    method: 'GET',
    auth: false
  })
}

/**
 * 下载模板
 * @param {number} id - 模板ID
 * @returns {Promise<string>} 模板数据
 */
export async function downloadTemplateById(id) {
  const { request } = await import('@/utils/serverRequest.js')
  return request({
    url: `/api/template/square/${id}/download`,
    method: 'GET',
    auth: true
  })
}

/**
 * 分享模板到广场
 * @param {object} dto - 分享数据
 * @returns {Promise<number|string>} 新建的模板ID
 */
export async function shareTemplateToSquare(dto) {
  const { request } = await import('@/utils/serverRequest.js')
  return request({
    url: '/api/template/share',
    method: 'POST',
    auth: true,
    data: dto
  })
}
