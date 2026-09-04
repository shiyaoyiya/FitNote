<template>
  <scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }" scroll-y="true">
    <!-- 公告列表 -->
    <view class="announce-list">
      <view v-for="(item, idx) in announcements" :key="idx" class="announce-card" @click="openDetail(item)">
        <view class="announce-card-header">
          <text class="announce-icon">{{ item.icon }}</text>
          <view class="announce-card-info">
            <text class="announce-title">{{ item.title }}</text>
            <text class="announce-date">{{ item.date }}</text>
          </view>
          <text v-if="!item.read" class="announce-dot"></text>
        </view>
        <text class="announce-summary">{{ item.summary }}</text>
      </view>

      <view v-if="announcements.length === 0" class="empty-state">
        <text class="empty-icon">📢</text>
        <text class="empty-text">暂无公告</text>
      </view>
    </view>

    <!-- 公告详情弹窗 -->
    <view v-if="activeDetail" class="detail-overlay" @click.self="closeDetail">
      <view class="overlay-bg" @click="closeDetail"></view>
      <view class="detail-sheet" @click.stop>
        <view class="detail-header">
          <text class="detail-icon">{{ activeDetail.icon }}</text>
          <view class="detail-header-info">
            <text class="detail-title">{{ activeDetail.title }}</text>
            <text class="detail-date">{{ activeDetail.date }}</text>
          </view>
          <text class="detail-close" @click="closeDetail">×</text>
        </view>
        <view class="detail-body">
          <text class="detail-content">{{ activeDetail.content }}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        activeDetail: null,
        announcements: [
          {
            icon: '🎉',
            title: 'FitNote v2.0 正式发布',
            date: '2026-09-01',
            summary: '全新液态玻璃 UI、训练分析、心率监测等功能上线，快来体验吧！',
            content: 'FitNote v2.0 正式发布！本次更新带来以下重大功能：\n\n1. 液态玻璃 UI 主题 — 全新视觉体验，支持深色/浅色模式\n2. 训练分析模块 — 容量负荷、心率区间、心血管负荷等指标\n3. BLE 心率监测 — 实时心率显示与区间指导\n4. 模板广场 — 分享和导入训练模板\n5. 页面侧滑切换 — 更流畅的 Tab 切换体验\n\n感谢您的支持，祝您训练愉快！',
            read: false,
          },
          {
            icon: '🔧',
            title: '微信小程序兼容性优化',
            date: '2026-08-28',
            summary: '修复了微信小程序中多项兼容性问题，提升稳定性。',
            content: '本次更新修复了微信小程序环境下的多项兼容性问题：\n\n1. 修复计时器弹窗 canvas 穿透问题\n2. 修复底部按钮栏布局错乱\n3. 修复动作库分类标签点击无反应\n4. 优化云端备份流程\n\n请在微信中更新体验。',
            read: true,
          },
          {
            icon: '📊',
            title: '训练数据分析功能上线',
            date: '2026-08-20',
            summary: '新增训练分析卡片，支持容量负荷、心率区间等指标查看。',
            content: '训练数据分析功能已上线！\n\n现在您可以在训练日页面查看：\n- 机械训练负荷（总容量）\n- 心血管负荷（HRR 积分）\n- 平均/峰值心率\n- 心率区间分布\n- 训练强度指导\n\n点击训练分析卡片可查看完整报告。',
            read: true,
          },
        ],
      }
    },
    methods: {
      openDetail(item) {
        this.activeDetail = item
        item.read = true
      },
      closeDetail() {
        this.activeDetail = null
      },
    },
  }
</script>

<style scoped>
  .container {
    min-height: 100vh;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
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
  }

  .announce-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .announce-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .announce-date {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .announce-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4d4f;
    flex-shrink: 0;
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

  /* 详情弹窗 */
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
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    background: var(--bg-primary);
    border-radius: 20px 20px 0 0;
    padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));
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
  }

  .detail-header-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
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

  /* detail-body: 用 view 替代 scroll-view，防越界 */
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

  /* 液态玻璃 */
  .container.liquid-glass .announce-card,
  .container.liquid-glass .detail-sheet {
    background: var(--glass-bg) !important;
    border: none !important;
    box-shadow: var(--glass-float),
      0 0 0 0.5px var(--glass-edge) inset !important;
    -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
    backdrop-filter: blur(12px) saturate(140%) !important;
  }
</style>
