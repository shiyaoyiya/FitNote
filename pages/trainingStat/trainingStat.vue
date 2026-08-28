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

      <view class="calories-card">
        <view class="calories-row">
          <text class="calories-title">消耗热量</text>
          <text class="calories-total">{{ Math.round(caloriesData.total) }} kcal</text>
        </view>
        <view class="calories-chart-area">
          <view v-if="caloriesChartData.length === 0" class="calories-empty">暂无热量数据</view>
          <view v-else class="calories-bars">
            <view v-for="(item, index) in caloriesChartData" :key="index" class="calories-bar-wrapper">
              <view class="calories-bar-value">{{ item.kcal }}</view>
              <view class="calories-bar" :style="{ height: caloriesBarHeight(item.kcal) + 'px' }" />
              <view class="calories-bar-label">{{ item.label }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <BodyPartManager
      v-show="showBodyPartManager"
      @close="onBodyPartManagerClose"
      @save="onBodyPartManagerSave"
    />
  </scroll-view>
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
import { computeStats, isCategoryId, CATEGORY_NAMES, MERGED_CATEGORIES, collectAllWeeklyVolume, collectCalories } from './statUtil.js'
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

const caloriesData = computed(() => {
  // 引用 allStats.value 建立响应式依赖，使 refreshStats 完成后同步重算
  if (!allStats.value) return { total: 0, daily: [] }
  return collectCalories({
    year: currentYear.value,
    month: currentMonth.value - 1,
    periodType: currentPeriod.value,
    dayDataCacheStore,
  })
})

const caloriesChartData = computed(() => {
  const raw = caloriesData.value.daily || []
  if (currentPeriod.value === 'year') {
    const monthBuckets = {}
    for (const item of raw) {
      const m = parseInt(item.date.split('-')[1])
      const label = `${m}月`
      monthBuckets[label] = (monthBuckets[label] || 0) + item.kcal
    }
    return Object.keys(monthBuckets)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(label => ({ label, kcal: Math.round(monthBuckets[label]) }))
  }
  return raw.map(item => {
    const parts = item.date.split('-')
    return { label: `${parseInt(parts[1])}/${parseInt(parts[2])}`, kcal: Math.round(item.kcal) }
  })
})

const caloriesMaxValue = computed(() => {
  const arr = caloriesChartData.value
  if (arr.length === 0) return 1
  return Math.max(...arr.map(i => i.kcal), 1)
})

function caloriesBarHeight(kcal) {
  const maxBarHeight = 120
  return Math.max(2, (kcal / caloriesMaxValue.value) * maxBarHeight)
}

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
  color: var(--text-muted);
  transition: all 0.3s ease;
}

.period-toggle .toggle-btn.active {
  background: #379bff;
  color: #ffffff;
}

.calories-card {
  background-color: var(--card-bg, #ffffff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.calories-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.calories-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--section-title, #1a1a1a);
}

.calories-total {
  font-size: 15px;
  font-weight: 600;
  color: #f59e0b;
}

.calories-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: var(--empty-text, #999999);
  font-size: 14px;
}

.calories-bars {
  width: 100%;
  overflow-x: auto;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 12px;
  padding-top: 4px;
}

.calories-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  min-height: 2px;
}

.calories-bar-value {
  font-size: 11px;
  color: var(--chart-text, #666666);
  margin-bottom: 4px;
}

.calories-bar {
  width: 28px;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
  background-color: #f59e0b;
  transition: height 0.3s ease;
}

.calories-bar-label {
  font-size: 11px;
  color: var(--chart-label, #999999);
  margin-top: 6px;
  text-align: center;
}
</style>
