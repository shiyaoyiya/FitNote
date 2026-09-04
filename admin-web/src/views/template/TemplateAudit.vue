<template>
  <div class="page-wrap">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="待审核" name="0" />
      <el-tab-pane label="已通过" name="1" />
      <el-tab-pane label="已驳回" name="2" />
    </el-tabs>

    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="userName" label="分享人" width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
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

      <div class="pager">
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

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" title="模板详情" size="45%">
      <div v-loading="detailLoading" class="detail-box">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="名称">{{ detail?.name }}</el-descriptions-item>
          <el-descriptions-item label="分享人">{{ detail?.userName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detail?.status)">{{ statusText(detail?.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="动作数 / 总组数">{{ detail?.actionCount }} / {{ detail?.totalSets }}</el-descriptions-item>
          <el-descriptions-item label="封面色">
            <div class="color-block" :style="{ background: detail?.coverColor || '#ccc' }">{{ detail?.coverColor || '-' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="描述">{{ detail?.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag
              v-for="t in detail?.tags || []"
              :key="t.id"
              :color="t.color"
              style="margin-right:6px;color:#fff;border:none;"
              size="small"
            >{{ t.name }}</el-tag>
            <span v-if="!detail?.tags?.length">-</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail?.status === 2" label="驳回原因">
            <span style="color:#f56c6c">{{ detail?.rejectReason || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>
        <div class="data-title">模板数据预览</div>
        <pre class="data-pre">{{ prettyData }}</pre>
      </div>
    </el-drawer>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectVisible" title="驳回模板" width="500px">
      <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-position="top">
        <el-form-item label="驳回原因" prop="rejectReason">
          <el-input
            v-model="rejectForm.rejectReason"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请填写驳回原因，不少于10字"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmReject">确认驳回</el-button>
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
.detail-box { padding: 0 16px 16px; }
.color-block {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}
.data-title {
  margin: 16px 0 8px;
  font-weight: 600;
}
.data-pre {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.5;
}
</style>
