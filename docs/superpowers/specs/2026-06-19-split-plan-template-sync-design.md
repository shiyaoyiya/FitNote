# 分化计划模板名称同步设计

## 概述

当用户在模板详情页面重命名模板时，分化计划中引用该模板名称的地方需要自动同步更新，确保数据一致性。

## 需求

1. **实时同步**：模板重命名时立即更新分化计划中的引用
2. **重名处理**：如果新名称已存在，阻止重命名并提示用户
3. **更新范围**：仅更新分化计划（daySettingsStore.splitPlan），不更新历史数据
4. **实现位置**：在模板存储（template.js）中实现同步逻辑

## 架构设计

### 数据流

1. 用户在templateDetail.vue中修改模板名称
2. 调用templateStore.renameTemplate(id, newName)
3. renameTemplate内部调用daySettingsStore.updateSplitPlanTemplateName(oldName, newName)
4. daySettingsStore更新splitPlan中所有引用oldName的地方为newName

### 组件依赖

- **template.js**：模板存储，包含renameTemplate方法
- **daySettings.js**：日设置存储，包含splitPlan数据
- **templateDetail.vue**：模板详情页面，调用重命名功能

## 详细设计

### 1. template.js修改

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

### 2. daySettings.js修改

```javascript
updateSplitPlanTemplateName(oldName, newName) {
  // 更新cycleDays中的引用
  if (this.splitPlan.cycleDays) {
    this.splitPlan.cycleDays.forEach(day => {
      if (day.template === oldName) {
        day.template = newName
      }
    })
  }
  
  // 更新weekPlan中的引用
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

### 3. templateDetail.vue修改

```javascript
onNameBlur() {
  const oldName = this.originalName.trim()
  const newName = this.templateName.trim()
  
  if (!newName || newName === oldName) return
  
  // 调用模板存储的renameTemplate方法
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

## 错误处理

1. **重名检查**：如果新名称已存在，renameTemplate返回false，templateDetail.vue显示错误提示
2. **空名称检查**：如果新名称为空，onNameBlur直接返回
3. **模板不存在**：如果通过id找不到模板，renameTemplate返回false
4. **分化计划为空**：如果splitPlan为空或没有引用旧名称，updateSplitPlanTemplateName安全跳过

## 测试策略

### 单元测试

1. 测试renameTemplate方法：
   - 正常重命名
   - 重名冲突
   - 模板不存在

2. 测试updateSplitPlanTemplateName方法：
   - 更新cycleDays中的引用
   - 更新weekPlan中的引用
   - 分化计划为空

### 集成测试

1. 测试从templateDetail.vue重命名模板后，分化计划是否同步更新

### 手动测试

1. 创建一个模板，添加到分化计划
2. 重命名模板
3. 检查分化计划中的模板名称是否更新
4. 尝试重命名为已存在的名称，验证错误提示

## 实现步骤

1. 在daySettings.js中添加updateSplitPlanTemplateName方法
2. 修改template.js的renameTemplate方法，添加同步逻辑
3. 修改templateDetail.vue的onNameBlur方法，调用renameTemplate
4. 进行单元测试和集成测试
5. 进行手动测试验证功能

## 风险评估

1. **数据一致性**：如果同步逻辑失败，可能导致分化计划引用旧名称
   - 缓解措施：在renameTemplate中确保原子性操作
   
2. **性能影响**：遍历分化计划可能影响性能
   - 缓解措施：分化计划数据量小，性能影响可忽略

3. **兼容性**：现有代码可能直接修改模板名称而不调用renameTemplate
   - 缓解措施：检查所有修改模板名称的地方，确保使用renameTemplate