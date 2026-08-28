<template>
  <view class="container"
    :class="{ dark: settingsStore.isDarkMode, light: !settingsStore.isDarkMode, 'liquid-glass': settingsStore.liquidGlassEnabled }">
    <!-- 休息日状态展示 -->
    <view v-if="isRestDay" class="rest-day-header">
      <text class="rest-day-text">📅 今日标记为休息日：{{ restReasonStored }}</text>
    </view>

    <!-- 模板选择弹窗 -->
    <TemplateSelector v-if="showChooseTpl" :templates="templates" :date="date" @close="onCloseTemplateSelector"
      @select-template="onSelectTemplate" @save-aerobic="onSaveAerobic" @save-rest="onSaveRestDay" />

    <!-- 动作卡片列表 -->
    <scroll-view class="action-list" scroll-y="true" v-if="!isRestDay && !showChooseTpl">
      <ActionCard v-for="(actName, idx) in chosenActions" :key="actName" :action-name="actName"
        :entries="actionEntries[idx]" :diff="diffs[idx]" :latest-record="actionLatestRecordCache[actName] || null"
        :bubble-fill="settingsStore.bubbleFill" :is-bodyweight="isBodyweightAction(actName)"
        @confirm-entry="(data) => onConfirmEntry(idx, data)"
        @update-entry="(data) => onUpdateEntry(idx, data)" @delete-action="handleDeleteAction(idx)"
        @delete-entry="(eIdx) => handleDeleteEntry(idx, eIdx)" @edit-entry="(eIdx) => openEditEntryPopup(idx, eIdx)"
        @go-history="goHistory(idx)" />
      <view class="list-bottom-space"></view>
    </scroll-view>

    <!-- 底部按钮行 -->
    <view class="save-row" v-if="!isRestDay && !showChooseTpl">
      <HeartRateToggle
        :hr="hr" :kcal-total="hrKcalTotal" :duration-sec="hrDurationSec"
        :zone="hrZone" :zones="hrZones" :connected="hrConnected"
        @toggle-connect="onToggleHrConnect" @request-settings="onOpenHrSettings"
      >
        <template #actions>
          <view class="minimal-timer-btn" @click="timerDuration = lastManualTimerDuration || settingsStore.heavyTimerDuration; showTimer = true">
            <text class="mini-icon">⏱</text><text class="mini-text">开始计时休息</text>
          </view>
          <view class="minimal-settings-btn" @click="showSettings = true">
            <text class="mini-icon">⚙</text><text class="mini-text">设置</text>
          </view>
        </template>
      </HeartRateToggle>
    </view>

    <!-- 计时器组件 -->
    <TimerModal :visible="showTimer" :default-duration="timerDuration" :quick-settings="quickTimerSettings"
      @close="showTimer = false" @complete="onTimerComplete" @time-change="onTimerTimeChange" />

    <!-- 设置组件 -->
    <DaySettings :visible="showSettings" :available-actions="availableActionNames" :chosen-actions="chosenActions"
      :settings="settingsState" @close="showSettings = false" @add-action="onAddAction" @save-sort="onSaveSort"
      @toggle-auto-timer="settingsStore.toggleAutoStartTimer()" @toggle-auto-fill="settingsStore.toggleAutoFillData()"
      @toggle-bubble-fill="settingsStore.toggleBubbleFill()"
      @set-heavy-timer="(v) => settingsStore.setHeavyTimerDuration(v)"
      @set-light-timer="(v) => settingsStore.setLightTimerDuration(v)" @export-data="onExportData"
      @import-data="onImportData" @open-body-profile="showBodyProfile=true" />

    <!-- 导入数据弹窗 -->
    <ImportDataModal
      :visible="showImportModal"
      :action-names="availableActionNames"
      @close="showImportModal = false"
      @confirm="onImportConfirm"
    />

    <!-- 编辑记录弹窗 -->
    <EditEntryPopup :visible="showEditEntryPopup" :entry-idx="editEntryInfo.entryIdx"
      :entry="editEntryInfo.actionIdx >= 0 && editEntryInfo.entryIdx >= 0 ? actionEntries[editEntryInfo.actionIdx]?.[editEntryInfo.entryIdx] : null"
      @close="closeEditEntryPopup" @save="onEditEntrySave" />

    <BodyProfilePopup :visible="showBodyProfile" @close="showBodyProfile=false" />
  </view>
</template>

<script>
  import {
    useTemplateStore
  } from '@/stores/template'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    formatDate,
    formatDateStr
  } from '@/utils/theme.js'
  import {
    buildEntry,
    normalizeEntries,
    getTotalWeight,
    ENTRY_TYPE,
    createPlaceholderEntry,
    isPlaceholderEntry
  } from '@/utils/dayHelper.js'
  import TimerModal from '@/components/TimerModal.vue'
  import TemplateSelector from '@/components/TemplateSelector.vue'
  import ActionCard from '@/components/ActionCard.vue'
  import DaySettings from '@/components/DaySettings.vue'
  import ImportDataModal from '@/components/ImportDataModal.vue'
  import EditEntryPopup from '@/components/EditEntryPopup.vue'
  import BodyProfilePopup from '@/components/BodyProfilePopup.vue'
  import HeartRateToggle from '@/components/HeartRateToggle.vue'
  import { createBleHeartRate } from '@/utils/bleHeartRate.js'
  import { calcKcalPerMin, calcSessionKcal, estimateAvgHr } from '@/utils/calorieEstimate.js'
  import { getZones, getZone } from '@/utils/heartRateZones.js'
  import { useUserProfileStore } from '@/stores/userProfile.js'
  import { mergeImportData, getNewActions, applyMatchSelections } from '@/utils/dataMerger'
  import { checkAndNotifyTrainingDay, notifyRestEnd } from '@/utils/notification.js'

  export default {
    components: {
      TimerModal,
      TemplateSelector,
      ActionCard,
      DaySettings,
      ImportDataModal,
      EditEntryPopup,
      BodyProfilePopup,
      HeartRateToggle
    },
    data() {
      return {
        templateStore: useTemplateStore(),
        dayDataCacheStore: useDayDataCacheStore(),
        actionStore: useActionStore(),
        settingsStore: useDaySettingsStore(),
        date: '',
        DAYDATA_PREFIX: 'fitness_daydata_',
        templates: [],
        // 页面状态
        showChooseTpl: true,
        isRestDay: false,
        restReasonStored: '',
        chosenTplName: '',
        chosenTplColor: '',
        chosenActions: [],
        actionEntries: [],
        diffs: [],
        availableActionNames: [],
        // 弹窗状态
        showTimer: false,
        timerDuration: 180,
        lastManualTimerDuration: null,
        showSettings: false,
        showEditEntryPopup: false,
        showImportModal: false,
        showBodyProfile: false,
        // 心率与热量累计
        hrBle: null,            // createBleHeartRate() 实例
        hrConnected: false,
        hr: null,                // 当前心率
        hrSamples: [],           // [{hr, durMin}] 累计采样
        hrKcalTotal: 0,
        hrDurationSec: 0,
        hrTimer: null,           // 每分钟累计定时器
        hrStartTs: 0,            // 训练开始时间戳
        showDeviceScan: false,
        editEntryInfo: {
          actionIdx: -1,
          entryIdx: -1
        },
        // 差异缓存
        actionLatestRecordCache: {},
        calcDiffTimer: null,
        saveTimer: null,
        loadTimer: null,
        pendingTplName: '',
      }
    },
    computed: {
      settingsState() {
        return {
          autoStartTimer: this.settingsStore.autoStartTimer,
          autoFillData: this.settingsStore.autoFillData,
          bubbleFill: this.settingsStore.bubbleFill,
          heavyTimerDuration: this.settingsStore.heavyTimerDuration,
          lightTimerDuration: this.settingsStore.lightTimerDuration,
        }
      },
      quickTimerSettings() {
        const fmt = (s) => {
          const m = Math.floor(s / 60)
          return `${m}:${String(s % 60).padStart(2, '0')}`
        }
        const h = this.settingsStore.heavyTimerDuration
        const l = this.settingsStore.lightTimerDuration
        return [{
            label: '胸背腿',
            seconds: h,
            timeText: fmt(h)
          },
          {
            label: '肩手',
            seconds: l,
            timeText: fmt(l)
          },
        ]
      },
      hrZones() {
        const p = useUserProfileStore()
        return p.age ? getZones(p.age) : []
      },
      hrZone() {
        const p = useUserProfileStore()
        if (!p.age || this.hr == null) return null
        return getZone(this.hr, p.age)
      },
    },
    watch: {},
    onLoad(options) {
      uni.showLoading({
        title: '加载中...',
        mask: true
      })
      this.dayDataCacheStore.loadIndex()
      this.settingsStore.load()
      if (options.date) {
        this.date = options.date
      } else {
        this.date = formatDate(new Date())
      }
      if (options.tpl) {
        this.pendingTplName = decodeURIComponent(options.tpl)
      }
    },
    mounted() {
      this.templateStore.load()
      this.actionStore.load()
      this.loadDayData()
      useUserProfileStore().load()

      // 监听数据更新事件
      uni.$on('day-data-updated', () => {
        this.loadDayData()
      })

      // 初始化蓝牙心率（无设备时静默不崩）
      this.initHeartRate()
      // 训练日提醒（无设备时静默不崩）
      checkAndNotifyTrainingDay()
    },
    beforeUnmount() {
      this.clearAllTimers()
      this.stopHrAccumulate()
      // 训练结束写入心率与热量累计到当日 dayData
      if (this.hrConnected && this.hrSamples.length > 0) {
        const hrPayload = {
          heartRateAvg: estimateAvgHr(this.hrSamples),
          caloriesTotal: Math.round(this.hrKcalTotal),
          durationSec: this.hrDurationSec,
        }
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = { ...raw, ...hrPayload }
        this.dayDataCacheStore.saveDayData(this.date, dayData)
      }
      if (this.hrBle) this.hrBle.disconnect()
      uni.$off('day-data-updated')
    },
    onShow() {
      this.checkPendingManageActions()
      if (!this.showChooseTpl) this.loadDayData()
    },
    onHide() {},
    onUnload() {
      this.clearAllTimers()
    },
    methods: {
      formatDate,
      formatDateStr,

      clearAllTimers() {
        if (this.saveTimer) clearTimeout(this.saveTimer)
        if (this.calcDiffTimer) clearTimeout(this.calcDiffTimer)
        if (this.loadTimer) clearTimeout(this.loadTimer)
        this.saveTimer = this.calcDiffTimer = this.loadTimer = null
      },

      onTimerTimeChange(newDuration) {
        this.lastManualTimerDuration = newDuration
      },

      onTimerComplete() {
        this.showTimer = false
        notifyRestEnd()
      },

      /* ========== 数据加载 ========== */
      loadDayData() {
        if (this.loadTimer) clearTimeout(this.loadTimer)
        this.loadTimer = setTimeout(() => this._loadDayData(), 50)
      },
      _loadDayData() {
        uni.setNavigationBarTitle({
          title: this.date.replace(/-/g, '/')
        })
        this.templates = this.templateStore.templates
        this.availableActionNames = this.actionStore.actionNames
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = {
          templates: raw.templates || {},
          actions: raw.actions || {},
          entries: raw.entries || {},
          isRestDay: raw.isRestDay || false,
        }
        this.isRestDay = dayData.isRestDay
        this.restReasonStored = dayData.isRestDay ? (Object.keys(dayData.templates)[0] || '') : ''
        const names = Object.keys(dayData.templates)

        if (names.length === 0 && !this.isRestDay) {
          // 没有模板数据，但如果传入了 tpl 参数，自动应用
          if (this.pendingTplName) {
            this.onSelectTemplate(this.pendingTplName)
            this.pendingTplName = ''
            return
          }
          this.showChooseTpl = true
          uni.hideLoading()
          return
        }

        this.showChooseTpl = false
        if (this.isRestDay) {
          uni.hideLoading()
          return
        }

        // 加载模板和动作数据
        const tplName = names[names.length - 1]
        this.chosenTplName = tplName
        const tplIdx = this.templates.findIndex(t => t.name === tplName)
        this.chosenTplColor = tplIdx !== -1 ? this.templates[tplIdx].color : ''
        const tplInfo = dayData.templates[tplName] || {}
        const defaultActions = (tplIdx !== -1) ? this.templates[tplIdx].actions.slice() : []
        const dayActionOrder = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : defaultActions
        this.chosenActions = dayActionOrder
        this.diffs = this.chosenActions.map(() => null)
        const templateActionSets = (tplIdx !== -1 ? this.templates[tplIdx].actionSets : null) || {}
        const defaultSetCount = 4
        let needSave = false
        this.actionEntries = this.chosenActions.map(name => {
          const arr = dayData.entries[name]
          if (Array.isArray(arr) && arr.length > 0) {
            const normalized = normalizeEntries(arr)
            dayData.actions[name] = getTotalWeight(normalized)
            return normalized
          }
          // entries 为空或不存在，根据模板 actionSets 生成占位符
          const targetSets = templateActionSets[name] || defaultSetCount
          const placeholders = []
          for (let i = 0; i < targetSets; i++) {
            placeholders.push(createPlaceholderEntry())
          }
          dayData.entries[name] = placeholders
          dayData.actions[name] = 0
          needSave = true
          return placeholders
        })
        if (needSave) {
          this.dayDataCacheStore.saveDayData(this.date, dayData)
        }

        this.$nextTick(() => {
          // 如果有从首页传来的待选模板，且与当前不同，则自动切换
          if (this.pendingTplName && this.pendingTplName !== this.chosenTplName) {
            this.onSelectTemplate(this.pendingTplName)
          }
          this.pendingTplName = ''
          this.calcAllDiffs()
          uni.hideLoading()
        })
      },

      /* ========== 差异计算 ========== */
      calcAllDiffs() {
        if (!this.chosenActions || this.chosenActions.length === 0) return
        const todayDateStr = this.formatDateStr(new Date(this.date))
        const records = this.dayDataCacheStore.batchGetLatestRecords(this.chosenActions, todayDateStr)
        this.chosenActions.forEach((actName, idx) => {
          const record = records[actName] || null
          this.actionLatestRecordCache[actName] = record
          if (!record) {
            this.$set(this.diffs, idx, {
              text: '无历史记录',
              class: 'diff-neutral'
            })
          } else {
            this.updateDiffWithLatestRecord(idx, record)
          }
        })
      },
      calcActionLatestRecord(actName) {
        const todayDateStr = this.formatDateStr(new Date(this.date))
        const records = this.dayDataCacheStore.batchGetLatestRecords([actName], todayDateStr)
        const record = records[actName] || null
        this.actionLatestRecordCache[actName] = record
        return record
      },
      calcDiffForSingleAction(idx) {
        const actName = this.chosenActions[idx]
        let record = this.actionLatestRecordCache[actName]
        if (record === undefined) {
          record = this.calcActionLatestRecord(actName)
        }
        if (!record) {
          this.$set(this.diffs, idx, {
            text: '无历史记录',
            class: 'diff-neutral'
          })
        } else {
          this.updateDiffWithLatestRecord(idx, record)
        }
      },
      updateDiffWithLatestRecord(idx, latestRecord) {
        const latestTotal = latestRecord.total
        const todayTotal = getTotalWeight(this.actionEntries[idx])
        if (todayTotal > latestTotal) {
          this.$set(this.diffs, idx, {
            text: `+${Math.round((todayTotal - latestTotal) * 100) / 100}`,
            class: 'diff-up'
          })
        } else if (todayTotal < latestTotal) {
          this.$set(this.diffs, idx, {
            text: `-${Math.round((latestTotal - todayTotal) * 100) / 100}`,
            class: 'diff-down'
          })
        } else {
          this.$set(this.diffs, idx, {
            text: '持平',
            class: 'diff-neutral'
          })
        }
      },
      debounceCalcDiffs() {
        if (this.calcDiffTimer) clearTimeout(this.calcDiffTimer)
        this.calcDiffTimer = setTimeout(() => this.calcAllDiffs(), 300)
      },

      /* ========== 数据保存 ========== */
      saveEntryToStorage(idx) {
        const actName = this.chosenActions[idx]
        const todayDateStr = this.formatDateStr(new Date(this.date))
        const raw = this.dayDataCacheStore.getDayData(todayDateStr)
        const dayData = {
          templates: raw.templates || {},
          actions: raw.actions || {},
          entries: raw.entries || {},
        }
        dayData.entries[actName] = this.actionEntries[idx] || []
        dayData.actions[actName] = getTotalWeight(this.actionEntries[idx])
        const tplInfo = dayData.templates[this.chosenTplName] || {
          totalWeight: 0,
          actionWeights: {},
          actionOrder: [...this.chosenActions]
        }
        tplInfo.actionWeights[actName] = dayData.actions[actName]
        tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => a + b, 0)
        dayData.templates[this.chosenTplName] = tplInfo
        this.dayDataCacheStore.saveDayData(todayDateStr, dayData)
        delete this.actionLatestRecordCache[actName]
        this.calcActionLatestRecord(actName)
      },
      debounceSaveToStorage(idx) {
        if (this.saveTimer) clearTimeout(this.saveTimer)
        this.saveTimer = setTimeout(() => this.saveEntryToStorage(idx), 200)
      },
      persistOrder() {
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        }
        const tplInfo = dayData.templates[this.chosenTplName] || {}
        tplInfo.actionOrder = [...this.chosenActions]
        dayData.templates[this.chosenTplName] = tplInfo
        this.dayDataCacheStore.saveDayData(this.date, dayData)
      },

      /* ========== 卡片事件处理 ========== */
      isBodyweightAction(actName) {
        const action = this.actionStore.getActionByName(actName)
        return action ? action.bodyweightMode : false
      },
      onConfirmEntry(idx, {
        type,
        stages,
        bwMode,
      }) {
        const actName = this.chosenActions[idx]
        const isUnilateral = this.actionStore.getActionByName(actName)?.isUnilateral || false
        const entry = buildEntry(type, stages, isUnilateral, bwMode)
        if (!entry) {
          uni.showToast({
            title: '请输入次数',
            icon: 'none'
          })
          return
        }

        const currentEntries = this.actionEntries[idx] || []

        const placeholderIdx = currentEntries.findIndex(e => isPlaceholderEntry(e))
        if (placeholderIdx !== -1) {
          this.$set(this.actionEntries[idx], placeholderIdx, entry)
        } else {
          this.$set(this.actionEntries, idx, [...currentEntries, entry])
        }

        Promise.resolve().then(() => this.saveEntryToStorage(idx))
        this.calcDiffForSingleAction(idx)
        if (this.settingsStore.autoStartTimer) {
          this.timerDuration = this.getTimerDurationForAction(actName)
          setTimeout(() => {
            this.showTimer = true
          }, 300)
        }
      },
      onUpdateEntry(idx, {
        entryIdx,
        entry
      }) {
        const entries = this.actionEntries[idx]
        if (!entries || entryIdx >= entries.length) return
        this.$set(entries, entryIdx, entry)
        this.$set(this.actionEntries, idx, [...entries])
        Promise.resolve().then(() => this.saveEntryToStorage(idx))
        this.calcDiffForSingleAction(idx)
      },
      getTimerDurationForAction(actName) {
        const action = this.actionStore.getActionByName(actName)
        if (!action) return this.settingsStore.heavyTimerDuration
        const cats = action.categories || []
        const heavyCats = ['chest', 'back', 'legs']
        const lightCats = ['shoulders', 'arms']
        if (cats.some(c => heavyCats.includes(c))) return this.settingsStore.heavyTimerDuration
        if (cats.some(c => lightCats.includes(c))) return this.settingsStore.lightTimerDuration
        return this.settingsStore.heavyTimerDuration
      },
      handleDeleteAction(idx) {
        uni.showModal({
          title: '删除动作',
          content: `确定要删除 "${this.chosenActions[idx]}" 吗？此操作仅删除当天动作，不会影响模板。`,
          success: (res) => {
            if (res.confirm) this.removeActionFromDay(idx)
          },
        })
      },
      handleDeleteEntry(aIdx, eIdx) {
        const entry = this.actionEntries[aIdx]?.[eIdx]
        if (!entry) return
        const isPlaceholder = isPlaceholderEntry(entry)
        const content = isPlaceholder ? `确定删除 第${eIdx + 1}组 占位符？` : `确定删除 第${eIdx + 1}组 记录？`
        uni.showModal({
          title: '删除记录',
          content,
          success: (res) => {
            if (res.confirm) this.removeEntry(aIdx, eIdx)
          },
        })
      },
      removeEntry(aIdx, eIdx) {
        const removed = this.actionEntries[aIdx].splice(eIdx, 1)[0]
        const isPlaceholder = isPlaceholderEntry(removed)
        // 移除删除占位符后再添加新占位符的逻辑
        // 原来的逻辑是: if (isPlaceholder) { this.$set(this.actionEntries, aIdx, [...this.actionEntries[aIdx], createPlaceholderEntry()]) }
        this.debounceSaveToStorage(aIdx)
        this.debounceCalcDiffs()
        const msg = isPlaceholder ? `已删除占位符` : `已删除：${removed.input}`
        uni.showToast({
          title: msg,
          icon: 'success',
          duration: 1000
        })
      },
      removeActionFromDay(idx) {
        const actNameToRemove = this.chosenActions[idx]
        this.chosenActions.splice(idx, 1)
        this.diffs.splice(idx, 1)
        this.actionEntries.splice(idx, 1)
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        }
        delete dayData.entries[actNameToRemove]
        delete dayData.actions[actNameToRemove]
        const actionWeights = {}
        this.chosenActions.forEach(name => {
          const arr = Array.isArray(dayData.entries[name]) ? dayData.entries[name] : []
          actionWeights[name] = arr.reduce((s, i) => s + (i.total || 0), 0)
        })
        const tplInfo = dayData.templates[this.chosenTplName] || {
          actionWeights: {},
          totalWeight: 0
        }
        tplInfo.actionWeights = { ...actionWeights }
        tplInfo.totalWeight = Object.values(actionWeights).reduce((a, b) => a + b, 0)
        const order = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : []
        tplInfo.actionOrder = order.filter(name => name !== actNameToRemove)
        dayData.templates[this.chosenTplName] = tplInfo
        this.dayDataCacheStore.saveDayData(this.date, dayData)
        uni.showToast({
          title: `已删除动作：${actNameToRemove}`,
          icon: 'success'
        })
        this.calcAllDiffs()
      },
      goHistory(idx) {
        const actName = this.chosenActions[idx]
        uni.navigateTo({
          url: `../actionHistory/actionHistory?action=${encodeURIComponent(actName)}`
        })
      },

      /* ========== 编辑记录弹窗 ========== */
      openEditEntryPopup(actionIdx, entryIdx) {
        this.editEntryInfo = { actionIdx, entryIdx }
        this.showEditEntryPopup = true
      },
      closeEditEntryPopup() {
        this.showEditEntryPopup = false
        this.editEntryInfo = { actionIdx: -1, entryIdx: -1 }
      },
      onEditEntrySave({ stages, type }) {
        const { actionIdx, entryIdx } = this.editEntryInfo
        const actName = this.chosenActions[actionIdx]
        const isUnilateral = this.actionStore.getActionByName(actName)?.isUnilateral || false
        const existingEntry = this.actionEntries[actionIdx]?.[entryIdx]
        const bwMode = existingEntry?.bwMode
        const entry = buildEntry(type, stages, isUnilateral, bwMode)
        if (!entry) return
        this.$set(this.actionEntries[actionIdx], entryIdx, entry)
        this.saveEntryToStorage(actionIdx)
        this.calcDiffForSingleAction(actionIdx)
        this.closeEditEntryPopup()
        uni.showToast({ title: '修改成功', icon: 'success', duration: 1000 })
      },

      /* ========== 模板选择事件 ========== */
      onSelectTemplate(name) {
        const idx = this.templates.findIndex(t => t.name === name)
        if (idx === -1) return

        console.log('【选择模板】', name)
        console.log('【模板数据】', JSON.stringify(this.templates[idx]))
        console.log('【动作组数】', JSON.stringify(this.templates[idx].actionSets))

        this.chosenTplName = this.templates[idx].name
        this.chosenTplColor = this.templates[idx].color
        const key = this.DAYDATA_PREFIX + this.date
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = typeof raw === 'object' ? { ...raw } : {}
        dayData.templates = dayData.templates || {}
        const dayTpl = dayData.templates[this.chosenTplName] || {}
        let available = []
        if (Array.isArray(dayTpl.actionOrder) && dayTpl.actionOrder.length > 0) {
          available = dayTpl.actionOrder.slice()
        } else {
          available = this.templates[idx].actions.slice() || []
          dayTpl.actionOrder = available.slice()
        }
        dayTpl.actionWeights = dayTpl.actionWeights || {}
        const templateActionSets = this.templates[idx].actionSets || {}
        console.log('【获取到的动作组数】', JSON.stringify(templateActionSets))

        dayData.templates[this.chosenTplName] = {
          ...dayTpl,
          actionOrder: dayTpl.actionOrder,
          actionWeights: dayTpl.actionWeights
        }
        this.chosenActions = available
        this.diffs = available.map(() => null)

        const defaultSetCount = 4
        console.log('【默认组数】', defaultSetCount)

        if (this.settingsStore.autoFillData) {
          this.actionEntries = available.map(actName => {
            const record = this.calcActionLatestRecord(actName)
            const targetSets = templateActionSets[actName] || defaultSetCount
            if (record && record.entry && record.entry.length > 0) {
              const normalized = normalizeEntries(record.entry)
              const filled = [...normalized]
              while (filled.length < targetSets) {
                filled.push(createPlaceholderEntry())
              }
              while (filled.length > targetSets) {
                filled.pop()
              }
              return filled
            }
            const placeholders = []
            for (let i = 0; i < targetSets; i++) {
              placeholders.push(createPlaceholderEntry())
            }
            return placeholders
          })
          dayData.entries = dayData.entries || {}
          dayData.actions = dayData.actions || {}
          available.forEach((actName, i) => {
            dayData.entries[actName] = this.actionEntries[i]
            dayData.actions[actName] = getTotalWeight(this.actionEntries[i])
            dayTpl.actionWeights[actName] = dayData.actions[actName]
          })
          dayTpl.totalWeight = Object.values(dayTpl.actionWeights).reduce((a, b) => a + b, 0)
          dayData.templates[this.chosenTplName] = dayTpl
        } else {
          this.actionEntries = available.map(actName => {
            const targetSets = templateActionSets[actName] || defaultSetCount
            console.log('【生成占位符】动作:', actName, '组数:', targetSets)
            const placeholders = []
            for (let i = 0; i < targetSets; i++) {
              placeholders.push(createPlaceholderEntry())
            }
            return placeholders
          })
          dayData.entries = dayData.entries || {}
          dayData.actions = dayData.actions || {}
          available.forEach((actName, i) => {
            dayData.entries[actName] = this.actionEntries[i]
            dayData.actions[actName] = 0
            dayTpl.actionWeights[actName] = 0
          })
          dayTpl.totalWeight = 0
          dayData.templates[this.chosenTplName] = dayTpl
        }

        this.dayDataCacheStore.saveDayData(this.date, dayData)

        this.showChooseTpl = false
        uni.showLoading({
          title: '正在计算对比...'
        })
        this.$nextTick(() => {
          this.calcAllDiffs()
          uni.hideLoading()
        })
      },
      onSaveAerobic({ name, time }) {
        // 保存有氧名称到模板 store（用于常用有氧历史）
        this.templateStore.addAerobic(name)
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        }
        dayData.templates[name] = {
          totalWeight: time,
          actionWeights: {},
          isAerobic: true
        }
        this.dayDataCacheStore.saveDayData(this.date, dayData)
        uni.showToast({ title: '已添加有氧', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 500)
      },
      onSaveRestDay(reason) {
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = { ...raw }
        dayData.isRestDay = true
        dayData.templates = {
          [reason]: { totalWeight: 0, actionWeights: {} }
        }
        this.dayDataCacheStore.saveDayData(this.date, dayData)
        uni.showToast({ title: '已标记休息日', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 500)
      },

      onCloseTemplateSelector() {
        this.showChooseTpl = false
        // 只有在没有选择任何模板且没有数据时才返回首页
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const hasData = raw.templates && Object.keys(raw.templates).length > 0
        if (!hasData && !this.chosenTplName) {
          uni.navigateBack()
        }
      },

      checkPendingManageActions() {
        const raw = uni.getStorageSync('_pendingManageActions')
        console.log('[day] checkPendingManageActions, raw:', raw)
        if (!raw) return
        uni.removeStorageSync('_pendingManageActions')
        try {
          const newOrder = JSON.parse(raw)
          console.log('[day] checkPendingManageActions, newOrder:', newOrder)
          if (Array.isArray(newOrder)) {
            this.onSaveSort(newOrder)
          }
        } catch (e) {
          console.error('[day] checkPendingManageActions error:', e)
        }
      },
      /* ========== 设置组件事件 ========== */
      onAddAction(actName) {
        if (!this.chosenTplName) {
          uni.showToast({
            title: '请先选择训练模板',
            icon: 'none'
          })
          return
        }
        this.chosenActions.push(actName)
        this.diffs.push({ text: '未记录', class: 'diff-neutral' })
        this.actionEntries.push([])
        const raw = this.dayDataCacheStore.getDayData(this.date)
        const dayData = {
          ...raw,
          templates: raw.templates || {},
          actions: raw.actions || {},
          entries: raw.entries || {}
        }
        dayData.entries[actName] = dayData.entries[actName] || []
        dayData.actions[actName] = dayData.actions[actName] || 0
        const tplInfo = dayData.templates[this.chosenTplName] || {
          totalWeight: 0,
          actionWeights: {},
          actionOrder: [...this.chosenActions]
        }
        tplInfo.actionWeights[actName] = 0
        tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => (a + (Number(b) || 0)), 0)
        tplInfo.actionOrder = [...this.chosenActions]
        dayData.templates[this.chosenTplName] = tplInfo
        this.dayDataCacheStore.saveDayData(this.date, dayData)
        uni.showToast({ title: `已添加：${actName}`, icon: 'success' })
      },
      onSaveSort(newOrder) {
        console.log('[day] onSaveSort called, newOrder:', newOrder)
        console.log('[day] onSaveSort, current chosenActions:', [...this.chosenActions])
        console.log('[day] onSaveSort, chosenTplName:', this.chosenTplName)
        // 先把新增的动作同步到 chosenActions / actionEntries / diffs
        const currentSet = new Set(this.chosenActions)
        newOrder.forEach(name => {
          if (!currentSet.has(name)) {
            this.chosenActions.push(name)
            this.actionEntries.push([])
            this.diffs.push({
              text: '未记录',
              class: 'diff-neutral'
            })
            // 持久化新动作
            const raw = this.dayDataCacheStore.getDayData(this.date)
            const dayData = {
              ...raw,
              templates: raw.templates || {},
              actions: raw.actions || {},
              entries: raw.entries || {}
            }
            dayData.entries[name] = dayData.entries[name] || []
            dayData.actions[name] = dayData.actions[name] || 0
            const tplInfo = dayData.templates[this.chosenTplName] || {
              totalWeight: 0,
              actionWeights: {},
              actionOrder: [...this.chosenActions]
            }
            tplInfo.actionWeights[name] = 0
            tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => (a + (Number(b) || 0)), 0)
            tplInfo.actionOrder = [...this.chosenActions]
            dayData.templates[this.chosenTplName] = tplInfo
            this.dayDataCacheStore.saveDayData(this.date, dayData)
          }
        })

        // 按 newOrder 重排
        const orderMap = newOrder.map(name => this.chosenActions.indexOf(name))
        this.chosenActions = [...newOrder]
        this.actionEntries = orderMap.map(i => [...this.actionEntries[i]])
        this.diffs = orderMap.map(i => this.diffs[i] ? {
          ...this.diffs[i]
        } : null)
        this.persistOrder()
        this.showSettings = false
        uni.showToast({
          title: '排序已保存',
          icon: 'success',
          duration: 1000
        })
      },
      onExportData() {
        if (!this.chosenActions || this.chosenActions.length === 0) {
          uni.showToast({
            title: '暂无训练数据',
            icon: 'none'
          })
          return
        }
        const d = new Date(this.date)
        const dateLine = `${d.getMonth() + 1}月${d.getDate()}日${this.chosenTplName ? '：' + this.chosenTplName : ''}`
        let exportText = dateLine + '\n'
        this.chosenActions.forEach((actName, actionIdx) => {
          const entries = this.actionEntries[actionIdx] || []
          const filledEntries = entries.filter(e => !e.isPlaceholder)
          if (filledEntries.length === 0) return
          exportText += `${actionIdx + 1}. ${actName}\n`
          filledEntries.forEach((entry, entryIdx) => {
            const stage = entry.stages && entry.stages[0]
            if (stage) {
              const reps = stage.reps
              const weight = stage.weight
              exportText += `第${entryIdx + 1}组：${reps}次 × ${weight}kg\n`
            }
          })
          exportText += '\n'
        })
        if (!exportText.trim()) {
          uni.showToast({
            title: '暂无有效训练记录',
            icon: 'none'
          })
          return
        }
        uni.setClipboardData({
          data: exportText.trim(),
          success: () => {
            uni.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
          },
          fail: () => {
            uni.showToast({
              title: '复制失败',
              icon: 'none'
            })
          }
        })
      },

      /* ========== 导入数据 ========== */
      onImportData() {
        this.showImportModal = true
      },

      onImportConfirm(importedData) {
        this.showImportModal = false

        if (!importedData || importedData.length === 0) {
          uni.showToast({
            title: '没有可导入的数据',
            icon: 'none'
          })
          return
        }

        const existingData = {
          entries: {},
          actions: {}
        }

        // 准备现有数据
        this.chosenActions.forEach((actName, idx) => {
          existingData.entries[actName] = this.actionEntries[idx] || []
          existingData.actions[actName] = this.actionEntries[idx].reduce(
            (sum, entry) => sum + (entry.total || 0), 0
          )
        })

        // 合并数据（传入当天模板动作列表）
        const { mergedData, matchResults } = mergeImportData(
          existingData,
          importedData,
          this.availableActionNames,
          this.chosenActions
        )

        // 如果有多个匹配结果，需要用户选择
        if (matchResults.length > 0) {
          this.showMatchSelection(matchResults, mergedData)
        } else {
          // 检查新动作
          this.handleNewActions(mergedData)
        }
      },

      showMatchSelection(matchResults, mergedData) {
        // 存储待处理的匹配结果
        this._pendingMatchResults = matchResults
        this._pendingMergedData = mergedData
        this._matchSelections = matchResults.map(m => m.selected)

        // 构建选择提示
        const firstMatch = matchResults[0]
        const options = firstMatch.matches.map((name, idx) => ({
          name,
          checked: idx === 0
        }))

        // 显示选择弹窗（逐个处理）
        this.showSingleMatchSelection(0)
      },

      showSingleMatchSelection(index) {
        const matchResults = this._pendingMatchResults
        if (!matchResults || index >= matchResults.length) {
          // 所有选择完成，应用合并数据
          const mergedData = this.applyMatchSelectionsToData()
          this.handleNewActions(mergedData)
          return
        }

        const current = matchResults[index]
        const options = current.matches.map(name => name)

        uni.showActionSheet({
          itemList: options,
          success: (res) => {
            this._matchSelections[index] = current.matches[res.tapIndex]
            // 处理下一个
            this.showSingleMatchSelection(index + 1)
          },
          fail: () => {
            // 用户取消，取消整个导入
            uni.showToast({
              title: '已取消导入',
              icon: 'none'
            })
          }
        })
      },

      applyMatchSelectionsToData() {
        return applyMatchSelections(
          this._pendingMergedData,
          this._pendingMatchResults,
          this._matchSelections
        )
      },

      handleNewActions(mergedData) {
        // 检查新动作
        const newActions = getNewActions(mergedData, this.chosenActions)

        if (newActions.length > 0) {
          // 询问是否添加新动作到模板
          uni.showModal({
            title: '发现新动作',
            content: `发现新动作：${newActions.join('、')}，是否添加到模板？`,
            success: (res) => {
              if (res.confirm) {
                // 添加新动作到模板
                newActions.forEach(actName => {
                  this.onAddAction(actName)
                })
              }
              // 应用合并数据
              this.applyMergedData(mergedData)
            }
          })
        } else {
          // 直接应用合并数据
          this.applyMergedData(mergedData)
        }
      },

      applyMergedData(mergedData) {
        // 更新页面数据 - 导入的数据优先填充占位符
        this.chosenActions.forEach((actName, idx) => {
          const mergedEntries = mergedData.entries[actName]
          if (!mergedEntries || mergedEntries.length === 0) return

          const currentEntries = [...(this.actionEntries[idx] || [])]

          // 分离：当前有效条目 vs 占位符
          const existingValid = currentEntries.filter(e => !isPlaceholderEntry(e))
          const placeholderCount = currentEntries.filter(e => isPlaceholderEntry(e)).length

          // mergedEntries 已包含：现有有效条目 + 新导入条目（无占位符）
          // 提取新导入的条目（mergedEntries 中超出 existingValid 数量的部分）
          const newEntries = mergedEntries.slice(existingValid.length)

          // 构建结果：先放现有有效条目，再用新导入数据填充占位符位置
          const result = [...existingValid]

          // 用新导入数据填充占位符
          for (let i = 0; i < placeholderCount && i < newEntries.length; i++) {
            result.push(newEntries[i])
          }

          // 如果新导入数据比占位符多，追加到末尾
          for (let i = placeholderCount; i < newEntries.length; i++) {
            result.push(newEntries[i])
          }

          // 如果占位符比新导入数据多，补回剩余占位符
          for (let i = newEntries.length; i < placeholderCount; i++) {
            result.push(createPlaceholderEntry())
          }

          this.$set(this.actionEntries, idx, result)
        })

        // 保存到本地存储
        this.chosenActions.forEach((actName, idx) => {
          this.saveEntryToStorage(idx)
        })

        // 重新计算差异
        this.calcAllDiffs()

        uni.showToast({
          title: '导入成功',
          icon: 'success'
        })
      },

      /* ========== 心率与热量累计 ========== */
      async initHeartRate() {
        this.hrBle = createBleHeartRate()
        const ok = await this.hrBle.initAdapter()
        if (!ok) { this.hrConnected = false; return }
        this.hrBle.onHeartRate((h) => { this.hr = h })
        this.hrBle.onStateChange((s) => {
          this.hrConnected = (s === 'connected')
          if (s === 'connected' && !this.hrTimer && this.hrStartTs === 0) this.startHrAccumulate()
        })
        // 自动连上次设备
        const last = this.hrBle.getLastDeviceId()
        if (last) this.onToggleHrConnect()
      },
      onToggleHrConnect() {
        if (this.hrConnected) return
        if (!this.hrBle) this.initHeartRate().then(() => this._doScanConnect())
        else this._doScanConnect()
      },
      _doScanConnect() {
        const last = this.hrBle.getLastDeviceId()
        if (last) {
          this.hrBle.connect(last).catch(() => { this.showDeviceScan = true })
        } else {
          // 简化：弹出 actionSheet 选设备
          this.hrBle.startScan((d) => {
            uni.showActionSheet({ itemList: [d.name || d.deviceId], success: () => {
              this.hrBle.stopScan(); this.hrBle.connect(d.deviceId)
            } })
          })
        }
      },
      startHrAccumulate() {
        this.hrStartTs = Date.now()
        this.hrTimer = setInterval(() => {
          if (this.hr == null) return
          const profile = useUserProfileStore().toProfile()
          if (!useUserProfileStore().isComplete()) { return }
          this.hrKcalTotal += calcKcalPerMin(this.hr, profile)
          this.hrSamples.push({ hr: this.hr, durMin: 1 })
          this.hrDurationSec = Math.floor((Date.now() - this.hrStartTs) / 1000)
        }, 60000)
      },
      stopHrAccumulate() {
        if (this.hrTimer) { clearInterval(this.hrTimer); this.hrTimer = null }
      },
      onOpenHrSettings() { this.showSettings = true },
    },
  }
</script>

<style scoped>
  .container.light .save-row {
    background: #f5f5f5 !important;
  }

  /* ========== 整体容器 & 深色模式 ========== */
  .container {
    position: relative;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.dark {
    background-color: #121212;
    color: #f7f7f7;
  }

  .container.light {
    background-color: #f5f5f5;
    color: #333333;
  }

  /* ========== 动作列表 ========== */
  .action-list {
    flex: 1;
    height: 0;
    width: calc(100% - 40px);
    margin: 0 20px;
  }

  .list-bottom-space {
    width: 100%;
    height: 65px;
    background: transparent;
    pointer-events: none;
  }

  /* ========== 底部按钮行 ========== */
  .save-row {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--bg-secondary) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1rpx solid var(--border-light);
  }

  .minimal-timer-btn,
  .minimal-settings-btn {
    flex: 1;
    height: 48px;
    background: var(--bg-card);
    border: 1rpx solid var(--border-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .mini-icon {
    font-size: 16px;
    color: #379bff;
    margin-right: 8px;
  }

  .mini-text {
    font-size: 15px;
    color: var(--text-primary);
    font-weight: 300;
  }

  .minimal-timer-btn:active,
  .minimal-settings-btn:active {
    transform: scale(0.97);
    background: var(--bg-tertiary);
  }

  /* ========== 休息日 ========== */
  .rest-day-header {
    padding: 40px 20px;
    text-align: center;
  }

  .rest-day-text {
    font-size: 16px;
    color: var(--text-secondary);
  }

  /* ========== 通用弹窗 ========== */
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
    from {
      opacity: 0;
      transform: scale(0.9);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
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

  .no-border::after,
  .no-border::before {
    display: none !important;
  }
</style>