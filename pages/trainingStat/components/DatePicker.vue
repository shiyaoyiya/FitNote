<template>
  <view class="date-picker-row">
    <view class="nav-btn" @click="onPrev">
      <text class="nav-arrow">‹</text>
    </view>
    <view class="date-display" @click="showPopup = true">
      <text class="date-text">{{ displayText }}</text>
      <text class="date-dropdown-icon">▼</text>
    </view>
    <view class="nav-btn" @click="onNext">
      <text class="nav-arrow">›</text>
    </view>
  </view>

  <view v-if="showPopup" class="popup-overlay" @click.self="showPopup = false">
    <view class="overlay-bg" @click="showPopup = false"></view>
    <view class="picker-panel fade-in" @click.stop>
      <view class="picker-header">
        <text class="picker-title">选择日期</text>
        <text class="close-icon" @click="showPopup = false">×</text>
      </view>
      <view class="picker-body">
        <view class="picker-col">
          <view v-for="y in availableYears" :key="y" class="picker-item" :class="{ selected: y === tempYear }"
            @click="selectYear(y)">
            {{ y }}年
          </view>
        </view>
        <view class="picker-col">
          <view v-for="m in 12" :key="m" class="picker-item"
            :class="{ selected: m === tempMonth, disabled: !isMonthAvailable(m) }" @click="selectMonth(m)">
            {{ m }}月
          </view>
        </view>
      </view>
      <view class="picker-footer">
        <text class="btn-confirm" @click="confirmPick">确定</text>
      </view>
    </view>
  </view>
</template>

<script setup>
  import {
    ref,
    computed,
    watch
  } from 'vue'

  const props = defineProps({
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true
    },
    minYear: {
      type: Number,
      default: 2020
    },
    minMonth: {
      type: Number,
      default: 1
    },
    maxYear: {
      type: Number,
      required: true
    },
    maxMonth: {
      type: Number,
      required: true
    },
    period: {
      type: String,
      default: 'month'
    },
  })

  const emit = defineEmits(['update:year', 'update:month'])

  const showPopup = ref(false)
  const tempYear = ref(props.year)
  const tempMonth = ref(props.month)

  const now = new Date()

  const displayText = computed(() => {
    if (props.period === 'year') {
      return `${props.year}年`
    }
    return `${props.year}年${props.month}月`
  })

  watch(showPopup, (val) => {
    if (val) {
      tempYear.value = props.year
      tempMonth.value = props.month
    }
  })

  function selectYear(y) {
    tempYear.value = y
    if (!isMonthAvailable(tempMonth.value)) {
      const firstValid = getFirstValidMonth(y)
      if (firstValid !== -1) {
        tempMonth.value = firstValid
      }
    }
  }

  function getFirstValidMonth(y) {
    for (let m = 1; m <= 12; m++) {
      if (y === props.minYear && m < props.minMonth) continue
      if (y === props.maxYear && m > props.maxMonth) continue
      return m
    }
    return -1
  }

  function isMonthAvailable(m) {
    if (tempYear.value < props.minYear || tempYear.value > props.maxYear) return false
    if (tempYear.value === props.minYear && m < props.minMonth) return false
    if (tempYear.value === props.maxYear && m > props.maxMonth) return false
    return true
  }

  function selectMonth(m) {
    if (!isMonthAvailable(m)) return
    tempMonth.value = m
  }

  const availableYears = computed(() => {
    const years = []
    for (let y = props.minYear; y <= props.maxYear; y++) {
      years.push(y)
    }
    return years
  })

  function onPrev() {
    if (props.period === 'year') {
      let y = props.year - 1
      if (y < props.minYear) return
      emit('update:year', y)
    } else {
      let y = props.year
      let m = props.month - 1
      if (m < 1) {
        m = 12;
        y -= 1
      }
      if (y < props.minYear || (y === props.minYear && m < props.minMonth)) return
      emit('update:year', y)
      emit('update:month', m)
    }
  }

  function onNext() {
    if (props.period === 'year') {
      let y = props.year + 1
      if (y > props.maxYear) return
      emit('update:year', y)
    } else {
      let y = props.year
      let m = props.month + 1
      if (m > 12) {
        m = 1;
        y += 1
      }
      if (y > props.maxYear || (y === props.maxYear && m > props.maxMonth)) return
      emit('update:year', y)
      emit('update:month', m)
    }
  }

  function confirmPick() {
    emit('update:year', tempYear.value)
    emit('update:month', tempMonth.value)
    showPopup.value = false
  }
</script>

<style scoped>
  .date-picker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--card-bg, #ffffff);
  }

  .nav-btn:active {
    opacity: 0.6;
  }

  .nav-arrow {
    display: none;
  }

  .nav-btn::before {
    content: '';
    display: block;
    width: 8px;
    height: 8px;
    border: solid var(--text-primary, #333333);
    border-width: 2px 0 0 2px;
  }

  /* 上一个箭头（‹） */
  .nav-btn:first-child::before {
    transform: rotate(-45deg);
  }

  /* 下一个箭头（›） */
  .nav-btn:last-child::before {
    transform: rotate(135deg);
  }

  .date-display {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 8px;
    background-color: var(--card-bg, #ffffff);
    margin: 0px 5px;
  }

  .date-text {
    font-size: 15px;
    font-weight: bold;
    color: var(--text-primary, #333333);
  }

  .date-dropdown-icon {
    font-size: 10px;
    color: var(--text-secondary, #999999);
  }

  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
  }

  .picker-panel {
    position: relative;
    width: 80vw;
    max-width: 320px;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1001;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .fade-in {
    animation: fadeIn 0.25s ease;
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

  .container.dark .picker-panel {
    background-color: #1e1e1e;
  }

  .picker-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
  }

  .container.dark .picker-header {
    border-bottom: 1px solid #333;
  }

  .picker-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--text-primary, #333333);
  }

  .close-icon {
    font-size: 22px;
    color: #999;
    padding: 0 4px;
  }

  .picker-body {
    display: flex;
    flex-direction: row;
    max-height: 300px;
    overflow: hidden;
  }

  .picker-col {
    flex: 1;
    overflow-y: auto;
    max-height: 300px;
    padding: 8px 0;
  }

  .picker-col:first-child {
    border-right: 1px solid #f0f0f0;
  }

  .container.dark .picker-col:first-child {
    border-right: 1px solid #333;
  }

  .picker-item {
    text-align: center;
    padding: 10px 0;
    font-size: 15px;
    color: var(--text-primary, #333333);
  }

  .picker-item.selected {
    color: #379bff;
    font-weight: bold;
    background-color: rgba(55, 155, 255, 0.08);
  }

  .picker-item.disabled {
    color: #ccc;
    pointer-events: none;
  }

  .container.dark .picker-item.disabled {
    color: #555;
  }

  .picker-footer {
    padding: 12px 16px;
    display: flex;
    justify-content: center;
    border-top: 1px solid #eee;
  }

  .container.dark .picker-footer {
    border-top: 1px solid #333;
  }

  .btn-confirm {
    flex: 1;
    height: 40px;
    line-height: 40px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-confirm:active {
    transform: scale(0.95);
    opacity: 0.9;
  }
</style>