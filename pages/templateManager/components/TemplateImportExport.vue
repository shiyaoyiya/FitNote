<template>
  <view v-if="visible" class="popup-overlay" @click.self="handleClose">
    <view class="overlay-bg" @click="handleClose"></view>
    <view class="popup-panel import-export-panel slide-up" @click.stop>
      <view class="panel-header">
        <text class="panel-title">导入/导出模板</text>
        <text class="close-btn" @click="handleClose">×</text>
      </view>

      <view class="tab-bar">
        <view class="tab-item" :class="{ active: activeTab === 'export' }" @click="activeTab = 'export'">
          <text>导出</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'import' }" @click="activeTab = 'import'">
          <text>导入</text>
        </view>
      </view>

      <view class="panel-body" v-if="activeTab === 'export'">
        <view class="select-all-row">
          <view class="select-all-btn" @click="toggleSelectAll">
            <text v-if="selectedTemplates.length === templates.length">✓ 取消全选</text>
            <text v-else>☐ 全选</text>
          </view>
        </view>
        <scroll-view class="template-list" scroll-y="true">
          <view v-for="(tpl, idx) in templates" :key="tpl.id" class="template-checkbox-item"
            @click="toggleTemplateSelect(tpl)">
            <view class="checkbox-box" :class="{ checked: isTemplateSelected(tpl) }">
              <text v-if="isTemplateSelected(tpl)" class="checkbox-check">✓</text>
            </view>
            <view class="template-info">
              <text class="template-name">{{ tpl.name }}</text>
              <text class="template-count">{{ tpl.actions ? tpl.actions.length : 0 }}个动作</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="panel-body" v-else>
        <view class="paste-btn-row">
          <view class="paste-btn" @click="pasteFromClipboard">
            <text>📋 粘贴</text>
          </view>
        </view>
        <textarea v-model="importText" class="import-textarea" placeholder="在此粘贴模板数据，格式：模板名：动作名×组数" @input="onImportTextInput"></textarea>
        <view v-if="parsedTemplates.length > 0" class="parse-result">
          <text class="parse-success">✓ 识别到 {{ parsedTemplates.length }} 个模板</text>
        </view>
      </view>

      <view class="panel-footer">
        <view class="btn-cancel-popup" @click="handleClose">取消</view>
        <view class="btn-confirm-popup" @click="handleConfirm" :class="{ disabled: !canConfirm }">
          <text>{{ activeTab === 'export' ? '确认导出' : '确认导入' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TemplateImportExport',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    templates: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      activeTab: 'export',
      selectedTemplates: [],
      importText: '',
      parsedTemplates: []
    }
  },
  computed: {
    canConfirm() {
      if (this.activeTab === 'export') {
        return this.selectedTemplates.length > 0
      } else {
        return this.parsedTemplates.length > 0
      }
    }
  },
  methods: {
    handleClose() {
      this.resetForm()
      this.$emit('close')
    },
    handleConfirm() {
      if (this.activeTab === 'export') {
        this.exportTemplates()
      } else {
        this.importTemplates()
      }
    },
    toggleSelectAll() {
      if (this.selectedTemplates.length === this.templates.length) {
        this.selectedTemplates = []
      } else {
        this.selectedTemplates = [...this.templates]
      }
    },
    isTemplateSelected(tpl) {
      return this.selectedTemplates.some(t => t.id === tpl.id)
    },
    toggleTemplateSelect(tpl) {
      const idx = this.selectedTemplates.findIndex(t => t.id === tpl.id)
      if (idx === -1) {
        this.selectedTemplates = [...this.selectedTemplates, tpl]
      } else {
        this.selectedTemplates = this.selectedTemplates.filter((_, i) => i !== idx)
      }
    },
    exportTemplates() {
      if (this.selectedTemplates.length === 0) {
        uni.showToast({ title: '请选择要导出的模板', icon: 'none' })
        return
      }
      let text = ''
      this.selectedTemplates.forEach((tpl, idx) => {
        if (idx > 0) text += '\n\n'
        text += `${tpl.name}：\n`
        if (tpl.actions && tpl.actions.length > 0) {
          tpl.actions.forEach(act => {
            const trimmedAct = act.trim()
            const sets = (tpl.actionSets && tpl.actionSets[trimmedAct]) || 4
            text += `${trimmedAct}×${sets}\n`
          })
        }
      })
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
          this.handleClose()
        }
      })
    },
    pasteFromClipboard() {
      uni.getClipboardData({
        success: (res) => {
          if (res && res.data) {
            this.importText = res.data
            this.parsedTemplates = this.parseTemplateText(res.data)
            if (this.parsedTemplates.length === 0) {
              uni.showToast({ title: '未能识别到模板数据', icon: 'none' })
            }
          } else {
            uni.showToast({ title: '剪贴板为空', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '获取剪贴板失败', icon: 'none' })
        }
      })
    },
    parseTemplateText(text) {
      const templates = []
      if (!text || !text.trim()) return templates

      const blocks = text.split(/\n\s*\n/)
      for (const block of blocks) {
        const lines = block.trim().split('\n')
        if (lines.length === 0) continue

        const nameMatch = lines[0].match(/^(.+)[：:]\s*$/)
        if (!nameMatch) continue

        const name = nameMatch[1].trim()
        const actions = []
        const actionSets = {}

        for (let i = 1; i < lines.length; i++) {
          const actionLine = lines[i].trim()
          if (!actionLine) continue

          const actionMatch = actionLine.match(/^(.+)[×xX](\d+)$/)
          if (actionMatch) {
            actions.push(actionMatch[1].trim())
            actionSets[actionMatch[1].trim()] = parseInt(actionMatch[2], 10)
          } else if (actionLine) {
            actions.push(actionLine)
          }
        }

        if (name && actions.length > 0) {
          templates.push({ name, actions, actionSets })
        }
      }
      return templates
    },
    onImportTextInput() {
      this.parsedTemplates = this.parseTemplateText(this.importText)
    },
    importTemplates() {
      this.$emit('import', this.parsedTemplates)
      this.handleClose()
    },
    resetForm() {
      this.activeTab = 'export'
      this.selectedTemplates = []
      this.importText = ''
      this.parsedTemplates = []
    }
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

.tab-bar {
  display: flex;
  border-bottom: 1rpx solid var(--border-color);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: var(--text-secondary);
  border-bottom: 3rpx solid transparent;
}

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24rpx 32rpx;
  padding-bottom: 0;
}

.select-all-row {
  padding: 10rpx 0;
}

.select-all-btn {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 16rpx;
  background: var(--bg-tertiary);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: var(--text-primary);
}

.template-list {
  max-height: 500rpx;
}

.template-checkbox-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.checkbox-box {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid var(--text-muted);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-box.checked {
  background: var(--primary);
  border-color: var(--primary);
}

.checkbox-check {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.template-name {
  font-size: 28rpx;
  color: var(--text-primary);
}

.template-count {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.paste-btn-row {
  margin-bottom: 16rpx;
}

.paste-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: var(--primary);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #fff;
}

.import-textarea {
  width: 100%;
  height: 300rpx;
  background: var(--bg-tertiary);
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

.parse-result {
  margin-top: 16rpx;
  padding: 12rpx;
  background: rgba(55, 155, 255, 0.1);
  border-radius: 8rpx;
}

.parse-success {
  color: var(--primary);
  font-size: 24rpx;
}

.panel-footer {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx 40rpx;
}

.btn-cancel-popup {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 40rpx;
  color: var(--text-primary);
  font-size: 28rpx;
}

.btn-confirm-popup {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.btn-confirm-popup.disabled {
  opacity: 0.5;
}
</style>
