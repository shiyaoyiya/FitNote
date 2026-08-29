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
      <text class="custom-label">自定义MET值：</text>
      <view class="custom-input-wrap">
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
  watch: {
    value: {
      immediate: true,
      handler(val) {
        if (val == null) return
        let found = false
        for (const key of Object.keys(this.presets)) {
          if (this.presets[key].met === val) {
            this.selectedActivity = key
            found = true
            break
          }
        }
        if (!found) {
          this.selectedActivity = 'custom'
          this.customMet = val
        }
      }
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
  padding: 24rpx;
}
.selector-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
  color: var(--text-primary);
}
.activity-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.activity-item {
  padding: 18rpx 28rpx;
  background: var(--glass-bg, rgba(255,255,255,0.55));
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  border: 1rpx solid var(--glass-border, rgba(200,210,230,0.5));
  border-radius: 14rpx;
  text-align: center;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04),
    0 0 0 0.5px var(--glass-edge, rgba(255,255,255,0.5)) inset;
}
.activity-item:active {
  transform: scale(0.96);
}
.activity-item.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59,130,246,0.3),
    0 0 0 0.5px rgba(255,255,255,0.2) inset;
}
.activity-name {
  font-size: 28rpx;
  color: var(--text-primary);
  display: block;
}
.activity-item.active .activity-name {
  color: #fff;
}
.activity-met {
  font-size: 22rpx;
  color: var(--text-secondary, #6b7280);
  display: block;
  margin-top: 4rpx;
}
.activity-item.active .activity-met {
  color: #e0e7ff;
}
.custom-met {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.custom-label {
  font-size: 28rpx;
  color: var(--text-primary);
}
.custom-input-wrap {
  background: var(--glass-bg, rgba(255,255,255,0.55));
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  border: 1rpx solid var(--glass-border, rgba(200,210,230,0.5));
  border-radius: 10rpx;
  padding: 8rpx 16rpx;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04),
    0 0 0 0.5px var(--glass-edge, rgba(255,255,255,0.5)) inset;
}
.custom-input-wrap input {
  width: 150rpx;
  font-size: 28rpx;
  color: var(--text-primary);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .activity-item {
    background: rgba(55,65,81,0.6);
    border-color: rgba(75,85,99,0.5);
    box-shadow: 0 1px 4px rgba(0,0,0,0.15),
      0 0 0 0.5px rgba(255,255,255,0.06) inset;
  }
  .activity-item.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    box-shadow: 0 2px 8px rgba(59,130,246,0.4),
      0 0 0 0.5px rgba(255,255,255,0.15) inset;
  }
  .custom-input-wrap {
    background: rgba(55,65,81,0.6);
    border-color: rgba(75,85,99,0.5);
    box-shadow: 0 1px 4px rgba(0,0,0,0.15),
      0 0 0 0.5px rgba(255,255,255,0.06) inset;
  }
}
</style>
