<template>
  <div class="page-wrap">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="名称模糊"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="query.sort" style="width: 120px">
            <el-option label="最新" value="latest" />
            <el-option label="热度" value="hot" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="userName" label="分享人" width="120" show-overflow-tooltip />
        <el-table-column label="官方" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isOfficial === 1" type="primary">官方</el-tag>
            <span v-else style="color:#c0c4cc">-</span>
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
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

    <!-- 设为官方弹窗 -->
    <el-dialog v-model="officialVisible" title="设为官方推荐" width="420px">
      <el-form :model="officialForm" label-position="top">
        <el-form-item label="排序权重（数字越大越靠前）">
          <el-input-number v-model="officialForm.sortWeight" :min="0" :max="9999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="officialVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmOfficial">确认</el-button>
      </template>
    </el-dialog>

    <!-- 下架弹窗 -->
    <el-dialog v-model="offlineVisible" title="强制下架" width="500px">
      <el-form ref="offlineFormRef" :model="offlineForm" :rules="offlineRules" label-position="top">
        <el-form-item label="下架原因（驳回原因，不少于10字）" prop="rejectReason">
          <el-input
            v-model="offlineForm.rejectReason"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请填写下架原因，不少于10字"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="offlineVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmOffline">确认下架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getSquareList, setOfficial, deleteSquareTemplate, auditTemplate } from '@/api/template'

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

// 下架（调审核接口 status=2）
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
    await auditTemplate(offlineForm.id, { status: 2, rejectReason: offlineForm.rejectReason.trim() })
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
</style>
