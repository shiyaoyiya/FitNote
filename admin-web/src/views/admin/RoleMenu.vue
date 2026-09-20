<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="$route.meta.title || '账号菜单配置'" class="glass-page-header" />
    <el-divider class="glass-divider" />

    <el-card shadow="never" class="form-card glass-card">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            选择账号：
            <el-select v-model="adminId" style="width:280px" class="glass-select" placeholder="请选择管理员账号" @change="loadAdminMenuIds">
              <el-option
                v-for="item in adminOptions"
                :key="item.id"
                :label="`${item.username}（${item.nickname}）`"
                :value="item.id"
              />
            </el-select>
            <el-tag v-if="selectedAdmin" type="info" style="margin-left:10px" class="glass-tag">
              {{ selectedAdmin.roleText }}
            </el-tag>
          </div>
          <div>
            <el-button :icon="Refresh" class="glass-btn" @click="reloadAll">重新加载</el-button>
            <el-button type="primary" v-hasPerm="'admin:rolemenu'" :loading="saving" :disabled="!adminId" @click="submitSave" class="glass-btn-primary">
              保存配置
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="adminId" style="margin-bottom:12px">
        <el-alert
          type="warning"
          :closable="false"
          :title="`当前配置「${selectedAdmin?.username}」的菜单权限，保存后该账号需重新登录以刷新权限。`"
        />
      </div>
      <div v-else style="margin-bottom:12px">
        <el-alert
          type="info"
          :closable="false"
          title="请先在上方选择一个管理员账号，超级管理员不在列表中（默认拥有全部权限）。"
        />
      </div>

      <div class="tree-wrap">
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          show-checkbox
          default-expand-all
          :props="{ label: 'title', children: 'children' }"
          :render-content="renderTreeNode"
        />
      </div>

      <div class="stat-row">
        <el-tag class="glass-tag">已选：{{ checkedIds.length }} 项</el-tag>
        <el-tag type="info" class="glass-tag">叶节点/按钮：统计</el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getAdminList, getMenuTree, getAdminMenuIds, saveAdminMenu } from '@/api/admin'

const adminId = ref(null)
const adminOptions = ref([])
const treeRef = ref(null)
const treeData = ref([])
const loadingIds = ref(false)
const saving = ref(false)

const selectedAdmin = computed(() => adminOptions.value.find(a => a.id === adminId.value))
const checkedIds = computed(() => {
  const all = treeRef.value ? treeRef.value.getCheckedNodes(false, false).map(n => n.id) : []
  const half = treeRef.value ? treeRef.value.getHalfCheckedNodes().map(n => n.id) : []
  return [...all, ...half]
})

function renderTreeNode(h2, { node, data }) {
  const tags = []
  if (data.type === 1) {
    tags.push(h('el-tag', { size: 'small', type: 'info', effect: 'plain', style: 'margin-right:6px' }, () => '目录'))
  } else if (data.type === 2) {
    tags.push(h('el-tag', { size: 'small', type: '', effect: 'plain', style: 'margin-right:6px' }, () => '页面'))
  } else if (data.type === 3) {
    tags.push(h('el-tag', { size: 'small', type: 'success', effect: 'plain', style: 'margin-right:6px' }, () => '按钮'))
  }
  const permTag = data.perms
    ? h('span', { style: 'color:var(--glass-text-muted);font-size:12px;margin-left:6px' }, `[${data.perms}]`)
    : null
  const icon = data.icon
    ? h('el-icon', { style: 'margin-right:4px;color:#409eff' }, () => h('component', { is: data.icon }))
    : null
  return h('span', { style: 'display:inline-flex;align-items:center' }, [
    icon,
    ...tags,
    h('span', node.label),
    permTag
  ])
}

async function loadAdminOptions() {
  const res = await getAdminList({ page: 1, size: 100, roleCode: 'AUDITOR', status: 1 })
  adminOptions.value = res.records || []
}

async function loadMenuTree() {
  treeData.value = await getMenuTree() || []
}

async function loadAdminMenuIds() {
  if (!adminId.value) return
  loadingIds.value = true
  try {
    const ids = (await getAdminMenuIds(adminId.value)) || []
    await nextTick()
    if (treeRef.value) {
      treeRef.value.setCheckedKeys([])
      ids.map(Number).forEach(id => {
        treeRef.value.setChecked(id, true, false)
      })
    }
  } finally {
    loadingIds.value = false
  }
}

async function reloadAll() {
  await loadAdminOptions()
  await loadMenuTree()
  if (adminId.value) await loadAdminMenuIds()
}

async function submitSave() {
  const nodes = treeRef.value.getCheckedNodes(false, false)
  const half = treeRef.value.getHalfCheckedNodes()
  const menuIds = [...nodes, ...half].map(n => Number(n.id)).filter(Boolean)

  const admin = selectedAdmin.value
  const warn = `确认保存账号「${admin?.username}（${admin?.nickname}）」的菜单绑定（共 ${menuIds.length} 项）？`
  await ElMessageBox.confirm(warn, '提示', { type: 'warning' })
  saving.value = true
  try {
    await saveAdminMenu({ adminId: adminId.value, menuIds })
    ElMessage.success('已保存（目标账号需重新登录刷新权限）')
    await loadAdminMenuIds()
  } finally {
    saving.value = false
  }
}

onMounted(reloadAll)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.tree-wrap {
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  padding: 16px;
  max-height: 62vh;
  overflow: auto;
  background: var(--glass-bg-light);
}
.stat-row { margin-top: 14px; display: flex; gap: 10px; }
</style>
