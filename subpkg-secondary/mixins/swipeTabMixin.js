/**
 * 侧滑 Tab 切换 Mixin
 *
 * 功能：
 *   - 横向侧滑手势检测（方向锁：absDx > absDy * 1.9）
 *   - 高光框跟手插值（translateX + width 线性插值）
 *   - 松手阈值判断（距离 > 视宽 15% 或 速度 > 0.3px/ms）
 *   - 边界阻尼回弹
 *   - transition 开关（跟手时关闭，松手时恢复）
 *   - uni.vibrateShort 震动反馈
 *
 * 消费页面需提供：
 *   - swipeCurrentIndex (computed/data): 当前激活 tab 索引
 *   - onSwipeTabChange(nextIdx, dir) (method): 侧滑切换时的回调
 *   - swipeTabCount (computed/data, 可选): tab 总数，默认用 rects.length
 *
 * 可选覆盖：
 *   - swipeContainerSelector (data, 默认 '.swipe-tab-bar')
 *   - swipeItemSelector (data, 默认 '.swipe-tab-item')
 *   - swipeContentSelector (data, 默认 null): 内容容器选择器，用于测量视宽
 *
 * 模板示例：
 *   <view class="container" :class="{ dark, light, 'liquid-glass' }"
 *     @touchstart="onSwipeTouchStart" @touchmove="onSwipeTouchMove" @touchend="onSwipeTouchEnd">
 *     <view class="swipe-tab-bar" :class="{ 'no-transition': swipeNoTransition }">
 *       <view class="swipe-tab-highlight" :style="swipeHighlightStyle"></view>
 *       <view v-for="(t, i) in tabs" :key="t.key"
 *         class="swipe-tab-item" :class="{ active: i === swipeCurrentIndex }"
 *         @click="onSwipeTabClick(i)">
 *         {{ t.label }}
 *       </view>
 *     </view>
 *   </view>
 */

export default {
  data() {
    return {
      // 手势状态
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartTime: 0,
      swipeDeltaX: 0,
      swipeViewWidth: 0,
      swipeNoTransition: false,
      swipeIsTracking: false,
      // tab 位置测量
      swipeTabRects: [],
      swipeTabRectsMeasured: false,
      // 可由页面覆盖的选择器
      swipeContainerSelector: '.swipe-tab-bar',
      swipeItemSelector: '.swipe-tab-item',
      swipeContentSelector: null,
    }
  },

  computed: {
    /**
     * 高光框跟手样式：滑动时在当前 tab 与目标 tab 之间线性插值
     * 返回 { transform, width, opacity }
     */
    swipeHighlightStyle() {
      if (!this.swipeTabRectsMeasured || this.swipeTabRects.length === 0) {
        return { opacity: 0 }
      }
      const curIdx = this.swipeCurrentIndex
      if (curIdx < 0) return { opacity: 0 }
      const cur = this.swipeTabRects[curIdx]
      if (!cur) return { opacity: 0 }
      let left = cur.left
      let width = cur.width
      if (this.swipeDeltaX !== 0 && this.swipeViewWidth > 0) {
        // 方向：右滑(dx>0) → 上一个；左滑(dx<0) → 下一个
        const dir = this.swipeDeltaX > 0 ? -1 : 1
        const nextIdx = curIdx + dir
        if (nextIdx >= 0 && nextIdx < this.swipeTabRects.length) {
          const next = this.swipeTabRects[nextIdx]
          // 进度：滑动达到视图宽度 30% 即完成高光迁移
          const progress = Math.min(
            Math.abs(this.swipeDeltaX) / (this.swipeViewWidth * 0.3),
            1
          )
          left = cur.left + (next.left - cur.left) * progress
          width = cur.width + (next.width - cur.width) * progress
        } else {
          // 边界阻尼：只移动 20%
          left = cur.left + this.swipeDeltaX * 0.2
        }
      }
      return {
        transform: `translateX(${left}px)`,
        width: `${width}px`,
        opacity: 1,
      }
    },
  },

  methods: {
    /**
     * 测量 tab 栏容器和各 tab 的位置尺寸
     * 在 onShow / onReady / tab 切换后调用
     */
    swipeMeasureTabRects() {
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select(this.swipeContainerSelector).boundingClientRect()
        query.selectAll(this.swipeItemSelector).boundingClientRect()
        query.exec(res => {
          const container = res && res[0]
          const items = res && res[1]
          if (container && items && items.length > 0) {
            this.swipeTabRects = items.map(it => ({
              left: it.left - container.left,
              width: it.width,
            }))
            this.swipeTabRectsMeasured = true
            this.swipeViewWidth = container.width || this.swipeViewWidth
          }
        })
      })
    },

    /**
     * 手势开始：记录起点，关闭 transition
     */
    onSwipeTouchStart(e) {
      if (e.touches.length !== 1) return
      this.swipeStartX = e.touches[0].pageX
      this.swipeStartY = e.touches[0].pageY
      this.swipeStartTime = Date.now()
      this.swipeDeltaX = 0
      this.swipeNoTransition = true
      this.swipeIsTracking = true
      if (!this.swipeTabRectsMeasured) this.swipeMeasureTabRects()
    },

    /**
     * 手势移动：方向锁 + 记录 delta（不移动屏幕内容）
     */
    onSwipeTouchMove(e) {
      if (!this.swipeIsTracking || e.touches.length !== 1) return
      const dx = e.touches[0].pageX - this.swipeStartX
      const dy = e.touches[0].pageY - this.swipeStartY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      // 方向锁：横向必须明显大于纵向
      if (absDx <= absDy * 1.9) return
      this.swipeDeltaX = dx
      if (e.cancelable) e.preventDefault()
    },

    /**
     * 手势结束：阈值判断，达标则切换 tab，不达标则回弹
     */
    onSwipeTouchEnd() {
      if (!this.swipeIsTracking) return
      this.swipeIsTracking = false
      this.swipeNoTransition = false
      const dx = this.swipeDeltaX
      const absDx = Math.abs(dx)
      const dt = Date.now() - this.swipeStartTime
      // 阈值：距离 > 视宽 15% 或 速度 > 0.3px/ms
      const distThreshold = this.swipeViewWidth * 0.15
      const speedThreshold = 0.3
      if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
        this.swipeDeltaX = 0
        return
      }
      // 方向：dx > 0 右滑 → 上一个(i-1)；dx < 0 左滑 → 下一个(i+1)
      const dir = dx > 0 ? -1 : 1
      const curIdx = this.swipeCurrentIndex
      const nextIdx = curIdx + dir
      const tabCount =
        typeof this.swipeTabCount === 'number'
          ? this.swipeTabCount
          : this.swipeTabRects.length
      if (nextIdx < 0 || nextIdx >= tabCount) {
        this.swipeDeltaX = 0
        return
      }
      this.swipeDeltaX = 0
      uni.vibrateShort()
      // 交由页面实现切换逻辑
      if (typeof this.onSwipeTabChange === 'function') {
        this.onSwipeTabChange(nextIdx, dir)
      }
      this.swipeMeasureTabRects()
    },

    /**
     * 点击 tab 切换：直接切换，无滑动动画
     * 页面可直接调用，或在自己的 click handler 中调用此方法
     */
    onSwipeTabClick(targetIdx) {
      const curIdx = this.swipeCurrentIndex
      if (targetIdx === curIdx) return
      uni.vibrateShort()
      this.swipeNoTransition = false
      if (typeof this.onSwipeTabChange === 'function') {
        this.onSwipeTabChange(targetIdx, targetIdx > curIdx ? 1 : -1)
      }
      this.swipeMeasureTabRects()
    },
  },
}
