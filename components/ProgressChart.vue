<template>
  <view class="chart-wrapper" :class="{ light: props.isLightMode }">
    <view class="chart-header">
      <view class="header-left">
        <text class="collapse-btn" @click="toggleExpanded">{{ expanded ? '▼' : '▶' }}</text>
        <text class="chart-title" v-if="title">{{ title }}</text>
      </view>
      <view class="mode-toggle" @click="toggleMode">
        <text :class="['mode-text', { active: displayMode === 'volume' }]" @click.stop="switchMode('volume')">容量</text>
        <text class="mode-sep">/</text>
        <text :class="['mode-text', { active: displayMode === '1rm' }]" @click.stop="switchMode('1rm')">1RM</text>
      </view>
    </view>
    <!-- 折叠内容 -->
    <view v-if="expanded" class="chart-body">
    <!-- 时间范围筛选按钮 -->
    <view class="range-btns">
      <view v-for="r in ranges" :key="r.value" class="range-btn" :class="{ active: activeRange === r.value }"
        @click="onRangeClick(r.value)">{{ r.label }}</view>
    </view>
    <!-- Canvas 画布：v-if 延迟到测量完宽度再创建，确保 canvas 在正确的尺寸下初始化 -->
    <canvas v-if="canvasReady" :canvas-id="canvasId" :id="canvasId" class="chart-canvas" :width="canvasWidth"
      :height="canvasHeight" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" />
    <!-- 无数据提示 -->
    <view v-if="!filteredData || filteredData.length === 0" class="no-data-overlay">
      <text>暂无数据</text>
    </view>
    </view>
  </view>
</template>

<script setup>
  import {
    ref,
    watch,
    onMounted,
    nextTick,
    computed
  } from 'vue'

  const props = defineProps({
    data: {
      type: Array,
      default: () => [],
    },
    title: {
      type: String,
      default: '',
    },
    canvasId: {
      type: String,
      default: 'progressChart',
    },
    isLightMode: {
      type: Boolean,
      default: false,
    },
  })

  const emit = defineEmits(['range-change'])

  const ranges = [{
      label: '1月',
      value: 1
    },
    {
      label: '3月',
      value: 3
    },
    {
      label: '6月',
      value: 6
    },
    {
      label: '1年',
      value: 12
    },
  ]

  const activeRange = ref(3)
  const displayMode = ref('volume')

  // 用系统信息初始化宽度，避免 canvas 以 350px 创建
  const defaultWidth = (() => {
    try {
      return uni.getSystemInfoSync().windowWidth
    } catch (e) {
      return 350
    }
  })()
  const canvasWidth = ref(defaultWidth)
  const canvasHeight = ref(220)
  // canvas 是否已准备好：测量完父容器宽度后才创建 canvas
  const canvasReady = ref(false)

  // 折叠/展开状态（持久化到 localStorage）
  const storageKey = computed(() => 'chart_expanded_' + (props.canvasId || 'progressChart'))
  const expanded = ref(true)
  try {
    const saved = uni.getStorageSync(storageKey.value)
    if (saved === false) expanded.value = false
  } catch (e) {}

  function toggleExpanded() {
    expanded.value = !expanded.value
    try { uni.setStorageSync(storageKey.value, expanded.value) } catch (e) {}
  }

  const padding = {
    top: 20,
    right: 20,
    bottom: 40,
    left: 50
  }

  // 拖拽标线状态
  const crosshairActive = ref(false)
  const crosshairIndex = ref(-1)

  function onTouchStart(e) {
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return
    crosshairActive.value = true
    updateCrosshair(touch)
  }

  function onTouchMove(e) {
    if (!crosshairActive.value) return
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return
    updateCrosshair(touch)
  }

  function onTouchEnd() {
    crosshairActive.value = false
    drawChart()
  }

  function updateCrosshair(touch) {
    const items = displayData.value
    if (!items || items.length === 0) return
    const w = canvasWidth.value
    const plotLeft = padding.left
    const plotRight = w - padding.right
    const plotW = plotRight - plotLeft
    const x = touch.x - plotLeft
    const idx = nearestIndex(x, plotW, items.length)
    if (idx !== crosshairIndex.value) {
      crosshairIndex.value = idx
      drawChart()
    }
  }

  function nearestIndex(x, plotW, count) {
    if (count <= 1) return 0
    const step = plotW / (count - 1)
    const raw = Math.round(x / step)
    return Math.max(0, Math.min(count - 1, raw))
  }

  function switchMode(mode) {
    displayMode.value = mode
    nextTick(() => drawChart())
  }

  function toggleMode() {
    displayMode.value = displayMode.value === 'volume' ? '1rm' : 'volume'
    nextTick(() => drawChart())
  }

  const filteredData = computed(() => {
    if (!props.data || props.data.length === 0) return []
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() - activeRange.value)
    return props.data
      .filter(d => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  })

  const displayData = computed(() => {
    return filteredData.value.map(item => {
      let yVal
      if (displayMode.value === '1rm') {
        const maxWeight = item.maxWeight || 0
        const maxReps = (item.maxReps != null && item.maxReps > 0) ? item.maxReps : 1
        yVal = Math.round(maxWeight * (1 + maxReps / 30) * 100) / 100
      } else {
        yVal = item.maxVolume != null ? item.maxVolume : (item.maxWeight || 0)
      }
      return {
        ...item,
        yVal
      }
    })
  })

  function onRangeClick(val) {
    activeRange.value = val
    emit('range-change', val)
    nextTick(() => drawChart())
  }

  function drawChartInternal(w, h) {
    const items = displayData.value
    const ctx = uni.createCanvasContext(props.canvasId)
    const isLight = props.isLightMode

    // 清空画布 - 根据主题模式设置背景色
    ctx.setFillStyle(isLight ? '#f5f5f5' : '#121212')
    ctx.fillRect(0, 0, w, h)

    if (!items || items.length === 0) {
      ctx.draw()
      return
    }

    const yLabel = 'kg'

    // 识别 PR 点
    let runningMax = -Infinity
    const prIndices = []
    items.forEach((item, i) => {
      if (item.yVal > runningMax) {
        runningMax = item.yVal
        prIndices.push(i)
      }
    })

    const plotLeft = padding.left
    const plotRight = w - padding.right
    const plotTop = padding.top
    const plotBottom = h - padding.bottom
    const plotW = plotRight - plotLeft
    const plotH = plotBottom - plotTop

    // Y 轴范围：yMin 用最小值，yMax 用最大值，上下各留 15% 余量
    const yVals = items.map(d => d.yVal)
    let yMin = Math.min(...yVals)
    let yMax = Math.max(...yVals)
    if (yMin === yMax) {
      yMin = yMin - 10
      yMax = yMax + 10
    } else {
      const margin = (yMax - yMin) * 0.15
      yMin = yMin - margin
      yMax = yMax + margin
    }
    yMin = Math.max(0, yMin)

    function xAt(i) {
      if (items.length === 1) return plotLeft + plotW / 2
      return plotLeft + (i / (items.length - 1)) * plotW
    }

    function yAt(val) {
      return plotBottom - ((val - yMin) / (yMax - yMin)) * plotH
    }

    // 网格线 - 根据主题模式设置颜色
    ctx.setStrokeStyle(isLight ? '#e0e0e0' : '#2a2a2a')
    ctx.setLineWidth(0.5)
    const gridCount = 4
    for (let i = 0; i <= gridCount; i++) {
      const gy = plotTop + (i / gridCount) * plotH
      ctx.beginPath()
      ctx.moveTo(plotLeft, gy)
      ctx.lineTo(plotRight, gy)
      ctx.stroke()
    }

    // Y 轴标签 - 根据主题模式设置颜色
    ctx.setFontSize(10)
    ctx.setFillStyle(isLight ? '#666666' : '#888888')
    ctx.setTextAlign('right')
    for (let i = 0; i <= gridCount; i++) {
      const val = yMax - (i / gridCount) * (yMax - yMin)
      const gy = plotTop + (i / gridCount) * plotH
      ctx.fillText(Math.round(val) + yLabel, plotLeft - 6, gy + 4)
    }

    // X 轴标签 - 根据主题模式设置颜色
    ctx.setTextAlign('center')
    ctx.setFillStyle(isLight ? '#666666' : '#888888')
    const maxLabels = 6
    const step = Math.max(1, Math.floor(items.length / maxLabels))
    for (let i = 0; i < items.length; i += step) {
      const d = new Date(items[i].date)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      ctx.fillText(label, xAt(i), plotBottom + 18)
    }
    // 确保最后一个点也有标签
    if ((items.length - 1) % step !== 0) {
      const last = items[items.length - 1]
      const d = new Date(last.date)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      ctx.fillText(label, xAt(items.length - 1), plotBottom + 18)
    }

    // 渐变填充区域
    if (items.length > 1) {
      ctx.beginPath()
      ctx.moveTo(xAt(0), plotBottom)
      for (let i = 0; i < items.length; i++) {
        ctx.lineTo(xAt(i), yAt(items[i].yVal))
      }
      ctx.lineTo(xAt(items.length - 1), plotBottom)
      ctx.closePath()
      ctx.setFillStyle('rgba(55, 155, 255, 0.1)')
      ctx.fill()
    }

    // 折线
    ctx.setStrokeStyle('#379bff')
    ctx.setLineWidth(2)
    ctx.setLineJoin('round')
    ctx.setLineCap('round')
    ctx.beginPath()
    for (let i = 0; i < items.length; i++) {
      const x = xAt(i)
      const y = yAt(items[i].yVal)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // 绘制普通数据点
    for (let i = 0; i < items.length; i++) {
      if (prIndices.includes(i)) continue
      const x = xAt(i)
      const y = yAt(items[i].yVal)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.setFillStyle('#379bff')
      ctx.fill()
    }

    // 绘制 PR 点（金色星标）
    ctx.setFontSize(10)
    ctx.setTextAlign('center')
    for (const idx of prIndices) {
      const x = xAt(idx)
      const y = yAt(items[idx].yVal)

      // 金色圆环
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.setStrokeStyle('#FFD700')
      ctx.setLineWidth(2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.setFillStyle('#FFD700')
      ctx.fill()

      // PR 标签
      ctx.setFillStyle('#FFD700')
      ctx.fillText('PR ' + items[idx].yVal + yLabel, x, y - 12)
    }

    // 边框线 - 根据主题模式设置颜色
    ctx.setStrokeStyle(isLight ? '#e0e0e0' : '#333333')
    ctx.setLineWidth(1)
    ctx.beginPath()
    ctx.moveTo(plotLeft, plotTop)
    ctx.lineTo(plotLeft, plotBottom)
    ctx.lineTo(plotRight, plotBottom)
    ctx.stroke()

    // 拖拽标线
    if (crosshairActive.value && items.length > 0) {
      const ci = Math.max(0, Math.min(items.length - 1, crosshairIndex.value))
      const cx = xAt(ci)
      const cy = yAt(items[ci].yVal)

      // 虚线竖线 - 根据主题模式设置颜色
      ctx.save()
      ctx.setLineWidth(1)
      ctx.setStrokeStyle(isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)')
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(cx, plotTop)
      ctx.lineTo(cx, plotBottom)
      ctx.stroke()
      ctx.restore()

      // 数据点高亮
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.setFillStyle(isLight ? '#ffffff' : '#ffffff')
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.setFillStyle('#379bff')
      ctx.fill()

      // 标签
      const d = new Date(items[ci].date)
      const label = items[ci].yVal + 'kg ' + (d.getMonth() + 1) + '/' + d.getDate()
      ctx.setFontSize(11)
      ctx.setTextAlign('center')
      const tw = ctx.measureText(label).width
      const lx = Math.max(plotLeft + tw / 2 + 8, Math.min(plotRight - tw / 2 - 8, cx))
      const ly = plotTop + 4
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

    ctx.draw()
  }

  function drawChart() {
    if (!canvasReady.value) return
    // canvas 已经在正确的尺寸下创建，直接用 canvasWidth 绘制
    drawChartInternal(canvasWidth.value, canvasHeight.value)
  }

  /** 首次测量父容器宽度，然后创建 canvas */
  function initChart() {
    uni.createSelectorQuery()
      .select('.chart-wrapper')
      .boundingClientRect((rect) => {
        if (rect && Math.round(rect.width) > 0) {
          canvasWidth.value = Math.round(rect.width)
        }
        // 测量完成，创建 canvas（v-if 生效）
        canvasReady.value = true
        // 等 canvas 渲染完成再绘制
        nextTick(() => {
          setTimeout(() => drawChartInternal(canvasWidth.value, canvasHeight.value), 50)
        })
      })
      .exec()
  }

  watch(() => props.data, () => {
    nextTick(() => drawChart())
  }, {
    deep: true
  })

  watch(expanded, (val) => {
    if (val) {
      // v-if 重建了 canvas，等待渲染完成后重绘
      nextTick(() => {
        setTimeout(() => drawChartInternal(canvasWidth.value, canvasHeight.value), 50)
      })
    }
  })

  onMounted(() => {
    nextTick(() => initChart())
  })
</script>

<style scoped>
  .chart-wrapper {
    background-color: #121212;
    padding-top: 12px;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid #555;
  }

  .chart-wrapper.light {
    background-color: #f5f5f5;
    border-bottom-color: #e0e0e0;
  }

  .chart-title {
    font-size: 15px;
    font-weight: bold;
    color: #f7f7f7;
    display: block;
    margin-left: 10px;
  }

  .chart-wrapper.light .chart-title {
    color: #333333;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .collapse-btn {
    font-size: 10px;
    color: #888;
    padding: 4px 2px 4px 8px;
  }

  .mode-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 8px;
    border-radius: 6px;
    background: #2a2a2a;
    margin-right: 10px;
  }

  .chart-wrapper.light .mode-toggle {
    background: #ffffff;
    border: 1px solid #e0e0e0;
  }

  .mode-text {
    font-size: 12px;
    color: #666;
    padding: 2px 4px;
  }

  .mode-text.active {
    color: #379bff;
    font-weight: bold;
  }

  .mode-sep {
    font-size: 12px;
    color: #555;
  }

  .range-btns {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
    margin-left: 10px;
  }

  .range-btn {
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 6px;
    background: #2a2a2a;
    color: #aaa;
    transition: all 0.2s;
  }

  .chart-wrapper.light .range-btn {
    background: #ffffff;
    color: #666666;
    border: 1px solid #e0e0e0;
  }

  .range-btn.active {
    background: #379bff;
    color: #fff;
  }

  .chart-canvas {
    border-radius: 8px;
  }

  .no-data-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #666;
    font-size: 14px;
  }

  .chart-wrapper.light .no-data-overlay {
    color: #999999;
  }
</style>