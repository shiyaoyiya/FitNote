<template>
  <view v-if="visible" class="popup-overlay">
    <view class="overlay-bg" @click="close"></view>
    <view class="guide-panel fade-in">
      <view class="guide-header">
        <text class="guide-title">FitNote 功能说明</text>
        <text class="close-icon" @click="close">×</text>
      </view>
      <scroll-view class="guide-body" scroll-y="true" show-scrollbar="false">
        <view v-for="(item, idx) in guideContent" :key="idx" class="guide-item">
          <text class="guide-icon">{{ item.icon }}</text>
          <view class="guide-content">
            <text class="guide-item-title">{{ item.title }}</text>
            <text class="guide-item-desc">{{ item.desc }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
  const GUIDE_CONTENT = [
    { icon: '📅', title: '日历浏览', desc: '首页展示月历，点击日期可查看/记录当日训练。左滑右滑切换月份，长按日期可清空该日记录' },
    { icon: '🏋️', title: '今日训练', desc: '点击"开始训练"按钮/日历格子进入训练页面，可从预设模板中选择，记录每个动作的重量和次数，自动计算与上次训练的对比' },
    { icon: '💪', title: '训练模板', desc: '在"训练模板"页面管理个人模板，支持创建、编辑、删除，添加/移除动作' },
    { icon: '📊', title: '训练统计', desc: '查看周/月训练总量，各肌群训练频次分析' },
    { icon: '📝', title: '纪念日', desc: '记录重要日期，首页底部展示已过去的天数' },
    { icon: '⏱️', title: '计时休息', desc: '长按排序、侧滑删除是绝大部分页面的交互方式' },
  ]

  export default {
    name: 'GuidePopup',
    props: {
      visible: { type: Boolean, default: false },
    },
    emits: ['close'],
    data() {
      return {
        guideContent: GUIDE_CONTENT,
      }
    },
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

  .guide-panel {
    position: relative;
    width: 90vw;
    max-height: 80vh;
    background-color: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  .guide-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
  }

  .guide-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--text-primary);
  }

  .guide-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    max-height: 65vh;
    box-sizing: border-box;
  }

  .guide-item {
    display: flex;
    align-items: flex-start;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .guide-item:last-child {
    border-bottom: none;
  }

  .guide-icon {
    font-size: 22px;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .guide-content {
    flex: 1;
  }

  .guide-item-title {
    font-size: 14px;
    font-weight: bold;
    color: var(--text-primary);
    margin-bottom: 2px;
    display: block;
  }

  .guide-item-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .fade-in {
    animation: modalFadeIn 0.25s ease;
  }

  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
