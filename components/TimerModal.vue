<template>
  <view v-if="visible" class="popup-overlay" style="z-index: 2000;">
    <view class="overlay-bg" @click="$emit('minimize')"></view>
    <view class="timer-panel fade-in">
      <view class="timer-full-body">
        <view class="quick-settings">
          <view v-for="(qs, qi) in computedQuickSettings" :key="qi" class="quick-btn"
            :class="{ 'quick-btn-active': selectedQuickSeconds === qs.seconds }" @click="setQuickTime(qs.seconds)">
            <text class="quick-label">{{ qs.label }}</text>
            <text class="quick-time">{{ qs.timeText }}</text>
          </view>
        </view>
        <view class="timer-core">
          <canvas v-if="canvasReady" id="timerCanvas" canvas-id="timerCanvas" class="timer-canvas"
            style="width:250px; height:250px; position:absolute; left:50%; top:50%; transform: translate(-50%, -50%);" />
          <view class="time-text">{{ displayTime }}</view>
        </view>
        <view class="timer-actions">
          <button class="action-btn" @click.stop="adjustDuration(-10)">-10s</button>
          <button class="action-btn" @click.stop="adjustDuration(+10)">+10s</button>
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
    emits: ['close', 'complete', 'time-change', 'minimize'],
    data() {
      return {
        totalDuration: 180,
        remaining: 180,
        timerInterval: null,
        endTimestamp: 0,
        notified: false,
        audioCtx: null,
        canvasReady: false,
        canvasNode: null,
        ctx: null,
        isMiniProgram: false,
        selectedQuickSeconds: 180,
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
      // 仅未计时时初始化；计时中再打开弹窗（点微型）不重置
      visible(val) {
        if (val && !this.timerInterval) this.initTimer()
        if (!val) this._teardownCanvas()
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
      this._teardownCanvas()
      if (this.audioCtx) {
        this.audioCtx.stop()
        this.audioCtx = null
      }
    },
    methods: {
      detectPlatform() {
        const isWx = typeof wx !== 'undefined' && wx.canIUse
        const hasCreateCanvasContext = typeof uni.createCanvasContext === 'function'
        this.isMiniProgram = isWx && hasCreateCanvasContext
      },
      initTimer() {
        const initialDuration = this.defaultDuration > 0
          ? this.defaultDuration
          : uni.getStorageSync('fitness_timer_duration') || 180
        this.totalDuration = initialDuration
        this.remaining = initialDuration
        this.selectedQuickSeconds = initialDuration
        this.notified = false
        this.canvasReady = true
        this.$nextTick(() => {
          this.initCanvas()
        })
      },
      // 外部（day.vue）直接启动倒计时，用于"点按钮即开始微型计时"
      startTimer(duration) {
        const d = duration > 0 ? duration : 180
        this.totalDuration = d
        this.remaining = d
        this.selectedQuickSeconds = d
        this.notified = false
        this.canvasReady = true
        this.$nextTick(() => {
          this.initCanvas()
        })
      },
      initCanvas() {
        this.detectPlatform()

        if (this.isMiniProgram) {
          this.ctx = uni.createCanvasContext('timerCanvas', this)
          this.drawCircle()
          this.startCountdown()
        } else {
          const canvas = document.getElementById('timerCanvas')
          if (!canvas) {
            this.startCountdown()
            return
          }

          this.canvasNode = canvas
          const size = 250
          const pixelRatio = window.devicePixelRatio || 1

          canvas.width = size * pixelRatio
          canvas.height = size * pixelRatio

          this.ctx = canvas.getContext('2d')
          if (this.ctx && pixelRatio !== 1) {
            this.ctx.scale(pixelRatio, pixelRatio)
          }

          this.drawCircle()
          this.startCountdown()
        }
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
        // 每秒通知父组件，用于微型计时器显示
        this.$emit('time-change', this.remaining, this.displayTime)
        if (this.remaining <= 0 && !this.notified) {
          this.notified = true
          this.clearTimer()
          uni.vibrateLong()
          this.audioCtx && this.audioCtx.play()
          uni.showToast({ title: '计时结束', icon: 'none', duration: 2000 })
          this.$emit('complete')
        }
      },
      setQuickTime(seconds) {
        uni.vibrateShort()
        this.totalDuration = seconds
        this.remaining = seconds
        this.selectedQuickSeconds = seconds
        uni.setStorageSync('fitness_timer_duration', seconds)
        this.notified = false
        this.endTimestamp = Date.now() + seconds * 1000
        this.startCountdown()
        this.$emit('time-change', seconds, this.displayTime)
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
        this.$emit('time-change', this.totalDuration, this.displayTime)
      },
      completeTimer() {
        this.clearTimer()
        this._teardownCanvas()
        this.$emit('complete')
      },
      // 销毁 canvas：微信小程序原生组件穿透 hidden，必须彻底销毁 DOM + 重置状态
      _teardownCanvas() {
        this.canvasReady = false
        this.ctx = null
        this.canvasNode = null
      },
      drawCircle() {
        if (!this.ctx) return

        const size = 250
        const cx = size / 2
        const cy = size / 2
        const r = 110

        this.ctx.clearRect(0, 0, size, size)

        if (this.isMiniProgram) {
          // 小程序 CanvasContext API
          this.ctx.setStrokeStyle('rgba(255, 255, 255, 0.1)')
          this.ctx.setLineWidth(14)
          this.ctx.beginPath()
          this.ctx.arc(cx, cy, r, 0, 2 * Math.PI)
          this.ctx.stroke()

          const percent = this.totalDuration > 0 ? this.remaining / this.totalDuration : 0
          const startAngle = Math.PI * 1.5
          const endAngle = startAngle + 2 * Math.PI * percent

          this.ctx.setStrokeStyle('#379bff')
          this.ctx.setLineWidth(17)
          this.ctx.setShadow(0, 0, 7, '#379bff')

          this.ctx.beginPath()
          this.ctx.arc(cx, cy, r, startAngle, endAngle, false)
          this.ctx.stroke()

          if (this.ctx.draw) {
            this.ctx.draw()
          }
        } else {
          // 标准 Canvas 2D API (H5/APP)
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
          this.ctx.lineWidth = 14
          this.ctx.beginPath()
          this.ctx.arc(cx, cy, r, 0, 2 * Math.PI)
          this.ctx.stroke()

          const percent = this.totalDuration > 0 ? this.remaining / this.totalDuration : 0
          const startAngle = Math.PI * 1.5
          const endAngle = startAngle + 2 * Math.PI * percent

          this.ctx.strokeStyle = '#379bff'
          this.ctx.lineWidth = 17
          this.ctx.shadowColor = '#379bff'
          this.ctx.shadowBlur = 15

          this.ctx.beginPath()
          this.ctx.arc(cx, cy, r, startAngle, endAngle, false)
          this.ctx.stroke()

          this.ctx.shadowBlur = 0
        }
      },
    },
  }
</script>

<style scoped>
  .timer-canvas {
    border-radius: 125px;
  }

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
    from { opacity: 0; }
    to { opacity: 1; }
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
    border: 2rpx solid var(--border-color);
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .quick-btn:active {
    transform: scale(0.96);
  }

  .quick-btn-active {
    background: var(--primary);
    border-color: var(--primary);
  }

  .quick-btn-active .quick-label {
    color: var(--primary);
  }

  .quick-btn-active .quick-time {
    color: var(--primary);
  }

  .quick-label {
    font-size: 15px;
    font-weight: bold;
    color: var(--primary);
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
    width: 250px;
    height: 250px;
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
    background: linear-gradient(135deg, var(--primary), #2d82d6) !important;
    color: #fff !important;
    font-weight: bold;
    border: none !important;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }
</style>
