<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="$route.meta.title || '公告列表'" />
    <el-divider />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="标题模糊" clearable style="width:200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width:120px">
            <el-option label="草稿" :value="0" />
            <el-option label="已发布" :value="1" />
            <el-option label="已撤回" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.type" clearable placeholder="全部" style="width:120px">
            <el-option label="系统公告" :value="1" />
            <el-option label="活动通知" :value="2" />
            <el-option label="版本更新" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Plus" v-hasPerm="'announce:publish'" @click="openEdit()">新增公告</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ row.typeText || '—' }}</template>
        </el-table-column>
        <el-table-column label="置顶" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.priority === 1" type="danger">置顶</el-tag>
            <span v-else style="color:#909399">普通</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="info">草稿</el-tag>
            <el-tag v-else-if="row.status === 1" type="success">已发布</el-tag>
            <el-tag v-else type="warning">已撤回</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishAdminName" label="发布人" width="110" show-overflow-tooltip />
        <el-table-column prop="viewCount" label="浏览量" width="80" />
        <el-table-column label="发布时间" width="160">
          <template #default="{ row }">{{ row.publishTime ? formatTime(row.publishTime) : '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status !== 1"
              link size="small" type="success"
              v-hasPerm="'announce:publish'"
              @click="handlePublish(row.id)"
            >发布</el-button>
            <el-button
              v-if="row.status === 1"
              link size="small" type="warning"
              v-hasPerm="'announce:publish'"
              @click="handleWithdraw(row.id)"
            >撤回</el-button>
            <el-button
              link size="small" type="danger"
              v-hasPerm="'announce:publish'"
              @click="handleDelete(row.id)"
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

    <!-- 新增/编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="form.id ? '编辑公告' : '新增公告'" size="45%">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" class="form-box">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="公告标题" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="1">系统公告</el-radio>
            <el-radio :value="2">活动通知</el-radio>
            <el-radio :value="3">版本更新</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否置顶">
          <el-switch v-model="prioritySwitch" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            placeholder="公告内容（支持换行）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="info" v-hasPerm="'announce:publish'" @click="submitForm(0)">保存草稿</el-button>
        <el-button type="primary" v-hasPerm="'announce:publish'" @click="submitForm(1)">立即发布</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import {
  getAnnouncePage, saveAnnounce, publishAnnounce, withdrawAnnounce, deleteAnnounce
} from '@/api/announce'

const query = reactive({ page: 1, size: 10, keyword: '', status: null, type: null })
const loading = ref(false)
const total = ref(0)
const tableData = ref([])

const drawerVisible = ref(false)
const formRef = ref(null)
const form = reactive({ id: null, title: '', content: '', type: 1, action: 0 })
const prioritySwitch = ref(false)
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : ''

async function fetchList() {
  loading.value = true
  try {
    const res = await getAnnouncePage(query)
    total.value = res.total || 0
    tableData.value = res.records || []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}

function handleReset() {
  Object.assign(query, { page: 1, size: 10, keyword: '', status: null, type: null })
  fetchList()
}

function openEdit(row) {
  if (row) {
    form.id = row.id
    form.title = row.title
    form.content = row.content
    form.type = row.type || 1
    prioritySwitch.value = row.priority === 1
  } else {
    form.id = null
    form.title = ''
    form.content = ''
    form.type = 1
    prioritySwitch.value = false
  }
  drawerVisible.value = true
}

async function submitForm(action) {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const payload = {
    id: form.id || undefined,
    title: form.title,
    content: form.content,
    type: form.type,
    priority: prioritySwitch.value ? 1 : 0,
    action
  }
  await saveAnnounce(payload)
  ElMessage.success(action === 1 ? '发布成功' : '已保存为草稿')
  drawerVisible.value = false
  fetchList()
}

async function handlePublish(id) {
  await ElMessageBox.confirm('确认发布此公告？', '提示', { type: 'warning' })
  await publishAnnounce(id)
  ElMessage.success('发布成功')
  fetchList()
}

async function handleWithdraw(id) {
  await ElMessageBox.confirm('确认撤回此公告？小程序端用户将不再可见。', '提示', { type: 'warning' })
  await withdrawAnnounce(id)
  ElMessage.success('已撤回')
  fetchList()
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除此公告？（不可恢复）', '危险操作', { type: 'error' })
  await deleteAnnounce(id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.search-bar { margin-bottom: 12px; }
.table-card .pager { margin-top: 16px; text-align: right; }
.form-box { padding: 8px; }
</style>
