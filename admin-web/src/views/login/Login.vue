<template>
  <div class="login-container">
    <!-- 登录页专属背景层 -->
    <div class="login-bg"></div>
    <div class="login-bg-overlay"></div>

    <div class="login-card glass-card">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon :size="36"><User /></el-icon>
        </div>
        <h2 class="login-title">FitNote 管理后台</h2>
        <p class="login-subtitle">健身笔记 · 云端管理系统</p>
      </div>

      <el-form :model="form" :rules="rules" ref="fRef" label-width="80px" size="large" class="login-form">
        <el-form-item label="用户名" prop="username">
          <el-autocomplete
            v-model="form.username"
            :fetch-suggestions="queryAccounts"
            :prefix-icon="User"
            placeholder="admin / auditor"
            class="login-autocomplete"
            value-key="username"
            :trigger-on-focus="true"
            clearable
            popper-class="login-account-popper"
            @select="handleAccountSelect"
          >
            <template #default="{ item }">
              <div class="account-suggestion">
                <el-icon :size="16"><UserFilled /></el-icon>
                <span class="suggestion-name">{{ item.nickname || item.username }}</span>
                <span class="suggestion-account">{{ item.username }}</span>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input show-password v-model="form.password" placeholder="admin123 / auditor123" :prefix-icon="Lock" class="glass-input" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%" :loading="loading" @click="submit" class="glass-btn-primary login-btn">
            <span>登 录</span>
          </el-button>
        </el-form-item>
      </el-form>

      <el-divider class="glass-divider tips-divider">
        <span>默认测试账号</span>
      </el-divider>

      <ul class="account-tips">
        <li>
          <span class="tip-role">超级管理员</span>
          <span class="tip-account">admin / admin123</span>
          <el-tag size="small" class="glass-tag" type="danger">全部菜单</el-tag>
        </li>
        <li>
          <span class="tip-role">审核员</span>
          <span class="tip-account">auditor / auditor123</span>
          <el-tag size="small" class="glass-tag" type="warning">模板审核 + 反馈</el-tag>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled } from '@element-plus/icons-vue'

const SAVED_ACCOUNTS_KEY = 'fitnote_saved_accounts'

const DEFAULT_ACCOUNTS = [
  { username: 'admin', password: 'admin123', nickname: '超级管理员' },
  { username: 'auditor', password: 'auditor123', nickname: '审核员' }
]

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const fRef = ref(null)
const loading = ref(false)
const savedAccounts = ref([])

function loadSavedAccounts() {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      savedAccounts.value = parsed.length > 0 ? parsed : [...DEFAULT_ACCOUNTS]
    } else {
      savedAccounts.value = [...DEFAULT_ACCOUNTS]
    }
  } catch {
    savedAccounts.value = [...DEFAULT_ACCOUNTS]
  }
}

function saveAccount(username, password, nickname, role) {
  const list = savedAccounts.value.filter(a => a.username !== username)
  list.unshift({ username, password, nickname, role })
  if (list.length > 10) list.length = 10
  savedAccounts.value = list
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list))
}

function queryAccounts(queryString, cb) {
  const results = queryString
    ? savedAccounts.value.filter(a =>
        a.username.toLowerCase().includes(queryString.toLowerCase()) ||
        (a.nickname && a.nickname.toLowerCase().includes(queryString.toLowerCase()))
      )
    : savedAccounts.value
  cb(results)
}

function handleAccountSelect(item) {
  form.username = item.username
  form.password = item.password || ''
}

onMounted(() => {
  loadSavedAccounts()
})

async function submit() {
  const ok = await fRef.value.validate().catch(() => false)
  if (!ok) return
  loading.value = true
  try {
    const res = await userStore.login(form)
    saveAccount(form.username, form.password, res?.admin?.nickname || form.username, res?.admin?.role)
    ElMessage.success(`欢迎回来，${userStore.admin?.nickname || form.username}`)
    const redirect = route.query.redirect
    if (redirect && typeof redirect === 'string') {
      router.replace(redirect)
    }
  } catch (e) {
    ElMessage.error(e?.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

/* 登录页专属背景层 */
.login-bg {
  position: fixed;
  inset: -20px;
  background: url('/login.jpg') center center / cover no-repeat;
  filter: blur(8px) saturate(130%);
  z-index: 0;
  pointer-events: none;
}

.login-bg-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(10, 14, 25, 0.55) 0%,
    rgba(10, 14, 25, 0.35) 50%,
    rgba(10, 14, 25, 0.7) 100%);
  z-index: 0;
  pointer-events: none;
}

.login-card {
  position: absolute;
  left: 55vw;
  top: 50%;
  transform: translateY(-50%);
  width: 380px;
  max-width: calc(100vw - 65vw);
  padding: 36px 32px 28px;
  box-sizing: border-box;
  animation: login-card-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2;
}

@keyframes login-card-in {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 18px;
  background: linear-gradient(135deg,
    rgba(64, 158, 255, 0.9) 0%,
    rgba(54, 119, 231, 0.9) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow:
    0 8px 24px rgba(64, 158, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--glass-text);
  margin: 0 0 6px 0;
  letter-spacing: 0.5px;
}

.login-subtitle {
  font-size: 13px;
  color: var(--glass-text-muted);
  margin: 0;
}

.login-form {
  margin-bottom: 8px;
}

.login-autocomplete {
  width: 100%;
}

.account-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.suggestion-name {
  font-weight: 600;
  color: var(--glass-text);
}

.suggestion-account {
  font-size: 12px;
  color: var(--glass-text-muted);
  font-family: 'SF Mono', 'Consolas', monospace;
}

.login-btn {
  height: 46px;
  font-size: 16px;
  letter-spacing: 4px;
}

.tips-divider {
  margin: 16px 0 12px;
}

.tips-divider .el-divider__text {
  font-size: 12px;
  font-weight: 500;
}

.account-tips {
  list-style: none;
  padding: 0;
  margin: 0;
}

.account-tips li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: var(--glass-text-secondary);
  transition: background 0.15s, border-color 0.15s;
}

.account-tips li:hover {
  background: rgba(91, 157, 255, 0.1);
  border-color: rgba(91, 157, 255, 0.2);
}

.tip-role {
  font-weight: 600;
  color: var(--glass-text);
  min-width: 72px;
}

.tip-account {
  flex: 1;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 11px;
  color: var(--glass-text-muted);
}

/* 小屏幕适配 */
@media (max-width: 768px) {
  .login-card {
    left: 50%;
    top: 50%;
    width: 92vw;
    max-width: 92vw;
    transform: translate(-50%, -50%);
    animation: login-card-in-mobile 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes login-card-in-mobile {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
}
</style>
