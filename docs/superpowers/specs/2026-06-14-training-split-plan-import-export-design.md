# TrainingSplitPlan 导出导入功能设计文档

## 1. 概述

为 TrainingSplitPlan.vue 组件添加导出导入功能，允许用户将分化计划导出为文本格式，也可以从文本格式导入分化计划。

## 2. 需求分析

### 2.1 功能需求
- 导出当前分化计划为文本格式
- 从文本格式导入分化计划
- 支持两种模式：按天数和按周
- 导入时直接覆盖当前计划

### 2.2 UI 需求
- 在标题栏右侧（关闭按钮左侧）添加导入/导出按钮
- 点击按钮弹出内联弹窗
- 弹窗包含导出和导入两个标签页

### 2.3 数据格式需求
- 使用文本格式，用户友好
- 包含模板详细数据（动作和组数）
- 支持两种模式的导出格式

## 3. 设计方案

### 3.1 UI 设计

#### 3.1.1 按钮位置
在标题栏右侧添加 📤 按钮，位于关闭按钮左侧。

```html
<view class="split-header">
  <text class="split-title">设置分化计划</text>
  <view class="header-actions">
    <text class="import-export-icon" @click="openImportExportPanel">📤</text>
    <text class="close-icon" @click="onClose">×</text>
  </view>
</view>
```

#### 3.1.2 弹窗设计
弹窗包含：
- 标题：导入/导出分化计划
- 两个标签页：导出、导入
- 导出标签页：显示当前计划预览 + 复制到剪贴板按钮
- 导入标签页：文本输入框 + 粘贴按钮 + 确认导入按钮

### 3.2 数据格式设计

#### 3.2.1 按天数模式导出格式
```
分化计划（按天数）：
第1天（胸肌模板）：
杠铃卧推×4
哑铃飞鸟×3
绳索夹胸×3

第2天：休息

第3天（背肌模板）：
引体向上×4
杠铃划船×3
坐姿划船×3
```

#### 3.2.2 按周模式导出格式
```
分化计划（按周）：
周一（胸肌模板）：
杠铃卧推×4
哑铃飞鸟×3
绳索夹胸×3

周二：休息

周三（背肌模板）：
引体向上×4
杠铃划船×3
坐姿划船×3
```

### 3.3 功能实现

#### 3.3.1 导出功能
1. 获取当前模式和计划数据
2. 遍历计划，生成文本格式
3. 对于启用的天数，获取模板详细数据
4. 将文本复制到剪贴板

#### 3.3.2 导入功能
1. 从剪贴板粘贴文本
2. 解析文本，提取计划数据
3. 验证数据格式
4. 直接覆盖当前计划

#### 3.3.3 冲突处理
- 导入时直接覆盖当前计划
- 不需要询问用户

## 4. 实现细节

### 4.1 数据结构
```javascript
// 导出数据结构
{
  mode: 'cycle' | 'week',  // 当前模式
  plan: [
    {
      template: '模板名称',  // 模板名称
      enabled: true/false,   // 是否启用
      actions: [             // 模板详细数据
        { name: '杠铃卧推', sets: 4 },
        { name: '哑铃飞鸟', sets: 3 }
      ]
    }
  ]
}
```

### 4.2 核心方法

#### 4.2.1 导出方法
```javascript
exportPlan() {
  const plan = this.localMode === 'cycle' ? this.localPlan : this.localWeekPlan
  const modeText = this.localMode === 'cycle' ? '按天数' : '按周'
  const dayNames = this.localMode === 'cycle' 
    ? plan.map((_, idx) => `第${idx + 1}天`)
    : this.weekDayNames

  let text = `分化计划（${modeText}）：\n`
  
  plan.forEach((day, idx) => {
    if (day.enabled && day.template) {
      const template = this.templates.find(t => t.name === day.template)
      text += `${dayNames[idx]}（${day.template}）：\n`
      if (template && template.actions) {
        template.actions.forEach(action => {
          const sets = (template.actionSets && template.actionSets[action]) || 4
          text += `${action}×${sets}\n`
        })
      }
    } else {
      text += `${dayNames[idx]}：休息\n`
    }
    text += '\n'
  })

  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
      this.closeImportExportPanel()
    }
  })
}
```

#### 4.2.2 导入方法
```javascript
importPlan() {
  uni.getClipboardData({
    success: (res) => {
      if (res && res.data) {
        const parsed = this.parsePlanText(res.data)
        if (parsed) {
          this.applyImportedPlan(parsed)
          uni.showToast({ title: '导入成功', icon: 'success' })
          this.closeImportExportPanel()
        } else {
          uni.showToast({ title: '无法识别计划数据', icon: 'none' })
        }
      } else {
        uni.showToast({ title: '剪贴板为空', icon: 'none' })
      }
    }
  })
}
```

#### 4.2.3 解析方法
```javascript
parsePlanText(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const firstLine = lines[0]
  let mode = 'cycle'
  if (firstLine.includes('按周')) {
    mode = 'week'
  }

  const plan = []
  let currentDay = null

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.includes('：休息')) {
      const dayName = line.split('：')[0]
      plan.push({ template: null, enabled: false })
      currentDay = null
    } else if (line.includes('（') && line.includes('）')) {
      const dayName = line.split('（')[0]
      const templateName = line.split('（')[1].split('）')[0]
      plan.push({ template: templateName, enabled: true })
      currentDay = plan.length - 1
    } else if (currentDay !== null && line.includes('×')) {
      // 解析动作数据（可选）
    }
  }

  return { mode, plan }
}
```

## 5. 测试用例

### 5.1 导出测试
- 测试按天数模式导出
- 测试按周模式导出
- 测试包含休息天的导出
- 测试包含多个模板的导出

### 5.2 导入测试
- 测试导入按天数模式
- 测试导入按周模式
- 测试导入无效数据
- 测试导入空数据

## 6. 注意事项

### 6.1 兼容性
- 确保导出格式与导入解析兼容
- 处理模板不存在的情况

### 6.2 用户体验
- 导出时显示预览
- 导入时显示解析结果
- 提供清晰的错误提示

### 6.3 性能
- 避免频繁的剪贴板操作
- 优化文本解析性能

## 7. 总结

本设计方案为 TrainingSplitPlan.vue 组件添加了导出导入功能，使用文本格式，用户友好，与 templateManager 的 UI 风格一致。功能实现简单，用户体验良好。
