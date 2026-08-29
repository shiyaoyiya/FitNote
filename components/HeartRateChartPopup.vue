<template>
  <view v-if="visible" class="chart-popup-overlay">
    <view class="chart-overlay-bg" @click="$emit('close')"></view>
    <view class="chart-panel fade-in">
      <view class="chart-header">
        <text class="chart-title">今日心率曲线</text>
        <text class="chart-close" @click="$emit('close')">×</text>
      </view>
      <view class="chart-body">
        <view v-if="!samples || samples.length === 0" class="chart-empty">
          <text class="chart-empty-main">今日暂无心率数据</text>
          <text class="chart-empty-sub">连接手环开始训练后可记录</text>
        </view>
        <view v-else class="chart-canvas-wrap">
          <canvas
            canvas-id="hrChartBase" id="hrChartBase" class="chart-canvas"
            style="width: 100%; height: 200px;"
          ></canvas>
          <canvas
            canvas-id="hrChartCursor" id="hrChartCursor" class="chart-canvas chart-cursor-layer"
            style="width: 100%; height: 200px;"
          ></canvas>
          <!-- 透明触摸层覆盖在 canvas 上方，捕获触摸坐标 -->
          <view
            class="touch-overlay"
            @touchstart="onTouchStart"
            @touchmove.stop.prevent="onTouchMove"
            @touchend="onTouchEnd"
          ></view>
          <view v-if="cursorIndex >= 0" class="cursor-tooltip" :style="tooltipStyle">
            <text class="cursor-hr">{{ cursorHr }} bpm</text>
            <text class="cursor-time">{{ cursorTimeLabel }}</text>
          </view>
        </view>
      </view>
      <view class="chart-footer" v-if="samples && samples.length > 0">
        <view class="chart-stat">
          <text class="stat-label">平均</text>
          <text class="stat-val">{{ avgHr }} bpm</text>
        </view>
        <view class="chart-stat">
          <text class="stat-label">最高</text>
          <text class="stat-val">{{ maxHr }} bpm</text>
        </view>
        <view class="chart-stat">
          <text class="stat-label">最低</text>
          <text class="stat-val">{{ minHr }} bpm</text>
        </view>
        <view class="chart-stat">
          <text class="stat-label">时长</text>
          <text class="stat-val">{{ formatDur(durationSec) }}</text>
        </view>
        <view class="chart-stat">
          <text class="stat-label">热量</text>
          <text class="stat-val">{{ Math.round(kcalTotal) }} kcal</text>
        </view>
      </view>
      <view v-if="!connected" class="chart-connect-btn" @click="$emit('connect')">
        <text class="connect-text">连接心率手环</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    visible: { type: Boolean, default: false },
    samples: { type: Array, default: () => [] },
    kcalTotal: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    connected: { type: Boolean, default: false },
  },
  emits: ['close', 'connect'],
  data() {
    return {
      cursorIndex: -1,
      chartLayout: null,
      cachedRect: null,
      canvasActualW: 320,
      baseImage: null,  // 缓存基础图表图片（不含游标）
    }
  },
  computed: {
    maxHr() {
      if (!this.samples.length) return 0
      return Math.max(...this.samples.map(s => s.hr))
    },
    minHr() {
      if (!this.samples.length) return 0
      return Math.min(...this.samples.map(s => s.hr))
    },
    avgHr() {
      if (!this.samples.length) return 0
      const total = this.samples.reduce((s, i) => s + i.hr, 0)
      return Math.round(total / this.samples.length)
    },
    cursorHr() {
      if (this.cursorIndex < 0 || !this.samples[this.cursorIndex]) return 0
      return this.samples[this.cursorIndex].hr
    },
    cursorTimeLabel() {
      if (this.cursorIndex < 0) return ''
      return this.cursorIndex + 's'
    },
    tooltipStyle() {
      if (!this.chartLayout || this.cursorIndex < 0) return ''
      const pts = this.chartLayout.points
      if (!pts || !pts[this.cursorIndex]) return ''
      const p = pts[this.cursorIndex]
      // 将虚拟坐标 320 域映射到实际 canvas 宽度的百分比
      const leftPct = (p.x / 320) * 100
      const topPx = p.y - 10
      return `left:${leftPct}%;top:${topPx}px;transform:translate(-50%,-100%);`
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.cursorIndex = -1
        this.cachedRect = null
      }
      if (val && this.samples && this.samples.length > 0) {
        this.$nextTick(() => {
          setTimeout(() => this.drawChart(), 150)
        })
      }
    },
    samples() {
      this.cursorIndex = -1
      if (this.visible && this.samples && this.samples.length > 0) {
        this.$nextTick(() => {
          setTimeout(() => this.drawChart(), 150)
        })
      }
    },
  },
  methods: {
    cacheCanvasRect() {
      uni.createSelectorQuery()
        .in(this)
        .select('#hrChartCursor')
        .boundingClientRect(rect => {
          if (rect) {
            this.cachedRect = rect
          }
        })
        .exec()
    },
    onTouchStart(e) {
      this.handleTouch(e)
    },
    onTouchMove(e) {
      this.handleTouch(e)
    },
    onTouchEnd() {
      // 保留游标
    },
    handleTouch(e) {
      if (!this.chartLayout) return
      if (!this.cachedRect) { this.cacheCanvasRect(); return }
      // 从 touch 事件获取坐标，兼容 touches / changedTouches / detail
      let touch = null
      if (e.touches && e.touches.length > 0) touch = e.touches[0]
      else if (e.changedTouches && e.changedTouches.length > 0) touch = e.changedTouches[0]
      else if (e.detail) touch = e.detail
      if (!touch) return
      const clientX = touch.clientX != null ? touch.clientX : (touch.pageX || touch.x || 0)
      const rect = this.cachedRect
      const relX = clientX - rect.left
      const virtX = (relX / rect.width) * 320
      const { padL, xStep, n } = this.chartLayout
      if (n === 0) return
      let idx
      if (xStep === 0 || n === 1) idx = 0
      else {
        idx = Math.round((virtX - padL) / xStep)
        idx = Math.max(0, Math.min(n - 1, idx))
      }
      if (idx !== this.cursorIndex) {
        this.cursorIndex = idx
        this.drawCursor()  // 只重绘游标层
      }
    },
    drawChart() {
      this.drawBaseChart()
      this.drawCursor()
    },
    drawBaseChart() {
      const ctx = uni.createCanvasContext('hrChartBase', this)
      if (!ctx) return

      const w = 320, h = 200
      const padL = 38, padR = 15, padT = 15, padB = 28
      const plotW = w - padL - padR
      const plotH = h - padT - padB

      const dataMax = Math.max(...this.samples.map(s => s.hr))
      const dataMin = Math.min(...this.samples.map(s => s.hr))
      const yMax = Math.min(220, Math.ceil(dataMax / 10) * 10 + 10)
      const yMin = Math.max(0, Math.floor(dataMin / 10) * 10 - 10)
      const yRange = yMax - yMin || 1

      const n = this.samples.length
      const xStep = n > 1 ? plotW / (n - 1) : 0

      const points = this.samples.map((s, i) => ({
        x: padL + (n > 1 ? i * xStep : plotW / 2),
        y: padT + plotH - ((s.hr - yMin) / yRange) * plotH,
      }))

      this.chartLayout = { padL, padR, plotW, xStep, n, points, yMin, yRange, padT, plotH }

      ctx.clearRect(0, 0, w, h)

      // 网格线
      ctx.setStrokeStyle('rgba(128,128,128,0.2)')
      ctx.setLineWidth(1)
      for (let i = 0; i <= 2; i++) {
        const y = padT + (plotH / 2) * i
        ctx.beginPath()
        ctx.moveTo(padL, y)
        ctx.lineTo(w - padR, y)
        ctx.stroke()
      }

      // Y 轴标签
      ctx.setFontSize(10)
      ctx.setFillStyle('#999')
      ctx.fillText(String(yMax), 2, padT + 4)
      ctx.fillText(String(Math.round((yMax + yMin) / 2)), 2, padT + plotH / 2 + 4)
      ctx.fillText(String(yMin), 2, padT + plotH + 4)

      // X 轴标签
      ctx.fillText('0s', padL, h - 6)
      if (n > 1) ctx.fillText(n + 's', w - padR - 24, h - 6)

      // 填充区域
      ctx.beginPath()
      ctx.moveTo(points[0].x, padT + plotH)
      points.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(points[points.length - 1].x, padT + plotH)
      ctx.closePath()
      ctx.setFillStyle('rgba(55,155,255,0.12)')
      ctx.fill()

      // 折线
      ctx.beginPath()
      ctx.setStrokeStyle('#379bff')
      ctx.setLineWidth(2)
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.stroke()

      ctx.draw()
      this.cacheCanvasRect()
    },
    drawCursor() {
      if (!this.chartLayout) return
      const ctx = uni.createCanvasContext('hrChartCursor', this)
      if (!ctx) return

      const w = 320, h = 200
      const { padT, plotH, points } = this.chartLayout
      ctx.clearRect(0, 0, w, h)

      if (this.cursorIndex >= 0 && this.cursorIndex < points.length) {
        const p = points[this.cursorIndex]
        // 竖线
        ctx.setStrokeStyle('rgba(55,155,255,0.5)')
        ctx.setLineWidth(1)
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(p.x, padT)
        ctx.lineTo(p.x, padT + plotH)
        ctx.stroke()
        ctx.setLineDash([])
        // 圆点
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI)
        ctx.setFillStyle('#379bff')
        ctx.fill()
        ctx.setStrokeStyle('#fff')
        ctx.setLineWidth(2)
        ctx.stroke()
      }

      ctx.draw()
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
.chart-popup-overlay {
  position: fixed;
  top: 0; bottom: 0; left: 0; right: 0;
  z-index: 3000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.chart-overlay-bg {
  position: absolute;
  top: 0; bottom: 0; left: 0; right: 0;
  background-color: rgba(0, 0, 0, 0.4);
}
.chart-panel {
  position: relative;
  width: 88vw;
  max-height: 70vh;
  background: var(--glass-bg, rgba(255,255,255,0.7));
  border: 1rpx solid var(--glass-border, rgba(200,210,230,0.6));
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: var(--glass-float, 0 8px 24px rgba(0,0,0,0.06)),
    0 0 0 0.5px var(--glass-edge, rgba(255,255,255,0.65)) inset,
    0 1px 3px var(--glass-shadow-inner, rgba(255,255,255,0.55)) inset;
}
.fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.chart-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid var(--border-light, rgba(255,255,255,0.1));
}
.chart-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary, #333);
}
.chart-close {
  font-size: 26px;
  color: var(--text-secondary, #999);
  width: 32px;
  height: 32px;
  text-align: center;
  line-height: 32px;
}
.chart-body {
  padding: 12px 12px;
  flex: 1;
  overflow-y: auto;
}
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 8px;
}
.chart-empty-main {
  font-size: 16px;
  color: var(--text-secondary, #999);
}
.chart-empty-sub {
  font-size: 13px;
  color: var(--text-muted, #ccc);
}
.chart-canvas-wrap {
  position: relative;
  width: 100%;
  height: 200px;
}
.chart-canvas {
  width: 100%;
  height: 200px;
}
.chart-cursor-layer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
}
/* 透明触摸层，覆盖在 canvas 上方 */
.touch-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 200px;
  z-index: 5;
}
/* 游标 tooltip */
.cursor-tooltip {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(55,155,255,0.9);
  box-shadow: 0 2px 6px rgba(55,155,255,0.3);
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
}
.cursor-hr {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}
.cursor-time {
  font-size: 9px;
  color: rgba(255,255,255,0.8);
}
.chart-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 10px 16px;
  gap: 8px;
  border-top: 1rpx solid var(--border-light, rgba(255,255,255,0.1));
}
.chart-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  color: var(--text-secondary, #999);
}
.stat-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #333);
}
.chart-connect-btn {
  margin: 0 20px 20px;
  height: 46px;
  background: linear-gradient(135deg, #379bff, #2d82d6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(55, 155, 255, 0.3);
}
.chart-connect-btn:active { transform: scale(0.97); }
.connect-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
</style>
