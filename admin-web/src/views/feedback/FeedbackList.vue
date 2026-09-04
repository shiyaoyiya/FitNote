<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="$route.meta.title || '反馈列表'" />
    <el-divider />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="标题模糊" clearable style="width:200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width:120px">
            <el-option label="待处理" :value="0" />
            <el-option label="处理中" :value="1" />
            <el-option label="已解决" :value="2" />
            <el-option label="已拒绝" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.category" clearable placeholder="全部" style="width:120px">
            <el-option label="产品建议" :value="1" />
            <el-option label="Bug 反馈" :value="2" />
            <el-option label="数据问题" :value="3" />
            <el-option label="其他" :value="4" />
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
      <el-table v-loading="loading" :data="tableData" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
              <el-avatar :size="28" :src="row.userAvatar">{{ (row.userName || 'U').charAt(0) }}</el-avatar>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.userName || '用户#' + row.userId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="110">
          <template #default="{ row }">{{ row.categoryText || '—' }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning">待处理</el-tag>
            <el-tag v-else-if="row.status === 1" type="primary">处理中</el-tag>
            <el-tag v-else-if="row.status === 2" type="success">已解决</el-tag>
            <el-tag v-else type="danger">已拒绝</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="handlerAdminName" label="处理人" width="110" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" type="primary" v-hasPerm="'feedback:list'" @click="openDetail(row.id)">查看/处理</el-button>
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

    <!-- 详情抽屉 + 右侧处理面板 -->
    <el-drawer v-model="drawerVisible" title="反馈详情" size="55%">
      <div v-loading="detailLoading" class="detail-box">
        <template v-if="detail">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="反馈编号">#{{ detail.id }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ detail.categoryText }}</el-descriptions-item>
            <el-descriptions-item label="用户">
              <div style="display:flex;align-items:center;gap:6px">
                <el-avatar :size="24" :src="detail.userAvatar">{{ (detail.userName || 'U').charAt(0) }}</el-avatar>
                <span>{{ detail.userName || '用户#' + detail.userId }}</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag v-if="detail.status === 0" type="warning">待处理</el-tag>
              <el-tag v-else-if="detail.status === 1" type="primary">处理中</el-tag>
              <el-tag v-else-if="detail.status === 2" type="success">已解决</el-tag>
              <el-tag v-else type="danger">已拒绝</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">{{ formatTime(detail.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="标题" :span="2">{{ detail.title }}</el-descriptions-item>
            <el-descriptions-item label="内容" :span="2">
              <div class="content-box">{{ detail.content }}</div>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.screenshotUrls" label="截图" :span="2">
              <el-image
                v-for="(u, i) in splitUrls(detail.screenshotUrls)"
                :key="i"
                :src="u"
                :preview-src-list="splitUrls(detail.screenshotUrls)"
                :initial-index="i"
                fit="cover"
                style="width:80px;height:80px;margin-right:8px;border:1px solid #eee;border-radius:4px"
              />
            </el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">处理信息</el-divider>

          <el-descriptions :column="2" border size="small" v-if="detail.status !== 0">
            <el-descriptions-item label="处理人">{{ detail.handlerAdminName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="处理时间">{{ formatTime(detail.handleTime) }}</el-descriptions-item>
            <el-descriptions-item label="处理回复" :span="2">
              <div class="content-box">{{ detail.handleReply }}</div>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 处理面板 -->
          <div v-if="canHandle" class="handle-panel">
            <el-divider content-position="left">处理操作</el-divider>
            <el-form :model="handleForm" :rules="handleRules" ref="handleFormRef" label-width="90px">
              <el-form-item label="处理状态" prop="toStatus">
                <el-radio-group v-model="handleForm.toStatus">
                  <el-radio v-if="detail.status === 0" :value="1">标记为处理中</el-radio>
                  <el-radio :value="2">标记为已解决</el-radio>
                  <el-radio :value="3">标记为已拒绝</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="处理回复" prop="reply">
                <el-input
                  v-model="handleForm.reply"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入回复（用户可在小程序端查看）"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" v-hasPerm="'feedback:handle'" @click="submitHandle">提交处理</el-button>
              </el-form-item>
            </el-form>
          </div>
          <el-alert v-else type="info" :closable="false" title="该反馈已完成处理，不可再变更。" />
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getFeedbackPage, getFeedbackDetail, handleFeedback } from '@/api/feedback'

const query = reactive({ page: 1, size: 10, keyword: '', status: null, category: null, userId: null })
const loading = ref(false)
const total = ref(0)
const tableData = ref([])

const drawerVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

const handleFormRef = ref(null)
const handleForm = reactive({ toStatus: 2, reply: '' })
const handleRules = {
  toStatus: [{ required: true, message: '请选择处理状态', trigger: 'change' }],
  reply: [{ required: true, min: 5, message: '回复不少于5字', trigger: 'blur' }]
}

const canHandle = computed(() => {
  if (!detail.value) return false
  return detail.value.status === 0 || detail.value.status === 1
})

const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : ''
const splitUrls = (s) => !s ? [] : s.split(/[,\s]+/).filter(x => x.length)

async function fetchList() {
  loading.value = true
  try {
    const res = await getFeedbackPage(query)
    total.value = res.total || 0
    tableData.value = res.records || []
  } finally {
    loading.value = false
  }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() {
  Object.assign(query, { page: 1, size: 10, keyword: '', status: null, category: null, userId: null })
  fetchList()
}

async function openDetail(id) {
  drawerVisible.value = true
  detailLoading.value = true
  detail.value = null
  handleForm.toStatus = 2
  handleForm.reply = ''
  try {
    detail.value = await getFeedbackDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function submitHandle() {
  try {
    await handleFormRef.value.validate()
  } catch {
    return
  }
  await handleFeedback(detail.value.id, {
    toStatus: handleForm.toStatus,
    reply: handleForm.reply
  })
  ElMessage.success('处理成功')
  drawerVisible.value = false
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.search-bar { margin-bottom: 12px; }
.table-card .pager { margin-top: 16px; text-align: right; }
.detail-box { padding: 4px; }
.content-box { white-space: pre-wrap; line-height: 1.6; max-height: 240px; overflow: auto; }
.handle-panel { margin-top: 8px; }
</style>
