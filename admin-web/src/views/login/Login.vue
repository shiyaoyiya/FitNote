<template>
  <div style="height:100vh; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); display:flex; align-items:center; justify-content:center;">
    <el-card style="width:420px; box-shadow:0 12px 32px rgba(0,0,0,.2); border-radius:12px;">
      <h2 style="text-align:center; margin-bottom:28px; color:#303133;">FitNote 管理后台</h2>
      <el-form :model="form" :rules="rules" ref="fRef" label-width="80px" size="large">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="admin / auditor" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input show-password v-model="form.password" placeholder="admin123 / auditor123" :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%" :loading="loading" @click="submit">登 录</el-button>
        </el-form-item>
      </el-form>
      <el-divider content-position="left">默认测试账号</el-divider>
      <ul style="font-size:12px; color:#606266; line-height:1.8; padding-left:18px;">
        <li>超级管理员：<b>admin / admin123</b>（全部菜单）</li>
        <li>审核员：<b>auditor / auditor123</b>（仅模板审核 + 反馈）</li>
      </ul>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const form = reactive({ username: 'admin', password: 'admin123' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const fRef = ref(null)
const loading = ref(false)

async function submit() {
  const ok = await fRef.value.validate().catch(() => false)
  if (!ok) return
  loading.value = true
  try {
    await userStore.login(form)
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
