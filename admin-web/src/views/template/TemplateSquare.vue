<template>
  <div class="page-wrap">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar glass-card">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="名称模糊"
            clearable
            style="width: 200px"
            class="glass-input"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="query.sort" style="width: 120px" class="glass-select">
            <el-option label="最新" value="latest" />
            <el-option label="热度" value="hot" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" class="glass-btn-primary" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" class="glass-btn" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card glass-card glass-loading">
      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%" class="glass-table">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="userName" label="分享人" width="120" show-overflow-tooltip />
        <el-table-column label="官方" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isOfficial === 1" type="primary" class="glass-tag">官方</el-tag>
            <span v-else style="color:var(--glass-text-muted)">-</span>
          </template>
        </el-table-column>
        <el-table-column label="排序权重" width="130">
          <template #default="{ row }">
            <el-input
              v-if="editingId === row.id"
              v-model.number="editWeight"
              type="number"
              size="small"
              style="width: 90px"
              class="glass-input"
              @blur="submitInlineEdit(row)"
              @keyup.enter="submitInlineEdit(row)"
            />
            <span v-else class="weight-cell" @click="startEdit(row)">{{ row.sortWeight ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览数" width="90" />
        <el-table-column prop="collectCount" label="收藏数" width="90" />
        <el-table-column prop="downloadCount" label="下载数" width="90" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="openDetail(row)"
            >查看详情</el-button>
            <el-button
              v-hasPerm="'template:official'"
              v-if="row.isOfficial !== 1"
              type="primary"
              link
              size="small"
              @click="openOfficial(row)"
            >设为官方</el-button>
            <el-button
              v-hasPerm="'template:official'"
              v-else
              type="warning"
              link
              size="small"
              @click="handleCancelOfficial(row)"
            >取消官方</el-button>
            <el-button
              v-hasPerm="'template:square'"
              type="danger"
              link
              size="small"
              @click="openOffline(row)"
            >下架</el-button>
            <el-popconfirm
              title="确定删除该模板吗？此操作不可恢复"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button v-hasPerm="'template:square'" type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
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

    <!-- 设为官方弹窗 -->
    <el-dialog v-model="officialVisible" title="设为官方推荐" width="420px" class="glass-dialog">
      <el-form :model="officialForm" label-position="top">
        <el-form-item label="排序权重（数字越大越靠前）">
          <el-input-number v-model="officialForm.sortWeight" :min="0" :max="9999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="officialVisible = false" class="glass-btn">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmOfficial" class="glass-btn-primary">确认</el-button>
      </template>
    </el-dialog>

    <!-- 下架弹窗 -->
    <el-dialog v-model="offlineVisible" title="强制下架" width="500px" class="glass-dialog">
      <el-form ref="offlineFormRef" :model="offlineForm" :rules="offlineRules" label-position="top">
        <el-form-item label="下架原因（驳回原因，不少于10字）" prop="rejectReason">
          <el-input
            v-model="offlineForm.rejectReason"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请填写下架原因，不少于10字"
            class="glass-input"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="offlineVisible = false" class="glass-btn">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmOffline" class="glass-btn">确认下架</el-button>
      </template>
    </el-dialog>

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
          <el-tag v-if="detail?.isOfficial === 1" type="primary" class="detail-official-tag">官方</el-tag>
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
            <div class="detail-stat-card">
              <text class="detail-stat-num">{{ detail.viewCount ?? 0 }}</text>
              <text class="detail-stat-label">浏览数</text>
            </div>
            <div class="detail-stat-card">
              <text class="detail-stat-num">{{ detail.collectCount ?? 0 }}</text>
              <text class="detail-stat-label">收藏数</text>
            </div>
            <div class="detail-stat-card">
              <text class="detail-stat-num">{{ detail.downloadCount ?? 0 }}</text>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getSquareList, getSquareDetail, setOfficial, deleteSquareTemplate, offlineSquareTemplate } from '@/api/template'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  keyword: '',
  sort: 'latest',
  page: 1,
  size: 10
})

// 行内编辑排序权重
const editingId = ref(null)
const editWeight = ref(0)

function startEdit(row) {
  editingId.value = row.id
  editWeight.value = row.sortWeight ?? 0
}

async function submitInlineEdit(row) {
  const newWeight = Number(editWeight.value)
  const oldWeight = row.sortWeight ?? 0
  editingId.value = null
  if (newWeight === oldWeight) return
  try {
    await setOfficial(row.id, { isOfficial: row.isOfficial ?? 0, sortWeight: newWeight })
    row.sortWeight = newWeight
    ElMessage.success('排序权重已更新')
  } catch (e) {
    // ignore
  }
}

// 设为官方 / 取消官方
const officialVisible = ref(false)
const submitting = ref(false)
const officialForm = reactive({ id: null, sortWeight: 0 })

function openOfficial(row) {
  officialForm.id = row.id
  officialForm.sortWeight = row.sortWeight ?? 0
  officialVisible.value = true
}

async function confirmOfficial() {
  submitting.value = true
  try {
    await setOfficial(officialForm.id, { isOfficial: 1, sortWeight: officialForm.sortWeight })
    ElMessage.success('已设为官方')
    officialVisible.value = false
    fetchList()
  } catch (e) {
    // ignore
  } finally {
    submitting.value = false
  }
}

async function handleCancelOfficial(row) {
  try {
    await ElMessageBox.confirm(`确定取消「${row.name || row.id}」的官方推荐吗？`, '提示', { type: 'warning' })
    await setOfficial(row.id, { isOfficial: 0, sortWeight: row.sortWeight ?? 0 })
    ElMessage.success('已取消官方')
    fetchList()
  } catch (e) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
  }
}

// 下架（独立于审核接口：审核作用于 status=0 待审核模板，下架作用于 status=1 已上架模板）
const offlineVisible = ref(false)
const offlineFormRef = ref(null)
const offlineForm = reactive({ id: null, rejectReason: '' })
const offlineRules = {
  rejectReason: [
    { required: true, message: '下架原因必填', trigger: 'blur' },
    { min: 10, message: '原因不少于10字', trigger: 'blur' }
  ]
}

function openOffline(row) {
  offlineForm.id = row.id
  offlineForm.rejectReason = ''
  offlineVisible.value = true
}

async function confirmOffline() {
  await offlineFormRef.value.validate()
  submitting.value = true
  try {
    await offlineSquareTemplate(offlineForm.id, { rejectReason: offlineForm.rejectReason.trim() })
    ElMessage.success('已下架')
    offlineVisible.value = false
    fetchList()
  } catch (e) {
    // ignore
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await deleteSquareTemplate(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) {
    // ignore
  }
}

function formatTime(t) {
  return t?.replace('T', ' ').slice(0, 16) || '-'
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getSquareList({ ...query })
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
  query.keyword = ''
  query.sort = 'latest'
  query.page = 1
  query.size = 10
  fetchList()
}

// 详情抽屉
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

async function openDetail(row) {
  drawerVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getSquareDetail(row.id)
  } catch (e) {
    // ignore
  } finally {
    detailLoading.value = false
  }
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
.weight-cell {
  cursor: pointer;
  display: inline-block;
  min-width: 40px;
  padding: 2px 6px;
  border-radius: 4px;
}
.weight-cell:hover {
  background: #ecf5ff;
  color: #409eff;
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
.detail-official-tag {
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
