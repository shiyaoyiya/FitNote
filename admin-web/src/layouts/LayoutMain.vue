<template>
  <el-container class="layout-container glass-layout">
    <el-aside width="220px" class="layout-aside glass-sidebar">
      <div class="sidebar-logo">
        FitNote Admin
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="transparent"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        unique-opened
      >
        <MenuTree :list="menuTree" />
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header glass-header">
        <el-breadcrumb separator="/" class="glass-breadcrumb">
          <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>

        <div class="user-dropdown-wrapper" ref="dropdownWrapperRef">
          <span class="user-info" @click="dropdownVisible = !dropdownVisible">
            <el-avatar :size="32" class="user-avatar">
              {{ (userStore.admin?.nickname || 'A').charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="user-name">{{ userStore.admin?.nickname || userStore.admin?.username }}</span>
            <el-tag size="small" :type="userStore.admin?.role === 'ADMIN' ? 'danger' : 'warning'" class="glass-tag">
              {{ userStore.admin?.role === 'ADMIN' ? '超级管理员' : '审核员' }}
            </el-tag>
            <span class="arrow-btn" :class="{ 'arrow-open': dropdownVisible }">
              <el-icon><CaretBottom /></el-icon>
            </span>
          </span>
          <transition name="dropdown-fade">
            <div v-if="dropdownVisible" class="custom-dropdown-panel">
              <div class="dropdown-section-label">
                <el-icon><Switch /></el-icon>
                <span>快捷切换账号</span>
              </div>
              <div
                v-for="acc in quickAccounts"
                :key="acc.username"
                class="custom-dropdown-item account-item"
                :class="{ 'account-active': userStore.admin?.username === acc.username }"
                @click="handleSwitchAccount(acc)"
              >
                <el-avatar :size="28" class="account-avatar" :style="{ background: acc.color }">
                  {{ acc.label.charAt(0) }}
                </el-avatar>
                <div class="account-detail">
                  <span class="account-name">{{ acc.label }}</span>
                  <span class="account-desc">{{ acc.desc }}</span>
                </div>
                <el-icon v-if="userStore.admin?.username === acc.username" class="account-check"><Check /></el-icon>
              </div>
              <!-- 添加账号 -->
                  <div class="custom-dropdown-item add-account-item" @click="openAddDialog">
                <el-icon><Plus /></el-icon>
                <span>添加账号</span>
              </div>
              <div class="dropdown-divider"></div>
              <div class="custom-dropdown-item" @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                <span>退出登录</span>
              </div>
            </div>
          </transition>
        </div>

    <!-- 添加账号弹窗 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加账号"
      width="380px"
      class="add-account-dialog"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="72px" size="default">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="addForm.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="addForm.password" type="password" show-password placeholder="请输入密码" :prefix-icon="Lock" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="handleAddAccount">登录并切换</el-button>
      </template>
    </el-dialog>
    </el-header>

      <el-main class="layout-main glass-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { CaretBottom, SwitchButton, Switch, Check, Plus, User, Lock } from '@element-plus/icons-vue'
import MenuTree from './components/MenuTree.vue'

const userStore = useUserStore()
const router = useRouter()

const dropdownVisible = ref(false)
const dropdownWrapperRef = ref(null)
const switching = ref(false)

const addDialogVisible = ref(false)
const adding = ref(false)
const addFormRef = ref(null)
const addForm = reactive({ username: '', password: '' })
const addRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function openAddDialog() {
  dropdownVisible.value = false
  addForm.username = ''
  addForm.password = ''
  addDialogVisible.value = true
}

async function handleAddAccount() {
  const ok = await addFormRef.value?.validate().catch(() => false)
  if (!ok) return
  adding.value = true
  try {
    await userStore.switchAccount({ username: addForm.username, password: addForm.password })
    persistAccount(
      addForm.username,
      addForm.password,
      userStore.admin?.nickname || addForm.username,
      userStore.admin?.role
    )
    ElMessage.success(`已切换至 ${userStore.admin?.nickname || addForm.username}`)
    addDialogVisible.value = false
  } catch (e) {
    ElMessage.error(e?.message || '登录失败，请检查账号密码')
  } finally {
    adding.value = false
  }
}

const SAVED_ACCOUNTS_KEY = 'fitnote_saved_accounts'

const avatarColors = [
  'linear-gradient(135deg, #f56c6c, #e64242)',
  'linear-gradient(135deg, #e6a23c, #cf8a1e)',
  'linear-gradient(135deg, #67c23a, #4fa01e)',
  'linear-gradient(135deg, #5b9dff, #4678dc)',
  'linear-gradient(135deg, #a966e6, #7d3eb8)',
  'linear-gradient(135deg, #2db8a6, #1a8a7a)'
]

const DEFAULT_ACCOUNTS = [
  { username: 'admin', password: 'admin123', nickname: '超级管理员' },
  { username: 'auditor', password: 'auditor123', nickname: '审核员' }
]

function roleLabel(role) {
  if (role === 'ADMIN') return '超级管理员'
  if (role === 'AUDITOR') return '审核员'
  return role || '用户'
}

function buildAccountDisplay(acc) {
  const colorIdx = (acc._colorIdx ?? 0) % avatarColors.length
  return {
    username: acc.username,
    password: acc.password,
    label: acc.nickname || acc.username,
    desc: `${acc.username} · ${roleLabel(acc.role)}`,
    color: avatarColors[colorIdx]
  }
}

function loadQuickAccounts() {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.length > 0) {
        quickAccounts.value = parsed.map((a, i) => buildAccountDisplay({ ...a, _colorIdx: i }))
        return
      }
    }
  } catch {}
  quickAccounts.value = DEFAULT_ACCOUNTS.map((a, i) => buildAccountDisplay({ ...a, _colorIdx: i }))
}

function persistAccount(username, password, nickname, role) {
  let list = []
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {}
  list = list.filter(a => a.username !== username)
  list.unshift({ username, password, nickname, role })
  if (list.length > 10) list.length = 10
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list))
  quickAccounts.value = list.map((a, i) => buildAccountDisplay({ ...a, _colorIdx: i }))
}

const quickAccounts = ref([])

function handleClickOutside(e) {
  if (dropdownWrapperRef.value && !dropdownWrapperRef.value.contains(e.target)) {
    dropdownVisible.value = false
  }
}

onMounted(() => {
  loadQuickAccounts()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

async function handleSwitchAccount(acc) {
  if (switching.value) return
  if (userStore.admin?.username === acc.username) {
    dropdownVisible.value = false
    return
  }
  switching.value = true
  try {
    await userStore.switchAccount(acc)
    persistAccount(acc.username, acc.password, userStore.admin?.nickname || acc.label, userStore.admin?.role)
    ElMessage.success(`已切换至 ${acc.label}`)
    dropdownVisible.value = false
  } catch (e) {
    ElMessage.error(e?.message || '切换账号失败')
  } finally {
    switching.value = false
  }
}

function handleLogout() {
  dropdownVisible.value = false
  ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
    .then(() => userStore.logout())
    .catch(() => {})
}

// 把 menus 扁平列表组装成树
const menuTree = computed(() => {
  const list = (userStore.menus || []).filter(m => m.type !== 3) // 排除按钮级
  const map = Object.fromEntries(list.map(m => [m.id, { ...m, children: [] }]))
  const tree = []
  list.forEach(m => {
    if (m.visible === 0) return
    if (m.parent_id === 0) tree.push(map[m.id])
    else if (map[m.parent_id]) map[m.parent_id].children.push(map[m.id])
  })
  return tree
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  overflow: hidden auto;
}

.sidebar-logo {
  color: #fff;
  font-size: 18px;
  line-height: 60px;
  text-align: center;
  font-weight: bold;
  letter-spacing: 1px;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-avatar {
  background: linear-gradient(135deg, #5b9dff, #4678dc);
}

.user-name {
  color: var(--glass-text);
}

/* ===== 白色箭头按钮 ===== */
.arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
  flex-shrink: 0;
}

.arrow-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.arrow-btn.arrow-open {
  transform: rotate(180deg);
  color: #fff;
  background: rgba(91, 157, 255, 0.2);
}

.arrow-btn .el-icon {
  font-size: 14px;
}

.layout-main {
  /* 背景由全局玻璃样式控制 */
}

/* ===== 自定义下拉面板 ===== */
.user-dropdown-wrapper {
  position: relative;
}

.custom-dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  padding: 6px;
  background: rgba(14, 18, 32, 0.96);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 2000;
}

.dropdown-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px 4px;
  font-size: 12px;
  color: var(--glass-text-muted);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.dropdown-section-label .el-icon {
  font-size: 13px;
}

.custom-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 14px;
  color: var(--glass-text-secondary);
  border-radius: var(--glass-radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}

.custom-dropdown-item:hover {
  background: rgba(91, 157, 255, 0.12);
  color: #fff;
}

/* ===== 账号切换项 ===== */
.account-item {
  padding: 8px 12px;
}

.account-avatar {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.account-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--glass-text);
  line-height: 1.2;
}

.account-desc {
  font-size: 11px;
  color: var(--glass-text-muted);
  line-height: 1.2;
}

.account-active {
  background: rgba(91, 157, 255, 0.08);
}

.account-active .account-name {
  color: #5b9dff;
}

.account-check {
  color: #5b9dff;
  font-size: 16px;
  flex-shrink: 0;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 8px;
}

/* ===== 添加账号项 ===== */
.add-account-item {
  justify-content: flex-start;
  color: var(--glass-text-muted);
}

.add-account-item:hover {
  color: #5b9dff;
}

.add-account-item .el-icon {
  font-size: 15px;
}

/* ===== 添加账号弹窗 ===== */
:deep(.add-account-dialog) {
  border-radius: 14px;
}

:deep(.add-account-dialog .el-dialog__header) {
  padding: 18px 24px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 0;
}

:deep(.add-account-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
  color: var(--glass-text);
}

:deep(.add-account-dialog .el-dialog__body) {
  padding: 20px 24px 8px;
}

:deep(.add-account-dialog .el-dialog__footer) {
  padding: 8px 24px 20px;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
