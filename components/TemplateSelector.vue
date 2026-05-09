<template>
  <view>
    <!-- 选择模板弹窗 -->
    <view v-if="mode === 'template'" class="popup-overlay" @click.self="$emit('close')">
      <view class="overlay-bg" @click="$emit('close')"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">请选择模板</text>
          <view class="btn-aerobic" @click="mode = 'aerobic'">
            <text>有氧</text>
          </view>
          <view class="btn-rest" @click="mode = 'rest'">
            <text>休息日</text>
          </view>
          <text class="close-icon" @click="$emit('close')">×</text>
        </view>
        <view class="modal-body">
          <scroll-view class="tpl-select-list" scroll-y="true" show-scrollbar="false">
            <view v-for="tpl in templates.filter(t => !t.isAerobic)" :key="tpl.name" class="tpl-item"
              :style="{ backgroundColor: tpl.color }" @click="$emit('select-template', tpl.name)">
              <text :style="{ color: getContrastColor(tpl.color) }">{{ tpl.name }}</text>
            </view>
            <view v-if="templates.length === 0" class="no-data">
              <text>暂无可用模板</text>
              <view class="preset-pack-btn" @click="showPresetPacks">
                <text class="preset-pack-text">导入推荐模板包</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 有氧弹窗 -->
    <view v-if="mode === 'aerobic'" class="popup-overlay" @click.self="mode = 'template'">
      <view class="overlay-bg" @click="mode = 'template'"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">添加有氧</text>
          <text class="close-icon" @click="mode = 'template'">×</text>
        </view>
        <view class="modal-body">
          <view class="input-row1">
            <input v-model="aerobicName" placeholder="有氧名称" class="action-input" />
          </view>
          <view class="input-row">
            <input v-model.number="aerobicTime" type="number" placeholder="时长（分钟）" class="action-input"
              @input="validateAerobicTime" />
          </view>
          <view class="divider"></view>
          <view v-if="aerobicHistory.length > 0" class="aerobic-history">
            <text class="subtitle">历史有氧</text>
            <view class="tag-container">
              <text v-for="(a, i) in aerobicHistory" :key="i" class="reason-tag" @click="aerobicName = a">
                {{ a }}
              </text>
            </view>
          </view>
        </view>
        <view class="modal-footer btn-row">
          <button @click="saveAerobic">完成</button>
        </view>
      </view>
    </view>

    <!-- 休息日弹窗 -->
    <view v-if="mode === 'rest'" class="popup-overlay" @click.self="mode = 'template'">
      <view class="overlay-bg" @click="mode = 'template'"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">休息日</text>
          <text class="close-icon" @click="mode = 'template'">×</text>
        </view>
        <view class="modal-body">
          <input v-model="restReason" placeholder="输入标题，例如腿伤了，姨妈等等..." class="action-input rest" />
          <text class="subtitle">常用理由</text>
          <view class="tag-container">
            <text v-for="r in commonReasons" :key="r" class="reason-tag" @click="restReason = r">
              {{ r }}
            </text>
          </view>
        </view>
        <view class="modal-footer">
          <button @click="saveRestDay">保存</button>
        </view>
      </view>
    </view>

    <!-- 预设模板包弹窗 -->
    <view v-if="mode === 'presets'" class="popup-overlay" @click.self="mode = 'template'">
      <view class="overlay-bg" @click="mode = 'template'"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">推荐模板包</text>
          <text class="close-icon" @click="mode = 'template'">×</text>
        </view>
        <view class="modal-body">
          <text class="subtitle">选择要导入的模板（已含预设动作）：</text>
          <view class="preset-list">
            <view v-for="(pack, idx) in presetPacks" :key="idx" class="preset-item"
              :class="{ 'preset-selected': selectedPresets.includes(idx) }"
              @click="togglePreset(idx)">
              <view class="preset-color-dot" :style="{ backgroundColor: pack.color }"></view>
              <view class="preset-info">
                <text class="preset-name">{{ pack.name }}</text>
                <text class="preset-actions">{{ pack.actions.join('、') }}</text>
              </view>
              <text class="preset-check">{{ selectedPresets.includes(idx) ? '✓' : '' }}</text>
            </view>
          </view>
        </view>
        <view class="modal-footer btn-row">
          <button class="btn-import footer-btn" @click="importSelectedPresets">导入所选模板</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getContrastColor } from '@/utils/color.js'
import { useTemplateStore } from '@/stores/template.js'
import { useActionStore } from '@/stores/action.js'
import { getPresetTemplatePacks } from '@/utils/presetTemplates.js'

export default {
  name: 'TemplateSelector',
  props: {
    templates: { type: Array, default: () => [] },
    date: { type: String, default: '' },
  },
  emits: ['close', 'select-template', 'save-aerobic', 'save-rest'],
  data() {
    return {
      mode: 'template', // template | aerobic | rest | presets
      aerobicName: '',
      aerobicTime: null,
      restReason: '',
      commonReasons: ['休息日', '有事', '月经', '姨妈', '生病', '受伤'],
      presetPacks: [],
      selectedPresets: [],
    }
  },
  computed: {
    aerobicHistory() {
      return this.templates.filter(t => t.isAerobic).map(t => t.name)
    },
  },
  methods: {
    getContrastColor,
    validateAerobicTime() {
      if (this.aerobicTime !== null && this.aerobicTime < 1) {
        this.aerobicTime = 1
        uni.showToast({ title: '时长不能小于1分钟', icon: 'none' })
      }
    },
    saveAerobic() {
      if (!this.aerobicName || this.aerobicTime === null || this.aerobicTime < 1) {
        uni.showToast({ title: '请填写名称和有效的时长（≥1分钟）', icon: 'none' })
        return
      }
      this.$emit('save-aerobic', { name: this.aerobicName, time: this.aerobicTime })
      this.aerobicName = ''
      this.aerobicTime = null
    },
    saveRestDay() {
      if (!this.restReason.trim()) {
        uni.showToast({ title: '请输入理由', icon: 'none' })
        return
      }
      this.$emit('save-rest', this.restReason)
      this.restReason = ''
    },
    showPresetPacks() {
      this.presetPacks = getPresetTemplatePacks()
      this.selectedPresets = this.presetPacks.map((_, i) => i) // 默认全选
      this.mode = 'presets'
    },
    togglePreset(idx) {
      const pos = this.selectedPresets.indexOf(idx)
      if (pos === -1) {
        this.selectedPresets.push(idx)
      } else {
        this.selectedPresets.splice(pos, 1)
      }
    },
    importSelectedPresets() {
      if (this.selectedPresets.length === 0) {
        uni.showToast({ title: '请至少选择一个模板', icon: 'none' })
        return
      }

      const tplStore = useTemplateStore()
      tplStore.load()
      const actStore = useActionStore()
      actStore.load()

      let imported = 0
      for (const idx of this.selectedPresets) {
        const pack = this.presetPacks[idx]
        if (!pack) continue

        // 检查模板是否已存在
        if (tplStore.templates.some(t => t.name === pack.name)) continue

        // 添加模板
        tplStore.addTemplate(pack.name)
        tplStore.setColor(pack.name, pack.color)

        // 添加动作到模板，并确保动作在动作库中存在
        for (const actionName of pack.actions) {
          // 确保动作库中有这个动作
          if (!actStore.actions.some(a => a.name === actionName)) {
            actStore.addAction(actionName)
          }
          tplStore.addAction(pack.name, actionName)
        }
        imported++
      }

      this.mode = 'template'
      uni.showToast({ title: `已导入${imported}个模板`, icon: 'success' })
    },
  },
}
</script>

<style scoped>
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
  margin-top: -44px;
}
.fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.modal-header {
  position: relative;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 72vw;
  height: 1px;
  background-color: var(--divider-color);
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
.modal-footer::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 72vw;
  height: 1px;
  background-color: var(--divider-color);
}
.footer-btn {
  width: 100px;
  height: 36px;
  line-height: 36px;
  background-color: #379bff;
  color: #fff;
  border-radius: 5px;
  border: none;
}
.tpl-select-list {
  max-height: 40vh;
}
.tpl-item {
  background-color: #ccc;
  padding: 10px;
  margin: 6px 0;
  border-radius: 6px;
  text-align: center;
  font-size: 16px;
  color: #fff;
}
.btn-aerobic,
.btn-rest {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 14px;
  color: var(--text-secondary);
}
.no-data {
  text-align: center;
  margin-top: 20px;
  color: var(--text-secondary);
}
.input-row1 {
  border-bottom: 1px solid var(--divider-color);
  padding-bottom: 5px;
  margin-bottom: 5px;
}
.rest {
  border-bottom: 1px solid var(--divider-color);
  padding-bottom: 5px;
  margin-bottom: 5px;
}
.subtitle {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}
.divider {
  width: 100%;
  height: 1px;
  background-color: var(--divider-color);
  margin: 10px 0;
}
.tag-container {
  flex-wrap: wrap;
  display: flex;
  margin-top: 8px;
  gap: 6px;
}
.reason-tag {
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 15px;
  color: var(--text-primary);
}
.action-input {
  padding: 4px 0;
  color: var(--text-primary);
}
.preset-pack-btn {
  margin-top: 14px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #379bff, #2d82d6);
  border-radius: 8px;
  display: block;
  text-align: center;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}
.preset-pack-text {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}
.preset-list {
  margin-top: 10px;
}
.preset-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
}
.preset-selected {
  border-color: #379bff;
  background-color: rgba(55, 155, 255, 0.1);
}
.preset-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}
.preset-info {
  flex: 1;
  min-width: 0;
}
.preset-name {
  font-size: 14px;
  color: var(--text-primary);
  display: block;
  font-weight: bold;
}
.preset-actions {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
  display: block;
  line-height: 1.4;
}
.preset-check {
  font-size: 18px;
  color: #379bff;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}
.btn-import {
  width: 160px;
  height: 36px;
  line-height: 36px;
  background-color: #379bff;
  color: #fff;
  border-radius: 5px;
  font-size: 14px;
}
</style>
