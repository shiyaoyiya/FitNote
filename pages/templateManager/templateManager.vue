<template>
  <view class="container dark">

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
              @touchend="onTouchEnd($event, idx)" @longpress="onDragTrigger(idx)" @tap="goToTemplateDetail(tpl.name)">
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
  import {
    useTemplateStore
  } from '@/stores/template'
  import {
    useActionStore
  } from '@/stores/action'

  const DAYDATA_PREFIX = 'fitness_daydata_'

  export default {
    data() {
      return {
        loading: true,
        rowHeight: 0,
        showList: true,
        _isMounted: false,

        // 拖拽（与 templateDetail.vue 完全一致）
        isDragMode: false,
        isDragTriggered: false,
        hasSwapped: false,
        itemY: [],
        dragIdx: -1,
        lastTargetIdx: -1,
        lastVibrateTime: 0,

        // 侧滑（与 templateDetail.vue 完全一致）
        slideOffset: [],
        startX: 0,
        startY: 0,
        startTime: 0,
        isClick: false,
        isNavigating: false,

        longPressTimer: null,
        longPressThreshold: 500,

        showCreatePanel: false,
        newTemplateName: '',
        searchTerm: '',
        activeCategory: 'all',
        selectedActions: [],
        selectedColor: '#93d5dc',
        presetColors: [{
            name: '清水蓝',
            value: '#93d5dc'
          },
          {
            name: '松石绿',
            value: '#4DB6AC'
          },
          {
            name: '藤萝紫',
            value: '#8076a3'
          },
          {
            name: '姜红',
            value: '#eeb8c3'
          },
          {
            name: '克莱因蓝',
            value: '#002fa7'
          },
          {
            name: '马尔斯绿',
            value: '#01847f'
          },
          {
            name: '申布伦黄',
            value: '#fbd26a'
          },
          {
            name: '提香红',
            value: '#d44848'
          },
          {
            name: '粉红',
            value: '#f2b9b2'
          },
          {
            name: '玛瑙灰',
            value: '#cfccc9'
          },
          {
            name: '汉白玉',
            value: '#f8f4ed'
          },
        ],
      }
    },

    computed: {
      templateStore() {
        return useTemplateStore()
      },
      actionStore() {
        return useActionStore()
      },
      templates() {
        return this.templateStore.templates
      },
      filteredTemplates() {
        return (this.templates || []).filter(t => !t.isAerobic)
      },
      categories() {
        return [{
            id: 'all',
            name: '全部'
          },
          ...this.actionStore.categories,
        ]
      },
      categoryCounts() {
        const counts = {
          all: this.actionStore.actions.length
        }
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

    onShow() {
      this.loadData()
    },

    onHide() {
      uni.removeStorageSync('temp_template_actions_backup')
    },

    onUnload() {
      this._isMounted = false
      uni.removeStorageSync('temp_template_actions_backup')
      this.isDragMode = false
      this.isNavigating = false
    },

    mounted() {
      this._isMounted = true
      const sys = uni.getSystemInfoSync()
      this.rowHeight = (sys.windowWidth / 750) * 180
      this.$nextTick(() => {
        setTimeout(() => this.initPositions(), 100)
      })
    },

    watch: {
      filteredTemplates: {
        handler() {
          if (this._isMounted && this.filteredTemplates.length > 0) {
            setTimeout(() => this.initPositions(), 100)
          }
        },
      },
    },

    methods: {
      loadData() {
        this.loading = true
        this.actionStore.load()
        this.templateStore.load()
        this.slideOffset = []
        this.$nextTick(() => {
          this.loading = false
        })
      },

      // ========== 位置初始化（与 templateDetail.vue 一致） ==========

      initPositions() {
        if (!this._isMounted || this.filteredTemplates.length === 0) return

        const newItemY = []
        for (let i = 0; i < this.filteredTemplates.length; i++) {
          const exactY = i * this.rowHeight
          newItemY[i] = Math.round(exactY)
        }

        this.itemY = newItemY

        if (this.slideOffset.length !== this.filteredTemplates.length) {
          this.slideOffset = new Array(this.filteredTemplates.length).fill(0)
        }
      },

      // ========== 侧滑删除（与 templateDetail.vue 一致） ==========

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

      // ========== 拖拽排序（与 templateDetail.vue 完全一致） ==========

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
          const targetGlobalIdx = this.templateStore.templates.findIndex(t => t.id === this.filteredTemplates[targetIdx]
            .id)
          if (globalIdx !== -1 && targetGlobalIdx !== -1) {
            const arr = this.templateStore.templates.slice();
            [arr[globalIdx], arr[targetGlobalIdx]] = [arr[targetGlobalIdx], arr[globalIdx]]
            this.templateStore.templates = arr
            this.templateStore.save()
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
          this.initPositions()
          this.templateStore.save()
        }

        this.isDragTriggered = false
        this.hasSwapped = false
      },

      // ========== 删除 ==========

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
              this.$nextTick(() => {
                this.initPositions()
                this.slideOffset = new Array(this.filteredTemplates.length).fill(0)
              })
              uni.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 1500
              })
            } else {
              this.$set(this.slideOffset, filteredIdx, 0)
              uni.showToast({
                title: '已取消删除',
                icon: 'none',
                duration: 1500
              })
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

      // ========== 新建模板 ==========

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
          uni.showToast({
            title: '请输入模板名称',
            icon: 'none'
          })
          return
        }
        if (this.templateStore.templates.some(t => t.name === name)) {
          uni.showToast({
            title: '已存在同名模板',
            icon: 'none'
          })
          return
        }

        this.templateStore.addTemplate(name)
        const tpl = this.templateStore.templates.find(t => t.name === name)
        if (tpl) {
          tpl.actions = [...this.selectedActions]
          tpl.color = this.selectedColor
          this.templateStore.save()
        }

        uni.showToast({
          title: '模板创建成功',
          icon: 'success'
        })
        this.closeCreatePanel()
      },
    },
  }
</script>

<style scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #121212;
    color: #f7f7f7;
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
    border: 4rpx solid #333;
    border-top-color: #379bff;
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
    color: #999;
  }

  /* 拖拽容器（与 templateDetail.vue 一致） */
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
    /* background: rgba(55, 155, 255, 0.06);
    border-radius: 16rpx;
    border: 2rpx dashed rgba(55, 155, 255, 0.18); */
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

  /* 侧滑容器（与 templateDetail.vue 一致） */
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
    background-color: #ff5a5d;
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
    background: #1e1e1e;
    border-radius: 16rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.3);
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
    color: #f7f7f7;
  }

  .card-count {
    font-size: 24rpx;
    color: #999;
  }

  .card-arrow {
    font-size: 36rpx;
    color: #555;
    padding: 28rpx 24rpx;
    flex-shrink: 0;
  }

  /* 拖拽高亮（与 templateDetail.vue 一致） */
  .is-dragging .action-card {
    transition: none;
    transform: scale(1.05) !important;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.8);
    border: 1rpx solid #555;
  }

  .is-dragging .card-arrow {
    display: none;
  }

  /* 空状态 */
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
    color: #666;
  }

  /* 底部新建按钮 */
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20rpx 30rpx 40rpx;
    background: linear-gradient(transparent, #121212 40rpx);
    z-index: 10;
  }

  .btn-create {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    height: 88rpx;
    background: #379bff;
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

  /* 弹窗样式 */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
  }

  .popup-panel {
    position: relative;
    width: 100%;
    max-height: 85vh;
    background: #1c1c1e;
    border-radius: 32rpx 32rpx 0 0;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
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
    border-bottom: 1rpx solid #333;
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #f7f7f7;
  }

  .close-btn {
    font-size: 40rpx;
    color: #999;
    padding: 8rpx;
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 24rpx 32rpx;
    padding-bottom: 0;
  }

  .panel-footer {
    padding: 20rpx 32rpx 40rpx;
    flex-shrink: 0;
  }

  .btn-confirm {
    width: 100%;
    height: 88rpx;
    background: #379bff;
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
    color: #ccc;
    margin-bottom: 12rpx;
  }

  .form-input {
    width: 100%;
    height: 72rpx;
    background: #2c2c2e;
    border-radius: 16rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: #f7f7f7;
    box-sizing: border-box;
  }

  .form-input::placeholder {
    color: #666;
  }

  .search-bar {
    margin-bottom: 20rpx;
  }

  .search-bar-inner {
    display: flex;
    align-items: center;
    height: 64rpx;
    background: #2c2c2e;
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
    color: #f7f7f7;
  }

  .search-input::placeholder {
    color: #666;
  }

  .clear-icon {
    font-size: 32rpx;
    color: #666;
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
    background: #2c2c2e;
    border-radius: 24rpx;
    font-size: 24rpx;
    color: #999;
  }

  .category-tab.active {
    background: #379bff;
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
    background: #2c2c2e;
    border-radius: 16rpx;
    font-size: 26rpx;
    color: #f7f7f7;
    border: 2rpx solid transparent;
    transition: all 0.2s;
  }

  .action-item.selected {
    background: #1a3a5c;
    border-color: #379bff;
    color: #379bff;
  }

  .action-item:active {
    opacity: 0.7;
  }

  .action-name {
    font-size: 26rpx;
  }

  .check-mark {
    font-size: 20rpx;
    color: #379bff;
  }

  .no-actions {
    text-align: center;
    padding: 40rpx 0;
    color: #666;
    font-size: 26rpx;
  }

  .selected-count {
    text-align: center;
    padding: 12rpx 0;
    font-size: 24rpx;
    color: #999;
    border-top: 1rpx solid #333;
    margin-bottom: 16rpx;
  }

  .color-section {
    margin-bottom: 20rpx;
  }

  .color-label {
    display: block;
    font-size: 28rpx;
    color: #ccc;
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
    border-color: #379bff;
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
    color: #999;
    text-align: center;
  }
</style>