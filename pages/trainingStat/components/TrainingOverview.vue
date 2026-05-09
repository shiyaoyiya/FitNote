<template>
  <view class="overview-card">
    <view class="card-header">
      <text class="card-title">训练概况</text>
      <text class="card-subtitle">{{ periodText }}</text>
    </view>
    <view class="stats-row">
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
})

defineEmits(['update:dimension'])

const periodText = computed(() => {
  return props.period === 'month' ? '本月' : '本年'
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
}

.stat-item {
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
