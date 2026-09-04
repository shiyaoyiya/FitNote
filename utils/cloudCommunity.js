/**
 * 模板广场云开发版（纯前端 db 操作，无云函数）
 * ------------------------------------------------------
 * 数据模型（与 Spring Boot 端对齐）：
 *   collection: 'shared_templates'
 *   字段：
 *     id           - 云数据库自动生成的 _id（与后端 number id 不同，但前端通用）
 *     _openid      - 自动注入，创建者标识
 *     name         - 模板名称
 *     description  - 模板描述
 *     coverColor   - 封面主色（#379bff 等）
 *     tags         - 标签数组 ['胸部', '背部']（云开发无 tag 关联表，直接存 tag 名）
 *                    （Spring Boot 端存 tagIds；云开发端直接存字符串数组更方便）
 *     actionCount  - 动作数量
 *     totalSets    - 总组数
 *     templateData - 模板 JSON 字符串（与后端一致，含 actions/actionSets 等）
 *     createdBy    - 创建者 openid（冗余 _openid，公开列表时可显示创建者）
 *     downloads    - 下载次数
 *     likes        - 点赞数
 *     createTime   - 创建时间（serverDate）
 *     status       - 审核状态：1 已发布（云开发不强制审核，提交即发布）
 *                    （Spring Boot 端 status=0 待审核 / 1 审核通过）
 *
 * 集合权限：shared_templates → 所有用户可读，仅创建者可写
 *   （云开发控制台手动设置：权限规则 → 自定义安全规则：
 *    read: true
 *    write: auth.openid == resource._openid
 *   ）
 *
 * 标签：云开发端没有 tag 表，直接给一份"内置标签"让用户选。
 */

const TEMPLATES_COLLECTION = 'shared_templates'
const COMMUNITY_COLLECTION = 'community_users' // 备用：扩展下载/点赞记录用

// 内置标签（与 Spring Boot 端预置标签保持一致）
export const CLOUD_TEMPLATE_TAGS = [
  { id: '1', name: '胸部', sort: 1 },
  { id: '2', name: '背部', sort: 2 },
  { id: '3', name: '肩部', sort: 3 },
  { id: '4', name: '手臂', sort: 4 },
  { id: '5', name: '臀部', sort: 5 },
  { id: '6', name: '腿部', sort: 6 },
  { id: '7', name: '核心', sort: 7 },
  { id: '8', name: '有氧', sort: 8 },
  { id: '9', name: 'HIIT', sort: 9 },
  { id: '10', name: '全身', sort: 10 },
  { id: '11', name: '力量', sort: 11 },
  { id: '12', name: '增肌', sort: 12 },
  { id: '13', name: '减脂', sort: 13 },
  { id: '14', name: '塑形', sort: 14 },
  { id: '15', name: '新手', sort: 15 },
  { id: '16', name: '中级', sort: 16 },
  { id: '17', name: '高级', sort: 17 },
]

function _ensureCloudReady() {
  if (!wx.cloud || typeof wx.cloud.database !== 'function') {
    throw new Error('CLOUD_NOT_INIT')
  }
}

function _db() {
  return wx.cloud.database()
}

function _col() {
  return _db().collection(TEMPLATES_COLLECTION)
}

/** 将云数据库记录映射成前端通用结构（与后端 list 返回同字段） */
function _mapRecord(rec) {
  const tags = Array.isArray(rec.tags) ? rec.tags : []
  // 给每条记录拼一个稳定的 sortKey（方便前端排序渲染）
  const downloads = Number(rec.downloads) || 0
  const likes = Number(rec.likes) || 0
  return {
    id: rec._id,
    name: rec.name || '未命名模板',
    description: rec.description || '',
    coverColor: rec.coverColor || '#379bff',
    tags,
    tagIds: [], // 云开发模式无 tagId，传空数组
    tagNames: tags,
    actionCount: Number(rec.actionCount) || 0,
    totalSets: Number(rec.totalSets) || 0,
    downloads,
    likes,
    createTime: rec.createTime,
    templateData: rec.templateData, // 列表页不返 templateData（详情/下载单独拉）
    hotScore: downloads * 2 + likes * 5, // 热门排序得分
  }
}

// ===== 模板广场列表 =====

/**
 * 分页查询广场模板
 * @param {object} opts { page, size, keyword, tagId（云开发用的是 tagName）, sort: 'hot'|'latest' }
 */
export async function listSquareTemplatesCloud({
  page = 1,
  size = 10,
  keyword = '',
  tagId = null,
  sort = 'hot',
} = {}) {
  _ensureCloudReady()
  const db = _db()
  const _ = db.command
  const skip = Math.max(0, (page - 1) * size)
  const limit = Math.min(size, 100)

  // 构建查询条件
  let query = _col().where({
    status: _.in([1, null, undefined]), // 未审核的也展示（云开发无审核流程）
  })

  // 标签过滤（云开发端 tags 存字符串数组，tagId 是用户点的标签名）
  if (tagId) {
    const tagName = typeof tagId === 'number' ? String(tagId) : tagId
    // 优先按标签名匹配；若传的是 id，则从内置标签找到对应 name
    let matchName = tagName
    const builtin = CLOUD_TEMPLATE_TAGS.find((t) => t.id === tagName)
    if (builtin) matchName = builtin.name
    query = query.where({
      tags: _.in([matchName]),
      status: _.in([1, null, undefined]),
    })
  }

  // 关键词（模板名搜索）
  if (keyword) {
    query = query.where({
      name: db.RegExp({ regexp: keyword, options: 'i' }),
      status: _.in([1, null, undefined]),
    })
  }

  // count（count 不需要排序和 limit）
  let total = 0
  try {
    const countRes = await query.count()
    total = countRes.total || 0
  } catch (e) {
    total = 0
  }

  if (total === 0) {
    return { total: 0, list: [] }
  }

  // 排序 + 分页
  let queryWithOrder = query
  if (sort === 'latest' || sort === 'new') {
    queryWithOrder = queryWithOrder.orderBy('createTime', 'desc')
  } else {
    // 默认热门：按 downloads desc
    queryWithOrder = queryWithOrder.orderBy('downloads', 'desc').orderBy('createTime', 'desc')
  }

  const res = await queryWithOrder.skip(skip).limit(limit).get()
  const list = (res.data || []).map(_mapRecord)

  return { total, list }
}

// ===== 标签列表 =====

/**
 * 云开发端没有独立的标签表，直接返回内置标签
 */
export async function listTemplateTagsCloud() {
  return CLOUD_TEMPLATE_TAGS.map((t) => ({
    id: t.id,
    name: t.name,
    sort: t.sort,
  }))
}

// ===== 模板详情 =====

/**
 * 模板详情（公开，返回含 templateData）
 */
export async function getTemplateDetailCloud(id) {
  _ensureCloudReady()
  const res = await _col().doc(id).get()
  if (!res.data) throw new Error('NOT_FOUND')
  const r = _mapRecord(res.data)
  return {
    ...r,
    templateData: res.data.templateData,
  }
}

// ===== 模板下载 =====

/**
 * 下载模板（返回 templateData；同时 downloads +1）
 */
export async function downloadTemplateCloud(id) {
  _ensureCloudReady()
  const db = _db()
  const _ = db.command

  // 1. 读完整记录
  const res = await _col().doc(id).get()
  if (!res.data) throw new Error('NOT_FOUND')

  // 2. downloads +1（用 inc 避免并发覆盖；捕获异常不阻断下载）
  try {
    await _col().doc(id).update({
      data: {
        downloads: _.inc(1),
      },
    })
  } catch (e) {
    // 非创建者无法 update：安全跳过，只是计数器不变
  }

  return res.data.templateData
}

// ===== 分享模板 =====

/**
 * 分享模板到广场（云开发版：用户提交即发布，无审核流程）
 * @param {object} dto { name, description, coverColor, actionCount, totalSets, templateData, tagIds? }
 *        tagIds 在云开发端会被翻译成标签名数组 tags[]
 * @returns {Promise<string>} 云数据库 _id 字符串（前端用 shareTemplate 返回 id）
 */
export async function shareTemplateCloud(dto) {
  _ensureCloudReady()
  const db = _db()

  const {
    name,
    description,
    coverColor,
    actionCount,
    totalSets,
    templateData,
    tagIds,
  } = dto || {}

  // tagIds -> tagNames（内置标签映射）
  const ids = Array.isArray(tagIds) ? tagIds : []
  const tagNames = ids
    .map((id) => {
      const t = CLOUD_TEMPLATE_TAGS.find((x) => String(x.id) === String(id))
      return t ? t.name : null
    })
    .filter(Boolean)

  const addRes = await _col().add({
    data: {
      name: String(name || '').slice(0, 50),
      description: String(description || '').slice(0, 2000),
      coverColor: coverColor || '#379bff',
      tags: tagNames,
      actionCount: Number(actionCount) || 0,
      totalSets: Number(totalSets) || 0,
      templateData: templateData || '',
      downloads: 0,
      likes: 0,
      createTime: db.serverDate(),
      status: 1, // 直接发布（无审核）
    },
  })

  return addRes._id
}

export default {
  CLOUD_TEMPLATE_TAGS,
  listSquareTemplatesCloud,
  listTemplateTagsCloud,
  getTemplateDetailCloud,
  downloadTemplateCloud,
  shareTemplateCloud,
}
