<template>
  <view v-if="visible" class="qw-overlay">
    <view class="qw-bg" @click="close"></view>
    <view class="qw-panel" @click.stop>
      <view class="qw-header">
        <text class="qw-title">快速记录体重</text>
        <text class="qw-close" @click="close">×</text>
      </view>
      <view class="qw-body">
        <view class="qw-current" v-if="currentWeight != null">
          <text class="qw-current-label">当前体重</text>
          <text class="qw-current-value">{{ fmt(currentWeight) }} kg</text>
        </view>
        <view class="qw-input-wrap">
          <input class="qw-input" type="digit" v-model="inputWeight" placeholder="输入今日体重 (kg)"
            :focus="true" maxlength="5" @confirm="save" />
          <text class="qw-unit">kg</text>
        </view>
        <text v-if="hint" class="qw-hint">{{ hint }}</text>
        <view class="qw-actions">
          <text class="qw-cancel" @click="close">取消</text>
          <text class="qw-save" @click="save">保存</text>
        </view>
        <text class="qw-full-link" @click="openFullPage">进入完整页面 ›</text>
      </view>
    </view>
  </view>
</template>

<script>
  import { useUserProfileStore } from '@/stores/userProfile.js'

  export default {
    name: 'QuickWeightPopup',
    props: {
      visible: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['close', 'open-full'],
    data() {
      return {
        store: null,
        inputWeight: '',
        hint: '',
      }
    },
    computed: {
      currentWeight() {
        return this.store ? this.store.weight : null
      },
    },
    watch: {
      visible(v) {
        if (v) {
          if (!this.store) this.store = useUserProfileStore()
          this.store.load()
          this.inputWeight = this.store.weight != null ? String(this.store.weight) : ''
          this.hint = ''
        }
      },
    },
    methods: {
      fmt(v) {
        const n = Math.round(Number(v) * 100) / 100
        return String(n)
      },
      save() {
        const v = Number(this.inputWeight)
        if (this.inputWeight === '' || Number.isNaN(v)) {
          this.hint = '请输入体重'
          return
        }
        try {
          this.store.updateProfile({ weight: v })
          uni.showToast({ title: '体重已更新', icon: 'success' })
          this.close()
        } catch (e) {
          this.hint = e.message || '保存失败'
        }
      },
      openFullPage() {
        this.$emit('open-full')
      },
      close() {
        this.$emit('close')
      },
    },
  }
</script>

<style scoped>
  .qw-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9990;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .qw-bg {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.5);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }

  .qw-panel {
    position: relative;
    width: 80vw;
    max-width: 340px;
    background: var(--bg-secondary);
    border-radius: 18px;
    overflow: hidden;
    z-index: 1;
    animation: qwPop 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
  }

  @keyframes qwPop {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .qw-header {
    position: relative;
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .qw-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: calc(100% - 32px);
    height: 1px;
    background-color: var(--border-color);
  }

  .qw-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .qw-close {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    border-radius: 50%;
    color: var(--text-secondary);
  }

  .qw-close:active {
    background: var(--bg-tertiary);
  }

  .qw-body {
    padding: 16px 16px 12px;
  }

  .qw-current {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--bg-tertiary);
  }

  .qw-current-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .qw-current-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .qw-input-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0 14px;
  }

  .qw-input {
    flex: 1;
    height: 48px;
    font-size: 17px;
    color: var(--text-primary);
  }

  .qw-unit {
    font-size: 13px;
    color: var(--text-muted);
    margin-left: 8px;
  }

  .qw-hint {
    display: block;
    font-size: 12px;
    color: var(--danger);
    margin-top: 8px;
  }

  .qw-actions {
    display: flex;
    justify-content: flex-end;
    gap: 24px;
    margin-top: 16px;
  }

  .qw-cancel {
    font-size: 15px;
    color: var(--text-secondary);
  }

  .qw-save {
    font-size: 15px;
    font-weight: 600;
    color: #379bff;
  }

  .qw-full-link {
    display: block;
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 16px;
    padding: 6px 0 2px;
  }

  .qw-full-link:active {
    color: #379bff;
  }

  /* ===== 液态玻璃适配（开启液态玻璃时生效） ===== */
  .container.liquid-glass .qw-panel {
    background: var(--glass-bg) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
    box-shadow:
      0 0 0 0.5px var(--glass-edge) inset,
      0 1px 3px var(--glass-shadow-inner) inset,
      0 12px 36px var(--glass-shadow-outer) !important;
  }

  .container.liquid-glass .qw-current,
  .container.liquid-glass .qw-input-wrap {
    background: var(--glass-btn-bg) !important;
    border-color: var(--glass-border);
  }

  .container.liquid-glass .qw-save {
    color: var(--focus-glow, #0a84ff);
  }
</style>
