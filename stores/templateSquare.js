// stores/templateSquare.js
import { defineStore } from 'pinia'

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
    loadingMore: false
  }),
  
  getters: {
    filteredTemplates(state) {
      let arr = state.templates
      if (state.keyword) {
        const kw = state.keyword.toLowerCase()
        arr = arr.filter(t => 
          (t.name || '').toLowerCase().includes(kw) ||
          (t.actions || []).some(a => (a.name || '').toLowerCase().includes(kw))
        )
      }
      if (state.activeTag) {
        arr = arr.filter(t => (t.tags || []).includes(state.activeTag))
      }
      return arr
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
    
    // 加载模板列表
    async loadTemplates() {
      if (this.loading) return
      this.loading = true
      try {
        const { listSquareTemplates } = await import('@/utils/serverCommunity.js')
        const res = await listSquareTemplates({
          page: this.page,
          size: this.pageSize,
          keyword: this.keyword,
          tagId: this.activeTag,
          sort: this.sort
        })
        this.templates = res.list || []
        this.total = res.total || 0
        this.hasMore = this.templates.length < this.total
      } catch (e) {
        console.error('加载模板失败:', e)
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    // 加载更多模板
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      try {
        const { listSquareTemplates } = await import('@/utils/serverCommunity.js')
        this.page++
        const res = await listSquareTemplates({
          page: this.page,
          size: this.pageSize,
          keyword: this.keyword,
          tagId: this.activeTag,
          sort: this.sort
        })
        const newList = res.list || []
        this.templates = [...this.templates, ...newList]
        this.hasMore = this.templates.length < this.total
      } catch (e) {
        console.error('加载更多失败:', e)
        this.page--
      } finally {
        this.loadingMore = false
      }
    },
    
    // 加载标签列表
    async loadTags() {
      try {
        const { listTemplateTags } = await import('@/utils/serverCommunity.js')
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
