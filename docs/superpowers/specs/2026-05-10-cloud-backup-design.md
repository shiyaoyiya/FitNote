# 云端备份功能设计方案

**项目**: FitNote 健身记录小程序
**日期**: 2026-05-10
**状态**: 已确认

---

## 1. 需求概述

为FitNote小程序添加云端备份功能，用户可以通过微信云开发将训练数据备份到云端，并在不同设备间同步恢复。

**核心需求**：
- 按openid自动区分用户
- 每用户最多存储3条备份
- 新备份自动替换最旧的
- 支持手动删除备份
- 下载时可选择任意备份

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────┐
│           微信小程序前端                   │
│  ┌─────────────────────────────────┐    │
│  │      备份页面 (backup.vue)       │    │
│  │  ☁️ 上传  📥 下载               │    │
│  │  ─────────────────────────────  │    │
│  │  备份1 [下载] [删除]            │    │
│  │  备份2 [下载] [删除]            │    │
│  └─────────────────────────────────┘    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│           微信云开发                       │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  云数据库      │  │  云存储       │    │
│  │  backups集合   │  │  backups/*.json│    │
│  │  - _openid    │  │  实际备份数据  │    │
│  │  - backupId   │  └──────────────┘    │
│  │  - createdAt  │                      │
│  │  - size       │                      │
│  └──────────────┘                      │
└─────────────────────────────────────────┘
```

### 2.2 技术选型

- **前端框架**: uni-app (Vue 3)
- **云服务**: 微信云开发
  - 云数据库：存储备份元数据
  - 云存储：存储实际备份文件
- **用户识别**: openid（云开发自动获取）

---

## 3. 数据库设计

### 3.1 云数据库集合

**集合名**: `backups`

**记录结构**:
```javascript
{
  _openid: String,      // 用户openid，云开发自动写入
  backupId: String,     // 唯一ID (UUID)
  createdAt: Number,    // 创建时间戳
  size: Number,         // 备份大小(字节)
  description: String,  // 备份描述（可选）
  cloudPath: String,    // 云存储路径
  status: String        // 状态：'active' | 'deleted'
}
```

**索引配置**:
- `_openid` (升序) + `createdAt` (降序) 复合索引

**权限设置**:
```json
{
  "read": "doc._openid == auth.openid",
  "create": "auth.openid != null",
  "update": "doc._openid == auth.openid",
  "delete": "doc._openid == auth.openid"
}
```

### 3.2 云存储路径

**路径格式**: `backups/{openid}/{timestamp}.json`

**示例**:
```
backups/oABC123/1715322230000.json
backups/oABC123/1715328800000.json
```

---

## 4. 界面设计

### 4.1 页面布局

```
┌──────────────────────────────────────┐
│ [ 本地备份 ] [ 云端备份 ]              │ ← 标签切换
├──────────────────────────────────────┤
│                                      │
│   ☁️ 上传至云端   📥 从云端下载       │ ← 快捷操作区
│                                      │
│   ─────────────────────────────────  │
│                                      │
│   云端备份 (2/3)                      │ ← 容量提示
│   ┌──────────────────────────────┐  │
│   │ ☁️ 今天 14:30           [下载]│  │ ← 备份项
│   │    204 KB                    [删除]│  │
│   ├──────────────────────────────┤  │
│   │ ☁️ 5月8日 10:00         [下载]│  │
│   │    198 KB                   [删除]│  │
│   └──────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### 4.2 交互流程

#### 上传流程
1. 用户点击"上传至云端"
2. 系统生成本地备份数据
3. 检查当前用户备份数量
4. 如果 ≥ 3条，自动删除最旧备份
5. 上传备份文件到云存储
6. 在数据库写入元数据
7. 刷新列表显示

#### 下载流程
1. 用户点击某个备份的"下载"
2. 弹出选择框：覆盖导入 / 合并导入
3. 从云端下载备份文件
4. 解析并恢复数据
5. 刷新本地数据

#### 删除流程
1. 用户点击某个备份的"删除"
2. 弹出确认框："确定删除此备份？"
3. 用户确认后，删除云存储文件
4. 更新数据库记录状态为 deleted
5. 刷新列表显示

---

## 5. 核心逻辑

### 5.1 上传到云端

```javascript
async function uploadToCloud() {
  // 1. 检查云开发初始化
  if (!wx.cloud) {
    throw new Error('云开发未初始化')
  }

  // 2. 生成本地备份数据
  const backupData = collectFullData()
  const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_backup.json`

  // 3. 写入临时文件
  await writeTempFile(backupData, tempFilePath)

  // 4. 查询当前用户的备份数量
  const count = await countUserBackups()

  // 5. 如果≥3条，删除最旧的一条
  if (count >= 3) {
    await deleteOldestBackup()
  }

  // 6. 生成云存储路径
  const timestamp = Date.now()
  const cloudPath = `backups/${openid}/${timestamp}.json`

  // 7. 上传到云存储
  const uploadResult = await wx.cloud.uploadFile({
    filePath: tempFilePath,
    cloudPath: cloudPath
  })

  // 8. 在数据库写入元数据
  await db.collection('backups').add({
    data: {
      backupId: generateUUID(),
      createdAt: timestamp,
      size: backupData.length,
      cloudPath: cloudPath,
      status: 'active'
    }
  })

  // 9. 清理临时文件
  deleteTempFile(tempFilePath)
}
```

### 5.2 下载备份

```javascript
async function downloadBackup(backupId) {
  // 1. 从数据库获取云存储路径
  const record = await db.collection('backups')
    .where({ backupId: backupId })
    .get()

  if (!record.data || record.data.length === 0) {
    throw new Error('备份记录不存在')
  }

  // 2. 下载云端文件
  const fileContent = await wx.cloud.downloadFile({
    fileID: record.data[0].cloudPath
  })

  // 3. 解析备份数据
  const backupData = JSON.parse(fileContent.content)

  // 4. 恢复数据（根据用户选择的模式）
  await restoreData(backupData, mode)
}
```

### 5.3 删除备份

```javascript
async function deleteBackup(backupId) {
  // 1. 从数据库获取记录
  const record = await db.collection('backups')
    .where({ backupId: backupId })
    .get()

  if (!record.data || record.data.length === 0) {
    throw new Error('备份记录不存在')
  }

  // 2. 删除云存储文件
  try {
    await wx.cloud.deleteFile({
      fileList: [record.data[0].cloudPath]
    })
  } catch (e) {
    console.warn('删除云存储文件失败:', e)
  }

  // 3. 更新数据库记录状态
  await db.collection('backups')
    .where({ backupId: backupId })
    .update({
      data: {
        status: 'deleted'
      }
    })
}
```

---

## 6. 与现有功能的协调

### 6.1 数据格式统一

- 云端和本地使用相同的备份数据结构
- 备份内容包含：模板、动作、纪念日、天数数据
- 版本号统一为 `1.0`

### 6.2 功能渐进增强

- 未开通云开发的用户仍可使用本地备份
- 云端功能优雅降级，失败时提示原因

### 6.3 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| 云开发未初始化 | 提示"请先开通云开发" |
| 网络断开 | 提示"网络异常，请重试" |
| 云存储配额超限 | 提示"云端存储已满，请删除旧备份" |
| 上传失败 | 提示"上传失败，请重试" |
| 下载失败 | 提示"下载失败，请重试" |

---

## 7. 实现计划

详见: `docs/superpowers/plans/YYYY-MM-DD-cloud-backup-plan.md`

### 7.1 主要任务

1. **云开发初始化**
   - 在小程序中初始化云开发
   - 配置manifest.json
   - 添加云函数（如需要）

2. **云数据库配置**
   - 创建backups集合
   - 配置权限规则
   - 创建索引

3. **云端备份模块**
   - 创建cloudBackup.js工具类
   - 实现上传、下载、删除功能
   - 处理错误和边界情况

4. **UI界面改造**
   - 在backup.vue添加标签切换
   - 实现云端备份列表展示
   - 添加上传、下载、删除按钮

5. **测试与优化**
   - 功能测试
   - 边界情况测试
   - 用户体验优化

---

## 8. 注意事项

1. **openid获取**: 云开发会自动在记录中写入openid，无需手动处理
2. **权限控制**: 确保用户只能操作自己的备份
3. **数据安全**: 备份数据不包含敏感信息
4. **免费额度**: 合理使用云开发免费配额
5. **向后兼容**: 确保新版本可以恢复旧版本的备份

---

**文档版本**: 1.0
**最后更新**: 2026-05-10
