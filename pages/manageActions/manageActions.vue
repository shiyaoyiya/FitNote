<template>
  <view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <view class="manage-container">
      <!-- <view class="manage-header">
        <text class="manage-back-btn" @click="goBack">‹ 返回</text>
        <text class="manage-title">管理动作</text>
        <text class="manage-hint">长按拖拽排序，左滑删除</text>
      </view> -->

      <scroll-view class="manage-body" :scroll-y="!isDragMode" :scroll-with-animation="false">
        <movable-area class="manage-movable-area" :style="{ height: sortedActions.length * 110 + 55 + 'rpx' }">
          <view v-for="(item, index) in sortedActions" :key="'slot'+index" class="manage-item-slot"
            :style="{ top: index * 110 + 'rpx' }"></view>
          <movable-view v-for="(act, idx) in sortedActions" :key="act" direction="vertical" class="manage-movable-item"
            :y="itemY[idx]" :disabled="!isDragMode" :class="{ 'is-dragging': dragIdx === idx }"
            @touchstart="onSortTouchStart($event, idx)" @touchmove="onSortTouchMove($event, idx)"
            @touchend="onSortTouchEnd($event, idx); isDragMode ? onSortDragEnd() : null"
            @change="onSortDragMove($event, idx)">
            <view class="manage-card-wrapper">
              <view class="manage-delete-bg" :style="{ opacity: (sortSlideX[idx] || 0) < 0 ? 1 : 0 }">
                <text class="manage-delete-btn" @click.stop="handleSortDelete(idx)">删除</text>
              </view>
              <view class="manage-card" :style="{ transform: 'translateX(' + (sortSlideX[idx] || 0) + 'px)' }"
                @touchstart="onSortSlideStart($event, idx)" @touchmove="onSortSlideMove($event, idx)"
                @touchend="onSortSlideEnd(idx)">
                <text class="manage-card-label">{{ act }}</text>
                <text class="manage-drag-icon">≡</text>
              </view>
            </view>
          </movable-view>
        </movable-area>
        <view v-if="sortedActions.length === 0" class="manage-empty">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无动作</text>
          <text class="empty-hint">点击下方"添加动作"按钮添加</text>
        </view>
      </scroll-view>

      <view class="manage-footer">
        <button class="manage-btn-add" @click="openAddPopup">添加动作</button>
        <button class="manage-btn-save" @click="saveManageActions">保存编辑</button>
      </view>
    </view>

    <!-- 添加动作弹窗 -->
    <view v-if="showAddPopup" class="popup-overlay" @click.self="closeAddPopup">
      <view class="overlay-bg" @click="closeAddPopup"></view>
      <view class="modal-panel action-picker-panel fade-in" @click.stop>
        <view class="modal-header action-picker-header">
          <text class="modal-title">选择动作</text>
          <text class="close-icon" @click="closeAddPopup">×</text>
        </view>
        <view class="modal-body action-picker-body">
          <view class="search-bar-container">
            <view class="search-bar-inner">
              <text class="search-icon">🔍</text>
              <input ref="searchInput" v-model="searchKeyword" class="search-bar-input" placeholder="搜索动作名称..."
                @input="filterActions" confirm-type="search" :focus="searchFocus" />
              <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">×</text>
            </view>
          </view>
          <view class="action-grid-inner">
            <view v-for="(act, idx) in filteredActions" :key="idx" class="action-grid-item"
              :class="{ 'action-selected': selectedActionIdx === idx, 'action-already-added': sortedActions.includes(act) }"
              @click="selectAction(idx)">
              <view class="act-name-container">
                <text class="act-name">{{ act }}</text>
              </view>
              <view v-if="selectedActionIdx === idx" class="select-check">✓</view>
            </view>
            <view v-if="filteredActions.length === 0" class="no-data-v2">
              <text class="no-data-icon">🤷‍♂️</text>
              <text class="no-data-text">未找到相关动作</text>
              <text class="no-data-sub">请检查关键词或在首页添加</text>
            </view>
            <view class="list-bottom-guard"></view>
          </view>
          <view class="confirm-add-btn" @click="addSelectedAction">确认添加</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    useActionStore
  } from '@/stores/action.js'

  export default {
    data() {
      return {
        searchKeyword: '',
        filteredActions: [],
        selectedActionIdx: null,
        searchFocus: false,
        showAddPopup: false,
        sortedActions: [],
        itemY: [],
        isDragMode: false,
        dragIdx: -1,
        isDragTriggered: false,
        lastTargetIdx: -1,
        rowHeight: 130,
        sortLongPressTimer: null,
        sortLongPressThreshold: 100,
        sortSlideX: {},
        sortSlideStartX: 0,
        sortSlideStartY: 0,
        sortSlideActive: false,
        actionStore: null,
        daySettingsStore: null,
      }
    },
    onLoad(e) {
      this.daySettingsStore = useDaySettingsStore()
      this.actionStore = useActionStore()
      try {
        const chosen = JSON.parse(decodeURIComponent(e.chosenActions || '[]'))
        this.sortedActions = Array.isArray(chosen) ? [...chosen] : []
      } catch (err) {
        this.sortedActions = []
      }
      this.$nextTick(() => this.initSortPositions())
    },
    methods: {
      goBack() {
        uni.navigateBack()
      },
      filterActions() {
        const kw = this.searchKeyword.trim().toLowerCase()
        const all = this.actionStore ? this.actionStore.actionNames : []
        if (!kw) {
          this.filteredActions = all.slice()
        } else {
          this.filteredActions = all.filter(act =>
            act.toLowerCase().includes(kw)
          )
        }
        this.selectedActionIdx = null
      },
      clearSearch() {
        this.searchKeyword = ''
        this.filterActions()
      },
      selectAction(idx) {
        if (this.sortedActions.includes(this.filteredActions[idx])) {
          uni.showToast({
            title: '动作已在列表中',
            icon: 'none'
          })
          return
        }
        this.selectedActionIdx = idx
      },
      openAddPopup() {
        this.showAddPopup = true
        this.filterActions()
        this.selectedActionIdx = null
        this.searchKeyword = ''
        this.$nextTick(() => {
          this.searchFocus = true
        })
      },
      closeAddPopup() {
        this.showAddPopup = false
        this.searchFocus = false
        this.selectedActionIdx = null
        this.searchKeyword = ''
      },
      addSelectedAction() {
        if (this.selectedActionIdx === null) {
          uni.showToast({
            title: '请选择一个动作',
            icon: 'none'
          })
          return
        }
        const actName = this.filteredActions[this.selectedActionIdx]
        if (this.sortedActions.includes(actName)) {
          uni.showToast({
            title: '动作已在列表中',
            icon: 'none'
          })
          return
        }
        this.sortedActions.push(actName)
        this.$nextTick(() => this.initSortPositions())
        this.closeAddPopup()
        uni.showToast({
          title: `已添加：${actName}`,
          icon: 'success',
          duration: 1000
        })
      },
      initSortPositions() {
        let windowWidth = 375
        try {
          if (typeof wx !== 'undefined' && wx.getWindowInfo) {
            const info = wx.getWindowInfo()
            windowWidth = info.windowWidth || 375
          } else {
            const sys = uni.getSystemInfoSync()
            windowWidth = sys.windowWidth || 375
          }
        } catch (e) {
          windowWidth = 375
        }
        const rh = (windowWidth / 750) * 110
        this.rowHeight = rh
        const newItemY = []
        for (let i = 0; i < this.sortedActions.length; i++) {
          newItemY[i] = Math.round(i * rh)
        }
        this.itemY = newItemY
      },
      onSortTouchStart(e, idx) {
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer)
        this.sortLongPressTimer = setTimeout(() => {
          this.onSortDragTrigger(idx)
        }, this.sortLongPressThreshold)
      },
      onSortTouchMove(e, idx) {
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer)
      },
      onSortTouchEnd(e, idx) {
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer)
      },
      onSortDragTrigger(idx) {
        this.isDragTriggered = true
        this.dragIdx = idx
        this.isDragMode = true
        this.lastTargetIdx = -1
        uni.vibrateShort()
      },
      onSortDragMove(e, idx) {
        if (!this.isDragMode || this.dragIdx !== idx) return
        const currentY = e.detail.y
        const baseY = idx * this.rowHeight
        const offsetY = currentY - baseY
        const shouldSwapDown = offsetY > this.rowHeight * 0.5 && idx < this.sortedActions.length - 1
        const shouldSwapUp = offsetY < -this.rowHeight * 0.5 && idx > 0
        if (shouldSwapDown || shouldSwapUp) {
          const targetIdx = shouldSwapDown ? idx + 1 : idx - 1
          if (targetIdx === this.lastTargetIdx) return
          this.lastTargetIdx = targetIdx
          const list = [...this.sortedActions];
          [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]]
          this.sortedActions = list
          this.dragIdx = targetIdx
          this.smoothSortPositions()
          uni.vibrateShort()
        } else {
          const minY = 0
          const maxY = (this.sortedActions.length - 1) * this.rowHeight
          const clampedY = Math.max(minY, Math.min(currentY, maxY))
          this.$set(this.itemY, idx, clampedY)
        }
      },
      smoothSortPositions() {
        for (let i = 0; i < this.sortedActions.length; i++) {
          this.$set(this.itemY, i, i * this.rowHeight)
        }
      },
      onSortDragEnd() {
        if (!this.isDragTriggered) return
        this.isDragMode = false
        this.dragIdx = -1
        this.lastTargetIdx = -1
        this.initSortPositions()
        this.isDragTriggered = false
      },
      saveManageActions() {
        uni.setStorageSync('_pendingManageActions', JSON.stringify([...this.sortedActions]))
        uni.navigateBack()
      },
      onSortSlideStart(e, idx) {
        this.closeAllSlides(idx)
        this.sortSlideStartX = e.touches[0].pageX
        this.sortSlideStartY = e.touches[0].pageY
        this.sortSlideActive = false
        this.$set(this.sortSlideX, idx, 0)
      },
      closeAllSlides(exceptIdx = -1) {
        const slideKeys = Object.keys(this.sortSlideX)
        slideKeys.forEach(key => {
          const k = Number(key)
          if (k !== exceptIdx && (this.sortSlideX[k] || 0) !== 0) {
            this.$set(this.sortSlideX, k, 0)
          }
        })
      },
      onSortSlideMove(e, idx) {
        const dx = e.touches[0].pageX - this.sortSlideStartX
        const dy = e.touches[0].pageY - this.sortSlideStartY
        if (!this.sortSlideActive) {
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            this.sortSlideActive = true
          } else {
            return
          }
        }
        if (dx < 0) {
          this.$set(this.sortSlideX, idx, Math.max(dx, -70))
        } else {
          this.$set(this.sortSlideX, idx, Math.min(0, (this.sortSlideX[idx] || 0) + dx * 0.3))
        }
      },
      onSortSlideEnd(idx) {
        if (!this.sortSlideActive) return
        if ((this.sortSlideX[idx] || 0) < -35) {
          this.$set(this.sortSlideX, idx, -70)
        } else {
          this.$set(this.sortSlideX, idx, 0)
        }
        this.sortSlideActive = false
      },
      handleSortDelete(idx) {
        const name = this.sortedActions[idx]
        uni.showModal({
          title: '删除动作',
          content: `确定要删除 "${name}" 吗？`,
          success: (res) => {
            if (res.confirm) {
              this.sortedActions.splice(idx, 1)
              this.initSortPositions()
            }
            this.$set(this.sortSlideX, idx, 0)
          },
        })
      },
    },
    beforeUnmount() {
      if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer)
    },
  }
</script>

<style scoped>
  .container {
    --grid-item-bg: #2c2c2e;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: #121212;
    color: #f7f7f7;
  }

  .container.light {
    --grid-item-bg: #ffffff;
    background-color: #f5f5f5;
    color: #333333;
  }

  .manage-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .manage-header {
    padding: 20rpx 30rpx;
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex-wrap: wrap;
    background: var(--bg-secondary);
    border-bottom: 1rpx solid var(--border-color);
    flex-shrink: 0;
  }

  .manage-back-btn {
    font-size: 28rpx;
    color: var(--text-secondary);
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
  }

  .manage-back-btn:active {
    opacity: 0.6;
  }

  .manage-title {
    font-size: 32rpx;
    font-weight: bold;
    color: var(--text-primary);
  }

  .manage-hint {
    font-size: 24rpx;
    color: var(--text-muted);
    margin-left: auto;
  }

  .manage-body {
    flex: 1;
    height: 0;
    background: var(--bg-primary);
  }

  .manage-movable-area {
    width: 100%;
    position: relative;
  }

  .manage-item-slot {
    position: absolute;
    left: 0;
    right: 0;
    height: 110rpx;
    pointer-events: none;
  }

  .manage-movable-item {
    width: 100%;
    height: 66px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
  }

  .manage-movable-item:not(.is-dragging) {
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
  }

  .manage-card-wrapper {
    margin: 0 30rpx;
    width: calc(100% - 60rpx);
    height: 50px;
    position: relative;
  }

  .manage-delete-bg {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 70px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    transition: opacity 0.2s ease;
  }

  .manage-delete-btn {
    background: #ff5a5d;
    color: #fff;
    font-size: 12px;
    padding: 10px 14px;
    border-radius: 8px;
  }

  .manage-card {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    background-color: var(--bg-card);
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24rpx;
    box-shadow: 0 0 5rpx var(--shadow-color);
    transition: transform 0.15s ease;
    box-sizing: border-box;
  }

  .manage-card-label {
    font-size: 28rpx;
    color: var(--text-primary);
  }

  .manage-drag-icon {
    font-size: 32rpx;
    color: var(--text-muted);
  }

  .is-dragging .manage-card {
    transform: scale(1.05);
    box-shadow: 0 10rpx 30rpx var(--shadow-color);
    border: 1px solid var(--border-color);
    z-index: 999;
  }

  .is-dragging {
    z-index: 999 !important;
    transition: none !important;
  }

  .manage-empty {
    padding: 100rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .empty-icon {
    font-size: 60rpx;
    margin-bottom: 20rpx;
  }

  .empty-text {
    font-size: 32rpx;
    color: var(--text-primary);
    font-weight: bold;
    margin-bottom: 12rpx;
  }

  .empty-hint {
    font-size: 26rpx;
    color: var(--text-secondary);
  }

  .manage-footer {
    padding: 30rpx;
    display: flex;
    gap: 20rpx;
    justify-content: center;
    background: var(--bg-secondary);
    border-top: 1rpx solid var(--border-color);
    flex-shrink: 0;
  }

  .manage-btn-add {
    flex: 1;
    height: 90rpx;
    line-height: 90rpx;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 12rpx;
    font-size: 30rpx;
    text-align: center;
    border: 1rpx solid var(--border-color);
  }

  .manage-btn-save {
    flex: 1;
    height: 90rpx;
    line-height: 90rpx;
    background-color: #2ed573;
    color: #fff;
    border-radius: 12rpx;
    font-size: 30rpx;
    text-align: center;
  }

  .popup-overlay {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
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

  .modal-panel {
    position: relative;
    width: 80vw;
    max-height: 70vh;
    background-color: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1001;
  }

  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    position: relative;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
    margin-left: 2vw;
    color: var(--text-primary);
  }

  .close-icon {
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    border-radius: 50%;
    color: var(--text-secondary);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .modal-footer {
    padding: 10px 16px;
    display: flex;
    justify-content: center;
    position: relative;
  }

  .no-border::after,
  .no-border::before {
    display: none !important;
  }

  .action-picker-panel {
    width: 85vw !important;
    max-height: 70vh !important;
    border-radius: 24px !important;
    overflow: hidden;
    box-shadow: 0 15px 35px var(--shadow-color);
  }

  .action-picker-header {
    padding: 16px 20px 0 !important;
  }

  .action-picker-body {
    padding: 0 20px !important;
    position: relative;
  }

  .search-bar-container {
    padding: 15px 0 12px;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .search-bar-inner {
    display: flex;
    align-items: center;
    height: 48px;
    background: var(--bg-input);
    border-radius: 100px;
    padding: 0 16px;
    border: 1rpx solid var(--border-color);
    transition: all 0.2s;
  }

  .search-bar-inner:focus-within {
    border-color: rgba(55, 155, 255, 0.3);
  }

  .search-icon {
    font-size: 16px;
    color: var(--text-secondary);
    margin-right: 10px;
  }

  .search-bar-input {
    flex: 1;
    height: 100%;
    font-size: 15px;
    color: var(--text-primary);
  }

  .clear-icon {
    font-size: 20px;
    color: var(--text-secondary);
    padding: 5px;
  }

  .action-grid-inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding-bottom: 20px;
  }

  .list-bottom-guard {
    height: 8px;
    width: 100%;
    pointer-events: none;
  }

  .action-grid-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(50% - 8px);
    margin-bottom: 12px;
    height: 54px;
    background: var(--grid-item-bg);
    border-radius: 14px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  .act-name-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .action-grid-item:active {
    transform: scale(0.96);
    opacity: 0.8;
  }

  .act-name {
    font-size: 14px;
    color: var(--text-primary);
    text-align: center;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-weight: 500;
  }

  .action-selected {
    background: rgba(55, 155, 255, 0.2) !important;
    border: 2px solid #379bff !important;
  }

  .action-selected .act-name {
    color: #379bff !important;
    font-weight: bold;
  }

  .action-already-added {
    opacity: 0.5;
  }

  .action-already-added .act-name {
    color: var(--text-muted) !important;
  }

  .select-check {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    background: #379bff;
    color: #fff;
    border-radius: 50%;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .no-data-v2 {
    width: 100%;
    padding: 50px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .no-data-icon {
    font-size: 40px;
    margin-bottom: 15px;
  }

  .no-data-text {
    font-size: 16px;
    color: var(--text-primary);
    font-weight: bold;
    margin-bottom: 8px;
  }

  .no-data-sub {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .container.light .confirm-add-btn {
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(200, 200, 200, 0.35);
    box-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.5) inset,
      0 1px 3px rgba(255, 255, 255, 0.4) inset,
      0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .confirm-add-btn {
    position: sticky;
    bottom: 20px;
    z-index: 10;
    width: 100%;
    height: 48px;
    background: rgba(36, 36, 36, 0.6);
    border: 1rpx solid rgba(255, 255, 255, 0.12);
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 400;
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    box-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.08) inset,
      0 1px 3px rgba(255, 255, 255, 0.06) inset,
      0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .confirm-add-btn:active {
    transform: scale(0.97);
    background: var(--bg-tertiary);
  }
</style>