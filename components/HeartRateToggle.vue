<template>
  <view 
    class="hr-toggle"
    :class="{ expanded }"
    :style="toggleStyle"
  >
    <view
      class="hr-chip"
      :class="{ open: expanded, connected: connected && hr != null, 'not-connected': !connected || hr == null }"
      @click="handleClick"
    >
      <!-- 收起态：未连接/暂停显示"连接"，已连接显示心率 -->
      <view class="hr-collapsed" v-if="!expanded">
        <text v-if="connected && hr != null">♥{{ hr }}</text>
        <view v-else class="hr-connect-hint">
          <text class="hr-pulse-dot"></text>
          <text class="hr-connect-text">未连接</text>
        </view>
      </view>
      <!-- 展开态：心率 + 趋势 + 区间条 + 档位 + 卡路里 + 时长 -->
      <view class="hr-expanded" v-else>
        <view class="hr-blk">
          <text class="hr-val">♥{{ hr != null ? hr : '--' }}</text>
          <text class="hr-unit">bpm</text>
          <text class="hr-trend" v-if="hr != null" :style="{ color: trendColor }">{{ trendIcon }}</text>
        </view>
        <view class="hr-zones" v-if="connected && zones">
          <view class="hr-bar">
            <view
              v-for="(z, i) in zones" :key="i"
              class="hr-seg"
              :style="{ background: z.color, opacity: (zone && zone.index===i) ? 1 : 0.45 }"
            />
          </view>
          <text class="hr-zone-label" :style="{ color: zone ? zone.color : '#999' }">{{ zone ? zone.label : '静息' }}</text>
        </view>
        <view class="hr-guidance" v-if="expanded && guidance">
          <text class="hr-guidance-text">{{ guidance }}</text>
        </view>
        <view class="hr-kcal-blk">
          <text class="hr-kcal">🔥{{ Math.round(kcalTotal) }} kcal</text>
          <text class="hr-dur">{{ formatDur(durationSec) }}</text>
        </view>
      </view>
    </view>
    <!-- 计时/设置按钮：展开时隐藏 -->
    <slot name="actions" v-if="!expanded" />
  </view>
</template>

<script>
import { calculateHrTrend, getTrendIcon, getTrendColor } from '@/utils/heartRateTrend.js'

export default {
  props: {
    hr: { type: Number, default: null },
    hrHistory: { type: Array, default: () => [] },
    kcalTotal: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    zone: { type: Object, default: null },
    zones: { type: Array, default: () => [] },
    connected: { type: Boolean, default: false },
    trend: { type: Object, default: null },
    signalQuality: { type: Object, default: null },
    guidance: { type: String, default: null },
  },
  emits: ['toggle-connect', 'show-chart'],
  data() {
    return {
      expanded: false,
    }
  },
  computed: {
    toggleStyle() {
      if (!this.connected || this.hr == null) {
        return { borderColor: 'var(--hr-color-disconnected)' }
      }
      const zoneIndex = this.zone ? this.zone.index : 0
      const zoneColors = [
        'var(--hr-color-zone-0)',
        'var(--hr-color-zone-1)',
        'var(--hr-color-zone-2)',
        'var(--hr-color-zone-3)',
        'var(--hr-color-zone-4)'
      ]
      return { borderColor: zoneColors[zoneIndex] || zoneColors[0] }
    },
    trendData() {
      if (this.trend) return this.trend
      if (!this.hrHistory || this.hrHistory.length < 2) {
        return { trend: 'stable', change: 0 }
      }
      return calculateHrTrend(this.hrHistory)
    },
    trendIcon() {
      return getTrendIcon(this.trendData.trend)
    },
    trendColor() {
      return getTrendColor(this.trendData.trend)
    }
  },
  methods: {
    handleClick() {
      // 未连接 或 心率为空 → 显示心率曲线弹窗
      if (!this.connected || this.hr == null) {
        this.$emit('show-chart')
        return
      }
      // 已连接 → 切换展开/收起
      this.expanded = !this.expanded
    },
    formatDur(sec) {
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return `${m}:${String(s).padStart(2, '0')}`
    },
  },
}
</script>

<style scoped>
.hr-toggle {
  --hr-color-disconnected: #3B82F6;
  --hr-color-connecting: #3B82F6;
  --hr-color-zone-0: #3B82F6;
  --hr-color-zone-1: #22C55E;
  --hr-color-zone-2: #EAB308;
  --hr-color-zone-3: #F97316;
  --hr-color-zone-4: #EF4444;
  
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.28s ease-out;
}

.hr-toggle.expanded {
  flex-direction: column;
  align-items: stretch;
}

.hr-chip{
  position:relative;height:52px;width:52px;border-radius:26px;
  border:1rpx solid var(--border-color);
  background:var(--glass-bg, rgba(255,255,255,0.7));
  backdrop-filter:blur(12px) saturate(140%);
  -webkit-backdrop-filter:blur(12px) saturate(140%);
  box-shadow:var(--glass-float, 0 2px 8px rgba(0,0,0,0.06)),
    0 0 0 0.5px var(--glass-edge, rgba(255,255,255,0.65)) inset;
  display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;
  transition:width .28s ease,border-radius .28s ease,border-color .2s
}
.hr-chip.connected{border-color:#ef4444}
.hr-chip.not-connected{border-color:#3b82f6;animation:hr-pulse 1.8s ease-in-out infinite}
.hr-chip.open{width:100%;border-radius:14px;height:120px}
.hr-chip.open.not-connected{animation:none}
.hr-collapsed{font-size:15px;font-weight:700;color:#ef4444;display:flex;align-items:center;justify-content:center}
.hr-connect-hint{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
.hr-pulse-dot{width:8px;height:8px;border-radius:50%;background:#3b82f6;animation:dot-blink 1.2s ease-in-out infinite;margin-bottom:2px}
.hr-connect-text{font-size:10px;font-weight:700;color:#3b82f6;white-space:nowrap}
.hr-expanded{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 12px;box-sizing:border-box;gap:6px;position:relative}
.hr-blk{display:flex;align-items:baseline}
.hr-val{font-size:15px;font-weight:700;color:#ef4444;white-space:nowrap}
.hr-unit{font-size:9px;color:var(--text-secondary);margin-left:2px}
.hr-trend{font-size:12px;font-weight:700;margin-left:4px}
.hr-zones{display:flex;align-items:center;gap:5px}
.hr-bar{display:flex;gap:2px}
.hr-seg{width:9px;height:7px;border-radius:2px}
.hr-zone-label{font-size:10px;font-weight:700;white-space:nowrap}
.hr-guidance{position:absolute;bottom:4px;left:12px;right:50%}
.hr-guidance-text{font-size:9px;color:var(--text-secondary);white-space:nowrap}
.hr-kcal-blk{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15}
.hr-kcal{font-size:12px;font-weight:700;color:#f59e0b;white-space:nowrap}
.hr-dur{font-size:9px;color:var(--text-secondary);white-space:nowrap}
@keyframes hr-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}
  50%{box-shadow:0 0 0 6px rgba(59,130,246,0)}
}
@keyframes dot-blink{
  0%,100%{opacity:1}
  50%{opacity:0.3}
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .hr-toggle {
    background: #1F2937;
    color: #F9FAFB;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .hr-toggle.expanded {
    background: transparent;
  }
  
  .hr-seg {
    opacity: 0.8;
  }
}
</style>
