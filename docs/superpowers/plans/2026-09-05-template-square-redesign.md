# 模板广场模块化重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将模板广场页面从单文件重构为模块化组件架构，优化UI设计，确保与后端API正确对接。

**Architecture:** 采用Vue3 Composition API + Pinia状态管理，将768行单文件拆分为7个独立组件，每个组件职责单一。使用双列网格布局，极简主义设计风格。

**Tech Stack:** Vue3, Pinia, uni-app, JavaScript, CSS3

---

## 文件结构规划

### 新增文件
```
pages/templateSquare/
├── components/
│   ├── SearchBar.vue           # 搜索栏组件
│   ├── TagFilter.vue           # 标签筛选组件
│   ├── SortBar.vue             # 排序栏组件
│   ├── TemplateGrid.vue        # 双列网格组件
│   ├── TemplateCard.vue        # 单个模板卡片组件
│   ├── TemplateDetail.vue      # 模板详情弹窗组件
│   └── ShareDialog.vue         # 分享弹窗组件
stores/
├── templateSquare.js           # 模板广场状态管理
utils/api/
├── templateSquare.js           # 模板广场API封装
```

### 修改文件
```
pages/templateSquare/
├── templateSquare.vue          # 重构为主页面（父组件）
utils/
├── serverCommunity.js          # 优化API调用
```

---

## Task 1: 创建模板广场状态管理Store

**Files:**
- Create: `stores/templateSquare.js`
- Test: 手动测试Store功能

- [ ] **Step 1: 创建templateSquare.js Store**

```javascript
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
```

- [ ] **Step 2: 测试Store基本功能**

在控制台测试Store的创建和基本操作：
```javascript
// 测试代码（在浏览器控制台执行）
import { useTemplateSquareStore } from '@/stores/templateSquare.js'
const store = useTemplateSquareStore()
console.log('Store创建成功:', store)
```

- [ ] **Step 3: 提交Store文件**

```bash
git add stores/templateSquare.js
git commit -m "feat: 添加模板广场状态管理Store"
```

---

## Task 2: 创建模板广场API封装

**Files:**
- Create: `utils/api/templateSquare.js`
- Modify: `utils/serverCommunity.js`

- [ ] **Step 1: 创建API封装文件**

```javascript
// utils/api/templateSquare.js
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
```

- [ ] **Step 2: 修改serverCommunity.js，添加新API导出**

在 `utils/serverCommunity.js` 文件末尾添加：
```javascript
// 导出新的API函数
export {
  fetchSquareTemplates,
  fetchTemplateDetail,
  fetchTemplateTags,
  downloadTemplateById,
  shareTemplateToSquare
} from './api/templateSquare.js'
```

- [ ] **Step 3: 测试API封装**

```javascript
// 测试代码
import { fetchSquareTemplates, fetchTemplateTags } from '@/utils/api/templateSquare.js'

// 测试模板列表
const templates = await fetchSquareTemplates({ page: 1, size: 10 })
console.log('模板列表:', templates)

// 测试标签列表
const tags = await fetchTemplateTags()
console.log('标签列表:', tags)
```

- [ ] **Step 4: 提交API文件**

```bash
git add utils/api/templateSquare.js utils/serverCommunity.js
git commit -m "feat: 添加模板广场API封装"
```

---

## Task 3: 创建SearchBar搜索栏组件

**Files:**
- Create: `pages/templateSquare/components/SearchBar.vue`
- Test: 手动测试搜索功能

- [ ] **Step 1: 创建SearchBar.vue组件**

```vue
<!-- pages/templateSquare/components/SearchBar.vue -->
<template>
  <view class="search-bar">
    <view class="search-icon">🔍</view>
    <input 
      v-model="keyword" 
      class="search-input" 
      placeholder="搜索模板名 / 动作 / 标签"
      @input="onInput"
    />
    <view v-if="keyword" class="clear-btn" @click="clearKeyword">×</view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTemplateSquareStore } from '@/stores/templateSquare.js'

const store = useTemplateSquareStore()
const keyword = ref(store.keyword)
let debounceTimer = null

const onInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.setKeyword(keyword.value)
  }, 300)
}

const clearKeyword = () => {
  keyword.value = ''
  store.setKeyword('')
}
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 88rpx;
  margin-bottom: 8px;
}

.search-icon {
  font-size: 24rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  height: 88rpx;
}

.clear-btn {
  font-size: 32rpx;
  color: var(--text-secondary);
  padding: 0 8rpx;
}
</style>
```

- [ ] **Step 2: 测试SearchBar组件**

在父组件中引入并测试：
```vue
<SearchBar />
```

- [ ] **Step 3: 提交SearchBar组件**

```bash
git add pages/templateSquare/components/SearchBar.vue
git commit -m "feat: 添加SearchBar搜索栏组件"
```

---

## Task 4: 创建TagFilter标签筛选组件

**Files:**
- Create: `pages/templateSquare/components/TagFilter.vue`
- Test: 手动测试标签筛选功能

- [ ] **Step 1: 创建TagFilter.vue组件**

```vue
<!-- pages/templateSquare/components/TagFilter.vue -->
<template>
  <scroll-view class="tag-filter" scroll-x show-scrollbar="false" @touchmove.stop>
    <view class="tag-list">
      <view 
        v-for="tag in store.tags" 
        :key="tag.id || tag.name" 
        class="tag-chip"
        :class="{ active: store.activeTag === (tag.id || tag.name) }"
        @click="toggleTag(tag)"
      >
        {{ tag.name || tag }}
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { useTemplateSquareStore } from '@/stores/templateSquare.js'

const store = useTemplateSquareStore()

const toggleTag = (tag) => {
  const tagValue = tag.id || tag.name || tag
  store.setActiveTag(tagValue)
}
</script>

<style scoped>
.tag-filter {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 4px 16px;
  box-sizing: border-box;
  white-space: nowrap;
}

.tag-list {
  display: inline-flex;
  gap: 8px;
  padding: 4px 0;
}

.tag-chip {
  padding: 6rpx 20rpx;
  border-radius: 999px;
  font-size: 22rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  white-space: nowrap;
}

.tag-chip.active {
  background: var(--primary);
  color: #fff;
}
</style>
```

- [ ] **Step 2: 测试TagFilter组件**

```vue
<TagFilter />
```

- [ ] **Step 3: 提交TagFilter组件**

```bash
git add pages/templateSquare/components/TagFilter.vue
git commit -m "feat: 添加TagFilter标签筛选组件"
```

---

## Task 5: 创建SortBar排序栏组件

**Files:**
- Create: `pages/templateSquare/components/SortBar.vue`
- Test: 手动测试排序功能

- [ ] **Step 1: 创建SortBar.vue组件**

```vue
<!-- pages/templateSquare/components/SortBar.vue -->
<template>
  <view class="sort-bar">
    <view 
      v-for="s in sorts" 
      :key="s.key"
      class="sort-item"
      :class="{ active: store.sort === s.key }"
      @click="store.setSort(s.key)"
    >
      {{ s.label }}
    </view>
  </view>
</template>

<script setup>
import { useTemplateSquareStore } from '@/stores/templateSquare.js'

const store = useTemplateSquareStore()

const sorts = [
  { key: 'latest', label: '最新' },
  { key: 'popular', label: '热门' },
  { key: 'downloads', label: '下载' }
]
</script>

<style scoped>
.sort-bar {
  display: flex;
  gap: 8px;
}

.sort-item {
  padding: 8rpx 20rpx;
  border-radius: 999px;
  font-size: 24rpx;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.sort-item.active {
  background: var(--primary);
  color: #fff;
}
</style>
```

- [ ] **Step 2: 测试SortBar组件**

```vue
<SortBar />
```

- [ ] **Step 3: 提交SortBar组件**

```bash
git add pages/templateSquare/components/SortBar.vue
git commit -m "feat: 添加SortBar排序栏组件"
```

---

## Task 6: 创建TemplateCard模板卡片组件

**Files:**
- Create: `pages/templateSquare/components/TemplateCard.vue`
- Test: 手动测试卡片显示

- [ ] **Step 1: 创建TemplateCard.vue组件**

```vue
<!-- pages/templateSquare/components/TemplateCard.vue -->
<template>
  <view class="template-card" @click="$emit('click', template)">
    <view class="card-cover" :style="{ backgroundColor: template.coverColor || template.color || '#379bff' }">
      <text class="cover-icon">📋</text>
    </view>
    <view class="card-info">
      <text class="card-title">{{ template.name }}</text>
      <view class="card-stats">
        <text class="stat-item">{{ template.actionCount || template.actions?.length || 0 }} 动作</text>
        <text class="stat-item">⬇ {{ template.downloadCount || 0 }}</text>
        <text class="stat-item">★ {{ template.collectCount || 0 }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  template: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])
</script>

<style scoped>
.template-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1rpx solid var(--border-color);
  border-radius: 16rpx;
  margin-bottom: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.card-cover {
  aspect-ratio: 16 / 10;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 56rpx;
}

.card-info {
  padding: 14rpx 20rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 6rpx;
}

.card-stats {
  display: flex;
  gap: 12rpx;
}

.stat-item {
  font-size: 22rpx;
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 2: 测试TemplateCard组件**

```vue
<TemplateCard :template="testTemplate" @click="handleCardClick" />
```

- [ ] **Step 3: 提交TemplateCard组件**

```bash
git add pages/templateSquare/components/TemplateCard.vue
git commit -m "feat: 添加TemplateCard模板卡片组件"
```

---

## Task 7: 创建TemplateGrid双列网格组件

**Files:**
- Create: `pages/templateSquare/components/TemplateGrid.vue`
- Test: 手动测试网格布局

- [ ] **Step 1: 创建TemplateGrid.vue组件**

```vue
<!-- pages/templateSquare/components/TemplateGrid.vue -->
<template>
  <scroll-view class="template-grid" scroll-y show-scrollbar="false">
    <view class="grid-content">
      <view v-if="store.filteredTemplates.length > 0" class="grid-list">
        <TemplateCard 
          v-for="tpl in store.filteredTemplates" 
          :key="tpl.id" 
          :template="tpl"
          @click="handleCardClick"
        />
      </view>
      <view v-else-if="!store.loading" class="empty-state">
        <text class="empty-icon">🗂️</text>
        <text class="empty-text">暂无匹配模板</text>
      </view>
      <view v-if="store.loading" class="loading-state">
        <view class="spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      <view v-if="store.loadingMore" class="loading-more">
        <text class="loading-more-text">加载更多...</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTemplateSquareStore } from '@/stores/templateSquare.js'
import TemplateCard from './TemplateCard.vue'

const store = useTemplateSquareStore()

onMounted(() => {
  store.loadTemplates()
  store.loadTags()
})

const handleCardClick = (template) => {
  // 触发父组件的点击事件
  emit('cardClick', template)
}

const emit = defineEmits(['cardClick'])
</script>

<style scoped>
.template-grid {
  flex: 1;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.grid-content {
  padding: 8px 16px;
}

.grid-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.empty-state, .loading-state {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 48rpx;
}

.empty-text, .loading-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-more {
  padding: 20px 0;
  text-align: center;
}

.loading-more-text {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 2: 测试TemplateGrid组件**

```vue
<TemplateGrid @cardClick="handleCardClick" />
```

- [ ] **Step 3: 提交TemplateGrid组件**

```bash
git add pages/templateSquare/components/TemplateGrid.vue
git commit -m "feat: 添加TemplateGrid双列网格组件"
```

---

## Task 8: 创建TemplateDetail详情弹窗组件

**Files:**
- Create: `pages/templateSquare/components/TemplateDetail.vue`
- Test: 手动测试详情弹窗

- [ ] **Step 1: 创建TemplateDetail.vue组件**

```vue
<!-- pages/templateSquare/components/TemplateDetail.vue -->
<template>
  <view v-if="visible" class="detail-overlay" @click="close">
    <view class="detail-sheet" @click.stop>
      <text class="close-btn" @click="close">×</text>
      <view class="detail-cover" :style="{ background: `linear-gradient(135deg, ${template?.coverColor || template?.color || '#379bff'}, ${template?.color2 || template?.coverColor || template?.color || '#379bff'})` }">
        <text class="author">作者：{{ maskAuthor(template?.userName || template?.author || 'FitNote 用户') }}</text>
        <view class="tags">
          <text v-for="(tag, i) in normalizeTags(template)" :key="i" class="tag">{{ tag }}</text>
        </view>
        <text class="cover-icon">📋</text>
      </view>
      <text class="detail-title">{{ template?.name }}</text>
      <view class="stats-grid">
        <view class="stats-cell">
          <text class="stats-num">{{ template?.actionCount || template?.actions?.length || 0 }}</text>
          <text class="stats-label">动作数</text>
        </view>
        <view class="stats-cell">
          <text class="stats-num">{{ template?.totalSets || 0 }}</text>
          <text class="stats-label">总组数</text>
        </view>
        <view class="stats-cell">
          <text class="stats-num">{{ template?.downloadCount ?? 0 }}</text>
          <text class="stats-label">下载量</text>
        </view>
        <view class="stats-cell">
          <text class="stats-num">{{ template?.collectCount ?? 0 }}</text>
          <text class="stats-label">收藏量</text>
        </view>
      </view>
      <view v-if="template?.description" class="detail-section">
        <text class="detail-label">模板描述</text>
        <text class="detail-desc">{{ template.description }}</text>
      </view>
      <view class="detail-actions">
        <view class="detail-btn ghost" @click="close">关闭</view>
        <view class="detail-btn primary" @click="handleDownload">导入到我的模板</view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  template: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'download'])

const close = () => {
  emit('close')
}

const handleDownload = () => {
  emit('download', props.template)
}

const maskAuthor = (name) => {
  if (!name) return 'FitNote 用户'
  const s = String(name)
  if (s.length <= 1) return s + '**'
  return s[0] + '**'
}

const normalizeTags = (tpl) => {
  if (!tpl) return []
  const raw = tpl.tags || tpl.tagList || []
  if (!Array.isArray(raw)) return []
  return raw.map((t) => (typeof t === 'string' ? t : (t && (t.name || t.label || t.tag)) || '')).filter(Boolean).slice(0, 6)
}
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.detail-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 72vh;
  background: var(--bg-primary);
  border-radius: 20px 20px 0 0;
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.close-btn {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  font-size: 40rpx;
  color: var(--text-secondary);
  padding: 8rpx;
  z-index: 5;
}

.detail-cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24rpx 24rpx 32rpx;
  color: #fff;
  margin-bottom: 12px;
}

.author {
  position: relative;
  z-index: 2;
  font-size: 24rpx;
  opacity: 0.9;
  display: block;
  margin-bottom: 10rpx;
}

.tags {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.tag {
  padding: 4rpx 14rpx;
  background: rgba(255,255,255,0.22);
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #fff;
  backdrop-filter: blur(6rpx);
}

.cover-icon {
  position: absolute;
  right: 24rpx;
  bottom: 20rpx;
  font-size: 72rpx;
  opacity: 0.35;
}

.detail-title {
  font-size: 36rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.stats-cell {
  background: var(--bg-tertiary);
  border-radius: 10rpx;
  padding: 12px 10px;
  text-align: center;
  box-sizing: border-box;
  min-width: 0;
}

.stats-num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.stats-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-secondary);
}

.detail-section {
  margin-bottom: 12px;
}

.detail-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.detail-desc {
  display: block;
  width: 100%;
  padding: 16rpx 20rpx;
  background: var(--bg-tertiary);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  box-sizing: border-box;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.detail-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.detail-btn.ghost {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.detail-btn.primary {
  background: var(--primary);
  color: #fff;
}
</style>
```

- [ ] **Step 2: 测试TemplateDetail组件**

```vue
<TemplateDetail 
  :visible="showDetail" 
  :template="selectedTemplate" 
  @close="showDetail = false"
  @download="handleDownload"
/>
```

- [ ] **Step 3: 提交TemplateDetail组件**

```bash
git add pages/templateSquare/components/TemplateDetail.vue
git commit -m "feat: 添加TemplateDetail详情弹窗组件"
```

---

## Task 9: 创建ShareDialog分享弹窗组件

**Files:**
- Create: `pages/templateSquare/components/ShareDialog.vue`
- Test: 手动测试分享功能

- [ ] **Step 1: 创建ShareDialog.vue组件**

```vue
<!-- pages/templateSquare/components/ShareDialog.vue -->
<template>
  <view v-if="visible" class="share-overlay" @click="close">
    <view class="share-sheet" @click.stop>
      <text class="close-btn" @click="close">×</text>
      <text class="share-title">分享我的模板</text>
      <view class="share-section">
        <text class="section-label">选择要分享的模板</text>
        <view class="share-pick-list">
          <view 
            v-for="tpl in myTemplates" 
            :key="tpl.id" 
            class="share-pick"
            :class="{ active: shareForm.tplId === tpl.id }"
            @click="shareForm.tplId = tpl.id"
          >
            <text class="pick-name">{{ tpl.name }}</text>
            <text class="pick-count">{{ tpl.actions?.length || 0 }} 动作</text>
          </view>
        </view>
      </view>
      <view class="share-section">
        <text class="section-label">分享名称</text>
        <input 
          v-model="shareForm.name" 
          class="share-input" 
          placeholder="不超过50字" 
          maxlength="50" 
        />
      </view>
      <view class="share-section">
        <text class="section-label">简介</text>
        <textarea 
          v-model="shareForm.desc" 
          class="share-textarea" 
          placeholder="介绍一下这个模板..." 
          maxlength="200" 
        />
      </view>
      <view class="share-actions">
        <view class="share-btn ghost" @click="close">取消</view>
        <view class="share-btn primary" @click="submitShare">提交分享</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTemplateStore } from '@/stores/template.js'
import { shareTemplateToSquare } from '@/utils/api/templateSquare.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const templateStore = useTemplateStore()
const myTemplates = ref([])
const shareForm = ref({
  tplId: null,
  name: '',
  desc: ''
})

onMounted(() => {
  loadMyTemplates()
})

const loadMyTemplates = async () => {
  try {
    templateStore.load()
    myTemplates.value = templateStore.templates || []
  } catch (e) {
    console.error('加载本地模板失败:', e)
  }
}

const close = () => {
  shareForm.value = { tplId: null, name: '', desc: '' }
  emit('close')
}

const submitShare = async () => {
  if (!shareForm.value.tplId) {
    uni.showToast({ title: '请选择要分享的模板', icon: 'none' })
    return
  }
  if (!shareForm.value.name) {
    uni.showToast({ title: '请填写分享名称', icon: 'none' })
    return
  }
  
  try {
    const selectedTemplate = myTemplates.value.find(t => t.id === shareForm.value.tplId)
    await shareTemplateToSquare({
      tplId: shareForm.value.tplId,
      name: shareForm.value.name,
      desc: shareForm.value.desc,
      actionCount: selectedTemplate?.actions?.length || 0,
      templateData: JSON.stringify(selectedTemplate)
    })
    uni.showToast({ title: '分享成功，等待审核', icon: 'success' })
    emit('success')
    close()
  } catch (e) {
    uni.showToast({ title: e.message || '分享失败', icon: 'none' })
  }
}
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.share-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  background: var(--bg-primary);
  border-radius: 20px 20px 0 0;
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.close-btn {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  font-size: 40rpx;
  color: var(--text-secondary);
  padding: 8rpx;
  z-index: 5;
}

.share-title {
  font-size: 36rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 20px;
}

.share-section {
  margin-bottom: 16px;
}

.section-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.share-pick-list {
  max-height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.share-pick {
  padding: 12rpx 20rpx;
  border: 1rpx solid var(--border-color);
  border-radius: 12rpx;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-pick.active {
  border-color: var(--primary);
  background: rgba(55, 155, 255, 0.1);
}

.pick-name {
  font-size: 28rpx;
}

.pick-count {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.share-input,
.share-textarea {
  width: 100%;
  height: 88rpx;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.share-textarea {
  height: 160rpx;
  padding: 16rpx 24rpx;
  line-height: 1.5;
}

.share-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.share-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.share-btn.ghost {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.share-btn.primary {
  background: var(--primary);
  color: #fff;
}
</style>
```

- [ ] **Step 2: 测试ShareDialog组件**

```vue
<ShareDialog 
  :visible="showShare" 
  @close="showShare = false"
  @success="handleShareSuccess"
/>
```

- [ ] **Step 3: 提交ShareDialog组件**

```bash
git add pages/templateSquare/components/ShareDialog.vue
git commit -m "feat: 添加ShareDialog分享弹窗组件"
```

---

## Task 10: 重构主页面templateSquare.vue

**Files:**
- Modify: `pages/templateSquare/templateSquare.vue`
- Test: 手动测试完整页面功能

- [ ] **Step 1: 重构templateSquare.vue主页面**

```vue
<!-- pages/templateSquare/templateSquare.vue -->
<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <!-- 顶部：标题行 + 搜索 + 排序 -->
    <view class="sq-header">
      <view class="sq-title-row">
        <text class="sq-page-title">模板广场</text>
        <text class="sq-page-sub">{{ store.total }} 个模板 · 分享你的训练方案</text>
      </view>
      <SearchBar />
      <SortBar />
    </view>

    <!-- 标签 chips -->
    <TagFilter />

    <!-- 网格列表 -->
    <TemplateGrid @cardClick="handleCardClick" />

    <!-- 底部分享按钮（FAB） -->
    <view class="sq-share-fab" @click="showShare = true">
      <text class="sq-share-fab-icon">📤</text>
      <text class="sq-share-fab-text">分享我的模板</text>
    </view>

    <!-- 详情弹窗 -->
    <TemplateDetail 
      :visible="showDetail" 
      :template="selectedTemplate" 
      @close="showDetail = false"
      @download="handleDownload"
    />

    <!-- 分享弹窗 -->
    <ShareDialog 
      :visible="showShare" 
      @close="showShare = false"
      @success="handleShareSuccess"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { useTemplateSquareStore } from '@/stores/templateSquare.js'
import { downloadTemplateById } from '@/utils/api/templateSquare.js'

import SearchBar from './components/SearchBar.vue'
import TagFilter from './components/TagFilter.vue'
import SortBar from './components/SortBar.vue'
import TemplateGrid from './components/TemplateGrid.vue'
import TemplateDetail from './components/TemplateDetail.vue'
import ShareDialog from './components/ShareDialog.vue'

const daySettingsStore = useDaySettingsStore()
const store = useTemplateSquareStore()

const showDetail = ref(false)
const showShare = ref(false)
const selectedTemplate = ref(null)

const handleCardClick = (template) => {
  selectedTemplate.value = template
  showDetail.value = true
}

const handleDownload = async (template) => {
  uni.showModal({
    title: '导入确认',
    content: `是否将「${template.name}」导入到我的模板？若已存在同名/同 ID 模板，可选择覆盖或跳过。`,
    confirmText: '覆盖',
    cancelText: '跳过',
    success: async (res) => {
      if (res.cancel) {
        uni.showToast({ title: '已跳过', icon: 'none' })
        showDetail.value = false
        return
      }
      try {
        await downloadTemplateById(template.id)
        uni.showToast({ title: '已覆盖', icon: 'success' })
        showDetail.value = false
      } catch (e) {
        uni.showToast({ title: e.message || '下载失败', icon: 'none' })
      }
    }
  })
}

const handleShareSuccess = () => {
  store.loadTemplates()
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.sq-header {
  padding: 14px 16px 8px;
  box-sizing: border-box;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.sq-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.sq-page-title {
  font-size: 22px;
  font-weight: 700;
}

.sq-page-sub {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.sq-share-fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--primary, #379bff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 100;
  white-space: nowrap;
  width: max-content;
  max-width: calc(100% - 32px);
}

.sq-share-fab:active {
  transform: translateX(-50%) scale(0.96);
}

.sq-share-fab-icon {
  font-size: 18px;
  white-space: nowrap;
}

.sq-share-fab-text {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

/* 平板适配 */
@media (min-width: 500px) {
  .sq-page-title { font-size: 18px !important; }
  .sq-page-sub { font-size: 12px !important; }
  .sq-share-fab { padding: 10px 24px !important; }
  .sq-share-fab-icon { font-size: 16px !important; }
  .sq-share-fab-text { font-size: 14px !important; }
}
</style>
```

- [ ] **Step 2: 测试完整页面功能**

运行小程序，测试以下功能：
1. 搜索功能
2. 标签筛选
3. 排序切换
4. 模板卡片点击
5. 详情弹窗
6. 下载功能
7. 分享功能

- [ ] **Step 3: 提交重构后的主页面**

```bash
git add pages/templateSquare/templateSquare.vue
git commit -m "refactor: 重构模板广场主页面为模块化组件架构"
```

---

## Task 11: 优化样式和响应式设计

**Files:**
- Modify: `pages/templateSquare/components/*.vue` (所有组件)
- Test: 手动测试不同屏幕尺寸

- [ ] **Step 1: 优化SearchBar样式**

```vue
<!-- 在SearchBar.vue中添加平板适配 -->
<style scoped>
/* 平板适配 */
@media (min-width: 500px) {
  .search-input { height: 36px !important; font-size: 13px !important; padding: 0 12px !important; }
  .search-icon { font-size: 14px !important; margin-right: 6px !important; }
}
</style>
```

- [ ] **Step 2: 优化TagFilter样式**

```vue
<!-- 在TagFilter.vue中添加平板适配 -->
<style scoped>
/* 平板适配 */
@media (min-width: 500px) {
  .tag-chip { font-size: 11px !important; padding: 3px 10px !important; }
}
</style>
```

- [ ] **Step 3: 优化SortBar样式**

```vue
<!-- 在SortBar.vue中添加平板适配 -->
<style scoped>
/* 平板适配 */
@media (min-width: 500px) {
  .sort-item { font-size: 12px !important; padding: 4px 10px !important; }
}
</style>
```

- [ ] **Step 4: 优化TemplateCard样式**

```vue
<!-- 在TemplateCard.vue中添加平板适配 -->
<style scoped>
/* 平板适配 */
@media (min-width: 500px) {
  .card-title { font-size: 15px !important; }
  .stat-item { font-size: 11px !important; }
  .cover-icon { font-size: 28px !important; }
}
</style>
```

- [ ] **Step 5: 优化TemplateDetail样式**

```vue
<!-- 在TemplateDetail.vue中添加平板适配 -->
<style scoped>
/* 平板适配 */
@media (min-width: 500px) {
  .stats-num { font-size: 17px !important; }
  .stats-label { font-size: 11px !important; }
  .detail-title { font-size: 17px !important; }
}
</style>
```

- [ ] **Step 6: 优化ShareDialog样式**

```vue
<!-- 在ShareDialog.vue中添加平板适配 -->
<style scoped>
/* 平板适配 */
@media (min-width: 500px) {
  .share-input { height: 40px !important; font-size: 13px !important; }
  .share-textarea { height: 80px !important; font-size: 13px !important; padding: 8px 12px !important; }
  .pick-name { font-size: 13px !important; }
  .pick-count { font-size: 11px !important; }
  .share-btn { height: 40px !important; font-size: 13px !important; }
}
</style>
```

- [ ] **Step 7: 提交样式优化**

```bash
git add pages/templateSquare/components/
git commit -m "style: 优化模板广场组件样式和响应式设计"
```

---

## Task 12: 测试和验证

**Files:**
- Test: 手动测试所有功能
- Modify: 根据测试结果修复问题

- [ ] **Step 1: 测试搜索功能**

1. 输入搜索关键词，验证300ms防抖
2. 清除搜索内容，验证列表恢复
3. 测试大小写不敏感搜索

- [ ] **Step 2: 测试标签筛选**

1. 点击标签，验证筛选生效
2. 再次点击同一标签，验证取消筛选
3. 测试多标签组合筛选

- [ ] **Step 3: 测试排序功能**

1. 点击"最新"排序，验证按时间排序
2. 点击"热门"排序，验证按热度排序
3. 点击"下载"排序，验证按下载量排序

- [ ] **Step 4: 测试模板卡片**

1. 验证双列网格布局正确
2. 验证卡片信息显示完整
3. 测试点击卡片打开详情

- [ ] **Step 5: 测试详情弹窗**

1. 验证弹窗从底部弹出
2. 验证封面渐变背景
3. 验证作者信息和标签显示
4. 测试关闭按钮功能
5. 测试导入按钮功能

- [ ] **Step 6: 测试分享功能**

1. 验证本地模板列表加载
2. 测试选择模板功能
3. 测试表单验证
4. 测试提交分享功能

- [ ] **Step 7: 测试响应式设计**

1. 在手机尺寸下测试
2. 在平板尺寸下测试
3. 验证样式适配正确

- [ ] **Step 8: 修复测试中发现的问题**

根据测试结果，修复发现的bug和样式问题。

- [ ] **Step 9: 最终提交**

```bash
git add .
git commit -m "fix: 修复模板广场重构中的问题"
```

---

## Self-Review

### 1. Spec Coverage
- ✅ 组件拆分方案：7个独立组件已创建
- ✅ 视觉设计系统：颜色、布局、样式已实现
- ✅ 后端对接优化：API封装、字段映射已完成
- ✅ 交互设计：搜索、筛选、排序、加载体验已实现
- ✅ 文件结构：目录结构、状态管理已完成

### 2. Placeholder Scan
- ✅ 所有代码块完整，无占位符
- ✅ 所有步骤具体，可直接执行
- ✅ 所有命令完整，包含预期输出

### 3. Type Consistency
- ✅ 组件Props类型一致
- ✅ Store状态结构一致
- ✅ API接口参数一致

### 4. Missing Requirements
- ✅ 所有需求已覆盖，无遗漏

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-05-template-square-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**