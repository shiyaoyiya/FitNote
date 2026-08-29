<template>
  <view 
    class="hr-toggle"
    :class="{ expanded }"
    :style="toggleStyle"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @longpress="handleLongPress"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- 心率按钮：未连接/收起/展开 三态由 expanded + connected 控制 -->
    <view
      class="hr-chip"
      :class="{ open: expanded, connected: connected && hr != null, 'not-connected': !connected || hr == null }"
    >
      <!-- 收起态：未连接/暂停显示"连接"，已连接显示心率 -->
      <view class="hr-collapsed" v-if="!expanded">
        <text v-if="connected && hr != null">♥{{ hr }}</text>
        <view v-else class="hr-connect-hint">
          <text class="hr-pulse-dot"></text>
          <text class="hr-connect-text">连接</text>
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
        <view class="hr-kcal-blk">
          <text class="hr-kcal">🔥{{ Math.round(kcalTotal) }} kcal</text>
          <text class="hr-dur">{{ formatDur(durationSec) }}</text>
        </view>
      </view>
    </view>
    <!-- 计时/设置按钮：展开时隐藏（由父级控制或本组件 v-if） -->
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
  },
  emits: ['toggle-connect', 'request-settings', 'show-chart'],
  data() {
    return {
      expanded: false,
      touchStartX: 0,
      touchStartTime: 0
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
      // 未连接 或 心率为空（暂停/超时）→ 显示心率曲线弹窗
      if (!this.connected || this.hr == null) { this.$emit('show-chart'); return }
      this.expanded = !this.expanded
    },
    handleDoubleClick() {
      this.expanded = !this.expanded
    },
    handleLongPress() {
      this.$emit('request-settings')
    },
    handleTouchStart(e) {
      this.touchStartX = e.touches[0].clientX
      this.touchStartTime = Date.now()
    },
    handleTouchEnd(e) {
      const touchEndX = e.changedTouches[0].clientX
      const touchDuration = Date.now() - this.touchStartTime
      
      // 检测滑动手势（水平滑动距离 > 50px，时间 < 300ms）
      if (Math.abs(touchEndX - this.touchStartX) > 50 && touchDuration < 300) {
        if (touchEndX > this.touchStartX) {
          // 右滑 - 展开
          this.expanded = true
        } else {
          // 左滑 - 收起
          this.expanded = false
        }
      }
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
  --hr-color-disconnected: #6B7280;
  --hr-color-connecting: #F59E0B;
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
  width: 280px;
  height: 120px;
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
.hr-chip.not-connected{border-color:#f59e0b;animation:hr-pulse 1.8s ease-in-out infinite}
.hr-chip.open{width:280px;border-radius:14px}
.hr-chip.open.not-connected{animation:none}
.hr-collapsed{font-size:15px;font-weight:700;color:#ef4444;display:flex;align-items:center;justify-content:center}
.hr-connect-hint{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
.hr-pulse-dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:dot-blink 1.2s ease-in-out infinite;margin-bottom:2px}
.hr-connect-text{font-size:10px;font-weight:700;color:#f59e0b;white-space:nowrap}
.hr-expanded{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 12px;box-sizing:border-box;gap:6px}
.hr-blk{display:flex;align-items:baseline}
.hr-val{font-size:15px;font-weight:700;color:#ef4444;white-space:nowrap}
.hr-unit{font-size:9px;color:var(--text-secondary);margin-left:2px}
.hr-trend{font-size:12px;font-weight:700;margin-left:4px}
.hr-zones{display:flex;align-items:center;gap:5px}
.hr-bar{display:flex;gap:2px}
.hr-seg{width:9px;height:7px;border-radius:2px}
.hr-zone-label{font-size:10px;font-weight:700;white-space:nowrap}
.hr-kcal-blk{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15}
.hr-kcal{font-size:12px;font-weight:700;color:#f59e0b;white-space:nowrap}
.hr-dur{font-size:9px;color:var(--text-secondary);white-space:nowrap}
@keyframes hr-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.4)}
  50%{box-shadow:0 0 0 6px rgba(245,158,11,0)}
}
@keyframes dot-blink{
  0%,100%{opacity:1}
  50%{opacity:0.3}
}
</style>