<template>
  <view class="local-templates-container">
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else class="mid-scroll">
      <movable-area v-if="showList" class="movable-area"
        :style="{ height: filteredTemplates.length * rowHeight + 'px' }">
        <view v-for="(item, index) in filteredTemplates" :key="'slot'+index" class="item-slot"
          :style="{ top: index * rowHeight + 'px' }"></view>

        <movable-view v-for="(tpl, idx) in filteredTemplates" :key="tpl.id" direction="vertical" class="movable-item"
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
              <view class="card-color-bar" :style="{ backgroundColor: tpl.color || '#555' }"></view>
              <view class="card-info">
                <text class="card-name">{{ tpl.name }}</text>
                <text class="card-count">{{ tpl.actions ? tpl.actions.length : 0 }} 个动作</text>
              </view>
              <text class="card-arrow">›</text>
            </view>
          </view>
        </movable-view>

        <view v-if="filteredTemplates.length === 0" class="empty-state-inside">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无模板，快去创建一个吧~</text>
        </view>
      </movable-area>
    </view>

    <view class="bottom-bar">
      <view class="btn-import-export" @click="openImportExportPanel">
        <text class="btn-icon">📤</text>
        <text class="btn-label">导入/导出</text>
      </view>
      <view class="btn-create" @click="openCreatePanel">
        <text class="btn-create-icon">+</text>
        <text class="btn-create-label">新建模板</text>
      </view>
    </view>

    <view v-if="showCreatePanel" class="popup-overlay" @click.self="closeCreatePanel">
      <view class="overlay-bg" @click="closeCreatePanel"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">新建模板</text>
          <text class="close-btn" @click="closeCreatePanel">×</text>
        </view>

        <view class="panel-body">
          <view class="form-group">
            <text class="form-label">模板名称</text>
            <input v-model="newTemplateName" placeholder="输入模板名称" class="form-input" maxlength="20" />
          </view>

          <view class="search-bar">
            <view class="search-bar-inner">
              <text class="search-icon">🔍</text>
              <input v-model="searchTerm" placeholder="搜索动作名称..." class="search-input" />
              <text v-if="searchTerm" class="clear-icon" @click="searchTerm = ''">×</text>
            </view>
          </view>

          <scroll-view class="category-scroll" scroll-x="true" show-scrollbar="false">
            <view v-for="cat in categories" :key="cat.id" class="category-tab"
              :class="{ active: activeCategory === cat.id }" @click="activeCategory = cat.id">
              <text class="category-name">{{ cat.name }}</text>
              <text class="category-count">{{ categoryCounts[cat.id] || 0 }}</text>
            </view>
          </scroll-view>

          <scroll-view class="action-list" scroll-y="true" show-scrollbar="false">
            <view class="action-grid">
              <view v-for="act in filteredActions" :key="act.id" class="action-item"
                :class="{ selected: selectedActions.includes(act.name) }" @click="toggleAction(act.name)">
                <text class="action-name">{{ act.name }}</text>
                <text v-if="selectedActions.includes(act.name)" class="check-mark">✓</text>
              </view>
            </view>
            <view v-if="filteredActions.length === 0" class="no-actions">
              <text>未找到匹配的动作</text>
            </view>
          </scroll-view>

          <view class="selected-count">
            <text>已选 {{ selectedActions.length }} 个动作</text>
          </view>

          <view class="color-section">
            <text class="color-label">模板配色</text>
            <view class="color-options">
              <view v-for="(c, ci) in presetColors" :key="ci" class="color-item"
                :class="{ active: selectedColor === c.value }" @click="selectedColor = c.value">
                <view class="color-circle" :style="{ backgroundColor: c.value }"></view>
                <text class="color-name">{{ c.name }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="panel-footer">
          <button class="btn-confirm" @click="confirmCreate">确认创建</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useTemplateStore } from '@/stores/template.js'
import { useActionStore } from '@/stores/action.js'
import { useDaySettingsStore } from '@/stores/daySettings.js'

const DAYDATA_PREFIX = 'fitness_daydata_'

export default {
  data() {
    return {
      daySettingsStore: useDaySettingsStore(),
      templateStore: useTemplateStore(),
      actionStore: useActionStore(),
      loading: false,
      showList: true,
      filteredTemplates: [],
      itemY: [],
      isDragMode: false,
      isDragTriggered: false,
      hasSwapped: false,
      dragIdx: -1,
      lastTargetIdx: -1,
      lastVibrateTime: 0,
      slideOffset: [],
      startX: 0,
      startY: 0,
      startTime: 0,
      isClick: false,
      isNavigating: false,
      longPressTimer: null,
      longPressThreshold: 500,
      rowHeight: 70,
      showCreatePanel: false,
      newTemplateName: '',
      searchTerm: '',
      activeCategory: 'all',
      selectedActions: [],
      selectedColor: '#93d5dc',
      presetColors: [
        { name: '清水蓝', value: '#93d5dc' },
        { name: '松石绿', value: '#4DB6AC' },
        { name: '藤萝紫', value: '#8076a3' },
        { name: '姜红', value: '#eeb8c3' },
        { name: '克莱因蓝', value: '#002fa7' },
        { name: '马尔斯绿', value: '#01847f' },
        { name: '申布伦黄', value: '#fbd26a' },
        { name: '提香红', value: '#d44848' },
        { name: '粉红', value: '#f2b9b2' },
        { name: '玛瑙灰', value: '#cfccc9' },
        { name: '汉白玉', value: '#f8f4ed' },
      ],
    }
  },
  computed: {
    categories() {
      return [
        { id: 'all', name: '全部' },
        ...this.actionStore.categories,
      ]
    },
    categoryCounts() {
      const counts = { all: this.actionStore.actions.length }
      this.actionStore.categories.forEach(c => {
        counts[c.id] = this.actionStore.actions.filter(a => a.categories.includes(c.id)).length
      })
      return counts
    },
    filteredActions() {
      let result = this.actionStore.actions
      if (this.activeCategory !== 'all') {
        result = result.filter(a => a.categories.includes(this.activeCategory))
      }
      if (this.searchTerm.trim()) {
        const q = this.searchTerm.trim().toLowerCase()
        result = result.filter(a => a.name.toLowerCase().includes(q))
      }
      return result
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    loadData() {
      this.loading = true
      try {
        this.templateStore.load()
        this.actionStore.load()
        this.filteredTemplates = (this.templateStore.templates || []).filter(t => !t.isAerobic)
        this.initDragState()
        this.loadCategories()
      } catch (e) {
        console.error('加载数据失败:', e)
      } finally {
        this.loading = false
      }
    },
    initDragState() {
      this.itemY = this.filteredTemplates.map((_, i) => i * this.rowHeight)
      this.slideOffset = this.filteredTemplates.map(() => 0)
    },
    loadCategories() {
      this.actionStore.load()
    },
    openImportExportPanel() {
      this.$emit('open-import-export')
    },
    openCreatePanel() {
      this.showCreatePanel = true
      this.newTemplateName = ''
      this.searchTerm = ''
      this.activeCategory = 'all'
      this.selectedActions = []
      this.selectedColor = this.presetColors[0].value
    },
    closeCreatePanel() {
      this.showCreatePanel = false
      this.newTemplateName = ''
      this.searchTerm = ''
      this.activeCategory = 'all'
      this.selectedActions = []
      this.selectedColor = this.presetColors[0].value
    },
    toggleAction(name) {
      const idx = this.selectedActions.indexOf(name)
      if (idx === -1) {
        this.selectedActions.push(name)
      } else {
        this.selectedActions.splice(idx, 1)
      }
    },
    confirmCreate() {
      const name = this.newTemplateName.trim()
      if (!name) {
        uni.showToast({ title: '请输入模板名称', icon: 'none' })
        return
      }
      if (this.templateStore.templates.some(t => t.name === name)) {
        uni.showToast({ title: '已存在同名模板', icon: 'none' })
        return
      }

      this.templateStore.addTemplate(name)
      const tpl = this.templateStore.templates.find(t => t.name === name)
      if (tpl) {
        tpl.actions = [...this.selectedActions]
        tpl.color = this.selectedColor
        this.templateStore.save()
      }

      this.filteredTemplates = (this.templateStore.templates || []).filter(t => !t.isAerobic)
      this.initDragState()

      uni.showToast({ title: '模板创建成功', icon: 'success' })
      this.closeCreatePanel()
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
            this.goToTemplateDetail(this.filteredTemplates[idx].name)
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

      const shouldSwapDown = offsetY > this.rowHeight * 0.5 && idx < this.filteredTemplates.length - 1
      const shouldSwapUp = offsetY < -this.rowHeight * 0.5 && idx > 0

      if (shouldSwapDown || shouldSwapUp) {
        const targetIdx = shouldSwapDown ? idx + 1 : idx - 1

        if (targetIdx === this.lastTargetIdx) return
        this.lastTargetIdx = targetIdx
        this.hasSwapped = true

        const globalIdx = this.templateStore.templates.findIndex(t => t.id === this.filteredTemplates[idx].id)
        const targetGlobalIdx = this.templateStore.templates.findIndex(t => t.id === this.filteredTemplates[targetIdx].id)
        if (globalIdx !== -1 && targetGlobalIdx !== -1) {
          const arr = this.templateStore.templates.slice()
          ;[arr[globalIdx], arr[targetGlobalIdx]] = [arr[targetGlobalIdx], arr[globalIdx]]
          this.templateStore.templates = arr
          this.templateStore.save()
          this.filteredTemplates = (this.templateStore.templates || []).filter(t => !t.isAerobic)
        }

        this.dragIdx = targetIdx
        this.smoothUpdatePositions()

        const now = Date.now()
        if (now - this.lastVibrateTime > 150) {
          uni.vibrateShort()
          this.lastVibrateTime = now
        }
      } else {
        const minY = 0
        const maxY = (this.filteredTemplates.length - 1) * this.rowHeight
        const clampedY = Math.max(minY, Math.min(currentY, maxY))
        this.$set(this.itemY, idx, clampedY)
      }
    },
    smoothUpdatePositions() {
      for (let i = 0; i < this.filteredTemplates.length; i++) {
        this.$set(this.itemY, i, i * this.rowHeight)
      }
    },
    onDragEnd() {
      if (!this.isDragTriggered) return

      this.isDragMode = false
      this.dragIdx = -1
      this.lastTargetIdx = -1

      if (this.isDragTriggered) {
        this.initDragState()
        this.templateStore.save()
      }

      this.isDragTriggered = false
      this.hasSwapped = false
    },
    handleDelete(filteredIdx) {
      const filt = this.filteredTemplates
      if (!filt || filteredIdx < 0 || filteredIdx >= filt.length) return
      const tpl = filt[filteredIdx]

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
            this.filteredTemplates = (this.templateStore.templates || []).filter(t => !t.isAerobic)
            this.$nextTick(() => {
              this.initDragState()
            })
            uni.showToast({ title: '删除成功', icon: 'success', duration: 1500 })
          } else {
            this.$set(this.slideOffset, filteredIdx, 0)
            uni.showToast({ title: '已取消删除', icon: 'none', duration: 1500 })
          }
        },
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
    },
    goToTemplateDetail(name) {
      if (this.isDragMode) return
      if (this.isNavigating) return
      this.isNavigating = true
      uni.navigateTo({
        url: `/pages/templateDetail/templateDetail?template=${encodeURIComponent(name)}`,
        complete: () => {
          this.isNavigating = false
        },
      })
    },
  },
  beforeDestroy() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }
}
</script>

<style scoped>
.local-templates-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: transparent;
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
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.mid-scroll {
  position: relative;
  flex: 1;
  overflow-y: auto;
  background-color: transparent;
  padding-bottom: 80px;
}

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

.card-color-bar {
  width: 12rpx;
  flex-shrink: 0;
  align-self: stretch;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
  padding: 28rpx 20rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.card-count {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.card-arrow {
  font-size: 36rpx;
  color: var(--text-placeholder);
  padding: 28rpx 24rpx;
  flex-shrink: 0;
}

.is-dragging .action-card {
  transition: none;
  transform: scale(1.05) !important;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.8);
  border: 1rpx solid var(--border-color);
}

.is-dragging .card-arrow {
  display: none;
}

.empty-state-inside {
  position: absolute;
  top: 200rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: var(--text-muted);
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

.btn-icon {
  font-size: 32rpx;
}

.btn-label {
  font-size: 28rpx;
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

.btn-create-icon {
  font-size: 36rpx;
  font-weight: 400;
}

.btn-create-label {
  font-size: 30rpx;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.popup-panel {
  position: relative;
  width: 100%;
  max-height: 80vh;
  background: var(--bg-primary);
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.slide-up {
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--border-color);
  flex-shrink: 0;
}

.panel-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.close-btn {
  font-size: 40rpx;
  color: var(--text-secondary);
  padding: 8rpx;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24rpx 32rpx;
  padding-bottom: 0;
}

.panel-footer {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx 40rpx;
}

.btn-confirm {
  width: 100%;
  height: 88rpx;
  background: var(--primary);
  border-radius: 44rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(55, 155, 255, 0.3);
}

.btn-confirm:active {
  opacity: 0.8;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  background: var(--bg-tertiary);
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--text-muted);
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-bar-inner {
  display: flex;
  align-items: center;
  height: 64rpx;
  background: var(--bg-tertiary);
  border-radius: 32rpx;
  padding: 0 24rpx;
}

.search-icon {
  font-size: 24rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-icon {
  font-size: 32rpx;
  color: var(--text-muted);
  padding: 8rpx;
}

.category-scroll {
  margin-bottom: 20rpx;
  white-space: nowrap;
  padding-bottom: 8rpx;
}

.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  margin-right: 16rpx;
  background: var(--bg-tertiary);
  border-radius: 24rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.category-tab.active {
  background: var(--primary);
  color: #fff;
}

.category-name {
  font-size: 24rpx;
}

.category-count {
  font-size: 20rpx;
  opacity: 0.7;
}

.action-list {
  max-height: 400rpx;
  margin-bottom: 16rpx;
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: var(--bg-tertiary);
  border-radius: 16rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.action-item.selected {
  background: rgba(55, 155, 255, 0.15);
  border-color: var(--primary);
  color: var(--primary);
}

.action-item:active {
  opacity: 0.7;
}

.action-name {
  font-size: 26rpx;
}

.check-mark {
  font-size: 20rpx;
  color: var(--primary);
}

.no-actions {
  text-align: center;
  padding: 40rpx 0;
  color: var(--text-muted);
  font-size: 26rpx;
}

.selected-count {
  text-align: center;
  padding: 12rpx 0;
  font-size: 24rpx;
  color: var(--text-secondary);
  border-top: 1rpx solid var(--border-color);
  margin-bottom: 16rpx;
}

.color-section {
  margin-bottom: 20rpx;
}

.color-label {
  display: block;
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-bottom: 16rpx;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: calc(20% - 16rpx);
  padding: 8rpx 0;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.color-item.active {
  border-color: var(--primary);
  background: rgba(55, 155, 255, 0.1);
}

.color-circle {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.3);
}

.color-name {
  font-size: 20rpx;
  color: var(--text-secondary);
  text-align: center;
}
</style>
