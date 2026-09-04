<template>
  <div class="page-wrap">
    <el-page-header @back="$router.back()" :title="editId ? '编辑预设' : '新增预设'" />
    <el-divider />

    <el-form :model="form" :rules="rules" ref="formRef" label-width="110px" class="full-form">
      <!-- 基本信息 -->
      <el-card shadow="never" class="form-card">
        <template #header><b>基础信息</b></template>
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="预设包名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="难度" prop="difficulty">
              <el-radio-group v-model="form.difficulty">
                <el-radio :value="1">简单</el-radio>
                <el-radio :value="2">中等</el-radio>
                <el-radio :value="3">困难</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="封面色" prop="coverColor">
              <div style="display:flex;align-items:center;gap:8px">
                <el-color-picker v-model="form.coverColor" show-alpha />
                <span style="color:#909399">{{ form.coverColor || '未选择' }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sortOrder" :min="0" :max="1000" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否启用">
              <el-switch v-model="enabledSwitch" />
              <span style="margin-left:8px;color:#909399">{{ enabledSwitch ? '小程序端可见' : '仅后台可用' }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="预设包简介" maxlength="500" show-word-limit />
        </el-form-item>
      </el-card>

      <!-- 模板清单二维表 -->
      <el-card shadow="never" class="form-card">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>模板清单</b>
            <div>
              <el-button :icon="Plus" type="primary" link size="small" @click="addTemplateRow">添加一个训练日</el-button>
              <el-button link size="small" @click="parseSample">快速：从 JSON 粘贴导入</el-button>
            </div>
          </div>
        </template>

        <div
          v-for="(tpl, tplIdx) in templates"
          :key="tplIdx"
          class="tpl-block"
        >
          <div class="tpl-head">
            <el-input v-model="tpl.name" placeholder="训练日名称（例：推日(胸肩三头)）" style="width:320px" />
            <el-color-picker v-model="tpl.color" show-alpha />
            <el-button
              link
              size="small"
              type="danger"
              :icon="Delete"
              @click="removeTpl(tplIdx)"
              :disabled="templates.length <= 1"
            >删除此训练日</el-button>
          </div>

          <el-table
            :data="tpl.actions"
            border
            size="small"
            class="action-table"
            @row-click="(r) => onRowClick(r, tpl)"
          >
            <el-table-column label="动作名" width="240">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" placeholder="例：史密斯卧推" />
              </template>
            </el-table-column>
            <el-table-column label="组数" width="160">
              <template #default="{ row }">
                <el-input-number v-model="row.sets" :min="1" :max="20" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ $index: i }">
                <el-button link size="small" type="danger" @click="removeAction(tpl, i)">移除动作</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-button link size="small" type="primary" style="margin-top:6px" :icon="Plus" @click="addAction(tpl)">+ 添加动作</el-button>
        </div>
      </el-card>

      <!-- 操作栏 -->
      <div style="text-align:center;margin-top:20px">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" :loading="saving" v-hasPerm="'preset:edit'" @click="submitForm">
          {{ editId ? '保存修改' : '创建预设' }}
        </el-button>
      </div>
    </el-form>

    <!-- JSON 导入 Dialog -->
    <el-dialog v-model="importVisible" title="粘贴 JSON 导入模板清单" width="520px">
      <el-input v-model="importJson" type="textarea" :rows="12" placeholder="粘贴 templateData JSON 数组..." />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="doImport">解析导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { getPresetDetail, savePreset } from '@/api/preset'

const route = useRoute()
const router = useRouter()
const editId = route.query.id

const formRef = ref(null)
const saving = ref(false)
const form = reactive({
  id: editId ? Number(editId) : null,
  name: '',
  description: '',
  coverColor: '#4DB6AC',
  difficulty: 2,
  enabled: 1,
  sortOrder: 0
})
const enabledSwitch = ref(true)
watch(enabledSwitch, (v) => { form.enabled = v ? 1 : 0 })

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  coverColor: [{ required: true, message: '请选择封面色', trigger: 'change' }]
}

/* ------------------- 模板清单二维结构 ------------------- */
// [{ name, color, actions: [{ name, sets }] }]
const templates = ref([])

function newTemplateBlock() {
  return { name: '', color: '#d44848', actions: [{ name: '', sets: 4 }] }
}
function addTemplateRow() {
  templates.value.push(newTemplateBlock())
}
function removeTpl(i) {
  templates.value.splice(i, 1)
}
function addAction(tpl) {
  tpl.actions.push({ name: '', sets: 3 })
}
function removeAction(tpl, i) {
  if (tpl.actions.length <= 1) {
    tpl.actions = [{ name: '', sets: 3 }]
  } else {
    tpl.actions.splice(i, 1)
  }
}
function onRowClick() {}

// JSON 导入
const importVisible = ref(false)
const importJson = ref('')
function parseSample() {
  importJson.value = JSON.stringify(templates.value.map(toApiTpl), null, 2)
  importVisible.value = true
}
function doImport() {
  try {
    const arr = JSON.parse(importJson.value)
    if (!Array.isArray(arr)) throw new Error('格式：数组')
    templates.value = arr.map(raw => ({
      name: raw.name || '',
      color: raw.color || '#d44848',
      actions: buildActions(raw)
    }))
    importVisible.value = false
    ElMessage.success('导入成功')
  } catch (e) {
    ElMessage.error('解析失败：' + e.message)
  }
}
function buildActions(raw) {
  if (Array.isArray(raw.actions)) {
    return raw.actions.map(n => ({ name: typeof n === 'string' ? n : (n.name || ''), sets: (typeof n !== 'string' && n.sets) ? Number(n.sets) : 3 }))
  }
  const names = raw.actionNames || []
  const sets = raw.actionSets || {}
  const all = names.length ? names : Object.keys(sets)
  return all.length ? all.map(n => ({ name: n, sets: Number(sets[n]) || 3 })) : [{ name: '', sets: 3 }]
}

/* ------------------- 与后端 templateData 对齐 ------------------- */
// API 存储格式: [{name,color,actions:string[],actionSets:{name:sets}}]
function toApiTpl(tpl) {
  const actionNames = tpl.actions.map(a => (a.name || '').trim()).filter(Boolean)
  const actionSets = {}
  tpl.actions.forEach(a => { if (a.name) actionSets[a.name] = Number(a.sets) || 3 })
  return { name: tpl.name, color: tpl.color, actions: actionNames, actionSets }
}

/* ------------------- 提交 / 读取 ------------------- */
async function fetchDetail() {
  const d = await getPresetDetail(editId)
  form.id = d.id
  form.name = d.name
  form.description = d.description || ''
  form.coverColor = d.coverColor || '#4DB6AC'
  form.difficulty = d.difficulty || 2
  form.enabled = d.enabled == null ? 1 : d.enabled
  enabledSwitch.value = form.enabled === 1
  form.sortOrder = d.sortOrder || 0
  try {
    const raw = JSON.parse(d.templateData || '[]')
    templates.value = raw.map(x => ({
      name: x.name || '',
      color: x.color || '#d44848',
      actions: buildActions(x)
    }))
  } catch {
    templates.value = [newTemplateBlock()]
  }
}

async function submitForm() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!templates.value.length) {
    ElMessage.warning('至少需要一个训练日')
    return
  }
  // 校验
  for (const tpl of templates.value) {
    if (!tpl.name) {
      ElMessage.warning('请填写训练日名称')
      return
    }
    if (!tpl.actions.length || tpl.actions.some(a => !a.name)) {
      ElMessage.warning(`训练日「${tpl.name}」包含未填写的动作`)
      return
    }
  }
  saving.value = true
  try {
    const payload = {
      id: form.id || undefined,
      name: form.name.trim(),
      description: form.description,
      coverColor: form.coverColor,
      difficulty: form.difficulty,
      templateData: JSON.stringify(templates.value.map(toApiTpl)),
      enabled: form.enabled,
      sortOrder: form.sortOrder
    }
    await savePreset(payload)
    ElMessage.success('保存成功')
    router.back()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (editId) {
    fetchDetail()
  } else {
    templates.value = [newTemplateBlock(), newTemplateBlock(), newTemplateBlock()]
  }
})
</script>

<style scoped>
.page-wrap { padding: 16px; }
.form-card { margin-bottom: 16px; }
.tpl-block {
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
}
.tpl-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.action-table { margin-bottom: 4px; }
</style>
