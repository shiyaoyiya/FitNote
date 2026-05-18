<template>
  <view class="calendar-month" :class="{ sliding: isSliding, light: isLightMode }">
    <view class="calendar-header">
      <text class="month-title" @click="handleGoToYearPage">{{ year }}/{{ month + 1 }}</text>
      <view class="more-btn-wrap">
        <view class="more-btn" @click="$emit('open-more-menu')">
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
  </view>
</template>

<script>
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
      },
      isLightMode: {
        type: Boolean,
        default: false
      }
    },
    emits: ['date-click', 'date-longpress', 'go-to-year-page', 'open-anniv-popup', 'toggle-train-btn',
      'open-more-menu'
    ],
    data() {
      return {}
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

  .calendar-month.light {
    background-color: #f5f5f5;
    color: #333333;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    margin-bottom: 5px;
  }

  .calendar-month.light .calendar-header {
    border-bottom: 1px solid #e0e0e0;
  }

  .month-title {
    font-size: 34px;
    font-weight: bold;
    color: inherit;
  }

  .calendar-month.light .month-title {
    color: #333333;
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

  .calendar-month.light .weekday {
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

  .calendar-month.light .cell-text {
    color: #333333;
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

  .calendar-month.light .calendar-cell.today {
    background-color: #379bff;
  }

  .calendar-month.light .calendar-cell.today .cell-text {
    color: #ffffff;
  }

  .weight-text {
    font-size: 10px;
    margin-bottom: -4px;
    text-align: center;
    width: 100%;
    color: #aaa;
  }

  .calendar-month.light .weight-text {
    color: #999999;
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

  .calendar-month.light .more-btn {
    background: rgba(128, 128, 128, 0.15);
  }

  .more-dots {
    font-size: 20px;
    color: #379bff;
    line-height: 1;
  }

  .template-name {
    font-size: 9px;
    margin: 0 4px;
    color: #aaa;
  }

  .calendar-month.light .template-name {
    color: #999999;
  }
</style>