<template>
  <view class="hr-bar-chart" :style="{ width: width + 'px' }">
    <view class="hr-bc-title">动作 HR 对比</view>
    <view class="hr-bc-legend">
      <view class="lg-item"><view class="lg-dot avg"></view>平均</view>
      <view class="lg-item"><view class="lg-dot peak"></view>峰值</view>
      <view class="lg-item"><view class="lg-dot delta"></view>Δ心率</view>
    </view>
    <view class="hr-bc-body">
      <!-- 每个动作一行 3 条柱 -->
      <view class="hr-bc-row" v-for="(s, i) in series" :key="i">
        <view class="hr-bc-label" :title="s.actionName">{{ truncate(s.actionName, 8) }}</view>
        <view class="hr-bc-bars">
          <!-- avg bar -->
          <view class="hr-bc-bar-wrap">
            <view
              class="hr-bc-bar avg"
              :style="{ width: pct(s.avgHr, maxRef) + '%' }"
            ></view>
            <text class="hr-bc-val" v-if="s.avgHr !== null">{{ s.avgHr }}</text>
            <text class="hr-bc-val empty" v-else>—</text>
          </view>
          <!-- peak bar -->
          <view class="hr-bc-bar-wrap">
            <view
              class="hr-bc-bar peak"
              :style="{ width: pct(s.peakHr, maxRef) + '%' }"
            ></view>
            <text class="hr-bc-val" v-if="s.peakHr !== null">{{ s.peakHr }}</text>
            <text class="hr-bc-val empty" v-else>—</text>
          </view>
          <!-- delta bar -->
          <view class="hr-bc-bar-wrap">
            <view
              class="hr-bc-bar delta"
              :style="{ width: pct(Math.abs(s.deltaHr), maxRef) + '%' }"
            ></view>
            <text class="hr-bc-val" v-if="s.deltaHr !== null">
              {{ s.deltaHr > 0 ? '+' : '' }}{{ s.deltaHr }}
            </text>
            <text class="hr-bc-val empty" v-else>—</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'HrBarChart',
  props: {
    series: { type: Array, default: () => [] },
    width: { type: Number, default: 320 },
  },
  computed: {
    maxRef() {
      let m = 120
      for (const s of this.series || []) {
        if (typeof s.avgHr === 'number' && s.avgHr > m) m = s.avgHr
        if (typeof s.peakHr === 'number' && s.peakHr > m) m = s.peakHr
        if (typeof s.deltaHr === 'number' && Math.abs(s.deltaHr) > m) m = Math.abs(s.deltaHr)
      }
      return Math.max(m, 1)
    },
  },
  methods: {
    pct(v, max) {
      if (v === null || v === undefined || isNaN(v)) return 0
      return Math.min(100, Math.max(0, (Number(v) / max) * 100))
    },
    truncate(s, n) {
      if (!s) return ''
      const str = String(s)
      return str.length > n ? str.slice(0, n) + '…' : str
    },
  },
}
</script>

<style scoped>
.hr-bar-chart {
  margin: 12px auto 6px;
  background: rgba(20, 22, 28, 0.6);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 12px 14px 10px;
  color: var(--text-primary, #eaeaea);
  box-sizing: border-box;
}
.hr-bc-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  opacity: 0.92;
}
.hr-bc-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  margin-bottom: 8px;
  opacity: 0.8;
}
.lg-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.lg-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.lg-dot.avg { background: #60a5fa; }
.lg-dot.peak { background: #ef4444; }
.lg-dot.delta { background: #22c55e; }

.hr-bc-body { display: flex; flex-direction: column; gap: 8px; }

.hr-bc-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  align-items: center;
}
.hr-bc-label {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
}
.hr-bc-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hr-bc-bar-wrap {
  position: relative;
  height: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
}
.hr-bc-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 300ms cubic-bezier(0.22, 0.61, 0.36, 1);
  min-width: 0;
}
.hr-bc-bar.avg { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.hr-bc-bar.peak { background: linear-gradient(90deg, #dc2626, #ef4444); }
.hr-bc-bar.delta { background: linear-gradient(90deg, #16a34a, #22c55e); }
.hr-bc-val {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.hr-bc-val.empty { opacity: 0.6; font-weight: 400; }
</style>
