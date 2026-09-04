<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="$route.meta.title || '角色-菜单配置'" />
    <el-divider />

    <el-card shadow="never" class="form-card">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            当前角色：
            <el-select v-model="roleCode" style="width:240px" @change="loadRoleMenuIds">
              <el-option label="超级管理员 ADMIN" value="ADMIN" />
              <el-option label="审核员 AUDITOR" value="AUDITOR" />
            </el-select>
            <el-tag v-if="roleCode === 'ADMIN'" type="danger" style="margin-left:10px">
              注意：移除菜单项会影响超级管理员
            </el-tag>
          </div>
          <div>
            <el-button :icon="Refresh" @click="reloadAll">重新加载</el-button>
            <el-button type="primary" v-hasPerm="'admin:rolemenu'" :loading="saving" @click="submitSave">
              保存配置
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="roleCode === 'AUDITOR'" style="margin-bottom:12px">
        <el-alert
          type="warning"
          :closable="false"
          title="审核员说明：建议只勾选「反馈管理」和「模板审核」菜单项。保存后已登录的审核员需重新登录以刷新权限。"
        />
      </div>

      <div class="tree-wrap">
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          show-checkbox
          default-expand-all
          check-strictly
          :props="{ label: 'title', children: 'children' }"
          :render-content="renderTreeNode"
        />
      </div>

      <div class="stat-row">
        <el-tag>已选：{{ checkedIds.length }} 项</el-tag>
        <el-tag type="info">叶节点/按钮：统计</el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getMenuTree, getRoleMenuIds, saveRoleMenu } from '@/api/admin'

const roleCode = ref('AUDITOR')
const treeRef = ref(null)
const treeData = ref([])
const loadingIds = ref(false)
const saving = ref(false)
const checkedIds = computed(() => {
  const all = treeRef.value ? treeRef.value.getCheckedNodes(false, false).map(n => n.id) : []
  const half = treeRef.value ? treeRef.value.getHalfCheckedNodes().map(n => n.id) : []
  return [...all, ...half]
})

/* 树节点自定义渲染：显示类型图标 + perms 小标 */
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
    ? h('span', { style: 'color:#909399;font-size:12px;margin-left:6px' }, `[${data.perms}]`)
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

async function loadMenuTree() {
  treeData.value = await getMenuTree() || []
}

async function loadRoleMenuIds() {
  loadingIds.value = true
  try {
    const ids = (await getRoleMenuIds(roleCode.value)) || []
    // 等待下一帧确保 treeRef 可用
    await nextTick()
    if (treeRef.value) {
      treeRef.value.setCheckedKeys([])
      // 注意 check-strictly：逐个勾选时父子不会联动；后端存的一定是完整的「目录+页面+按钮」ID列表
      treeRef.value.setCheckedKeys(ids.map(Number))
    }
  } finally {
    loadingIds.value = false
  }
}

async function reloadAll() {
  await loadMenuTree()
  await loadRoleMenuIds()
}

async function submitSave() {
  const nodes = treeRef.value.getCheckedNodes(false, false)  // 严格勾选项
  const half = treeRef.value.getHalfCheckedNodes()
  const menuIds = [...nodes, ...half].map(n => Number(n.id)).filter(Boolean)

  const warn = roleCode.value === 'ADMIN'
    ? '为超级管理员 ADMIN 变更权限存在风险，确定继续吗？'
    : `确认保存角色「${roleCode.value}」的菜单绑定（共 ${menuIds.length} 项）？`
  await ElMessageBox.confirm(warn, '提示', { type: roleCode.value === 'ADMIN' ? 'error' : 'warning' })
  saving.value = true
  try {
    await saveRoleMenu({ roleCode: roleCode.value, menuIds })
    ElMessage.success('已保存（目标账号需重新登录刷新权限）')
    await loadRoleMenuIds()
  } finally {
    saving.value = false
  }
}

// 导入 nextTick
import { nextTick } from 'vue'

onMounted(reloadAll)
</script>

<style scoped>
.page-wrap { padding: 16px; }
.tree-wrap {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
  max-height: 62vh;
  overflow: auto;
  background: #fff;
}
.stat-row { margin-top: 14px; display: flex; gap: 10px; }
</style>
