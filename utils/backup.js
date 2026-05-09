const BACKUP_CONFIG_KEY = 'backup_config'
const TEMPLATE_KEY = 'fitness_templates'
const ACTION_KEY = 'fitness_actions'
const DAYDATA_PREFIX = 'fitness_daydata_'
const BACKUP_VERSION = '1.0'
const ANNIV_KEY = 'annivs'
const INDEX_KEY = 'fitness_index'
export function getBackupConfig() {
  const raw = uni.getStorageSync(BACKUP_CONFIG_KEY)
  if (raw && typeof raw === 'object') {
    const config = {
      ...raw
    }
    if (!Array.isArray(config.backupHistory)) {
      config.backupHistory = []
    }
    return config
  }
  return {
    defaultPath: '',
    lastBackupTime: '',
    backupHistory: []
  }
}



export function saveBackupConfig(cfg) {
  uni.setStorageSync(BACKUP_CONFIG_KEY, cfg)
}



function getStorageInfo() {
  try {
    return uni.getStorageInfoSync()
  } catch (e) {
    return {
      keys: []
    }
  }
}



function collectFullData() {
  const templates = uni.getStorageSync(TEMPLATE_KEY) || []
  const actions = uni.getStorageSync(ACTION_KEY) || []
  // 收集纪念日数据
  const rawAnnivs = uni.getStorageSync(ANNIV_KEY) || '[]'
  let annivs = []
  try {
    annivs = JSON.parse(rawAnnivs)
    if (!Array.isArray(annivs)) annivs = []
  } catch (e) {
    annivs = []
  }
  const info = getStorageInfo()
  const daydata = {}
  info.keys.forEach(key => {
    if (key.startsWith(DAYDATA_PREFIX)) {
      const date = key.slice(DAYDATA_PREFIX.length)
      const value = uni.getStorageSync(key) || {}
      daydata[date] = value
    }
  })
  return {
    fitness_templates: Array.isArray(templates) ? templates : [],
    fitness_actions: Array.isArray(actions) ? actions : [],
    fitness_annivs: Array.isArray(annivs) ? annivs : [],
    fitness_daydata: daydata
  }
}



function parseDateString(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d
}



function collectIncrementalData(lastBackupTime) {
  if (!lastBackupTime) {
    return collectFullData()
  }
  const last = parseDateString(lastBackupTime)
  if (!last) {
    return collectFullData()
  }
  const templates = uni.getStorageSync(TEMPLATE_KEY) || []
  const actions = uni.getStorageSync(ACTION_KEY) || []
  // 收集纪念日数据
  const rawAnnivs = uni.getStorageSync(ANNIV_KEY) || '[]'
  let annivs = []
  try {
    annivs = JSON.parse(rawAnnivs)
    if (!Array.isArray(annivs)) annivs = []
  } catch (e) {
    annivs = []
  }
  const info = getStorageInfo()
  const daydata = {}
  info.keys.forEach(key => {
    if (!key.startsWith(DAYDATA_PREFIX)) return
    const dateStr = key.slice(DAYDATA_PREFIX.length)
    const d = parseDateString(dateStr)
    if (!d) return
    if (d.getTime() > last.getTime()) {
      const value = uni.getStorageSync(key) || {}
      daydata[dateStr] = value
    }
  })
  return {
    fitness_templates: Array.isArray(templates) ? templates : [],
    fitness_actions: Array.isArray(actions) ? actions : [],
    fitness_annivs: Array.isArray(annivs) ? annivs : [],
    fitness_daydata: daydata
  }
}



// 核心工具函数：判断环境

function isH5() {
  // #ifdef H5
  return true
  // #endif
  return false
}



function isApp() {
  // #ifdef APP-PLUS
  return true
  // #endif
  return false
}



export function isAndroidApp() {
  try {
    return isApp() && typeof plus !== 'undefined' && plus.os && plus.os.name === 'Android'
  } catch (e) {
    return false
  }
}




// 辅助函数：解析Uri字符串为用户友好的路径
function decodeUriToPath(uriString) {
  if (!uriString) return ''
  try {
    // 简单解析Uri，提取路径信息
    if (uriString.startsWith('content://')) {
      // 提取最后一部分作为路径标识
      const parts = uriString.split('/')
      const lastPart = parts[parts.length - 1]
      return lastPart.replace(/%20/g, ' ')
    } else if (uriString.startsWith('file://')) {
      return uriString.substring(7)
    }
  } catch (e) {
    // 解析失败时返回原始字符串的一部分
    return uriString.substring(0, 30) + (uriString.length > 30 ? '...' : '')
  }
  return uriString
}



function getDefaultDir() {
  // App 环境
  if (isApp()) {
    return '' // App 环境下路径由系统管理或动态生成，不预设固定路径
  }
  // 小程序环境
  if (typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH) {
    return wx.env.USER_DATA_PATH
  }
  // H5环境
  return ''
}



// H5 专用：下载字符串为文件
function downloadForH5(content, fileName) {
  const blob = new Blob([content], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}



function writeBackupFile(payload, customPath) {
  return new Promise((resolve, reject) => {
    // 获取当前时间
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    // 新格式：训练备份-年-月-日-时:分:秒.json
    const fileName = `训练备份-${year}-${month}-${day}-${hours}:${minutes}:${seconds}.json`
    const content = JSON.stringify(payload)

    // 1. H5 环境
    if (isH5()) {
      try {
        downloadForH5(content, fileName)
        resolve(fileName)
      } catch (e) {
        console.error('H5下载失败:', e)
        reject(e)
      }
      return
    }

    // 2. Android SAF 自定义路径处理
    if (isApp() && isAndroidApp() && customPath && customPath.startsWith('content://')) {
      // 先检查权限有效性
      checkSAFPermission(customPath).then(hasPermission => {
        if (!hasPermission) {
          // 使用ACTION_CREATE_DOCUMENT作为回退
          writeWithCreateDocument(content, fileName).then(resolve).catch(err => {
            writeBackupDefault(content, fileName, resolve, reject)
          })
          return
        }

        try {
          const main = plus.android.runtimeMainActivity()
          const Uri = plus.android.importClass('android.net.Uri')
          const DocumentFile = plus.android.importClass('androidx.documentfile.provider.DocumentFile')

          const parentUri = Uri.parse(customPath)
          const resolver = main.getContentResolver()
          const parentDocFile = DocumentFile.fromTreeUri(main, parentUri)

          if (parentDocFile && parentDocFile.isDirectory() && parentDocFile.canWrite()) {
            // 创建文件
            const targetDocFile = parentDocFile.createFile('application/json', fileName)

            if (targetDocFile) {
              const fileUri = targetDocFile.getUri()
              const outputStream = resolver.openOutputStream(fileUri)

              if (outputStream) {
                const String = plus.android.importClass('java.lang.String')
                const javaString = new String(content)
                const bytes = javaString.getBytes("UTF-8")

                plus.android.invoke(outputStream, "write", bytes)
                plus.android.invoke(outputStream, "flush")
                plus.android.invoke(outputStream, "close")

                const savedUri = fileUri.toString()
                resolve(savedUri)
                return
              } else {
                throw new Error('无法打开输出流')
              }
            } else {
              throw new Error('无法创建文件，请检查权限')
            }
          } else {
            throw new Error('选择的文件夹不可写或不是目录')
          }
        } catch (err) {
          // 回退到CREATE_DOCUMENT方式
          writeWithCreateDocument(content, fileName).then(resolve).catch(err2 => {
            writeBackupDefault(content, fileName, resolve, reject)
          })
        }
      }).catch(err => {
        writeBackupDefault(content, fileName, resolve, reject)
      })

      return
    }

    // 3. 默认写入逻辑
    writeBackupDefault(content, fileName, resolve, reject)
  })
}


// ACTION_CREATE_DOCUMENT写入方式 - 修复版本
export function writeWithCreateDocument(content, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const main = plus.android.runtimeMainActivity()
      const Intent = plus.android.importClass('android.content.Intent')

      const intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      intent.setType("application/json")
      intent.putExtra(Intent.EXTRA_TITLE, fileName)

      const REQUEST_CODE = 1005
      const g = typeof globalThis !== 'undefined' ? globalThis : {}

      // 清除之前的回调
      if (g._createDocResolve) g._createDocResolve = null
      if (g._createDocReject) g._createDocReject = null

      // 保存content，以便在回调中使用
      g._createDocContent = content
      g._createDocFileName = fileName

      const timeoutId = setTimeout(() => {
        if (g._createDocReject) {
          g._createDocReject(new Error('创建文档超时'))
          g._createDocReject = null
          g._createDocResolve = null
          g._createDocContent = null
          g._createDocFileName = null
        }
      }, 30000)

      g._createDocResolve = (fileUri) => {
        clearTimeout(timeoutId)
        // 清除保存的数据
        const content = g._createDocContent
        g._createDocContent = null
        g._createDocFileName = null

        if (!content) {
          reject(new Error('内容丢失'))
          return
        }

        // 在新的上下文中写入文件
        try {
          const main = plus.android.runtimeMainActivity()
          const Uri = plus.android.importClass('android.net.Uri')
          const String = plus.android.importClass('java.lang.String')

          const uri = Uri.parse(fileUri)
          const resolver = main.getContentResolver()
          const outputStream = plus.android.invoke(resolver, "openOutputStream", uri)

          if (outputStream) {
            const javaString = new String(content)
            const bytes = javaString.getBytes("UTF-8")

            plus.android.invoke(outputStream, "write", bytes)
            plus.android.invoke(outputStream, "flush")
            plus.android.invoke(outputStream, "close")

            resolve(fileUri)
          } else {
            reject(new Error('无法打开输出流'))
          }
        } catch (err) {
          console.error('写入文件失败:', err)
          reject(err)
        }
      }

      g._createDocReject = (err) => {
        clearTimeout(timeoutId)
        g._createDocContent = null
        g._createDocFileName = null
        reject(err)
      }

      main.startActivityForResult(intent, REQUEST_CODE)
    } catch (err) {
      console.error('启动CREATE_DOCUMENT失败:', err)
      reject(err)
    }
  })
}

// 默认写入逻辑 - 确保文件正确写入
export function writeBackupDefault(content, fileName, resolve, reject) {
  if (isApp() && typeof plus !== 'undefined') {
    // 优先尝试PRIVATE_DOC目录
    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function (fs) {
      fs.root.getFile(fileName, {
        create: true
      }, function (fileEntry) {
        fileEntry.createWriter(function (writer) {
          writer.onwrite = function () {
            const fullPath = fileEntry.fullPath
            // 验证文件大小
            fileEntry.file(function (file) {
              if (file.size === 0) {
                // 重新尝试写入
                writer.seek(0)
                writer.write(content)
              } else {
                resolve(fullPath)
              }
            }, function (err) {
              resolve(fullPath) // 即使获取大小失败，也认为写入成功
            })
          }
          writer.onerror = function (e) {
            reject(new Error('写入文件失败: ' + e.message))
          }
          writer.write(content)
        }, function (e) {
          reject(new Error('创建写入器失败: ' + e.message))
        })
      }, function (e) {
        reject(new Error('创建文件失败: ' + e.message))
      })
    }, function (e2) {
      reject(new Error('请求文件系统失败: ' + e2.message))
    })
  } else if (typeof uni.getFileSystemManager === 'function') {
    // 小程序环境
    const fs = uni.getFileSystemManager()
    const dir = getDefaultDir()
    const filePath = dir ? `${dir}/${fileName}` : fileName
    fs.writeFile({
      filePath,
      data: content,
      encoding: 'utf8',
      success() {
        resolve(filePath)
      },
      fail(err) {
        reject(err)
      }
    })
  } else {
    reject(new Error('当前环境不支持文件写入操作'))
  }
}

// 检查SAF权限是否有效
export function checkSAFPermission(folderUri) {
  return new Promise((resolve, reject) => {
    if (!isApp() || !isAndroidApp()) {
      resolve(false)
      return
    }

    // 方法1：尝试直接读取文件夹来检查权限
    listBackupFilesFromSAF(folderUri)
      .then(files => {
        resolve(files.length >= 0) // 只要有结果（即使是空数组）就表示有权限
      })
      .catch(err => {
        resolve(false) // 读取失败，表示没有权限
      })
  })
}

export async function listBackupFilesFromSAF(folderUri) {
  return new Promise((resolve, reject) => {
    if (!isApp() || !isAndroidApp()) {
      reject(new Error('仅Android App环境支持'))
      return
    }

    if (!folderUri || !folderUri.startsWith('content://')) {
      reject(new Error('无效的SAF URI'))
      return
    }

    try {
      const main = plus.android.runtimeMainActivity()
      const Uri = plus.android.importClass('android.net.Uri')

      const uri = Uri.parse(folderUri)
      const resolver = main.getContentResolver()

      // 使用ContentResolver直接查询
      const cursor = resolver.query(
        uri,
        null, // 返回所有列
        null, // 不筛选
        null, // 不筛选
        null // 不排序
      )

      if (cursor) {
        const files = []
        try {
          // 获取列名
          const displayNameIndex = plus.android.invoke(cursor, "getColumnIndex", "_display_name")
          const sizeIndex = plus.android.invoke(cursor, "getColumnIndex", "_size")
          const lastModifiedIndex = plus.android.invoke(cursor, "getColumnIndex", "last_modified")

          while (plus.android.invoke(cursor, "moveToNext")) {
            const displayName = displayNameIndex >= 0 ?
              plus.android.invoke(cursor, "getString", displayNameIndex) : null
            const size = sizeIndex >= 0 ?
              plus.android.invoke(cursor, "getLong", sizeIndex) : 0
            const lastModified = lastModifiedIndex >= 0 ?
              plus.android.invoke(cursor, "getLong", lastModifiedIndex) : Date.now()

            if (displayName && displayName.endsWith('.json')) {
              // 获取文档ID
              const documentIdIndex = plus.android.invoke(cursor, "getColumnIndex", "document_id")
              const documentId = documentIdIndex >= 0 ?
                plus.android.invoke(cursor, "getString", documentIdIndex) : null

              let fileUri = folderUri
              if (documentId) {
                // 构建完整的文件URI
                fileUri = folderUri.replace(/\/tree\/[^/]+/, '/document/' + documentId)
              }

              files.push({
                name: displayName,
                uri: fileUri,
                lastModified: lastModified,
                size: size
              })
            }
          }
        } finally {
          plus.android.invoke(cursor, "close")
        }

        resolve(files)
      } else {
        resolve([]) // 返回空数组，而不是拒绝
      }

    } catch (err) {
      console.error('访问SAF文件夹异常:', err)

      // 如果是DocumentFile类导入失败，给出明确提示
      if (err.message.includes('DocumentFile') || err.message.includes('importClass')) {
        resolve([]) // 返回空数组，而不是拒绝
      } else {
        reject(err)
      }
    }
  })
}
// 在backup.js中添加
export function scanBackupFilesAlternative(folderPath) {
  return new Promise((resolve, reject) => {
    if (!folderPath) {
      resolve([])
      return
    }

    // 如果是content://格式，尝试解析为普通路径
    if (folderPath.startsWith('content://')) {
      try {
        // 尝试从content://格式解析出普通路径
        const match = folderPath.match(
          /content:\/\/com\.android\.externalstorage\.documents\/tree\/primary%3A(.+)$/)
        if (match && match[1]) {
          const decoded = decodeURIComponent(match[1])
          const androidPath = `/storage/emulated/0/${decoded}`

          // 尝试通过普通路径访问
          plus.io.resolveLocalFileSystemURL(androidPath, (entry) => {
            if (entry.isDirectory) {
              const reader = entry.createReader()
              reader.readEntries((entries) => {
                const files = entries
                  .filter(entry => entry.isFile && entry.name.endsWith('.json'))
                  .map(entry => ({
                    name: entry.name,
                    path: entry.fullPath,
                    lastModified: entry.lastModifiedDate ? entry.lastModifiedDate.getTime() : Date
                      .now(),
                    size: entry.size || 0
                  }))
                resolve(files)
              }, reject)
            } else {
              resolve([])
            }
          }, (err) => {
            resolve([])
          })
          return
        }
      } catch (e) {
        console.error('解析路径失败:', e)
      }
    }

    // 默认返回空数组
    resolve([])
  })
}
// 检查并重新获取SAF权限
export async function ensureSAFPermission(folderUri) {
  return new Promise((resolve, reject) => {
    if (!isApp() || !isAndroidApp()) {
      resolve(false)
      return
    }

    try {
      const main = plus.android.runtimeMainActivity()
      const Uri = plus.android.importClass('android.net.Uri')
      const DocumentFile = plus.android.importClass('androidx.documentfile.provider.DocumentFile')
      const Intent = plus.android.importClass('android.content.Intent')

      const uri = Uri.parse(folderUri)

      // 尝试获取持久化权限
      try {
        const takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION |
          Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        main.getContentResolver().takePersistableUriPermission(uri, takeFlags)
      } catch (e) {
        console.warn('获取持久化权限失败:', e)
      }

      // 检查权限是否有效
      const docFile = DocumentFile.fromTreeUri(main, uri)
      if (docFile && docFile.exists() && docFile.canRead()) {
        resolve(true)
      } else {
        resolve(false)
      }
    } catch (err) {
      console.error('检查SAF权限失败:', err)
      resolve(false)
    }
  })
}

// 重新请求SAF权限
export function requestSAFPermissionAgain() {
  return new Promise((resolve, reject) => {
    if (!isApp() || !isAndroidApp()) {
      reject(new Error('仅Android App环境支持'))
      return
    }

    try {
      const main = plus.android.runtimeMainActivity()
      const Intent = plus.android.importClass('android.content.Intent')

      const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
      intent.addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION |
        Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
        Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
      )

      const REQUEST_CODE = 1003 // 确保这是1003
      const g = typeof globalThis !== 'undefined' ? globalThis : {}

      // 清除之前的回调
      if (g._safPermissionResolve) g._safPermissionResolve = null
      if (g._safPermissionReject) g._safPermissionReject = null

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (g._safPermissionReject) {
          g._safPermissionReject(new Error('权限请求超时'))
        }
      }, 30000)

      g._safPermissionResolve = (uri) => {
        clearTimeout(timeoutId)
        resolve(uri)
      }

      g._safPermissionReject = (err) => {
        clearTimeout(timeoutId)
        reject(err)
      }

      main.startActivityForResult(intent, REQUEST_CODE)

    } catch (err) {
      console.error('请求SAF权限失败:', err)
      reject(err)
    }
  })
}
// 解码路径（处理URL编码）
export function decodeBackupPath(encodedPath) {
  if (!encodedPath) return ''

  try {
    // 解码URL编码
    const decoded = decodeURIComponent(encodedPath)
    return decoded
  } catch (e) {
    console.warn('路径解码失败:', e)
    return encodedPath
  }
}
export function chooseBackupFile() {
  return new Promise((resolve, reject) => {
    if (!isApp() || !isAndroidApp()) {
      reject(new Error('仅Android App环境支持'))
      return
    }

    try {
      const main = plus.android.runtimeMainActivity()
      const Intent = plus.android.importClass('android.content.Intent')

      // 使用ACTION_OPEN_DOCUMENT来选择单个文件
      const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      intent.setType("application/json")
      intent.addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION |
        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
      )

      const REQUEST_CODE = 1002 // 与文件夹选择使用不同的请求码
      const g = typeof globalThis !== 'undefined' ? globalThis : {}

      // 清除之前的回调
      if (g._safFileResolve) g._safFileResolve = null
      if (g._safFileReject) g._safFileReject = null

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (g._safFileReject) {
          g._safFileReject(new Error('选择文件超时'))
          g._safFileReject = null
          g._safFileResolve = null
        }
      }, 30000)

      g._safFileResolve = (fileUri) => {
        clearTimeout(timeoutId)
        resolve(fileUri)
      }

      g._safFileReject = (err) => {
        clearTimeout(timeoutId)
        reject(err)
      }

      main.startActivityForResult(intent, REQUEST_CODE)

    } catch (err) {
      console.error('启动SAF文件选择器失败:', err)
      reject(new Error('启动文件选择器失败: ' + err.message))
    }
  })
}

export function loadBackupConfig() {
  return getBackupConfig()
}



export async function backupData(backupType) {
  const cfg = getBackupConfig()
  const nowIso = new Date().toISOString()
  const type = backupType === 'incremental' ? 'incremental' : 'full'
  const data = type === 'incremental' ?
    collectIncrementalData(cfg.lastBackupTime) :
    collectFullData()

  const payload = {
    version: BACKUP_VERSION,
    backupType: type,
    backupTime: nowIso,
    lastBackupTime: type === 'incremental' ? cfg.lastBackupTime || '' : '',
    data,
    metadata: {
      appVersion: '',
      deviceInfo: ''
    }
  }

  try {
    // 尝试备份到SAF路径
    let safPath = null

    // 如果设置了SAF路径，尝试备份到SAF路径
    if (cfg.defaultPath && cfg.defaultPath.startsWith('content://')) {
      try {
        safPath = await writeBackupFile(payload, cfg.defaultPath)
      } catch (safErr) {
        console.warn('SAF备份失败:', safErr.message)
      }
    }

    const historyItem = {
      time: nowIso,
      type,
      safPath: safPath, // SAF路径可能为空
      path: safPath // 主路径使用SAF路径
    }

    const nextCfg = getBackupConfig()
    nextCfg.lastBackupTime = nowIso

    const list = Array.isArray(nextCfg.backupHistory) ?
      nextCfg.backupHistory.slice() : []
    list.unshift(historyItem)
    nextCfg.backupHistory = list.slice(0, 20)

    saveBackupConfig(nextCfg)

    return {
      safPath,
      path: safPath,
      backupHistory: nextCfg.backupHistory
    }
  } catch (error) {
    console.error('备份失败:', error)
    throw error
  }
}



// 从文件URI提取文件夹URI
export function getFolderUriFromFileUri(fileUri) {
  if (!fileUri || !fileUri.startsWith('content://')) {
    return fileUri
  }

  try {
    // 匹配 content://authority/tree/primary:folder/document/primary:folder/file.json
    const match = fileUri.match(/^(content:\/\/[^/]+\/tree\/[^/]+)(?:\/document\/[^/]+)?$/)
    if (match && match[1]) {
      return match[1]
    }
  } catch (e) {
    console.warn('提取文件夹URI失败:', e)
  }

  return fileUri
}

// 检查URI是否是文件夹
export function isFolderUri(uri) {
  return uri && uri.startsWith('content://') && uri.includes('/tree/')
}

function clearAllData() {
  const info = getStorageInfo()
  info.keys.forEach(key => {
    if (key === TEMPLATE_KEY || key === ACTION_KEY || key === ANNIV_KEY || key === INDEX_KEY || key.startsWith(DAYDATA_PREFIX)) {
      uni.removeStorageSync(key)
    }
  })
}



function mergeArraysUnique(arrA, arrB) {
  const a = Array.isArray(arrA) ? arrA.slice() : []
  const b = Array.isArray(arrB) ? arrB : []
  b.forEach(item => {
    if (!a.some(x => JSON.stringify(x) === JSON.stringify(item))) {
      a.push(item)
    }
  })
  return a
}

const LEGACY_CATEGORY_MAP = { core: 'abs', cardio: 'abs', other: 'abs' }

const CATEGORY_KEYWORDS = {
  chest: ['卧推', '飞鸟', '夹胸', '上斜', '下斜', '哑铃卧推', '杠铃卧推', '胸'],
  back: ['引体', '划船', '下拉', '硬拉', '高位下拉', '坐姿划船', '背'],
  shoulders: ['推举', '侧平举', '前平举', '耸肩', '肩'],
  arms: ['弯举', '臂屈伸', '锤式', '绳索', '肱二', '肱三', '手臂', '二头', '三头'],
  legs: ['深蹲', '腿举', '腿弯举', '腿屈伸', '弓箭步', '臀推', '腿'],
  abs: ['卷腹', '平板', '举腿', '俄罗斯', '核心', '腹'],
}

const CATEGORY_NAMES = {
  chest: '胸部', back: '背部', shoulders: '肩部',
  arms: '手臂', legs: '腿部', abs: '腹部',
}

function detectCategoryByName(name) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) return category
    }
  }
  return 'abs'
}

function getCategoryName(categoryId) {
  return CATEGORY_NAMES[categoryId] || '腹部'
}

function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function migrateActionsIfNeeded(rawActions) {
  if (!Array.isArray(rawActions)) return []
  if (rawActions.length === 0) return []
  if (typeof rawActions[0] === 'string') {
    return rawActions.map(name => {
      const cat = detectCategoryByName(name)
      return {
        id: generateId(),
        name: name,
        categories: [cat],
        subcategories: {},
        categoryName: getCategoryName(cat),
        createdAt: new Date().toISOString(),
      }
    })
  }
  if (typeof rawActions[0] === 'object') {
    return rawActions.map(a => {
      let cats = a.categories
      if (!cats || !Array.isArray(cats) || cats.length === 0) {
        const oldCat = a.category || detectCategoryByName(a.name)
        const mapped = LEGACY_CATEGORY_MAP[oldCat] || oldCat
        cats = [mapped]
      } else {
        cats = cats.map(c => LEGACY_CATEGORY_MAP[c] || c)
      }
      return {
        id: a.id || generateId(),
        name: a.name,
        categories: cats,
        subcategories: a.subcategories || {},
        categoryName: getCategoryName(cats[0]),
        createdAt: a.createdAt || new Date().toISOString(),
      }
    })
  }
  return rawActions
}



export function readBackupFile(filePath) {
  return new Promise((resolve, reject) => {
    if (isH5() && (filePath instanceof Blob || filePath instanceof File)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result)
          resolve(obj)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = (err) => reject(err)
      reader.readAsText(filePath)
      return
    }

    if (isApp() && typeof plus !== 'undefined') {
      if (typeof filePath === 'string' && filePath.startsWith('content://')) {
        // 对于SAF URI，使用ContentResolver读取
        try {
          const main = plus.android.runtimeMainActivity()
          const Uri = plus.android.importClass('android.net.Uri')
          const InputStreamReader = plus.android.importClass('java.io.InputStreamReader')
          const BufferedReader = plus.android.importClass('java.io.BufferedReader')
          const StringBuilder = plus.android.importClass('java.lang.StringBuilder')

          const resolver = main.getContentResolver()
          const uri = Uri.parse(filePath)

          // 使用plus.android.invoke调用Java实例方法
          const inputStream = plus.android.invoke(resolver, "openInputStream", uri)

          if (!inputStream) {
            reject(new Error('无法打开输入流，文件可能不存在'))
            return
          }

          const isr = new InputStreamReader(inputStream, 'utf-8')
          const br = new BufferedReader(isr)
          const sb = new StringBuilder()

          let line = plus.android.invoke(br, "readLine")
          while (line !== null) {
            sb.append(line)
            line = plus.android.invoke(br, "readLine")
          }

          // 使用invoke关闭流
          plus.android.invoke(br, "close")
          plus.android.invoke(isr, "close")
          plus.android.invoke(inputStream, "close")

          const content = plus.android.invoke(sb, "toString")
          console.log('文件内容长度:', content.length)

          if (content.length === 0) {
            reject(new Error('备份文件为空，可能是0字节文件'))
            return
          }

          const obj = JSON.parse(content)
          resolve(obj)

        } catch (err) {
          console.error('通过ContentResolver读取失败:', err)
          reject(new Error('读取备份文件失败: ' + err.message))
        }
        return
      }

      // 非content://格式的本地文件路径
      console.log('读取本地文件:', filePath)
      plus.io.resolveLocalFileSystemURL(filePath, function (entry) {
        entry.file(function (file) {
          // 检查文件大小
          if (file.size === 0) {
            reject(new Error('备份文件为空，可能是0字节文件'))
            return
          }

          var fileReader = new plus.io.FileReader()
          fileReader.onloadend = function (evt) {
            try {
              const obj = JSON.parse(evt.target.result)
              resolve(obj)
            } catch (e) {
              reject(e)
            }
          }
          fileReader.onerror = function (e) {
            reject(new Error('读取文件失败: ' + e.message))
          }
          fileReader.readAsText(file, 'utf-8')
        }, function (e) {
          reject(new Error('获取文件对象失败: ' + e.message))
        })
      }, function (e) {
        reject(new Error('未找到文件: ' + e.message))
      })
      return
    }

    if (typeof uni.getFileSystemManager === 'function') {
      const fs = uni.getFileSystemManager()
      fs.readFile({
        filePath,
        encoding: 'utf8',
        success(res) {
          try {
            const obj = JSON.parse(res.data)
            resolve(obj)
          } catch (e) {
            reject(e)
          }
        },
        fail(err) {
          reject(err)
        }
      })
    } else {
      reject(new Error('当前环境不支持文件读取'))
    }
  })
}

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份文件格式不正确')
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('备份文件缺少数据部分')
  }
  // 可选：验证备份版本
  if (!payload.version) {
    throw new Error('备份文件缺少版本信息')
  }
}


export async function restoreData(filePath, overwrite) {
  console.log('开始恢复数据，文件路径:', filePath)

  try {
    // 1. 读取文件
    const payload = await readBackupFile(filePath)
    console.log('文件读取成功，payload结构:', Object.keys(payload))

    // 2. 验证数据
    validateBackupPayload(payload)
    console.log('数据验证通过')

    // 3. 执行恢复
    const data = payload.data || {}
    const tplArr = Array.isArray(data.fitness_templates) ? data.fitness_templates : []
    const actArr = migrateActionsIfNeeded(data.fitness_actions)
    const annivArr = Array.isArray(data.fitness_annivs) ? data.fitness_annivs : []
    const daydata = data.fitness_daydata || {}

    console.log('准备恢复数据:', {
      模板数量: tplArr.length,
      动作数量: actArr.length,
      纪念日数量: annivArr.length,
      天数数据: Object.keys(daydata).length
    })

    if (overwrite) {
      console.log('执行覆盖导入')
      clearAllData()
      uni.setStorageSync(TEMPLATE_KEY, tplArr)
      uni.setStorageSync(ACTION_KEY, actArr)
      uni.setStorageSync(ANNIV_KEY, JSON.stringify(annivArr))

      Object.keys(daydata).forEach(date => {
        const value = daydata[date] || {}
        uni.setStorageSync(DAYDATA_PREFIX + date, value)
      })

    } else {
      console.log('执行合并导入')
      const currentTpl = uni.getStorageSync(TEMPLATE_KEY) || []
      const currentAct = uni.getStorageSync(ACTION_KEY) || []
      const rawCurrentAnniv = uni.getStorageSync(ANNIV_KEY) || '[]'
      let currentAnniv = []
      try {
        currentAnniv = JSON.parse(rawCurrentAnniv)
        if (!Array.isArray(currentAnniv)) currentAnniv = []
      } catch (e) {
        currentAnniv = []
      }

      const mergedTpl = mergeArraysUnique(currentTpl, tplArr)
      const mergedAct = mergeArraysUnique(currentAct, actArr)
      const mergedAnniv = mergeArraysUnique(currentAnniv, annivArr)

      uni.setStorageSync(TEMPLATE_KEY, mergedTpl)
      uni.setStorageSync(ACTION_KEY, mergedAct)
      uni.setStorageSync(ANNIV_KEY, JSON.stringify(mergedAnniv))

      Object.keys(daydata).forEach(date => {
        const key = DAYDATA_PREFIX + date
        const existed = uni.getStorageSync(key) || {}
        const next = Object.assign({}, existed, daydata[date] || {})
        uni.setStorageSync(key, next)
      })
    }

    console.log('数据恢复完成')

  } catch (err) {
    console.error('恢复数据失败:', err)
    throw err
  }
}



export function getFriendlyBackupPath() {
  const cfg = getBackupConfig()
  const path = cfg.defaultPath || ''

  if (!path) {
    if (isH5()) {
      return '浏览器默认下载目录'
    }
    if (isApp()) {
      return '应用默认存储目录'
    }
    if (typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH) {
      return wx.env.USER_DATA_PATH
    }
    return '未设置路径'
  }

  console.log('解析路径:', {
    原始: path
  })

  // 对content://格式的URI进行友好显示
  if (path.startsWith('content://')) {
    try {
      // 解码URI
      const decoded = decodeURIComponent(path)
      console.log('解码后路径:', decoded)

      // 提取文件夹路径
      const match = decoded.match(/tree\/[^:]+:(.+)$/)
      if (match && match[1]) {
        const folderPath = match[1]
        // 替换编码字符
        const friendlyPath = folderPath
          .replace(/%2F/g, '/')
          .replace(/%3A/g, ':')
          .replace(/%20/g, ' ')

        console.log('提取的文件夹路径:', friendlyPath)

        if (friendlyPath) {
          return friendlyPath
        }
      }

      return '已选择文件夹'
    } catch (e) {
      console.warn('路径解析失败:', e)
      return '已选择文件夹'
    }
  }

  // 如果是文件路径
  if (path.startsWith('/storage/') || path.startsWith('file://')) {
    const cleanPath = path.replace('file://', '')
    if (cleanPath.includes('downloads') || cleanPath.includes('Download')) {
      return '下载目录'
    }
    return '应用存储目录'
  }

  return path
}

export function validateAndFixBackupPath() {
  const cfg = getBackupConfig()

  // 如果路径是文件路径但应该是文件夹路径，修复它
  if (cfg.defaultPath && cfg.defaultPath.startsWith('content://')) {
    // 检查是否是文件URI（包含document而不是tree）
    if (cfg.defaultPath.includes('/document/')) {
      console.log('检测到文件URI，需要转换为文件夹URI')
      try {
        // 尝试提取文件夹路径
        const uri = cfg.defaultPath
        const match = uri.match(/^(content:\/\/[^/]+\/[^/]+)\/.+$/)
        if (match && match[1]) {
          const treeUri = match[1].replace('/document/', '/tree/')
          cfg.defaultPath = treeUri
          saveBackupConfig(cfg)
          console.log('修复为文件夹URI:', treeUri)
        }
      } catch (e) {
        console.error('修复路径失败:', e)
      }
    }
  }

  return cfg.defaultPath
}


export function chooseBackupPath() {
  console.log('开始选择路径，当前环境:', {
    isApp: isApp(),
    isAndroidApp: isAndroidApp(),
    plus: !!plus,
    plusAndroid: !!(plus && plus.android)
  })

  return new Promise((resolve, reject) => {
    if (isH5()) {
      uni.showModal({
        title: '提示',
        content: '浏览器环境将直接下载文件到默认下载目录，无需选择路径。',
        showCancel: false,
        success: () => resolve('浏览器默认下载目录')
      })
      return
    }

    if (isApp() && isAndroidApp()) {
      try {
        const main = plus.android.runtimeMainActivity()
        const Intent = plus.android.importClass('android.content.Intent')

        console.log('准备启动SAF选择器...')

        const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        intent.addFlags(
          Intent.FLAG_GRANT_READ_URI_PERMISSION |
          Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
          Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
          Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        )

        const REQUEST_CODE = 1001

        const g = typeof globalThis !== 'undefined' ? globalThis : {}

        // 清除之前的回调
        if (g._safBackupResolve) g._safBackupResolve = null
        if (g._safBackupReject) g._safBackupReject = null

        // 设置超时
        const timeoutId = setTimeout(() => {
          console.warn('SAF选择超时')
          if (g._safBackupReject) {
            g._safBackupReject(new Error('选择超时，请重试'))
            g._safBackupReject = null
            g._safBackupResolve = null
          }
        }, 30000) // 30秒超时

        g._safBackupResolve = (uri) => {
          clearTimeout(timeoutId)
          console.log('SAF选择成功，路径:', uri)
          resolve(uri)
        }

        g._safBackupReject = (err) => {
          clearTimeout(timeoutId)
          console.error('SAF选择失败:', err)
          reject(err)
        }

        // 这里使用startActivityForResult
        console.log('启动SAF选择器，REQUEST_CODE:', REQUEST_CODE)
        main.startActivityForResult(intent, REQUEST_CODE)
        console.log('SAF选择器已启动，等待用户选择...')

      } catch (err) {
        console.error('启动SAF失败:', err)

        // 回退到默认下载目录
        const cfg = getBackupConfig()
        cfg.defaultPath = 'content://com.android.externalstorage.documents/tree/primary%3ADownload'
        saveBackupConfig(cfg)

        uni.showModal({
          title: '路径说明',
          content: 'SAF选择器启动失败，已使用默认下载目录。',
          showCancel: false,
          success: () => {
            resolve('手机存储/Downloads')
          }
        })
      }
      return
    }

    // 其他平台的处理
    const cfg = getBackupConfig()
    const dir = getDefaultDir()
    if (!dir) {
      reject(new Error('当前平台不支持自定义路径，将使用默认路径'))
      return
    }
    cfg.defaultPath = dir
    saveBackupConfig(cfg)
    resolve(dir)
  })
}
// ========== CSV 导出 ==========

function escapeCSV(val) {
  const str = String(val == null ? '' : val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * 导出指定日期范围的训练数据为 CSV
 * @param {string[]} dates - 要导出的日期数组 ['2025-01-01', ...]
 * @param {Object} dayDataCacheStore - dayDataCache store 实例
 * @returns {Promise<string>} CSV 内容字符串
 */
export function exportToCSV(dates, dayDataCacheStore) {
  const rows = []
  rows.push(['日期', '模板', '动作', '组数', '总容量(kg)', '总次数'].join(','))

  const sortedDates = dates.slice().sort()
  for (const dateStr of sortedDates) {
    const dayData = dayDataCacheStore.getDayData(dateStr)
    if (!dayData || !dayData.templates) continue

    for (const tplName in dayData.templates) {
      const tpl = dayData.templates[tplName]
      if (!tpl) continue

      // 有氧记录
      if (tpl.isAerobic || (tpl.totalWeight > 0 && (!tpl.actionWeights || Object.keys(tpl.actionWeights).length === 0))) {
        rows.push([
          escapeCSV(dateStr),
          escapeCSV(tplName),
          escapeCSV('（有氧）'),
          '-',
          tpl.totalWeight || 0,
          '-',
        ].join(','))
        continue
      }

      if (!tpl.actionWeights || Object.keys(tpl.actionWeights).length === 0) continue

      for (const actionName in tpl.actionWeights) {
        const weight = tpl.actionWeights[actionName] || 0
        if (weight <= 0) continue

        // 获取该动作的组数和次数
        const entries = (dayData.entries && dayData.entries[actionName]) || []
        const sets = entries.length
        const totalReps = entries.reduce((sum, e) => sum + (e.reps || 0), 0)

        rows.push([
          escapeCSV(dateStr),
          escapeCSV(tplName),
          escapeCSV(actionName),
          sets,
          weight,
          totalReps,
        ].join(','))
      }
    }
  }

  return rows.join('\n')
}

/**
 * 将 CSV 内容写入文件并打开
 * @param {string} csvContent - CSV 字符串
 * @param {string} [fileName] - 文件名，默认按时间生成
 * @returns {Promise<string>} 文件路径
 */
export function writeCSVFile(csvContent, fileName) {
  return new Promise((resolve, reject) => {
    const now = new Date()
    const y = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const h = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    const name = fileName || `FitNote训练记录-${y}${mo}${d}-${h}${mi}${s}.csv`

    // BOM 头让 Excel 正确识别 UTF-8 中文
    const bom = '﻿'
    const data = bom + csvContent

    if (isH5()) {
      try {
        downloadForH5(data, name)
        resolve(name)
      } catch (e) {
        reject(e)
      }
      return
    }

    if (isApp() && typeof plus !== 'undefined') {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function (fs) {
        fs.root.getFile(name, { create: true }, function (fileEntry) {
          fileEntry.createWriter(function (writer) {
            writer.onwrite = function () {
              // 打开文件
              plus.io.resolveLocalFileSystemURL(fileEntry.fullPath, function (entry) {
                plus.runtime.openFile(entry.fullPath, {}, function () {
                  resolve(entry.fullPath)
                }, function (err) {
                  resolve(entry.fullPath) // 写入成功即使打开失败也算成功
                })
              }, function () {
                resolve(fileEntry.fullPath)
              })
            }
            writer.onerror = function (e) {
              reject(new Error('写入CSV失败'))
            }
            writer.write(data)
          }, function (e) {
            reject(new Error('创建CSV写入器失败'))
          })
        }, function (e) {
          reject(new Error('创建CSV文件失败'))
        })
      }, function (e) {
        reject(new Error('请求文件系统失败'))
      })
      return
    }

    // 小程序环境
    if (typeof uni.getFileSystemManager === 'function') {
      const fs = uni.getFileSystemManager()
      const dir = getDefaultDir()
      const filePath = dir ? `${dir}/${name}` : name
      fs.writeFile({
        filePath,
        data,
        encoding: 'utf8',
        success() {
          uni.openDocument({
            filePath,
            fileType: 'csv',
            success() { resolve(filePath) },
            fail() { resolve(filePath) },
          })
        },
        fail(err) { reject(err) },
      })
      return
    }

    reject(new Error('当前环境不支持CSV导出'))
  })
}

export {
  clearAllData, // 确保导出
  mergeArraysUnique, // 确保导出
  // 添加常量导出
  BACKUP_CONFIG_KEY,
  TEMPLATE_KEY,
  ACTION_KEY,
  DAYDATA_PREFIX,
  BACKUP_VERSION,
  INDEX_KEY
}