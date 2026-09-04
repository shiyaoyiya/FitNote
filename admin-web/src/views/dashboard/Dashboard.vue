<template>
  <div class="dashboard-wrap">
    <!-- 顶部 4 个统计卡片 -->
    <div class="stat-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-inner">
          <el-icon class="stat-icon" color="#409EFF"><User /></el-icon>
          <div class="stat-text">
            <div class="stat-num">{{ stats.totalUsers ?? 0 }}</div>
            <div class="stat-title">总用户数</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-inner">
          <el-icon class="stat-icon" color="#67C23A"><UserFilled /></el-icon>
          <div class="stat-text">
            <div class="stat-num">{{ stats.todayNew ?? 0 }}</div>
            <div class="stat-title">今日新增</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-inner">
          <el-icon class="stat-icon" color="#E6A23C"><Aim /></el-icon>
          <div class="stat-text">
            <div class="stat-num">{{ stats.todayActive ?? 0 }}</div>
            <div class="stat-title">今日活跃</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-inner">
          <el-icon class="stat-icon" color="#F56C6C"><DataAnalysis /></el-icon>
          <div class="stat-text">
            <div class="stat-num">{{ formatVolume(stats.totalVolumeKg) }}</div>
            <div class="stat-title">累计训练容量(kg)</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 折线图：新增用户 / 活跃用户趋势 -->
    <el-card shadow="never" class="chart-block">
      <template #header>
        <span class="chart-header-title">用户趋势（新增 / 活跃）</span>
      </template>
      <div ref="chartLineRef" class="chart-canvas"></div>
    </el-card>

    <!-- 饼图占位：用户状态分布 -->
    <el-card shadow="never" class="chart-block">
      <template #header>
        <span class="chart-header-title">用户状态分布</span>
      </template>
      <div ref="chartPieRef" class="chart-canvas"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getStats, getNewUserTrend, getActiveUserTrend } from '@/api/dashboard'

const stats = reactive({
  totalUsers: 0,
  todayNew: 0,
  todayActive: 0,
  totalVolumeKg: 0
})

const chartLineRef = ref(null)
const chartPieRef = ref(null)
let lineChart = null
let pieChart = null

function formatVolume(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '0'
  return Number(v).toLocaleString()
}

function renderLineChart(newUsers, activeUsers) {
  if (!chartLineRef.value) return
  if (!lineChart) lineChart = echarts.init(chartLineRef.value)
  const dates = newUsers.map(i => i.date)
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '活跃用户'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '新增用户', type: 'line', smooth: true, data: newUsers.map(i => i.count), itemStyle: { color: '#409EFF' } },
      { name: '活跃用户', type: 'line', smooth: true, data: activeUsers.map(i => i.count), itemStyle: { color: '#67C23A' } }
    ]
  })
}

function renderPieChart() {
  if (!chartPieRef.value) return
  if (!pieChart) pieChart = echarts.init(chartPieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '用户状态分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        data: [
          { name: '总用户数', value: stats.totalUsers || 0 },
          { name: '今日新增', value: stats.todayNew || 0 },
          { name: '今日活跃', value: stats.todayActive || 0 }
        ]
      }
    ]
  })
}

function handleResize() {
  lineChart?.resize()
  pieChart?.resize()
}

onMounted(async () => {
  try {
    const [s, n, a] = await Promise.all([getStats(), getNewUserTrend(), getActiveUserTrend()])
    Object.assign(stats, s || {})
    await nextTick()
    renderLineChart(n || [], a || [])
    renderPieChart()
  } catch (e) {
    // 单独尝试一次饼图渲染，避免 stats 接口失败时图表不显示
    await nextTick()
    renderPieChart()
    renderLineChart([], [])
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  lineChart?.dispose()
  pieChart?.dispose()
  lineChart = null
  pieChart = null
})
</script>

<style scoped>
.dashboard-wrap { padding: 16px; }
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.stat-card { height: 100px; }
.stat-card :deep(.el-card__body) { height: 100%; padding: 16px; }
.stat-inner {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 12px;
}
.stat-icon { font-size: 40px; }
.stat-text { flex: 1; }
.stat-num {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  line-height: 1.2;
}
.stat-title {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}
.chart-block { margin-bottom: 16px; }
.chart-header-title { font-weight: bold; }
.chart-canvas { width: 100%; height: 320px; }
</style>
