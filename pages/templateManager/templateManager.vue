<template>
  <view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    @touchstart="onPageSwipeStart" @touchmove="onPageSwipeMove" @touchend="onPageSwipeEnd">

    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 顶部主 Tab 栏：我的模板 / 模板广场 -->
    <view v-else class="main-tab-bar" :class="{ 'no-transition': swipeTabNoTransition }">
      <view
        v-for="(t, i) in mainTabs" :key="t.key"
        class="main-tab-item"
        :class="{ active: activeMainTab === t.key }"
        @click="switchMainTab(t.key, true)"
      >
        <text class="main-tab-text">{{ t.label }}</text>
      </view>
      <!-- 滑动高亮指示线 -->
      <view
        class="tab-highlight-bar"
        :style="tabHighlightStyle"
      ></view>
    </view>

    <view v-if="!loading" class="mid-scroll">
      <!-- ========== 我的模板 Tab ========== -->
      <view v-show="activeMainTab === 'mine'">
        <TemplateList
          :templates="filteredTemplates"
          @select="goToTemplateDetail"
          @reorder="handleReorder"
          @save="saveTemplates"
          @delete="handleDelete"
        />
      </view>

      <!-- ========== 模板广场 Tab ========== -->
      <view v-show="activeMainTab === 'square'">
        <TemplateSquare
          :templates="squareTemplates"
          @select="openSquareDetail"
        />
      </view>
    </view>

    <!-- 模板广场：分享 FAB -->
    <view class="sq-share-fab" v-show="activeMainTab === 'square'" @click="openSharePanel">
      <text class="sq-share-fab-icon">📤</text>
      <text class="sq-share-fab-text">分享我的模板</text>
    </view>

    <view class="bottom-bar" v-show="activeMainTab === 'mine'">
      <view class="btn-import-export" @click="openImportExportPanel">
        <text class="btn-icon">📤</text>
        <text class="btn-label">导入/导出</text>
      </view>
      <view class="btn-create" @click="openCreatePanel">
        <text class="btn-create-icon">+</text>
        <text class="btn-create-label">新建模板</text>
      </view>
    </view>

    <!-- 新建模板弹窗 -->
    <TemplateCreate
      :visible="showCreatePanel"
      @close="closeCreatePanel"
      @confirm="handleCreateConfirm"
    />

    <!-- 导入导出弹窗 -->
    <TemplateImportExport
      :visible="showImportExportPanel"
      :templates="filteredTemplates"
      @close="closeImportExportPanel"
      @import="handleImport"
    />

    <!-- 分享弹窗 -->
    <TemplateShare
      :visible="showSharePanel"
      :templates="templateStore.templates"
      @close="closeSharePanel"
    />

    <!-- 广场详情弹窗 -->
    <TemplateDetail
      :visible="showSquareDetail"
      :template="activeSquareTemplate"
      @close="closeSquareDetail"
      @import="importSquareTemplate"
    />
  </view>
</template>

<script>
import { useTemplateStore } from '@/stores/template'
import { useActionStore } from '@/stores/action'
import { useDaySettingsStore } from '@/stores/daySettings.js'

import TemplateList from './components/TemplateList.vue'
import TemplateSquare from './components/TemplateSquare.vue'
import TemplateCreate from './components/TemplateCreate.vue'
import TemplateImportExport from './components/TemplateImportExport.vue'
import TemplateShare from './components/TemplateShare.vue'
import TemplateDetail from './components/TemplateDetail.vue'

const DAYDATA_PREFIX = 'fitness_daydata_'

export default {
  components: {
    TemplateList,
    TemplateSquare,
    TemplateCreate,
    TemplateImportExport,
    TemplateShare,
    TemplateDetail
  },
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      loading: true,
      showCreatePanel: false,
      showImportExportPanel: false,
      showSharePanel: false,
      showSquareDetail: false,
      activeSquareTemplate: null,
      activeMainTab: 'mine',
      swipeTabNoTransition: false,
      tabRects: [],
      tabRectsMeasured: false,
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartTime: 0,
      swipeDeltaX: 0,
      swipeViewWidth: 0,
      swipeIsTracking: false,
      squareTemplates: [
        {
          id: 'sq_001', name: '新手5x5全身', author: 'FitNote官方',
          color: '#6366f1', color2: '#a855f7', likes: 3214, downloads: 8921,
          tags: ['全身', '新手', '增肌'],
          actions: [
            { name: '深蹲', sets: 5 },
            { name: '卧推', sets: 5 },
            { name: '杠铃划船', sets: 5 },
            { name: '推举', sets: 3 },
            { name: '硬拉', sets: 1 },
          ]
        },
        {
          id: 'sq_002', name: '推拉腿三分化', author: '大骏',
          color: '#0ea5e9', color2: '#14b8a6', likes: 2731, downloads: 7210,
          tags: ['全身', '分化', '增肌'],
          actions: [
            { name: '卧推', sets: 4 }, { name: '上斜哑铃飞鸟', sets: 3 },
            { name: '推举', sets: 4 }, { name: '侧平举', sets: 3 },
            { name: '绳索下压', sets: 3 },
          ]
        },
        {
          id: 'sq_003', name: '胸背超级组', author: '铁锤教练',
          color: '#f97316', color2: '#ef4444', likes: 1892, downloads: 4820,
          tags: ['胸', '背', '中级'],
          actions: [
            { name: '卧推', sets: 4 }, { name: '引体向上', sets: 4 },
            { name: '上斜卧推', sets: 3 }, { name: '高位下拉', sets: 3 },
            { name: '绳索夹胸', sets: 3 }, { name: '坐姿划船', sets: 3 },
          ]
        },
        {
          id: 'sq_004', name: '臀腿塑形(女)', author: 'JennyFitness',
          color: '#ec4899', color2: '#f43f5e', likes: 2540, downloads: 6100,
          tags: ['腿', '塑形', '女性'],
          actions: [
            { name: '臀推', sets: 4 }, { name: '深蹲', sets: 3 },
            { name: '保加利亚分腿蹲', sets: 3 }, { name: '罗马尼亚硬拉', sets: 3 },
            { name: '腿举', sets: 3 }, { name: '腿弯举', sets: 3 },
          ]
        },
        {
          id: 'sq_005', name: '核心雕刻(30min)', author: 'CoreGuru',
          color: '#10b981', color2: '#22d3ee', likes: 3980, downloads: 9280,
          tags: ['核心', '快速', '居家'],
          actions: [
            { name: '平板支撑', sets: 3 }, { name: '卷腹', sets: 4 },
            { name: '俄罗斯转体', sets: 3 }, { name: '悬垂举腿', sets: 3 },
            { name: '死虫式', sets: 3 },
          ]
        },
        {
          id: 'sq_006', name: '肩手轰炸', author: 'IronBabe',
          color: '#8b5cf6', color2: '#3b82f6', likes: 1721, downloads: 3340,
          tags: ['肩', '手臂', '进阶'],
          actions: [
            { name: '推举', sets: 4 }, { name: '侧平举', sets: 4 },
            { name: '前平举', sets: 3 }, { name: '杠铃弯举', sets: 4 },
            { name: '臂屈伸', sets: 4 }, { name: '锤式弯举', sets: 3 },
          ]
        },
      ]
    }
  },
  computed: {
    templateStore() {
      return useTemplateStore()
    },
    actionStore() {
      return useActionStore()
    },
    filteredTemplates() {
      return this.templateStore.templates || []
    },
    mainTabs() {
      return [
        { key: 'mine', label: '我的模板' },
        { key: 'square', label: '模板广场' }
      ]
    },
    activeTabIndex() {
      return this.mainTabs.findIndex(t => t.key === this.activeMainTab)
    },
    tabHighlightStyle() {
      if (!this.tabRectsMeasured || this.tabRects.length === 0) return { opacity: 0 }
      const curIdx = this.activeTabIndex
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
        opacity: 1
      }
    }
  },
  onShow() {
    this.loadData()
    this.measureTabRects()
  },
  mounted() {
    this.daySettingsStore.load()
    this.measureTabRects()
  },
  methods: {
    loadData() {
      this.loading = true
      this.actionStore.load()
      this.templateStore.load()
      this.$nextTick(() => {
        this.loading = false
      })
    },
    switchMainTab(key, fromClick) {
      if (this.activeMainTab === key) return
      if (fromClick) uni.vibrateShort()
      this.activeMainTab = key
      this.measureTabRects()
    },
    measureTabRects() {
      this.$nextTick(() => {
        setTimeout(() => {
          const query = uni.createSelectorQuery().in(this)
          query.select('.main-tab-bar').boundingClientRect()
          query.selectAll('.main-tab-item').boundingClientRect()
          query.exec(res => {
            const container = res && res[0]
            const items = res && res[1]
            if (container && items && items.length > 0) {
              this.tabRects = items.map(it => ({
                left: it.left - container.left,
                width: it.width
              }))
              this.tabRectsMeasured = true
              this.swipeViewWidth = container.width
            }
          })
        }, 50)
      })
    },
    onPageSwipeStart(e) {
      if (this.showImportExportPanel || this.showCreatePanel) return
      if (e.touches.length !== 1) return
      this.swipeStartX = e.touches[0].pageX
      this.swipeStartY = e.touches[0].pageY
      this.swipeStartTime = Date.now()
      this.swipeDeltaX = 0
      this.swipeTabNoTransition = true
      this.swipeIsTracking = true
      if (!this.tabRectsMeasured) this.measureTabRects()
    },
    onPageSwipeMove(e) {
      if (!this.swipeIsTracking || e.touches.length !== 1) return
      const dx = e.touches[0].pageX - this.swipeStartX
      const dy = e.touches[0].pageY - this.swipeStartY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx <= absDy * 1.9) return
      this.swipeDeltaX = dx
      if (e.cancelable) e.preventDefault()
    },
    onPageSwipeEnd() {
      if (!this.swipeIsTracking) return
      this.swipeIsTracking = false
      this.swipeTabNoTransition = false
      const dx = this.swipeDeltaX
      const absDx = Math.abs(dx)
      const dt = Date.now() - this.swipeStartTime
      const distThreshold = (this.swipeViewWidth || 300) * 0.15
      const speedThreshold = 0.3
      if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
        this.swipeDeltaX = 0
        return
      }
      const dir = dx > 0 ? -1 : 1
      const curIdx = this.mainTabs.findIndex(t => t.key === this.activeMainTab)
      const nextIdx = curIdx + dir
      if (nextIdx < 0 || nextIdx >= this.mainTabs.length) {
        this.swipeDeltaX = 0
        return
      }
      this.swipeDeltaX = 0
      uni.vibrateShort()
      this.switchMainTab(this.mainTabs[nextIdx].key, false)
      this.measureTabRects()
    },
    openCreatePanel() {
      this.showCreatePanel = true
    },
    closeCreatePanel() {
      this.showCreatePanel = false
    },
    handleCreateConfirm({ name, actions, color }) {
      this.templateStore.addTemplate(name)
      const tpl = this.templateStore.templates.find(t => t.name === name)
      if (tpl) {
        tpl.actions = [...actions]
        tpl.color = color
        this.templateStore.save()
      }
      uni.showToast({ title: '模板创建成功', icon: 'success' })
      this.closeCreatePanel()
    },
    openImportExportPanel() {
      this.showImportExportPanel = true
    },
    closeImportExportPanel() {
      this.showImportExportPanel = false
    },
    handleImport(templates) {
      templates.forEach(tpl => {
        this.templateStore.templates.push(tpl)
      })
      this.templateStore.save()
      uni.showToast({ title: '导入成功', icon: 'success' })
      this.closeImportExportPanel()
    },
    openSharePanel() {
      this.showSharePanel = true
    },
    closeSharePanel() {
      this.showSharePanel = false
    },
    openSquareDetail(tpl) {
      this.activeSquareTemplate = tpl
      this.showSquareDetail = true
    },
    closeSquareDetail() {
      this.showSquareDetail = false
      this.activeSquareTemplate = null
    },
    importSquareTemplate(tpl) {
      uni.showToast({ title: '导入成功', icon: 'success' })
      this.closeSquareDetail()
    },
    goToTemplateDetail(tpl) {
      uni.navigateTo({
        url: `/pages/templateDetail/templateDetail?template=${encodeURIComponent(tpl.name)}`
      })
    },
    handleReorder({ from, to }) {
      const arr = this.templateStore.templates.slice()
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      this.templateStore.templates = arr
    },
    saveTemplates() {
      this.templateStore.save()
    },
    handleDelete(idx) {
      const tpl = this.filteredTemplates[idx]
      uni.showModal({
        title: '删除模板',
        content: `确定删除「${tpl.name}」吗？`,
        confirmText: '删除',
        cancelText: '取消',
        confirmColor: '#ff5a5d',
        success: res => {
          if (res.confirm) {
            this.backupTemplateColorToDayData(tpl.name, tpl.color)
            this.templateStore.removeTemplate(tpl.id || tpl.name)
            uni.showToast({ title: '删除成功', icon: 'success' })
          }
        }
      })
    },
    backupTemplateColorToDayData(templateName, templateColor) {
      if (!templateColor) return
      const storageInfo = uni.getStorageInfoSync()
      const dayKeys = storageInfo.keys.filter(key => key.startsWith(DAYDATA_PREFIX))
      dayKeys.forEach(key => {
        const dayData = uni.getStorageSync(key) || {}
        if (dayData.templates && dayData.templates[templateName]) {
          if (!dayData.color) {
            dayData.color = templateColor
            uni.setStorageSync(key, dayData)
          }
          if (dayData.templates[templateName] && !dayData.templates[templateName].color) {
            dayData.templates[templateName].color = templateColor
            uni.setStorageSync(key, dayData)
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.mid-scroll {
  position: relative;
  flex: 1;
  overflow-y: auto;
  background-color: transparent;
  padding-bottom: 80px;
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.main-tab-bar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-bottom: 1rpx solid var(--border-color);
}

.main-tab-item {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  transition: color 0.2s ease;
}

.main-tab-item:active { opacity: 0.7; }

.main-tab-text {
  font-size: 30rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

.main-tab-item.active .main-tab-text {
  color: var(--primary);
  font-weight: 700;
}

.tab-highlight-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 6rpx;
  background: var(--primary);
  border-radius: 6rpx;
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}

.main-tab-bar.no-transition .tab-highlight-bar {
  transition: none;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 40rpx;
  background: linear-gradient(transparent, var(--bg-primary) 40rpx);
  z-index: 10;
}

.btn-import-export {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  height: 88rpx;
  background: var(--bg-tertiary);
  border-radius: 44rpx;
  color: var(--text-primary);
  font-size: 28rpx;
  font-weight: 600;
}

.btn-create {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 88rpx;
  background: var(--primary);
  border-radius: 44rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(55, 155, 255, 0.3);
}

.btn-create:active {
  opacity: 0.8;
}

.sq-share-fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--primary, #379bff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 100;
  white-space: nowrap;
  width: max-content;
  max-width: calc(100% - 32px);
}

.sq-share-fab:active {
  transform: translateX(-50%) scale(0.96);
}

.sq-share-fab-icon {
  font-size: 18px;
  white-space: nowrap;
}

.sq-share-fab-text {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

/* 平板适配 */
.main-tab-bar,
.mid-scroll,
.bottom-bar {
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.bottom-bar {
  left: 50%;
  transform: translateX(-50%);
}

@media (min-width: 500px) {
  .main-tab-item { padding: 10px 12px !important; }
  .main-tab-text { font-size: 14px !important; }
  .btn-import-export,
  .btn-create { height: 44px !important; font-size: 14px !important; }
  .btn-icon,
  .btn-create-icon { font-size: 16px !important; }
  .btn-label,
  .btn-create-label { font-size: 13px !important; }
}
</style>
