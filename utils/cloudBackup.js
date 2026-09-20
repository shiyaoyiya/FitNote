import { CLOUD_DB_COLLECTION, CLOUD_STORAGE_PREFIX } from '@/utils/serverConfig.js'

const TEMPLATE_KEY = 'fitness_templates'
const ACTION_KEY = 'fitness_actions'
const DAYDATA_PREFIX = 'fitness_daydata_'
const BACKUP_VERSION = '1.0'
const ANNIV_KEY = 'annivs'
const MAX_BACKUPS = 3

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getCloudUserId() {
  let userId = uni.getStorageSync('cloud_user_id')
  if (!userId) {
    userId = generateUUID()
    uni.setStorageSync('cloud_user_id', userId)
  }
  return userId
}

// 过滤 daydata 中的心率相关数据，减小备份文件大小
function filterDayData(dayData) {
  if (!dayData || typeof dayData !== 'object') return dayData
  
  // 需要排除的心率相关字段
  const heartRateFields = [
    'hrSamples',           // 心率采样数据
    'hrSamplesWithTs',     // 带时间戳的心率采样数据
    'heartRateAvg',        // 平均心率
    'heartRatePeak',       // 峰值心率
    'caloriesTotal',       // 卡路里消耗
    'durationSec',         // 训练时长
    'analysisResult',      // 训练分析结果
    'sessionStartTs',      // 训练开始时间戳
    'sessionEndTs',        // 训练结束时间戳
    'cardiovascularLoad',  // 心血管负荷
    'estimatedRestingHr',  // 估算的静息心率
  ]
  
  const filtered = {}
  
  for (const [key, value] of Object.entries(dayData)) {
    // 跳过心率相关字段
    if (heartRateFields.includes(key)) continue
    
    // 处理 templates 中的数据
    if (key === 'templates' && value && typeof value === 'object') {
      const filteredTemplates = {}
      for (const [tplName, tplData] of Object.entries(value)) {
        if (!tplData || typeof tplData !== 'object') {
          filteredTemplates[tplName] = tplData
          continue
        }
        
        const filteredTpl = {}
        for (const [tplKey, tplValue] of Object.entries(tplData)) {
          // 跳过模板中的心率相关字段
          if (heartRateFields.includes(tplKey)) continue
          filteredTpl[tplKey] = tplValue
        }
        filteredTemplates[tplName] = filteredTpl
      }
      filtered[key] = filteredTemplates
      continue
    }
    
    // 处理 entries 中的数据（移除 timestamp 字段）
    if (key === 'entries' && value && typeof value === 'object') {
      const filteredEntries = {}
      for (const [actionName, actionEntries] of Object.entries(value)) {
        if (!Array.isArray(actionEntries)) {
          filteredEntries[actionName] = actionEntries
          continue
        }
        
        filteredEntries[actionName] = actionEntries.map(entry => {
          if (!entry || typeof entry !== 'object') return entry
          
          const filteredEntry = {}
          for (const [entryKey, entryValue] of Object.entries(entry)) {
            // 跳过时间戳字段
            if (entryKey === 'timestamp') continue
            filteredEntry[entryKey] = entryValue
          }
          return filteredEntry
        })
      }
      filtered[key] = filteredEntries
      continue
    }
    
    filtered[key] = value
  }
  
  return filtered
}

function collectFullData() {
  const templates = uni.getStorageSync(TEMPLATE_KEY) || []
  const actions = uni.getStorageSync(ACTION_KEY) || []
  const rawAnnivs = uni.getStorageSync(ANNIV_KEY) || '[]'
  let annivs = []
  try {
    annivs = JSON.parse(rawAnnivs)
    if (!Array.isArray(annivs)) annivs = []
  } catch (e) {
    annivs = []
  }
  const info = uni.getStorageInfoSync()
  const daydata = {}
  info.keys.forEach(key => {
    if (key.startsWith(DAYDATA_PREFIX)) {
      const date = key.slice(DAYDATA_PREFIX.length)
      const value = uni.getStorageSync(key) || {}
      // 过滤心率相关数据，减小备份文件大小
      daydata[date] = filterDayData(value)
    }
  })
  const filteredTemplates = Array.isArray(templates) ? templates.filter(t => !t.isAerobic) : []
  return {
    version: BACKUP_VERSION,
    backupType: 'full',
    backupTime: new Date().toISOString(),
    data: {
      fitness_templates: filteredTemplates,
      fitness_actions: Array.isArray(actions) ? actions : [],
      fitness_annivs: Array.isArray(annivs) ? annivs : [],
      fitness_daydata: daydata
    }
  }
}

async function listUserBackups(page = 1, size = 20) {
  const userId = getCloudUserId()
  const db = wx.cloud.database()
  const countResult = await db.collection(CLOUD_DB_COLLECTION)
    .where({ userId, status: 'active' })
    .count()
  const total = countResult.total
  const result = await db.collection(CLOUD_DB_COLLECTION)
    .where({ userId, status: 'active' })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * size)
    .limit(size)
    .get()
  const list = result.data.map(item => ({
    ...item,
    id: item.backupId || item._id
  }))
  return { total, list }
}

async function countUserBackups() {
  const userId = getCloudUserId()
  const db = wx.cloud.database()
  const countResult = await db.collection(CLOUD_DB_COLLECTION)
    .where({ userId, status: 'active' })
    .count()
  return countResult.total
}

async function deleteOldestBackup() {
  const { list } = await listUserBackups(1, 100)
  if (list.length >= MAX_BACKUPS) {
    const oldest = list[list.length - 1]
    await deleteBackup(oldest.id)
  }
}

async function deleteBackup(backupId) {
  const userId = getCloudUserId()
  const db = wx.cloud.database()
  const record = await db.collection(CLOUD_DB_COLLECTION)
    .where({
      backupId,
      userId
    })
    .get()

  if (record.data && record.data.length > 0) {
    const backup = record.data[0]

    try {
      await wx.cloud.deleteFile({
        fileList: [backup.cloudPath]
      })
    } catch (e) {
      console.warn('删除云存储文件失败:', e)
    }

    await db.collection(CLOUD_DB_COLLECTION)
      .where({ backupId, userId })
      .update({
        data: {
          status: 'deleted'
        }
      })
  }
}

async function uploadToCloud({ onProgress, note, payload } = {}) {
  const count = await countUserBackups()
  if (count >= MAX_BACKUPS) {
    await deleteOldestBackup()
  }

  const backupData = payload || collectFullData()
  const userId = getCloudUserId()
  const timestamp = Date.now()
  const cloudPath = `${CLOUD_STORAGE_PREFIX}/${userId}/${timestamp}.json`

  onProgress && onProgress(20)

  const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_backup_${timestamp}.json`
  const fs = wx.getFileSystemManager()
  fs.writeFileSync(tempFilePath, JSON.stringify(backupData), 'utf8')

  onProgress && onProgress(50)

  const fileInfo = await new Promise((resolve, reject) => {
    fs.getFileInfo({
      filePath: tempFilePath,
      success: resolve,
      fail: reject
    })
  })

  const uploadResult = await wx.cloud.uploadFile({
    filePath: tempFilePath,
    cloudPath: cloudPath
  })

  onProgress && onProgress(80)

  const db = wx.cloud.database()
  const backupId = generateUUID()
  await db.collection(CLOUD_DB_COLLECTION).add({
    data: {
      backupId,
      userId,
      createdAt: timestamp,
      size: fileInfo.size,
      cloudPath: uploadResult.fileID,
      cloudPathRaw: cloudPath,
      note: note || '',
      status: 'active'
    }
  })

  fs.unlinkSync(tempFilePath)

  onProgress && onProgress(100)

  return {
    backupId,
    createdAt: timestamp,
    cloudPath
  }
}

async function downloadFromCloud(backupId) {
  const userId = getCloudUserId()
  const db = wx.cloud.database()
  const record = await db.collection(CLOUD_DB_COLLECTION)
    .where({
      backupId,
      userId
    })
    .get()

  if (!record.data || record.data.length === 0) {
    throw new Error('备份记录不存在')
  }

  const backup = record.data[0]
  const fileID = backup.cloudPath || backup.cloudPathRaw

  const downloadResult = await wx.cloud.downloadFile({ fileID })

  const fs = wx.getFileSystemManager()

  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath: downloadResult.tempFilePath,
      encoding: 'utf8',
      success: (r) => {
        try {
          const backupData = JSON.parse(r.data)
          resolve(backupData)
        } catch (e) {
          reject(new Error('备份文件解析失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export {
  listUserBackups,
  listUserBackups as listCloudBackups,
  countUserBackups,
  uploadToCloud,
  downloadFromCloud,
  deleteBackup,
  deleteBackup as deleteCloudBackup,
  deleteOldestBackup,
  collectFullData
}
