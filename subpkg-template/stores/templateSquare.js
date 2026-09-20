// stores/templateSquare.js
import { defineStore } from 'pinia'
import { cacheTemplateList, getCachedTemplateList, cacheTemplateDetail, getCachedTemplateDetail } from '@/subpkg-template/utils/templateCache.js'

export const useTemplateSquareStore = defineStore('templateSquare', {
  state: () => ({
    // 搜索和筛选
    keyword: '',
    activeTag: '',
    sort: 'latest',
    
    // 数据
    templates: [],
    total: 0,
    tags: [],
    
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    
    // 状态
    loading: false,
    loadingMore: false,
    
    // 离线状态
    isOffline: false,
    lastCacheTime: null, // 最后缓存时间
  }),
  
  getters: {
    // 后端 /square/page 已支持 keyword 和 tagId 过滤，前端直接返回后端结果
    filteredTemplates(state) {
      return state.templates
    }
  },
  
  actions: {
    // 设置搜索关键词
    setKeyword(keyword) {
      this.keyword = keyword
      this.page = 1
      this.templates = []
      this.loadTemplates()
    },
    
    // 设置标签筛选
    setActiveTag(tag) {
      this.activeTag = this.activeTag === tag ? '' : tag
      this.page = 1
      this.templates = []
      this.loadTemplates()
    },
    
    // 设置排序方式
    setSort(sort) {
      this.sort = sort
      this.page = 1
      this.templates = []
      this.loadTemplates()
    },
    
    // 更新离线状态
    setOfflineStatus(isOffline) {
      this.isOffline = isOffline
    },
    
    // 加载模板列表
    async loadTemplates() {
      if (this.loading) return
      this.loading = true
      try {
        const { isLocalServerAvailable } = await import('@/utils/serverBackup.js')
        
        // 检查服务器状态
        let serverAvailable = false
        try {
          serverAvailable = await isLocalServerAvailable()
        } catch (e) {
          serverAvailable = false
        }
        this.isOffline = !serverAvailable
        
        if (!serverAvailable) {
          // 离线模式：从缓存读取
          const cached = getCachedTemplateList({
            keyword: this.keyword,
            tagId: this.activeTag,
            sort: this.sort,
          })
          if (cached) {
            this.templates = cached.list || []
            this.total = cached.total || 0
            this.hasMore = false // 离线模式不支持分页加载更多
            const meta = uni.getStorageSync('fitnote_tpl_square_list_meta')
            this.lastCacheTime = meta?.lastCacheTime || null
          } else {
            this.templates = []
            this.total = 0
            this.hasMore = false
          }
          return
        }
        
        // 在线模式：从服务器获取
        const { listSquareTemplates } = await import('@/subpkg-template/utils/serverCommunity.js')
        const res = await listSquareTemplates({
          page: this.page,
          size: this.pageSize,
          keyword: this.keyword || '',
          tagId: this.activeTag || null,
          sort: this.sort
        })
        this.templates = res.list || []
        this.total = res.total || 0
        this.hasMore = this.templates.length < this.total
        
        // 缓存到本地
        cacheTemplateList(
          { keyword: this.keyword, tagId: this.activeTag, sort: this.sort },
          { list: this.templates, total: this.total }
        )
      } catch (e) {
        console.error('加载模板失败:', e)
        // 加载失败时尝试从缓存读取
        const cached = getCachedTemplateList({
          keyword: this.keyword,
          tagId: this.activeTag,
          sort: this.sort,
        })
        if (cached) {
          this.templates = cached.list || []
          this.total = cached.total || 0
          this.hasMore = false
          this.isOffline = true
        }
      } finally {
        this.loading = false
      }
    },
    
    // 加载更多模板（仅在线模式支持）
    async loadMore() {
      if (this.loadingMore || !this.hasMore || this.isOffline) return
      this.loadingMore = true
      try {
        const { listSquareTemplates } = await import('@/subpkg-template/utils/serverCommunity.js')
        this.page++
        const res = await listSquareTemplates({
          page: this.page,
          size: this.pageSize,
          keyword: this.keyword || '',
          tagId: this.activeTag || null,
          sort: this.sort
        })
        const newList = res.list || []
        this.templates = [...this.templates, ...newList]
        this.hasMore = this.templates.length < this.total
        
        // 更新缓存（合并后的完整列表）
        cacheTemplateList(
          { keyword: this.keyword, tagId: this.activeTag, sort: this.sort },
          { list: this.templates, total: this.total }
        )
      } catch (e) {
        console.error('加载更多失败:', e)
        this.page--
      } finally {
        this.loadingMore = false
      }
    },
    
    // 加载模板详情（支持离线缓存）
    async loadTemplateDetail(templateId) {
      // 先尝试从缓存读取
      const cached = getCachedTemplateDetail(templateId)
      if (cached) {
        return cached
      }
      
      // 在线模式：从服务器获取并缓存
      if (!this.isOffline) {
        try {
          const { getTemplateDetail } = await import('@/subpkg-template/utils/serverCommunity.js')
          const detail = await getTemplateDetail(templateId)
          if (detail) {
            cacheTemplateDetail(templateId, detail)
          }
          return detail
        } catch (e) {
          console.warn('获取模板详情失败:', e)
          return null
        }
      }
      
      return null
    },
    
    // 加载标签列表
    async loadTags() {
      try {
        const { listTemplateTags } = await import('@/subpkg-template/utils/serverCommunity.js')
        this.tags = await listTemplateTags()
      } catch (e) {
        console.error('加载标签失败:', e)
        this.tags = []
      }
    },
    
    // 重置筛选条件
    resetFilters() {
      this.keyword = ''
      this.activeTag = ''
      this.sort = 'latest'
      this.page = 1
      this.templates = []
      this.loadTemplates()
    }
  }
})
