<template>
  <div class="page-wrap">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="glass-tabs">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="待审核" name="0" />
      <el-tab-pane label="已通过" name="1" />
      <el-tab-pane label="已驳回" name="2" />
    </el-tabs>

    <el-card shadow="never" class="table-card glass-card glass-loading">
      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%" class="glass-table">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="userName" label="分享人" width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" class="glass-tag">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="actionCount" label="动作数" width="90" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPerm="'template:audit'" type="primary" link size="small" @click="openDetail(row)">查看详情</el-button>
            <el-button
              v-hasPerm="'template:audit'"
              v-if="row.status === 0"
              type="success"
              link
              size="small"
              @click="handlePass(row)"
            >通过</el-button>
            <el-button
              v-hasPerm="'template:audit'"
              v-if="row.status === 0"
              type="danger"
              link
              size="small"
              @click="openReject(row)"
            >驳回</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="drawerVisible" title="" width="640px" class="detail-dialog glass-dialog" :show-close="false" align-center>
      <div v-loading="detailLoading" class="detail-content">
        <!-- 渐变封面区 -->
        <div class="detail-cover" :style="{ background: `linear-gradient(135deg, ${detail?.coverColor || '#379bff'}, ${detail?.coverColor || '#379bff'}dd)` }">
          <text class="detail-cover-icon">📋</text>
          <view class="detail-cover-info">
            <text class="detail-cover-name">{{ detail?.name }}</text>
            <text class="detail-cover-author">分享人：{{ detail?.userName || '-' }}</text>
          </view>
          <el-tag :type="statusTagType(detail?.status)" class="detail-status-tag">{{ statusText(detail?.status) }}</el-tag>
          <text class="detail-close-btn" @click="drawerVisible = false">×</text>
        </div>

        <div class="detail-body" v-if="detail">
          <!-- 统计卡片 -->
          <div class="detail-stats-row">
            <div class="detail-stat-card">
              <text class="detail-stat-num">{{ detail.actionCount ?? 0 }}</text>
              <text class="detail-stat-label">动作数</text>
            </div>
            <div class="detail-stat-card">
              <text class="detail-stat-num">{{ detail.totalSets ?? 0 }}</text>
              <text class="detail-stat-label">总组数</text>
            </div>
            <div class="detail-stat-card" v-if="detail.viewCount != null">
              <text class="detail-stat-num">{{ detail.viewCount }}</text>
              <text class="detail-stat-label">浏览数</text>
            </div>
            <div class="detail-stat-card" v-if="detail.collectCount != null">
              <text class="detail-stat-num">{{ detail.collectCount }}</text>
              <text class="detail-stat-label">收藏数</text>
            </div>
            <div class="detail-stat-card" v-if="detail.downloadCount != null">
              <text class="detail-stat-num">{{ detail.downloadCount }}</text>
              <text class="detail-stat-label">下载数</text>
            </div>
          </div>

          <!-- 封面色 + 标签 -->
          <div class="detail-row">
            <text class="detail-row-label">封面色</text>
            <div class="color-block" :style="{ background: detail.coverColor || '#ccc' }">{{ detail.coverColor || '-' }}</div>
          </div>
          <div class="detail-row" v-if="detail.tags?.length">
            <text class="detail-row-label">标签</text>
            <div class="detail-tags">
              <el-tag
                v-for="t in detail.tags"
                :key="t.id"
                :color="t.color"
                style="margin-right:6px;color:#fff;border:none;"
                size="small"
                class="glass-tag"
              >{{ t.name }}</el-tag>
            </div>
          </div>

          <!-- 描述 -->
          <div class="detail-row" v-if="detail.description">
            <text class="detail-row-label">描述</text>
            <text class="detail-desc-text">{{ detail.description }}</text>
          </div>

          <!-- 驳回原因 -->
          <div class="detail-row" v-if="detail.status === 2 && detail.rejectReason">
            <text class="detail-row-label" style="color:#f56c6c">驳回原因</text>
            <text class="detail-desc-text" style="color:#f56c6c">{{ detail.rejectReason }}</text>
          </div>

          <!-- 动作清单 -->
          <div class="detail-section-title">动作清单</div>
          <div class="detail-action-list">
            <div v-for="(a, i) in parsedActions" :key="i" class="detail-action-row">
              <text class="detail-action-index">{{ i + 1 }}</text>
              <text class="detail-action-name">{{ a.name }}</text>
              <text class="detail-action-sets">{{ a.sets }} 组</text>
            </div>
            <div v-if="!parsedActions.length" class="detail-empty-text">暂无动作数据</div>
          </div>

          <!-- 模板数据预览 -->
          <div class="detail-section-title">模板数据 (JSON)</div>
          <pre class="data-pre">{{ prettyData }}</pre>
        </div>
      </div>
    </el-dialog>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectVisible" title="驳回模板" width="500px" class="glass-dialog">
      <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-position="top">
        <el-form-item label="驳回原因" prop="rejectReason">
          <el-input
            v-model="rejectForm.rejectReason"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请填写驳回原因，不少于10字"
            class="glass-input"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false" class="glass-btn">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmReject" class="glass-btn">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAuditList, getAuditDetail, auditTemplate } from '@/api/template'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const activeTab = ref('all')

const query = reactive({
  status: undefined,
  page: 1,
  size: 10
})

const drawerVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const prettyData = computed(() => {
  if (!detail.value?.templateData) return '-'
  try {
    return JSON.stringify(JSON.parse(detail.value.templateData), null, 2)
  } catch (e) {
    return detail.value.templateData
  }
})

const parsedActions = computed(() => {
  if (!detail.value?.templateData) return []
  try {
    const data = typeof detail.value.templateData === 'string'
      ? JSON.parse(detail.value.templateData)
      : detail.value.templateData
    const acts = data?.actions || data?.actionList || []
    if (!Array.isArray(acts)) return []
    const setsMap = data?.actionSets || {}
    return acts.map((a, i) => {
      if (typeof a === 'string') {
        return { name: a || ('动作' + (i + 1)), sets: Number(setsMap[a]) || 0 }
      }
      if (a && typeof a === 'object') {
        return { name: a.name || a.actionName || ('动作' + (i + 1)), sets: Number(a.sets) || 0 }
      }
      return { name: '动作' + (i + 1), sets: 0 }
    })
  } catch (e) {
    return []
  }
})

const rejectVisible = ref(false)
const rejectFormRef = ref(null)
const submitting = ref(false)
const rejectForm = reactive({ id: null, rejectReason: '' })
const rejectRules = {
  rejectReason: [
    { required: true, message: '驳回原因必填', trigger: 'blur' },
    { min: 10, message: '驳回原因不少于10字', trigger: 'blur' }
  ]
}

function statusText(s) {
  if (s === 0) return '待审核'
  if (s === 1) return '已通过'
  if (s === 2) return '已驳回'
  return '-'
}
function statusTagType(s) {
  if (s === 0) return 'warning'
  if (s === 1) return 'success'
  if (s === 2) return 'danger'
  return 'default'
}

function formatTime(t) {
  return t?.replace('T', ' ').slice(0, 16) || '-'
}

function handleTabChange(name) {
  query.status = name === 'all' ? undefined : Number(name)
  query.page = 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getAuditList({ ...query })
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

async function openDetail(row) {
  drawerVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getAuditDetail(row.id)
  } catch (e) {
    // ignore
  } finally {
    detailLoading.value = false
  }
}

async function handlePass(row) {
  try {
    await ElMessageBox.confirm(`确定通过模板「${row.name || row.id}」的审核吗？`, '审核通过', { type: 'success' })
    await auditTemplate(row.id, { status: 1 })
    ElMessage.success('已通过')
    fetchList()
  } catch (e) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
  }
}

function openReject(row) {
  rejectForm.id = row.id
  rejectForm.rejectReason = ''
  rejectVisible.value = true
}

async function confirmReject() {
  await rejectFormRef.value.validate()
  submitting.value = true
  try {
    await auditTemplate(rejectForm.id, { status: 2, rejectReason: rejectForm.rejectReason.trim() })
    ElMessage.success('已驳回')
    rejectVisible.value = false
    fetchList()
  } catch (e) {
    // ignore（拦截器已提示）
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.table-card :deep(.el-card__body) { padding: 16px; }
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* —— 详情弹窗 —— */
.detail-dialog :deep(.el-dialog__body) { padding: 0; overflow: hidden; }
.detail-dialog :deep(.el-dialog__header) { padding: 0; }
.detail-content { overflow: hidden; border-radius: 12px; }

.detail-cover {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  color: #fff;
  overflow: hidden;
}
.detail-cover-icon {
  font-size: 32px;
  flex-shrink: 0;
}
.detail-cover-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.detail-cover-name {
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-cover-author {
  font-size: 13px;
  opacity: 0.85;
}
.detail-status-tag {
  flex-shrink: 0;
}
.detail-close-btn {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 22px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  z-index: 2;
  line-height: 1;
}
.detail-close-btn:hover { color: #fff; }

.detail-body {
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-stats-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.detail-stat-card {
  flex: 1;
  min-width: 72px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border-soft, rgba(255,255,255,0.08));
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
}
.detail-stat-num {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--glass-text-primary, #e8edf5);
}
.detail-stat-label {
  display: block;
  font-size: 11px;
  color: var(--glass-text-muted, #6b7a94);
  margin-top: 2px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.detail-row-label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--glass-text-muted, #6b7a94);
  min-width: 50px;
  line-height: 24px;
}
.detail-desc-text {
  flex: 1;
  font-size: 13px;
  color: var(--glass-text-primary, #e8edf5);
  line-height: 1.6;
  word-break: break-all;
}
.color-block {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.detail-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--glass-text-primary, #e8edf5);
  margin: 16px 0 10px;
  padding-left: 8px;
  border-left: 3px solid var(--primary, #379bff);
}

.detail-action-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.detail-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}
.detail-action-index {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #379bff), #6ab6ff);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.detail-action-name {
  flex: 1;
  font-size: 13px;
  color: var(--glass-text-primary, #e8edf5);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-action-sets {
  padding: 2px 8px;
  background: rgba(55, 155, 255, 0.12);
  color: var(--primary, #379bff);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.detail-empty-text {
  font-size: 13px;
  color: var(--glass-text-muted, #6b7a94);
  text-align: center;
  padding: 16px 0;
}

.data-pre {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border-soft, rgba(255,255,255,0.08));
  color: var(--glass-text-secondary, #a8b5cc);
  border-radius: 6px;
  padding: 12px;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.5;
}
</style>
