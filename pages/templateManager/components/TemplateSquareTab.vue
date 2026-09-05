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
    <view v-if="showDetail" class="sq-detail-overlay" @click="closeDetail">
      <view class="sq-detail-sheet" @click.stop>
        <text class="close-btn" @click="closeDetail">×</text>
        <view class="sq-detail-cover" :style="{ background: `linear-gradient(135deg, ${detailTpl?.color || '#379bff'}, ${detailTpl?.color2 || detailTpl?.color || '#379bff'})` }">
          <text class="sqd-author">作者：{{ maskAuthor(detailTpl?.author || detailTpl?.authorName || 'FitNote 用户') }}</text>
          <view class="sqd-tags">
            <text v-for="(tg, i) in normalizeTags(detailTpl)" :key="i" class="sqd-tag">{{ tg }}</text>
          </view>
          <text class="sq-detail-cover-icon">📋</text>
        </view>
        <text class="sq-detail-title">{{ detailTpl?.name }}</text>
        <view class="sq-stats-grid">
          <view class="sq-stats-cell">
            <text class="sq-stats-num">{{ detailTpl?.actions?.length || 0 }}</text>
            <text class="sq-stats-label">动作数</text>
          </view>
          <view class="sq-stats-cell">
            <text class="sq-stats-num">{{ calcTotalSets(detailTpl) }}</text>
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
            <view v-for="(a, i) in (detailTpl?.actions || [])" :key="i" class="sqd-action-row">
              <text class="sqd-action-index">{{ i + 1 }}</text>
              <text class="sqd-action-name">{{ a.name || a.actionName || ('动作' + (i + 1)) }}</text>
              <text class="sqd-action-sets">{{ calcSetsOf(a) }}组</text>
            </view>
          </view>
        </view>
        <view class="sq-detail-section" v-if="detailTpl?.desc || detailTpl?.description">
          <text class="sq-detail-label">模板描述</text>
          <text class="sq-detail-desc">{{ detailTpl?.desc || detailTpl?.description }}</text>
        </view>
        <view class="sq-detail-actions">
          <view class="sq-detail-btn ghost" @click="closeDetail">关闭</view>
          <view class="sq-detail-btn primary" @click="handleDownload">导入到我的模板</view>
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
              :class="{ active: shareForm.tplId === tpl.id }"
              @click="shareForm.tplId = tpl.id">
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
          <textarea v-model="shareForm.desc" class="sq-share-textarea" placeholder="介绍一下这个模板..." maxlength="200" />
        </view>
        <view class="sq-detail-actions">
          <view class="sq-detail-btn ghost" @click="closeShare">取消</view>
          <view class="sq-detail-btn primary" @click="submitShare">提交分享</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useTemplateStore } from '@/stores/template.js'
import { listSquareTemplates, shareTemplate, downloadTemplate, listTemplateTags } from '@/utils/serverCommunity.js'

export default {
  data() {
    return {
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
  mounted() {
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
    openDetail(tpl) {
      this.detailTpl = tpl
      this.showDetail = true
    },
    closeDetail() {
      this.showDetail = false
      this.detailTpl = null
    },
    maskAuthor(name) {
      if (!name) return 'FitNote 用户'
      const s = String(name)
      if (s.length <= 1) return s + '**'
      return s[0] + '**'
    },
    normalizeTags(tpl) {
      if (!tpl) return []
      const raw = tpl.tags || tpl.tagList || []
      if (!Array.isArray(raw)) return []
      return raw.map((t) => (typeof t === 'string' ? t : (t && (t.name || t.label || t.tag)) || '')).filter(Boolean).slice(0, 6)
    },
    calcTotalSets(tpl) {
      if (!tpl) return 0
      if (Number.isFinite(Number(tpl.totalSets))) return Number(tpl.totalSets)
      const actions = Array.isArray(tpl.actions) ? tpl.actions : []
      let s = 0
      for (const a of actions) s += this.calcSetsOf(a)
      return s
    },
    calcSetsOf(action) {
      if (!action || typeof action !== 'object') return 0
      if (Number.isFinite(Number(action.sets))) return Number(action.sets)
      if (Array.isArray(action.stages)) return action.stages.length
      if (Array.isArray(action.sets_)) return action.sets_.length
      if (Array.isArray(action)) return action.length
      return 0
    },
    async openShare() {
      try {
        this.templateStore.load()
        this.myTemplates = this.templateStore.templates || []
        this.shareForm = { tplId: null, name: '', desc: '' }
        this.showShare = true
      } catch (e) {
        uni.showToast({ title: e.message || '加载本地模板失败', icon: 'none' })
      }
    },
    closeShare() {
      this.showShare = false
    },
    async handleDownload() {
      if (!this.detailTpl) return
      uni.showModal({
        title: '导入确认',
        content: `是否将「${this.detailTpl.name}」导入到我的模板？若已存在同名/同 ID 模板，可选择覆盖或跳过。`,
        confirmText: '覆盖',
        cancelText: '跳过',
        success: async (res) => {
          if (res.cancel) {
            uni.showToast({ title: '已跳过', icon: 'none' })
            this.closeDetail()
            return
          }
          try {
            await downloadTemplate(this.detailTpl.id, { mode: 'overwrite' })
            uni.showToast({ title: '已覆盖', icon: 'success' })
            this.closeDetail()
          } catch (e) {
            uni.showToast({ title: e.message || '下载失败', icon: 'none' })
          }
        },
      })
    },
    async submitShare() {
      if (!this.shareForm.tplId) {
        uni.showToast({ title: '请选择要分享的模板', icon: 'none' })
        return
      }
      if (!this.shareForm.name) {
        uni.showToast({ title: '请填写分享名称', icon: 'none' })
        return
      }
      try {
        await shareTemplate({
          tplId: this.shareForm.tplId,
          name: this.shareForm.name,
          desc: this.shareForm.desc,
        })
        uni.showToast({ title: '分享成功，等待审核', icon: 'success' })
        this.closeShare()
        this.loadData()
      } catch (e) {
        uni.showToast({ title: e.message || '分享失败', icon: 'none' })
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
.sq-search-icon { font-size: 24rpx; margin-right: 12rpx; }
.sq-search-input { flex: 1; font-size: 28rpx; height: 88rpx; }
.sq-clear { font-size: 32rpx; color: var(--text-secondary); padding: 0 8rpx; }
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
  color: #fff;
}
.sq-tags {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 4px 16px;
  box-sizing: border-box;
  white-space: nowrap;
}
.sq-tags-inner { display: inline-flex; gap: 8px; padding: 4px 0; }
.sq-tag-chip {
  padding: 6rpx 20rpx;
  border-radius: 999px;
  font-size: 22rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  white-space: nowrap;
}
.sq-tag-chip.active {
  background: var(--primary);
  color: #fff;
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
.sq-tpl-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1rpx solid var(--border-color);
  border-radius: 16rpx;
  margin-bottom: 12px;
  overflow: hidden;
  box-sizing: border-box;
}
.sq-tpl-cover {
  aspect-ratio: 16 / 10;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sq-tpl-cover-icon { font-size: 56rpx; }
.sq-tpl-info { padding: 14rpx 20rpx; }
.sq-tpl-title {
  font-size: 32rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 6rpx;
}
.sq-tpl-stats { display: flex; gap: 12rpx; }
.sq-tpl-stat { font-size: 22rpx; color: var(--text-secondary); }
.sq-empty, .sq-loading {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.sq-empty-icon { font-size: 48rpx; }
.sq-empty-text, .sq-loading-text { font-size: 14px; color: var(--text-secondary); }
.sq-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: sqSpin 0.8s linear infinite;
}
@keyframes sqSpin { to { transform: rotate(360deg); } }
.sq-list-bottom-space { height: 80px; }

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
.sq-share-fab:active { transform: translateX(-50%) scale(0.96); }
.sq-share-fab-icon { font-size: 18px; white-space: nowrap; }
.sq-share-fab-text { font-size: 16px; font-weight: 700; white-space: nowrap; }

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
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.sq-detail-cover-icon { font-size: 64rpx; }
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
.sq-stats-num { display: block; font-size: 36rpx; font-weight: 700; }
.sq-stats-label { display: block; font-size: 22rpx; color: var(--text-secondary); }
.sq-detail-section { margin-bottom: 12px; }
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
.sq-share-pick-name { font-size: 28rpx; }
.sq-share-pick-count { font-size: 22rpx; color: var(--text-secondary); }
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
.sq-detail-btn.primary {
  background: var(--primary);
  color: #fff;
}

/* —— 广场详情：新增样式（对齐 templateManager 广场详情视觉） —— */
.sq-detail-sheet { position: relative; }
.close-btn {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  font-size: 40rpx;
  color: var(--text-secondary);
  padding: 8rpx;
  z-index: 5;
}
.sq-detail-cover {
  position: relative;
  overflow: hidden;
  padding: 24rpx 24rpx 32rpx;
  color: #fff;
}
.sqd-author {
  position: relative;
  z-index: 2;
  font-size: 24rpx;
  opacity: 0.9;
  display: block;
  margin-bottom: 10rpx;
}
.sqd-tags {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.sqd-tag {
  padding: 4rpx 14rpx;
  background: rgba(255,255,255,0.22);
  border-radius: 24rpx;
  font-size: 22rpx;
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
.sqd-action-list { display: flex; flex-direction: column; gap: 10rpx; }
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
  background: rgba(55,155,255,0.15);
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
.anim-right-in { animation: animRightIn 0.36s cubic-bezier(0.22, 0.61, 0.36, 1); }
.anim-left-in { animation: animLeftIn 0.36s cubic-bezier(0.22, 0.61, 0.36, 1); }
@keyframes animRightIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes animLeftIn { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }

/* 平板适配 */
@media (min-width: 500px) {
  .sq-page-title { font-size: 18px !important; }
  .sq-page-sub { font-size: 12px !important; }
  .sq-search-input { height: 36px !important; font-size: 13px !important; padding: 0 12px !important; }
  .sq-search-icon { font-size: 14px !important; margin-right: 6px !important; }
  .sq-sort-item { font-size: 12px !important; padding: 4px 10px !important; }
  .sq-tag-chip { font-size: 11px !important; padding: 3px 10px !important; }
  .sq-tpl-title { font-size: 15px !important; }
  .sq-tpl-stat { font-size: 11px !important; }
  .sq-tpl-cover-icon { font-size: 28px !important; }
  .sq-stats-num { font-size: 17px !important; }
  .sq-stats-label { font-size: 11px !important; }
  .sq-detail-title { font-size: 17px !important; }
  .sq-share-input { height: 40px !important; font-size: 13px !important; }
  .sq-share-textarea { height: 80px !important; font-size: 13px !important; padding: 8px 12px !important; }
  .sq-share-pick-name { font-size: 13px !important; }
  .sq-share-pick-count { font-size: 11px !important; }
  .sq-detail-btn { height: 40px !important; font-size: 13px !important; }
  .sq-share-fab { padding: 10px 24px !important; }
  .sq-share-fab-icon { font-size: 16px !important; }
  .sq-share-fab-text { font-size: 14px !important; }
}
</style>
