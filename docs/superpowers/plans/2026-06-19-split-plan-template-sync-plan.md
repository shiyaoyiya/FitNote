# 分化计划模板名称同步实施计划

> **对于代理工作者：** 必需的子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐步实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 当模板名称更改时，自动同步更新分化计划中的模板名称引用

**架构：** 在模板存储的 renameTemplate 方法中添加同步逻辑，调用日设置存储的 updateSplitPlanTemplateName 方法更新分化计划中的引用

**技术栈：** Vue 3, Pinia, uni-app

---

## 文件结构

### 要修改的文件

1. **`stores/daySettings.js`** - 添加 updateSplitPlanTemplateName 方法
2. **`stores/template.js`** - 修改 renameTemplate 方法，添加同步逻辑
3. **`pages/templateDetail/templateDetail.vue`** - 修改 onNameBlur 方法，调用 renameTemplate

### 测试文件

1. **手动测试** - 通过浏览器开发者工具验证功能

---

## 任务 1：在 daySettings.js 中添加 updateSplitPlanTemplateName 方法

**文件：**
- 修改：`stores/daySettings.js`

- [ ] **步骤 1：添加 updateSplitPlanTemplateName 方法**

在 daySettings.js 的 actions 对象中添加新方法：

```javascript
updateSplitPlanTemplateName(oldName, newName) {
  // 更新 cycleDays 中的引用
  if (this.splitPlan.cycleDays) {
    this.splitPlan.cycleDays.forEach(day => {
      if (day.template === oldName) {
        day.template = newName
      }
    })
  }
  
  // 更新 weekPlan 中的引用
  if (this.splitPlan.weekPlan) {
    this.splitPlan.weekPlan.forEach(day => {
      if (day.template === oldName) {
        day.template = newName
      }
    })
  }
  
  // 保存设置
  this.save()
}
```

- [ ] **步骤 2：验证方法添加成功**

在浏览器控制台中测试方法是否存在：
```javascript
const daySettingsStore = useDaySettingsStore()
console.log(typeof daySettingsStore.updateSplitPlanTemplateName) // 应该输出 "function"
```

- [ ] **步骤 3：提交更改**

```bash
git add stores/daySettings.js
git commit -m "feat: 添加 updateSplitPlanTemplateName 方法用于同步分化计划模板名称"
```

---

## 任务 2：修改 template.js 的 renameTemplate 方法

**文件：**
- 修改：`stores/template.js`

- [ ] **步骤 1：修改 renameTemplate 方法**

在 template.js 中修改 renameTemplate 方法，添加同步逻辑：

```javascript
renameTemplate(id, newName) {
  const tpl = this.templates.find(t => t.id === id)
  if (!tpl) return false
  
  const oldName = tpl.name
  
  // 检查重名
  if (this.templates.some(t => t.name === newName && t.id !== id)) {
    return false // 重名，阻止重命名
  }
  
  // 更新分化计划中的引用
  const daySettingsStore = useDaySettingsStore()
  daySettingsStore.updateSplitPlanTemplateName(oldName, newName)
  
  // 更新模板名称
  tpl.name = newName
  this.save()
  
  return true
}
```

- [ ] **步骤 2：添加 import 语句**

在 template.js 文件顶部添加 useDaySettingsStore 的导入：

```javascript
import { useDaySettingsStore } from './daySettings.js'
```

- [ ] **步骤 3：验证修改成功**

在浏览器控制台中测试重命名功能：
```javascript
const templateStore = useTemplateStore()
const daySettingsStore = useDaySettingsStore()

// 创建测试模板
templateStore.addTemplate('测试模板')

// 添加到分化计划
daySettingsStore.splitPlan.cycleDays[0].template = '测试模板'
daySettingsStore.splitPlan.cycleDays[0].enabled = true

// 重命名模板
const template = templateStore.templates.find(t => t.name === '测试模板')
const success = templateStore.renameTemplate(template.id, '新模板名称')

console.log('重命名成功:', success)
console.log('分化计划中的模板名称:', daySettingsStore.splitPlan.cycleDays[0].template) // 应该输出 "新模板名称"
```

- [ ] **步骤 4：提交更改**

```bash
git add stores/template.js
git commit -m "feat: 修改 renameTemplate 方法，添加分化计划同步逻辑"
```

---

## 任务 3：修改 templateDetail.vue 的 onNameBlur 方法

**文件：**
- 修改：`pages/templateDetail/templateDetail.vue`

- [ ] **步骤 1：修改 onNameBlur 方法**

在 templateDetail.vue 中修改 onNameBlur 方法，调用 renameTemplate：

```javascript
onNameBlur() {
  const oldName = this.originalName.trim()
  const newName = this.templateName.trim()
  
  if (!newName || newName === oldName) return
  
  // 调用模板存储的 renameTemplate 方法
  const success = this.tplStore.renameTemplate(this.templateId, newName)
  
  if (!success) {
    uni.showToast({
      title: '模板名称已存在',
      icon: 'none'
    })
    this.templateName = oldName
    return
  }
  
  // 更新原始名称
  this.originalName = newName
  
  // 更新导航栏标题
  uni.setNavigationBarTitle({
    title: newName + ' 模板详情'
  })
  
  // 重新加载模板详情
  this.loadTemplateDetail()
  
  uni.showToast({
    title: '重命名成功',
    icon: 'success'
  })
}
```

- [ ] **步骤 2：添加 templateId 计算属性**

在 templateDetail.vue 中添加 templateId 计算属性：

```javascript
computed: {
  templateId() {
    const template = this.tplStore.templates.find(t => t.name === this.originalName)
    return template ? template.id : null
  }
}
```

- [ ] **步骤 3：验证修改成功**

1. 打开模板详情页面
2. 修改模板名称
3. 检查分化计划中的模板名称是否同步更新
4. 尝试重命名为已存在的名称，验证错误提示

- [ ] **步骤 4：提交更改**

```bash
git add pages/templateDetail/templateDetail.vue
git commit -m "feat: 修改 onNameBlur 方法，调用 renameTemplate 实现分化计划同步"
```

---

## 任务 4：手动测试完整功能

**文件：**
- 无

- [ ] **步骤 1：测试正常重命名同步**

1. 创建一个模板（例如："胸肌训练"）
2. 打开分化计划设置，将某一天设置为"胸肌训练"
3. 保存分化计划
4. 打开模板详情页面，将模板重命名为"胸部训练"
5. 返回分化计划设置，检查模板名称是否已更新为"胸部训练"

- [ ] **步骤 2：测试重名冲突处理**

1. 创建两个模板（例如："胸肌训练"和"背部训练"）
2. 打开"胸肌训练"的模板详情页面
3. 尝试将模板重命名为"背部训练"
4. 验证是否显示"模板名称已存在"错误提示
5. 验证模板名称是否保持为"胸肌训练"

- [ ] **步骤 3：测试空名称处理**

1. 打开模板详情页面
2. 清空模板名称输入框
3. 点击其他地方触发 onNameBlur
4. 验证模板名称是否保持不变

- [ ] **步骤 4：测试分化计划为空的情况**

1. 确保分化计划中没有引用任何模板
2. 重命名一个模板
3. 验证重命名是否成功，没有错误

- [ ] **步骤 5：提交测试结果**

```bash
git add .
git commit -m "test: 完成分化计划模板名称同步功能的手动测试"
```

---

## 自检清单

### 规范覆盖检查

- [x] **实时同步**：在 renameTemplate 中实现
- [x] **重名处理**：在 renameTemplate 中检查重名
- [x] **更新范围**：仅更新分化计划
- [x] **实现位置**：在模板存储中实现

### 占位符扫描

- [x] 没有 "TBD"、"TODO" 或 "实现后填充"
- [x] 每个步骤都有完整的代码
- [x] 每个步骤都有具体的命令和预期输出

### 类型一致性检查

- [x] 方法名称一致：updateSplitPlanTemplateName
- [x] 参数名称一致：oldName, newName
- [x] 返回值一致：renameTemplate 返回 boolean

---

## 执行交接

计划完成并保存到 `docs/superpowers/plans/2026-06-19-split-plan-template-sync-plan.md`。两种执行选项：

**1. 子代理驱动（推荐）** - 我为每个任务分派一个新的子代理，任务之间进行审查，快速迭代

**2. 内联执行** - 在此会话中使用 executing-plans 执行任务，批量执行并设置检查点

**选择哪种方法？**