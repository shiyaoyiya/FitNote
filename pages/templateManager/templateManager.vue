<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    @touchstart="onPageTouchStart" @touchmove="onPageTouchMove" @touchend="onPageTouchEnd">
    <!-- 顶部 Tab 栏 + 高亮框 -->
    <view class="tab-bar" :class="{ 'no-transition': swipeNoTransition }">
      <view
        v-for="(t, i) in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: activeTab === t.key }"
        @click="switchTab(t.key, true)"
      >
        <text class="tab-label">{{ t.label }}</text>
      </view>
      <view
        class="tab-highlight"
        :style="tabHighlightStyle"
      ></view>
    </view>

    <!-- Tab 内容 -->
    <view v-show="activeTab === 'local'" class="tab-content">
      <LocalTemplates @open-import-export="showImportExport = true" />
    </view>

    <view v-show="activeTab === 'square'" class="tab-content">
      <TemplateSquareTab />
    </view>

    <!-- 导入/导出弹窗 -->
    <TemplateImportExport
      :visible="showImportExport"
      :templates="localTemplates"
      @close="showImportExport = false"
    />
  </view>
</template>

<script>
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { useTemplateStore } from '@/stores/template.js'
import LocalTemplates from './components/LocalTemplates.vue'
import TemplateSquareTab from './components/TemplateSquareTab.vue'
import TemplateImportExport from './components/TemplateImportExport.vue'

export default {
  components: {
    LocalTemplates,
    TemplateSquareTab,
    TemplateImportExport
  },
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      templateStore: useTemplateStore(),
      activeTab: 'local',
      showImportExport: false,
      tabs: [
        { key: 'local', label: '📁 本地模板' },
        { key: 'square', label: '🏪 模板广场' },
      ],
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartTime: 0,
      swipeDeltaX: 0,
      swipeViewWidth: 0,
      swipeNoTransition: false,
      swipeIsTracking: false,
      tabRects: [],
      tabRectsMeasured: false,
    }
  },
  computed: {
    activeIndex() {
      return this.tabs.findIndex(t => t.key === this.activeTab)
    },
    localTemplates() {
      return this.templateStore.templates || []
    },
    tabHighlightStyle() {
      if (!this.tabRectsMeasured || this.tabRects.length === 0) return { opacity: 0 }
      const curIdx = this.activeIndex
      if (curIdx < 0) return { opacity: 0 }
      const cur = this.tabRects[curIdx]
      if (!cur) return { opacity: 0 }
      let left = cur.left
      let width = cur.width
      if (this.swipeDeltaX !== 0 && this.swipeViewWidth > 0) {
        const dir = this.swipeDeltaX > 0 ? -1 : 1
        const nextIdx = curIdx + dir
        if (nextIdx >= 0 && nextIdx < this.tabRects.length) {
          const next = this.tabRects[nextIdx]
          const progress = Math.min(Math.abs(this.swipeDeltaX) / (this.swipeViewWidth * 0.3), 1)
          left = cur.left + (next.left - cur.left) * progress
          width = cur.width + (next.width - cur.width) * progress
        } else {
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
  onLoad() {
    this.daySettingsStore.load()
    this.templateStore.load()
    this.measureTabRects()
  },
  onShow() {
    this.measureTabRects()
  },
  methods: {
    measureTabRects() {
      this.$nextTick(() => {
        setTimeout(() => {
          const query = uni.createSelectorQuery().in(this)
          query.select('.tab-bar').boundingClientRect()
          query.selectAll('.tab-item').boundingClientRect()
          query.exec(res => {
            const container = res && res[0]
            const items = res && res[1]
            if (container && items && items.length > 0) {
              this.tabRects = items.map(it => ({
                left: it.left - container.left,
                width: it.width,
              }))
              this.tabRectsMeasured = true
              this.swipeViewWidth = container.width
            }
          })
        }, 50)
      })
    },

    onPageTouchStart(e) {
      if (e.touches.length !== 1) return
      this.swipeStartX = e.touches[0].pageX
      this.swipeStartY = e.touches[0].pageY
      this.swipeStartTime = Date.now()
      this.swipeDeltaX = 0
      this.swipeNoTransition = true
      this.swipeIsTracking = true
      if (!this.tabRectsMeasured) this.measureTabRects()
    },

    onPageTouchMove(e) {
      if (!this.swipeIsTracking || e.touches.length !== 1) return
      const dx = e.touches[0].pageX - this.swipeStartX
      const dy = e.touches[0].pageY - this.swipeStartY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx <= absDy * 1.9) return
      this.swipeDeltaX = dx
      if (e.cancelable) e.preventDefault()
    },

    onPageTouchEnd(e) {
      if (!this.swipeIsTracking) return
      this.swipeIsTracking = false
      this.swipeNoTransition = false
      const dx = this.swipeDeltaX
      const absDx = Math.abs(dx)
      const dt = Date.now() - this.swipeStartTime
      const distThreshold = this.swipeViewWidth * 0.15
      const speedThreshold = 0.3
      if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
        this.swipeDeltaX = 0
        return
      }
      const dir = dx > 0 ? -1 : 1
      const nextIdx = this.activeIndex + dir
      if (nextIdx < 0 || nextIdx >= this.tabs.length) {
        this.swipeDeltaX = 0
        return
      }
      this.swipeDeltaX = 0
      uni.vibrateShort()
      this.switchTab(this.tabs[nextIdx].key, false)
      this.measureTabRects()
    },

    switchTab(key, fromClick) {
      if (fromClick) {
        uni.vibrateShort()
      }
      this.activeTab = key
      this.measureTabRects()
    },
  },
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

.tab-bar {
  position: relative;
  display: flex;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.tab-item {
  position: relative;
  z-index: 1;
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 14px;
  transition: color 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
  font-weight: 500;
}

.tab-item.active {
  color: #ffffff !important;
}

.tab-item:active {
  transform: scale(0.97);
}

.tab-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  background: var(--primary);
  border-radius: 8px;
  z-index: 0;
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}

.tab-bar.no-transition .tab-highlight {
  transition: none;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>
