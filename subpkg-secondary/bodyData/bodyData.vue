<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
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
        <text class="field-hint">体重输入后自动保存，并记入下方趋势图（同一天只保留最新一次）</text>

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
        <view class="card-title">
          <text class="card-title-text">体重趋势</text>
          <text class="card-title-sub">首条记录位于图中线，刻度随波动自适应</text>
        </view>
        <view class="chart-box">
          <canvas :id="canvasId" :canvas-id="canvasId" class="chart-canvas"
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"></canvas>
          <view v-if="chartEmpty" class="chart-empty">
            <text>暂无体重记录，填写体重后自动生成趋势图</text>
          </view>
        </view>
        <view v-if="!chartEmpty" class="chart-legend">
          <text class="legend-dot"></text>
          <text class="legend-text">体重 (kg)</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'
  import { useUserProfileStore } from '@/stores/userProfile.js'
  import { getSystemInfo } from '@/utils/canvasHelper.js'

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
        canvasId: 'weightTrendCanvas',
        canvasWidth: 340,
        canvasHeight: 220,
        canvasReady: false,
        ctx: null,
        isMiniProgram: false,
        todayMonth: '',
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
    },
    onLoad() {
      this.daySettingsStore = useDaySettingsStore()
      this.daySettingsStore.load()
      this.store = useUserProfileStore()
      const now = new Date()
      this.todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
        const items = this.chartItems

        ctx.setFillStyle(isLight ? '#f5f5f5' : '#121212')
        ctx.fillRect(0, 0, w, h)

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
  .chart-box {
    position: relative;
    margin-top: 8px;
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
    gap: 6px;
    margin-top: 8px;
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
