<template>
  <div class="page-wrap">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="用户名/昵称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" style="width: 140px" clearable>
            <el-option label="全部" :value="undefined" />
            <el-option label="正常" :value="1" />
            <el-option label="封禁" :value="0" />
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
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column label="性别" width="90">
          <template #default="{ row }">
            <el-tag :type="genderTagType(row.gender)">{{ genderText(row.gender) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '封禁' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalTrainDays" label="训练天数" width="100" />
        <el-table-column label="训练容量(kg)" width="130">
          <template #default="{ row }">
            {{ formatVolume(row.totalVolumeKg) }}
          </template>
        </el-table-column>
        <el-table-column label="最后登录时间" width="160">
          <template #default="{ row }">{{ formatTime(row.lastLoginTime) }}</template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">{{ formatTime(row.registerTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              link size="small" type="primary"
              @click="$router.push({ path: '/user/detail', query: { id: row.id } })"
            >查看详情</el-button>
            <el-button
              v-if="row.status === 1"
              v-hasPerm="'user:status'"
              type="danger"
              size="small"
              @click="handleBan(row)"
            >封禁</el-button>
            <el-button
              v-else
              v-hasPerm="'user:status'"
              type="success"
              size="small"
              @click="handleUnban(row)"
            >解封</el-button>
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
import { getUserList, banUser, unbanUser } from '@/api/user'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  keyword: '',
  status: undefined,
  page: 1,
  size: 10
})

function formatTime(t) {
  return t?.replace('T', ' ').slice(0, 16) || '-'
}

function formatVolume(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '0'
  return Number(v).toLocaleString()
}

function genderText(g) {
  if (g === 1) return '男'
  if (g === 2) return '女'
  return '未知'
}
function genderTagType(g) {
  if (g === 1) return 'primary'
  if (g === 2) return 'warning'
  return 'default'
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList({ ...query })
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
  query.status = undefined
  query.page = 1
  query.size = 10
  fetchList()
}

async function handleBan(row) {
  try {
    await ElMessageBox.confirm(`确定封禁用户「${row.username || row.nickname || row.id}」吗？`, '提示', {
      type: 'warning'
    })
    await banUser(row.id)
    ElMessage.success('已封禁')
    fetchList()
  } catch (e) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
  }
}

async function handleUnban(row) {
  try {
    await ElMessageBox.confirm(`确定解封用户「${row.username || row.nickname || row.id}」吗？`, '提示', {
      type: 'warning'
    })
    await unbanUser(row.id)
    ElMessage.success('已解封')
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
