<template>
  <div class="page-wrap">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="用户ID">
          <el-input
            v-model.number="query.userId"
            type="number"
            placeholder="可选筛选特定用户"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="文件名">
          <el-input
            v-model="query.keyword"
            placeholder="文件名模糊"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
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
            <el-tag :type="row.backupType === 'FULL' ? 'primary' : 'warning'">
              {{ row.backupType === 'FULL' ? '全量' : '增量' }}
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
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-hasPerm="'backup:delete'"
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >删除</el-button>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getBackupList, deleteBackup } from '@/api/backup'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  userId: undefined,
  keyword: '',
  page: 1,
  size: 10
})

function formatTime(t) {
  return t?.replace('T', ' ').slice(0, 16) || '-'
}

function formatVolume(v) {
  if (v == null) return '-'
  const n = Number(v)
  if (isNaN(n)) return '-'
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(1)
}

function formatSize(b) {
  const n = Number(b)
  if (!n || isNaN(n)) return '-'
  const kb = n / 1024
  if (kb > 1024) return (kb / 1024).toFixed(2) + ' MB'
  return kb.toFixed(2) + ' KB'
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
</style>
