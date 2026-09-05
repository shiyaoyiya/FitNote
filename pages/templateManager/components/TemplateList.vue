<template>
  <movable-area class="movable-area" :style="{ height: templates.length * rowHeight + 'px' }">
    <view v-for="(item, index) in templates" :key="'slot'+index" class="item-slot"
      :style="{ top: index * rowHeight + 'px' }"></view>

    <movable-view v-for="(tpl, idx) in templates" :key="tpl.id" direction="vertical" class="movable-item"
      :y="itemY[idx]" :disabled="!isDragMode" :class="{ 'is-dragging': dragIdx === idx }"
      @change="onDragMove($event, idx)" @touchend="isDragMode ? onDragEnd() : null">
      <view class="slide-wrapper">
        <view class="delete-btn-container">
          <view class="delete-btn" @click.stop="handleDelete(idx)"
            :style="{ display: isDragMode ? 'none' : 'flex' }">
            删除
          </view>
        </view>
        <view class="action-card" :style="{ transform: 'translateX(' + (slideOffset[idx] || 0) + 'px)' }"
          @touchstart="onTouchStart($event, idx)" @touchmove="onTouchMove($event, idx)"
          @touchend="onTouchEnd($event, idx)" @longpress="onDragTrigger(idx)">
          <TemplateCard :template="tpl" :is-dragging="dragIdx === idx" />
        </view>
      </view>
    </movable-view>
  </movable-area>
</template>

<script>
import TemplateCard from './TemplateCard.vue'

export default {
  name: 'TemplateList',
  components: {
    TemplateCard
  },
  props: {
    templates: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      rowHeight: 0,
      isDragMode: false,
      isDragTriggered: false,
      hasSwapped: false,
      itemY: [],
      dragIdx: -1,
      lastTargetIdx: -1,
      lastVibrateTime: 0,
      slideOffset: [],
      startX: 0,
      startY: 0,
      startTime: 0,
      isClick: false,
      longPressTimer: null,
      longPressThreshold: 500
    }
  },
  mounted() {
    const sys = uni.getSystemInfoSync()
    this.rowHeight = (sys.windowWidth / 750) * 180
    this.initPositions()
  },

  methods: {
    initPositions() {
      if (this.templates.length === 0) return
      const newItemY = []
      for (let i = 0; i < this.templates.length; i++) {
        newItemY[i] = Math.round(i * this.rowHeight)
      }
      this.itemY = newItemY
      if (this.slideOffset.length !== this.templates.length) {
        this.slideOffset = new Array(this.templates.length).fill(0)
      }
    },
    onTouchStart(e, idx) {
      this.startX = e.touches[0].pageX
      this.startY = e.touches[0].pageY
      this.startTime = Date.now()
      this.isClick = true
      if (!this.isDragMode) {
        this.$set(this.slideOffset, idx, 0)
      }
    },
    onTouchMove(e, idx) {
      if (this.isDragMode) return
      const currentX = e.touches[0].pageX
      const currentY = e.touches[0].pageY
      const deltaX = currentX - this.startX
      const deltaY = currentY - this.startY
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        this.isClick = false
      }
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          this.$set(this.slideOffset, idx, Math.max(deltaX, -100))
        } else if (deltaX > 0 && this.slideOffset[idx] < 0) {
          this.$set(this.slideOffset, idx, Math.min(0, this.slideOffset[idx] + deltaX))
        }
        if (e.cancelable) {
          e.preventDefault()
          e.stopPropagation()
        }
      } else {
        this.$set(this.slideOffset, idx, 0)
      }
    },
    onTouchEnd(e, idx) {
      if (this.isDragMode) return
      const touchDuration = Date.now() - this.startTime
      if (this.isClick && touchDuration < 300 && (this.slideOffset[idx] || 0) === 0) {
        setTimeout(() => {
          if (!this.isDragMode) {
            this.$emit('select', this.templates[idx])
          }
        }, 50)
      }
      if ((this.slideOffset[idx] || 0) < -50) {
        this.$set(this.slideOffset, idx, -80)
      } else {
        this.$set(this.slideOffset, idx, 0)
      }
      this.isClick = false
      this.startX = 0
      this.startTime = 0
    },
    onDragTrigger(idx) {
      this.isDragTriggered = true
      this.hasSwapped = false
      this.dragIdx = idx
      this.isDragMode = true
      uni.vibrateShort()
      this.$set(this.slideOffset, idx, 0)
    },
    onDragMove(e, idx) {
      if (!this.isDragMode || this.dragIdx !== idx) return
      const currentY = e.detail.y
      const baseY = idx * this.rowHeight
      const offsetY = currentY - baseY
      const shouldSwapDown = offsetY > this.rowHeight * 0.5 && idx < this.templates.length - 1
      const shouldSwapUp = offsetY < -this.rowHeight * 0.5 && idx > 0
      if (shouldSwapDown || shouldSwapUp) {
        const targetIdx = shouldSwapDown ? idx + 1 : idx - 1
        if (targetIdx === this.lastTargetIdx) return
        this.lastTargetIdx = targetIdx
        this.hasSwapped = true
        this.$emit('reorder', { from: idx, to: targetIdx })
        this.dragIdx = targetIdx
        this.smoothUpdatePositions()
        const now = Date.now()
        if (now - this.lastVibrateTime > 150) {
          uni.vibrateShort()
          this.lastVibrateTime = now
        }
      } else {
        const minY = 0
        const maxY = (this.templates.length - 1) * this.rowHeight
        const clampedY = Math.max(minY, Math.min(currentY, maxY))
        this.$set(this.itemY, idx, clampedY)
      }
    },
    smoothUpdatePositions() {
      for (let i = 0; i < this.templates.length; i++) {
        this.$set(this.itemY, i, i * this.rowHeight)
      }
    },
    onDragEnd() {
      if (!this.isDragTriggered) return
      this.isDragMode = false
      this.dragIdx = -1
      this.lastTargetIdx = -1
      if (this.isDragTriggered) {
        this.initPositions()
        this.$emit('save')
      }
      this.isDragTriggered = false
      this.hasSwapped = false
    },
    handleDelete(idx) {
      this.$emit('delete', idx)
    }
  }
}
</script>

<style scoped>
.movable-area {
  width: 100%;
  position: relative;
  opacity: 1;
  transition: opacity 0.2s ease;
  overflow: visible;
}

.item-slot {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 92%;
  height: 180rpx;
}

.movable-item {
  width: 100%;
  height: 180rpx;
  display: flex;
  align-items: center;
  transition: none !important;
}

.movable-item:not(.is-dragging) {
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
}

.is-dragging {
  z-index: 999 !important;
  transition: none !important;
}

.slide-wrapper {
  position: relative;
  width: 100%;
  height: 156rpx;
  margin: 0 30rpx;
  overflow: visible;
  background-color: transparent;
}

.delete-btn-container {
  position: absolute;
  right: 2rpx;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
}

.delete-btn {
  width: 130rpx;
  height: 100rpx;
  background-color: var(--danger);
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
  z-index: 1;
}

.action-card {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: transform 0.2s ease;
}

.is-dragging .action-card {
  transition: none;
  transform: scale(1.05) !important;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.8);
  border: 1rpx solid var(--border-color);
}
</style>
