<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="$route.meta.title || '预设模板包'" />
    <el-divider />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="名称模糊" clearable style="width:200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-select v-model="query.enabled" clearable placeholder="全部" style="width:120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度">
          <el-select v-model="query.difficulty" clearable placeholder="全部" style="width:120px">
            <el-option label="简单" :value="1" />
            <el-option label="中等" :value="2" />
            <el-option label="困难" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Plus" v-hasPerm="'preset:edit'" @click="goEdit()">新增预设</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="封面色" width="90">
          <template #default="{ row }">
            <div class="cover-color" :style="{ background: row.coverColor || '#ccc' }"></div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="难度" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.difficulty === 1" type="success" size="small">简单</el-tag>
            <el-tag v-else-if="row.difficulty === 2" size="small">中等</el-tag>
            <el-tag v-else type="danger" size="small">困难</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序权重" width="110">
          <template #default="{ row }">{{ row.sortOrder ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="启用" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled === 1"
              :disabled="!hasPerm"
              @change="(v) => handleEnabled(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createAdminName" label="创建人" width="110" show-overflow-tooltip />
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" type="primary" v-hasPerm="'preset:list'" @click="goEdit(row.id)">编辑</el-button>
            <el-button
              link size="small" type="danger"
              v-hasPerm="'preset:edit'"
              @click="handleDelete(row.id, row.name)"
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
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { getPresetPage, setPresetEnabled, deletePreset } from '@/api/preset'

const router = useRouter()
const userStore = useUserStore()
const hasPerm = userStore.perms?.has?.('preset:edit')

const query = reactive({ page: 1, size: 10, keyword: '', enabled: null, difficulty: null })
const loading = ref(false)
const total = ref(0)
const tableData = ref([])

const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : ''

async function fetchList() {
  loading.value = true
  try {
    const res = await getPresetPage(query)
    total.value = res.total || 0
    tableData.value = res.records || []
  } finally {
    loading.value = false
  }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() {
  Object.assign(query, { page: 1, size: 10, keyword: '', enabled: null, difficulty: null })
  fetchList()
}

function goEdit(id) {
  const path = '/preset/edit'
  if (id) {
    router.push({ path, query: { id } })
  } else {
    router.push(path)
  }
}

async function handleEnabled(row, v) {
  const target = v ? 1 : 0
  await setPresetEnabled(row.id, target)
  row.enabled = target
  ElMessage.success(target === 1 ? '已启用（小程序端可见）' : '已停用')
}

async function handleDelete(id, name) {
  await ElMessageBox.confirm(`确认删除预设模板包「${name}」？（不可恢复）`, '危险操作', { type: 'error' })
  await deletePreset(id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.search-bar { margin-bottom: 12px; }
.table-card .pager { margin-top: 16px; text-align: right; }
.cover-color { width: 40px; height: 28px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.08); }
</style>
