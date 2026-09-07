<template>
  <view class="template-square-tab-container">
    <!-- 顶部：标题行 + 搜索 + 排序 -->
    <view class="sq-header">
      <view class="sq-title-row">
        <text class="sq-page-title">模板广场</text>
        <text class="sq-page-sub">{{ total }} 个模板 · 分享你的训练方案</text>
      </view>
      <view class="sq-search-bar">
        <text class="sq-search-icon">🔍</text>
        <input v-model="search" class="sq-search-input" placeholder="搜索模板名 / 动作 / 标签" @input="onSearchInput" />
        <text v-if="search" class="sq-clear" @click="clearSearch">×</text>
      </view>
      <view class="sq-sort-row">
        <view class="sq-sort">
          <view v-for="s in sorts" :key="s.key" class="sq-sort-item" :class="{ active: sort === s.key }"
            @click="setSort(s.key)">{{ s.label }}</view>
        </view>
        <picker :range="tagNames" :value="tagPickerIndex" @change="onTagPick" class="sq-tag-picker">
          <view class="sq-tag-picker-btn">
            <text class="sq-tag-picker-text">{{ activeTagName || '全部部位' }}</text>
            <text class="sq-tag-picker-arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <!-- 双列网格列表 -->
    <scroll-view class="sq-list" scroll-y show-scrollbar="false">
      <view class="sq-list-content" :class="animClass" :key="search + sort + activeTag">
        <view v-if="filtered.length > 0" class="sq-grid">
          <view v-for="tpl in filtered" :key="tpl.id" class="sq-tpl-card" @click="openDetail(tpl)">
            <view class="sq-tpl-cover" :style="{ backgroundColor: tpl.coverColor || '#379bff' }">
              <text class="sq-tpl-cover-icon">📋</text>
              <view v-if="tpl.isOfficial" class="sq-official-badge">官方</view>
            </view>
            <view class="sq-tpl-info">
              <text class="sq-tpl-title">{{ tpl.name }}</text>
              <view class="sq-tpl-stats">
                <text class="sq-tpl-stat">{{ tpl.actionCount ?? tpl.actions?.length ?? 0 }}动作</text>
                <text class="sq-tpl-stat">⬇{{ tpl.downloadCount ?? tpl.downloads ?? 0 }}</text>
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
    <view v-if="showDetail" class="sq-detail-overlay" @click="closeDetail">
      <view class="sq-detail-sheet" @click.stop>
        <text class="close-btn" @click="closeDetail">×</text>
        <view class="sq-detail-cover"
          :style="{ background: `linear-gradient(135deg, ${detailTpl?.coverColor || '#379bff'}, ${detailTpl?.coverColor || '#379bff'})` }">
          <text class="sqd-author">作者：{{ maskAuthor(detailTpl?.userName || 'FitNote 用户') }}</text>
          <view class="sqd-tags">
            <text v-for="(tg, i) in normalizeTags(detailTpl)" :key="i" class="sqd-tag">{{ tg }}</text>
          </view>
          <text class="sq-detail-cover-icon">📋</text>
        </view>
        <text class="sq-detail-title">{{ detailTpl?.name }}</text>
        <view class="sq-stats-grid">
          <view class="sq-stats-cell">
            <text class="sq-stats-num">{{ detailTpl?.actionCount ?? detailActions.length }}</text>
            <text class="sq-stats-label">动作数</text>
          </view>
          <view class="sq-stats-cell">
            <text class="sq-stats-num">{{ detailTotalSets }}</text>
            <text class="sq-stats-label">总组数</text>
          </view>
          <view class="sq-stats-cell">
            <text class="sq-stats-num">{{ detailTpl?.downloadCount ?? detailTpl?.downloads ?? 0 }}</text>
            <text class="sq-stats-label">下载量</text>
          </view>
          <view class="sq-stats-cell">
            <text class="sq-stats-num">{{ detailTpl?.collectCount ?? detailTpl?.likes ?? 0 }}</text>
            <text class="sq-stats-label">收藏量</text>
          </view>
        </view>
        <view class="sq-detail-actions-preview">
          <view class="sqd-section-title">动作清单</view>
          <view class="sqd-action-list">
            <view v-for="(a, i) in detailActions" :key="i" class="sqd-action-row">
              <text class="sqd-action-index">{{ i + 1 }}</text>
              <text class="sqd-action-name">{{ a.name }}</text>
              <text class="sqd-action-sets">{{ a.sets }}组</text>
            </view>
          </view>
        </view>
        <view class="sq-detail-section" v-if="detailTpl?.description">
          <text class="sq-detail-label">模板描述</text>
          <text class="sq-detail-desc">{{ detailTpl?.description }}</text>
        </view>
        <view class="sq-detail-actions">
          <view class="sq-detail-btn ghost" @click="closeDetail">关闭</view>
          <view class="sq-detail-btn primary" :class="{ disabled: isDownloading }" @click="handleDownload">导入到我的模板</view>
        </view>
      </view>
    </view>

    <view v-if="showShare" class="sq-detail-overlay" @click="closeShare">
      <view class="sq-detail-sheet" @click.stop>
        <text class="sq-detail-title">分享我的模板</text>
        <view class="sq-detail-section">
          <text class="sq-detail-label">选择要分享的模板</text>
          <view class="sq-share-pick-list">
            <view v-for="tpl in myTemplates" :key="tpl.id" class="sq-share-pick"
              :class="{ active: shareForm.tplId === tpl.id }" @click="selectShareTpl(tpl)">
              <text class="sq-share-pick-name">{{ tpl.name }}</text>
              <text class="sq-share-pick-count">{{ tpl.actions?.length || 0 }} 动作</text>
            </view>
          </view>
        </view>
        <view class="sq-detail-section">
          <text class="sq-detail-label">分享名称</text>
          <input v-model="shareForm.name" class="sq-share-input" placeholder="不超过50字" maxlength="50" />
        </view>
        <view class="sq-detail-section">
          <text class="sq-detail-label">简介</text>
          <textarea v-model="shareForm.description" class="sq-share-textarea" placeholder="介绍一下这个模板的训练目标、适合人群等..."
            maxlength="2000" />
        </view>
        <view class="sq-detail-section">
          <text class="sq-detail-label">封面颜色</text>
          <view class="sq-color-row">
            <view v-for="c in colorOptions" :key="c" class="sq-color-dot"
              :class="{ active: shareForm.coverColor === c }" :style="{ backgroundColor: c }"
              @click="shareForm.coverColor = c" />
          </view>
        </view>
        <view class="sq-detail-section">
          <text class="sq-detail-label">部位标签（可多选）</text>
          <view class="sq-tag-select">
            <view v-for="t in tags" :key="t.id" class="sq-tag-opt" :class="{ active: shareForm.tagIds.includes(t.id) }"
              @click="toggleShareTag(t.id)">{{ t.name }}</view>
          </view>
        </view>
        <view class="sq-detail-actions">
          <view class="sq-detail-btn ghost" @click="closeShare">取消</view>
          <view class="sq-detail-btn primary" :class="{ disabled: isSharing || !shareForm.tplId }" @click="submitShare">提交分享</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useTemplateStore
  } from '@/stores/template.js'
  import {
    listSquareTemplates,
    shareTemplate,
    downloadTemplate,
    listTemplateTags,
    getTemplateDetail
  } from '@/utils/serverCommunity.js'

  export default {
    data() {
      return {
        templateStore: useTemplateStore(),
        loading: false,
        isDownloading: false,
        isSharing: false,
        templates: [],
        tags: [],
        total: 0,
        search: '',
        sort: 'latest',
        sorts: [{
            key: 'latest',
            label: '最新'
          },
          {
            key: 'hot',
            label: '热门'
          },
        ],
        activeTag: '',
        page: 1,
        pageSize: 20,
        showDetail: false,
        showShare: false,
        detailTpl: null,
        myTemplates: [],
        shareForm: {
          tplId: null,
          name: '',
          description: '',
          coverColor: '#379bff',
          tagIds: []
        },
        colorOptions: ['#379bff', '#ff6b6b', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c'],
        animClass: '',
      }
    },
    computed: {
      // 后端已支持 keyword/tagId 过滤，前端直接展示后端结果
      filtered() {
        return this.templates
      },
      // 部位选择器的名称数组（带"全部部位"选项）
      tagNames() {
        return ['全部部位', ...this.tags.map(t => t.name)]
      },
      // 选择器当前选中的索引
      tagPickerIndex() {
        if (!this.activeTag) return 0
        const idx = this.tags.findIndex(t => t.id === this.activeTag)
        return idx > -1 ? idx + 1 : 0
      },
      // 当前选中的部位名称
      activeTagName() {
        if (!this.activeTag) return ''
        const t = this.tags.find(t => t.id === this.activeTag)
        return t ? t.name : ''
      },
      // 从 templateData 解析动作列表：兼容 actions:string[]+actionSets 和 actions:object[]
      detailActions() {
        if (!this.detailTpl) return []
        const dataStr = this.detailTpl.templateData
        if (!dataStr) return []
        try {
          const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr
          const acts = data?.actions || data?.actionList || []
          if (!Array.isArray(acts)) return []
          const setsMap = data?.actionSets || {}
          return acts.map((a, i) => {
            if (typeof a === 'string') {
              // 本地模板格式：actions 是字符串数组，组数在 actionSets[name]
              const n = a || ('动作' + (i + 1))
              return {
                name: n,
                sets: Number(setsMap[n]) || 0
              }
            }
            if (a && typeof a === 'object') {
              return {
                name: a.name || a.actionName || ('动作' + (i + 1)),
                sets: Number(a.sets) || 0
              }
            }
            return {
              name: '动作' + (i + 1),
              sets: 0
            }
          })
        } catch (e) {
          return []
        }
      },
      // 总组数：优先用后端 totalSets，否则从 detailActions 累加
      detailTotalSets() {
        if (this.detailTpl && Number.isFinite(Number(this.detailTpl.totalSets)) && Number(this.detailTpl.totalSets) >
          0) {
          return Number(this.detailTpl.totalSets)
        }
        return this.detailActions.reduce((s, a) => s + (Number(a.sets) || 0), 0)
      },
    },
    mounted() {
      this.loadData()
      this.loadTags()
    },
    methods: {
      onSearchInput() {
        if (this._searchTimer) clearTimeout(this._searchTimer)
        this._searchTimer = setTimeout(() => {
          this.page = 1
          this.loadData()
        }, 300)
      },
      clearSearch() {
        this.search = ''
        this.page = 1
        this.loadData()
      },
      setSort(key) {
        if (this.sort === key) return
        this.sort = key
        this.page = 1
        this.loadData()
      },
      onTagPick(e) {
        const idx = Number(e.detail.value)
        if (idx === 0) {
          this.activeTag = ''
        } else {
          const tag = this.tags[idx - 1]
          this.activeTag = tag ? tag.id : ''
        }
        this.page = 1
        this.loadData()
      },
      async loadData() {
        this.loading = true
        try {
          const res = await listSquareTemplates({
            page: this.page,
            size: this.pageSize,
            keyword: this.search,
            tagId: this.activeTag || null,
            sort: this.sort,
          })
          this.templates = res.list || []
          this.total = res.total || 0
        } catch (e) {
          uni.showToast({
            title: e.message || '加载失败',
            icon: 'none'
          })
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
      async openDetail(tpl) {
        this.detailTpl = tpl
        this.showDetail = true
        try {
          const detail = await getTemplateDetail(tpl.id)
          if (detail) this.detailTpl = detail
        } catch (e) {
          console.warn('获取模板详情失败:', e)
        }
      },
      closeDetail() {
        this.showDetail = false
        this.detailTpl = null
      },
      maskAuthor(name) {
        if (!name) return 'FitNote 用户'
        return String(name)
      },
      normalizeTags(tpl) {
        if (!tpl) return []
        const raw = tpl.tags || tpl.tagList || tpl.tagNames || []
        if (!Array.isArray(raw)) return []
        return raw.map((t) => (typeof t === 'string' ? t : (t && (t.name || t.label || t.tag)) || '')).filter(Boolean)
          .slice(0, 6)
      },
      async openShare() {
        try {
          this.templateStore.load()
          this.myTemplates = (this.templateStore.templates || []).filter(t => t && !t.isAerobic)
          this.shareForm = {
            tplId: null,
            name: '',
            description: '',
            coverColor: '#379bff',
            tagIds: []
          }
          this.showShare = true
        } catch (e) {
          uni.showToast({
            title: e.message || '加载本地模板失败',
            icon: 'none'
          })
        }
      },
      selectShareTpl(tpl) {
        this.shareForm.tplId = tpl.id
        this.shareForm.name = tpl.name || ''
        this.shareForm.coverColor = tpl.color || '#379bff'
      },
      toggleShareTag(id) {
        const idx = this.shareForm.tagIds.indexOf(id)
        if (idx > -1) this.shareForm.tagIds.splice(idx, 1)
        else this.shareForm.tagIds.push(id)
      },
      // 计算本地模板总组数：actions 为字符串数组，组数在 actionSets[name]
      calcTotalSetsOf(tpl) {
        if (!tpl) return 0
        const actions = tpl.actions || []
        const setsMap = tpl.actionSets || {}
        let s = 0
        for (const a of actions) {
          if (typeof a === 'string') s += Number(setsMap[a]) || 0
          else if (a && typeof a === 'object') s += Number(a.sets) || 0
        }
        return s
      },
      closeShare() {
        this.showShare = false
      },
      async handleDownload() {
        if (!this.detailTpl || !this.detailTpl.id || this.isDownloading) return
        this.isDownloading = true
        try {
          const dataStr = await downloadTemplate(this.detailTpl.id)
          const tplData = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr
          if (!tplData || !tplData.name) throw new Error('模板数据无效')
          this.templateStore.load()
          const name = String(tplData.name).trim()
          const existing = this.templateStore.templates.find(t => t && t.name === name)
          if (existing) {
            const res = await new Promise((resolve) => {
              uni.showModal({
                title: '模板已存在',
                content: `模板「${name}」已存在，是否覆盖？`,
                confirmText: '覆盖',
                cancelText: '跳过',
                success: (r) => resolve(r.confirm)
              })
            })
            if (res) {
              Object.assign(existing, tplData, {
                id: existing.id,
                name
              })
              this.templateStore.save()
              uni.showToast({
                title: '覆盖成功',
                icon: 'success'
              })
            }
          } else {
            this.templateStore.templates.push({
              ...tplData,
              name,
              id: String(Date.now()) + Math.random().toString(36).slice(2)
            })
            this.templateStore.save()
            uni.showToast({
              title: '导入成功',
              icon: 'success'
            })
          }
          this.closeDetail()
        } catch (e) {
          uni.showToast({
            title: e.message || '导入失败',
            icon: 'none'
          })
        } finally {
          this.isDownloading = false
        }
      },
      async submitShare() {
        if (!this.shareForm.tplId) {
          uni.showToast({
            title: '请选择要分享的模板',
            icon: 'none'
          })
          return
        }
        if (!this.shareForm.name) {
          uni.showToast({
            title: '请填写分享名称',
            icon: 'none'
          })
          return
        }
        const tpl = this.myTemplates.find(t => t.id === this.shareForm.tplId)
        const actionCount = tpl?.actions?.length || 0
        if (actionCount < 1) {
          uni.showToast({
            title: '模板至少需要1个动作',
            icon: 'none'
          })
          return
        }
        this.isSharing = true
        try {
          await shareTemplate({
            name: this.shareForm.name,
            description: this.shareForm.description,
            coverColor: this.shareForm.coverColor,
            actionCount,
            totalSets: this.calcTotalSetsOf(tpl),
            templateData: JSON.stringify(tpl),
            tagIds: this.shareForm.tagIds
          })
          uni.showToast({
            title: '分享成功，等待审核',
            icon: 'success'
          })
          this.closeShare()
          this.loadData()
        } catch (e) {
          uni.showToast({
            title: e.message || '分享失败',
            icon: 'none'
          })
        } finally {
          this.isSharing = false
        }
      },
    },
  }
</script>

<style scoped>
  .template-square-tab-container {
    display: flex;
    flex-direction: column;
    height: 100%;
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

  .sq-search-bar {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    border: 1rpx solid var(--border-color);
    border-radius: 20rpx;
    padding: 0 24rpx;
    height: 88rpx;
    margin-bottom: 8px;
  }

  .sq-search-icon {
    font-size: 24rpx;
    margin-right: 12rpx;
  }

  .sq-search-input {
    flex: 1;
    font-size: 28rpx;
    height: 88rpx;
  }

  .sq-clear {
    font-size: 32rpx;
    color: var(--text-secondary);
    padding: 0 8rpx;
  }

  .sq-sort-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .sq-sort {
    display: flex;
    gap: 8px;
  }

  .sq-sort-item {
    padding: 8rpx 20rpx;
    border-radius: 999px;
    font-size: 24rpx;
    color: var(--text-secondary);
    background: var(--bg-tertiary);
  }

  .sq-sort-item.active {
    background: var(--primary);
    color: #ffffff !important;
    font-weight: 600;
  }

  .sq-tag-picker {
    flex-shrink: 0;
  }

  .sq-tag-picker-btn {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 14rpx;
    border-radius: 8rpx;
    font-size: 22rpx;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1rpx solid var(--border-color, rgba(0, 0, 0, 0.06));
  }

  .sq-tag-picker-text {
    font-size: 22rpx;
    max-width: 120rpx;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .sq-tag-picker-arrow {
    font-size: 16rpx;
    opacity: 0.5;
  }

  .sq-list {
    flex: 1;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
  }

  .sq-list-content {
    padding: 8px 16px;
  }

  .sq-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .sq-tpl-card {
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    border-radius: 16rpx;
    overflow: hidden;
    box-sizing: border-box;
    min-width: 0;
  }

  .sq-tpl-cover {
    position: relative;
    aspect-ratio: 16 / 10;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sq-official-badge {
    position: absolute;
    top: 8rpx;
    left: 8rpx;
    padding: 2rpx 12rpx;
    background: rgba(255, 215, 0, 0.9);
    color: #5a3d00;
    font-size: 20rpx;
    font-weight: 700;
    border-radius: 8rpx;
  }

  .sq-tpl-cover-icon {
    font-size: 56rpx;
  }

  .sq-tpl-info {
    padding: 14rpx 20rpx;
  }

  .sq-tpl-title {
    font-size: 32rpx;
    font-weight: 700;
    display: block;
    margin-bottom: 6rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sq-tpl-stats {
    display: flex;
    gap: 12rpx;
  }

  .sq-tpl-stat {
    font-size: 22rpx;
    color: var(--text-secondary);
  }

  .sq-empty,
  .sq-loading {
    padding: 60px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .sq-empty-icon {
    font-size: 48rpx;
  }

  .sq-empty-text,
  .sq-loading-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .sq-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: sqSpin 0.8s linear infinite;
  }

  @keyframes sqSpin {
    to {
      transform: rotate(360deg);
    }
  }

  .sq-list-bottom-space {
    height: 80px;
  }

  /* 分享按钮 FAB */
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

  /* 详情/分享弹窗 */
  .sq-detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .sq-detail-sheet {
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

  .sq-detail-cover {
    aspect-ratio: 4 / 1;
    width: 100%;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    margin-top: 4px;
  }

  .sq-detail-cover-icon {
    font-size: 64rpx;
  }

  .sq-detail-title {
    font-size: 36rpx;
    font-weight: 700;
    display: block;
    margin-bottom: 12px;
  }

  .sq-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }

  .sq-stats-cell {
    background: var(--bg-tertiary);
    border-radius: 10rpx;
    padding: 12px 10px;
    text-align: center;
    box-sizing: border-box;
    min-width: 0;
  }

  .sq-stats-num {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
  }

  .sq-stats-label {
    display: block;
    font-size: 22rpx;
    color: var(--text-secondary);
  }

  .sq-detail-section {
    margin-bottom: 12px;
  }

  .sq-detail-label {
    display: block;
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .sq-share-input,
  .sq-share-textarea {
    width: 100%;
    height: 88rpx;
    background: var(--bg-tertiary);
    border: 1rpx solid var(--border-color);
    border-radius: 20rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }

  .sq-share-textarea {
    height: 160rpx;
    padding: 16rpx 24rpx;
    line-height: 1.5;
  }

  .sq-color-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .sq-color-dot {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    border: 4rpx solid transparent;
    box-sizing: border-box;
  }

  .sq-color-dot.active {
    border-color: var(--text-primary);
    transform: scale(1.1);
  }

  .sq-tag-select {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  .sq-tag-opt {
    padding: 8rpx 20rpx;
    border-radius: 999px;
    font-size: 24rpx;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .sq-tag-opt.active {
    background: var(--primary);
    color: #fff;
  }

  .sq-share-pick {
    padding: 12rpx 20rpx;
    border: 1rpx solid var(--border-color);
    border-radius: 12rpx;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sq-share-pick-list {
    max-height: 50vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sq-share-pick.active {
    border-color: var(--primary);
    background: rgba(55, 155, 255, 0.1);
  }

  .sq-share-pick-name {
    font-size: 28rpx;
  }

  .sq-share-pick-count {
    font-size: 22rpx;
    color: var(--text-secondary);
  }

  .sq-detail-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .sq-detail-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
  }

  .sq-detail-btn.ghost {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .container.liquid-glass .sq-detail-btn.ghost {
    background: var(--glass-bg);
    border: none;
    color: var(--glass-text);
    box-shadow:
      0 0 0 0.5px var(--glass-edge) inset,
      0 1px 2px var(--glass-shadow-inner) inset;
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    backdrop-filter: blur(8px) saturate(120%);
  }

  .sq-detail-btn.primary {
    background: var(--primary);
    color: #fff;
  }

  .container.liquid-glass .sq-detail-btn.primary {
    background: var(--glass-bg);
    border: none;
    color: var(--glass-text);
    box-shadow:
      0 0 0 0.5px var(--glass-edge) inset,
      0 1px 2px var(--glass-shadow-inner) inset;
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    backdrop-filter: blur(8px) saturate(120%);
  }

  .container.liquid-glass .sq-detail-btn.primary:not(.disabled) {
    background: rgba(55, 155, 255, 0.6);
    color: #ffffff;
    box-shadow: 0 2rpx 8rpx rgba(55, 155, 255, 0.3);
  }

  .container.liquid-glass .sq-detail-btn.primary.disabled {
    opacity: 0.5;
  }

  .container.liquid-glass .sq-detail-btn.primary:active {
    transform: scale(0.96);
  }

  /* —— 广场详情：新增样式（对齐 templateManager 广场详情视觉） —— */
  .sq-detail-sheet {
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: 20px;
    right: 30px;
    font-size: 40rpx;
    color: var(--text-secondary);
    z-index: 5;
  }

  .sq-detail-cover {
    position: relative;
    overflow: hidden;
    color: #fff;
  }

  .sqd-author {
    position: relative;
    z-index: 2;
    font-size: 16px;
    opacity: 0.9;
    display: block;
    margin-right: 8px;
  }

  .sqd-tags {
    position: relative;
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sqd-tag {
    padding: 4rpx 14rpx;
    background: rgba(255, 255, 255, 0.22);
    border-radius: 24rpx;
    font-size: 12px;
    color: #fff;
    backdrop-filter: blur(6rpx);
  }

  .sq-detail-cover-icon {
    position: absolute;
    right: 24rpx;
    bottom: 20rpx;
    font-size: 72rpx;
    opacity: 0.35;
  }

  .sq-detail-actions-preview {
    background: var(--bg-secondary);
    border-radius: 16rpx;
    padding: 16rpx;
    margin-bottom: 16rpx;
    max-height: 480rpx;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .template-square-tab-container.light .sq-detail-actions-preview {
    background: var(--bg-tertiary);
  }

  .sqd-section-title {
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
    color: var(--text-primary);
  }

  .sqd-action-list {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }

  .sqd-action-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 10rpx 12rpx;
    background: var(--bg-tertiary);
    border-radius: 12rpx;
    min-height: 64rpx;
  }

  .template-square-tab-container.light .sqd-action-row {
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
  }

  .sqd-action-index {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), #6ab6ff);
    color: #fff;
    font-size: 22rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sqd-action-name {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sqd-action-sets {
    padding: 4rpx 14rpx;
    background: rgba(55, 155, 255, 0.15);
    color: var(--primary);
    border-radius: 16rpx;
    font-size: 22rpx;
    font-weight: 600;
    flex-shrink: 0;
  }

  .sq-detail-desc {
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

  .template-square-tab-container.light .sq-detail-desc {
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
  }

  /* 切换动画 */
  .anim-right-in {
    animation: animRightIn 0.36s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .anim-left-in {
    animation: animLeftIn 0.36s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @keyframes animRightIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes animLeftIn {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* 平板适配 */
  @media (min-width: 500px) {
    .sq-page-title {
      font-size: 18px !important;
    }

    .sq-page-sub {
      font-size: 12px !important;
    }

    .sq-search-input {
      height: 36px !important;
      font-size: 13px !important;
      padding: 0 12px !important;
    }

    .sq-search-icon {
      font-size: 14px !important;
      margin-right: 6px !important;
    }

    .sq-sort-item {
      font-size: 12px !important;
      padding: 4px 10px !important;
    }

    .sq-tag-chip {
      font-size: 11px !important;
      padding: 3px 10px !important;
    }

    .sq-tpl-title {
      font-size: 15px !important;
    }

    .sq-tpl-stat {
      font-size: 11px !important;
    }

    .sq-tpl-cover-icon {
      font-size: 28px !important;
    }

    .sq-stats-num {
      font-size: 17px !important;
    }

    .sq-stats-label {
      font-size: 11px !important;
    }

    .sq-detail-title {
      font-size: 17px !important;
    }

    .sq-share-input {
      height: 40px !important;
      font-size: 13px !important;
    }

    .sq-share-textarea {
      height: 80px !important;
      font-size: 13px !important;
      padding: 8px 12px !important;
    }

    .sq-share-pick-name {
      font-size: 13px !important;
    }

    .sq-share-pick-count {
      font-size: 11px !important;
    }

    .sq-detail-btn {
      height: 40px !important;
      font-size: 13px !important;
    }

    .sq-share-fab {
      padding: 10px 24px !important;
    }

    .sq-share-fab-icon {
      font-size: 16px !important;
    }

    .sq-share-fab-text {
      font-size: 14px !important;
    }
  }
</style>