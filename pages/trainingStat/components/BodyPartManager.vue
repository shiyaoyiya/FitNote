<template>
  <view class="manager-overlay">
    <view class="manager-header">
      <text class="back-btn" @click="handleClose">‹ 返回</text>
      <text class="reset-btn" @click="handleReset">恢复默认</text>
    </view>

    <scroll-view class="manager-body" :scroll-y="!isDragMode" :scroll-with-animation="false">
      <view class="sort-list" :style="{ height: localOrder.length * CARD_HEIGHT_PX + 'px' }">
        <view v-for="(item, idx) in localOrder" :key="item.id" class="sort-item-wrapper"
          :class="{ 'is-dragging': dragIdx === idx }"
          :style="{ transform: 'translateY(' + (isDragMode && dragIdx === idx ? itemDragOffset : idx * CARD_HEIGHT_PX) + 'px)' }">
          <view class="sort-card" :class="{ 'is-hidden': localVisibility[item.id] === false }"
            @touchstart="onSortTouchStart($event, idx)" @touchmove="onSortTouchMove($event, idx)"
            @touchend="onSortTouchEnd($event, idx)">
            <view class="drag-handle">☰</view>
            <text class="sort-card-name">{{ item.name }}</text>
            <view class="card-actions">
              <text v-if="localVisibility[item.id] === false" class="restore-btn"
                @click.stop="toggleVisibility(item.id)">恢复</text>
              <text v-else class="delete-btn" @click.stop="toggleVisibility(item.id)">✕</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
  import {
    ref,
    onMounted,
    onBeforeUnmount
  } from 'vue'

  const CONFIG_KEY = 'training_stat_bodypart_config'

  const CARD_HEIGHT_PX = 50

  const DEFAULT_ORDER = [
    'chest',
    'upper_traps', 'erector_spinae', 'back',
    'front_delt', 'side_delt', 'rear_delt',
    'biceps', 'triceps',
    'legs', 'calves', 'glutes',
    'abs',
  ]

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

  const emit = defineEmits(['close', 'save'])

  const localOrder = ref([])
  const localVisibility = ref({})

  const isDragMode = ref(false)
  const dragIdx = ref(-1)
  const isDragTriggered = ref(false)
  const hasSwapped = ref(false)
  const lastTargetIdx = ref(-1)
  const sortLongPressTimer = ref(null)
  const sortLongPressStartPos = ref(null)
  const itemDragOffset = ref(0)
  const dragStartY = ref(0)

  const sortLongPressThreshold = 100

  const OLD_TO_NEW_MAP = {
    upper_chest: 'chest',
    mid_lower_chest: 'chest',
    teres_major: 'back',
    mid_lower_traps: 'back',
    lats: 'back',
    quads: 'legs',
    hamstrings: 'legs',
  }

  function migrateBodyPartId(id) {
    return OLD_TO_NEW_MAP[id] || id
  }

  function loadConfig() {
    try {
      const raw = uni.getStorageSync(CONFIG_KEY)
      if (raw) {
        const config = typeof raw === 'string' ? JSON.parse(raw) : raw
        const oldOrder = config.order || []
        const hasOldIds = oldOrder.some(id => OLD_TO_NEW_MAP[id])
        if (hasOldIds) {
          const migratedOrder = []
          const seen = new Set()
          for (const id of oldOrder) {
            const newId = migrateBodyPartId(id)
            if (!seen.has(newId)) {
              seen.add(newId)
              migratedOrder.push(newId)
            }
          }
          for (const id of DEFAULT_ORDER) {
            if (!seen.has(id)) {
              seen.add(id)
              migratedOrder.push(id)
            }
          }
          localOrder.value = migratedOrder.map(id => ({
            id,
            name: BODY_PARTS_MAP[id] || id,
          }))
          const oldVisibility = config.visibility || {}
          const migratedVisibility = {}
          for (const [id, visible] of Object.entries(oldVisibility)) {
            migratedVisibility[migrateBodyPartId(id)] = visible
          }
          localVisibility.value = migratedVisibility
          return
        }
        localOrder.value = (config.order || [...DEFAULT_ORDER]).map(id => ({
          id,
          name: BODY_PARTS_MAP[id] || id,
        }))
        localVisibility.value = config.visibility || {}
        return
      }
    } catch (e) {}
    localOrder.value = DEFAULT_ORDER.map(id => ({
      id,
      name: BODY_PARTS_MAP[id] || id,
    }))
    localVisibility.value = {}
  }

  function getDefaultOrder() {
    return DEFAULT_ORDER.map(id => ({
      id,
      name: BODY_PARTS_MAP[id] || id,
    }))
  }

  function toggleVisibility(id) {
    const current = localVisibility.value[id]
    localVisibility.value = {
      ...localVisibility.value,
      [id]: current === false ? true : false
    }
  }

  function handleClose() {
    clearTimer()
    isDragMode.value = false
    dragIdx.value = -1
    emit('save', {
      order: localOrder.value.map(item => item.id),
      visibility: {
        ...localVisibility.value
      },
    })
  }

  function handleReset() {
    isDragMode.value = false
    dragIdx.value = -1
    localOrder.value = getDefaultOrder()
    localVisibility.value = {}
  }

  function clearTimer() {
    if (sortLongPressTimer.value) {
      clearTimeout(sortLongPressTimer.value)
      sortLongPressTimer.value = null
    }
  }

  function onSortTouchStart(e, idx) {
    clearTimer()
    sortLongPressStartPos.value = e.touches ?
      {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      } :
      null
    sortLongPressTimer.value = setTimeout(() => {
      onSortDragTrigger(idx, e)
    }, sortLongPressThreshold)
  }

  function onSortTouchMove(e, idx) {
    clearTimer()

    if (!isDragMode.value || dragIdx.value !== idx) {
      if (sortLongPressStartPos.value && e.touches && e.touches[0]) {
        const dx = Math.abs(e.touches[0].clientX - sortLongPressStartPos.value.x)
        const dy = Math.abs(e.touches[0].clientY - sortLongPressStartPos.value.y)
        if (dx > 10 || dy > 10) {
          sortLongPressStartPos.value = null
        }
      }
      return
    }

    const currentY = e.touches[0].clientY
    const deltaY = currentY - dragStartY.value
    const baseY = idx * CARD_HEIGHT_PX
    itemDragOffset.value = baseY + deltaY

    const shouldSwapDown = deltaY > CARD_HEIGHT_PX * 0.5 && idx < localOrder.value.length - 1
    const shouldSwapUp = deltaY < -CARD_HEIGHT_PX * 0.5 && idx > 0

    if (shouldSwapDown || shouldSwapUp) {
      const targetIdx = shouldSwapDown ? idx + 1 : idx - 1
      if (targetIdx === lastTargetIdx.value) return
      lastTargetIdx.value = targetIdx

      const list = [...localOrder.value];
      [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]]
      localOrder.value = list
      dragIdx.value = targetIdx
      dragStartY.value = currentY
      itemDragOffset.value = targetIdx * CARD_HEIGHT_PX

      uni.vibrateShort({
        type: 'light'
      })
    }
  }

  function onSortTouchEnd(e, idx) {
    clearTimer()
    if (isDragTriggered.value) {
      onSortDragEnd()
    }
  }

  function onSortDragTrigger(idx, e) {
    uni.vibrateShort({
      type: 'light'
    })
    isDragMode.value = true
    dragIdx.value = idx
    dragStartY.value = e.touches ? e.touches[0].clientY : 0
    itemDragOffset.value = idx * CARD_HEIGHT_PX
    isDragTriggered.value = true
    hasSwapped.value = false
    lastTargetIdx.value = -1
  }

  function onSortDragEnd() {
    isDragMode.value = false
    dragIdx.value = -1
    lastTargetIdx.value = -1
    itemDragOffset.value = 0
    isDragTriggered.value = false
    hasSwapped.value = false
  }

  function cleanup() {
    clearTimer()
    isDragMode.value = false
    dragIdx.value = -1
    lastTargetIdx.value = -1
    isDragTriggered.value = false
    hasSwapped.value = false
  }

  onBeforeUnmount(() => {
    cleanup()
  })

  onMounted(() => {
    loadConfig()
  })
</script>

<style scoped>
  .manager-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
  }

  .container.light .manager-overlay {
    background-color: rgba(0, 0, 0, 0.3);
  }

  .container.dark .manager-overlay {
    background-color: rgba(0, 0, 0, 0.45);
  }

  .manager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    flex-shrink: 0;
  }

  .back-btn {
    font-size: 16px;
    color: #379bff;
    padding: 4px 0;
  }

  .reset-btn {
    font-size: 14px;
    color: #ff6b6b;
    padding: 4px 0;
  }

  .manager-body {
    flex: 1;
    height: 0;
  }

  .sort-list {
    width: calc(100% - 32px);
    margin: 0 auto;
    position: relative;
  }

  .sort-item-wrapper {
    position: absolute;
    left: 0;
    right: 0;
    height: 50px;
    display: flex;
    align-items: center;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
  }

  .sort-item-wrapper.is-dragging {
    transition: none !important;
    z-index: 999;
  }

  .sort-item-wrapper.is-dragging .sort-card {
    transform: scale(1.05);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  }

  .sort-card {
    width: 100%;
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border-radius: 10px;
    padding: 8px 14px;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .container.light .sort-card {
    background-color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .container.dark .sort-card {
    background-color: #2a2a2a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .container.liquid-glass .sort-card {
    background: var(--glass-bg) !important;
    border: none !important;
    box-shadow:
      0 0 0 0.5px var(--glass-edge) inset,
      0 1px 3px var(--glass-shadow-inner) inset,
      0 1px 4px var(--glass-shadow-outer) !important;
    -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
    backdrop-filter: blur(12px) saturate(140%) !important;
  }

  .sort-card.is-hidden {
    opacity: 0.4;
  }

  .container.liquid-glass .sort-card.is-hidden {
    opacity: 0.35 !important;
  }

  .drag-handle {
    font-size: 18px;
    color: #999999;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .container.light .drag-handle {
    color: #999999;
  }

  .container.dark .drag-handle {
    color: #888888;
  }

  .container.liquid-glass .drag-handle {
    color: var(--glass-placeholder) !important;
  }

  .sort-card-name {
    flex: 1;
    font-size: 15px;
    color: #333333;
    font-weight: 500;
    pointer-events: none;
  }

  .container.light .sort-card-name {
    color: #333333;
  }

  .container.dark .sort-card-name {
    color: #f7f7f7;
  }

  .container.liquid-glass .sort-card-name {
    color: var(--glass-text) !important;
  }

  .card-actions {
    flex-shrink: 0;
  }

  .delete-btn {
    font-size: 16px;
    color: #ff6b6b;
    padding: 4px 8px;
  }

  .restore-btn {
    font-size: 13px;
    color: #379bff;
    padding: 4px 8px;
  }
</style>
