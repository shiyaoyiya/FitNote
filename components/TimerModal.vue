<template>
  <view v-if="visible" class="popup-overlay" style="z-index: 2000;">
    <view class="overlay-bg"></view>
    <view class="timer-panel fade-in">
      <view class="timer-full-body">
        <view class="quick-settings">
          <view v-for="(qs, qi) in computedQuickSettings" :key="qi" class="quick-btn" @click="setQuickTime(qs.seconds)">
            <text class="quick-label">{{ qs.label }}</text>
            <text class="quick-time">{{ qs.timeText }}</text>
          </view>
        </view>
        <view class="timer-core">
          <canvas canvas-id="timerCanvas" style="width:250px; height:250px;"></canvas>
          <view class="time-text">{{ displayTime }}</view>
        </view>
        <view class="timer-actions">
          <button class="action-btn" @click.stop="adjustDuration(-10)">－10s</button>
          <button class="action-btn" @click.stop="adjustDuration(+10)">＋10s</button>
          <button class="action-btn done-btn" @click.stop="completeTimer">完成</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TimerModal',
  props: {
    visible: { type: Boolean, default: false },
    defaultDuration: { type: Number, default: 180 },
    quickSettings: { type: Array, default: null },
  },
  emits: ['close', 'complete'],
  data() {
    return {
      totalDuration: 180,
      remaining: 180,
      timerInterval: null,
      endTimestamp: 0,
      notified: false,
      audioCtx: null,
    }
  },
  computed: {
    computedQuickSettings() {
      if (this.quickSettings && this.quickSettings.length > 0) return this.quickSettings
      return [
        { label: '胸背腿', seconds: 180, timeText: '3:00' },
        { label: '肩手', seconds: 120, timeText: '2:00' },
      ]
    },
    displayTime() {
      if (this.remaining >= 60) {
        const m = Math.floor(this.remaining / 60)
        const s = this.remaining % 60
        return `${m}:${s < 10 ? '0' + s : s}`
      }
      return String(this.remaining)
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.initTimer()
      }
    },
  },
  created() {
    const audio = uni.createInnerAudioContext()
    audio.src = '/static/notification.mp3'
    audio.loop = false
    this.audioCtx = audio
  },
  beforeUnmount() {
    this.clearTimer()
    if (this.audioCtx) {
      this.audioCtx.stop()
      this.audioCtx = null
    }
  },
  methods: {
    initTimer() {
      this.totalDuration = this.defaultDuration
      this.remaining = this.defaultDuration
      this.notified = false
      this.$nextTick(() => {
        this.drawCircle()
        this.startCountdown()
      })
    },
    clearTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval)
      this.timerInterval = null
      if (this.audioCtx) {
        this.audioCtx.stop()
        this.notified = false
      }
    },
    startCountdown() {
      this.clearTimer()
      this.endTimestamp = Date.now() + this.remaining * 1000
      this.updateRemaining()
      this.timerInterval = setInterval(() => this.updateRemaining(), 1000)
    },
    updateRemaining() {
      const now = Date.now()
      const diff = Math.ceil((this.endTimestamp - now) / 1000)
      this.remaining = Math.max(0, diff)
      if (this.remaining > 0 && this.remaining <= 10) uni.vibrateShort()
      this.drawCircle()
      if (this.remaining <= 0 && !this.notified) {
        this.notified = true
        this.clearTimer()
        uni.vibrateLong()
        this.audioCtx && this.audioCtx.play()
        uni.showToast({ title: '计时结束', icon: 'none', duration: 2000 })
      }
    },
    setQuickTime(seconds) {
      uni.vibrateShort()
      this.totalDuration = seconds
      this.remaining = seconds
      this.notified = false
      this.endTimestamp = Date.now() + seconds * 1000
      this.startCountdown()
    },
    adjustDuration(delta) {
      uni.vibrateShort()
      const newTotal = Math.max(1, this.totalDuration + delta)
      const newRemaining = Math.max(1, this.remaining + delta)
      this.totalDuration = newTotal
      this.remaining = newRemaining
      this.notified = false
      this.endTimestamp = Date.now() + this.remaining * 1000
      this.drawCircle()
    },
    completeTimer() {
      this.clearTimer()
      this.$emit('close')
    },
    drawCircle() {
      const ctx = uni.createCanvasContext('timerCanvas', this)
      const size = 250
      const cx = size / 2, cy = size / 2, r = 110
      ctx.clearRect(0, 0, size, size)
      ctx.setStrokeStyle('rgba(255, 255, 255, 0.1)')
      ctx.setLineWidth(14)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, 2 * Math.PI)
      ctx.stroke()
      const percent = this.totalDuration > 0 ? this.remaining / this.totalDuration : 0
      const startAngle = Math.PI * 1.5
      const endAngle = startAngle + 2 * Math.PI * percent
      ctx.setStrokeStyle('#379bff')
      ctx.setLineWidth(17)
      ctx.setShadow(0, 0, 15, '#379bff')
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, endAngle, false)
      ctx.stroke()
      ctx.draw()
    },
  },
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.overlay-bg {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.3);
}
.fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.timer-panel {
  position: relative;
  z-index: 2001;
  width: 320px;
  border-radius: 24px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  border: 1rpx solid var(--border-color);
}
.timer-full-body {
  background-color: var(--bg-secondary);
  padding: 24px 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.quick-settings {
  display: flex;
  width: 100%;
  padding: 0 20px;
  justify-content: space-between;
  gap: 15px;
  box-sizing: border-box;
}
.quick-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  background: var(--bg-card);
  border: 1rpx solid var(--border-color);
  border-radius: 12px;
}
.quick-btn:active {
  transform: scale(0.96);
}
.quick-label {
  font-size: 15px;
  font-weight: bold;
  color: #379bff;
  line-height: 1.2;
}
.quick-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.timer-core {
  position: relative;
  margin: 10px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.time-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-primary);
  font-size: 48px;
}
.timer-actions {
  display: flex;
  width: 100%;
  padding: 10px 16px 0;
  justify-content: space-between;
  gap: 10px;
  box-sizing: border-box;
}
.action-btn {
  flex: 1;
  height: 46px;
  line-height: 46px;
  font-size: 14px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1rpx solid var(--border-color);
}
.action-btn:active {
  transform: scale(0.92);
}
.done-btn {
  background-color: #379bff !important;
  color: #fff !important;
  font-weight: bold;
}
</style>
