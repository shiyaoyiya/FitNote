<template>
  <view v-if="visible" class="bp-overlay">
    <view class="bp-bg" @click="close"></view>
    <view class="bp-panel fade-in" @click.stop>
      <view class="bp-header">
        <text class="bp-title">身体数据</text>
        <text class="bp-close" @click="close">×</text>
      </view>
      <view class="bp-body">
        <view class="bp-row">
          <text class="bp-label">性别</text>
          <view class="bp-gender">
            <text :class="['bp-chip', form.gender==='male' && 'on']" @click="form.gender='male'">男</text>
            <text :class="['bp-chip', form.gender==='female' && 'on']" @click="form.gender='female'">女</text>
          </view>
        </view>
        <picker mode="date" fields="month" :value="form.birthDate" :end="maxBirthDate" @change="onBirthChange">
          <view class="bp-row">
            <text class="bp-label">出生年月</text>
            <view class="bp-value-wrap">
              <text class="bp-value" :class="{ ph: !form.birthDate }">{{ form.birthDate || '请选择' }}</text>
              <text class="bp-arrow">›</text>
            </view>
          </view>
        </picker>
        <view class="bp-row">
          <text class="bp-label">身高(cm)</text>
          <view class="bp-input-wrap">
            <input class="bp-input" type="digit" v-model="form.height" placeholder="100-250" />
          </view>
        </view>
        <view class="bp-row">
          <text class="bp-label">体重(kg)</text>
          <view class="bp-input-wrap">
            <input class="bp-input" type="digit" v-model="form.weight" placeholder="20-300" />
          </view>
        </view>
        <view class="bp-hint" v-if="hint">{{ hint }}</view>
        <view class="bp-actions">
          <text class="bp-cancel" @click="close">取消</text>
          <text class="bp-save" @click="save">保存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserProfileStore } from '@/stores/userProfile.js'
export default {
  props: { visible: Boolean },
  emits: ['close'],
  data() {
    const s = useUserProfileStore()
    const now = new Date()
    return {
      store: s,
      // form 在 data 固化时 store 可能尚未 load，真实数值由 watch visible 打开时 sync
      form: { gender: s.gender || 'male', birthDate: s.birthDate || '', height: s.height || '', weight: s.weight || '' },
      hint: '',
      maxBirthDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    }
  },
  watch: {
    visible(v) { if (v) this.syncFromStore() }
  },
  methods: {
    syncFromStore() {
      const s = this.store
      this.form = {
        gender: s.gender || 'male',
        birthDate: s.birthDate || '',
        height: s.height || '',
        weight: s.weight || '',
      }
      this.hint = ''
    },
    onBirthChange(e) { this.form.birthDate = e.detail.value },
    close() { this.$emit('close') },
    save() {
      this.hint = ''
      try {
        this.store.updateProfile({
          gender: this.form.gender,
          birthDate: this.form.birthDate,
          height: Number(this.form.height),
          weight: Number(this.form.weight),
        })
        this.$emit('close')
      } catch (e) {
        this.hint = e.message
      }
    },
  },
}
</script>

<style scoped>
.bp-overlay {
  position: fixed;
  top: 0; bottom: 0; left: 0; right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.bp-bg {
  position: absolute;
  top: 0; bottom: 0; left: 0; right: 0;
  background-color: rgba(0, 0, 0, 0.3);
}
.bp-panel {
  position: relative;
  width: 80vw;
  background: var(--glass-bg, rgba(255,255,255,0.7));
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1rpx solid var(--glass-border, rgba(200,210,230,0.6));
  border-radius: 16px;
  overflow: hidden;
  z-index: 1001;
  margin-top: -44px;
  box-shadow: var(--glass-float, 0 8px 24px rgba(0,0,0,0.06)),
    0 0 0 0.5px var(--glass-edge, rgba(255,255,255,0.65)) inset;
}
.fade-in { animation: bpFadeIn 0.2s ease-out; }
@keyframes bpFadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.bp-header {
  position: relative;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bp-header::after {
  content: '';
  position: absolute;
  left: 50%; bottom: 0;
  transform: translateX(-50%);
  width: 72vw; height: 1px;
  background-color: var(--divider-color);
}
.bp-title { font-size: 16px; font-weight: bold; color: var(--text-primary); }
.bp-close {
  width: 40px; height: 40px;
  display: flex; justify-content: center; align-items: center;
  font-size: 20px; border-radius: 50%;
  color: var(--text-secondary);
}
.bp-body { padding: 12px 16px; }
.bp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 4px;
}
.bp-label { font-size: 15px; color: var(--text-primary); }
.bp-gender { display: flex; gap: 8px; }
.bp-chip {
  padding: 6px 16px;
  border-radius: 16px;
  border: 1rpx solid var(--border-color);
  font-size: 13px;
  color: var(--text-primary);
}
.bp-chip.on { background: #ef4444; color: #fff; border-color: #ef4444; }
.bp-value-wrap { display: flex; align-items: center; gap: 6px; }
.bp-value { font-size: 15px; color: var(--text-primary); }
.bp-value.ph { color: var(--text-secondary); }
.bp-arrow { font-size: 18px; color: var(--text-secondary); }
.bp-input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 0 12px;
  border: 1rpx solid var(--border-color);
}
.bp-input { width: 120px; height: 40px; font-size: 15px; color: var(--text-primary); text-align: center; }
.bp-hint { color: #ef4444; font-size: 12px; margin-top: 6px; padding: 0 4px; }
.bp-actions { display: flex; justify-content: flex-end; gap: 20px; margin-top: 16px; padding: 0 4px; }
.bp-cancel { color: var(--text-secondary); font-size: 15px; }
.bp-save { color: #ef4444; font-size: 15px; font-weight: 600; }

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .bp-panel {
    background: rgba(31,41,55,0.85);
    border-color: rgba(75,85,99,0.6);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3),
      0 0 0 0.5px rgba(255,255,255,0.08) inset;
  }
  .bp-chip {
    border-color: rgba(75,85,99,0.8);
  }
  .bp-input-wrap {
    background: rgba(55,65,81,0.6);
    border-color: rgba(75,85,99,0.6);
  }
}
</style>
