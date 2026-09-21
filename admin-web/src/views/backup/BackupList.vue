<template>
  <div class="page-wrap">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar glass-card">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="用户ID">
          <el-input
            v-model.number="query.userId"
            type="number"
            placeholder="可选筛选特定用户"
            clearable
            style="width: 180px"
            class="glass-input"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="文件名">
          <el-input
            v-model="query.keyword"
            placeholder="文件名模糊"
            clearable
            style="width: 200px"
            class="glass-input"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" class="glass-btn-primary" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" class="glass-btn" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card glass-card glass-loading">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
        class="glass-table"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="userId" label="用户ID" width="90" />
        <el-table-column prop="userName" label="用户名" min-width="120" />
        <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />
        <el-table-column label="文件大小" width="120">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="备份类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.backupType === 1 ? 'primary' : 'warning'" class="glass-tag">
              {{ row.backupType === 1 ? '全量' : '增量' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="90" />
        <el-table-column prop="totalDays" label="训练天数" width="100" />
        <el-table-column prop="totalTemplates" label="模板数" width="90" />
        <el-table-column prop="totalActions" label="动作数" width="90" />
        <el-table-column prop="totalVolumeKg" label="容量(kg)" width="120">
          <template #default="{ row }">{{ formatVolume(row.totalVolumeKg) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              :icon="View"
              @click="handlePreviewBackup(row)"
            >预览备份</el-button>
            <el-button
              type="success"
              size="small"
              link
              :icon="Download"
              @click="handleDownloadBackup(row)"
            >下载备份</el-button>
            <el-button
              v-hasPerm="'backup:delete'"
              type="danger"
              size="small"
              link
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager glass-pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSearch"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 备份预览弹窗 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="备份详情预览"
      width="820px"
      :close-on-click-modal="false"
      class="backup-preview-dialog"
    >
      <div v-loading="previewLoading" class="preview-wrapper">
        <el-tabs v-model="activeTab" class="preview-tabs">
          <!-- 概览 Tab -->
          <el-tab-pane label="概览" name="overview">
            <div class="overview-section">
              <div class="section-title">基本信息</div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="版本">
                  {{ previewData.version || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="备份类型">
                  <el-tag size="small" :type="backupTypeTagType(previewData.backupType)">
                    {{ backupTypeText(previewData.backupType) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="备份时间">
                  {{ formatBackupTime(previewData.backupTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="文件名">
                  {{ currentBackupRow?.fileName || '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="overview-section">
              <div class="section-title">数据统计</div>
              <div class="stats-grid">
                <div class="stat-card stat-blue">
                  <div class="stat-value">{{ previewData.totalDays || 0 }}</div>
                  <div class="stat-label">训练天数</div>
                </div>
                <div class="stat-card stat-green">
                  <div class="stat-value">{{ previewData.totalTemplates || 0 }}</div>
                  <div class="stat-label">模板数量</div>
                </div>
                <div class="stat-card stat-orange">
                  <div class="stat-value">{{ previewData.totalActions || 0 }}</div>
                  <div class="stat-label">动作数量</div>
                </div>
                <div class="stat-card stat-purple">
                  <div class="stat-value">{{ formatVolume(previewData.totalVolumeKg) }}</div>
                  <div class="stat-label">总容量 (kg)</div>
                </div>
                <div class="stat-card stat-pink">
                  <div class="stat-value">{{ previewData.totalAnniversaries || 0 }}</div>
                  <div class="stat-label">纪念日</div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 模板 Tab -->
          <el-tab-pane :label="`模板 (${previewData.templates?.length || 0})`" name="templates">
            <div v-if="!previewData.templates?.length" class="empty-state">
              <el-empty description="暂无模板数据" />
            </div>
            <div v-else class="template-list">
              <div
                v-for="(tpl, index) in previewData.templates"
                :key="tpl.id || index"
                class="template-card"
              >
                <div class="template-header" :style="{ borderLeftColor: tpl.color || '#409eff' }">
                  <div class="template-title">
                    <span class="template-index">{{ index + 1 }}</span>
                    <span class="template-name">{{ tpl.name }}</span>
                  </div>
                  <div class="template-meta">
                    <el-tag size="small" type="info">{{ tpl.actionCount || 0 }} 个动作</el-tag>
                  </div>
                </div>
                <div class="template-actions">
                  <div
                    v-for="(action, actIndex) in tpl.actions"
                    :key="actIndex"
                    class="action-item"
                  >
                    <span class="action-name">{{ action }}</span>
                    <span class="action-sets">
                      {{ tpl.actionSets && tpl.actionSets[action] ? tpl.actionSets[action] : 4 }} 组
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 训练数据 Tab -->
          <el-tab-pane :label="`训练数据 (${previewData.dayDataList?.length || 0})`" name="daydata">
            <div v-if="!previewData.dayDataList?.length" class="empty-state">
              <el-empty description="暂无训练数据" />
            </div>
            <div v-else class="day-list">
              <div
                v-for="(day, idx) in previewData.dayDataList"
                :key="day.date"
                class="day-card"
              >
                <div class="day-header">
                  <div class="day-date">
                    <el-icon><Calendar /></el-icon>
                    <span>{{ day.date }}</span>
                  </div>
                  <div class="day-stats">
                    <el-tag size="small" type="primary">{{ day.actionCount }} 个动作</el-tag>
                    <el-tag size="small" type="success">{{ formatVolume(day.totalVolumeKg) }} kg</el-tag>
                  </div>
                </div>
                <div v-if="day.templateNames?.length" class="day-templates">
                  <span class="day-label">使用模板：</span>
                  <el-tag
                    v-for="(tpl, ti) in day.templateNames"
                    :key="ti"
                    size="small"
                    type="warning"
                    effect="plain"
                    class="day-tpl-tag"
                  >{{ tpl }}</el-tag>
                </div>
                <div class="day-actions">
                  <span class="day-label">动作：</span>
                  <div class="day-action-list">
                    <div
                      v-for="(act, ai) in day.actionNames"
                      :key="ai"
                      class="day-action-item"
                      :class="{ active: expandedActions[`${day.date}_${act}`] }"
                      @click="toggleActionExpand(day.date, act)"
                    >
                      <span class="day-action-name">{{ act }}</span>
                      <span class="day-action-count">
                        {{ day.actionEntries?.[act]?.length || 0 }}组
                      </span>
                      <el-icon class="expand-icon">
                        <ArrowDown />
                      </el-icon>
                    </div>
                  </div>
                </div>
                <!-- 展开的组详情 -->
                <div
                  v-for="(act, ai) in day.actionNames"
                  :key="'detail_' + ai"
                  v-show="expandedActions[`${day.date}_${act}`] && day.actionEntries?.[act]?.length"
                  class="day-action-detail"
                >
                  <div class="detail-table">
                    <div class="detail-row detail-header">
                      <span class="detail-col-idx">组</span>
                      <span class="detail-col-weight">重量 (kg)</span>
                      <span class="detail-col-reps">次数</span>
                      <span class="detail-col-total">容量 (kg)</span>
                    </div>
                    <div
                      v-for="(entry, ei) in day.actionEntries[act]"
                      :key="ei"
                      class="detail-row"
                    >
                      <span class="detail-col-idx">{{ ei + 1 }}</span>
                      <span class="detail-col-weight">{{ entry.weight ?? '-' }}</span>
                      <span class="detail-col-reps">{{ entry.reps ?? '-' }}</span>
                      <span class="detail-col-total">{{ formatVolume(entry.total) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 动作库 Tab -->
          <el-tab-pane :label="`动作库 (${previewData.actions?.length || 0})`" name="actions">
            <div v-if="!previewData.actions?.length" class="empty-state">
              <el-empty description="暂无动作数据" />
            </div>
            <div v-else class="actions-grid">
              <div
                v-for="(act, idx) in previewData.actions"
                :key="act.id || idx"
                class="action-card"
              >
                <div class="action-card-name">{{ act.name }}</div>
                <div class="action-card-cat">
                  <el-tag size="small" type="info">{{ act.categoryName || '未分类' }}</el-tag>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 纪念日 Tab -->
          <el-tab-pane :label="`纪念日 (${previewData.anniversaries?.length || 0})`" name="annivs">
            <div v-if="!previewData.anniversaries?.length" class="empty-state">
              <el-empty description="暂无纪念日数据" />
            </div>
            <div v-else class="anniv-list">
              <div
                v-for="(anniv, idx) in previewData.anniversaries"
                :key="anniv.id || idx"
                class="anniv-card"
              >
                <div class="anniv-emoji">{{ anniv.emoji || '📅' }}</div>
                <div class="anniv-info">
                  <div class="anniv-title">{{ anniv.title }}</div>
                  <div class="anniv-date">{{ anniv.date }}</div>
                </div>
                <el-tag size="small" type="warning">{{ anniv.type || '纪念日' }}</el-tag>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <div class="footer-info">
            共 <b>{{ previewData.totalDays || 0 }}</b> 天训练 ·
            <b>{{ previewData.totalTemplates || 0 }}</b> 个模板 ·
            <b>{{ previewData.totalActions || 0 }}</b> 个动作
          </div>
          <div class="footer-actions">
            <el-button @click="previewDialogVisible = false">关闭</el-button>
            <el-button type="primary" :icon="Download" @click="handleDownloadFromPreview">
              下载完整备份
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, View, Download, Calendar, ArrowDown } from '@element-plus/icons-vue'
import { getBackupList, deleteBackup, getBackupPreview, downloadBackup } from '@/api/backup'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  userId: undefined,
  keyword: '',
  page: 1,
  size: 10
})

// 备份预览相关
const previewDialogVisible = ref(false)
const previewLoading = ref(false)
const activeTab = ref('overview')
const previewData = ref({})
const currentBackupRow = ref(null)
const expandedActions = reactive({}) // { "date_actionName": true/false }

/** 切换动作展开/收起 */
function toggleActionExpand(date, actionName) {
  const key = `${date}_${actionName}`
  expandedActions[key] = !expandedActions[key]
}

function formatTime(t) {
  return t?.replace('T', ' ').slice(0, 16) || '-'
}

function formatVolume(v) {
  if (v == null) return '0'
  const n = Number(v)
  if (isNaN(n)) return '0'
  if (Number.isInteger(n)) return n.toLocaleString()
  return n.toFixed(1)
}

function formatSize(b) {
  const n = Number(b)
  if (!n || isNaN(n)) return '-'
  const kb = n / 1024
  if (kb > 1024) return (kb / 1024).toFixed(2) + ' MB'
  return kb.toFixed(2) + ' KB'
}

function formatBackupTime(ts) {
  if (!ts) return '-'
  const d = new Date(Number(ts))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function backupTypeText(type) {
  if (type === 'full' || type === 1) return '全量'
  if (type === 'incremental' || type === 2) return '增量'
  if (type === 'template_export') return '模板导出'
  return type || '-'
}

function backupTypeTagType(type) {
  if (type === 'full' || type === 1) return 'primary'
  if (type === 'incremental' || type === 2) return 'warning'
  return 'info'
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getBackupList({ ...query })
    tableData.value = res?.records || []
    total.value = res?.total || 0
  } catch (e) {
    // 错误已在 request 拦截器中提示
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.userId = undefined
  query.keyword = ''
  query.page = 1
  query.size = 10
  fetchList()
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除备份「${row.fileName || row.id}」吗？此操作不可恢复。`, '提示', {
      type: 'warning'
    })
    await deleteBackup(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
  }
}

/** 预览备份 */
async function handlePreviewBackup(row) {
  currentBackupRow.value = row
  previewDialogVisible.value = true
  previewLoading.value = true
  activeTab.value = 'overview'
  previewData.value = {}
  // 重置展开状态
  Object.keys(expandedActions).forEach(k => delete expandedActions[k])
  try {
    const res = await getBackupPreview(row.id)
    previewData.value = res || {}
  } catch (e) {
    // 错误已在 request 拦截器中提示
  } finally {
    previewLoading.value = false
  }
}

/** 下载完整备份（从列表按钮） */
async function handleDownloadBackup(row) {
  if (!row?.id) return
  try {
    const blob = await downloadBackup(row.id)
    downloadBlob(blob, row.fileName || `backup_${row.id}.json`)
    ElMessage.success('备份下载成功')
  } catch (e) {
    // 错误已在 request 拦截器中提示
  }
}

/** 从预览弹窗下载完整备份 */
async function handleDownloadFromPreview() {
  if (!currentBackupRow.value) return
  await handleDownloadBackup(currentBackupRow.value)
}

/** 下载 blob 文件 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

onMounted(fetchList)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.search-bar { margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }
.table-card :deep(.el-card__body) { padding: 16px; }
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ===== 备份预览弹窗 ===== */
.backup-preview-dialog :deep(.el-dialog__body) {
  padding: 0 20px 16px;
}

.preview-wrapper {
  min-height: 400px;
  max-height: 65vh;
  overflow-y: auto;
}

.preview-tabs {
  margin-top: 0;
}

.preview-tabs :deep(.el-tabs__header) {
  margin: 0 0 16px 0;
}

.empty-state {
  padding: 40px 0;
}

/* --- 概览 Tab --- */
.overview-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--glass-text);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--accent-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.stat-card {
  text-align: center;
  padding: 16px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border-soft);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--glass-text-muted);
}

.stat-blue .stat-value { color: var(--accent-primary); }
.stat-green .stat-value { color: var(--accent-success); }
.stat-orange .stat-value { color: var(--accent-warning); }
.stat-purple .stat-value { color: #b78eff; }
.stat-pink .stat-value { color: var(--accent-danger); }

/* --- 模板 Tab --- */
.template-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--glass-border-soft);
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-left: 4px solid var(--accent-primary);
  border-bottom: 1px solid var(--glass-border-soft);
}

.template-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.template-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(91, 157, 255, 0.15);
  color: var(--accent-primary-light);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.template-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--glass-text);
}

.template-meta { flex-shrink: 0; }

.template-actions {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  border: 1px solid var(--glass-border-soft);
  font-size: 13px;
}

.action-name {
  color: var(--glass-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.action-sets {
  flex-shrink: 0;
  color: var(--glass-text-muted);
  font-size: 12px;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}

/* --- 训练数据 Tab --- */
.day-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid var(--glass-border-soft);
  padding: 12px 16px;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.day-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--glass-text);
}

.day-date .el-icon {
  color: var(--accent-primary);
}

.day-stats {
  display: flex;
  gap: 8px;
}

.day-templates,
.day-actions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
}

.day-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--glass-text-muted);
  padding-top: 2px;
  width: 60px;
}

.day-tpl-tag {
  margin-right: 4px;
}

.day-action-list {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.day-action-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border-soft);
  border-radius: 14px;
  font-size: 12px;
  color: var(--glass-text-secondary);
  cursor: pointer;
}

.day-action-item:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary-light);
}

.day-action-item.active {
  background: rgba(91, 157, 255, 0.12);
  border-color: var(--accent-primary);
  color: var(--accent-primary-light);
}

.day-action-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-action-count {
  font-size: 11px;
  color: var(--glass-text-muted);
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 8px;
}

.day-action-item.active .day-action-count {
  background: rgba(91, 157, 255, 0.15);
  color: var(--accent-primary-light);
}

.expand-icon {
  font-size: 10px;
}

.day-action-item.active .expand-icon {
  transform: rotate(180deg);
}

/* 动作展开详情 */
.day-action-detail {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--glass-border-soft);
  border-radius: 6px;
}

.detail-table {
  width: 100%;
}

.detail-row {
  display: grid;
  grid-template-columns: 50px 1fr 1fr 1fr;
  gap: 8px;
  padding: 6px 8px;
  font-size: 12px;
  border-bottom: 1px solid var(--glass-border-soft);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.detail-header {
  background: rgba(255, 255, 255, 0.04);
  font-weight: 600;
  color: var(--glass-text-secondary);
  border-radius: 4px;
}

.detail-col-idx {
  text-align: center;
  color: var(--glass-text-muted);
}

.detail-col-weight,
.detail-col-reps,
.detail-col-total {
  text-align: right;
  color: var(--glass-text);
}

.detail-header .detail-col-weight,
.detail-header .detail-col-reps,
.detail-header .detail-col-total {
  color: var(--glass-text-secondary);
}

/* --- 动作库 Tab --- */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.action-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border-soft);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.action-card-name {
  font-size: 13px;
  color: var(--glass-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.action-card-cat {
  flex-shrink: 0;
}

/* --- 纪念日 Tab --- */
.anniv-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.anniv-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border-soft);
  border-radius: 8px;
}

.anniv-emoji {
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  flex-shrink: 0;
}

.anniv-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.anniv-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--glass-text);
}

.anniv-date {
  font-size: 12px;
  color: var(--glass-text-muted);
}

/* --- 底部 --- */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-info {
  font-size: 13px;
  color: var(--glass-text-muted);
}

.footer-info b {
  color: var(--accent-primary-light);
  font-size: 15px;
  margin: 0 2px;
}

.footer-actions {
  display: flex;
  gap: 8px;
}
</style>
