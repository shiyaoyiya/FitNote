<template>
  <scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }" scroll-y>
    <view class="content-area">
      <view class="filter-header-row">
        <view class="period-toggle">
          <view
            class="toggle-btn"
            :class="{ active: currentPeriod === 'month' }"
            @click="currentPeriod = 'month'"
          >月</view>
          <view
            class="toggle-btn"
            :class="{ active: currentPeriod === 'year' }"
            @click="currentPeriod = 'year'"
          >年</view>
        </view>
        <DatePicker
          :year="currentYear"
          :month="currentMonth"
          :period="currentPeriod"
          :minYear="minYear"
          :minMonth="minMonth"
          :maxYear="maxYear"
          :maxMonth="maxMonth"
          @update:year="onYearChange"
          @update:month="onMonthChange"
        />
      </view>

      <TrainingOverview
        :stats="overviewStats"
        :period="currentPeriod"
        :dimension="currentDimension"
        @update:dimension="onDimensionChange"
      />

      <BodyPartTrend
        :trendData="trendData"
        :selectedBodyPart="selectedBodyPart"
        :period="currentPeriod"
        :dimension="currentDimension"
        @select:bodyPart="onBodyPartSelect"
      />

      <BodyPartGrid
        :bodyPartData="bodyPartGridData"
        :dimension="currentDimension"
        :bodyPartOrder="bodyPartOrder"
        :bodyPartVisibility="bodyPartVisibility"
        :badgeStatus="badgeStatus"
        @manage="showBodyPartManager = true"
        @select:bodyPart="onBodyPartSelect"
      />
    </view>
  </scroll-view>

  <BodyPartManager
    v-show="showBodyPartManager"
    @close="onBodyPartManagerClose"
    @save="onBodyPartManagerSave"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import DatePicker from './components/DatePicker.vue'
import TrainingOverview from './components/TrainingOverview.vue'
import BodyPartTrend from './components/BodyPartTrend.vue'
import BodyPartGrid from './components/BodyPartGrid.vue'
import BodyPartManager from './components/BodyPartManager.vue'
import { useActionStore } from '@/stores/action.js'
import { useDayDataCacheStore } from '@/stores/dayDataCache.js'
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { computeStats, isCategoryId, CATEGORY_NAMES, MERGED_CATEGORIES, collectAllWeeklyVolume } from './statUtil.js'
import { rebuildVolumeHistory, getStatus } from './volumeHistory.js'

const CONFIG_KEY = 'training_stat_bodypart_config'

const DEFAULT_BODY_PARTS = [
  'chest',
  'upper_traps', 'erector_spinae', 'back',
  'front_delt', 'side_delt', 'rear_delt',
  'biceps', 'triceps',
  'legs', 'calves', 'glutes',
  'abs',
]

const actionStore = useActionStore()
const dayDataCacheStore = useDayDataCacheStore()
const daySettingsStore = useDaySettingsStore()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const currentPeriod = ref('month')
const currentDimension = ref('days')
const selectedBodyPart = ref('chest')
const allStats = ref(null)
const showBodyPartManager = ref(false)

const bodyPartOrder = ref([])
const bodyPartVisibility = ref({})
const badgeStatus = ref({})

const minYear = ref(now.getFullYear())
const minMonth = ref(1)
const maxYear = now.getFullYear()
const maxMonth = now.getMonth() + 1

const overviewStats = computed(() => {
  if (!allStats.value) return { totalDays: 0, totalSets: 0, totalVolume: 0 }
  return {
    totalDays: allStats.value.totalDays,
    totalSets: allStats.value.totalSets,
    totalVolume: allStats.value.totalVolume
  }
})

const trendData = computed(() => {
  if (!allStats.value) return []
  if (isCategoryId(selectedBodyPart.value)) {
    return allStats.value.categoryTrends[selectedBodyPart.value] || []
  }
  return allStats.value.subcategoryTrends[selectedBodyPart.value] || []
})

const bodyPartGridData = computed(() => {
  if (!allStats.value) return []
  const subTotals = allStats.value.subcategoryTotals
  const mergedMap = {}

  for (const [catId, mergeInfo] of Object.entries(MERGED_CATEGORIES)) {
    const children = mergeInfo.children
    let totalSets = 0
    let totalVolume = 0
    const daySet = new Set()

    for (const item of subTotals) {
      if (children.includes(item.id)) {
        totalSets += item.sets
        totalVolume += item.volume
      }
    }

    const catDays = allStats.value.categoryTrends[catId]
    const days = catDays && catDays.length > 0
      ? catDays.reduce((max, d) => Math.max(max, d.days), 0)
      : 0

    mergedMap[catId] = {
      id: catId,
      name: MERGED_CATEGORIES[catId].name,
      days,
      sets: totalSets,
      volume: totalVolume,
    }
  }

  const mergedIds = new Set(Object.keys(MERGED_CATEGORIES))
  const childrenIds = new Set()
  for (const info of Object.values(MERGED_CATEGORIES)) {
    for (const childId of info.children) {
      childrenIds.add(childId)
    }
  }

  const result = []
  for (const item of subTotals) {
    if (!childrenIds.has(item.id)) {
      result.push({ ...item })
    }
  }

  for (const mergedId of mergedIds) {
    const existingIndex = result.findIndex(item => item.id === mergedId)
    if (existingIndex >= 0) {
      result[existingIndex] = { ...mergedMap[mergedId] }
    } else {
      result.push({ ...mergedMap[mergedId] })
    }
  }

  return result
})

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

function loadBodyPartConfig() {
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
        for (const id of DEFAULT_BODY_PARTS) {
          if (!seen.has(id)) {
            seen.add(id)
            migratedOrder.push(id)
          }
        }
        bodyPartOrder.value = migratedOrder
        const oldVisibility = config.visibility || {}
        const migratedVisibility = {}
        for (const [id, visible] of Object.entries(oldVisibility)) {
          migratedVisibility[migrateBodyPartId(id)] = visible
        }
        bodyPartVisibility.value = migratedVisibility
        saveBodyPartConfig()
      } else {
        bodyPartOrder.value = oldOrder.length > 0 ? oldOrder : [...DEFAULT_BODY_PARTS]
        bodyPartVisibility.value = config.visibility || {}
      }
    } else {
      bodyPartOrder.value = [...DEFAULT_BODY_PARTS]
      bodyPartVisibility.value = {}
    }
  } catch (e) {
    bodyPartOrder.value = [...DEFAULT_BODY_PARTS]
    bodyPartVisibility.value = {}
  }
}

function saveBodyPartConfig() {
  uni.setStorageSync(CONFIG_KEY, {
    order: bodyPartOrder.value,
    visibility: bodyPartVisibility.value,
  })
}

function onBodyPartManagerClose() {
  showBodyPartManager.value = false
}

function onBodyPartManagerSave({ order, visibility }) {
  bodyPartOrder.value = order
  bodyPartVisibility.value = visibility
  saveBodyPartConfig()
  showBodyPartManager.value = false
}

function computeMinDateRange() {
  dayDataCacheStore.loadIndex()
  const earliestYear = dayDataCacheStore.getEarliestYear()
  const allDates = dayDataCacheStore.indexedDates
  if (allDates.length > 0) {
    allDates.sort()
    const earliest = allDates[0]
    const parts = earliest.split('-')
    minYear.value = parseInt(parts[0])
    minMonth.value = parseInt(parts[1])
  } else {
    minYear.value = now.getFullYear()
    minMonth.value = now.getMonth() + 1
  }
}

function onYearChange(y) {
  currentYear.value = y
  refreshStats()
}

function onMonthChange(m) {
  currentMonth.value = m
  refreshStats()
}

function onDimensionChange(dimension) {
  currentDimension.value = dimension
}

function onBodyPartSelect(bodyPartId) {
  selectedBodyPart.value = bodyPartId
}

function refreshStats() {
  allStats.value = computeStats({
    year: currentYear.value,
    month: currentMonth.value - 1,
    periodType: currentPeriod.value,
    actionStore,
    dayDataCacheStore,
  })

  const history = rebuildVolumeHistory(
    collectAllWeeklyVolume(actionStore, dayDataCacheStore)
  )

  const statusMap = {}
  if (allStats.value) {
    for (const item of bodyPartGridData.value) {
      const status = getStatus(item.id, history)
      if (status) {
        statusMap[item.id] = status
      }
    }
  }
  badgeStatus.value = statusMap
}

function preloadRemainingMonths() {
  const year = currentYear.value
  const loadedMonth = currentMonth.value
  for (let m = 1; m <= 12; m++) {
    if (m === loadedMonth) continue
    dayDataCacheStore.preloadMonthsAsync(year, m - 1)
  }
}

onShow(() => {
  dayDataCacheStore.loadIndex(true)
  computeMinDateRange()
  refreshStats()
})

onMounted(() => {
  actionStore.load()
  computeMinDateRange()
  loadBodyPartConfig()
  refreshStats()

  nextTick(() => {
    preloadRemainingMonths()
  })
})

watch(() => currentPeriod.value, () => {
  refreshStats()
})

watch([currentYear, currentMonth], ([newYear, newMonth], [oldYear, oldMonth]) => {
  if (newYear !== oldYear || newMonth !== oldMonth) {
    dayDataCacheStore.preloadMonthsAsync(newYear, newMonth - 1)
  }
})
</script>

<style scoped>
.container {
  height: 100vh;
  overflow-y: auto;
  --card-bg: #ffffff;
  --text-primary: #333333;
  --text-secondary: #999999;
  --section-title: #1a1a1a;
  --chip-bg: #f0f0f0;
  --chip-text: #333333;
  --chart-text: #666666;
  --chart-label: #999999;
  --empty-text: #999999;
}

.container.light {
  background-color: #f5f5f5;
  color: #333333;
  --card-bg: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --section-title: #333333;
  --chip-bg: #e0e0e0;
  --chip-text: #333333;
  --chart-text: #666666;
  --chart-label: #999999;
  --empty-text: #999999;
}

.container.dark {
  background-color: #121212;
  color: #f7f7f7;
  --card-bg: #1c1c1e;
  --text-primary: #f7f7f7;
  --text-secondary: #888888;
  --section-title: #ffffff;
  --chip-bg: #3a3a3a;
  --chip-text: #cccccc;
  --chart-text: #aaaaaa;
  --chart-label: #888888;
  --empty-text: #777777;
}

.content-area {
  padding: 16px;
  padding-bottom: 60px;
}

.filter-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.period-toggle {
  display: flex;
  gap: 4px;
}

.period-toggle .toggle-btn {
  padding: 6px 14px;
  font-size: 14px;
  border-radius: 8px;
  background: transparent;
  color: #888;
  transition: all 0.3s ease;
}

.period-toggle .toggle-btn.active {
  background: #379bff;
  color: #ffffff;
}
</style>
