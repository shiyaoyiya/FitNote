<template>
  <view class="met-selector">
    <text class="selector-title">选择运动类型</text>
    <view class="activity-list">
      <view 
        v-for="(preset, key) in presets" 
        :key="key"
        class="activity-item"
        :class="{ active: selectedActivity === key }"
        @click="selectActivity(key)"
      >
        <text class="activity-name">{{ preset.name }}</text>
        <text class="activity-met">{{ preset.met }} MET</text>
      </view>
    </view>
    <view v-if="selectedActivity === 'custom'" class="custom-met">
      <text>自定义MET值：</text>
      <input 
        type="number" 
        v-model.number="customMet" 
        min="1.0" 
        max="20.0" 
        step="0.1"
        @input="updateCustomMet"
      />
    </view>
  </view>
</template>

<script>
import { MET_PRESETS } from '@/utils/metEstimate.js'

export default {
  props: {
    value: {
      type: Number,
      default: 1.0
    }
  },
  data() {
    return {
      presets: MET_PRESETS,
      selectedActivity: 'custom',
      customMet: 1.0
    }
  },
  methods: {
    selectActivity(key) {
      this.selectedActivity = key
      if (key !== 'custom') {
        this.$emit('input', this.presets[key].met)
      } else {
        this.$emit('input', this.customMet)
      }
    },
    updateCustomMet() {
      if (this.selectedActivity === 'custom') {
        this.$emit('input', this.customMet)
      }
    }
  }
}
</script>

<style scoped>
.met-selector {
  padding: 20rpx;
}
.selector-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: var(--text-primary);
}
.activity-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.activity-item {
  padding: 16rpx 24rpx;
  background: var(--bg-tertiary, #f3f4f6);
  border: 1rpx solid var(--border-color, #e5e7eb);
  border-radius: 12rpx;
  text-align: center;
  transition: all 0.2s;
}
.activity-item.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
.activity-name {
  font-size: 28rpx;
  color: var(--text-primary);
}
.activity-met {
  font-size: 24rpx;
  color: var(--text-secondary, #6b7280);
}
.activity-item.active .activity-met {
  color: #e0e7ff;
}
.custom-met {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.custom-met text {
  font-size: 28rpx;
  color: var(--text-primary);
}
.custom-met input {
  width: 150rpx;
  padding: 8rpx 16rpx;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 8rpx;
  background: var(--bg-tertiary, #fff);
  color: var(--text-primary);
}
</style>
