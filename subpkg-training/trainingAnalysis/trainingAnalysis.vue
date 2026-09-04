<template>
  <scroll-view class="container"
    :class="{ dark: settingsStore.isDarkMode, light: !settingsStore.isDarkMode, 'liquid-glass': settingsStore.liquidGlassEnabled }"
    scroll-y>
    <view class="ta-content">
    <!-- Top: date picker (长按 2 秒打开训练分析调试工具) -->
    <view class="ta-top" @longpress="onLongPressTitle">
      <picker mode="date" :value="dateStr" fields="day" :end="todayStr" @change="onDateChange" @longpress.stop.prevent="onLongPressTitle">
        <view class="date-picker-btn">
          📅 {{ dateStr }} <text class="chev">▾</text>
        </view>
      </picker>
      <view class="ta-session-status" v-if="analysis">
        <text class="st-chip" :class="{finalized: effectiveFinalized}">
          {{ effectiveFinalized ? '已结束' : '进行中' }}
        </text>
        <text class="gen-txt">分析于 {{ formatTime(analysis.generatedAt) }}</text>
      </view>
    </view>

    <!-- Debug Panel: Mock Training Data (长按顶部日期触发) -->
    <view class="debug-panel" v-if="debugVisible" :class="{'liquid-debug': settingsStore.liquidGlassEnabled}">
      <view class="debug-head">
        <text class="debug-title">🧪 训练分析 Mock 工具</text>
        <text class="debug-close" @click="hideDebug">✕</text>
      </view>
      <view class="debug-row">
        <text class="debug-label">目标日期：</text>
        <picker mode="date" :value="debugDate" :end="todayStr" @change="onDebugDateChange">
          <view class="debug-input">{{ debugDate }} ▾</view>
        </picker>
      </view>
      <view class="debug-row">
        <text class="debug-label">指定动作（逗号分隔，留空=随机4动作）：</text>
      </view>
      <input class="debug-input" v-model="debugActionNames" placeholder="例：杠铃卧推,硬拉,杠铃深蹲,引体向上" />
      <view class="debug-row">
        <text class="debug-label">种子 seed（同种子可复现）：</text>
        <input class="debug-input" type="number" v-model="debugSeed" placeholder="留空=随机" />
      </view>
      <view class="debug-grid">
        <view class="db-btn db-blue"   @click="doInjectToday">① 注入今天训练</view>
        <view class="db-btn db-green"  @click="doInjectDebugDate">② 注入「目标日期」训练</view>
        <view class="db-btn db-purple" @click="doInject14Days">③ 注入近 14 个工作日</view>
        <view class="db-btn db-red"    @click="doClearDebugDate">④ 清空「目标日期」mock</view>
      </view>
      <view class="debug-tip">
        提示：①②④都是针对单一日期；③是批量生成历史，用来测 Tab3「动作 HR Profile」的长期数据聚合。
      </view>
      <view class="debug-log" v-if="debugLog">{{ debugLog }}</view>
    </view>

    <!-- Empty state -->
    <view class="empty-state" v-if="!analysis">
      <view class="empty-icon">📊</view>
      <view class="empty-title">所选日期暂无训练分析结果</view>
      <view class="empty-sub">请先进入 {{ dateStr }} 的训练页，确认至少 2 组训练 + 10 个以上 BLE HR 采样后生成分析。</view>
      <view class="btn-primary-empty" @click="goToday">跳转到今日训练页 →</view>
    </view>

    <!-- Tabs -->
    <view class="ta-tabs" v-if="analysis">
      <view class="tab" :class="{active: tab===1}" @click="tab=1">本次训练</view>
      <view class="tab" :class="{active: tab===2}" @click="tab=2">动作 HR 对比</view>
      <view class="tab" :class="{active: tab===3}" @click="tab=3">动作 HR Profile</view>
    </view>

    <!-- Tab 1 -->
    <view v-if="analysis && tab===1">
      <TrainingAnalysisCard
        :entries="entriesFlatRestore"
        :hr-samples-with-ts="hrSamplesWithTs"
        :current-date-str="dateStr"
        :profile="profile"
        :existing-analysis="analysis"
        :hr-paused-for-no-hr="hrPausedForNoHr"
        :hr-last-active-ts="hrLastActiveTs"
        ref="tac"
        :force-expanded="true"
        :hide-action-links="true"
        @request-finalize="onManualFinalize"
      />
      <view class="ta-table-card" v-if="analysis && analysis.setAnalyses && analysis.setAnalyses.length">
        <view class="tt-title">📋 组级明细（默认展开）</view>
        <scroll-view scroll-x class="tt-scroll">
          <view class="tt-row tt-h">
            <span class="tt-col">#</span>
            <span class="tt-col">动作</span>
            <span class="tt-col">组号</span>
            <span class="tt-col">w×r</span>
            <span class="tt-col">容量</span>
            <span class="tt-col">相对强度</span>
            <span class="tt-col">transition</span>
            <span class="tt-col">估算时长</span>
            <span class="tt-col">start→peak→end HR</span>
            <span class="tt-col">ΔHR</span>
          </view>
          <view class="tt-row" v-for="(s, i) in analysis.setAnalyses" :key="i">
            <span class="tt-col">{{ i + 1 }}</span>
            <span class="tt-col">{{ s.actionName }}</span>
            <span class="tt-col">{{ s.setIndex }}</span>
            <span class="tt-col">{{ s.weight }}×{{ s.reps }}</span>
            <span class="tt-col">{{ s.volumeLoad }}</span>
            <span class="tt-col" v-if="s.relativeIntensity.value !== null">
              {{ (s.relativeIntensity.value * 100).toFixed(0) }}%
              <small v-if="s.relativeIntensity.e1RMEstimated">(e1RM{{ s.relativeIntensity.e1RM?.toFixed(1) }})</small>
            </span>
            <span class="tt-col" v-else>—</span>
            <span class="tt-col">{{ s.transitionTimeSec !== null ? s.transitionTimeSec + 's' : '—' }}</span>
            <span class="tt-col" v-if="s.estimatedSetDurationSec !== null">
              {{ s.estimatedSetDurationSec }}s<small> (estimated)</small>
            </span>
            <span class="tt-col" v-else>—</span>
            <span class="tt-col" v-if="s.hr.analyzed">{{ s.hr.startHr }}→<b>{{ s.hr.peakHr }}</b>→{{ s.hr.endHr }} <small>({{ s.hr.sampleCount }}样本)</small></span>
            <span class="tt-col warn" v-else>⚠ 采样不足</span>
            <span class="tt-col" v-if="s.hr.analyzed">{{ s.hr.deltaHr > 0 ? '+' : '' }}{{ s.hr.deltaHr }}</span>
            <span class="tt-col" v-else>—</span>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- Tab 2: HR 对比 -->
    <view v-if="analysis && tab===2">
      <view class="ta-card">
        <view class="card-title">选择动作做 HR 对比（最多 4 个，至少 2 个）</view>
        <view class="chips">
          <view
            v-for="a in actionKeys"
            :key="a"
            class="chip"
            :class="{active: selectedActions.includes(a)}"
            @click="toggleAction(a)"
          >{{ a }}</view>
        </view>
        <view class="warn-small" v-if="selectedActions.length < 2">请至少选择 2 个动作以绘制对比图</view>
        <view class="warn-small" v-else>已选 {{ selectedActions.length }} / {{ Object.keys(analysis.actionAnalyses).length }}</view>
        <HrBarChart v-if="seriesForChart.length >= 2" :series="seriesForChart" :width="canvasW" />
      </view>
    </view>

    <!-- Tab 3: HR Profile -->
    <view v-if="tab===3">
      <view class="ta-card">
        <view class="card-title">选择动作查看长期 HR Profile</view>
        <picker mode="selector" :range="profileActionOptions" range-key="label" @change="onProfileActionChange">
          <view class="picker-btn">
            {{ profileActionLabel || '请选择动作' }} <text class="chev">▾</text>
          </view>
        </picker>
        <view class="warn-small" v-if="!histLoaded && selectedProfileAction">正在读取历史数据…</view>
        <HrProfileChart
          v-if="selectedProfileAction && profileBuckets && profileBuckets.some(p => p.sampleSets > 0)"
          :profiles="profileBuckets"
          :target-action-name="selectedProfileAction"
          :width="canvasW"
        />
        <view class="warn-small" v-else-if="selectedProfileAction">
          该动作暂无足够历史（需 ≥ 1 组 analyzed HR set）。
        </view>
        <view class="warn-small" v-else>请先选择动作</view>
      </view>
    </view>
    </view>
  </scroll-view>
</template>

<script>
import TrainingAnalysisCard from '@/components/TrainingAnalysisCard.vue'
import HrBarChart from './components/HrBarChart.vue'
import HrProfileChart from './components/HrProfileChart.vue'
import { useDayDataCacheStore } from '@/stores/dayDataCache.js'
import { useUserProfileStore } from '@/stores/userProfile.js'
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { aggregateActionHrProfiles } from '@/utils/strengthTrainingAnalyzer.js'
import mockMod from '@/subpkg-training/utils/mockTrainingData.js'
// 兼容 uni-app H5 / 自定义基座下的 default/具名 双形态
const mockApi = mockMod && mockMod.default ? mockMod.default : (mockMod || {})

const DEBUG_FLAG_KEY = 'ta_debug_visible'
const DEBUG_LOGIN_KEY = 'ta_debug_login' // 连续点击 5 次解锁（冗余触发方式）

export default {
  name: 'training-analysis-page',
  components: { TrainingAnalysisCard, HrBarChart, HrProfileChart },
  data() {
      return {
        settingsStore: useDaySettingsStore(),
        dateStr: '',
        todayStr: '',
        tab: 1,
        analysis: null,
        hrSamplesWithTs: [],
        entriesFlatRestore: {},
        selectedActions: [],
        selectedProfileAction: '',
        profileBuckets: [],
        histLoaded: false,
        canvasW: 340,
        pageHeight: 667,
        // ★ 从 dayData 读出用于「训练已结束」快速判定
        hrPausedForNoHr: false,
        hrLastActiveTs: 0,
        // Mock 调试面板
        debugVisible: false,
        debugDate: '',
        debugActionNames: '',
        debugSeed: '',
        debugLog: '',
        _loginTaps: 0,
        _loginTapTimer: null,
      }
    },
    computed: {
      profile() { return useUserProfileStore().toProfile() },
      // ★ 修复「心率断开仍显示训练中」：
      //   1) analysis.status === 'finalized' → YES
      //   2) 历史日期 → YES
      //   3) hrPausedForNoHr=true + 60s 静默 → YES
      //   4) 通用空闲阈值：10 分钟缩短到 3 分钟
      effectiveFinalized() {
        if (!this.analysis) return false
        if (this.analysis.status === 'finalized') return true
        const lastTs = this.hrSamplesWithTs.length
          ? this.hrSamplesWithTs[this.hrSamplesWithTs.length - 1].ts
          : (this.analysis.generatedAt || 0)
        const now = Date.now()
        const gapMin = (now - Number(lastTs || 0)) / 60000
        if (this.dateStr !== this.todayStr) return true   // 历史日期一律视为"已结束"

        // Case A: 明确被标记因「手环停止广播」而暂停，且 > 60 秒无任何活动 → 判定结束
        if (this.hrPausedForNoHr === true) {
          const lastActiveMs = this.hrLastActiveTs || lastTs || now
          const silenceSec = (now - Number(lastActiveMs)) / 1000
          if (silenceSec >= 60) return true
        }

        // Case B: 通用空闲阈值 3 分钟（原 10 分钟太保守）
        if (gapMin >= 3) return true
        return false
      },
      actionKeys() {
        if (!this.analysis?.actionAnalyses) return []
        return Object.keys(this.analysis.actionAnalyses).sort((a, b) => {
          const A = this.analysis.actionAnalyses[a].totalVolume
          const B = this.analysis.actionAnalyses[b].totalVolume
          return B - A
        })
      },
      seriesForChart() {
        if (!this.analysis) return []
        return this.selectedActions.map(name => {
          const a = this.analysis.actionAnalyses[name] || {}
          return {
            actionName: name,
            avgHr: a.averageHr ?? null,
            peakHr: a.peakHr ?? null,
            deltaHr: a.avgDeltaHr ?? null,
          }
        })
      },
      profileActionOptions() {
        const cache = useDayDataCacheStore()
        const names = new Set()
        const allDates = cache.indexedDates || []
        for (const d of allDates) {
          const dd = cache.getDayData(d)
          if (dd && dd.trainingAnalysis?.actionAnalyses) {
            Object.keys(dd.trainingAnalysis.actionAnalyses).forEach(n => names.add(n))
          }
        }
        // 当前日的分析也加入
        if (this.analysis?.actionAnalyses) {
          Object.keys(this.analysis.actionAnalyses).forEach(n => names.add(n))
        }
        return Array.from(names).sort().map(n => ({ label: n, value: n }))
      },
      profileActionLabel() {
        return this.selectedProfileAction || ''
      },
    },
    onLoad(options) {
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const d = String(today.getDate()).padStart(2, '0')
      this.todayStr = `${y}-${m}-${d}`
      this.dateStr = options.date || this.todayStr
      this.debugDate = this.todayStr
      // DEBUG 面板是否持久化展示
      try {
        if (typeof uni !== 'undefined' && uni.getStorageSync) {
          this.debugVisible = !!uni.getStorageSync(DEBUG_FLAG_KEY)
        }
      } catch (e) { /* ignore */ }
      this.loadDay()
      try {
        const info = uni.getSystemInfoSync()
        this.canvasW = Math.min(info.windowWidth - 32, 360)
        this.pageHeight = info.windowHeight || 667
      } catch (e) { this.canvasW = 340 }
    },
    onShow() {
      // 每次回显页 → settingsStore 加载（深色/液态玻璃切换后能及时刷新绑定 class）
      if (this.settingsStore && typeof this.settingsStore.load === 'function') this.settingsStore.load()
    },
    methods: {
      loadDay() {
        const cache = useDayDataCacheStore()
        const dd = cache.getDayData(this.dateStr) || {}
        this.analysis = dd.trainingAnalysis || null
        this.hrSamplesWithTs = dd.hrSamplesWithTs || (dd.hrSamples?.length ? [] : [])
        // ★ 读出训练状态标志（用于 effectiveFinalized 快速判定）
        this.hrPausedForNoHr = dd.hrPausedForNoHr === true
        this.hrLastActiveTs = Number(dd.hrLastActiveTs) || 0
        const restored = {}
        if (this.analysis?.setAnalyses) {
          for (const s of this.analysis.setAnalyses) {
            if (!restored[s.actionName]) restored[s.actionName] = []
            restored[s.actionName].push({
              isPlaceholder: false,
              bwMode: null,
              stages: [{ reps: s.reps, weight: s.weight, total: s.volumeLoad }],
              timestamp: s.timestamp,
            })
          }
        }
        for (const [aname, list] of Object.entries(dd.templates || {})) {
          const actEntries = list.actionWeights ? null : (list.entries && list.entries[aname])
          if (actEntries && Array.isArray(actEntries) && !restored[aname]) {
            restored[aname] = actEntries
          }
        }
        // fallback: 读 dayData.entries
        for (const [aname, list] of Object.entries(dd.entries || {})) {
          if (!restored[aname] && Array.isArray(list)) restored[aname] = list
        }
        this.entriesFlatRestore = restored
        if (this.actionKeys.length >= 2) this.selectedActions = [this.actionKeys[0], this.actionKeys[1]]
        else this.selectedActions = [...this.actionKeys]
        if (!this.selectedProfileAction && this.profileActionOptions.length) {
          this.selectedProfileAction = this.profileActionOptions[0].value
          this.$nextTick(() => this.loadProfiles())
        }
      },
      onDateChange(e) { this.dateStr = e.detail.value; this.loadDay() },
      goToday() {
        // Q4: 训练页是 tab/首页，重定向避免堆叠
        uni.redirectTo({
          url: '/pages/index/day?date=' + this.dateStr,
          fail: () => uni.navigateBack()
        })
      },
      // Q3: 手动结束（TrainingAnalysisCard 里的结束训练按钮置灰，但训练分析页允许通过"手动结束训练"强制落盘）
      onManualFinalize() {
        if (!this.analysis) return
        this.analysis.status = 'finalized'
      const lastTs = this.analysis.setAnalyses.length
        ? Math.max(...this.analysis.setAnalyses.map(s => Number(s.timestamp) || 0))
        : 0
      this.analysis.sessionEndTs = Math.max(lastTs, Date.now())
      try {
        const cache = useDayDataCacheStore()
        cache.updateDayData(this.dateStr, { trainingAnalysis: this.analysis })
      } catch (e) {}
      uni.showToast({ title: '训练已结束', icon: 'success' })
      this.$forceUpdate()
    },
    toggleAction(name) {
      const idx = this.selectedActions.indexOf(name)
      if (idx >= 0) this.selectedActions.splice(idx, 1)
      else {
        if (this.selectedActions.length >= 4) {
          uni.showToast({ title: '最多选 4 个', icon: 'none' })
          return
        }
        this.selectedActions.push(name)
      }
    },
    onProfileActionChange(e) {
      const idx = Number(e.detail.value)
      this.selectedProfileAction = this.profileActionOptions[idx]?.value || ''
      this.loadProfiles()
    },
    loadProfiles() {
      if (!this.selectedProfileAction) return
      this.histLoaded = false
      this.profileBuckets = []
      const cache = useDayDataCacheStore()
      let dates = Array.from(cache.dateIndex || [])
      dates.sort()
      if (dates.length > 90) dates.splice(0, dates.length - 90)
      // 加入当前日
      if (!dates.includes(this.dateStr) && this.analysis) dates.push(this.dateStr)
      dates.sort()
      const histList = []
      for (const d of dates) {
        let dd = cache.getDayData(d)
        if (d === this.dateStr && this.analysis) {
          histList.push({ date: d, analysis: this.analysis })
          continue
        }
        if (dd?.trainingAnalysis) histList.push({ date: d, analysis: dd.trainingAnalysis })
      }
      this.profileBuckets = aggregateActionHrProfiles(histList, this.selectedProfileAction)
      this.histLoaded = true
    },
    formatTime(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },

    /* ================= Mock 调试面板 ================= */
    // 长按顶部标题切换 Debug 面板显示
    onLongPressTitle() {
      // 长按 2s 触发：翻转状态 + 持久化
      this.debugVisible = !this.debugVisible
      try { uni.setStorageSync(DEBUG_FLAG_KEY, this.debugVisible ? 1 : '') } catch (e) { /* ignore */ }
      if (this.debugVisible) this._setDebugLog('调试面板已打开。操作前请先通过顶部「目标日期」选择日期。')
      else this._setDebugLog('')
      uni.showToast({ title: this.debugVisible ? '🧪 调试工具已显示' : '调试工具已隐藏', icon: 'none', duration: 800 })
    },
    hideDebug() {
      this.debugVisible = false
      try { uni.setStorageSync(DEBUG_FLAG_KEY, '') } catch (e) { /* ignore */ }
    },
    onDebugDateChange(e) { this.debugDate = e.detail.value || this.todayStr },
    _setDebugLog(msg) { this.debugLog = msg || '' },
    _buildInjectOpts() {
      // 从表单字段组装参数
      const opts = {}
      const names = (this.debugActionNames || '')
        .split(/[,，]/).map(s => s.trim()).filter(Boolean)
      if (names.length) opts.actionNames = names
      else opts.actionCount = 4
      const seed = parseInt(String(this.debugSeed || '').trim(), 10)
      if (!isNaN(seed) && seed > 0) opts.seed = seed
      opts.profile = this.profile || undefined
      return opts
    },
    async doInjectToday() {
      if (!mockApi.injectMockSession) { this._setDebugLog('✖ mockTrainingData.js 未加载，请重启页面'); return }
      uni.showLoading({ title: '正在生成…', mask: true })
      try {
        const opts = this._buildInjectOpts()
        opts.date = this.todayStr
        const r = await mockApi.injectMockSession(opts)
        this._setDebugLog(
          `✅ 今日训练注入成功\n` +
          `日期=${r.date}  seed=${r.seed}\n` +
          `动作=${r.actionCount} 个  组数=${r.setCount} 组  HR 采样=${r.sampleCount} 个\n` +
          `时长约 ${r.sessionMinutes} 分钟  机械容量 TotalVolumeLoad=${r.totalVolumeLoad ?? '未计算'}`
        )
        // 强制刷新 dayDataCache：清内存 cache → reload 索引 → 再 loadDay 重新读 storage/Pinia
        try {
          const cache = useDayDataCacheStore()
          cache.clearCache()        // 清内存 Map（旧的空 dayData 会被丢，下次 getDayData 重新读 storage）
          cache.loadIndex(true)     // 强制刷新日期索引
        } catch (e) {}
        this.loadDay()
        if (this.selectedProfileAction) this.loadProfiles()
        uni.showToast({ title: '✅ 已注入今天', icon: 'success' })
      } catch (e) {
        console.error(e)
        this._setDebugLog('✖ 失败：' + (e && e.message ? e.message : String(e)))
        uni.showToast({ title: '注入失败', icon: 'none' })
      } finally {
        try { uni.hideLoading() } catch (e) {}
      }
    },
    async doInjectDebugDate() {
      if (!mockApi.injectMockSession) { this._setDebugLog('✖ mockTrainingData.js 未加载，请重启页面'); return }
      uni.showLoading({ title: '正在生成…', mask: true })
      try {
        const opts = this._buildInjectOpts()
        opts.date = this.debugDate || this.todayStr
        const r = await mockApi.injectMockSession(opts)
        this._setDebugLog(
          `✅ 目标日期训练注入成功\n` +
          `日期=${r.date}  seed=${r.seed}\n` +
          `动作=${r.actionCount} 个  组数=${r.setCount} 组  HR 采样=${r.sampleCount} 个`
        )
        try {
          const cache = useDayDataCacheStore()
          cache.clearCache()
          cache.loadIndex(true)
        } catch (e) {}
        this.loadDay()
        if (this.selectedProfileAction) this.loadProfiles()
        uni.showToast({ title: '✅ 已注入 ' + r.date, icon: 'success' })
      } catch (e) {
        console.error(e)
        this._setDebugLog('✖ 失败：' + (e && e.message ? e.message : String(e)))
        uni.showToast({ title: '注入失败', icon: 'none' })
      } finally {
        try { uni.hideLoading() } catch (e) {}
      }
    },
    async doInject14Days() {
      if (!mockApi.injectMockHistory) { this._setDebugLog('✖ mockTrainingData.js 未加载'); return }
      uni.showLoading({ title: '批量生成 14 天…', mask: true })
      try {
        const list = await mockApi.injectMockHistory({
          days: 14,
          weekdaysOnly: true,
          endDate: this.todayStr,
          actionsPerDay: 4,
          restSec: 110,
          profile: this.profile || undefined,
        })
        this._setDebugLog(
          `✅ 历史训练批量生成完成\n` +
          `共 ${list.length} 段训练（近 14 个工作日）\n` +
          `区间：${list[list.length - 1].date} ~ ${list[0].date}\n` +
          `容量合计：${list.reduce((a, b) => a + (Number(b.totalVolumeLoad) || 0), 0)}`
        )
        try {
          const cache = useDayDataCacheStore()
          cache.clearCache()
          cache.loadIndex(true)
        } catch (e) {}
        this.loadDay()
        if (this.selectedProfileAction) this.loadProfiles()
        uni.showToast({ title: `✅ 已生成 ${list.length} 天历史`, icon: 'success' })
      } catch (e) {
        console.error(e)
        this._setDebugLog('✖ 失败：' + (e && e.message ? e.message : String(e)))
        uni.showToast({ title: '批量生成失败', icon: 'none' })
      } finally {
        try { uni.hideLoading() } catch (e) {}
      }
    },
    async doClearDebugDate() {
      if (!mockApi.clearMockSession) { this._setDebugLog('✖ mockTrainingData.js 未加载'); return }
      const target = this.debugDate || this.todayStr
      try {
        const ok = await mockApi.clearMockSession({ date: target })
        if (ok) {
          this._setDebugLog(`🗑 ${target} 的 mock 数据已清除（仅清除打了标记的 dayData，不动真实训练数据）`)
          try {
            const cache = useDayDataCacheStore()
            cache.clearCache()
            cache.loadIndex(true)
          } catch (e) {}
          this.loadDay()
          if (this.selectedProfileAction) this.loadProfiles()
          uni.showToast({ title: '✅ 已清除', icon: 'success' })
        } else {
          this._setDebugLog(`ℹ ${target} 没有带 __mockTraining 标记的数据（可能是真实训练），已跳过，避免误删。`)
          uni.showToast({ title: '未找到 mock 数据', icon: 'none' })
        }
      } catch (e) {
        console.error(e)
        this._setDebugLog('✖ 失败：' + (e && e.message ? e.message : String(e)))
        uni.showToast({ title: '清除失败', icon: 'none' })
      }
    },
  },
}
</script>

<style scoped>
/* 与其他页面（trainingStat / actionHistory）对齐：使用 App.vue 定义的全局 Design Token */
.container {
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
}
.container.dark {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
.ta-content { padding: 16px; padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }

.ta-top { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 12px; }
.date-picker-btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1rpx solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}
.chev { color: var(--text-muted); margin-left: 4px; font-size: 11px; }
.ta-session-status { display: flex; gap: 8px; align-items: center; }
.st-chip {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: 11px;
  font-weight: 600;
  border: 1rpx solid var(--border-color);
}
.st-chip.finalized {
  background: rgba(55, 155, 255, 0.18);
  color: var(--primary, #379bff);
  border-color: transparent;
}
.gen-txt { font-size: 10px; color: var(--text-muted); }

.empty-state {
  margin: 40px auto;
  max-width: 360px;
  text-align: center;
  padding: 28px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1rpx dashed var(--border-color);
}
.empty-icon { font-size: 40px; }
.empty-title { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: var(--section-title); }
.empty-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6; }
.btn-primary-empty {
  display: inline-block;
  padding: 8px 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #379bff, #2d82d6);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.ta-tabs { display: flex; gap: 6px; padding: 0 0 14px; }
.tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  border: 1rpx solid var(--border-color);
}
.tab.active {
  background: linear-gradient(135deg, #379bff, #2d82d6);
  color: #fff;
  border-color: transparent;
}

.ta-card {
  margin: 0 0 16px;
  padding: 16px 14px;
  background: var(--bg-card);
  border: 1rpx solid var(--border-color);
  border-radius: 12px;
}
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--section-title); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.chip {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--chip-bg);
  color: var(--chip-text);
  border: 1rpx solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
}
.chip.active {
  background: linear-gradient(135deg, #379bff, #2d82d6);
  color: #fff;
  border-color: transparent;
}
.warn-small { font-size: 11px; color: var(--text-muted); margin: 4px 0; }
.picker-btn {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

/* Tab1 表格 */
.ta-table-card {
  margin: 0 0 16px;
  padding: 12px 8px;
  background: var(--bg-card);
  border: 1rpx solid var(--border-color);
  border-radius: 12px;
}
.tt-title { padding: 2px 8px 10px; font-size: 13px; font-weight: 600; color: var(--section-title); }
.tt-scroll { width: 100%; white-space: nowrap; }
.tt-row {
  display: grid;
  grid-template-columns: 28px 72px 40px 60px 54px 80px 62px 80px 140px 54px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--border-color);
  font-size: 11px;
  min-width: 680px;
  color: var(--text-primary);
}
.tt-row.tt-h {
  background: var(--bg-tertiary);
  font-weight: 700;
  color: var(--text-secondary);
}
.tt-col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-col small { color: var(--text-muted); font-size: 9px; display: block; line-height: 1.2; }
.tt-col.warn { color: var(--danger, #ff5a5d); }
.tt-col b { font-size: 12px; color: var(--danger, #ff5a5d); }

/* ========= Mock Debug Panel ========= */
.debug-panel {
  margin: 0 0 16px;
  padding: 14px 14px 12px;
  background: var(--bg-card);
  border: 1.5rpx solid #ff7a1a55;
  border-radius: 14px;
  box-shadow: 0 6px 22px rgba(255, 122, 26, 0.08);
}
.debug-panel.liquid-debug {
  background: linear-gradient(180deg, rgba(255, 122, 26, 0.06), var(--bg-card));
  backdrop-filter: blur(14px);
}
.debug-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.debug-title { font-size: 13px; font-weight: 700; color: #ff7a1a; letter-spacing: 0.2px; }
.debug-close {
  width: 24px; height: 24px; text-align: center; line-height: 22px; border-radius: 50%;
  background: var(--bg-tertiary); color: var(--text-secondary); font-size: 13px;
  border: 1rpx solid var(--border-color);
}
.debug-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.debug-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; flex-shrink: 0; }
.debug-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  color: var(--text-primary);
  font-size: 12px;
  min-height: 30px;
  line-height: 1.6;
}
input.debug-input { margin-bottom: 10px; }
.debug-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0 8px;
}
.db-btn {
  padding: 10px 8px;
  border-radius: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.2px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.12);
}
.db-btn:active { transform: scale(0.97); opacity: 0.9; }
.db-blue   { background: linear-gradient(135deg, #379bff, #2d82d6); }
.db-green  { background: linear-gradient(135deg, #2ec27e, #1fa067); }
.db-purple { background: linear-gradient(135deg, #9775ff, #7a55e6); }
.db-red    { background: linear-gradient(135deg, #ff5a5d, #e03e43); }
.debug-tip {
  font-size: 10.5px;
  color: var(--text-muted);
  line-height: 1.6;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  margin-top: 4px;
}
.debug-log {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #0b0b0b;
  color: #d8ffd0;
  font-size: 11px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, "Courier New", monospace;
  border: 1rpx solid #27341d;
}
.container.light .debug-log {
  background: #f2fff0;
  color: #164a0b;
  border-color: #c9e7bd;
}
</style>
