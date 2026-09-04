<template>
  <view class="tac-wrap">
    <!-- Header bar -->
    <view class="tac-header" :class="['tac-h', { 'disabled': !hasEnoughData, 'expanded': expanded }]" @click="toggle">
      <view class="tac-title">
        <text class="tac-icon">📊</text>
        <text class="tac-txt">训练分析</text>
      </view>
      <view class="tac-mini-metrics" v-if="hasEnoughData">
        <view class="tac-m"><span class="lbl">容量</span><span class="val">{{ headerMetrics.tvl }}</span></view>
        <view class="tac-m"><span class="lbl">平均♥</span><span class="val tac-red">{{ headerMetrics.avgHr }}</span>
        </view>
        <view class="tac-m"><span class="lbl">峰值♥</span><span class="val tac-red">{{ headerMetrics.peakHr }}</span>
        </view>
      </view>
      <view class="tac-mini-metrics" v-else><span class="tac-warn">（积累更多数据... 至少 2 组 + 10 个 HR 采样）</span></view>
      <text class="tac-arrow">{{ expanded ? '▴' : '▾' }}</text>
    </view>

    <!-- Body -->
    <view class="tac-body" v-if="expanded && analysis">
      <!-- S1: 双 KPI -->
      <view class="dual-kpi">
        <view class="kpi-card mech">
          <view class="kpi-label">Mechanical Training Load</view>
          <view class="kpi-value">{{ analysis.session.totalVolumeLoad.toLocaleString('en-US') }} <small>kg</small>
          </view>
          <view class="kpi-sub">Total Volume · Σ weight × reps</view>
        </view>
        <view class="kpi-card cv">
          <view class="kpi-label">Cardiovascular Load</view>
          <view class="kpi-value">
            {{ analysis.session.cardiovascularLoad === null ? '—' : analysis.session.cardiovascularLoad }}
            <small>HRR·min</small>
          </view>
          <view class="kpi-sub">独立指标 · HRR 梯形积分</view>
        </view>
      </view>
      <!-- S2: 三格指标 + 来源 -->
      <view class="tri-stats">
        <view class="tri-cell">
          <view class="lbl">Total Volume</view>
          <view class="val">{{ analysis.session.totalVolumeLoad }} kg</view>
        </view>
        <view class="tri-cell">
          <view class="lbl">Average HR</view>
          <view class="val">
            <template v-if="analysis.session.averageHr !== null">{{ analysis.session.averageHr }} bpm</template>
            <template v-else>—</template>
          </view>
        </view>
        <view class="tri-cell">
          <view class="lbl">Peak HR</view>
          <view class="val">
            <template v-if="analysis.session.peakHr !== null">{{ analysis.session.peakHr }} bpm</template>
            <template v-else>—</template>
          </view>
        </view>
      </view>
      <view class="src-row">
        restingHR:
        <b>{{ analysis.session.restingHrUsed.value ?? '—' }}</b>（{{ sourceLabel(analysis.session.restingHrUsed.source) }}）
        &nbsp;|&nbsp; maxHR:
        <b>{{ analysis.session.maxHrUsed.value ?? '—' }}</b>（{{ sourceLabel(analysis.session.maxHrUsed.source) }}）
      </view>

      <!-- S3: 动作 HR 对比（Top 3） -->
      <view class="act-sec-title">🏋 动作级别 HR 对比（本次训练）</view>
      <view class="act-list" v-if="top3Actions.length">
        <view class="act-row" v-for="(a, i) in top3Actions" :key="i">
          <view class="act-name">{{ a.actionName }}</view>
          <view class="act-meta-bar">
            <view class="act-meta">♥平均 {{ a.averageHr ?? '—' }} · ♥峰值 {{ a.peakHr ?? '—' }} ·
              x{{ a.analyzedSetCount }}/{{ a.setCount }}</view>
            <view class="act-bar-bg">
              <view class="act-bar-fill" :style="{ width: (a.averageHr ? (a.averageHr - 60) * 0.9 + '%' : '2%') }">
              </view>
            </view>
          </view>
          <view class="act-delta"
            :class="'lv-' + (a.avgDeltaHr === null ? 0 : (a.avgDeltaHr >= 40 ? 3 : a.avgDeltaHr >= 25 ? 2 : 1))">
            {{ a.avgDeltaHr === null ? '—' : (a.avgDeltaHr > 0 ? '+' : '') + Math.round(a.avgDeltaHr) }}
          </view>
        </view>
      </view>
      <!-- Q2/Q4: 全部动作列表 - 折叠展开（不跳转） -->
      <view class="tac-more" v-if="allActions.length > 3">
        <view v-if="allActionsExpanded" class="act-list">
          <view class="act-row" v-for="(a, i) in allActions.slice(3)" :key="'rest-'+i">
            <view class="act-name">{{ a.actionName }}</view>
            <view class="act-meta-bar">
              <view class="act-meta">♥平均 {{ a.averageHr ?? '—' }} · ♥峰值 {{ a.peakHr ?? '—' }} ·
                x{{ a.analyzedSetCount }}/{{ a.setCount }}</view>
              <view class="act-bar-bg">
                <view class="act-bar-fill" :style="{ width: (a.averageHr ? (a.averageHr - 60) * 0.9 + '%' : '2%') }">
                </view>
              </view>
            </view>
            <view class="act-delta"
              :class="'lv-' + (a.avgDeltaHr === null ? 0 : (a.avgDeltaHr >= 40 ? 3 : a.avgDeltaHr >= 25 ? 2 : 1))">
              {{ a.avgDeltaHr === null ? '—' : (a.avgDeltaHr > 0 ? '+' : '') + Math.round(a.avgDeltaHr) }}
            </view>
          </view>
        </view>
        <view class="more-toggle-wrap">
          <text class="more-toggle" @click.stop="allActionsExpanded = !allActionsExpanded">
            {{ allActionsExpanded ? '收起其它动作' : `查看全部 ${allActions.length} 个动作` }} {{ allActionsExpanded ? '▴' : '▾' }}
          </text>
        </view>
      </view>

      <!-- S4: 按组详情（默认折叠） -->
      <view class="set-detail-toggle" @click="setDetailExpanded = !setDetailExpanded">
        <text>{{ setDetailExpanded ? '收起按组详情' : '展开按组详情（逐组 HR 窗口）' }}</text>
        <text class="arr">{{ setDetailExpanded ? '▴' : '▾' }}</text>
      </view>
      <view class="set-detail-wrap" v-if="setDetailExpanded">
        <view class="set-row set-header">
          <span class="col">#</span>
          <span class="col">动作</span>
          <span class="col">w×r</span>
          <span class="col">VL</span>
          <span class="col">HR 窗口</span>
          <span class="col">ΔHR</span>
        </view>
        <view class="set-row" v-for="(s, i) in analysis.setAnalyses" :key="i">
          <span class="col">{{ i + 1 }}</span>
          <span class="col sm">{{ s.actionName }}</span>
          <span class="col">{{ s.weight }}×{{ s.reps }}</span>
          <span class="col">{{ s.volumeLoad }}</span>
          <span class="col" v-if="s.hr.analyzed">
            {{ s.hr.startHr }}→<b>{{ s.hr.peakHr }}</b>→{{ s.hr.endHr }}
            <small>({{ s.hr.sampleCount }}smp · est {{ s.estimatedSetDurationSec ?? '—' }}s)</small>
          </span>
          <span class="col warn" v-else>⚠ 采样不足{{ s.estimatedSetDurationSec === 0 ? '（窗口异常）' : '' }}</span>
          <span class="col"
            v-if="s.hr.analyzed && s.hr.deltaHr !== null">{{ s.hr.deltaHr > 0 ? '+' : '' }}{{ s.hr.deltaHr }}</span>
          <span class="col" v-else>—</span>
        </view>
      </view>

      <!-- Footer actions -->
      <view class="tac-footer">
        <!-- Q2/Q4: 在独立页 hideActionLinks=true 时不显示跳转链接 -->
        <text v-if="!hideActionLinks && !forceExpanded" class="btn-link" @click="goFullReport">打开训练分析独立页 →</text>
        <text v-else class="btn-link placeholder-link"></text>
        <view class="footer-btns">
          <text class="btn-ghost" @click="recalc(true)">立即重新计算</text>
          <text class="btn-primary" :class="{disabled: effectiveFinalized || !hasEnoughData}" @click="finalizeSession">
            {{ effectiveFinalized ? '训练已结束' : '结束训练' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    analyzeTrainingSession
  } from '@/utils/strengthTrainingAnalyzer.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    getActionCategory
  } from '@/utils/dayHelper.js'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useActionStore
  } from '@/stores/action.js'

  export default {
    name: 'training-analysis-card',
    props: {
      entries: {
        type: Object,
        required: true
      },
      hrSamplesWithTs: {
        type: Array,
        default: () => []
      },
      currentDateStr: {
        type: String,
        required: true
      },
      profile: {
        type: Object,
        required: true
      },
      existingAnalysis: {
        type: Object,
        default: null
      },
      forceExpanded: {
        type: Boolean,
        default: false
      },
      /** Q2/Q4: true = 隐藏跳转训练分析页的链接（训练分析独立页里自己嵌入的卡片需要置 true，避免原地跳转堆叠） */
      hideActionLinks: {
        type: Boolean,
        default: false
      },
      /** 心率是否因「停止广播」而被标记暂停（来自 dayData.hrPausedForNoHr），用于加速「训练已结束」判定 */
      hrPausedForNoHr: {
        type: Boolean,
        default: false
      },
      /** 心率最后活跃时间戳 ms（来自 dayData.hrLastActiveTs），hrPausedForNoHr=true 时配合做快速判定 */
      hrLastActiveTs: {
        type: Number,
        default: 0
      },
    },
    data() {
      return {
        expanded: false,
        setDetailExpanded: false,
        allActionsExpanded: false,
        analysis: null,
      }
    },
    computed: {
      actionsArr() {
        return Object.entries(this.entries || {})
      },
      hasEnoughData() {
        const entryCount = this.actionsArr.reduce((n, [_, list]) => n + (list ? list.filter(e => !e.isPlaceholder)
          .length : 0), 0)
        return entryCount >= 2 && (this.hrSamplesWithTs?.length || 0) >= 10
      },
      headerMetrics() {
        if (!this.analysis) return {
          tvl: '—',
          avgHr: '—',
          peakHr: '—'
        }
        const s = this.analysis.session
        return {
          tvl: s.totalVolumeLoad.toLocaleString('en-US') + ' kg',
          avgHr: s.averageHr === null ? '—' : Math.round(s.averageHr),
          peakHr: s.peakHr === null ? '—' : s.peakHr,
        }
      },
      allActions() {
        if (!this.analysis) return []
        return Object.values(this.analysis.actionAnalyses)
          .sort((a, b) => b.totalVolume - a.totalVolume)
      },
      top3Actions() {
        return this.allActions.slice(0, 3)
      },
      // ★ 修复「心率断开仍显示训练中」：
      //   1) status === 'finalized' → YES
      //   2) 非今日训练 → YES
      //   3) 正常空闲阈值：从 10 分钟缩短到 3 分钟（胸背腿大组休息也才 3 分钟，超了基本就是练完了）
      //   4) hrPausedForNoHr=true（手环明确停过广播） + 最后活跃 > 60 秒 → YES
      effectiveFinalized() {
        if (!this.analysis) return false
        if (this.analysis.status === 'finalized') return true
        const today = new Date()
        const todayStr =
          `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        if (this.currentDateStr !== todayStr) return true // 历史日期视为已结束

        // 最后一次「有效活动」时间戳：优先最后 HR 采样，否则 analysis 生成时
        const lastTs = this.hrSamplesWithTs.length ?
          (this.hrSamplesWithTs[this.hrSamplesWithTs.length - 1]?.ts || 0) :
          (this.analysis.generatedAt || 0)
        const gapMin = (Date.now() - Number(lastTs || 0)) / 60000

        // Case A: 明确被标记「因手环停止广播而暂停」 + 超过 60 秒没有任何活动 → 视为训练已结束
        if (this.hrPausedForNoHr === true) {
          const lastActiveMs = this.hrLastActiveTs || lastTs || Date.now()
          const silenceSec = (Date.now() - Number(lastActiveMs)) / 1000
          if (silenceSec >= 60) return true
        }

        // Case B: 通用空闲阈值（3 分钟无新采样 / 无新分析）→ 视为训练已结束
        return gapMin >= 3
      },
    },
    methods: {
      recalc(saveAfter = false) {
        const flat = []
        for (const [aname, list] of Object.entries(this.entries || {})) {
          if (!Array.isArray(list)) continue
          let idx = 0
          for (const e of list) {
            if (e.isPlaceholder) continue
            idx += 1
            const stages = Array.isArray(e.stages) ? e.stages : []
            const firstStage = stages[0] || {}
            const w = Number(firstStage.weight) || 0
            // reps：所有 stage 的 reps 求和（用于 UI 展示列）
            const r = stages.reduce((s, st) => s + (Number(st.reps) || 0), 0) || 0
            // ★ 关键修复：容量使用 entry.total（buildEntry 已正确处理：
            //   单侧动作 ×2、自重动作用 reps、复合组多阶段分别相加）
            const entryTotal = Number(e.total)
            const volumeLoad = Number.isFinite(entryTotal) ? entryTotal
              : stages.reduce((sum, s) => {
                  const sw = Number(s.weight) || 0
                  const sr = Number(s.reps) || 0
                  return sum + (sw > 0 ? sw * sr : sr)
                }, 0)
            flat.push({
              actionName: aname,
              setIndex: idx,
              timestamp: e.timestamp || null,
              weight: w,
              reps: r,
              volumeLoad,
              stages,
              bwMode: e.bwMode,
            })
          }
        }
        flat.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0))
        const s = useDaySettingsStore()
        const actionStore = useActionStore()
        const restFn = (actionName) => {
          const cat = getActionCategory(actionName, actionStore)
          if (cat === 'heavy') return Number(s.heavyTimerDuration) || 180
          return Number(s.lightTimerDuration) || 120
        }
        const cache = useDayDataCacheStore()
        const histBest = (actionName) => {
          if (typeof cache.scanHistoricalBestForAction === 'function') {
            return cache.scanHistoricalBestForAction(actionName, this.currentDateStr)
          }
          // 兜底：扫描最近 30 天历史最佳（bestWeight, bestReps）
          try {
            const dates = Array.isArray(cache.sortedDates) ? cache.sortedDates : (cache.getDates ? cache.getDates() :
              [])
            let best = {
              bestWeight: 0,
              bestReps: 0
            }
            for (const d of dates.slice(0, 30)) {
              if (d === this.currentDateStr) continue
              const ddata = cache.getDayData(d)
              if (!ddata || !ddata.templates) continue
              for (const tplName of Object.keys(ddata.templates)) {
                const tpl = ddata.templates[tplName]
                const entries = (tpl && tpl.entries && tpl.entries[actionName]) || []
                for (const e of entries) {
                  if (!e || e.isPlaceholder || !e.stages || !e.stages.length) continue
                  const w = Number(e.stages[0].weight) || 0
                  const r = e.stages.reduce((ss, st) => ss + (Number(st.reps) || 0), 0)
                  if (w > best.bestWeight || (w === best.bestWeight && r > best.bestReps)) {
                    best = {
                      bestWeight: w,
                      bestReps: Math.max(r, 1)
                    }
                  }
                }
              }
            }
            return best.bestWeight > 0 ? best : null
          } catch (e) {
            return null
          }
        }
        const result = analyzeTrainingSession({
          entries: flat,
          hrSamplesWithTs: this.hrSamplesWithTs,
          restDurationSecByAction: restFn,
          profile: this.profile,
          historicalBestGetter: histBest,
        })
        if (this.existingAnalysis?.status === 'finalized') {
          result.status = 'finalized'
          result.sessionEndTs = this.existingAnalysis.sessionEndTs || result.sessionEndTs
        }
        result.generatedAt = Date.now()
        this.analysis = result
        if (saveAfter) {
          // 通过 updateDayData 合并保存 trainingAnalysis
          try {
            cache.updateDayData(this.currentDateStr, {
              trainingAnalysis: result
            })
          } catch (e) {
            /* 静默失败：下次重算即可 */
          }
          this.$emit('analysis-updated', result)
        }
        return result
      },
      toggle() {
        if (this.hasEnoughData) this.expanded = !this.expanded
      },
      goFullReport() {
        // Q4: 防堆叠 — 如果当前已经在训练分析独立页，忽略这次跳转
        const pages = getCurrentPages()
        const top = pages && pages.length ? pages[pages.length - 1] : null
        const route = top && (top.route || (top.$page && top.$page.fullPath))
        if (route && String(route).indexOf('trainingAnalysis') >= 0) {
          this.expanded = true
          return
        }
        // 用 redirectTo 替代 navigateTo：即使在 day.vue 入口重复点也不会叠加
        uni.redirectTo({
          url: `/subpkg-training/trainingAnalysis/trainingAnalysis?date=${this.currentDateStr}`
        })
      },
      finalizeSession() {
        if (!this.analysis || this.effectiveFinalized) {
          // Q3: finalized 时点击按钮 → 向父级冒泡 request-finalize 事件（若已在独立页父级处理可重置）
          this.$emit('request-finalize', {
            reason: 'already-finalized'
          })
          return
        }
        this.analysis.status = 'finalized'
        const lastTs = this.analysis.setAnalyses.length ?
          Math.max(...this.analysis.setAnalyses.map(s => Number(s.timestamp) || 0)) :
          0
        this.analysis.sessionEndTs = Math.max(lastTs, Date.now())
        try {
          const cache = useDayDataCacheStore()
          cache.updateDayData(this.currentDateStr, {
            trainingAnalysis: this.analysis
          })
        } catch (e) {}
        this.$emit('analysis-finalized', this.analysis)
        this.$emit('request-finalize', {
          reason: 'manual',
          analysis: this.analysis
        })
        uni.showToast({
          title: '训练已结束',
          icon: 'success'
        })
      },
      sourceLabel(src) {
        return {
          profile: '用户填写',
          window: '估算值（初期60s最低）',
          estimated: '估算值',
          formula: '公式 (220-age)',
          'age-missing': '年龄未填',
          none: '无法估算',
        } [src] || src
      },
    },
    mounted() {
      if (this.forceExpanded) this.expanded = true
      if (this.existingAnalysis) this.analysis = this.existingAnalysis
      else if (this.hasEnoughData) this.recalc(false)
    },
  }
</script>

<style scoped>
  /* 与其它页面一致：使用 App.vue 全局 Design Token
   根卡片外层由所在页面的 .container.dark / .container.liquid-glass 提供变量 */
  .tac-wrap {
    margin: 0 0 16px;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1rpx solid var(--border-color);
    overflow: hidden;
    color: var(--text-primary);
  }

  .tac-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-tertiary);
    border-bottom: 1rpx solid var(--border-color);
  }

  .tac-header.disabled {
    opacity: 0.55;
  }

  .tac-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--section-title);
  }

  .tac-icon {
    font-size: 18px;
  }

  .tac-mini-metrics {
    flex: 1;
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    margin-right: 12px;
    font-size: 13px;
  }

  .tac-m .lbl {
    color: var(--text-muted);
    font-size: 11px;
    margin-right: 4px;
  }

  .tac-m .val {
    font-weight: 700;
    color: var(--text-primary);
  }

  .tac-m .val.tac-red {
    color: var(--danger, #ff5a5d);
  }

  .tac-warn {
    color: var(--text-muted);
    font-size: 12px;
  }

  .tac-arrow {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .tac-body {
    padding: 16px;
  }

  .dual-kpi {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .kpi-card {
    border-radius: 8px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-left: 3px solid var(--border-color);
  }

  .kpi-card.mech {
    border-left-color: var(--primary, #379bff);
  }

  .kpi-card.cv {
    border-left-color: var(--danger, #ff5a5d);
  }

  .kpi-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .kpi-value {
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    margin: 4px 0;
    color: var(--text-primary);
  }

  .kpi-value small {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .kpi-sub {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .tri-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px 0;
    border-top: 1rpx solid var(--border-color);
    border-bottom: 1rpx solid var(--border-color);
  }

  .tri-cell {
    text-align: center;
  }

  .tri-cell .lbl {
    font-size: 11px;
    color: var(--text-muted);
  }

  .tri-cell .val {
    font-size: 14px;
    font-weight: 700;
    margin-top: 2px;
    color: var(--text-primary);
  }

  .src-row {
    padding: 6px 0 12px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .src-row b {
    color: var(--text-primary);
    font-weight: 600;
  }

  .act-sec-title {
    padding: 6px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--section-title);
  }

  .act-row {
    display: grid;
    grid-template-columns: 90px 1fr 50px;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
  }

  .act-name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
  }

  .act-meta {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .act-bar-bg {
    height: 7px;
    background: var(--bg-tertiary);
    border-radius: 999px;
    border: 1rpx solid var(--border-color);
    margin-top: 4px;
    overflow: hidden;
  }

  .act-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary, #379bff), var(--danger, #ff5a5d));
    border-radius: 999px;
    transition: width .2s;
  }

  .act-delta {
    font-size: 12px;
    font-weight: 700;
    text-align: right;
  }

  .act-delta.lv-0 {
    color: var(--text-muted);
  }

  .act-delta.lv-1 {
    color: var(--success, #2ed573);
  }

  .act-delta.lv-2 {
    color: var(--warning, #f0ad4e);
  }

  .act-delta.lv-3 {
    color: var(--danger, #ff5a5d);
  }

  .tac-more {
    padding: 6px 0 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .more-toggle-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .more-toggle {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 14px;
    background: var(--bg-tertiary);
    border: 1rpx solid var(--border-color);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .set-detail-toggle {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-top: 1rpx dashed var(--border-color);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .set-row {
    display: grid;
    grid-template-columns: 28px 1fr 70px 60px 1.2fr 60px;
    gap: 4px;
    padding: 6px 4px;
    font-size: 11px;
    border-bottom: 1rpx solid var(--border-color);
    color: var(--text-primary);
  }

  .set-row .col {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .set-row.set-header {
    background: var(--bg-tertiary);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .set-row .col.sm {
    font-weight: 600;
    font-size: 12px;
  }

  .set-row .col.warn {
    color: var(--danger, #ff5a5d);
    font-size: 10px;
  }

  .set-row small {
    display: block;
    color: var(--text-muted);
    font-size: 9px;
  }

  .tac-footer {
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1rpx solid var(--border-color);
  }

  .btn-link {
    color: var(--primary, #379bff);
    font-size: 12px;
    font-weight: 600;
  }

  .placeholder-link {
    visibility: hidden;
  }

  .footer-btns {
    display: flex;
    gap: 8px;
  }

  .btn-ghost {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1rpx solid var(--border-color);
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--bg-btn);
  }

  .btn-primary {
    padding: 5px 14px;
    border-radius: 6px;
    background: linear-gradient(135deg, var(--primary, #379bff), var(--primary-dark, #2d82d6));
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }

  .btn-primary.disabled {
    opacity: 0.4;
  }
</style>