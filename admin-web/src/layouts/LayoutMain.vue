<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" style="background:#304156; overflow:hidden auto;">
      <div style="color:#fff; font-size:18px; line-height:60px; text-align:center; font-weight:bold; letter-spacing:1px; border-bottom:1px solid #1f2d3d;">
        FitNote Admin
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        unique-opened
      >
        <MenuTree :list="menuTree" />
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; background:#fff;">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>

        <el-dropdown @command="onCommand">
          <span style="cursor:pointer; display:flex; align-items:center; gap:6px;">
            <el-avatar :size="32" style="background:#409EFF;">
              {{ (userStore.admin?.nickname || 'A').charAt(0).toUpperCase() }}
            </el-avatar>
            <span>{{ userStore.admin?.nickname || userStore.admin?.username }}</span>
            <el-tag size="small" :type="userStore.admin?.role === 'ADMIN' ? 'danger' : 'warning'">
              {{ userStore.admin?.role === 'ADMIN' ? '超级管理员' : '审核员' }}
            </el-tag>
            <el-icon><CaretBottom /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main style="background:#f0f2f5;">
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
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MenuTree from './components/MenuTree.vue'

const userStore = useUserStore()
const router = useRouter()

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

function onCommand(cmd) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
      .then(() => userStore.logout())
      .catch(() => {})
  } else if (cmd === 'profile') {
    ElMessage.info('个人信息页后续迭代开发')
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
