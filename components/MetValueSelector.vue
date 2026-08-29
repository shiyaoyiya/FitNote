<template>
  <view class="met-list">
    <view class="met-row">
      <text class="met-label">运动类型</text>
      <view class="met-chips">
        <text 
          v-for="(preset, key) in presets" 
          :key="key"
          :class="['met-chip', selectedActivity === key && 'on']"
          @click="selectActivity(key)"
        >{{ preset.name }}</text>
      </view>
    </view>
    <view class="met-row" v-if="selectedActivity !== 'custom'">
      <text class="met-label">MET值</text>
      <text class="met-val">{{ presets[selectedActivity]?.met || '--' }}</text>
    </view>
    <view class="met-row" v-else>
      <text class="met-label">自定义MET</text>
      <view class="met-input-wrap">
        <input class="met-input" type="digit" v-model.number="customMet" @input="updateCustomMet" />
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
    },
    activityKey: {
      type: String,
      default: 'custom'
    }
  },
  data() {
    return {
      presets: MET_PRESETS,
      selectedActivity: this.activityKey || 'custom',
      customMet: this.value || 1.0
    }
  },
  watch: {
    activityKey: {
      immediate: true,
      handler(val) {
        if (val) this.selectedActivity = val
      }
    },
    value: {
      immediate: true,
      handler(val) {
        if (val != null && this.selectedActivity === 'custom') {
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
        this.$emit('update:activityKey', key)
      } else {
        this.$emit('input', this.customMet)
        this.$emit('update:activityKey', 'custom')
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
.met-list {
  display: flex;
  flex-direction: column;
}
.met-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 4px;
}
.met-label {
  font-size: 15px;
  color: var(--text-primary);
  flex-shrink: 0;
}
.met-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.met-chip {
  padding: 6px 16px;
  border-radius: 16px;
  border: 1rpx solid var(--border-color);
  font-size: 13px;
  color: var(--text-primary);
}
.met-chip.on {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}
.met-val {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.met-input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 0 12px;
  border: 1rpx solid var(--border-color);
}
.met-input {
  width: 100px;
  height: 40px;
  font-size: 15px;
  color: var(--text-primary);
  text-align: center;
}
</style>
