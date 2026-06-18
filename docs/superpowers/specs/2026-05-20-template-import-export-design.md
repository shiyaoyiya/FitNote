# 模板导入导出功能设计文档

## 一、功能概述
为templateManager页面添加模板导入导出功能，支持：
- 选择多个模板导出为易读的文本格式
- 粘贴文本自动识别导入模板
- 导入时处理同名模板冲突

## 二、数据格式

### 2.1 导出格式（纯文本）
```
胸部训练：
卧推×4
飞鸟×3

腿部训练：
深蹲×5
腿举×4
```

### 2.2 格式规则
- 模板名以中文冒号"："结尾
- 动作格式：`动作名×组数`
- 模板之间用空行分隔
- 如果动作未设置组数，默认×4

## 三、UI设计

### 3.1 底部栏调整
- 原来的"新建模板"按钮保持不变
- 左侧添加"导入/导出"按钮
- 两个按钮并排布局

### 3.2 导入导出弹窗
**液态玻璃风格**，包含两个标签页：

#### 3.2.1 导出标签页
- 模板列表（支持多选）
- "全选" / "取消全选"按钮
- "确认导出"按钮

#### 3.2.2 导入标签页
- 多行文本输入框
- "粘贴"按钮（可选，方便用户操作）
- 自动识别提示
- "确认导入"按钮

### 3.3 冲突处理弹窗
- 显示冲突的模板列表
- 每个模板提供选项：覆盖 / 重命名 / 跳过
- "应用到全部"快捷选项

## 四、实现细节

### 4.1 修改文件
1. [templateManager.vue](file:///d:\小程序\FitNote\pages\templateManager\templateManager.vue)
2. [liquid-glass.css](file:///d:\小程序\FitNote\static\css\liquid-glass.css)

### 4.2 核心功能函数

#### 导出功能
```javascript
exportTemplates(selectedTemplates) {
  let text = ''
  selectedTemplates.forEach((tpl, idx) => {
    if (idx > 0) text += '\n\n'
    text += `${tpl.name}：\n`
    tpl.actions.forEach(act => {
      const sets = tpl.actionSets?.[act] || 4
      text += `${act}×${sets}\n`
    })
  })
  uni.setClipboardData({ data: text })
}
```

#### 导入功能
```javascript
parseTemplateText(text) {
  const templates = []
  const tplBlocks = text.trim().split(/\n\s*\n/)
  
  tplBlocks.forEach(block => {
    const lines = block.trim().split('\n')
    if (!lines.length) return
    
    const nameLine = lines[0]
    if (!nameLine.endsWith('：')) return
    
    const name = nameLine.slice(0, -1)
    const actions = []
    const actionSets = {}
    
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/^(.+)×(\d+)$/)
      if (match) {
        actions.push(match[1])
        actionSets[match[1]] = parseInt(match[2])
      }
    }
    
    if (actions.length) {
      templates.push({
        name,
        actions,
        actionSets,
        actionOrder: [...actions],
        actionWeights: {},
        color: '',
        customColors: []
      })
    }
  })
  
  return templates
}
```

## 五、样式适配

### 5.1 液态玻璃样式
在`liquid-glass.css`中添加：
- `.import-export-panel`：主弹窗面板
- `.tab-btn`：标签页按钮
- `.template-checkbox`：模板选择项
- `.conflict-item`：冲突处理项

### 5.2 响应式设计
- 适配不同屏幕尺寸
- 保持与现有UI风格一致

## 六、错误处理
- 解析失败时提示用户
- 空数据校验
- 模板名重复检测
