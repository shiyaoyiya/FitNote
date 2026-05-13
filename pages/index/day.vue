<template>
  <view class="container" :class="{ dark: settingsStore.isDarkMode, light: !settingsStore.isDarkMode }">
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
        :bubble-fill="settingsStore.bubbleFill" @confirm-entry="(data) => onConfirmEntry(idx, data)"
        @update-entry="(data) => onUpdateEntry(idx, data)" @delete-action="handleDeleteAction(idx)"
        @delete-entry="(eIdx) => handleDeleteEntry(idx, eIdx)" @edit-entry="(eIdx) => openEditEntryPopup(idx, eIdx)"
        @go-history="goHistory(idx)" />
      <view class="list-bottom-space"></view>
    </scroll-view>

    <!-- 底部按钮行 -->
    <view class="save-row" v-if="!isRestDay && !showChooseTpl">
      <view class="minimal-timer-btn" @click="timerDuration = settingsStore.heavyTimerDuration; showTimer = true">
        <text class="mini-icon">⏱</text>
        <text class="mini-text">开始计时休息</text>
      </view>
      <view class="minimal-settings-btn" @click="showSettings = true">
        <text class="mini-icon">⚙</text>
        <text class="mini-text">设置</text>
      </view>
    </view>

    <!-- 计时器组件 -->
    <TimerModal :visible="showTimer" :default-duration="timerDuration" :quick-settings="quickTimerSettings"
      @close="showTimer = false" @complete="showTimer = false" />

    <!-- 设置组件 -->
    <DaySettings :visible="showSettings" :available-actions="availableActionNames" :chosen-actions="chosenActions"
      :action-entries="actionEntries" :settings="settingsState" @close="showSettings = false" @add-action="onAddAction"
      @save-sort="onSaveSort" @toggle-auto-timer="settingsStore.toggleAutoStartTimer()"
      @toggle-auto-fill="settingsStore.toggleAutoFillData()" @toggle-bubble-fill="settingsStore.toggleBubbleFill()"
      @set-heavy-timer="(v) => settingsStore.setHeavyTimerDuration(v)"
      @set-light-timer="(v) => settingsStore.setLightTimerDuration(v)" @export-data="onExportData" />

    <!-- 编辑记录弹窗 -->
    <view v-if="showEditEntryPopup" class="popup-overlay" @click.self="closeEditEntryPopup">
      <view class="overlay-bg" @click="closeEditEntryPopup"></view>
      <view class="modal-panel edit-panel fade-in" @click.stop>
        <view class="modal-header no-border">
          <text class="modal-title">编辑记录</text>
          <text class="close-icon" @click="closeEditEntryPopup">×</text>
        </view>
        <view class="modal-body edit-body">
          <view class="edit-badge">
            <text>第 {{ editEntryInfo.entryIdx + 1 }} 组</text>
          </view>
          <view class="edit-main-row">
            <view class="input-item">
              <input type="digit" v-model="editEntryReps" class="big-input" focus />
              <text class="unit-label">次</text>
            </view>
            <text class="x-mark">×</text>
            <view class="input-item">
              <input type="digit" v-model="editEntryWeight" class="big-input" />
              <text class="unit-label">kg</text>
            </view>
          </view>
        </view>
        <view class="modal-footer no-border">
          <button class="save-entry-btn" @click="saveEditedEntry">确认修改</button>
        </view>
      </view>
    </view>
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

  export default {
    components: {
      TimerModal,
      TemplateSelector,
      ActionCard,
      DaySettings
    },
    data() {
      return {
        templateStore: useTemplateStore(),
        dayDataCacheStore: useDayDataCacheStore(),
        actionStore: useActionStore(),
        settingsStore: useDaySettingsStore(),
        date: '',
        DAYDATA_PREFIX: 'fitness_daydata_',
        TEMPLATES_KEY: 'fitness_templates',
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
        showSettings: false,
        showEditEntryPopup: false,
        editEntryInfo: {
          actionIdx: -1,
          entryIdx: -1
        },
        editEntryReps: '',
        editEntryWeight: '',
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
    },
    beforeUnmount() {
      this.clearAllTimers()
    },
    onShow() {
      if (!this.showChooseTpl) this.loadDayData()
    },
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

      /* ========== 数据加载 ========== */
      loadDayData() {
        if (this.loadTimer) clearTimeout(this.loadTimer)
        this.loadTimer = setTimeout(() => this._loadDayData(), 50)
      },
      _loadDayData() {
        uni.setNavigationBarTitle({
          title: this.date.replace(/-/g, '/')
        })
        const tplArr = uni.getStorageSync(this.TEMPLATES_KEY) || []
        this.templates = Array.isArray(tplArr) ? tplArr : []
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
            return normalizeEntries(arr)
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
          const key = this.DAYDATA_PREFIX + this.date
          uni.setStorageSync(key, dayData)
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
            text: `+${todayTotal - latestTotal}`,
            class: 'diff-up'
          })
        } else if (todayTotal < latestTotal) {
          this.$set(this.diffs, idx, {
            text: `-${latestTotal - todayTotal}`,
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
        const key = this.DAYDATA_PREFIX + todayDateStr
        const raw = uni.getStorageSync(key) || {}
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
        const key = this.DAYDATA_PREFIX + this.date
        const raw = uni.getStorageSync(key) || {}
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        }
        const tplInfo = dayData.templates[this.chosenTplName] || {}
        tplInfo.actionOrder = [...this.chosenActions]
        dayData.templates[this.chosenTplName] = tplInfo
        uni.setStorageSync(key, dayData)
        this.dayDataCacheStore.saveDayData(this.date, dayData)
      },

      /* ========== 卡片事件处理 ========== */
      onConfirmEntry(idx, {
        type,
        stages
      }) {
        const actName = this.chosenActions[idx]
        const isUnilateral = this.actionStore.getActionByName(actName)?.isUnilateral || false
        const entry = buildEntry(type, stages, isUnilateral)
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
        if (isPlaceholder) {
          this.$set(this.actionEntries, aIdx, [...this.actionEntries[aIdx], createPlaceholderEntry()])
        }
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
        const key = this.DAYDATA_PREFIX + this.date
        const raw = uni.getStorageSync(key) || {}
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
        tplInfo.actionWeights = {
          ...actionWeights
        }
        tplInfo.totalWeight = Object.values(actionWeights).reduce((a, b) => a + b, 0)
        const order = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : []
        tplInfo.actionOrder = order.filter(name => name !== actNameToRemove)
        dayData.templates[this.chosenTplName] = tplInfo
        uni.setStorageSync(key, dayData)
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
        this.editEntryInfo = {
          actionIdx,
          entryIdx
        }
        const entry = this.actionEntries[actionIdx][entryIdx]
        if (entry.stages && entry.stages.length > 0) {
          this.editEntryReps = String(entry.stages[0].reps)
          this.editEntryWeight = entry.stages[0].weight > 0 ? String(entry.stages[0].weight) : ''
        } else {
          const [reps, weight] = (entry.input || '').split('×')
          this.editEntryReps = reps
          this.editEntryWeight = weight || ''
        }
        this.showEditEntryPopup = true
      },
      closeEditEntryPopup() {
        this.showEditEntryPopup = false
        this.editEntryInfo = {
          actionIdx: -1,
          entryIdx: -1
        }
        this.editEntryReps = ''
        this.editEntryWeight = ''
      },
      saveEditedEntry() {
        const {
          actionIdx,
          entryIdx
        } = this.editEntryInfo
        const reps = this.editEntryReps
        const weight = this.editEntryWeight
        if (!reps || Number(reps) <= 0) {
          uni.showToast({
            title: '请输入次数',
            icon: 'none'
          })
          return
        }
        const repsNum = Number(reps)
        const weightNum = weight ? Number(weight) : 0
        const actName = this.chosenActions[actionIdx]
        const isUnilateral = this.actionStore.getActionByName(actName)?.isUnilateral || false
        const entry = buildEntry(ENTRY_TYPE.NORMAL, [{
          reps: repsNum,
          weight: weightNum
        }], isUnilateral)
        this.$set(this.actionEntries[actionIdx], entryIdx, entry)
        this.saveEntryToStorage(actionIdx)
        this.calcDiffForSingleAction(actionIdx)
        this.closeEditEntryPopup()
        uni.showToast({
          title: '修改成功',
          icon: 'success',
          duration: 1000
        })
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
        const raw = uni.getStorageSync(key) || {}
        const dayData = typeof raw === 'object' ? raw : {}
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

        uni.setStorageSync(key, dayData)
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
      onSaveAerobic({
        name,
        time
      }) {
        const key = this.DAYDATA_PREFIX + this.date
        const raw = uni.getStorageSync(key) || {}
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
        uni.setStorageSync(key, dayData)
        uni.showToast({
          title: '已添加有氧',
          icon: 'success'
        })
        this.showChooseTpl = false
      },
      onSaveRestDay(reason) {
        const key = this.DAYDATA_PREFIX + this.date
        const raw = uni.getStorageSync(key) || {}
        const dayData = {
          ...raw
        }
        dayData.isRestDay = true
        dayData.templates = {
          [reason]: {
            totalWeight: 0,
            actionWeights: {}
          }
        }
        uni.setStorageSync(key, dayData)
        this.dayDataCacheStore.saveDayData(this.date, dayData)
        uni.showToast({
          title: '已标记休息日',
          icon: 'success'
        })
        this.showChooseTpl = false
        this.isRestDay = true
        this.restReasonStored = reason
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
        this.diffs.push({
          text: '未记录',
          class: 'diff-neutral'
        })
        this.actionEntries.push([])
        const dayKey = this.DAYDATA_PREFIX + this.date
        const raw = uni.getStorageSync(dayKey) || {}
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
        uni.setStorageSync(dayKey, dayData)
        uni.showToast({
          title: `已添加：${actName}`,
          icon: 'success'
        })
      },
      onSaveSort(newOrder) {
        // 先把新增的动作同步到 chosenActions / actionEntries / diffs
        const currentSet = new Set(this.chosenActions)
        newOrder.forEach(name => {
          if (!currentSet.has(name)) {
            this.chosenActions.push(name)
            this.actionEntries.push([])
            this.diffs.push({ text: '未记录', class: 'diff-neutral' })
            // 持久化新动作
            const dayKey = this.DAYDATA_PREFIX + this.date
            const raw = uni.getStorageSync(dayKey) || {}
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
            uni.setStorageSync(dayKey, dayData)
            this.dayDataCacheStore.saveDayData(this.date, dayData)
          }
        })

        // 按 newOrder 重排
        const orderMap = newOrder.map(name => this.chosenActions.indexOf(name))
        this.chosenActions = [...newOrder]
        this.actionEntries = orderMap.map(i => [...this.actionEntries[i]])
        this.diffs = orderMap.map(i => this.diffs[i] ? { ...this.diffs[i] } : null)
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
        let exportText = ''
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
              exportText += `- 第${entryIdx + 1}组：${reps}次 × ${weight}kg\n`
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
    },
  }
</script>

<style scoped>
  /* ========== CSS 变量定义（支持浅色模式） ========== */
  .container {
    --bg-primary: #121212;
    --bg-secondary: #1e1e1e;
    --bg-tertiary: #242424;
    --bg-card: #242424;
    --bg-input: #1a1a1a;
    --bg-btn: #121212;
    --border-color: #333;
    --border-light: rgba(255, 255, 255, 0.1);
    --text-primary: #f7f7f7;
    --text-secondary: #999;
    --text-muted: #666;
    --text-placeholder: #555;
    --text-btn: #f5f5f5;
    --icon-bg: #ffffff;
    --icon-color: #191919;
    --divider-color: #555;
    --tag-bg: #242424;
    --shadow-color: rgba(0, 0, 0, 0.2);
  }

  .container.light {
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f0f0f0;
    --bg-card: #ffffff;
    --bg-input: #ffffff;
    --bg-btn: #ffffff;
    --border-color: #e0e0e0;
    --border-light: #e0e0e0;
    --text-primary: #333333;
    --text-secondary: #666666;
    --text-muted: #999999;
    --text-placeholder: #cccccc;
    --text-btn: #333333;
    --icon-bg: #909090;
    --icon-color: #ffffff;
    --divider-color: #e0e0e0;
    --tag-bg: #ffffff;
    --shadow-color: rgba(0, 0, 0, 0.08);
  }

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

  /* ========== 编辑弹窗 ========== */
  .edit-panel {
    width: 70vw !important;
    border-radius: 20px !important;
    box-shadow: 0 20px 40px var(--shadow-color);
  }

  .edit-body {
    padding: 10px 20px 30px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .edit-badge {
    background: rgba(55, 155, 255, 0.1);
    padding: 4px 12px;
    border-radius: 100px;
    margin-bottom: 24px;
  }

  .edit-badge text {
    font-size: 13px;
    color: #379bff;
    font-weight: bold;
  }

  .edit-main-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }

  .input-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .big-input {
    width: 80px;
    height: 60px;
    background: var(--bg-input);
    border: 1rpx solid var(--border-color);
    border-radius: 12px;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    color: var(--text-primary);
  }

  .unit-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .x-mark {
    font-size: 20px;
    color: var(--text-muted);
    margin-top: -20px;
  }

  .save-entry-btn {
    width: 100% !important;
    height: 50px !important;
    line-height: 50px !important;
    background: linear-gradient(135deg, #379bff, #2d82d6) !important;
    border-radius: 12px !important;
    font-size: 16px !important;
    font-weight: bold;
    margin-bottom: 10px;
    border: none;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }
</style>