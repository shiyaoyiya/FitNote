<template>
  <view class="baseline-overlay" @click.self="$emit('close')">
    <view class="overlay-bg" @click="$emit('close')"></view>
    <view class="baseline-panel" @click.stop>
      <view class="baseline-header">
        <text class="baseline-title">训练基线</text>
        <text class="baseline-close" @click="$emit('close')">✕</text>
      </view>

      <view class="baseline-switch-row">
        <text class="baseline-switch-label">自适应基线</text>
        <view class="baseline-switch" :class="{ on: form.adaptive }" @click="form.adaptive = !form.adaptive">
          <view class="baseline-switch-dot" />
        </view>
      </view>
      <view class="baseline-hint">固定基线以周为单位（组/周）；开启自适应后按近 8 周训练水平动态判定（每训练日均值 ±30%），下方数值实时显示自适应基线；关闭后恢复自定义/默认数值</view>

      <scroll-view scroll-y class="baseline-list">
        <view v-for="id in RANGE_IDS" :key="id" class="baseline-row">
          <text class="baseline-part-name">{{ BODY_PART_NAMES[id] || id }}</text>
          <view class="baseline-inputs">
            <input class="baseline-input" :class="{ disabled: form.adaptive, dynamic: displayRange(id).dynamic }" type="number" :disabled="form.adaptive"
              :value="displayRange(id).low" @input="onLowInput(id, $event)" />
            <text class="baseline-tilde">~</text>
            <input class="baseline-input" :class="{ disabled: form.adaptive, dynamic: displayRange(id).dynamic }" type="number" :disabled="form.adaptive"
              :value="displayRange(id).high" @input="onHighInput(id, $event)" />
          </view>
        </view>
      </scroll-view>

      <view class="baseline-footer">
        <text class="baseline-reset" @click="onReset">重置默认</text>
        <text class="baseline-save" @click="onSave">保存</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { DEFAULT_CONFIG, FIXED_RANGES } from '../volumeHistory.js'

const BODY_PART_NAMES = {
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  glutes: '臀部',
  front_delt: '前束',
  side_delt: '中束',
  rear_delt: '后束',
  biceps: '二头',
  triceps: '三头',
}

const RANGE_IDS = Object.keys(FIXED_RANGES)

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  adaptiveRanges: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close', 'update:config'])

function cloneRangesFrom(config) {
  const ranges = {}
  for (const id of RANGE_IDS) {
    const r = (config && config.customRanges && config.customRanges[id]) || FIXED_RANGES[id] || { low: 0, high: 0 }
    ranges[id] = { low: String(r.low), high: String(r.high) }
  }
  return ranges
}

const form = reactive({
  adaptive: !!(props.config && props.config.adaptive),
  ranges: cloneRangesFrom(props.config),
})

watch(() => props.config, (cfg) => {
  form.adaptive = !!(cfg && cfg.adaptive)
  form.ranges = cloneRangesFrom(cfg)
})

function onLowInput(id, e) {
  form.ranges[id].low = e.detail.value
}

function onHighInput(id, e) {
  form.ranges[id].high = e.detail.value
}

function fmtAdaptive(n) {
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 10) / 10)
}

// 自适应开启且该部位有自适应区间时，输入框实时显示自适应基线（组/训练日，±30%）；
// 否则显示用户设定/系统默认值（保存时始终保存 form.ranges，关闭自适应后数字原样回来）
function displayRange(id) {
  if (form.adaptive) {
    const ar = props.adaptiveRanges && props.adaptiveRanges[id]
    if (ar && Number.isFinite(ar.low) && Number.isFinite(ar.high)) {
      return { low: fmtAdaptive(ar.low), high: fmtAdaptive(ar.high), dynamic: true }
    }
  }
  return { low: form.ranges[id].low, high: form.ranges[id].high, dynamic: false }
}

function parseNum(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

function onSave() {
  const customRanges = {}
  for (const id of RANGE_IDS) {
    const def = FIXED_RANGES[id] || { low: 0, high: 0 }
    let low = parseNum(form.ranges[id].low)
    let high = parseNum(form.ranges[id].high)
    if (low === null) low = def.low
    if (high === null) high = def.high
    if (low > high) {
      const t = low
      low = high
      high = t
    }
    customRanges[id] = { low, high }
  }
  emit('update:config', {
    adaptive: form.adaptive,
    customRanges,
  })
}

function onReset() {
  form.adaptive = false
  form.ranges = cloneRangesFrom(DEFAULT_CONFIG)
}
</script>

<style scoped>
.baseline-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.baseline-panel {
  position: relative;
  z-index: 1;
  width: 84%;
  max-width: 360px;
  max-height: 78vh;
  border-radius: 16px;
  background-color: #ffffff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.baseline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.baseline-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary, #1a1a1a);
}

.baseline-close {
  font-size: 16px;
  color: var(--text-muted, #999999);
  padding: 4px 6px;
}

.baseline-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.baseline-switch-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333333);
}

.baseline-switch {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background-color: #e0e0e0;
  position: relative;
  transition: background-color 0.2s;
}

.baseline-switch.on {
  background-color: #379bff;
}

.baseline-switch-dot {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background-color: #ffffff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.baseline-switch.on .baseline-switch-dot {
  transform: translateX(18px);
}

.baseline-hint {
  font-size: 11px;
  color: var(--text-muted, #999999);
  margin-bottom: 10px;
}

.baseline-list {
  flex: 1;
  min-height: 0;
  max-height: 44vh;
}

.baseline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.baseline-part-name {
  font-size: 13px;
  color: var(--text-primary, #333333);
  width: 56px;
  flex-shrink: 0;
}

.baseline-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.baseline-input {
  width: 56px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #f5f6f8;
  text-align: center;
  font-size: 13px;
  color: var(--text-primary, #333333);
}

.baseline-input.disabled {
  opacity: 0.45;
}

.baseline-input.dynamic {
  color: #379bff;
}

.baseline-tilde {
  font-size: 13px;
  color: var(--text-muted, #999999);
}

.baseline-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.baseline-reset {
  font-size: 13px;
  color: var(--text-muted, #999999);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.baseline-save {
  font-size: 13px;
  color: #ffffff;
  background-color: #379bff;
  padding: 8px 18px;
  border-radius: 8px;
}
</style>
