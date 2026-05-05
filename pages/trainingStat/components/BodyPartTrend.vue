<template>
  <view class="body-part-trend">
    <view class="section-title-row">
      <text class="section-title">部位趋势</text>
      <view class="part-select-btn" @click="showSelector = true">
        <text class="part-select-text">{{ selectedPartName }}</text>
        <text class="part-select-arrow">›</text>
      </view>
    </view>

    <view class="chart-area">
      <view v-if="chartData.length === 0" class="empty-state">暂无训练数据</view>
      <view v-else class="bar-chart">
        <view class="bars-row">
          <view v-for="(item, index) in chartData" :key="index" class="bar-wrapper">
            <view class="bar-value">{{ getValue(item) }}</view>
            <view class="bar" :style="{ height: getBarHeight(item) + 'px' }" />
            <view class="bar-label">{{ item.label }}</view>
          </view>
        </view>
      </view>
    </view>

    <BodyPartSelector v-if="showSelector" :selectedBodyPart="selectedBodyPart" @select="onSelectPart"
      @close="showSelector = false" />
  </view>
</template>

<script setup>
  import {
    computed,
    ref
  } from 'vue'
  import BodyPartSelector from './BodyPartSelector.vue'

  const BODY_PARTS_MAP = {
    upper_chest: '上胸',
    mid_lower_chest: '中下胸',
    teres_major: '大圆',
    upper_traps: '上斜方',
    mid_lower_traps: '中下斜方',
    lats: '背阔',
    erector_spinae: '竖脊肌',
    front_delt: '前束',
    side_delt: '中束',
    rear_delt: '后束',
    biceps: '二头',
    triceps: '三头',
    quads: '股四头',
    hamstrings: '腘绳',
    calves: '小腿',
    glutes: '臀部',
    abs: '腹部',
    chest: '胸部',
    back: '背部',
    shoulders: '肩部',
    arms: '手臂',
    legs: '腿部',
  }

  const props = defineProps({
    trendData: {
      type: Array,
      default: () => [],
    },
    selectedBodyPart: {
      type: String,
      default: '',
    },
    period: {
      type: String,
      default: 'month',
    },
    dimension: {
      type: String,
      default: 'days',
    },
  })

  const emit = defineEmits(['select:bodyPart'])

  const showSelector = ref(false)

  const selectedPartName = computed(() => {
    return BODY_PARTS_MAP[props.selectedBodyPart] || props.selectedBodyPart
  })

  const chartData = computed(() => {
    if (!Array.isArray(props.trendData)) return []
    return props.trendData
  })

  const maxBarHeight = 120

  const maxValue = computed(() => {
    if (chartData.value.length === 0) return 0
    const values = chartData.value.map((item) => getValue(item))
    return Math.max(...values, 1)
  })

  function getValue(item) {
    return item[props.dimension] ?? 0
  }

  function getBarHeight(item) {
    const value = getValue(item)
    return Math.max(2, (value / maxValue.value) * maxBarHeight)
  }

  function onSelectPart(id) {
    showSelector.value = false
    emit('select:bodyPart', id)
  }
</script>

<style scoped>
  .body-part-trend {
    background-color: var(--card-bg, #ffffff);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--section-title, #1a1a1a);
  }

  .part-select-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: 16px;
    background-color: #379bff;
  }

  .part-select-text {
    font-size: 13px;
    color: #ffffff;
    font-weight: 500;
  }

  .part-select-arrow {
    font-size: 16px;
    color: #ffffff;
    font-weight: bold;
    line-height: 1;
  }

  .chart-area {
    /* min-height: 180px; */
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    color: var(--empty-text, #999999);
    font-size: 14px;
  }

  .bar-chart {
    width: 100%;
    overflow-x: auto;
  }

  .bars-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    gap: 12px;
    padding-top: 4px;
  }

  .bar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    min-height: 2px;
  }

  .bar-value {
    font-size: 11px;
    color: var(--chart-text, #666666);
    margin-bottom: 4px;
  }

  .bar {
    width: 28px;
    min-height: 2px;
    border-radius: 4px 4px 0 0;
    background-color: #379bff;
    transition: height 0.3s ease;
  }

  .bar-label {
    font-size: 11px;
    color: var(--chart-label, #999999);
    margin-top: 6px;
    text-align: center;
  }
</style>