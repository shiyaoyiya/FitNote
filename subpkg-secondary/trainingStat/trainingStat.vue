<template>
  <scroll-view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    scroll-y @touchstart="onPageTouchStart" @touchmove="onPageTouchMove" @touchend="onPageTouchEnd">
    <view class="content-area">
      <view class="filter-header-row">
        <view class="period-toggle">
          <view class="toggle-btn" :class="{ active: currentPeriod === 'month' }" @click="currentPeriod = 'month'">月
          </view>
          <view class="toggle-btn" :class="{ active: currentPeriod === 'year' }" @click="currentPeriod = 'year'">年
          </view>
        </view>
        <DatePicker :year="currentYear" :month="currentMonth" :period="currentPeriod" :minYear="minYear"
          :minMonth="minMonth" :maxYear="maxYear" :maxMonth="maxMonth" @update:year="onYearChange"
          @update:month="onMonthChange" />
      </view>

      <TrainingOverview v-show="dataReady" :stats="overviewStats" :period="currentPeriod" :dimension="currentDimension"
        :swipeDeltaX="swipeDeltaX" :swipeViewWidth="swipeViewWidth" :noTransition="swipeNoTransition" :ready="dataReady"
        @update:dimension="onDimensionChange" />

      <BodyPartTrend v-show="dataReady" :trendData="trendData" :selectedBodyPart="selectedBodyPart" :period="currentPeriod"
        :dimension="currentDimension" @select:bodyPart="onBodyPartSelect" />

      <BodyPartGrid v-show="dataReady" :bodyPartData="bodyPartGridData" :dimension="currentDimension" :bodyPartOrder="bodyPartOrder"
        :bodyPartVisibility="bodyPartVisibility" :badgeStatus="badgeStatus" :window="compareWindow"
        :baselineConfig="baselineConfig" :adaptiveRanges="adaptiveRanges"
        @manage="showBodyPartManager = true" @update:window="onCompareWindowChange"
        @update:baselineConfig="onBaselineConfigChange"
        @select:bodyPart="onBodyPartSelect" />


      <BodyPartManager v-show="showBodyPartManager" @close="onBodyPartManagerClose" @save="onBodyPartManagerSave" />
    </view>
  </scroll-view>
</template>

<script setup>
  import {
    ref,
    computed,
    watch,
    onMounted,
    nextTick
  } from 'vue'
  import {
    onShow
  } from '@dcloudio/uni-app'
  import DatePicker from './components/DatePicker.vue'
  import TrainingOverview from './components/TrainingOverview.vue'
  import BodyPartTrend from './components/BodyPartTrend.vue'
  import BodyPartGrid from './components/BodyPartGrid.vue'
  import BodyPartManager from './components/BodyPartManager.vue'
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    computeStats,
    isCategoryId,
    CATEGORY_NAMES,
    MERGED_CATEGORIES,
    computeBodyPartTotalsByDays,
    computeWindowTotalsByBodyPart,
    computeAdaptiveBaselineByBodyPart
  } from './statUtil.js'
  import {
    loadConfig,
    saveConfig,
    getStatusFromConfig,
    computeAdaptiveRange,
    DEFAULT_CONFIG
  } from './volumeHistory.js'

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
  const DIM_TABS = ['days', 'sets', 'volume']
  const currentDimension = ref('days')

  // ============ 部位对比时间窗（近7天 / 两周 / 一个月） ============
  const COMPARE_WINDOWS = { '7d': 7, '14d': 14, '30d': 30 }
  const compareWindow = ref('14d')

  // ============ 侧滑手势 ============
  const swipeStartX = ref(0)
  const swipeStartY = ref(0)
  const swipeStartTime = ref(0)
  const swipeDeltaX = ref(0)
  const swipeViewWidth = ref(0)
  const swipeNoTransition = ref(false)
  const swipeIsTracking = ref(false)

  const selectedBodyPart = ref('chest')
  const allStats = ref(null)
  const dataReady = ref(false)
  const showBodyPartManager = ref(false)

  // 训练基线配置（自适应开关 + 自定义区间），用户显式设置，随备份导出导入
  const baselineConfig = ref(DEFAULT_CONFIG)

  // 自适应基线现算区间（供基线弹窗实时显示，仅自适应开启且有数据时非空）
  const adaptiveRanges = ref({})

  const bodyPartOrder = ref([])
  const bodyPartVisibility = ref({})
  const badgeStatus = ref({})

  const minYear = ref(now.getFullYear())
  const minMonth = ref(1)
  const maxYear = now.getFullYear()
  const maxMonth = now.getMonth() + 1

  const overviewStats = computed(() => {
    if (!allStats.value) return {
      totalDays: 0,
      totalSets: 0,
      totalVolume: 0
    }
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
    // 卡片 sets 显示统一折算为"平均每周"口径（与周基线同口径对照）
    const windowDays = COMPARE_WINDOWS[compareWindow.value]
    const totals = computeBodyPartTotalsByDays({
      days: windowDays,
      refDate: getLatestDate(),
      actionStore,
      dayDataCacheStore,
    })
    const subTotals = totals.subcategoryTotals
    const categoryTotals = totals.categoryTotals
    const mergedMap = {}

    for (const [catId, mergeInfo] of Object.entries(MERGED_CATEGORIES)) {
      const children = mergeInfo.children
      let totalSets = 0
      let totalVolume = 0

      for (const item of subTotals) {
        if (children.includes(item.id)) {
          totalSets += item.sets
          totalVolume += item.volume
        }
      }

      const catItem = categoryTotals.find(c => c.id === catId)

      mergedMap[catId] = {
        id: catId,
        name: MERGED_CATEGORIES[catId].name,
        days: catItem ? catItem.days : 0,
        sets: Math.round(totalSets * 7 / windowDays),
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
        result.push({
          ...item,
          sets: Math.round(item.sets * 7 / windowDays),
        })
      }
    }

    for (const mergedId of mergedIds) {
      const existingIndex = result.findIndex(item => item.id === mergedId)
      if (existingIndex >= 0) {
        result[existingIndex] = {
          ...mergedMap[mergedId]
        }
      } else {
        result.push({
          ...mergedMap[mergedId]
        })
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

  function onBodyPartManagerSave({
    order,
    visibility
  }) {
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
    refreshStats()
  }

  function onCompareWindowChange(window) {
    compareWindow.value = window
  }

  // ============ 侧滑手势 ============
  function onPageTouchStart(e) {
    if (e.touches.length !== 1) return
    swipeStartX.value = e.touches[0].pageX
    swipeStartY.value = e.touches[0].pageY
    swipeStartTime.value = Date.now()
    swipeDeltaX.value = 0
    swipeNoTransition.value = true
    swipeIsTracking.value = true
    uni.createSelectorQuery().select('.content-area').boundingClientRect(rect => {
      if (rect) swipeViewWidth.value = rect.width
    }).exec()
  }

  function onPageTouchMove(e) {
    if (!swipeIsTracking.value || e.touches.length !== 1) return
    const dx = e.touches[0].pageX - swipeStartX.value
    const dy = e.touches[0].pageY - swipeStartY.value
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    // 方向锁：横向必须明显大于纵向
    if (absDx <= absDy * 1.9) return
    swipeDeltaX.value = dx
    if (e.cancelable) e.preventDefault()
  }

  function onPageTouchEnd() {
    if (!swipeIsTracking.value) return
    swipeIsTracking.value = false
    swipeNoTransition.value = false
    const dx = swipeDeltaX.value
    const absDx = Math.abs(dx)
    const dt = Date.now() - swipeStartTime.value
    const distThreshold = swipeViewWidth.value * 0.15
    const speedThreshold = 0.3
    // 阈值判断：距离 > 视图宽度 15% 或 速度 > 0.3px/ms
    if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
      swipeDeltaX.value = 0
      return
    }
    // 方向：右滑 → 上一个(i-1)；左滑 → 下一个(i+1)
    const dir = dx > 0 ? -1 : 1
    const curIdx = DIM_TABS.indexOf(currentDimension.value)
    const nextIdx = curIdx + dir
    if (nextIdx < 0 || nextIdx >= DIM_TABS.length) {
      swipeDeltaX.value = 0
      return
    }
    swipeDeltaX.value = 0
    uni.vibrateShort()
    currentDimension.value = DIM_TABS[nextIdx]
    refreshStats()
  }

  function onBodyPartSelect(bodyPartId) {
    selectedBodyPart.value = bodyPartId
  }

  /**
   * 全局数据最新日期（'YYYY-MM-DD'）：所有部位统一的参考日期。
   * 徽章与时间窗窗口均锚定于此，同一份数据 + 相同 refDate 结果可复现（跨设备一致）。
   */
  function getLatestDate() {
    const dates = dayDataCacheStore.indexedDates
    if (!dates || dates.length === 0) return null
    let max = dates[0]
    for (const d of dates) {
      if (d > max) max = d
    }
    return max
  }

  function refreshStats() {
    allStats.value = computeStats({
      year: currentYear.value,
      month: currentMonth.value - 1,
      periodType: currentPeriod.value,
      actionStore,
      dayDataCacheStore,
    })

    // 徽章：固定 14 天滑动窗口，锚定全局数据最新日期（不随时间窗/月年切换）
    // 判定 = 纯函数（数据 + 显式配置），不读写任何派生状态 → 跨设备可复现
    const refDate = getLatestDate()
    const statusMap = {}
    if (allStats.value && refDate) {
      const windowTotals = computeWindowTotalsByBodyPart({
        refDate,
        days: 14,
        actionStore,
        dayDataCacheStore,
      })
      const cfg = baselineConfig.value || DEFAULT_CONFIG
      let baselineTotals = null
      if (cfg.adaptive) {
        // 自适应基线：当前窗口之前的 8 周（56 天），现算、零持久化
        baselineTotals = computeAdaptiveBaselineByBodyPart({
          refDate,
          windowDays: 14,
          historyDays: 56,
          actionStore,
          dayDataCacheStore,
        })
      }
      // 自适应区间（组/训练日 ±30%），供基线弹窗实时显示；数据不足部位为 null
      const nextAdaptiveRanges = {}
      if (cfg.adaptive && baselineTotals) {
        for (const id of Object.keys(baselineTotals)) {
          nextAdaptiveRanges[id] = computeAdaptiveRange(id, baselineTotals[id])
        }
      }
      adaptiveRanges.value = nextAdaptiveRanges
      for (const item of bodyPartGridData.value) {
        const info = windowTotals[item.id]
        if (!info) continue
        const status = getStatusFromConfig(
          item.id,
          info,
          cfg,
          baselineTotals ? baselineTotals[item.id] : null,
        )
        if (status) {
          statusMap[item.id] = status
        }
      }
    }
    badgeStatus.value = statusMap
  }

  function onBaselineConfigChange(cfg) {
    baselineConfig.value = cfg
    saveConfig(cfg)
    refreshStats()
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
    baselineConfig.value = loadConfig()
    refreshStats()

    nextTick(() => {
      preloadRemainingMonths()
      // v-show 组件已在 DOM 中（display:none），数据就绪后直接显示即可，
      // 不再触发动态插入节点导致的 WebView GPU 合成丢层问题。
      dataReady.value = true
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