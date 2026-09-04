<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="$route.meta.title || '管理员列表'" />
    <el-divider />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-bar">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="用户名/昵称模糊" clearable style="width:220px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.roleCode" clearable placeholder="全部" style="width:140px">
            <el-option label="超级管理员" value="ADMIN" />
            <el-option label="审核员" value="AUDITOR" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width:110px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Plus" v-hasPerm="'admin:edit'" @click="openSave()">新增管理员</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="160" />
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column label="角色" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.roleCode === 'ADMIN'" type="danger">{{ row.roleText || '超级管理员' }}</el-tag>
            <el-tag v-else type="warning">{{ row.roleText || '审核员' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">停用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近登录" width="160">
          <template #default="{ row }">{{ row.lastLoginTime ? formatTime(row.lastLoginTime) : '从未' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" type="primary" v-hasPerm="'admin:edit'" @click="openSave(row)">编辑</el-button>
            <el-button link size="small" type="warning" v-hasPerm="'admin:edit'" @click="openResetPwd(row)">重置密码</el-button>
            <el-button
              v-if="row.username !== 'admin'"
              link size="small"
              v-hasPerm="'admin:edit'"
              @click="handleToggleStatus(row)"
            >{{ row.status === 1 ? '停用' : '启用' }}</el-button>
            <el-button
              v-if="row.username !== 'admin'"
              link size="small" type="danger"
              v-hasPerm="'admin:edit'"
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

    <!-- 新增/编辑 Dialog -->
    <el-dialog v-model="saveVisible" :title="saveForm.id ? '编辑管理员' : '新增管理员'" width="520px" @closed="handleSaveClosed">
      <el-form :model="saveForm" :rules="saveRules" ref="saveFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="saveForm.username" :disabled="!!saveForm.id" placeholder="登录账号（新增时不可改）" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="saveForm.password" show-password :placeholder="saveForm.id ? '留空表示不修改' : '6-32 位'" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="saveForm.nickname" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="角色" prop="roleCode">
          <el-select v-model="saveForm.roleCode" style="width:200px">
            <el-option label="超级管理员（所有权限）" value="ADMIN" />
            <el-option label="审核员（仅审核+反馈）" value="AUDITOR" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="saveForm.id && saveForm.username !== 'admin'">
          <el-switch v-model="statusSwitch" />
          <span style="margin-left:8px;color:#909399">{{ statusSwitch ? '启用' : '停用' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSave">确认保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 Dialog -->
    <el-dialog v-model="pwdVisible" title="重置密码" width="460px">
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="100px">
        <el-form-item label="用户">
          <el-tag>{{ pwdRow?.username }} - {{ pwdRow?.nickname }}</el-tag>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" show-password maxlength="32" placeholder="6~32 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPwd">
          <el-input v-model="pwdForm.confirmPwd" show-password maxlength="32" placeholder="请再次输入" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResetPwd">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import {
  getAdminList, saveAdmin, resetAdminPwd, setAdminStatus, deleteAdmin
} from '@/api/admin'

const query = reactive({ page: 1, size: 10, keyword: '', roleCode: '', status: null })
const loading = ref(false)
const total = ref(0)
const tableData = ref([])

const saveVisible = ref(false)
const saveFormRef = ref(null)
const saveForm = reactive({ id: null, username: '', password: '', nickname: '', roleCode: 'AUDITOR' })
const statusSwitch = ref(true)
const saveRules = {
  username: [{ required: true, message: '用户名必填', trigger: 'blur' }],
  nickname: [{ required: true, message: '昵称必填', trigger: 'blur' }],
  roleCode: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [
    { validator: (r, v, cb) => {
      if (saveForm.id) cb()  // 编辑时可空
      else if (!v || v.length < 6) cb(new Error('新密码不少于6位'))
      else cb()
    }, trigger: 'blur' }
  ]
}

const pwdVisible = ref(false)
const pwdRow = ref(null)
const pwdFormRef = ref(null)
const pwdForm = reactive({ newPassword: '', confirmPwd: '' })
const samePwd = (r, v, cb) => {
  if (v !== pwdForm.newPassword) cb(new Error('两次输入不一致'))
  else cb()
}
const pwdRules = {
  newPassword: [{ required: true, min: 6, max: 32, message: '6~32 位', trigger: 'blur' }],
  confirmPwd: [{ required: true, validator: samePwd, trigger: 'blur' }]
}

const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : ''

async function fetchList() {
  loading.value = true
  try {
    const res = await getAdminList(query)
    total.value = res.total || 0
    tableData.value = res.records || []
  } finally {
    loading.value = false
  }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() {
  Object.assign(query, { page: 1, size: 10, keyword: '', roleCode: '', status: null })
  fetchList()
}

function openSave(row) {
  if (row) {
    saveForm.id = row.id
    saveForm.username = row.username
    saveForm.password = ''
    saveForm.nickname = row.nickname
    saveForm.roleCode = row.roleCode
    statusSwitch.value = row.status === 1
  } else {
    saveForm.id = null
    saveForm.username = ''
    saveForm.password = ''
    saveForm.nickname = ''
    saveForm.roleCode = 'AUDITOR'
    statusSwitch.value = true
  }
  saveVisible.value = true
}

function handleSaveClosed() {
  saveForm.id = null
  saveForm.username = ''
  saveForm.password = ''
}

async function submitSave() {
  try {
    await saveFormRef.value.validate()
  } catch {
    return
  }
  const payload = {
    id: saveForm.id || undefined,
    username: saveForm.username,
    password: saveForm.id ? (saveForm.password || undefined) : saveForm.password,
    nickname: saveForm.nickname,
    roleCode: saveForm.roleCode,
    status: saveForm.id ? (statusSwitch.value ? 1 : 0) : 1
  }
  await saveAdmin(payload)
  ElMessage.success(saveForm.id ? '已更新' : '新增成功')
  saveVisible.value = false
  fetchList()
}

function openResetPwd(row) {
  pwdRow.value = row
  pwdForm.newPassword = ''
  pwdForm.confirmPwd = ''
  pwdVisible.value = true
}

async function submitResetPwd() {
  try {
    await pwdFormRef.value.validate()
  } catch {
    return
  }
  await resetAdminPwd(pwdRow.value.id, pwdForm.newPassword)
  ElMessage.success('密码重置成功')
  pwdVisible.value = false
}

async function handleToggleStatus(row) {
  const target = row.status === 1 ? 0 : 1
  await setAdminStatus(row.id, target)
  row.status = target
  ElMessage.success(target === 1 ? '已启用' : '已停用')
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除管理员「${row.username}」？不可恢复。`, '危险操作', { type: 'error' })
  await deleteAdmin(row.id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.search-bar { margin-bottom: 12px; }
.table-card .pager { margin-top: 16px; text-align: right; }
</style>
