<template>
  <view v-if="visible" class="popup-overlay" @click.self="close">
    <view class="overlay-bg" @click="close"></view>
    <view class="menu-panel fade-in" @click.stop>
      <view class="menu-item" @click="$emit('read-guide'); close()">
        <text class="menu-icon">📖</text>
        <text class="menu-text">阅读说明</text>
      </view>
      <view class="menu-item" @click="$emit('add-anniv'); close()">
        <text class="menu-icon">📝</text>
        <text class="menu-text">添加纪念日</text>
      </view>
      <view class="menu-item" @click="$emit('toggle-train-btn'); close()">
        <text class="menu-icon">{{ trainBtnVisible ? '👁' : '🙈' }}</text>
        <text class="menu-text">{{ trainBtnVisible ? '隐藏快捷训练按钮' : '显示快捷训练按钮' }}</text>
      </view>
      <view class="menu-item" @click="$emit('toggle-theme'); close()">
        <text class="menu-icon">{{ isDarkMode ? '☀️' : '🌙' }}</text>
        <text class="menu-text">{{ isDarkMode ? '切换浅色模式' : '切换深色模式' }}</text>
      </view>
      <view class="menu-item" @click="$emit('toggle-liquid-glass'); close()">
        <text class="menu-icon">✨</text>
        <text class="menu-text">{{ liquidGlassEnabled ? '关闭液态玻璃' : '开启液态玻璃' }}</text>
      </view>
      <!-- #ifndef MP-WEIXIN -->
      <view class="menu-item" @click="$emit('go-announce'); close()">
        <text class="menu-icon">📢</text>
        <text class="menu-text">系统公告</text>
      </view>
      <view class="menu-item" @click="$emit('feedback'); close()">
        <text class="menu-icon">💬</text>
        <text class="menu-text">反馈与建议</text>
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script>
  export default {
    name: 'MoreMenu',
    props: {
      visible: { type: Boolean, default: false },
      isDarkMode: { type: Boolean, default: true },
      trainBtnVisible: { type: Boolean, default: true },
      liquidGlassEnabled: { type: Boolean, default: false },
    },
    emits: ['close', 'read-guide', 'add-anniv', 'toggle-train-btn', 'toggle-theme', 'toggle-liquid-glass', 'go-announce', 'feedback'],
    methods: {
      close() {
        this.$emit('close')
      },
    },
  }
</script>

<style scoped>
  .popup-overlay {
    width: 100vw;
    height: 100vh;
    pointer-events: auto;
    align-items: center;
  }

  .overlay-bg {
    background-color: rgba(0, 0, 0, 0.7) !important;
  }

  .menu-panel {
    position: relative;
    width: 90vw;
    max-width: 360px;
    background-color: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    z-index: 1;
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color);
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:active {
    background-color: var(--bg-tertiary);
  }

  .menu-icon {
    font-size: 20px;
    margin-right: 12px;
  }

  .menu-text {
    font-size: 15px;
    color: var(--text-primary);
  }

  .fade-in {
    animation: modalFadeIn 0.25s ease;
  }

  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
