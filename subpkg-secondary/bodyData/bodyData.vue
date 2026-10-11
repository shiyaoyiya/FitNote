<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <scroll-view class="page-scroll" scroll-y="true">
      <!-- 身体档案 -->
      <view class="card">
        <view class="card-title">
          <text class="card-title-text">身体档案</text>
          <text class="card-title-sub">数据仅保存在本地，随备份导出</text>
        </view>

        <view v-show="!profileCollapsed" class="profile-body">

        <!-- 性别 -->
        <view class="field-row">
          <text class="field-label">性别</text>
          <view class="gender-group">
            <view :class="['chip', form.gender === 'male' && 'on']" @click="setGender('male')">
              <text>男</text>
            </view>
            <view :class="['chip', form.gender === 'female' && 'on']" @click="setGender('female')">
              <text>女</text>
            </view>
          </view>
        </view>

        <!-- 出生年月（年龄自动计算） -->
        <picker mode="date" fields="month" :value="form.birthDate || todayMonth" :end="todayMonth" @change="onBirthChange">
          <view class="field-row">
            <text class="field-label">出生年月</text>
            <view class="field-value">
              <text :class="['field-text', { ph: !form.birthDate }]">{{ form.birthDate || '请选择出生年月' }}</text>
              <text class="field-sub" v-if="age > 0">（{{ age }} 岁）</text>
              <text class="field-arrow">›</text>
            </view>
          </view>
        </picker>

        <!-- 身高 -->
        <view class="field-row">
          <text class="field-label">身高(cm)</text>
          <view class="input-wrap">
            <input class="field-input" type="digit" v-model="form.height" placeholder="100-250" maxlength="3"
              @confirm="saveField('height')" @blur="saveField('height')" />
            <text class="input-unit">cm</text>
          </view>
        </view>

        <!-- 体重（实时更新） -->
        <view class="field-row">
          <text class="field-label">体重(kg)</text>
          <view class="input-wrap">
            <input class="field-input" type="digit" v-model="form.weight" placeholder="20-300" maxlength="5"
              @confirm="saveField('weight')" @blur="saveField('weight')" />
            <text class="input-unit">kg</text>
          </view>
        </view>
        <text class="field-hint">体重输入后自动保存并记入下方趋势图（同一天只保留最新一次）。补录历史某天体重，请在下方“体重趋势”卡片点“补录历史体重”。</text>

        <!-- 活动系数 -->
        <view class="field-row column">
          <text class="field-label">活动系数</text>
          <view class="factor-group">
            <view v-for="f in factors" :key="f.value" :class="['factor-chip', form.activityFactor === f.value && 'on']"
              @click="setFactor(f.value)">
              <text class="factor-value">{{ f.value }}</text>
              <text class="factor-name">{{ f.name }}</text>
            </view>
            <text class="factor-desc">{{ selectedFactorDesc }}</text>
          </view>
        </view>

        <text v-if="hint" class="form-hint">{{ hint }}</text>
        </view>

        <view class="collapse-toggle" @click="toggleProfileCollapse">
          <text class="collapse-arrow" :class="{ flipped: profileCollapsed }">⌄</text>
        </view>
      </view>

      <!-- TDEE 卡片 -->
      <view class="card tdee-card">
        <view class="card-title">
          <text class="card-title-text">每日消耗估算 TDEE</text>
          <text class="card-title-sub">Mifflin-St Jeor 公式 × 活动系数</text>
        </view>
        <view class="tdee-main">
          <view class="tdee-number-wrap">
            <text class="tdee-number">{{ tdeeDisplay }}</text>
            <text class="tdee-unit">kcal/天</text>
          </view>
          <view class="tdee-detail">
            <text class="tdee-detail-row">基础代谢 BMR：{{ bmrDisplay }}</text>
            <text class="tdee-detail-row">活动系数：{{ form.activityFactor || 1.2 }}</text>
            <text class="tdee-detail-row" v-if="age > 0">年龄：{{ age }} 岁</text>
          </view>
        </view>
        <text class="tdee-hint" v-if="!tdeeReady">填写性别、出生年月、身高、体重后可自动计算</text>
      </view>

      <!-- 体重趋势 -->
      <view class="card chart-card">
        <view class="card-title chart-title-row">
        <text class="card-title-text">体重趋势</text>
        <view v-if="!chartEmpty" class="chart-legend">
          <text class="legend-dot"></text>
          <text class="legend-text">体重 (kg)</text>
        </view>
        <view class="chart-title-actions">
          <view class="backfill-btn" @click="showBackfill = true">补录历史体重</view>
          <view class="chart-help-btn" @click="showWeightHelp = true">?</view>
        </view>
      </view>
        <view v-if="!chartEmpty" class="range-btns">
          <view v-for="r in ranges" :key="r.value" class="range-btn"
            :class="{ active: activeRange === r.value }" @click="onRangeClick(r.value)">{{ r.label }}</view>
        </view>
        <view class="chart-box">
          <canvas :id="canvasId" :canvas-id="canvasId" class="chart-canvas"
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
            @touchstart="onChartTouchStart" @touchmove="onChartTouchMove"
            @touchend="onChartTouchEnd" @touchcancel="onChartTouchEnd"></canvas>
          <view v-if="chartEmpty" class="chart-empty">
            <text>暂无体重记录，填写体重后自动生成趋势图</text>
          </view>
          <view v-else-if="rangeEmpty" class="chart-empty">
            <text>该时间段暂无记录</text>
          </view>
        </view>
        <view class="stats-row">
          <view v-if="chartEmpty" class="stats-empty">暂无体重记录</view>
          <template v-else>
            <view class="stats-item">
              <text class="stats-label">近7天平均体重</text>
              <view class="stats-value-wrap">
                <text class="stats-value">{{ weekStats.avgText }}</text>
                <text v-if="weekStats.insufficient" class="stats-sample-hint">样本不足</text>
              </view>
            </view>
            <view class="stats-item">
              <text class="stats-label">相比一周前</text>
              <text :class="['stats-value', weekStats.diffClass]">{{ weekStats.diffLabel }}</text>
            </view>
          </template>
        </view>
        <text class="chart-hint">7日均值每日滚动更新，抹平单日水分、排便带来的波动；周对比为两段7天均值之差，非单日比较。</text>
      </view>

      <!-- 补录历史体重弹窗 -->
      <view v-if="showBackfill" class="help-overlay" @click="showBackfill = false">
        <view class="help-panel" @click.stop>
          <view class="help-title">补录历史体重</view>
          <picker mode="date" :value="backfillDate" :end="todayDate" @change="onBackfillDateChange">
            <view class="backfill-row">
              <text class="backfill-label">日期</text>
              <text class="backfill-value">{{ backfillDate === todayDate ? '今天' : backfillDate }} ›</text>
            </view>
          </picker>
          <view class="backfill-row">
            <text class="backfill-label">体重(kg)</text>
            <input class="backfill-input" type="digit" v-model="backfillWeight" placeholder="20-300" maxlength="5" />
          </view>
          <view class="backfill-actions">
            <view class="backfill-cancel" @click="showBackfill = false">取消</view>
            <view class="backfill-confirm" @click="confirmBackfill">确认补录</view>
          </view>
        </view>
      </view>

      <!-- 体重指标说明弹窗 -->
      <view v-if="showWeightHelp" class="help-overlay" @click="showWeightHelp = false">
        <view class="help-panel" @click.stop>
          <view class="help-title">体重指标说明</view>
          <view class="help-section">
            <text class="help-h">✅ 7日滑动平均体重</text>
            <text class="help-p">自动滚动计算最近连续7天体重的平均值，每天更新。</text>
            <text class="help-p">作用：过滤每日水分、盐分、排便造成的短期体重起伏，得到更真实的体重基线。</text>
          </view>
          <view class="help-section">
            <text class="help-h">✅ 周变化（相比一周前）</text>
            <text class="help-p">使用【今日的7天平均】减去【7天前那一天的7天平均快照】。</text>
            <text class="help-p">本质是两段相隔一周的平滑数据对比，用来判断你的真实增肌/减脂速率。</text>
          </view>
          <view class="help-section">
            <text class="help-h">⚠️ 注意事项</text>
            <text class="help-p">建议固定在晨起空腹上完厕所称重，保证数据一致性。</text>
            <text class="help-p">单日体重波动属于正常现象，不要依靠单日体重判断效果。</text>
            <text class="help-p">记录未满7天，暂不展示周变化。</text>
          </view>
          <view class="help-close" @click="showWeightHelp = false">知道了</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'
  import { useUserProfileStore } from '@/stores/userProfile.js'
  import { getSystemInfo, measureTextWidth } from '@/utils/canvasHelper.js'

  // y 轴刻度候选（单位间隔随波动幅度自适应）
  const NICE_STEPS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]

  function niceCeil(v) {
    for (const s of NICE_STEPS) {
      if (s >= v) return s
    }
    return 100
  }

  // 去尾零的数值显示（72.3000001 → 72.3）
  function fmt(v) {
    const n = Math.round(v * 100) / 100
    return String(n)
  }

  export default {
    data() {
      return {
        daySettingsStore: null,
        store: null,
        form: {
          gender: 'male',
          birthDate: '',
          height: '',
          weight: '',
          activityFactor: 1.2,
        },
        factors: [
          { value: 1.2, name: '久坐', desc: '几乎不运动，办公室久坐，日常仅少量走动' },
          { value: 1.375, name: '轻度', desc: '每周轻度运动 1-3 次，如散步、瑜伽、轻度健身' },
          { value: 1.55, name: '中度', desc: '每周中等强度运动 3-5 次，如慢跑、力量训练、骑车' },
          { value: 1.725, name: '高强度', desc: '每周高强度运动 6-7 次，如快跑、HIIT、球类竞技' },
          { value: 1.9, name: '极高', desc: '重体力劳动，或专业运动员每日高强度训练' },
        ],
        hint: '',
        profileCollapsed: false,
        showWeightHelp: false,
        canvasId: 'weightTrendCanvas',
        canvasWidth: 340,
        canvasHeight: 220,
        canvasReady: false,
        ctx: null,
        isMiniProgram: false,
        todayMonth: '',
        todayDate: '',
        backfillDate: '',
        backfillWeight: '',
        showBackfill: false,
        // 十字准星（手指滑动查看）
        crosshairActive: false,
        crosshairIndex: -1,
        // 趋势图时间范围（拖动杆），对齐动作历史页
        ranges: [
          { label: '全部', value: 'all' },
          { label: '1月', value: 1 },
          { label: '3月', value: 3 },
          { label: '6月', value: 6 },
          { label: '1年', value: 12 },
        ],
        activeRange: 'all',
      }
    },
    computed: {
      age() {
        return this.store ? this.store.age : 0
      },
      bmr() {
        if (!this.store) return null
        return this.store.bmr
      },
      tdee() {
        if (!this.store) return null
        return this.store.tdee
      },
      bmrDisplay() {
        return this.bmr === null ? '--' : fmt(this.bmr) + ' kcal'
      },
      tdeeDisplay() {
        return this.tdee === null ? '--' : fmt(this.tdee)
      },
      tdeeReady() {
        return this.tdee !== null
      },
      selectedFactorDesc() {
        const f = this.factors.find(x => x.value === this.form.activityFactor)
        return f ? f.desc : ''
      },
      // 按日期升序、同天去重（保留最新）的体重序列
      chartItems() {
        if (!this.store || !Array.isArray(this.store.weightHistory)) return []
        const map = {}
        ;(this.store.weightHistory || []).forEach(it => {
          if (it && it.date && it.weight != null) map[it.date] = Number(it.weight)
        })
        return Object.keys(map).sort().map(date => ({ date, weight: map[date] }))
      },
      chartEmpty() {
        return this.chartItems.length === 0
      },
      // 按时间范围过滤后的序列（拖动杆）
      rangeItems() {
        const items = this.chartItems
        if (!items.length) return []
        if (this.activeRange === 'all') return items
        const now = new Date()
        const cutoff = new Date(now.getFullYear(), now.getMonth() - this.activeRange, now.getDate())
        return items.filter(it => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(it.date)
          if (!m) return false
          const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
          return d >= cutoff
        })
      },
      // 有整体数据、但当前时间范围内没有记录
      rangeEmpty() {
        return this.chartItems.length > 0 && this.rangeItems.length === 0
      },

      // 近7日平均体重 & 较上周变化（涨红跌绿）
      weekStats() {
        const items = this.chartItems
        if (!items.length) return null
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const statIn = (startDay, endDay) => {
          let s = 0, n = 0
          items.forEach(it => {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(it.date)
            if (!m) return
            const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
            const diffDays = Math.round((today - d) / 86400000)
            if (diffDays >= startDay && diffDays <= endDay) {
              s += Number(it.weight)
              n++
            }
          })
          return n ? { avg: s / n, count: n } : null
        }
        // 近7天窗口；窗口内无记录时退化为全部记录（标注样本不足）
        const thisWeek = statIn(0, 6) || statIn(0, 9999)
        if (!thisWeek) return null
        const lastWeek = statIn(7, 13)
        const a1 = Math.round(thisWeek.avg * 100) / 100
        const insufficient = thisWeek.count < 7
        let diffClass = 'stats-none'
        let diffLabel = '记录不足7天'
        if (lastWeek) {
          const diff = Math.round((thisWeek.avg - lastWeek.avg) * 100) / 100
          if (diff > 0) { diffClass = 'stats-up'; diffLabel = '+' + diff.toFixed(2) + ' kg' }
          else if (diff < 0) { diffClass = 'stats-down'; diffLabel = diff.toFixed(2) + ' kg' }
          else { diffLabel = '0.00 kg' }
        }
        return { avgText: a1.toFixed(2) + ' kg', insufficient, diffLabel, diffClass }
      },
    },
    onLoad() {
      this.daySettingsStore = useDaySettingsStore()
      this.daySettingsStore.load()
      this.store = useUserProfileStore()
      const now = new Date()
      this.todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      this.todayDate = `${this.todayMonth}-${String(now.getDate()).padStart(2, '0')}`
      this.backfillDate = this.todayDate
    },
    onShow() {
      if (!this.store) return
      this.store.load()
      this.syncFromStore()
      if (!this.store.gender) {
        this.store.updateProfile({ gender: this.form.gender })
      }
      try {
        this.profileCollapsed = uni.getStorageSync('fitness_body_profile_collapsed') === '1'
      } catch (e) {}
      this.$nextTick(() => {
        setTimeout(() => this.initChart(), 60)
      })
    },
    onReady() {
      this.$nextTick(() => {
        setTimeout(() => this.initChart(), 60)
      })
    },
    methods: {
      syncFromStore() {
        const s = this.store
        this.form = {
          gender: s.gender || 'male',
          birthDate: s.birthDate || '',
          height: s.height != null ? String(s.height) : '',
          weight: s.weight != null ? String(s.weight) : '',
          activityFactor: s.activityFactor || 1.2,
        }
      },
      setGender(g) {
        this.form.gender = g
        this.saveField('gender')
      },
      setFactor(v) {
        this.form.activityFactor = v
        this.saveField('activityFactor')
      },
      onBirthChange(e) {
        this.form.birthDate = e.detail.value
        this.saveField('birthDate')
      },
      onBackfillDateChange(e) {
        this.backfillDate = e.detail.value
      },
      onRangeClick(val) {
        this.activeRange = val
        this.crosshairActive = false
        this.$nextTick(() => this.drawChart())
      },
      onChartTouchStart(e) {
        const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null)
        if (!touch) return
        this.crosshairActive = true
        this.updateCrosshair(touch)
      },
      onChartTouchMove(e) {
        if (!this.crosshairActive) return
        const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null)
        if (!touch) return
        this.updateCrosshair(touch)
      },
      onChartTouchEnd() {
        this.crosshairActive = false
        this.drawChart()
      },
      updateCrosshair(touch) {
        const items = this.rangeItems
        if (!items || !items.length) return
        const pad = { top: 22, right: 20, bottom: 34, left: 48 }
        const plotW = this.canvasWidth - pad.left - pad.right
        const x = (touch.clientX || touch.x || 0) - pad.left
        const idx = this.nearestIndex(x, plotW, items.length)
        if (idx !== this.crosshairIndex) {
          this.crosshairIndex = idx
          this.drawChart()
        }
      },
      nearestIndex(x, plotW, count) {
        if (count <= 1) return 0
        const step = plotW / (count - 1)
        const raw = Math.round(x / step)
        return Math.max(0, Math.min(count - 1, raw))
      },
      confirmBackfill() {
        const v = Number(this.backfillWeight)
        if (!this.backfillWeight || Number.isNaN(v)) {
          uni.showToast({ title: '请输入体重', icon: 'none' })
          return
        }
        if (v < 20 || v > 300) {
          uni.showToast({ title: '体重需在 20-300', icon: 'none' })
          return
        }
        this.store.recordWeight(this.backfillDate, v)
        uni.showToast({ title: '已补录 ' + this.backfillDate, icon: 'success' })
        this.showBackfill = false
        this.backfillWeight = ''
        this.$nextTick(() => this.drawChart())
      },
      toggleProfileCollapse() {
        this.profileCollapsed = !this.profileCollapsed
        try {
          uni.setStorageSync('fitness_body_profile_collapsed', this.profileCollapsed ? '1' : '0')
        } catch (e) {}
      },
      saveField(field) {
        this.hint = ''
        const patch = {}
        // 性别始终随当前表单值一并保存（默认男，避免未点选时 store 无性别导致 TDEE 无法计算）
        patch.gender = this.form.gender
        if (field === 'birthDate') {
          patch.birthDate = this.form.birthDate
        } else if (field === 'height') {
          if (this.form.height === '' || this.form.height === undefined || this.form.height === null) return
          const v = Number(this.form.height)
          if (Number.isNaN(v)) return
          patch.height = v
        } else if (field === 'weight') {
          if (this.form.weight === '' || this.form.weight === undefined || this.form.weight === null) return
          const v = Number(this.form.weight)
          if (Number.isNaN(v)) return
          patch.weight = v
        } else if (field === 'activityFactor') {
          patch.activityFactor = this.form.activityFactor
        }
        if (Object.keys(patch).length === 0) return
        try {
          this.store.updateProfile(patch)
          this.syncFromStore()
          if (field === 'weight') {
            uni.showToast({ title: '体重已更新', icon: 'success' })
            this.$nextTick(() => this.drawChart())
          }
        } catch (e) {
          this.hint = e.message || '保存失败'
        }
      },

      /* ================= 体重趋势图 ================= */
      initChart() {
        const sysInfoPromise = getSystemInfo()
        sysInfoPromise.then(() => {
          const query = uni.createSelectorQuery().in(this)
          query.select('.chart-box').boundingClientRect(rect => {
            if (rect && Math.round(rect.width) > 0) {
              this.canvasWidth = Math.round(rect.width)
            }
            this.setupCanvas()
          }).exec()
        }).catch(() => {
          this.setupCanvas()
        })
      },

      setupCanvas() {
        const id = this.canvasId
        const isWx = typeof wx !== 'undefined' && wx.canIUse
        const hasCreateCanvasContext = typeof uni.createCanvasContext === 'function'
        this.isMiniProgram = isWx && hasCreateCanvasContext

        if (this.isMiniProgram) {
          this.ctx = uni.createCanvasContext(id, this)
          this.canvasReady = true
          setTimeout(() => this.drawChart(), 80)
        } else {
          const canvas = document.getElementById(id)
          if (!canvas) return
          const pixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
          canvas.width = this.canvasWidth * pixelRatio
          canvas.height = this.canvasHeight * pixelRatio
          this.ctx = canvas.getContext('2d')
          if (this.ctx && pixelRatio !== 1) this.ctx.scale(pixelRatio, pixelRatio)
          this.canvasReady = true
          setTimeout(() => this.drawChart(), 80)
        }
      },

      drawChart() {
        if (!this.canvasReady || !this.ctx) return
        const ctx = this.ctx
        const w = this.canvasWidth
        const h = this.canvasHeight
        const isLight = !this.daySettingsStore.isDarkMode
        const items = this.rangeItems


        if (items.length === 0) {
          ctx.draw && ctx.draw()
          return
        }

        const pad = { top: 22, right: 20, bottom: 34, left: 48 }
        const plotW = w - pad.left - pad.right
        const plotH = h - pad.top - pad.bottom
        const n = items.length

        // 数据范围：首条记录固定在 y 轴中位，上下按最大偏差等距扩展
        const first = items[0].weight
        let maxDev = 0
        items.forEach(it => {
          maxDev = Math.max(maxDev, Math.abs(it.weight - first))
        })
        const halfRange = Math.max(maxDev * 1.15, 0.5)
        const yMin = first - halfRange
        const yMax = first + halfRange

        // 单位间隔：波动 ±1kg → 0.1kg；±10kg → 1kg（按最大偏差/10 取整档）
        const step = niceCeil(Math.max(0.05, maxDev / 10))
        // 主刻度（带标签）：取 step 的整数倍中最接近的整档
        const majorStep = niceCeil(step * 4)

        function xAt(i) {
          if (n === 1) return pad.left + plotW / 2
          return pad.left + (i / (n - 1)) * plotW
        }

        function yAt(val) {
          return pad.top + ((yMax - val) / (yMax - yMin)) * plotH
        }

        // 次网格线（step 间隔，体现单位刻度）
        ctx.setLineWidth(0.5)
        ctx.setStrokeStyle(isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)')
        const totalMinor = Math.round((yMax - yMin) / step)
        if (totalMinor <= 40) {
          for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9; v += step) {
            const y = yAt(v)
            ctx.beginPath()
            ctx.moveTo(pad.left, y)
            ctx.lineTo(pad.left + plotW, y)
            ctx.stroke()
          }
        }

        // 主网格线 + y 轴标签
        ctx.setLineWidth(1)
        ctx.setStrokeStyle(isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)')
        ctx.setFontSize(10)
        ctx.setFillStyle(isLight ? '#64748b' : '#888888')
        ctx.setTextAlign('right')
        for (let v = Math.ceil(yMin / majorStep) * majorStep; v <= yMax + 1e-9; v += majorStep) {
          const y = yAt(v)
          ctx.beginPath()
          ctx.moveTo(pad.left, y)
          ctx.lineTo(pad.left + plotW, y)
          ctx.stroke()
          ctx.fillText(fmt(v), pad.left - 6, y + 4)
        }

        // 首条记录中位线（强调）
        const midY = yAt(first)
        ctx.save()
        ctx.setLineWidth(1)
        ctx.setStrokeStyle(isLight ? 'rgba(55,155,255,0.35)' : 'rgba(55,155,255,0.5)')
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(pad.left, midY)
        ctx.lineTo(pad.left + plotW, midY)
        ctx.stroke()
        ctx.restore()

        // x 轴日期标签（间隔取整，避免拥挤；首尾必标）
        ctx.setFontSize(10)
        ctx.setFillStyle(isLight ? '#64748b' : '#888888')
        ctx.setTextAlign('center')
        const maxLabels = 6
        const stepIdx = Math.max(1, Math.ceil(n / maxLabels))
        for (let i = 0; i < n; i += stepIdx) {
          const d = items[i].date
          const label = `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
          ctx.fillText(label, xAt(i), pad.top + plotH + 16)
        }
        if ((n - 1) % stepIdx !== 0) {
          const d = items[n - 1].date
          ctx.fillText(`${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`, xAt(n - 1), pad.top + plotH + 16)
        }

        // 坐标轴边框
        ctx.setLineWidth(1)
        ctx.setStrokeStyle(isLight ? '#e2e8f0' : '#333333')
        ctx.beginPath()
        ctx.moveTo(pad.left, pad.top)
        ctx.lineTo(pad.left, pad.top + plotH)
        ctx.lineTo(pad.left + plotW, pad.top + plotH)
        ctx.stroke()

        // 折线
        ctx.setLineWidth(2)
        ctx.setStrokeStyle('#379bff')
        ctx.setLineJoin('round')
        ctx.setLineCap('round')
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const x = xAt(i)
          const y = yAt(items[i].weight)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // 数据点
        for (let i = 0; i < n; i++) {
          const x = xAt(i)
          const y = yAt(items[i].weight)
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.setFillStyle('#379bff')
          ctx.fill()
        }

        // 最后一个点高亮 + 数值
        const lx = xAt(n - 1)
        const ly = yAt(items[n - 1].weight)
        ctx.beginPath()
        ctx.arc(lx, ly, 5, 0, Math.PI * 2)
        ctx.setFillStyle('#ffffff')
        ctx.fill()
        ctx.beginPath()
        ctx.arc(lx, ly, 3, 0, Math.PI * 2)
        ctx.setFillStyle('#379bff')
        ctx.fill()
        ctx.setFontSize(10)
        ctx.setTextAlign('left')
        ctx.setFillStyle(isLight ? '#1a1a1a' : '#f7f7f7')
        const lastLabel = fmt(items[n - 1].weight) + 'kg'
        ctx.fillText(lastLabel, Math.min(lx + 6, pad.left + plotW - 40), ly - 8)

        // 首点标注（说明中位基线）；仅在多点时绘制，单点时与末端体重标签会重叠
        if (n > 1) {
          const fx = xAt(0)
          const fy = yAt(first)
          ctx.setFontSize(9)
          ctx.setTextAlign('center')
          ctx.setFillStyle(isLight ? '#64748b' : '#999999')
          ctx.fillText('首记录 ' + fmt(first), Math.max(fx, pad.left + 20), fy - 10)
        }

        // 十字准星（跟随手指，虚线 + 数值气泡）
        if (this.crosshairActive && items.length > 0) {
          const ci = Math.max(0, Math.min(items.length - 1, this.crosshairIndex))
          const cx = xAt(ci)
          const cy = yAt(items[ci].weight)

          ctx.save()
          ctx.setLineWidth(1)
          ctx.setStrokeStyle(isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)')
          ctx.setLineDash([4, 3])
          ctx.beginPath()
          ctx.moveTo(cx, pad.top)
          ctx.lineTo(cx, pad.top + plotH)
          ctx.stroke()
          ctx.restore()

          ctx.beginPath()
          ctx.arc(cx, cy, 5, 0, Math.PI * 2)
          ctx.setFillStyle('#ffffff')
          ctx.fill()
          ctx.beginPath()
          ctx.arc(cx, cy, 3, 0, Math.PI * 2)
          ctx.setFillStyle('#379bff')
          ctx.fill()

          const d = items[ci].date
          const label = fmt(items[ci].weight) + 'kg ' + Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10))
          ctx.setFontSize(11)
          ctx.setTextAlign('center')
          const tw = measureTextWidth(ctx, label)
          const lx = Math.max(pad.left + tw / 2 + 8, Math.min(pad.left + plotW - tw / 2 - 8, cx))
          const ly = pad.top + 4
          const bw = tw + 16
          const bh = 22
          const br = 6
          ctx.beginPath()
          ctx.moveTo(lx - bw / 2 + br, ly)
          ctx.lineTo(lx + bw / 2 - br, ly)
          ctx.arcTo(lx + bw / 2, ly, lx + bw / 2, ly + br, br)
          ctx.lineTo(lx + bw / 2, ly + bh - br)
          ctx.arcTo(lx + bw / 2, ly + bh, lx + bw / 2 - br, ly + bh, br)
          ctx.lineTo(lx - bw / 2 + br, ly + bh)
          ctx.arcTo(lx - bw / 2, ly + bh, lx - bw / 2, ly + bh - br, br)
          ctx.lineTo(lx - bw / 2, ly + br)
          ctx.arcTo(lx - bw / 2, ly, lx - bw / 2 + br, ly, br)
          ctx.closePath()
          ctx.setFillStyle('rgba(55, 155, 255, 0.9)')
          ctx.fill()
          ctx.setFillStyle('#fff')
          ctx.fillText(label, lx, ly + 16)
        }

        ctx.draw && ctx.draw()
      },
    },
  }
</script>

<style scoped>
  .container {
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .page-scroll {
    height: 100vh;
    padding: 16px 16px 40px;
    box-sizing: border-box;
  }

  .card {
    background: var(--bg-secondary);
    border-radius: 18px;
    padding: 18px 16px;
    margin-bottom: 14px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  }

  .card-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .card-title-text {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .card-title-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* 字段行 */
  .field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .field-row.column {
    flex-direction: column;
    align-items: flex-start;
    border-bottom: none;
  }

  .field-label {
    font-size: 14px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .field-value {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .field-text {
    font-size: 14px;
    color: var(--text-primary);
  }

  .field-text.ph {
    color: var(--text-muted);
  }

  .field-sub {
    font-size: 12px;
    color: var(--success);
  }

  .field-arrow {
    font-size: 18px;
    color: var(--text-muted);
    line-height: 1;
  }

  .input-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    border-radius: 10px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
  }

  .field-input {
    width: 90px;
    height: 38px;
    font-size: 15px;
    color: var(--text-primary);
    text-align: right;
  }

  .input-unit {
    font-size: 12px;
    color: var(--text-muted);
    margin-left: 6px;
  }

  .field-hint {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
    padding: 6px 0 0;
  }

  .form-hint {
    display: block;
    font-size: 12px;
    color: var(--danger);
    margin-top: 8px;
  }

  .collapse-toggle {
    display: flex;
    justify-content: center;
    padding: 8px 0 2px;
  }

  .collapse-arrow {
    font-size: 13px;
    color: var(--text-muted);
    transition: transform 0.25s ease;
  }

  .collapse-arrow.flipped {
    transform: rotate(180deg);
  }

  /* 性别 */
  .gender-group {
    display: flex;
    gap: 8px;
  }

  .chip {
    padding: 6px 18px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-tertiary);
  }

  .chip.on {
    background: linear-gradient(135deg, #379bff, #2d82d6);
    border-color: #379bff;
    color: #fff;
  }

  /* 活动系数 */
  .factor-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    width: 100%;
  }

  .factor-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 60px;
    flex: 1;
    padding: 8px 4px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
  }

  .factor-chip.on {
    border-color: #379bff;
    background: rgba(55, 155, 255, 0.12);
  }

  .factor-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .factor-chip.on .factor-value {
    color: #379bff;
  }

  .factor-name {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .factor-desc {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 10px;
    line-height: 1.6;
  }

  /* TDEE */
  .tdee-card {
    background: linear-gradient(135deg, rgba(55, 155, 255, 0.12), rgba(0, 72, 255, 0.06));
  }

  .tdee-main {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 10px 4px 6px;
  }

  .tdee-number-wrap {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-shrink: 0;
  }

  .tdee-number {
    font-size: 40px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.1;
  }

  .tdee-unit {
    font-size: 13px;
    color: var(--text-muted);
  }

  .tdee-detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tdee-detail-row {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .tdee-hint {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    padding-top: 6px;
  }

  /* 图表 */
  .chart-card {
    padding-bottom: 28px;
  }

  .chart-box {
    position: relative;
    margin-top: 8px;
  }

  /* 时间范围选择（拖动杆） */
  .range-btns {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .range-btn {
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 6px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    transition: all 0.2s;
  }

  .container.light .range-btn {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .range-btn.active {
    background: var(--primary);
    color: #fff;
  }

  /* 标题行右侧操作区 */
  .chart-title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .backfill-btn {
    padding: 4px 10px;
    font-size: 11px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }

  /* 补录弹窗表单 */
  .backfill-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 46px;
    border-bottom: 1px solid var(--border-color);
  }

  .backfill-label {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .backfill-value {
    font-size: 14px;
    color: var(--text-primary);
  }

  .backfill-input {
    width: 120px;
    height: 36px;
    font-size: 15px;
    color: var(--text-primary);
    text-align: right;
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 0 10px;
  }

  .backfill-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .backfill-cancel,
  .backfill-confirm {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
  }

  .backfill-cancel {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .backfill-confirm {
    background: linear-gradient(135deg, #379bff, #2d82d6);
    color: #fff;
  }

  .chart-canvas {
    display: block;
    width: 100%;
  }

  .chart-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--bg-primary);
    border-radius: 10px;
  }

  .chart-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }

  .legend-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .legend-stat {
    font-size: 11px;
    color: var(--text-muted);
  }

  .legend-up {
    color: var(--danger);
  }

  .legend-down {
    color: var(--success);
  }

  .chart-help-btn {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stats-row {
    display: flex;
    margin-top: 12px;
  }

  .stats-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stats-item + .stats-item {
    align-items: flex-end;
  }

  .stats-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .stats-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stats-up {
    color: var(--danger);
  }

  .stats-down {
    color: var(--success);
  }

  .stats-neutral,
  .stats-none {
    color: var(--text-muted);
  }

  .chart-hint {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 10px;
    line-height: 1.6;
  }

  .help-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9990;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .help-panel {
    width: 82vw;
    max-width: 340px;
    max-height: 70vh;
    overflow-y: auto;
    background: var(--bg-secondary);
    border-radius: 18px;
    padding: 20px 16px 14px;
  }

  .help-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: center;
    margin-bottom: 14px;
  }

  .help-section {
    margin-bottom: 12px;
  }

  .help-h {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .help-p {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .help-close {
    margin-top: 8px;
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    color: #379bff;
    padding: 10px 0;
  }

  /* 标题行：图例居中 */
  .chart-title-row {
    align-items: center;
  }

  .chart-title-row .chart-legend {
    flex: 1;
    justify-content: center;
    margin-top: 0;
  }

  .stats-empty {
    flex: 1;
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    padding: 6px 0;
  }

  .stats-compact {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
  }

  .stats-compact-item {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  .stats-compact-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .stats-compact-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .stats-value-wrap {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .stats-sample-hint {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 400;
  }

  /* ===== 液态玻璃适配 ===== */
  .container.liquid-glass.dark .card:not(.tdee-card) {
    background: #191919 !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 1px 3px var(--glass-shadow-inner) inset,
      0 8px 24px var(--glass-shadow-outer) !important;
  }

  .container.liquid-glass.light .card:not(.tdee-card) {
    background: rgba(255, 255, 255, 0.75) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-top: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow:
      0 1px 3px var(--glass-shadow-inner) inset,
      0 8px 24px var(--glass-shadow-outer) !important;
  }

  .container.liquid-glass .input-wrap,
  .container.liquid-glass .chip:not(.on),
  .container.liquid-glass .factor-chip:not(.on) {
    background: var(--glass-btn-bg) !important;
    border-color: var(--glass-border);
  }

  .container.liquid-glass .help-panel {
    background: var(--glass-bg) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
    box-shadow:
      0 0 0 0.5px var(--glass-edge) inset,
      0 12px 36px var(--glass-shadow-outer) !important;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #379bff;
  }

  .legend-text {
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
