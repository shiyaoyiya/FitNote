<template>
  <view class="grid-container">
    <!-- 部位对比卡片 -->
    <view class="section-title-row">
      <text class="section-title">部位对比</text>
      <view class="title-actions">
        <text class="baseline-btn" @click="baselineVisible = true">基线</text>
        <text class="manage-btn" @click="$emit('manage')">管理部位</text>
        <picker class="window-picker-wrap" mode="selector" :range="WINDOW_LABELS" :value="windowIndex" @change="onWindowChange">
          <view class="window-picker">
            <text class="window-picker-label">{{ currentWindowLabel }}</text>
            <text class="window-picker-arrow">▾</text>
          </view>
        </picker>
      </view>
    </view>
    <BaselineSettings v-if="baselineVisible" :config="baselineConfig" :adaptiveRanges="adaptiveRanges"
      @close="baselineVisible = false" @update:config="onBaselineConfigChange" />
    <view class="grid">
      <view v-for="part in visibleParts" :key="part.id" class="card"
        :class="{ 'card-selected': selectedPart === part.id }"
        @click="onPartClick(part.id)"
      >
        <view class="card-header-row">
          <text class="part-name">{{ part.name }}</text>
          <text v-if="showBadge(part.id)" class="status-badge"
            :class="getBadgeClass(part.id)">{{ BADGE_LABELS[badgeStatus[part.id]] }}</text>
        </view>
        <view class="part-value">
          <text class="value-number">{{ getValue(part.id) }}</text>
          <text class="value-unit">{{ DIMENSION_LABELS[dimension] }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import BaselineSettings from './BaselineSettings.vue'

const DIMENSION_LABELS = {
  days: '天',
  sets: '组/周',
  volume: 'kg',
}

const WINDOWS = [
  { value: '7d', label: '7天' },
  { value: '14d', label: '两周' },
  { value: '30d', label: '一个月' },
]

const WINDOW_LABELS = WINDOWS.map(w => w.label)

const windowIndex = computed(() => {
  const i = WINDOWS.findIndex(w => w.value === props.window)
  return i === -1 ? 1 : i
})

const currentWindowLabel = computed(() => WINDOWS[windowIndex.value].label)

function onWindowChange(e) {
  const i = Number(e.detail.value)
  if (Number.isInteger(i) && i >= 0 && i < WINDOWS.length) {
    emit('update:window', WINDOWS[i].value)
  }
}

const BODY_PARTS_MAP = {
  chest: '胸部',
  upper_traps: '上斜方',
  erector_spinae: '竖脊肌',
  back: '背部',
  front_delt: '前束',
  side_delt: '中束',
  rear_delt: '后束',
  biceps: '二头',
  triceps: '三头',
  legs: '腿部',
  calves: '小腿',
  glutes: '臀部',
  abs: '腹部',
}

const props = defineProps({
  bodyPartData: {
    type: Array,
    default: () => [],
  },
  dimension: {
    type: String,
    default: 'days',
  },
  bodyPartOrder: {
    type: Array,
    default: () => [],
  },
  bodyPartVisibility: {
    type: Object,
    default: () => ({}),
  },
  badgeStatus: {
    type: Object,
    default: () => ({}),
  },
  window: {
    type: String,
    default: '14d',
  },
  baselineConfig: {
    type: Object,
    default: () => ({}),
  },
  adaptiveRanges: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['manage', 'update:window', 'select:bodyPart', 'update:baselineConfig'])

const baselineVisible = ref(false)

function onBaselineConfigChange(cfg) {
  emit('update:baselineConfig', cfg)
  baselineVisible.value = false
}

const selectedPart = ref(null)

function onPartClick(id) {
  selectedPart.value = selectedPart.value === id ? null : id
  emit('select:bodyPart', id)
}

const visibleParts = computed(() => {
  const order = props.bodyPartOrder
  if (order.length === 0) {
    return Object.entries(BODY_PARTS_MAP).map(([id, name]) => ({ id, name }))
  }
  return order
    .filter(id => props.bodyPartVisibility[id] !== false)
    .map(id => ({ id, name: BODY_PARTS_MAP[id] || id }))
})

function getValue(id) {
  const item = props.bodyPartData.find(d => d.id === id)
  return item ? item[props.dimension] ?? 0 : 0
}

const BADGE_LABELS = { low: '偏低', normal: '正常', high: '偏高' }

function showBadge(id) {
  return props.dimension === 'sets' && props.badgeStatus[id] && getValue(id) > 0
}

function getBadgeClass(id) {
  const status = props.badgeStatus[id]
  return status ? 'badge-' + status : ''
}
</script>

<style scoped>
.grid-container {
  width: 100%;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--section-title, #1a1a1a);
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.manage-btn {
  font-size: 13px;
  color: #379bff;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(55, 155, 255, 0.08);
  line-height: 1.4;
}

.manage-btn:active {
  opacity: 0.7;
}

.baseline-btn {
  font-size: 13px;
  color: #379bff;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(55, 155, 255, 0.08);
  line-height: 1.4;
}

.baseline-btn:active {
  opacity: 0.7;
}

/* 部位对比时间窗下拉选择器（近7天 / 两周 / 一个月） */
.window-picker-wrap {
  display: block;
}

.window-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #999999);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.window-picker-arrow {
  font-size: 10px;
  opacity: 0.7;
  transform: translateY(1px);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.card {
  border-radius: 12px;
  padding: 14px;
  background-color: var(--card-bg, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: border-color 0.2s;
  border: 2px solid transparent;
}

.container.light .card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.container.dark .card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.card.card-selected {
  border-color: #379bff;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.part-name {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary, #333333);
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #ffffff;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: auto;
}

.badge-low { background-color: #ff4757; }
.badge-normal { background-color: #2ed573; }
.badge-high { background-color: #ffa502; }

.part-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.value-number {
  font-size: 22px;
  color: #379bff;
  font-weight: bold;
  line-height: 1.2;
}

.value-unit {
  font-size: 12px;
  color: var(--text-secondary, #999999);
}
</style>
