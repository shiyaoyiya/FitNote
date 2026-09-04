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
      daydata[date] = value
    }
  })
  return {
    version: BACKUP_VERSION,
    backupType: 'full',
    backupTime: new Date().toISOString(),
    data: {
      fitness_templates: Array.isArray(templates) ? templates : [],
      fitness_actions: Array.isArray(actions) ? actions : [],
      fitness_annivs: Array.isArray(annivs) ? annivs : [],
      fitness_daydata: daydata
    }
  }
}

async function getOpenId() {
  const result = await wx.cloud.callFunction({
    name: 'getOpenId',
  })
  return result.result.openid
}

async function listUserBackups() {
  const openid = await getOpenId()
  const db = wx.cloud.database()
  const result = await db.collection('backups')
    .where({
      _openid: openid,
      status: 'active'
    })
    .orderBy('createdAt', 'desc')
    .get()
  return result.data
}

async function countUserBackups() {
  const openid = await getOpenId()
  const db = wx.cloud.database()
  const countResult = await db.collection('backups')
    .where({
      _openid: openid,
      status: 'active'
    })
    .count()
  return countResult.total
}

async function deleteOldestBackup() {
  const backups = await listUserBackups()
  if (backups.length >= MAX_BACKUPS) {
    const oldest = backups[backups.length - 1]
    await deleteBackup(oldest.backupId)
  }
}

async function deleteBackup(backupId) {
  const openid = await getOpenId()
  const db = wx.cloud.database()
  const record = await db.collection('backups')
    .where({
      backupId: backupId,
      _openid: openid
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

    await db.collection('backups')
      .where({ backupId: backupId })
      .update({
        data: {
          status: 'deleted'
        }
      })
  }
}

async function uploadToCloud() {
  const openid = await getOpenId()
  const count = await countUserBackups()
  if (count >= MAX_BACKUPS) {
    await deleteOldestBackup()
  }

  const backupData = collectFullData()
  const timestamp = Date.now()
  const cloudPath = `backups/${openid}/${timestamp}.json`

  const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_backup_${timestamp}.json`
  const fs = wx.getFileSystemManager()
  fs.writeFileSync(tempFilePath, JSON.stringify(backupData), 'utf8')

  const fileInfo = fs.getFileInfo({
    filePath: tempFilePath
  })

  const uploadResult = await wx.cloud.uploadFile({
    filePath: tempFilePath,
    cloudPath: cloudPath
  })

  const db = wx.cloud.database()
  await db.collection('backups').add({
    data: {
      backupId: generateUUID(),
      createdAt: timestamp,
      size: fileInfo.size,
      cloudPath: cloudPath,
      status: 'active'
    }
  })

  fs.unlinkSync(tempFilePath)

  return {
    backupId: generateUUID(),
    createdAt: timestamp,
    cloudPath: cloudPath
  }
}

async function downloadFromCloud(backupId) {
  const openid = await getOpenId()
  const db = wx.cloud.database()
  const record = await db.collection('backups')
    .where({
      backupId: backupId,
      _openid: openid
    })
    .get()

  if (!record.data || record.data.length === 0) {
    throw new Error('备份记录不存在')
  }

  const backup = record.data[0]

  const fileContent = await wx.cloud.downloadFile({
    fileID: backup.cloudPath
  })

  const fs = wx.getFileSystemManager()
  const tempFilePath = `${wx.env.USER_DATA_PATH}/cloud_backup_temp.json`

  return new Promise((resolve, reject) => {
    fs.writeFile({
      filePath: tempFilePath,
      data: fileContent.content,
      encoding: 'utf8',
      success: () => {
        const content = fs.readFileSync(tempFilePath, 'utf8')
        const backupData = JSON.parse(content)
        fs.unlinkSync(tempFilePath)
        resolve(backupData)
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
  getOpenId,
  collectFullData
}
