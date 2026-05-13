# 云端备份功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为FitNote小程序添加微信云端备份功能，用户可将训练数据上传到云端并下载恢复

**Architecture:** 使用微信云开发的云数据库存储备份元数据，云存储存储实际备份文件，通过openid自动区分用户，支持每用户3条备份自动替换

**Tech Stack:** uni-app (Vue 3), 微信云开发, 云数据库, 云存储

---

## 文件结构规划

```
FitNote/
├── utils/
│   ├── backup.js              # 修改: 添加本地备份相关函数（已有）
│   └── cloudBackup.js         # 新建: 云端备份工具类
├── pages/
│   └── backup/
│       └── backup.vue         # 修改: 添加云端备份UI和逻辑
├── manifest.json              # 修改: 添加云开发配置
└── cloudfunctions/            # 新建: 云函数目录（如需要）
    └── backupOps/
        └── index.js           # 新建: 云函数处理复杂操作
```

---

## 实施任务

### Task 1: 初始化云开发配置

**Files:**
- Modify: `manifest.json:102-110`
- Modify: `App.vue` (添加云初始化)

**Steps:**

- [ ] **Step 1: 配置manifest.json添加云开发**

修改 `manifest.json` 文件，在 `mp-weixin` 节点下添加云开发配置：

```json
"mp-weixin" : {
    "appid" : "wxea4d8a557d8391ee",
    "setting" : {
        "urlCheck" : false,
        "minified" : true
    },
    "usingComponents" : true,
    "lazyCodeLoading" : "requiredComponents",
    "cloud" : true
}
```

- [ ] **Step 2: 在App.vue添加云开发初始化**

在 `App.vue` 的 `onLaunch` 函数中添加：

```javascript
// #ifdef MP-WEIXIN
if (!wx.cloud) {
  console.error('请使用 2.2.3 或以上的基础库以使用云能力')
} else {
  wx.cloud.init({
    env: 'fitnote-cloud-xxxx', // 云环境ID，后续需要配置
    traceUser: true,
  })
}
// #endif
```

- [ ] **Step 3: 创建云环境配置文件**

新建 `utils/cloudConfig.js`：

```javascript
export const CLOUD_CONFIG = {
  env: 'fitnote-cloud-xxxx', // TODO: 替换为实际的云环境ID
  database: 'backups', // 云数据库集合名
  maxBackups: 3, // 每用户最大备份数
}
```

---

### Task 2: 创建云端备份工具类

**Files:**
- Create: `utils/cloudBackup.js`

**Steps:**

- [ ] **Step 1: 创建云端备份核心工具类**

创建 `utils/cloudBackup.js`，包含以下核心函数：

```javascript
const db = wx.cloud.database()
const MAX_BACKUPS = 3

/**
 * 生成UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 获取用户openid
 */
async function getOpenId() {
  const result = await wx.cloud.callFunction({
    name: 'getOpenId',
  })
  return result.result.openid
}

/**
 * 查询用户的所有云端备份
 */
async function listUserBackups() {
  const openid = await getOpenId()
  const result = await db.collection('backups')
    .where({
      _openid: openid,
      status: 'active'
    })
    .orderBy('createdAt', 'desc')
    .get()
  return result.data
}

/**
 * 统计用户备份数量
 */
async function countUserBackups() {
  const openid = await getOpenId()
  const countResult = await db.collection('backups')
    .where({
      _openid: openid,
      status: 'active'
    })
    .count()
  return countResult.total
}

/**
 * 删除最旧的备份
 */
async function deleteOldestBackup() {
  const backups = await listUserBackups()
  if (backups.length >= MAX_BACKUPS) {
    const oldest = backups[backups.length - 1]
    await deleteBackup(oldest.backupId)
  }
}

/**
 * 删除指定备份
 */
async function deleteBackup(backupId) {
  // 获取备份记录
  const record = await db.collection('backups')
    .where({ backupId: backupId })
    .get()

  if (record.data && record.data.length > 0) {
    const backup = record.data[0]

    // 删除云存储文件
    try {
      await wx.cloud.deleteFile({
        fileList: [backup.cloudPath]
      })
    } catch (e) {
      console.warn('删除云存储文件失败:', e)
    }

    // 更新数据库状态
    await db.collection('backups')
      .where({ backupId: backupId })
      .update({
        data: {
          status: 'deleted'
        }
      })
  }
}

/**
 * 上传备份到云端
 */
async function uploadToCloud() {
  const openid = await getOpenId()

  // 检查并删除旧备份
  const count = await countUserBackups()
  if (count >= MAX_BACKUPS) {
    await deleteOldestBackup()
  }

  // 生成本地备份数据
  const backupData = collectFullData()
  const timestamp = Date.now()
  const cloudPath = `backups/${openid}/${timestamp}.json`

  // 创建临时文件
  const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_backup_${timestamp}.json`
  const fs = wx.getFileSystemManager()
  fs.writeFileSync(tempFilePath, JSON.stringify(backupData), 'utf8')

  // 获取文件大小
  const fileInfo = fs.getFileInfo({
    filePath: tempFilePath
  })

  // 上传到云存储
  const uploadResult = await wx.cloud.uploadFile({
    filePath: tempFilePath,
    cloudPath: cloudPath
  })

  // 写入数据库记录
  await db.collection('backups').add({
    data: {
      backupId: generateUUID(),
      createdAt: timestamp,
      size: fileInfo.size,
      cloudPath: cloudPath,
      status: 'active'
    }
  })

  // 清理临时文件
  fs.unlinkSync(tempFilePath)

  return {
    backupId: generateUUID(),
    createdAt: timestamp,
    cloudPath: cloudPath
  }
}

/**
 * 从云端下载备份
 */
async function downloadFromCloud(backupId) {
  // 获取备份记录
  const record = await db.collection('backups')
    .where({ backupId: backupId })
    .get()

  if (!record.data || record.data.length === 0) {
    throw new Error('备份记录不存在')
  }

  const backup = record.data[0]

  // 下载云端文件
  const fileContent = await wx.cloud.downloadFile({
    fileID: backup.cloudPath
  })

  // 读取文件内容
  const fs = wx.getFileSystemManager()
  const tempFilePath = `${wx.env.USER_DATA_PATH}/cloud_backup_temp.json`

  // 将ArrayBuffer写入临时文件
  fs.writeFile({
    filePath: tempFilePath,
    data: fileContent.content,
    encoding: 'utf8',
    success: () => {
      // 读取文件内容
      const content = fs.readFileSync(tempFilePath, 'utf8')
      const backupData = JSON.parse(content)

      // 清理临时文件
      fs.unlinkSync(tempFilePath)

      return backupData
    }
  })
}

export {
  listUserBackups,
  countUserBackups,
  uploadToCloud,
  downloadFromCloud,
  deleteBackup,
  deleteOldestBackup,
  getOpenId
}
```

- [ ] **Step 2: 完善 collectFullData 函数**

在 `cloudBackup.js` 中添加从现有 `backup.js` 复制的 `collectFullData` 函数，确保数据格式一致。

---

### Task 3: 修改备份页面UI

**Files:**
- Modify: `pages/backup/backup.vue`

**Steps:**

- [ ] **Step 1: 添加标签切换和云端区域**

在 `backup.vue` 的 template 中添加：

```html
<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
    <!-- 标签切换 -->
    <view class="tab-bar">
      <view
        :class="['tab-item', { active: activeTab === 'local' }]"
        @click="switchTab('local')"
      >
        📂 本地备份
      </view>
      <view
        :class="['tab-item', { active: activeTab === 'cloud' }]"
        @click="switchTab('cloud')"
      >
        ☁️ 云端备份
      </view>
    </view>

    <!-- 本地备份区域 -->
    <view v-if="activeTab === 'local'" class="tab-content">
      <!-- 现有的本地备份UI -->
    </view>

    <!-- 云端备份区域 -->
    <view v-if="activeTab === 'cloud'" class="tab-content">
      <!-- 云端备份UI -->
      <view class="cloud-section">
        <view class="cloud-actions">
          <view class="action-btn cloud-upload" @click="handleCloudUpload">
            <text class="action-icon">☁️</text>
            <text class="action-text">上传至云端</text>
          </view>
          <view class="action-btn cloud-download" @click="showCloudBackupList">
            <text class="action-icon">📥</text>
            <text class="action-text">从云端下载</text>
          </view>
        </view>

        <view class="backup-info">
          <text class="info-text">云端备份 ({{ cloudBackups.length }}/3)</text>
        </view>

        <view class="backup-list" v-if="cloudBackups.length > 0">
          <view
            v-for="(backup, index) in cloudBackups"
            :key="backup.backupId"
            class="backup-item"
          >
            <view class="backup-info">
              <text class="backup-icon">☁️</text>
              <view class="backup-details">
                <text class="backup-time">{{ formatTime(backup.createdAt) }}</text>
                <text class="backup-size">{{ formatSize(backup.size) }}</text>
              </view>
            </view>
            <view class="backup-actions">
              <text class="action-text download" @click="handleCloudDownload(backup)">下载</text>
              <text class="action-text delete" @click="handleCloudDelete(backup)">删除</text>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <text class="empty-icon">☁️</text>
          <text class="empty-text">暂无云端备份</text>
          <text class="empty-hint">点击上方按钮上传</text>
        </view>
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 添加 data 和 computed**

```javascript
data() {
  return {
    activeTab: 'local', // 'local' | 'cloud'
    cloudBackups: [],
    isUploading: false,
    isDownloading: false
  }
}
```

- [ ] **Step 3: 添加云端相关方法**

```javascript
methods: {
  // 切换标签
  switchTab(tab) {
    this.activeTab = tab
    if (tab === 'cloud') {
      this.loadCloudBackups()
    }
  },

  // 加载云端备份列表
  async loadCloudBackups() {
    try {
      const backups = await listUserBackups()
      this.cloudBackups = backups
    } catch (e) {
      console.error('加载云端备份失败:', e)
      uni.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 上传到云端
  async handleCloudUpload() {
    if (this.isUploading) return

    uni.showLoading({ title: '上传中...' })
    this.isUploading = true

    try {
      await uploadToCloud()
      uni.showToast({
        title: '上传成功',
        icon: 'success'
      })
      await this.loadCloudBackups()
    } catch (e) {
      console.error('上传失败:', e)
      uni.showToast({
        title: '上传失败: ' + (e.message || '未知错误'),
        icon: 'none'
      })
    } finally {
      this.isUploading = false
      uni.hideLoading()
    }
  },

  // 下载云端备份
  async handleCloudDownload(backup) {
    uni.showActionSheet({
      itemList: ['覆盖导入 (清除现有数据)', '合并导入 (保留现有数据)'],
      success: async (res) => {
        const overwrite = res.tapIndex === 0
        uni.showLoading({ title: '下载中...' })
        this.isDownloading = true

        try {
          const backupData = await downloadFromCloud(backup.backupId)
          // TODO: 调用恢复逻辑
          await restoreDataFromCloud(backupData, overwrite)
          uni.showToast({
            title: '恢复成功',
            icon: 'success'
          })
        } catch (e) {
          console.error('下载失败:', e)
          uni.showToast({
            title: '下载失败',
            icon: 'none'
          })
        } finally {
          this.isDownloading = false
          uni.hideLoading()
        }
      }
    })
  },

  // 删除云端备份
  async handleCloudDelete(backup) {
    uni.showModal({
      title: '确认删除',
      content: '确定要删除此备份吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteBackup(backup.backupId)
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            await this.loadCloudBackups()
          } catch (e) {
            console.error('删除失败:', e)
            uni.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return `今天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${month}月${day}日 ${hours}:${minutes}`
  },

  // 格式化文件大小
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}
```

- [ ] **Step 4: 添加云端相关样式**

在 `<style scoped>` 中添加：

```css
/* 标签栏 */
.tab-bar {
  display: flex;
  background: #ffffff;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.container.dark .tab-bar {
  background: #1c1c1e;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
  transition: all 0.3s;
}

.tab-item.active {
  background: #007aff;
  color: #ffffff;
}

.container.dark .tab-item {
  color: #999;
}

.container.dark .tab-item.active {
  background: #58a6ff;
}

/* 云端区域 */
.cloud-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cloud-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.container.dark .action-btn {
  background: #1c1c1e;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.cloud-upload .action-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.cloud-download .action-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.action-text {
  font-size: 14px;
  color: #333;
}

.container.dark .action-text {
  color: #f2f2f7;
}

/* 备份列表 */
.backup-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.info-text {
  font-size: 14px;
  color: #666;
}

.container.dark .info-text {
  color: #999;
}

.backup-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.container.dark .backup-item {
  background: #1c1c1e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.backup-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backup-icon {
  font-size: 24px;
}

.backup-details {
  display: flex;
  flex-direction: column;
}

.backup-time {
  font-size: 14px;
  color: #333;
}

.container.dark .backup-time {
  color: #f2f2f7;
}

.backup-size {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.backup-actions {
  display: flex;
  gap: 16px;
}

.action-text.download {
  color: #007aff;
}

.action-text.delete {
  color: #ff3b30;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.container.dark .empty-text {
  color: #999;
}

.empty-hint {
  font-size: 14px;
  color: #999;
}
```

---

### Task 4: 创建云函数（如需要）

**Files:**
- Create: `cloudfunctions/getOpenId/index.js`
- Create: `cloudfunctions/backupOps/index.js`

**Steps:**

- [ ] **Step 1: 创建 getOpenId 云函数**

创建 `cloudfunctions/getOpenId/index.js`：

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
```

- [ ] **Step 2: 创建 package.json**

创建 `cloudfunctions/getOpenId/package.json`：

```json
{
  "name": "getOpenId",
  "version": "1.0.0",
  "description": "获取用户openid",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

---

### Task 5: 测试与调试

**Steps:**

- [ ] **Step 1: 配置云开发环境**

1. 在微信开发者工具中开通云开发
2. 创建云环境，获取环境ID
3. 创建 `backups` 集合
4. 配置集合权限

- [ ] **Step 2: 测试上传功能**

```javascript
// 在云端控制台调用
wx.cloud.init({ env: 'your-env-id' })
const result = await wx.cloud.callFunction({ name: 'uploadToCloud' })
```

- [ ] **Step 3: 测试下载功能**

```javascript
// 测试从列表选择并下载
const backups = await listUserBackups()
const data = await downloadFromCloud(backups[0].backupId)
```

- [ ] **Step 4: 测试删除功能**

```javascript
// 测试删除并验证列表更新
await deleteBackup(backupId)
const newList = await listUserBackups()
```

---

## 实施检查清单

- [ ] manifest.json 已添加 `"cloud": true`
- [ ] App.vue 已添加云开发初始化代码
- [ ] utils/cloudBackup.js 已创建并导出核心函数
- [ ] pages/backup/backup.vue 已添加云端备份UI
- [ ] 云数据库集合 `backups` 已创建
- [ ] 云函数已部署（如需要）
- [ ] 上传功能测试通过
- [ ] 下载功能测试通过
- [ ] 删除功能测试通过
- [ ] 边界情况测试（满3条、网络错误等）

---

## 注意事项

1. **云环境ID**: 需要在微信开发者工具中创建云环境并获取ID
2. **权限配置**: 确保云数据库的读写权限配置正确
3. **网络错误处理**: 所有网络操作都需要添加错误处理和用户提示
4. **免费额度**: 监控云开发的使用量，避免超出免费额度
5. **兼容性**: 确保在未开通云开发的环境下仍能使用本地备份

---

**文档版本**: 1.0
**创建日期**: 2026-05-10
**预计工作量**: 约3-4小时
