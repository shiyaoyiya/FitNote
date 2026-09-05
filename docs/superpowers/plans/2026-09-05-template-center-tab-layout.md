# 模板中心 Tab 布局实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将模板管理页面改造为 Tab 分页布局，包含"本地模板"和"模板广场"两个子页面，采用类似备份页面的布局风格。

**Architecture:** 组件化拆分，将 templateManager.vue 拆分为三个组件：Tab 容器、本地模板、模板广场。完全复制备份页面的 Tab 布局代码，包括手势滑动和高亮框动画。

**Tech Stack:** Vue 2, UniApp, Pinia, 备份页面 Tab 布局代码复用

---

### Task 1: 创建 LocalTemplates.vue 组件

**Files:**
- Create: `pages/templateManager/components/LocalTemplates.vue`

- [ ] **Step 1: 创建 LocalTemplates.vue 组件骨架**

```vue
<template>
  <view class="local-templates-container">
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else class="mid-scroll">
      <movable-area v-if="showList" class="movable-area"
        :style="{ height: filteredTemplates.length * rowHeight + 'px' }">
        <view v-for="(item, index) in filteredTemplates" :key="'slot'+index" class="item-slot"
          :style="{ top: index * rowHeight + 'px' }"></view>

        <movable-view v-for="(tpl, idx) in filteredTemplates" :key="tpl.id" direction="vertical" class="movable-item"
          :y="itemY[idx]" :disabled="!isDragMode" :class="{ 'is-dragging': dragIdx === idx }"
          @change="onDragMove($event, idx)" @touchend="isDragMode ? onDragEnd() : null">
          <view class="slide-wrapper">
            <view class="delete-btn-container">
              <view class="delete-btn" @click.stop="handleDelete(idx)"
                :style="{ display: isDragMode ? 'none' : 'flex' }">
                删除
              </view>
            </view>
            <view class="action-card" :style="{ transform: 'translateX(' + (slideOffset[idx] || 0) + 'px)' }"
              @touchstart="onTouchStart($event, idx)" @touchmove="onTouchMove($event, idx)"
              @touchend="onTouchEnd($event, idx)" @longpress="onDragTrigger(idx)">
              <view class="card-color-bar" :style="{ backgroundColor: tpl.color || '#555' }"></view>
              <view class="card-info">
                <text class="card-name">{{ tpl.name }}</text>
                <text class="card-count">{{ tpl.actions ? tpl.actions.length : 0 }} 个动作</text>
              </view>
              <text class="card-arrow">›</text>
            </view>
          </view>
        </movable-view>

        <view v-if="filteredTemplates.length === 0" class="empty-state-inside">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无模板，快去创建一个吧~</text>
        </view>
      </movable-area>
    </view>

    <view class="bottom-bar">
      <view class="btn-import-export" @click="openImportExportPanel">
        <text class="btn-icon">📤</text>
        <text class="btn-label">导入/导出</text>
      </view>
      <view class="btn-create" @click="openCreatePanel">
        <text class="btn-create-icon">+</text>
        <text class="btn-create-label">新建模板</text>
      </view>
    </view>

    <!-- 弹窗组件保持不变 -->
  </view>
</template>

<script>
import { useTemplateStore } from '@/stores/template.js'
import { useActionStore } from '@/stores/action.js'
import { useDaySettingsStore } from '@/stores/daySettings.js'

export default {
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      templateStore: useTemplateStore(),
      actionStore: useActionStore(),
      loading: false,
      showList: true,
      filteredTemplates: [],
      itemY: [],
      isDragMode: false,
      dragIdx: -1,
      slideOffset: [],
      rowHeight: 70,
      showCreatePanel: false,
      showImportExportPanel: false,
      newTemplateName: '',
      searchTerm: '',
      activeCategory: 'all',
      selectedActions: [],
      categories: [],
      categoryCounts: {},
      filteredActions: [],
    }
  },
  computed: {
    // 计算属性保持不变
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    loadData() {
      this.loading = true
      try {
        this.templateStore.load()
        this.actionStore.load()
        this.filteredTemplates = this.templateStore.templates || []
        this.initDragState()
        this.loadCategories()
      } catch (e) {
        console.error('加载数据失败:', e)
      } finally {
        this.loading = false
      }
    },
    initDragState() {
      this.itemY = this.filteredTemplates.map((_, i) => i * this.rowHeight)
      this.slideOffset = this.filteredTemplates.map(() => 0)
    },
    loadCategories() {
      // 加载分类逻辑
    },
    // 其他方法保持不变
  }
}
</script>

<style scoped>
/* 样式保持不变 */
</style>
```

- [ ] **Step 2: 复制原有 templateManager.vue 的完整逻辑**

从 `pages/templateManager/templateManager.vue` 复制以下内容到 LocalTemplates.vue：
- 完整的 data() 对象
- 所有 computed 属性
- 所有 methods 方法
- 所有样式

- [ ] **Step 3: 测试 LocalTemplates.vue 组件**

在 templateManager.vue 中临时引入 LocalTemplates.vue 组件，验证功能正常。

- [ ] **Step 4: 提交 LocalTemplates.vue 组件**

```bash
git add pages/templateManager/components/LocalTemplates.vue
git commit -m "feat: 创建 LocalTemplates.vue 组件，提取本地模板功能"
```

### Task 2: 创建 TemplateSquareTab.vue 组件

**Files:**
- Create: `pages/templateManager/components/TemplateSquareTab.vue`

- [ ] **Step 1: 创建 TemplateSquareTab.vue 组件骨架**

```vue
<template>
  <view class="template-square-tab-container">
    <!-- 从 pages/templateSquare/templateSquare.vue 复制完整内容 -->
    <view class="sq-header">
      <view class="sq-title-row">
        <text class="sq-page-title">模板广场</text>
        <text class="sq-page-sub">{{ total }} 个模板 · 分享你的训练方案</text>
      </view>
      <view class="sq-search-bar">
        <text class="sq-search-icon">🔍</text>
        <input v-model="search" class="sq-search-input" placeholder="搜索模板名 / 动作 / 标签" />
        <text v-if="search" class="sq-clear" @click="search = ''">×</text>
      </view>
      <view class="sq-sort">
        <view
          v-for="s in sorts" :key="s.key"
          class="sq-sort-item"
          :class="{ active: sort === s.key }"
          @click="sort = s.key"
        >{{ s.label }}</view>
      </view>
    </view>

    <!-- 标签 chips -->
    <scroll-view class="sq-tags" scroll-x show-scrollbar="false" @touchmove.stop>
      <view class="sq-tags-inner">
        <view
          v-for="t in tags" :key="t"
          class="sq-tag-chip"
          :class="{ active: activeTag === t }"
          @click="activeTag = activeTag === t ? '' : t"
        >{{ t }}</view>
      </view>
    </scroll-view>

    <!-- 网格列表 -->
    <scroll-view class="sq-list" scroll-y show-scrollbar="false">
      <view class="sq-list-content" :class="animClass" :key="search + sort + activeTag">
        <view v-if="filtered.length > 0">
          <view
            v-for="tpl in filtered"
            :key="tpl.id"
            class="sq-tpl-card"
            @click="openDetail(tpl)"
          >
            <view class="sq-tpl-cover" :style="{ backgroundColor: tpl.color || '#379bff' }">
              <text class="sq-tpl-cover-icon">📋</text>
            </view>
            <view class="sq-tpl-info">
              <text class="sq-tpl-title">{{ tpl.name }}</text>
              <view class="sq-tpl-stats">
                <text class="sq-tpl-stat">{{ tpl.actions?.length || 0 }} 动作</text>
                <text class="sq-tpl-stat">⬇ {{ tpl.downloadCount || 0 }}</text>
                <text class="sq-tpl-stat">★ {{ tpl.collectCount || 0 }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="sq-empty">
          <text class="sq-empty-icon">🗂️</text>
          <text class="sq-empty-text">暂无匹配模板</text>
        </view>
        <view v-if="loading" class="sq-loading">
          <view class="sq-spinner"></view>
          <text class="sq-loading-text">加载中...</text>
        </view>
      </view>
      <view class="sq-list-bottom-space"></view>
    </scroll-view>

    <!-- 底部分享按钮（FAB） -->
    <view class="sq-share-fab" @click="openShare">
      <text class="sq-share-fab-icon">📤</text>
      <text class="sq-share-fab-text">分享我的模板</text>
    </view>

    <!-- 详情/分享弹窗 -->
    <!-- 从 templateSquare.vue 复制弹窗部分 -->
  </view>
</template>

<script>
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { useTemplateStore } from '@/stores/template.js'
import { listSquareTemplates, shareTemplate, downloadTemplate, listTemplateTags } from '@/utils/serverCommunity.js'

export default {
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      templateStore: useTemplateStore(),
      loading: false,
      templates: [],
      tags: [],
      total: 0,
      search: '',
      sort: 'latest',
      sorts: [
        { key: 'latest', label: '最新' },
        { key: 'popular', label: '热门' },
        { key: 'downloads', label: '下载' },
      ],
      activeTag: '',
      page: 1,
      pageSize: 20,
      showDetail: false,
      showShare: false,
      detailTpl: null,
      myTemplates: [],
      shareForm: { tplId: null, name: '', desc: '' },
      animClass: '',
    }
  },
  computed: {
    filtered() {
      let arr = this.templates
      if (this.search) {
        const kw = this.search.toLowerCase()
        arr = arr.filter(t => (t.name || '').toLowerCase().includes(kw)
          || (t.actions || []).some(a => (a.name || '').toLowerCase().includes(kw)))
      }
      if (this.activeTag) {
        arr = arr.filter(t => (t.tags || []).includes(this.activeTag))
      }
      return arr
    },
  },
  onLoad() {
    this.loadData()
    this.loadTags()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const res = await listSquareTemplates({
          page: this.page,
          pageSize: this.pageSize,
          sort: this.sort,
        })
        this.templates = res.list || []
        this.total = res.total || 0
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadTags() {
      try {
        this.tags = await listTemplateTags()
      } catch (e) {
        this.tags = []
      }
    },
    // 其他方法保持不变
  },
}
</script>

<style scoped>
/* 从 templateSquare.vue 复制所有样式 */
</style>
```

- [ ] **Step 2: 复制原有 templateSquare.vue 的完整逻辑**

从 `pages/templateSquare/templateSquare.vue` 复制以下内容到 TemplateSquareTab.vue：
- 完整的 data() 对象
- 所有 computed 属性
- 所有 methods 方法
- 所有样式

- [ ] **Step 3: 测试 TemplateSquareTab.vue 组件**

在 templateManager.vue 中临时引入 TemplateSquareTab.vue 组件，验证功能正常。

- [ ] **Step 4: 提交 TemplateSquareTab.vue 组件**

```bash
git add pages/templateManager/components/TemplateSquareTab.vue
git commit -m "feat: 创建 TemplateSquareTab.vue 组件，提取模板广场功能"
```

### Task 3: 改造 templateManager.vue 为 Tab 容器

**Files:**
- Modify: `pages/templateManager/templateManager.vue`

- [ ] **Step 1: 备份原有 templateManager.vue**

```bash
cp pages/templateManager/templateManager.vue pages/templateManager/templateManager.vue.bak
```

- [ ] **Step 2: 重写 templateManager.vue 为 Tab 容器**

```vue
<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }"
    @touchstart="onPageTouchStart" @touchmove="onPageTouchMove" @touchend="onPageTouchEnd">
    <!-- 顶部 Tab 栏 + 高亮框 -->
    <view class="tab-bar" :class="{ 'no-transition': swipeNoTransition }">
      <view
        v-for="(t, i) in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: activeTab === t.key }"
        @click="switchTab(t.key, true)"
      >
        <text class="tab-label">{{ t.label }}</text>
      </view>
      <view
        class="tab-highlight"
        :style="tabHighlightStyle"
      ></view>
    </view>

    <!-- Tab 内容 -->
    <view v-show="activeTab === 'local'" class="tab-content">
      <LocalTemplates />
    </view>

    <view v-show="activeTab === 'square'" class="tab-content">
      <TemplateSquareTab />
    </view>
  </view>
</template>

<script>
import { useDaySettingsStore } from '@/stores/daySettings.js'
import LocalTemplates from './components/LocalTemplates.vue'
import TemplateSquareTab from './components/TemplateSquareTab.vue'

export default {
  components: {
    LocalTemplates,
    TemplateSquareTab
  },
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      activeTab: 'local',
      tabs: [
        { key: 'local', label: '📁 本地模板' },
        { key: 'square', label: '🏪 模板广场' },
      ],
      // 手势滑动相关数据
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartTime: 0,
      swipeDeltaX: 0,
      swipeViewWidth: 0,
      swipeNoTransition: false,
      swipeIsTracking: false,
      tabRects: [],
      tabRectsMeasured: false,
    }
  },
  computed: {
    activeIndex() {
      return this.tabs.findIndex(t => t.key === this.activeTab)
    },
    tabHighlightStyle() {
      if (!this.tabRectsMeasured || this.tabRects.length === 0) return { opacity: 0 }
      const curIdx = this.activeIndex
      if (curIdx < 0) return { opacity: 0 }
      const cur = this.tabRects[curIdx]
      if (!cur) return { opacity: 0 }
      let left = cur.left
      let width = cur.width
      if (this.swipeDeltaX !== 0 && this.swipeViewWidth > 0) {
        const dir = this.swipeDeltaX > 0 ? -1 : 1
        const nextIdx = curIdx + dir
        if (nextIdx >= 0 && nextIdx < this.tabRects.length) {
          const next = this.tabRects[nextIdx]
          const progress = Math.min(Math.abs(this.swipeDeltaX) / (this.swipeViewWidth * 0.3), 1)
          left = cur.left + (next.left - cur.left) * progress
          width = cur.width + (next.width - cur.width) * progress
        } else {
          left = cur.left + this.swipeDeltaX * 0.2
        }
      }
      return {
        transform: `translateX(${left}px)`,
        width: `${width}px`,
        opacity: 1,
      }
    },
  },
  onLoad() {
    this.daySettingsStore.load()
    this.measureTabRects()
  },
  onShow() {
    this.measureTabRects()
  },
  methods: {
    // 手势滑动方法（从备份页面复制）
    measureTabRects() {
      this.$nextTick(() => {
        setTimeout(() => {
          const query = uni.createSelectorQuery().in(this)
          query.select('.tab-bar').boundingClientRect()
          query.selectAll('.tab-item').boundingClientRect()
          query.exec(res => {
            const container = res && res[0]
            const items = res && res[1]
            if (container && items && items.length > 0) {
              this.tabRects = items.map(it => ({
                left: it.left - container.left,
                width: it.width,
              }))
              this.tabRectsMeasured = true
              this.swipeViewWidth = container.width
            }
          })
        }, 50)
      })
    },

    onPageTouchStart(e) {
      if (e.touches.length !== 1) return
      this.swipeStartX = e.touches[0].pageX
      this.swipeStartY = e.touches[0].pageY
      this.swipeStartTime = Date.now()
      this.swipeDeltaX = 0
      this.swipeNoTransition = true
      this.swipeIsTracking = true
      if (!this.tabRectsMeasured) this.measureTabRects()
    },

    onPageTouchMove(e) {
      if (!this.swipeIsTracking || e.touches.length !== 1) return
      const dx = e.touches[0].pageX - this.swipeStartX
      const dy = e.touches[0].pageY - this.swipeStartY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx <= absDy * 1.9) return
      this.swipeDeltaX = dx
      if (e.cancelable) e.preventDefault()
    },

    onPageTouchEnd(e) {
      if (!this.swipeIsTracking) return
      this.swipeIsTracking = false
      this.swipeNoTransition = false
      const dx = this.swipeDeltaX
      const absDx = Math.abs(dx)
      const dt = Date.now() - this.swipeStartTime
      const distThreshold = this.swipeViewWidth * 0.15
      const speedThreshold = 0.3
      if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
        this.swipeDeltaX = 0
        return
      }
      const dir = dx > 0 ? -1 : 1
      const nextIdx = this.activeIndex + dir
      if (nextIdx < 0 || nextIdx >= this.tabs.length) {
        this.swipeDeltaX = 0
        return
      }
      this.swipeDeltaX = 0
      uni.vibrateShort()
      this.switchTab(this.tabs[nextIdx].key, false)
      this.measureTabRects()
    },

    switchTab(key, fromClick) {
      if (fromClick) {
        uni.vibrateShort()
      }
      this.activeTab = key
      this.measureTabRects()
    },
  },
}
</script>

<style scoped>
/* 从备份页面复制 Tab 样式 */
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

.tab-bar {
  position: relative;
  display: flex;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.tab-item {
  position: relative;
  z-index: 1;
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 14px;
  transition: color 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tab-item.active {
  color: #ffffff;
}

.tab-item:active {
  transform: scale(0.97);
}

.tab-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  background: var(--primary);
  border-radius: 8px;
  z-index: 0;
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}

.tab-bar.no-transition .tab-highlight {
  transition: none;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>
```

- [ ] **Step 3: 测试 Tab 容器功能**

测试以下功能：
1. Tab 切换是否正常
2. 手势滑动是否正常
3. 高亮框动画是否正常
4. 子组件是否正常渲染

- [ ] **Step 4: 提交 templateManager.vue 改造**

```bash
git add pages/templateManager/templateManager.vue
git commit -m "feat: 改造 templateManager.vue 为 Tab 容器，支持手势滑动切换"
```

### Task 4: 更新路由配置

**Files:**
- Modify: `pages.json`

- [ ] **Step 1: 更新导航栏标题**

在 `pages.json` 中找到 templateManager 页面配置，将 title 改为 "模板中心"：

```json
{
  "path": "pages/templateManager/templateManager",
  "style": {
    "navigationBarTitleText": "模板中心"
  }
}
```

- [ ] **Step 2: 测试路由配置**

测试页面标题是否正确显示为"模板中心"。

- [ ] **Step 3: 提交路由配置更新**

```bash
git add pages.json
git commit -m "feat: 更新模板管理页面标题为模板中心"
```

### Task 5: 整体测试和优化

**Files:**
- No new files

- [ ] **Step 1: 功能测试**

测试以下功能：
1. Tab 切换功能
2. 手势滑动切换
3. 高亮框动画
4. 本地模板功能（CRUD、拖拽排序、侧滑删除）
5. 模板广场功能（搜索、筛选、下载、分享）

- [ ] **Step 2: 性能测试**

测试以下性能指标：
1. Tab 切换响应时间
2. 列表滚动流畅度
3. 内存占用情况

- [ ] **Step 3: 兼容性测试**

测试以下环境：
1. 微信小程序
2. 不同屏幕尺寸
3. 暗色模式

- [ ] **Step 4: 代码清理**

删除备份文件和临时文件：
```bash
rm pages/templateManager/templateManager.vue.bak
```

- [ ] **Step 5: 最终提交**

```bash
git add .
git commit -m "feat: 完成模板中心 Tab 布局改造，支持本地模板和模板广场"
```

## 关键代码参考

### 备份页面 Tab 布局
**文件**：`pages/backup/backup.vue`
**关键代码段**：
- Tab 栏和高亮框：第 5-19 行
- 手势滑动实现：第 335-407 行
- Tab 切换逻辑：第 409-418 行

### 模板广场页面
**文件**：`pages/templateSquare/templateSquare.vue`
**关键代码段**：
- 页面布局：第 1-158 行
- 数据加载：第 211-226 行
- 详情弹窗：第 79-127 行

### 模板管理页面
**文件**：`pages/templateManager/templateManager.vue`
**关键代码段**：
- 模板列表：第 10-43 行
- 拖拽排序：第 16-37 行
- 底部操作栏：第 46-55 行

## 注意事项

1. **代码复用**：尽量复用现有代码，避免重复开发
2. **样式一致性**：保持与现有页面风格一致
3. **性能考虑**：避免不必要的重新渲染
4. **兼容性**：确保在微信小程序环境正常运行
5. **可维护性**：组件职责清晰，代码结构合理

## 成功标准

1. ✅ Tab 分页布局正常工作
2. ✅ 手势滑动切换流畅
3. ✅ 高亮框动画正常
4. ✅ 本地模板功能完整
5. ✅ 模板广场功能完整
6. ✅ 暗色模式正常
7. ✅ 性能无明显下降
8. ✅ 代码可维护性提升
