<template>
  <div class="page-wrap">
    <el-page-header @back="$router.push('/user')" :content="'用户画像详情 · ' + (user?.nickname || user?.username || '#' + userId)">
      <template #extra>
        <el-tag v-if="user?.status === 1" type="success">状态：正常</el-tag>
        <el-tag v-else type="danger">状态：封禁</el-tag>
        <el-button
          v-if="user?.status === 1"
          type="danger" size="small" style="margin-left:12px"
          v-hasPerm="'user:status'"
          :loading="loading.ban"
          @click="handleBan"
        >封禁用户</el-button>
        <el-button
          v-else
          type="success" size="small" style="margin-left:12px"
          v-hasPerm="'user:status'"
          :loading="loading.ban"
          @click="handleUnban"
        >解封用户</el-button>
      </template>
    </el-page-header>
    <el-divider />

    <!-- 基础资料 -->
    <el-card shadow="never" v-loading="loading.profile" class="mb-16">
      <div class="profile-header">
        <el-avatar :size="76" :src="resolveAvatar(user?.avatarUrl)">{{ (user?.nickname || user?.username || '?').slice(0,1) }}</el-avatar>
        <div class="profile-info">
          <h2 class="nickname-row">
            {{ user?.nickname || user?.username || '用户 #' + userId }}
            <el-tag v-if="user?.id" type="info" style="margin-left:10px">ID {{user.id}}</el-tag>
          </h2>
          <div class="meta-row">
            <span class="meta-label">用户名</span>
            <span>{{user?.username || '-'}}</span>
            <span class="meta-divider">·</span>
            <span class="meta-label">性别</span>
            <span>{{genderText}}</span>
            <span class="meta-divider">·</span>
            <span class="meta-label">生日</span>
            <span>{{user?.birthday || '-'}}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">手机</span>
            <span>{{user?.phone || '-'}}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">注册</span>
            <span>{{formatTime(user?.registerTime)}}</span>
            <span class="meta-divider">·</span>
            <span class="meta-label">最后登录</span>
            <span>{{formatTime(user?.lastLoginTime)}}</span>
            <span class="meta-divider">·</span>
            <span class="meta-label">最后活跃</span>
            <span>{{formatTime(user?.lastActiveTime)}}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 4 大核心指标 + 备份徽章 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="c in coreStatCards" :key="c.key">
        <el-card shadow="hover" class="stat-card-wrap">
          <div class="stat-card">
            <div class="stat-icon" :style="{ background: c.bg }">{{ c.icon }}</div>
            <div class="stat-main">
              <div class="stat-value">{{ c.formatted }}</div>
              <div class="stat-label">{{ c.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 2 张图 -->
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never" v-loading="loading.stats">
          <template #header>
            <div class="card-title">📈 近 30 天累计容量趋势（kg）
              <el-tag size="small" effect="plain" style="margin-left:8px">快照：用户上传备份当日累计值</el-tag>
            </div>
          </template>
          <div ref="lineRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" v-loading="loading.stats">
          <template #header>
            <div class="card-title">🥧 部位容量分布（最新备份解析）
              <el-tag size="small" effect="plain" style="margin-left:8px">关键字匹配：胸/背/腿/肩/臂/核心</el-tag>
            </div>
          </template>
          <div ref="pieRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 3 Tab 分页列表 -->
    <el-card shadow="never" style="margin-top:16px">
      <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
        <!-- 备份历史 -->
        <el-tab-pane label="备份历史" name="backup">
          <el-table :data="backupList" v-loading="loading.backup" border stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
            <el-table-column label="备份时间" width="160">
              <template #default="{row}">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column prop="totalDays" label="天数" width="80" align="right" />
            <el-table-column label="容量(kg)" width="120" align="right">
              <template #default="{row}">{{ Number(row.totalVolumeKg || 0).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="totalTemplates" label="模板" width="80" align="right" />
            <el-table-column prop="totalActions" label="动作" width="80" align="right" />
            <el-table-column label="类型" width="80">
              <template #default="{row}">{{ row.backupType === 1 ? '本地' : (row.backupType === 2 ? '云端' : '-') }}</template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right" align="center">
              <template #default="{row}">
                <a :href="backupDownloadHref(row.id)" target="_blank" class="link-btn">下载 JSON</a>
              </template>
            </el-table-column>
          </el-table>
          <PagerWrap>
            <el-pagination
              v-model:current-page="backupQuery.page"
              v-model:page-size="backupQuery.size"
              :total="backupTotal"
              :page-sizes="[5, 10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              background
              @size-change="fetchBackups"
              @current-change="fetchBackups"
            />
          </PagerWrap>
        </el-tab-pane>

        <!-- 分享模板 -->
        <el-tab-pane label="分享模板" name="share">
          <el-table :data="shareList" v-loading="loading.share" border stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="封面" width="80" align="center">
              <template #default="{row}">
                <div class="tpl-cover-mini" :style="{ background: row.coverColor || '#379bff' }">📋</div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="模板名" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{row}"><el-tag size="small" :type="shareStatusTag(row.status)">{{shareStatusText(row.status)}}</el-tag></template>
            </el-table-column>
            <el-table-column prop="actionCount" label="动作" width="70" align="right" />
            <el-table-column prop="totalSets" label="组数" width="70" align="right" />
            <el-table-column prop="viewCount" label="浏览" width="70" align="right" />
            <el-table-column prop="collectCount" label="收藏" width="70" align="right" />
            <el-table-column prop="downloadCount" label="下载" width="70" align="right" />
            <el-table-column label="创建时间" width="160">
              <template #default="{row}">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column prop="rejectReason" label="拒绝原因" min-width="180" show-overflow-tooltip />
          </el-table>
          <PagerWrap>
            <el-pagination
              v-model:current-page="shareQuery.page"
              v-model:page-size="shareQuery.size"
              :total="shareTotal"
              :page-sizes="[5, 10, 20]"
              layout="total, sizes, prev, pager, next"
              background
              @size-change="fetchShare"
              @current-change="fetchShare"
            />
          </PagerWrap>
        </el-tab-pane>

        <!-- 反馈历史 -->
        <el-tab-pane label="反馈历史" name="feedback">
          <el-table :data="feedbackList" v-loading="loading.feedback" border stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
            <el-table-column label="分类" width="90" align="center">
              <template #default="{row}">{{ fbCategoryText(row.category) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{row}"><el-tag size="small" :type="fbStatusTag(row.status)">{{ fbStatusText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="提交时间" width="160">
              <template #default="{row}">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
          </el-table>
          <PagerWrap>
            <el-pagination
              v-model:current-page="feedbackQuery.page"
              v-model:page-size="feedbackQuery.size"
              :total="feedbackTotal"
              :page-sizes="[5, 10, 20]"
              layout="total, sizes, prev, pager, next"
              background
              @size-change="fetchFeedback"
              @current-change="fetchFeedback"
            />
          </PagerWrap>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import {
  getUserDetail, getUserTrainingStats, getUserShareTemplates, banUser, unbanUser
} from '@/api/user'
import { getBackupList } from '@/api/backup'
import { getFeedbackPage } from '@/api/feedback'

const route = useRoute()
const userId = computed(() => Number(route.query.id) || 0)

// =================== 基础资料 ===================
const user = ref(null)
const loading = reactive({
  profile: false,
  stats: false,
  backup: false,
  share: false,
  feedback: false,
  ban: false,
})

const genderText = computed(() => {
  const g = user.value?.gender
  if (g === 1) return '男'
  if (g === 2) return '女'
  return '未知'
})

function resolveAvatar(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  if (url.startsWith('/static') || url.startsWith('@/static')) return url
  const base = import.meta.env.VITE_API_BASE || '/api'
  if (url.startsWith('/')) return base + url
  return base + '/' + url
}

async function loadProfile() {
  if (!userId.value) return
  loading.profile = true
  try {
    user.value = await getUserDetail(userId.value)
  } finally {
    loading.profile = false
  }
}

async function handleBan() {
  try {
    await ElMessageBox.confirm(`确定封禁用户「${user.value?.nickname || user.value?.username || userId.value}」吗？`, '提示', { type: 'warning' })
    loading.ban = true
    await banUser(userId.value)
    ElMessage.success('已封禁')
    user.value.status = 0
  } catch (e) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
  } finally {
    loading.ban = false
  }
}

async function handleUnban() {
  try {
    await ElMessageBox.confirm(`确定解封用户「${user.value?.nickname || user.value?.username || userId.value}」吗？`, '提示', { type: 'warning' })
    loading.ban = true
    await unbanUser(userId.value)
    ElMessage.success('已解封')
    user.value.status = 1
  } catch (e) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
  } finally {
    loading.ban = false
  }
}

// =================== 训练统计（4 大指标 + 折线 + 饼） ===================
const stats = ref({
  dailyTrend: [], bodyPartDist: [], backupCount: 0,
  totalTrainDays: 0, totalVolumeKg: 0, totalTemplates: 0, totalActions: 0,
})

const coreStatCards = computed(() => [
  {
    key: 'days', label: '累计训练天数',
    formatted: (stats.value.totalTrainDays || 0).toLocaleString() + ' 天',
    icon: '🏋️', bg: 'linear-gradient(135deg,#379bff,#2d82d6)',
  },
  {
    key: 'vol', label: '总训练容量',
    formatted: Number(stats.value.totalVolumeKg || 0).toLocaleString() + ' kg',
    icon: '⚖️', bg: 'linear-gradient(135deg,#67c23a,#529b2e)',
  },
  {
    key: 'tpl', label: '模板总数',
    formatted: (stats.value.totalTemplates || 0).toLocaleString() + ' 个',
    icon: '📋', bg: 'linear-gradient(135deg,#e6a23c,#c08827)',
  },
  {
    key: 'act', label: '动作总数',
    formatted: (stats.value.totalActions || 0).toLocaleString() + ' 个' + (stats.value.backupCount ? ` · ${stats.value.backupCount}份备份` : ''),
    icon: '🎯', bg: 'linear-gradient(135deg,#a076ff,#7d54e6)',
  },
])

async function loadStats() {
  if (!userId.value) return
  loading.stats = true
  try {
    const s = await getUserTrainingStats(userId.value) || {}
    stats.value = {
      dailyTrend: Array.isArray(s.dailyTrend) ? s.dailyTrend : [],
      bodyPartDist: Array.isArray(s.bodyPartDist) ? s.bodyPartDist : [],
      backupCount: s.backupCount || 0,
      totalTrainDays: s.totalTrainDays || 0,
      totalVolumeKg: s.totalVolumeKg || 0,
      totalTemplates: s.totalTemplates || 0,
      totalActions: s.totalActions || 0,
    }
    await nextTick()
    renderLineChart()
    renderPieChart()
  } finally {
    loading.stats = false
  }
}

// ---- ECharts：折线图（严格遵守：最小字段集 + 稳定 formatter + 无空洞）----
const lineRef = ref(null)
let lineChart = null

function renderLineChart() {
  if (!lineRef.value) return
  if (!lineChart) lineChart = echarts.init(lineRef.value)

  const dates = stats.value.dailyTrend.map(d => d.date)
  const vols = stats.value.dailyTrend.map(d => Number(d.volumeKg) || 0)

  // 兜底：无数据时给一个空状态基线，避免图空
  const xData = dates.length === 30 ? dates : Array.from({length: 30}, (_,i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (29-i))
    return dt.toISOString().slice(0,10)
  })
  const yData = vols.length === 30 ? vols : new Array(30).fill(0)

  const series = [{
    type: 'line',
    name: '累计容量kg',
    data: yData,
    smooth: true,
    symbol: 'circle',
    symbolSize: 5,
    lineStyle: { color: '#379bff', width: 2 },
    itemStyle: { color: '#379bff' },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: 'rgba(55,155,255,0.25)' }, { offset: 1, color: 'rgba(55,155,255,0.02)' }] } },
  }].filter(Boolean)

  lineChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      // ★ 稳定字段 formatter：只用 axisValue / value，不取 marker 或 data 扩展字段
      formatter: params => {
        if (!params || !params.length) return ''
        const p = params[0]
        const date = (p && p.axisValue) ? String(p.axisValue) : ''
        const val = (p && p.value != null) ? Number(p.value).toLocaleString() : '0'
        return date + '<br/>累计容量：<b>' + val + '</b> kg'
      }
    },
    grid: { left: 60, right: 20, top: 24, bottom: 50 },
    xAxis: { type: 'category', boundaryGap: false, data: xData,
      axisLabel: { rotate: 40, fontSize: 11, color: '#909399' },
      axisLine: { lineStyle: { color: '#E4E7ED' } } },
    yAxis: { type: 'value', name: 'kg', nameTextStyle: { color: '#909399', fontSize: 11 },
      axisLabel: { color: '#909399', formatter: v => Number(v).toLocaleString() },
      splitLine: { lineStyle: { color: '#F2F6FC' } } },
    series,
  })
}

// ---- ECharts：饼图（严格遵守：data 仅 name/value + 稳定 formatter）----
const pieRef = ref(null)
let pieChart = null

function renderPieChart() {
  if (!pieRef.value) return
  if (!pieChart) pieChart = echarts.init(pieRef.value)

  const data = stats.value.bodyPartDist.map(d => ({
    name: String(d.name || '其他'),
    value: Number(d.valueKg) || 0,
  })).filter(item => item.value >= 0)

  const series = [{
    type: 'pie',
    radius: ['40%', '68%'],
    center: ['50%', '46%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
    data: data.length ? data : [{ name: '暂无数据', value: 0 }],
  }].filter(Boolean)

  pieChart.setOption({
    color: ['#379bff','#67c23a','#e6a23c','#f56c6c','#909399','#a076ff','#13c2c2'],
    tooltip: {
      trigger: 'item',
      // ★ 稳定字段：只取 name / value / percent
      formatter: params => {
        const n = (params && params.name) ? String(params.name) : ''
        const v = (params && params.value != null) ? Number(params.value).toLocaleString() : '0'
        const p = (params && params.percent != null) ? params.percent : 0
        return `<b>${n}</b><br/>容量：${v} kg<br/>占比：${p}%`
      }
    },
    legend: { bottom: 0, icon: 'circle', itemWidth: 10, textStyle: { fontSize: 12 } },
    series,
  })
}

function handleResize() {
  try { lineChart && lineChart.resize() } catch (_) {}
  try { pieChart && pieChart.resize() } catch (_) {}
}

// =================== 备份列表 ===================
const backupList = ref([])
const backupTotal = ref(0)
const backupQuery = reactive({ page: 1, size: 5, userId: 0 })

async function fetchBackups() {
  if (!userId.value) return
  loading.backup = true
  try {
    const res = await getBackupList({ ...backupQuery, userId: userId.value })
    backupList.value = res?.records || []
    backupTotal.value = res?.total || 0
  } finally {
    loading.backup = false
  }
}

function backupDownloadHref(id) {
  const base = import.meta.env.VITE_API_BASE || '/api'
  // axios/request 有 auth token 头；但普通 <a href> 下载不带 token，这里直接拼 URL。
  // 若后续需要认证，改为创建 axios blob 下载。
  return (base.endsWith('/') ? base.slice(0,-1) : base) + `/admin/backup/${id}/download`
}

// =================== 分享模板 ===================
const shareList = ref([])
const shareTotal = ref(0)
const shareQuery = reactive({ page: 1, size: 5 })

async function fetchShare() {
  if (!userId.value) return
  loading.share = true
  try {
    const res = await getUserShareTemplates(userId.value, { page: shareQuery.page, size: shareQuery.size })
    shareList.value = res?.records || []
    shareTotal.value = res?.total || 0
  } finally {
    loading.share = false
  }
}

function shareStatusText(s) {
  if (s === 0) return '待审核'
  if (s === 1) return '已发布'
  if (s === 2) return '已拒绝'
  if (s === 3) return '已下架'
  return '未知'
}
function shareStatusTag(s) {
  if (s === 0) return 'warning'
  if (s === 1) return 'success'
  if (s === 2) return 'danger'
  if (s === 3) return 'info'
  return 'info'
}

// =================== 反馈历史 ===================
const feedbackList = ref([])
const feedbackTotal = ref(0)
const feedbackQuery = reactive({ page: 1, size: 5, userId: 0 })

async function fetchFeedback() {
  if (!userId.value) return
  loading.feedback = true
  try {
    const res = await getFeedbackPage({ ...feedbackQuery, userId: userId.value })
    feedbackList.value = res?.records || []
    feedbackTotal.value = res?.total || 0
  } finally {
    loading.feedback = false
  }
}

function fbCategoryText(c) {
  if (c === 1) return '功能建议'
  if (c === 2) return 'Bug反馈'
  if (c === 3) return '数据问题'
  if (c === 4) return '其他'
  return '-'
}
function fbStatusText(s) {
  if (s === 0) return '待处理'
  if (s === 1) return '处理中'
  if (s === 2) return '已解决'
  if (s === 3) return '已拒绝'
  return '-'
}
function fbStatusTag(s) {
  if (s === 0) return 'warning'
  if (s === 1) return 'primary'
  if (s === 2) return 'success'
  if (s === 3) return 'danger'
  return 'info'
}

// =================== 辅助 ===================
const activeTab = ref('backup')
function handleTabChange(name) {
  if (name === 'backup' && !backupList.value.length) fetchBackups()
  if (name === 'share' && !shareList.value.length) fetchShare()
  if (name === 'feedback' && !feedbackList.value.length) fetchFeedback()
  nextTick(() => handleResize())
}

function formatTime(t) {
  if (!t) return '-'
  const s = String(t).replace('T', ' ')
  if (s.length >= 16) return s.slice(0, 16)
  return s
}

const PagerWrap = {
  name: 'PagerWrap',
  setup(_, { slots }) {
    return () => {
      const defaultSlot = slots.default ? slots.default() : []
      return h('div', { class: 'pager-right' }, defaultSlot)
    }
  }
}
import { h } from 'vue'

// =================== 生命周期 ===================
onMounted(async () => {
  if (!userId.value) {
    ElMessage.warning('缺少用户 id 参数')
    return
  }
  await Promise.all([loadProfile(), loadStats()])
  await fetchBackups()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  try { lineChart && lineChart.dispose() } catch (_) {}
  try { pieChart && pieChart.dispose() } catch (_) {}
  lineChart = null
  pieChart = null
})

// 路由 query 变化时重载（理论上这个页面只有进入，不会在内部切 id，保险起见）
watch(() => route.query.id, async () => {
  if (!userId.value) return
  await Promise.all([loadProfile(), loadStats()])
  backupQuery.page = 1
  shareQuery.page = 1
  feedbackQuery.page = 1
  await Promise.all([fetchBackups(), fetchShare(), fetchFeedback()])
})
</script>

<style scoped>
.page-wrap { padding: 16px; }
.mb-16 { margin-bottom: 16px; }
.card-title { font-size: 15px; font-weight: 600; }

.profile-header { display: flex; gap: 24px; align-items: flex-start; padding: 8px; }
.profile-info { flex: 1; min-width: 0; }
.nickname-row {
  font-size: 22px; font-weight: 700; color: #303133;
  margin: 0 0 12px 0; display: flex; align-items: center;
}
.meta-row { color: #606266; margin: 6px 0; font-size: 14px; }
.meta-label { color: #909399; margin-right: 6px; }
.meta-divider { margin: 0 10px; color: #DCDFE6; }

/* 核心指标卡 */
.stat-row { margin: 16px 0; }
.stat-card-wrap { }
.stat-card {
  display: flex; gap: 14px; align-items: center;
  padding: 6px 4px;
}
.stat-icon {
  width: 52px; height: 52px; border-radius: 14px;
  color: #fff; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.stat-main { flex: 1; min-width: 0; }
.stat-value { font-size: 24px; font-weight: 700; color: #303133; line-height: 1.2; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }

.chart-box { height: 360px; width: 100%; }

.pager-right {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.tpl-cover-mini {
  width: 40px; height: 40px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px;
}

.link-btn { color: #379bff; text-decoration: none; font-size: 13px; }
.link-btn:hover { text-decoration: underline; }
</style>
