<template>
  <view class="overview-card">
    <view class="card-header">
      <text class="card-title">训练概况</text>
      <text class="card-subtitle">{{ periodText }}</text>
    </view>
    <view class="stats-row" :class="{ 'no-transition': noTransition }">
      <view
        class="stat-highlight"
        :style="highlightStyle"
      ></view>
      <view
        class="stat-item"
        :class="{ 'stat-item-active': dimension === 'days' }"
        @click="dimension !== 'days' && $emit('update:dimension', 'days')"
      >
        <text class="stat-value" :class="{ 'stat-value-active': dimension === 'days' }">{{ stats.totalDays }}</text>
        <text class="stat-label" :class="{ 'stat-label-active': dimension === 'days' }">训练天数</text>
      </view>
      <view
        class="stat-item"
        :class="{ 'stat-item-active': dimension === 'sets' }"
        @click="dimension !== 'sets' && $emit('update:dimension', 'sets')"
      >
        <text class="stat-value" :class="{ 'stat-value-active': dimension === 'sets' }">{{ stats.totalSets }}</text>
        <text class="stat-label" :class="{ 'stat-label-active': dimension === 'sets' }">训练组数</text>
      </view>
      <view
        class="stat-item"
        :class="{ 'stat-item-active': dimension === 'volume' }"
        @click="dimension !== 'volume' && $emit('update:dimension', 'volume')"
      >
        <text class="stat-value" :class="{ 'stat-value-active': dimension === 'volume' }">{{ stats.totalVolume }}</text>
        <text class="stat-label" :class="{ 'stat-label-active': dimension === 'volume' }">训练容量</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const DIM_TABS = ['days', 'sets', 'volume']

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      totalDays: 0,
      totalSets: 0,
      totalVolume: 0,
    }),
  },
  period: {
    type: String,
    default: 'month',
  },
  dimension: {
    type: String,
    default: 'days',
  },
  swipeDeltaX: {
    type: Number,
    default: 0,
  },
  swipeViewWidth: {
    type: Number,
    default: 0,
  },
  noTransition: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:dimension'])

const periodText = computed(() => {
  return props.period === 'month' ? '本月' : '本年'
})

const activeIndex = computed(() => DIM_TABS.indexOf(props.dimension))

const highlightStyle = computed(() => {
  const count = DIM_TABS.length
  const itemWidth = 100 / count
  const basePercent = activeIndex.value * itemWidth
  let deltaPercent = 0
  if (props.swipeDeltaX !== 0 && props.swipeViewWidth > 0) {
    deltaPercent = (props.swipeDeltaX / props.swipeViewWidth) * itemWidth
  }
  // 边界阻尼
  const isFirst = activeIndex.value === 0
  const isLast = activeIndex.value === count - 1
  if ((isFirst && props.swipeDeltaX > 0) || (isLast && props.swipeDeltaX < 0)) {
    deltaPercent *= 0.3
  }
  return {
    transform: `translateX(${basePercent + deltaPercent}%)`,
    width: `calc(${itemWidth}%)`,
  }
})
</script>

<style scoped>
.overview-card {
  background-color: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333333);
  margin-right: 8px;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-secondary, #999999);
}

.stats-row {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.stat-highlight {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(55, 155, 255, 0.12);
  border-radius: 12px;
  z-index: 0;
  transition: transform 0.38s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.38s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}

.stats-row.no-transition .stat-highlight {
  transition: none;
}

.stat-item {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item:active {
  opacity: 0.7;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #333333);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary, #999999);
}

.stat-value-active {
  color: #379bff;
}

.stat-label-active {
  color: #379bff;
  font-weight: 600;
}
</style>
