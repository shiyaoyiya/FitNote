<template>
  <view class="calendar-month" :class="{ sliding: isSliding }">
    <view class="calendar-header">
      <text class="month-title" @click="handleGoToYearPage">{{ year }}/{{ month + 1 }}</text>
      <view class="more-btn-wrap">
        <view class="more-btn" @click="showMoreMenu = true">
          <text class="more-dots">⋮</text>
        </view>
      </view>
    </view>
    <view class="weekday-row">
      <text class="weekday">日</text>
      <text class="weekday">一</text>
      <text class="weekday">二</text>
      <text class="weekday">三</text>
      <text class="weekday">四</text>
      <text class="weekday">五</text>
      <text class="weekday">六</text>
    </view>
    <view class="calendar-grid">
      <view v-for="date in monthDays" :key="date.key" class="calendar-cell" :class="{
        today: date.isToday && !getTemplateColor(date.full),
        'today-has-template': date.isToday && getTemplateColor(date.full)
      }" :style="getCellStyle(date.full)" @click="!date.isEmpty && handleDateClick(date.full)"
        @longpress="!date.isEmpty && handleDateLongPress(date.full)">
        <view class="cell-content">
          <template v-if="date.isEmpty">
          </template>
          <template v-else-if="getTemplateColor(date.full)">
            <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
              :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
              {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
            </text>
            <text class="cell-text" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
              {{ date.day }}
            </text>
            <text class="template-name" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
              {{ getTemplateName(date.full) }}
            </text>
          </template>
          <template v-else>
            <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
              :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
              {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
            </text>
            <text class="cell-text">{{ date.day }}</text>
            <text v-if="getTemplateName(date.full)" class="template-name">
              {{ getTemplateName(date.full) }}
            </text>
          </template>
        </view>
      </view>
    </view>

    <view v-if="showMoreMenu" class="menu-overlay" @click.self="showMoreMenu = false">
      <view class="overlay-bg" @click="showMoreMenu = false"></view>
      <view class="menu-panel fade-in">
        <view class="menu-item" @click="onMenuReadGuide">
          <text class="menu-icon">📖</text>
          <text class="menu-text">阅读说明</text>
        </view>
        <view class="menu-item" @click="onMenuAddAnniv">
          <text class="menu-icon">📝</text>
          <text class="menu-text">添加纪念日</text>
        </view>
        <view class="menu-item" @click="onMenuToggleTrainBtn">
          <text class="menu-icon">{{ trainBtnVisible ? '👁' : '🙈' }}</text>
          <text class="menu-text">{{ trainBtnVisible ? '隐藏快捷训练按钮' : '显示快捷训练按钮' }}</text>
        </view>
      </view>
    </view>

    <view v-if="showGuidePanel" class="guide-overlay">
      <view class="overlay-bg" @click="showGuidePanel = false"></view>
      <view class="guide-panel fade-in">
        <view class="guide-header">
          <text class="guide-title">FitNote 功能说明</text>
          <text class="close-icon" @click="showGuidePanel = false">×</text>
        </view>
        <scroll-view class="guide-body" scroll-y="true" show-scrollbar="false">
          <view v-for="(item, idx) in GUIDE_CONTENT" :key="idx" class="guide-item">
            <text class="guide-icon">{{ item.icon }}</text>
            <view class="guide-content">
              <text class="guide-item-title">{{ item.title }}</text>
              <text class="guide-item-desc">{{ item.desc }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
  const GUIDE_CONTENT = [{
      icon: '📅',
      title: '日历浏览',
      desc: '首页展示月历，点击日期可查看/记录当日训练。左滑右滑切换月份，长按日期可清空该日记录'
    },
    {
      icon: '🏋️',
      title: '今日训练',
      desc: '点击"开始训练"按钮进入训练页面，从预设模板中选择，记录每个动作的重量和次数，自动计算与上次训练的对比'
    },
    {
      icon: '💪',
      title: '训练模板',
      desc: '在"训练模板"页面管理个人模板，支持创建、编辑、删除，添加/移除动作'
    },
    {
      icon: '📊',
      title: '训练统计',
      desc: '查看周/月训练总量，各肌群训练频次分析'
    },
    {
      icon: '📝',
      title: '纪念日',
      desc: '记录重要日期，首页底部展示已过去的天数'
    },
    {
      icon: '⏱️',
      title: '计时休息',
      desc: '记录训练组间休息时长，自动计时功能，支持自定义时长'
    },
  ]

  export default {
    name: 'CalendarMonth',
    props: {
      year: {
        type: Number,
        required: true
      },
      month: {
        type: Number,
        required: true
      },
      monthDays: {
        type: Array,
        required: true
      },
      isSliding: {
        type: Boolean,
        default: false
      },
      getTemplateColor: {
        type: Function,
        required: true
      },
      getTotalWeight: {
        type: Function,
        required: true
      },
      isAerobicDay: {
        type: Function,
        required: true
      },
      getTemplateName: {
        type: Function,
        required: true
      },
      getContrastColor: {
        type: Function,
        required: true
      },
      getCellStyle: {
        type: Function,
        required: true
      },
      trainBtnVisible: {
        type: Boolean,
        default: true
      }
    },
    emits: ['open-anniv-popup', 'toggle-train-btn'],
    data() {
      return {
        showMoreMenu: false,
        showGuidePanel: false,
        GUIDE_CONTENT,
      }
    },
    methods: {
      handleDateClick(date) {
        this.$emit('date-click', date);
      },
      handleDateLongPress(date) {
        this.$emit('date-longpress', date);
      },
      handleGoToYearPage() {
        this.$emit('go-to-year-page');
      },
      handleOpenAnnivPopup() {
        this.$emit('open-anniv-popup', null);
      },
      onMenuReadGuide() {
        this.showMoreMenu = false
        this.showGuidePanel = true
      },
      onMenuAddAnniv() {
        this.showMoreMenu = false
        this.$emit('open-anniv-popup', null)
      },
      onMenuToggleTrainBtn() {
        this.showMoreMenu = false
        this.$emit('toggle-train-btn')
      }
    }
  };
</script>

<style scoped>
  .calendar-month {
    width: 100%;
    transition: all 0.3s ease;
  }

  .calendar-month.sliding {
    opacity: 0.7;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    margin-bottom: 5px;
  }

  .month-title {
    font-size: 34px;
    font-weight: bold;
    color: inherit;
  }

  .icon-add-wrap {
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(128, 128, 128, 0.1);
    border-radius: 50%;
  }

  .icon-plus {
    font-size: 22px;
    color: #379bff;
    font-weight: 300;
  }

  .weekday-row {
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
    margin-bottom: 10px;
  }

  .weekday {
    width: calc(100% / 7);
    text-align: center;
    font-size: 14px;
    color: #666666;
  }

  .calendar-grid {
    display: flex;
    flex-wrap: wrap;
  }

  .calendar-cell {
    width: calc(100% / 7 - 4px);
    margin: 2px;
    margin-bottom: 5px;
    aspect-ratio: 1;
    border-radius: 20rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 60px;
  }

  .cell-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .cell-text {
    font-size: 14px;
    color: #f7f7f7;
    font-weight: bold;
  }

  .template-name {
    font-size: 9px;
    margin: 0 4px;
  }

  .calendar-cell.today {
    background-color: #379bff;
  }

  .calendar-cell.today .cell-text {
    color: #fff;
  }

  .weight-text {
    font-size: 10px;
    margin-bottom: -4px;
    text-align: center;
    width: 100%;
  }

  .more-btn-wrap {
    display: flex;
    align-items: center;
  }

  .more-btn {
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(128, 128, 128, 0.1);
    border-radius: 50%;
  }

  .more-dots {
    font-size: 20px;
    color: #379bff;
    line-height: 1;
  }

  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .menu-overlay .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .guide-overlay .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .menu-panel {
    position: relative;
    width: 60vw;
    max-width: 280px;
    background-color: #1e1e1e;
    border-radius: 12px;
    overflow: hidden;
    z-index: 1;
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid #333;
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:active {
    background-color: #2a2a2a;
  }

  .menu-icon {
    font-size: 20px;
    margin-right: 12px;
  }

  .menu-text {
    font-size: 15px;
    color: #fff;
  }

  .guide-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
  }

  .guide-panel {
    position: relative;
    width: 90vw;
    max-height: 80vh;
    background-color: #1e1e1e;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 100000;
  }

  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .guide-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333;
  }

  .guide-title {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
  }

  .close-icon {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    color: #888;
    border-radius: 50%;
  }

  .close-icon:active {
    background-color: rgba(255, 255, 255, 0.1);
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
    border-bottom: 1px solid #2a2a2a;
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
    color: #fff;
    margin-bottom: 2px;
  }

  .guide-item-desc {
    font-size: 12px;
    color: #aaa;
    line-height: 1.4;
  }
</style>