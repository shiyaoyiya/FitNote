<template>
  <view v-if="visible" class="popup-overlay" @click.self="$emit('close')">
    <view class="overlay-bg" @click="$emit('close')"></view>
    <view class="center-panel" :class="{ 'pop-in': !swiping }" @click.stop>
      <!-- 顶部个人卡片（点击进入个人中心） -->
      <view class="profile-card" @click="onGoProfile">
        <image v-if="userAvatar" class="profile-avatar" :src="userAvatar" mode="aspectFill" />
        <view v-else class="profile-avatar-placeholder"></view>
        <view class="profile-info">
          <text class="profile-name">{{ nickname || '未登录' }}</text>
          <text class="profile-status">云端已同步 · ID {{ userId || '-' }}</text>
        </view>
        <text class="profile-arrow">›</text>
      </view>

      <!-- 分组：个人与数据 -->
      <view class="menu-section">
        <text class="section-title">个人与数据</text>
        <view class="menu-item" @click="$emit('go-backup'); close()">
          <text class="menu-icon">☁️</text>
          <text class="menu-text">数据备份 / 云端同步</text>
          <text class="menu-sub">已登录</text>
        </view>
        <view class="menu-item" @click="$emit('go-template-manager'); close()">
          <text class="menu-icon">🧩</text>
          <text class="menu-text">模板广场</text>
          <text class="menu-sub">分享 · 下载</text>
        </view>
        <!-- #ifndef MP-WEIXIN -->
        <view class="menu-item" @click="$emit('go-announce'); close()">
          <text class="menu-icon">📢</text>
          <text class="menu-text">系统公告</text>
          <text class="menu-sub">最新动态</text>
        </view>
        <view class="menu-item" @click="$emit('feedback'); close()">
          <text class="menu-icon">💬</text>
          <text class="menu-text">反馈与建议</text>
          <text class="menu-sub">提交 Issue</text>
        </view>
        <!-- #endif -->
      </view>

      <!-- 分组：显示与偏好 -->
      <view class="menu-section">
        <text class="section-title">显示与偏好</text>
        <view class="menu-item" @click="$emit('toggle-theme'); close()">
          <text class="menu-icon">{{ isDarkMode ? '☀️' : '🌙' }}</text>
          <text class="menu-text">{{ isDarkMode ? '切换浅色模式' : '切换深色模式' }}</text>
        </view>
        <view class="menu-item" @click="$emit('toggle-liquid-glass'); close()">
          <text class="menu-icon">✨</text>
          <text class="menu-text">{{ liquidGlassEnabled ? '关闭液态玻璃' : '开启液态玻璃' }}</text>
        </view>
        <view class="menu-item" @click="$emit('toggle-train-btn'); close()">
          <text class="menu-icon">{{ trainBtnVisible ? '👁' : '🙈' }}</text>
          <text class="menu-text">{{ trainBtnVisible ? '隐藏快捷训练按钮' : '显示快捷训练按钮' }}</text>
        </view>
        <view class="menu-item" @click="$emit('add-anniv'); close()">
          <text class="menu-icon">📝</text>
          <text class="menu-text">添加纪念日</text>
        </view>
        <view class="menu-item" @click="$emit('read-guide'); close()">
          <text class="menu-icon">📖</text>
          <text class="menu-text">阅读说明 / 新手指引</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { me } from '@/utils/serverBackup.js'
  export default {
    name: 'MoreMenu',
    props: {
      visible: { type: Boolean, default: false },
      isDarkMode: { type: Boolean, default: true },
      trainBtnVisible: { type: Boolean, default: true },
      liquidGlassEnabled: { type: Boolean, default: false },
    },
    emits: ['close', 'read-guide', 'add-anniv', 'toggle-train-btn', 'toggle-theme', 'toggle-liquid-glass',
      'go-backup', 'go-template-manager', 'go-announce', 'feedback', 'go-profile'],
    computed: {
      userAvatar() {
        try { return (me() && me().avatarUrl) || '' } catch (e) { return '' }
      },
      nickname() {
        try {
          const u = me()
          return u && (u.nickname || u.username || '') || ''
        } catch (e) { return '' }
      },
      userId() {
        try {
          const u = me()
          return u && (u.id || u.openid || '') || ''
        } catch (e) { return '' }
      },
    },
    data() {
      return { swiping: false }
    },
    methods: {
      close() {
        this.$emit('close')
      },
      onGoProfile() {
        this.swiping = true
        this.close()
        setTimeout(() => {
          this.$emit('go-profile')
          this.swiping = false
        }, 200)
      },
    },
  }
</script>

<style scoped>
  .popup-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .overlay-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0, 0, 0, 0.55);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }

  .center-panel {
    position: relative;
    width: 80vw;
    max-width: 380px;
    max-height: 80vh;
    padding: 24px 20px 20px;
    overflow-y: auto;
    z-index: 1;
    border-radius: 24px;
    background: rgba(30, 30, 30, 0.75);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
    box-shadow:
      0 0 0 0.5px rgba(255,255,255,0.15) inset,
      0 1px 3px rgba(255,255,255,0.08) inset,
      0 8px 32px rgba(0,0,0,0.5);
  }

  .center-panel.pop-in {
    animation: popIn 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.88); }
    to { opacity: 1; transform: scale(1); }
  }

  /* 浅色模式 */
  .container.light .center-panel {
    background: rgba(255, 255, 255, 0.75);
    box-shadow:
      0 0 0 0.5px rgba(255,255,255,0.6) inset,
      0 1px 3px rgba(255,255,255,0.5) inset,
      0 8px 32px rgba(0,0,0,0.12);
  }

  /* === 顶部个人卡片 === */
  .profile-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border-radius: 18px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, rgba(55,155,255,0.18), rgba(0,72,255,0.12));
    border: 1rpx solid rgba(55,155,255,0.25);
  }

  .profile-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #379bff, #0048ff);
    flex-shrink: 0;
  }

  .profile-avatar-placeholder {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #379bff, #0048ff);
    flex-shrink: 0;
    position: relative;
  }
  .profile-avatar-placeholder::after {
    content: '👤';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .profile-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .profile-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary, #fff);
    line-height: 1.2;
  }

  .profile-status {
    font-size: 12px;
    color: var(--text-muted, rgba(255,255,255,0.5));
    line-height: 1.2;
  }

  .profile-arrow {
    font-size: 26px;
    color: var(--text-muted, rgba(255,255,255,0.4));
    line-height: 1;
  }

  /* === 分组 === */
  .menu-section {
    margin-bottom: 20px;
  }

  .section-title {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted, rgba(255,255,255,0.5));
    letter-spacing: 0.5px;
    padding: 0 4px 8px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 4px;
    border-bottom: 1rpx solid rgba(255,255,255,0.06);
    transition: background 0.12s;
  }

  .menu-item:active {
    background: rgba(255,255,255,0.06);
  }

  .menu-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .menu-text {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary, #fff);
  }

  .menu-sub {
    font-size: 12px;
    color: var(--text-muted, rgba(255,255,255,0.45));
  }
</style>
