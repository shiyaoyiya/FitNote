<template>
  <scroll-view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    scroll-y="true">
    <!-- 顶部操作栏 -->
    <view class="top-bar" v-if="!loading && notifications.length > 0">
      <text class="unread-count">未读 {{ unreadCount }} 条 / 共 {{ total }} 条</text>
      <text v-if="unreadCount > 0" class="mark-all-btn" @click="markAllRead">全部已读</text>
    </view>

    <!-- 通知列表 -->
    <view v-if="!loading" class="notify-list">
      <view v-for="item in notifications" :key="item.id" class="notify-card" :class="{ unread: item.isRead === 0 }"
        @click="openItem(item)">
        <view class="notify-header">
          <text class="notify-icon">{{ typeIcon(item.type) }}</text>
          <view class="notify-info">
            <view class="title-row">
              <text class="notify-title">{{ item.title || '系统通知' }}</text>
              <view v-if="item.isRead === 0" class="unread-dot"></view>
            </view>
            <view class="meta-row">
              <text class="notify-type-tag">{{ item.typeText || '系统消息' }}</text>
              <text class="notify-date">{{ formatDate(item.createTime) }}</text>
            </view>
          </view>
        </view>
        <text class="notify-content">{{ item.content || '' }}</text>
      </view>

      <view v-if="notifications.length === 0" class="empty-state">
        <text class="empty-icon">🔔</text>
        <text class="empty-text">暂无通知</text>
      </view>

      <view v-if="notifications.length > 0 && hasMore" class="load-more" @click="loadMore">
        <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && errorMsg" class="error-state" @click="reload">
      <text>{{ errorMsg }}（点击重试）</text>
    </view>

    <!-- 通知详情弹窗 -->
    <view v-if="activeDetail" class="detail-overlay" @click.self="closeDetail">
      <view class="overlay-bg" @click="closeDetail"></view>
      <view class="detail-panel" @click.stop>
        <view class="detail-header">
          <view class="detail-icon-wrap">
            <text class="detail-icon">{{ typeIcon(activeDetail.type) }}</text>
          </view>
          <view class="detail-header-info">
            <text class="detail-title">{{ activeDetail.title || '系统通知' }}</text>
            <view class="detail-meta">
              <text class="detail-type-tag">{{ activeDetail.typeText || '系统消息' }}</text>
              <text class="detail-date">{{ formatDate(activeDetail.createTime) }}</text>
            </view>
          </view>
          <text class="detail-close" @click="closeDetail">×</text>
        </view>
        <scroll-view class="detail-body" scroll-y>
          <text class="detail-content">{{ activeDetail.content || '' }}</text>
        </scroll-view>
        <view class="detail-footer">
          <view :class="['detail-btn', 'glass-btn-primary', {  }]" @click="closeDetail">
            <text>知道了</text>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    listMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
  } from '@/subpkg-secondary/utils/serverCommunity.js'
  import {
    isLoggedIn
  } from '@/utils/serverBackup.js'

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        notifications: [],
        total: 0,
        unreadCount: 0,
        page: 1,
        size: 20,
        hasMore: true,
        loading: false,
        loadingMore: false,
        errorMsg: '',
        activeDetail: null,
      }
    },
    onLoad() {
      this.daySettingsStore.load()
      if (!isLoggedIn()) {
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        })
        setTimeout(() => uni.navigateBack({
          fail: () => uni.switchTab({
            url: '/pages/index/index'
          })
        }), 800)
        return
      }
      this.reload()
    },
    onShow() {
      // 每次显示页面刷新未读数
      this.refreshUnreadCount()
    },
    methods: {
      async reload() {
        this.page = 1
        this.notifications = []
        this.hasMore = true
        this.errorMsg = ''
        this.loading = true
        try {
          await this.fetchPage()
        } catch (e) {
          this.errorMsg = e?.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async loadMore() {
        if (this.loadingMore || !this.hasMore) return
        this.loadingMore = true
        try {
          await this.fetchPage()
        } catch (e) {
          uni.showToast({
            title: e?.message || '加载失败',
            icon: 'none'
          })
        } finally {
          this.loadingMore = false
        }
      },
      async fetchPage() {
        const res = await listMyNotifications({
          page: this.page,
          size: this.size,
          isRead: null
        })
        const list = res?.list || []
        if (this.page === 1) {
          this.notifications = list
        } else {
          this.notifications = this.notifications.concat(list)
        }
        this.total = res?.total ?? this.notifications.length
        this.hasMore = this.notifications.length < this.total && list.length > 0
        if (list.length > 0) this.page += 1
        await this.refreshUnreadCount()
      },
      async refreshUnreadCount() {
        try {
          this.unreadCount = await getUnreadNotificationCount()
        } catch (e) {
          // ignore
        }
      },
      async openItem(item) {
        if (item.isRead === 0) {
          // 标记已读
          try {
            await markNotificationRead(item.id)
            item.isRead = 1
            this.unreadCount = Math.max(0, this.unreadCount - 1)
            uni.vibrateShort && uni.vibrateShort({
              type: 'light'
            })
          } catch (e) {
            // ignore
          }
        }
        // 显示详情弹窗
        this.activeDetail = item
      },
      closeDetail() {
        this.activeDetail = null
      },
      async markAllRead() {
        try {
          await markAllNotificationsRead()
          this.notifications.forEach((n) => {
            n.isRead = 1
          })
          this.unreadCount = 0
          uni.showToast({
            title: '已全部标记为已读',
            icon: 'success'
          })
        } catch (e) {
          uni.showToast({
            title: e?.message || '操作失败',
            icon: 'none'
          })
        }
      },
      typeIcon(type) {
        switch (type) {
          case 1:
            return '⚠️'
          case 2:
            return '⬇️'
          case 3:
            return '💬'
          case 4:
            return '📢'
          default:
            return '🔔'
        }
      },
      formatDate(t) {
        if (!t) return '-'
        const s = String(t).replace('T', ' ')
        return s.substring(0, 16)
      },
    },
  }
</script>

<style scoped>
  .container {
    min-height: 100vh;
    background-color: var(--bg-primary);
    padding: 16px 14px 40px;
    box-sizing: border-box;
  }

  .container.dark {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.light {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 4px 12px;
  }

  .unread-count {
    font-size: 12px;
    color: var(--text-muted);
  }

  .mark-all-btn {
    font-size: 13px;
    color: var(--primary, #379bff);
    padding: 4px 10px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .mark-all-btn:active {
    opacity: 0.6;
  }

  .notify-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .notify-card {
    background: var(--bg-secondary);
    border-radius: 14px;
    padding: 14px 14px 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    border: 1px solid var(--border-color);
    transition: transform 0.12s;
  }

  .notify-card:active {
    transform: scale(0.98);
  }

  .notify-card.unread {
    border-left: 3px solid var(--primary, #379bff);
  }

  .notify-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 8px;
  }

  .notify-icon {
    font-size: 18px;
    line-height: 1.2;
  }

  .notify-info {
    flex: 1;
    min-width: 0;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .notify-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
    word-break: break-all;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger, #ff5a5d);
    flex-shrink: 0;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .notify-type-tag {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 8px;
  }

  .notify-date {
    font-size: 11px;
    color: var(--text-muted);
  }

  .notify-content {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    word-break: break-all;
  }

  .empty-state,
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-text {
    font-size: 14px;
  }

  .load-more {
    text-align: center;
    padding: 14px;
    color: var(--primary, #379bff);
    font-size: 13px;
  }

  /* ===== 通知详情弹窗 ===== */
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

  .detail-panel {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: 78vh;
    background-color: var(--bg-secondary);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px 14px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .detail-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .detail-icon {
    font-size: 22px;
  }

  .detail-header-info {
    flex: 1;
    min-width: 0;
  }

  .detail-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    display: block;
    margin-bottom: 4px;
    word-break: break-all;
  }

  .detail-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .detail-type-tag {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 8px;
  }

  .detail-date {
    font-size: 11px;
    color: var(--text-muted);
  }

  .detail-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .detail-close:active {
    opacity: 0.5;
  }

  .detail-body {
    flex: 1;
    width: 100%;
    padding: 16px;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .detail-content {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-primary);
    word-break: break-all;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  .detail-footer {
    padding: 10px 16px 16px;
    flex-shrink: 0;
  }

  .detail-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .detail-btn:active {
    transform: scale(0.97);
    opacity: 0.9;
  }

  /* detail-btn.liquid-glass-btn 已改用 glass-btn-primary 工具类 */
</style>