<template>
  <view v-if="visible" class="popup-overlay" @click.self="handleClose">
    <view class="overlay-bg" @click="handleClose"></view>
    <view class="popup-panel slide-up" @click.stop>
      <view class="panel-header">
        <text class="panel-title">新建模板</text>
        <text class="close-btn" @click="handleClose">×</text>
      </view>

      <view class="panel-body">
        <view class="form-group">
          <text class="form-label">模板名称</text>
          <input v-model="templateName" placeholder="输入模板名称" class="form-input" maxlength="20" />
        </view>

        <view class="search-bar">
          <view class="search-bar-inner">
            <text class="search-icon">🔍</text>
            <input v-model="searchTerm" placeholder="搜索动作名称..." class="search-input" confirm-type="search" @confirm="onSearchConfirm" />
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
          <view v-if="isLoading" class="loading-state">
            <text>加载动作中...</text>
          </view>
          <view v-else-if="filteredActions.length === 0" class="no-actions">
            <text>未找到匹配的动作</text>
          </view>
          <view v-else class="action-grid">
            <view v-for="act in filteredActions" :key="act.id" class="action-item"
              :class="{ selected: isActionSelected(act.name) }" @click="toggleAction(act.name)">
              <text class="action-name">{{ act.name }}</text>
              <text v-if="isActionSelected(act.name)" class="check-mark">✓</text>
            </view>
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
        <button class="btn-confirm" @click="handleConfirm">确认创建</button>
      </view>
    </view>
  </view>
</template>

<script>
import { useActionStore } from '@/stores/action'
import { useTemplateStore } from '@/stores/template'
import { PRESET_COLORS } from '@/utils/color.js'

export default {
  name: 'TemplateCreate',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      templateName: '',
      searchTerm: '',
      activeCategory: 'all',
      selectedActions: [],
      selectedColor: '',
      presetColors: PRESET_COLORS,
      isLoading: true
    }
  },
  computed: {
    actionStore() {
      return useActionStore()
    },
    templateStore() {
      return useTemplateStore()
    },
    categories() {
      return [{ id: 'all', name: '全部' }, ...this.actionStore.categories]
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
    }
  },
  methods: {
    handleClose() {
      this.resetForm()
      this.$emit('close')
    },
    handleConfirm() {
      const name = this.templateName.trim()
      if (!name) {
        uni.showToast({ title: '请输入模板名称', icon: 'none' })
        return
      }
      if (this.templateStore.templates.some(t => t.name === name)) {
        uni.showToast({ title: '已存在同名模板', icon: 'none' })
        return
      }
      this.$emit('confirm', {
        name,
        actions: [...this.selectedActions],
        color: this.selectedColor
      })
      this.resetForm()
    },
    isActionSelected(name) {
      return this.selectedActions.includes(name)
    },
    toggleAction(name) {
      const idx = this.selectedActions.indexOf(name)
      if (idx === -1) {
        this.selectedActions.push(name)
      } else {
        this.selectedActions.splice(idx, 1)
      }
    },
    onSearchConfirm() {
      // 键盘搜索确认后收起键盘
      uni.hideKeyboard()
    },
    resetForm() {
      this.templateName = ''
      this.searchTerm = ''
      this.activeCategory = 'all'
      this.selectedActions = []
      this.selectedColor = this.presetColors[0]?.value || '#93d5dc'
    },
    initDefaultColor() {
      this.selectedColor = this.presetColors[0]?.value || '#93d5dc'
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.initDefaultColor()
        this.isLoading = true
        setTimeout(() => {
          this.isLoading = false
        }, 300)
      }
    }
  },
  mounted() {
    this.initDefaultColor()
  }
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.5);
}

.overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: transparent;
}

.popup-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.slide-up {
  animation: slideUp 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
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

.loading-state {
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
</style>
