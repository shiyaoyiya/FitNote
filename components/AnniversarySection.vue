<template>
  <view>
    <!-- 纪念日列表 -->
    <view class="anniv-list-container">
      <view v-for="(item, idx) in annivs" :key="idx" class="anniv-item" @click="openEdit(idx)"
        @longpress="onLongPress(idx)">
        <view class="anniv-dot"></view>
        <view class="anniv-content">
          <view class="anniv-title-row">
            <text class="anniv-title-text">{{ item.title }}</text>
            <text class="anniv-days-tag">{{ item.daysText }}</text>
          </view>
          <view class="anniv-sub-text">纪念日 | {{ item.date }}</view>
        </view>
      </view>
      <view class="safe-area-inset"></view>
    </view>

    <!-- 纪念日输入弹窗 -->
    <view v-if="showPopup" class="popup-overlay" @click.self="closePopup">
      <view class="overlay-bg" @click="closePopup"></view>
      <view class="modal-panel fade-in" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingIndex === null ? '新增纪念日' : '编辑纪念日' }}</text>
          <text class="close-icon" @click="closePopup">×</text>
        </view>
        <view class="modal-body">
          <view class="input-row">
            <input v-model="titleInput" placeholder="纪念内容" class="action-input" />
          </view>
          <view class="input-row">
            <input v-model="dateInput" placeholder="日期" type="date" class="action-input" />
          </view>
        </view>
        <view class="modal-footer btn-row">
          <text class="btn-confirm" @click="saveAnniv">保存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  export default {
    name: 'AnniversarySection',
    data() {
      return {
        annivs: [],
        showPopup: false,
        titleInput: '',
        dateInput: '',
        editingIndex: null,
      }
    },
    created() {
      this.load()
      // 监听备份恢复事件，刷新数据
      uni.$on('backup-restored', () => {
        this.load()
      })
    },
    beforeUnmount() {
      uni.$off('backup-restored')
    },
    methods: {
      load() {
        const raw = uni.getStorageSync('annivs') || '[]'
        try {
          this.annivs = JSON.parse(raw)
        } catch (e) {
          this.annivs = []
        }
        this.annivs.forEach((it) => {
          it.daysText = this.calcDays(it.date)
        })
      },
      save() {
        uni.setStorageSync('annivs', JSON.stringify(this.annivs))
      },
      calcDays(dateStr) {
        if (!dateStr) return '0 天'
        let dateText = dateStr.trim()
        if (dateText.includes('年') && dateText.includes('月') && dateText.includes('日')) {
          dateText = dateText.replace('年', '/').replace('月', '/').replace('日', '')
        }
        dateText = dateText.replace(/\./g, '/').replace(/-/g, '/')
        const parsedDate = new Date(dateText)
        if (isNaN(parsedDate.getTime())) return '0 天'
        const today = new Date()
        const diffTime = today.setHours(0, 0, 0, 0) - parsedDate.setHours(0, 0, 0, 0)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return `${diffDays + 1} 天`
      },
      openAdd() {
        this.editingIndex = null
        this.titleInput = ''
        this.dateInput = ''
        this.showPopup = true
      },
      openEdit(idx) {
        this.editingIndex = idx
        const item = this.annivs[idx]
        this.titleInput = item.title
        this.dateInput = item.date
        this.showPopup = true
      },
      closePopup() {
        this.showPopup = false
      },
      saveAnniv() {
        const title = this.titleInput.trim()
        const date = this.dateInput
        if (!title || !date) {
          uni.showToast({ title: '请填写完整信息', icon: 'none' })
          return
        }
        const daysText = this.calcDays(date)
        if (this.editingIndex === null) {
          this.annivs.push({ title, date, daysText })
        } else {
          this.annivs[this.editingIndex] = { title, date, daysText }
        }
        this.save()
        this.showPopup = false
      },
      onLongPress(idx) {
        uni.vibrateShort({ type: 'light' })
        uni.showModal({
          title: '确认删除',
          content: `确定要删除「${this.annivs[idx].title}」吗？`,
          success: (res) => {
            if (res.confirm) {
              this.annivs.splice(idx, 1)
              this.save()
            }
          }
        })
      },
    },
  }
</script>

<style scoped>
  .anniv-list-container {
    padding: 10px 16px;
    padding-bottom: calc(75px + 20px + env(safe-area-inset-bottom, 0px));
  }

  .anniv-item {
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border-radius: 14px;
    margin-bottom: 10px;
    padding: 14px 16px;
    position: relative;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }

  .anniv-item:active {
    background-color: var(--bg-tertiary);
  }

  .anniv-dot {
    width: 8px;
    height: 8px;
    background: #379bff;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .anniv-content {
    flex: 1;
  }

  .anniv-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .anniv-title-text {
    font-size: 15px;
    font-weight: 600;
    color: inherit;
  }

  .anniv-days-tag {
    font-size: 13px;
    color: #379bff;
    font-weight: bold;
  }

  .anniv-sub-text {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .safe-area-inset {
    height: 20px;
  }

  /* 弹窗样式 */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
  }

  .modal-panel {
    position: relative;
    width: 80vw;
    max-width: 320px;
    max-height: 80vh;
    background-color: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1;
    animation: modalFadeIn 0.25s ease;
  }

  .modal-header {
    height: 56px;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 20px;
    color: var(--text-muted);
    background: transparent;
  }

  .close-icon:active {
    background-color: var(--bg-tertiary);
  }

  .modal-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }

  .modal-footer {
    padding: 12px 16px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
  }

  .action-input {
    flex: 1;
    height: 38px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 14px;
    background-color: var(--bg-input);
    color: var(--text-primary);
  }

  .btn-row {
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  .btn-confirm {
    flex: 1;
    height: 44px;
    line-height: 44px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-confirm:active {
    transform: scale(0.95);
    opacity: 0.9;
  }

  .fade-in {
    animation: modalFadeIn 0.25s ease;
  }

  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
