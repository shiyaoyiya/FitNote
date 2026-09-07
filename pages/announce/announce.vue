<template>
  <scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }" scroll-y="true"
    @touchstart="onSwipeTouchStart" @touchmove="onSwipeTouchMove" @touchend="onSwipeTouchEnd">
    <!-- 分类筛选 -->
    <view class="swipe-tab-bar" :class="{ 'no-transition': swipeNoTransition }">
      <view class="swipe-tab-highlight" :style="swipeHighlightStyle"></view>
      <view
        v-for="(t, i) in typeTabs"
        :key="t.value"
        class="swipe-tab-item"
        :class="{ active: i === swipeCurrentIndex }"
        @click="onSwipeTabClick(i)"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- 公告列表 -->
    <view v-if="!loading" class="announce-list">
      <view v-for="item in announcements" :key="item.id" class="announce-card glass-base" @click="openDetail(item)">
        <view class="announce-card-header">
          <text class="announce-icon">{{ typeIcon(item.type) }}</text>
          <view class="announce-card-info">
            <view class="title-row">
              <text class="announce-title">{{ item.title }}</text>
              <text v-if="item.priority === 1" class="pin-badge">置顶</text>
            </view>
            <view class="meta-row">
              <text class="announce-type-tag">{{ item.typeText || '公告' }}</text>
              <text class="announce-date">{{ formatDate(item.publishTime) }}</text>
              <text class="announce-views">👁 {{ item.viewCount || 0 }}</text>
            </view>
          </view>
        </view>
        <text class="announce-summary">{{ summaryOf(item.content) }}</text>
      </view>

      <view v-if="announcements.length === 0" class="empty-state">
        <text class="empty-icon">📢</text>
        <text class="empty-text">暂无公告</text>
      </view>

      <view v-if="announcements.length > 0 && hasMore" class="load-more" @click="loadMore">
        <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && errorMsg" class="error-state" @click="reload">
      <text>{{ errorMsg }}（点击重试）</text>
    </view>

    <!-- 公告详情弹窗 -->
    <view v-if="activeDetail" class="detail-overlay" @click.self="closeDetail">
      <view class="overlay-bg" @click="closeDetail"></view>
      <view class="detail-sheet glass-base" @click.stop>
        <view class="detail-header">
          <text class="detail-icon">{{ typeIcon(activeDetail.type) }}</text>
          <view class="detail-header-info">
            <view class="detail-title-row">
              <text class="detail-title">{{ activeDetail.title }}</text>
              <text v-if="activeDetail.priority === 1" class="pin-badge">置顶</text>
            </view>
            <view class="detail-meta">
              <text class="announce-type-tag">{{ activeDetail.typeText || '公告' }}</text>
              <text class="detail-date">{{ formatDate(activeDetail.publishTime) }}</text>
              <text class="announce-views">👁 {{ activeDetail.viewCount || 0 }}</text>
            </view>
          </view>
          <text class="detail-close" @click="closeDetail">×</text>
        </view>
        <view class="detail-body">
          <text class="detail-content">{{ activeDetail.content }}</text>
          <text v-if="activeDetail.publishAdminName" class="detail-admin">发布者：{{ activeDetail.publishAdminName }}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'
  import { listAnnounces, getAnnounceDetail } from '@/utils/serverCommunity.js'
  import swipeTabMixin from '@/mixins/swipeTabMixin.js'

  export default {
    mixins: [swipeTabMixin],
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        activeDetail: null,
        announcements: [],
        activeType: null, // null = 全部
        typeTabs: [
          { label: '全部', value: null },
          { label: '系统', value: 1 },
          { label: '活动', value: 2 },
          { label: '版本', value: 3 },
        ],
        page: 1,
        size: 10,
        total: 0,
        loading: false,
        loadingMore: false,
        hasMore: true,
        errorMsg: '',
      }
    },
    onLoad() {
      this.fetchList(true)
    },
    onShow() {
      this.swipeMeasureTabRects()
    },
    onReady() {
      this.swipeMeasureTabRects()
    },
    computed: {
      swipeCurrentIndex() {
        return this.typeTabs.findIndex(t => t.value === this.activeType)
      },
    },
    methods: {
      async fetchList(reset = false) {
        if (reset) {
          this.page = 1
          this.announcements = []
          this.hasMore = true
        }
        if (this.loading) return
        this.errorMsg = ''
        if (reset) this.loading = true
        else this.loadingMore = true
        try {
          const res = await listAnnounces({
            page: this.page,
            size: this.size,
            type: this.activeType,
          })
          const list = res?.list || []
          this.total = res?.total ?? 0
          if (reset) {
            this.announcements = list
          } else {
            this.announcements = this.announcements.concat(list)
          }
          this.hasMore = this.announcements.length < this.total
        } catch (e) {
          this.errorMsg = e?.message || '加载失败'
          if (reset) this.announcements = []
        } finally {
          this.loading = false
          this.loadingMore = false
        }
      },
      onSwipeTabChange(nextIdx) {
        const tab = this.typeTabs[nextIdx]
        this.activeType = tab.value
        this.fetchList(true)
      },
      loadMore() {
        if (this.loadingMore || !this.hasMore) return
        this.page += 1
        this.fetchList(false)
      },
      async openDetail(item) {
        // 先用列表已有内容展示，再请求详情刷新浏览量与最新内容
        this.activeDetail = item
        try {
          const detail = await getAnnounceDetail(item.id)
          if (detail) {
            this.activeDetail = { ...item, ...detail }
            // 同步更新列表中对应项的浏览量，无需刷新页面
            const idx = this.announcements.findIndex(a => a.id === item.id)
            if (idx >= 0) {
              const updated = {
                ...this.announcements[idx],
                ...detail,
              }
              // Vue2 响应式替换数组项
              this.announcements.splice(idx, 1, updated)
            }
          }
        } catch (e) {
          // 详情请求失败时仍展示列表已有内容
        }
      },
      closeDetail() {
        this.activeDetail = null
      },
      reload() {
        this.fetchList(true)
      },
      // ---------- 字段映射工具 ----------
      typeIcon(type) {
        switch (type) {
          case 1: return '📢'
          case 2: return '🎉'
          case 3: return '🔧'
          default: return '📢'
        }
      },
      summaryOf(content) {
        if (!content) return ''
        const firstLine = String(content).split(/\r?\n/)[0] || ''
        return firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine
      },
      formatDate(dt) {
        if (!dt) return ''
        // 后端 LocalDateTime 序列化为 "2026-09-01T10:00:00" 或时间戳
        const s = String(dt)
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (m) return `${m[1]}-${m[2]}-${m[3]}`
        const n = Number(dt)
        if (!isNaN(n) && n > 0) {
          const d = new Date(n)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
        return s
      },
    },
  }
</script>

<style scoped>
  @import '/static/css/swipe-tab-glass.css';

  .container {
    min-height: 100vh;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
  }

  /* 分类 Tab（页面特定布局，液态玻璃样式由 swipe-tab-glass.css 提供） */
  .swipe-tab-bar {
    margin-bottom: 16px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .swipe-tab-item {
    flex: 1;
    padding: 8px 0;
    font-size: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
  }

  .swipe-tab-item.active {
    background: var(--primary, #379bff);
    color: #fff;
    border-color: var(--primary, #379bff);
  }

  .announce-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 600px;
    margin: 0 auto;
  }

  .announce-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 16px;
    border: 1px solid var(--border-color);
  }

  .announce-card:active {
    opacity: 0.85;
  }

  .announce-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .announce-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .announce-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .announce-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .pin-badge {
    flex-shrink: 0;
    font-size: 11px;
    color: #fff;
    background: #ff4d4f;
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1.4;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .announce-type-tag {
    font-size: 11px;
    color: var(--primary, #379bff);
    background: rgba(55, 155, 255, 0.12);
    padding: 2px 8px;
    border-radius: 6px;
    line-height: 1.6;
  }

  .announce-date {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .announce-views {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .announce-summary {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  /* 加载/空/错误态 */
  .loading-state,
  .error-state {
    text-align: center;
    padding: 40px 0;
    font-size: 14px;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }

  .load-more {
    text-align: center;
    padding: 16px 0;
    font-size: 14px;
    color: var(--primary, #379bff);
  }

  /* 详情弹窗（居中） */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .detail-sheet {
    width: 100%;
    max-width: 500px;
    max-height: 75vh;
    background: var(--bg-primary);
    border-radius: 20px;
    padding: 16px 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 12px;
  }

  .detail-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .detail-header-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .detail-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
  }

  .detail-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .detail-date {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .detail-close {
    font-size: 24px;
    color: var(--text-secondary);
    padding: 4px 12px;
  }

  .detail-body {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    flex: 1;
  }

  .detail-content {
    font-size: 15px;
    color: var(--text-primary);
    line-height: 1.8;
    white-space: pre-wrap;
  }

  .detail-admin {
    display: block;
    margin-top: 16px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 60px 0;
  }

  .empty-icon {
    font-size: 40px;
  }

  .empty-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  /* 液态玻璃：已改用 glass-base 工具类 */
</style>
