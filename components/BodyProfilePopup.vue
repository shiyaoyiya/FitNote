<template>
  <view v-if="visible" class="bp-mask" @click="close">
    <view class="bp-card" @click.stop>
      <view class="bp-title">身体数据</view>
      <view class="bp-row">
        <text class="bp-label">性别</text>
        <view class="bp-gender">
          <text :class="['bp-chip', form.gender==='male' && 'on']" @click="form.gender='male'">男</text>
          <text :class="['bp-chip', form.gender==='female' && 'on']" @click="form.gender='female'">女</text>
        </view>
      </view>
      <view class="bp-row">
        <text class="bp-label">年龄</text>
        <input class="bp-input" type="number" v-model="form.age" placeholder="5-100" />
      </view>
      <view class="bp-row">
        <text class="bp-label">身高(cm)</text>
        <input class="bp-input" type="digit" v-model="form.height" placeholder="100-250" />
      </view>
      <view class="bp-row">
        <text class="bp-label">体重(kg)</text>
        <input class="bp-input" type="digit" v-model="form.weight" placeholder="20-300" />
      </view>
      <view class="bp-hint" v-if="hint">{{ hint }}</view>
      <view class="bp-actions">
        <text class="bp-cancel" @click="close">取消</text>
        <text class="bp-save" @click="save">保存</text>
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
    return {
      store: s,
      form: { gender: s.gender || 'male', age: s.age || '', height: s.height || '', weight: s.weight || '' },
      hint: '',
    }
  },
  methods: {
    close() { this.$emit('close') },
    save() {
      this.hint = ''
      try {
        this.store.updateProfile({
          gender: this.form.gender,
          age: Number(this.form.age),
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
.bp-mask{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999}
.bp-card{width:80%;background:#fff;border-radius:16px;padding:20px}
.bp-title{font-size:16px;font-weight:600;margin-bottom:12px}
.bp-row{display:flex;align-items:center;justify-content:space-between;margin:10px 0}
.bp-label{font-size:14px;color:#333}
.bp-input{width:120px;border:1px solid #ddd;border-radius:8px;padding:6px 8px;font-size:14px}
.bp-gender{display:flex;gap:8px}
.bp-chip{padding:6px 14px;border-radius:14px;border:1px solid #ddd;font-size:13px}
.bp-chip.on{background:#ef4444;color:#fff;border-color:#ef4444}
.bp-hint{color:#ef4444;font-size:12px;margin-top:6px}
.bp-actions{display:flex;justify-content:flex-end;gap:16px;margin-top:16px}
.bp-cancel{color:#888;font-size:14px}
.bp-save{color:#ef4444;font-size:14px;font-weight:600}
</style>
