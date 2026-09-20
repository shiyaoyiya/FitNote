/**
 * 模板广场离线缓存工具
 * - 缓存模板列表数据（SquareTemplateVO）
 * - 缓存模板详情数据（TemplateDetailVO + templateData）
 * - 支持按关键词/标签/排序筛选后的结果缓存
 * - 离线时从缓存读取数据
 */

const CACHE_KEYS = {
  LIST: 'fitnote_tpl_square_list',
  LIST_META: 'fitnote_tpl_square_list_meta',
  DETAILS: 'fitnote_tpl_square_details',
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时缓存有效期

// ========== 列表缓存 ==========

/**
 * 缓存模板列表（含筛选条件）
 * @param {object} params - 筛选参数 { keyword, tagId, sort }
 * @param {object} data - 列表数据 { list, total }
 */
export function cacheTemplateList(params, data) {
  try {
    const key = _buildListKey(params)
    const cache = _getListCache()
    cache[key] = {
      data,
      timestamp: Date.now(),
    }
    uni.setStorageSync(CACHE_KEYS.LIST, cache)
    // 缓存 meta 信息（用于离线时显示最后缓存时间）
    uni.setStorageSync(CACHE_KEYS.LIST_META, {
      lastCacheTime: Date.now(),
      totalCached: Object.keys(cache).length,
    })
  } catch (e) {
    console.warn('缓存模板列表失败:', e)
  }
}

/**
 * 读取缓存的模板列表
 * @param {object} params - 筛选参数
 * @returns {object|null} { list, total } 或 null（缓存过期/不存在）
 */
export function getCachedTemplateList(params) {
  try {
    const key = _buildListKey(params)
    const cache = _getListCache()
    const entry = cache[key]
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete cache[key]
      uni.setStorageSync(CACHE_KEYS.LIST, cache)
      return null
    }
    return entry.data
  } catch (e) {
    return null
  }
}

/**
 * 获取列表缓存 meta 信息
 */
export function getListCacheMeta() {
  try {
    return uni.getStorageSync(CACHE_KEYS.LIST_META) || null
  } catch (e) {
    return null
  }
}

// ========== 详情缓存 ==========

/**
 * 缓存模板详情（含 templateData）
 * @param {number|string} templateId
 * @param {object} detail - TemplateDetailVO
 */
export function cacheTemplateDetail(templateId, detail) {
  try {
    const cache = _getDetailCache()
    cache[String(templateId)] = {
      data: detail,
      timestamp: Date.now(),
    }
    // 限制缓存数量，最多保留 100 条详情
    const keys = Object.keys(cache)
    if (keys.length > 100) {
      // 按时间排序，删除最旧的
      keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      const toRemove = keys.slice(0, keys.length - 100)
      toRemove.forEach(k => delete cache[k])
    }
    uni.setStorageSync(CACHE_KEYS.DETAILS, cache)
  } catch (e) {
    console.warn('缓存模板详情失败:', e)
  }
}

/**
 * 读取缓存的模板详情
 * @param {number|string} templateId
 * @returns {object|null} TemplateDetailVO 或 null
 */
export function getCachedTemplateDetail(templateId) {
  try {
    const cache = _getDetailCache()
    const entry = cache[String(templateId)]
    if (!entry) return null
    // 详情缓存有效期 7 天（模板数据相对稳定）
    if (Date.now() - entry.timestamp > 7 * 24 * 60 * 60 * 1000) {
      delete cache[String(templateId)]
      uni.setStorageSync(CACHE_KEYS.DETAILS, cache)
      return null
    }
    return entry.data
  } catch (e) {
    return null
  }
}

/**
 * 获取所有缓存的模板详情
 * @returns {object[]} 模板详情数组
 */
export function getAllCachedTemplateDetails() {
  try {
    const cache = _getDetailCache()
    return Object.values(cache)
      .filter(entry => Date.now() - entry.timestamp <= 7 * 24 * 60 * 60 * 1000)
      .map(entry => entry.data)
  } catch (e) {
    return []
  }
}

// ========== 清除缓存 ==========

/**
 * 清除所有模板广场缓存
 */
export function clearTemplateCache() {
  try {
    uni.removeStorageSync(CACHE_KEYS.LIST)
    uni.removeStorageSync(CACHE_KEYS.LIST_META)
    uni.removeStorageSync(CACHE_KEYS.DETAILS)
  } catch (e) {
    console.warn('清除模板缓存失败:', e)
  }
}

/**
 * 清除过期的缓存条目
 */
export function cleanExpiredCache() {
  try {
    // 清除过期列表缓存
    const listCache = _getListCache()
    let changed = false
    for (const key of Object.keys(listCache)) {
      if (Date.now() - listCache[key].timestamp > CACHE_TTL) {
        delete listCache[key]
        changed = true
      }
    }
    if (changed) uni.setStorageSync(CACHE_KEYS.LIST, listCache)

    // 清除过期详情缓存
    const detailCache = _getDetailCache()
    changed = false
    for (const key of Object.keys(detailCache)) {
      if (Date.now() - detailCache[key].timestamp > 7 * 24 * 60 * 60 * 1000) {
        delete detailCache[key]
        changed = true
      }
    }
    if (changed) uni.setStorageSync(CACHE_KEYS.DETAILS, detailCache)
  } catch (e) {
    console.warn('清理过期缓存失败:', e)
  }
}

// ========== 内部函数 ==========

function _buildListKey(params) {
  return JSON.stringify({
    keyword: params.keyword || '',
    tagId: params.tagId || '',
    sort: params.sort || 'latest',
  })
}

function _getListCache() {
  try {
    return uni.getStorageSync(CACHE_KEYS.LIST) || {}
  } catch (e) {
    return {}
  }
}

function _getDetailCache() {
  try {
    return uni.getStorageSync(CACHE_KEYS.DETAILS) || {}
  } catch (e) {
    return {}
  }
}
