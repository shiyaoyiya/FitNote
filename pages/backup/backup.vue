<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <view class="tab-bar">
      <view :class="['tab-item', { active: activeTab === 'local' }]" @click="switchTab('local')">
        📂 本地备份
      </view>
      <view :class="['tab-item', { active: activeTab === 'cloud' }]" @click="switchTab('cloud')">
        ☁️ 云端备份
      </view>
    </view>

    <view v-if="activeTab === 'local'" class="tab-content">
      <view class="status-card card">
        <view class="path-header">
          <view class="title-group">
            <text class="label-text">当前备份位置</text>
            <view class="path-badge">本地存储</view>
          </view>
          <text class="action-link" @click="handleChoosePath">更改目录</text>
        </view>

        <view class="path-display-area">
          <view class="folder-circle">
            <text class="folder-icon">📂</text>
          </view>
          <view class="path-info">
            <text class="path-filename-text">{{ backupPath }}</text>
            <text class="last-time-text">上次备份: {{ lastBackupTime || '从未备份' }}</text>
          </view>
        </view>
      </view>

      <view class="main-action-zone">
        <view :class="['backup-orb', isBackingUp ? 'rotating' : '']" @click="handleStartBackup">
          <view class="orb-content">
            <text class="orb-icon">{{ isBackingUp ? '⏳' : '☁️' }}</text>
            <text class="orb-text">{{ isBackingUp ? '备份中...' : '开始备份' }}</text>
          </view>
          <view class="pulse-ring" v-if="isBackingUp"></view>
        </view>
        <text class="hint-text">建议每个循环后备份，保障数据不丢失</text>
      </view>

      <view class="bottom-actions">
        <button class="btn-secondary" @click="handleStartImport" :disabled="isRestoring">
          <text class="btn-icon">📥</text>
          <text>导入历史备份</text>
        </button>

        <view v-if="backupStatus.message" class="status-banner" :class="backupStatus.type">
          <text class="status-icon">{{ backupStatus.type === 'success' ? '✅' : '❌' }}</text>
          <text>{{ backupStatus.message }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'cloud'" class="tab-content">
      <view class="cloud-section">
        <view class="cloud-actions">
          <view class="action-btn cloud-upload" @click="handleCloudUpload">
            <text class="action-icon">☁️</text>
            <text class="action-text">上传至云端</text>
          </view>
          <view class="action-btn cloud-download" @click="loadCloudBackups">
            <text class="action-icon">📥</text>
            <text class="action-text">刷新列表</text>
          </view>
        </view>

        <view class="backup-info">
          <text class="info-text">云端备份 ({{ cloudBackups.length }}/3)</text>
        </view>

        <view class="backup-list" v-if="cloudBackups.length > 0">
          <view v-for="(backup, index) in cloudBackups" :key="backup.backupId" class="backup-item">
            <view class="backup-info-left">
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
          <text class="empty-text">暂无资金租用服务器</text>
          <text class="empty-hint">等作者中彩票先</text>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
  import {
    backupData,
    getFriendlyBackupPath,
    chooseBackupPath,
    isAndroidApp,
    chooseBackupFile,
    readBackupFile,
  } from '@/utils/backup.js'
  import {
    listUserBackups,
    uploadToCloud,
    downloadFromCloud,
    deleteBackup
  } from '@/utils/cloudBackup.js'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        backupPath: '',
        lastBackupTime: '',
        isBackingUp: false,
        isRestoring: false,
        backupStatus: {
          type: '',
          message: ''
        },
        activeTab: 'local',
        cloudBackups: [],
        isUploading: false,
        isDownloading: false
      }
    },

    onLoad() {
      this.daySettingsStore.load()
      try {
        // 读取上次备份时间
        const lastTime = uni.getStorageSync('last_backup_time');
        this.lastBackupTime = lastTime || '';
        // 设置友好的路径显示
        this.backupPath = getFriendlyBackupPath()

        console.log('页面加载完成')
      } catch (err) {
        console.error('页面加载失败:', err)
      }
    },

    methods: {
      // 辅助函数：获取当前格式化时间
      getNowFormatDate() {
        const date = new Date();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const strDate = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${date.getFullYear()}-${month}-${strDate} ${hour}:${minute}`;
      },
      // 备份操作
      handleStartBackup() {
        if (this.isBackingUp) return

        this.isBackingUp = true
        this.setStatus('', '')
        // 震动反馈 (增强操作感)
        uni.vibrateShort();
        // 使用 nextTick 让 UI 先渲染出 loading 状态
        this.$nextTick(async () => {
          try {
            // 默认强制全备份
            await backupData('full')
            const now = this.getNowFormatDate();
            this.lastBackupTime = now;
            uni.setStorageSync('last_backup_time', now);
            this.backupPath = getFriendlyBackupPath()
            this.setStatus('success', '备份完成')
            uni.showToast({
              title: '备份成功',
              icon: 'success'
            })
          } catch (e) {
            console.error(e)
            this.setStatus('error', '备份失败：' + (e.message || '未知错误'))
            uni.showToast({
              title: '备份失败',
              icon: 'none'
            })
          } finally {
            this.isBackingUp = false
          }
        })
      },

      // 导入操作
      handleStartImport() {
        // 先让用户选：覆盖还是合并
        uni.showActionSheet({
          itemList: ['覆盖导入 (清除现有数据)', '合并导入 (保留现有数据)'],
          success: (res) => {
            const overwrite = res.tapIndex === 0
            // 统一的文件选择逻辑
            this.chooseAndRestore(overwrite)
          }
        })
      },

      // 统一的文件选择方法
      chooseAndRestore(overwrite) {
        // H5 环境
        // #ifdef H5
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = (event) => {
          const file = event.target.files[0]
          if (!file) return
          this.performRestore(file, overwrite)
        }
        input.click()
        // #endif

        // Android App 环境
        // #ifdef APP-PLUS
        if (isAndroidApp()) {
          // 使用SAF文件选择器
          chooseBackupFile().then(fileUri => {
            this.performRestore(fileUri, overwrite)
          }).catch(err => {
            if (!err.message.includes('取消')) {
              uni.showToast({
                title: '选择文件失败: ' + err.message,
                icon: 'none'
              })
            }
          })
        } else {
          // 非Android App
          plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
            fs.root.createReader().readEntries((entries) => {
              const jsonFiles = entries.filter(e => e.isFile && e.name.endsWith('.json'))
              if (jsonFiles.length > 0) {
                const names = jsonFiles.map(f => f.name)
                uni.showActionSheet({
                  itemList: names,
                  success: (res) => {
                    this.performRestore(jsonFiles[res.tapIndex].fullPath, overwrite)
                  }
                })
              } else {
                uni.showToast({
                  title: '未找到备份文件',
                  icon: 'none'
                })
              }
            })
          })
        }
        // #endif

        // 小程序环境
        // #ifdef MP-WEIXIN
        if (uni.chooseMessageFile) {
          uni.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['.json'],
            success: (fileRes) => {
              if (fileRes.tempFiles && fileRes.tempFiles.length > 0) {
                this.performRestore(fileRes.tempFiles[0].path, overwrite)
              }
            }
          })
        }
        // #endif
      },

      async performRestore(path, overwrite) {
        this.isRestoring = true
        this.setStatus('', '')

        try {
          // 1. 读取文件
          const payload = await readBackupFile(path)

          // 2. 验证数据
          if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
            throw new Error('备份文件格式不正确')
          }

          const data = payload.data || {}
          const tplArr = Array.isArray(data.fitness_templates) ? data.fitness_templates : []
          const actArr = Array.isArray(data.fitness_actions) ? data.fitness_actions : []

          const LEGACY_CATEGORY_MAP = {
            core: 'abs',
            cardio: 'abs',
            other: 'abs'
          }
          const migrateActionsIfNeeded = (raw) => {
            if (!Array.isArray(raw) || raw.length === 0) return raw || []
            const kw = {
              chest: ['卧推', '飞鸟', '夹胸', '上斜', '下斜', '哑铃卧推', '杠铃卧推', '胸'],
              back: ['引体', '划船', '下拉', '硬拉', '高位下拉', '坐姿划船', '背'],
              shoulders: ['推举', '侧平举', '前平举', '耸肩', '肩'],
              arms: ['弯举', '臂屈伸', '锤式', '绳索', '肱二', '肱三', '手臂', '二头', '三头'],
              legs: ['深蹲', '腿举', '腿弯举', '腿屈伸', '弓箭步', '臀推', '腿'],
              abs: ['卷腹', '平板', '举腿', '俄罗斯', '核心', '腹']
            }
            const cn = {
              chest: '胸部',
              back: '背部',
              shoulders: '肩部',
              arms: '手臂',
              legs: '腿部',
              abs: '腹部'
            }
            const dt = (n) => {
              for (const [c, ks] of Object.entries(kw)) {
                for (const k of ks) {
                  if (n.includes(k)) return c
                }
              }
              return 'abs'
            }
            const gid = () => Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
            if (typeof raw[0] === 'string') {
              return raw.map(n => {
                const cat = dt(n)
                return {
                  id: gid(),
                  name: n,
                  categories: [cat],
                  subcategories: {},
                  categoryName: cn[cat] || '腹部',
                  createdAt: new Date().toISOString()
                }
              })
            }
            if (typeof raw[0] === 'object') {
              return raw.map(a => {
                let cats = a.categories
                if (!cats || !Array.isArray(cats) || cats.length === 0) {
                  const oldCat = a.category || dt(a.name)
                  const mapped = LEGACY_CATEGORY_MAP[oldCat] || oldCat
                  cats = [mapped]
                } else {
                  cats = cats.map(c => LEGACY_CATEGORY_MAP[c] || c)
                }
                return {
                  id: a.id || gid(),
                  name: a.name,
                  categories: cats,
                  subcategories: a.subcategories || {},
                  categoryName: cn[cats[0]] || '腹部',
                  createdAt: a.createdAt || new Date().toISOString()
                }
              })
            }
            return raw
          }

          const migratedActArr = migrateActionsIfNeeded(actArr)
          const daydata = data.fitness_daydata || {}
          const annivsArr = Array.isArray(data.fitness_annivs) ? data.fitness_annivs : []

          // 定义常量
          const TEMPLATE_KEY = 'fitness_templates'
          const ACTION_KEY = 'fitness_actions'
          const DAYDATA_PREFIX = 'fitness_daydata_'
          const INDEX_KEY = 'fitness_index'

          // 清空所有数据的函数
          const clearAllData = () => {
            const info = uni.getStorageInfoSync()
            info.keys.forEach(key => {
              if (key === TEMPLATE_KEY || key === ACTION_KEY || key.startsWith(DAYDATA_PREFIX) || key ===
                'annivs' || key === INDEX_KEY) {
                uni.removeStorageSync(key)
              }
            })
          }

          // 数组合并函数
          const mergeArraysUnique = (arrA, arrB) => {
            const a = Array.isArray(arrA) ? arrA.slice() : []
            const b = Array.isArray(arrB) ? arrB : []
            b.forEach(item => {
              if (!a.some(x => JSON.stringify(x) === JSON.stringify(item))) {
                a.push(item)
              }
            })
            return a
          }

          if (overwrite) {
            // 执行覆盖导入
            clearAllData()
            uni.setStorageSync(TEMPLATE_KEY, tplArr)
            uni.setStorageSync(ACTION_KEY, migratedActArr)

            Object.keys(daydata).forEach(date => {
              const value = daydata[date] || {}
              uni.setStorageSync(DAYDATA_PREFIX + date, value)
            })

            // 恢复纪念日数据
            if (annivsArr.length > 0) {
              uni.setStorageSync('annivs', JSON.stringify(annivsArr))
            }
          } else {
            // 执行合并导入
            const currentTpl = uni.getStorageSync(TEMPLATE_KEY) || []
            const currentAct = uni.getStorageSync(ACTION_KEY) || []
            const mergedTpl = mergeArraysUnique(currentTpl, tplArr)
            const mergedAct = mergeArraysUnique(currentAct, migratedActArr)

            uni.setStorageSync(TEMPLATE_KEY, mergedTpl)
            uni.setStorageSync(ACTION_KEY, mergedAct)

            Object.keys(daydata).forEach(date => {
              const key = DAYDATA_PREFIX + date
              const existed = uni.getStorageSync(key) || {}
              const next = Object.assign({}, existed, daydata[date] || {})
              uni.setStorageSync(key, next)
            })

            // 恢复纪念日数据（合并）
            if (annivsArr.length > 0) {
              const currentAnnivs = uni.getStorageSync('annivs') ? JSON.parse(uni.getStorageSync('annivs')) : []
              const mergedAnnivs = mergeArraysUnique(currentAnnivs, annivsArr)
              uni.setStorageSync('annivs', JSON.stringify(mergedAnnivs))
            }
          }

          // 重建索引并清除缓存，确保所有页面能立即看到新数据
          const cacheStore = useDayDataCacheStore()
          cacheStore.buildIndex()
          cacheStore.clearCache()

          this.setStatus('success', '导入成功，数据已更新')
          uni.showToast({
            title: '导入成功',
            icon: 'success'
          })
        } catch (err) {
          console.error('恢复数据失败:', err)

          // 提供更详细的错误信息
          let errorMessage = err.message || '导入失败'
          if (errorMessage.includes('0字节') || errorMessage.includes('空')) {
            errorMessage = '备份文件为空或损坏，可能是备份过程中出现了问题。请重新备份。'
          } else if (errorMessage.includes('JSON')) {
            errorMessage = '备份文件格式不正确，可能已损坏。'
          } else if (errorMessage.includes('无法打开输入流') || errorMessage.includes('未找到文件')) {
            errorMessage = '备份文件不存在或无法访问。文件可能已被移动或删除。'
          }

          this.setStatus('error', errorMessage)
          uni.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 3000
          })
        } finally {
          this.isRestoring = false
        }
      },

      async handleChoosePath() {
        try {
          this.setStatus('', '')
          await chooseBackupPath()
          this.backupPath = getFriendlyBackupPath()
          uni.showToast({
            title: '路径已选择',
            icon: 'success',
            duration: 1500
          })
        } catch (err) {
          console.error('选择路径失败:', err)
          if (err.message && err.message.includes('取消')) {
            this.setStatus('', '')
            uni.showToast({
              title: '已取消选择',
              icon: 'none',
              duration: 1000
            })
          } else {
            this.setStatus('error', err.message || '设置路径失败')
            uni.showToast({
              title: err.message || '设置路径失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      },

      setStatus(type, message) {
        this.backupStatus = {
          type,
          message
        }
      },

      switchTab(tab) {
        this.activeTab = tab
        if (tab === 'cloud') {
          this.loadCloudBackups()
        }
      },

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

      async handleCloudUpload() {
        if (this.isUploading) return

        uni.showLoading({
          title: '上传中...'
        })
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

      async handleCloudDownload(backup) {
        uni.showActionSheet({
          itemList: ['覆盖导入 (清除现有数据)', '合并导入 (保留现有数据)'],
          success: async (res) => {
            const overwrite = res.tapIndex === 0
            uni.showLoading({
              title: '下载中...'
            })
            this.isDownloading = true

            try {
              const backupData = await downloadFromCloud(backup.backupId)
              await this.restoreDataFromCloud(backupData, overwrite)
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

      async restoreDataFromCloud(backupData, overwrite) {
        const LEGACY_CATEGORY_MAP = {
          core: 'abs',
          cardio: 'abs',
          other: 'abs'
        }
        const migrateActionsIfNeeded = (raw) => {
          if (!Array.isArray(raw) || raw.length === 0) return raw || []
          const kw = {
            chest: ['卧推', '飞鸟', '夹胸', '上斜', '下斜', '哑铃卧推', '杠铃卧推', '胸'],
            back: ['引体', '划船', '下拉', '硬拉', '高位下拉', '坐姿划船', '背'],
            shoulders: ['推举', '侧平举', '前平举', '耸肩', '肩'],
            arms: ['弯举', '臂屈伸', '锤式', '绳索', '肱二', '肱三', '手臂', '二头', '三头'],
            legs: ['深蹲', '腿举', '腿弯举', '腿屈伸', '弓箭步', '臀推', '腿'],
            abs: ['卷腹', '平板', '举腿', '俄罗斯', '核心', '腹']
          }
          const cn = {
            chest: '胸部',
            back: '背部',
            shoulders: '肩部',
            arms: '手臂',
            legs: '腿部',
            abs: '腹部'
          }
          const dt = (n) => {
            for (const [c, ks] of Object.entries(kw)) {
              for (const k of ks) {
                if (n.includes(k)) return c
              }
            }
            return 'abs'
          }
          const gid = () => Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
          if (typeof raw[0] === 'string') {
            return raw.map(n => {
              const cat = dt(n)
              return {
                id: gid(),
                name: n,
                categories: [cat],
                subcategories: {},
                categoryName: cn[cat] || '腹部',
                createdAt: new Date().toISOString()
              }
            })
          }
          if (typeof raw[0] === 'object') {
            return raw.map(a => {
              let cats = a.categories
              if (!cats || !Array.isArray(cats) || cats.length === 0) {
                const oldCat = a.category || dt(a.name)
                const mapped = LEGACY_CATEGORY_MAP[oldCat] || oldCat
                cats = [mapped]
              } else {
                cats = cats.map(c => LEGACY_CATEGORY_MAP[c] || c)
              }
              return {
                id: a.id || gid(),
                name: a.name,
                categories: cats,
                subcategories: a.subcategories || {},
                categoryName: cn[cats[0]] || '腹部',
                createdAt: a.createdAt || new Date().toISOString()
              }
            })
          }
          return raw
        }

        const data = backupData.data || {}
        const tplArr = Array.isArray(data.fitness_templates) ? data.fitness_templates : []
        const actArr = Array.isArray(data.fitness_actions) ? data.fitness_actions : []
        const migratedActArr = migrateActionsIfNeeded(actArr)
        const daydata = data.fitness_daydata || {}
        const annivsArr = Array.isArray(data.fitness_annivs) ? data.fitness_annivs : []

        const TEMPLATE_KEY = 'fitness_templates'
        const ACTION_KEY = 'fitness_actions'
        const DAYDATA_PREFIX = 'fitness_daydata_'
        const INDEX_KEY = 'fitness_index'

        const clearAllData = () => {
          const info = uni.getStorageInfoSync()
          info.keys.forEach(key => {
            if (key === TEMPLATE_KEY || key === ACTION_KEY || key.startsWith(DAYDATA_PREFIX) ||
              key === 'annivs' || key === INDEX_KEY) {
              uni.removeStorageSync(key)
            }
          })
        }

        const mergeArraysUnique = (arrA, arrB) => {
          const a = Array.isArray(arrA) ? arrA.slice() : []
          const b = Array.isArray(arrB) ? arrB : []
          b.forEach(item => {
            if (!a.some(x => JSON.stringify(x) === JSON.stringify(item))) {
              a.push(item)
            }
          })
          return a
        }

        if (overwrite) {
          clearAllData()
          uni.setStorageSync(TEMPLATE_KEY, tplArr)
          uni.setStorageSync(ACTION_KEY, migratedActArr)
          Object.keys(daydata).forEach(date => {
            const value = daydata[date] || {}
            uni.setStorageSync(DAYDATA_PREFIX + date, value)
          })
          if (annivsArr.length > 0) {
            uni.setStorageSync('annivs', JSON.stringify(annivsArr))
          }
        } else {
          const currentTpl = uni.getStorageSync(TEMPLATE_KEY) || []
          const currentAct = uni.getStorageSync(ACTION_KEY) || []
          const mergedTpl = mergeArraysUnique(currentTpl, tplArr)
          const mergedAct = mergeArraysUnique(currentAct, migratedActArr)

          uni.setStorageSync(TEMPLATE_KEY, mergedTpl)
          uni.setStorageSync(ACTION_KEY, mergedAct)
          Object.keys(daydata).forEach(date => {
            const key = DAYDATA_PREFIX + date
            const existed = uni.getStorageSync(key) || {}
            const next = Object.assign({}, existed, daydata[date] || {})
            uni.setStorageSync(key, next)
          })
          if (annivsArr.length > 0) {
            const currentAnnivs = uni.getStorageSync('annivs') ? JSON.parse(uni.getStorageSync('annivs')) : []
            const mergedAnnivs = mergeArraysUnique(currentAnnivs, annivsArr)
            uni.setStorageSync('annivs', JSON.stringify(mergedAnnivs))
          }
        }

        const cacheStore = useDayDataCacheStore()
        cacheStore.buildIndex()
        cacheStore.clearCache()
      },

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

      formatSize(bytes) {
        if (!bytes || bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
      }
    }
  }
</script>

<style scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #f4f7f9;
    padding: 20px;
    box-sizing: border-box;
  }

  .container.dark {
    background-color: #121212;
  }

  .container.light {
    background-color: #f5f5f5;
    color: #333333;
  }

  /* 卡片样式优化 */
  .card {
    background: #ffffff;
    padding: 20px;
    border-radius: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
  }

  .container.dark .card {
    background: #1c1c1e;
    /* iOS 风格的深灰卡片色 */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .label-text {
    color: #888;
  }

  .container.dark .label-text {
    color: #999;
  }

  .path-filename-text {
    color: #333;
  }

  .container.dark .path-filename-text {
    color: #f2f2f7;
  }

  .path-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .path-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: #e1edff;
    color: #007aff;
    border-radius: 4px;
  }

  .container.dark .path-badge {
    background: #1a2a44;
    /* 深蓝色背景 */
    color: #58a6ff;
    /* 更亮的蓝色文字 */
  }

  .path-display-area {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .folder-circle {
    width: 44px;
    height: 44px;
    background: #f0f4ff;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container.dark .folder-circle {
    background: #2c2c2e;
  }

  .path-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .last-time-text {
    font-size: 12px;
    color: #bbb;
    margin-top: 4px;
  }

  .container.dark .last-time-text {
    color: #636366;
  }

  /* 核心备份球体 */
  .main-action-zone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .backup-orb {
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, #007aff, #0056b3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 15px 40px rgba(0, 122, 255, 0.3);
    position: relative;
    z-index: 1;
    transition: all 0.3s ease;
  }

  .backup-orb:active {
    transform: scale(0.95);
  }

  .orb-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: white;
  }

  .orb-icon {
    font-size: 40px;
    margin-bottom: 8px;
  }

  .orb-text {
    font-size: 18px;
    font-weight: bold;
  }

  .container.dark .backup-orb {
    box-shadow: 0 0 30px rgba(0, 122, 255, 0.4);
  }

  .hint-text {
    font-size: 13px;
    color: #999;
  }

  .container.dark .hint-text {
    color: #48484a;
  }

  .container.light .hint-text {
    color: #999999;
  }

  /* 底部操作 */
  .bottom-actions {
    padding-bottom: 40px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .btn-secondary {
    background: white;
    border: 1px solid #eee;
    border-radius: 16px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 15px;
    color: #444;
  }

  .container.dark .btn-secondary {
    background: #1c1c1e;
    border-color: #3a3a3c;
    color: #ebebf5;
  }

  /* 状态横幅 */
  .status-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    font-size: 14px;
    animation: slideUp 0.3s ease;
  }

  .status-banner.success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-banner.error {
    background: #ffebee;
    color: #c62828;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* --- 链接文字适配 --- */
  .action-link {
    color: #007aff;
    /* 浅色模式下的蓝色 */
    transition: color 0.3s ease;
  }

  .container.dark .action-link {
    color: #58a6ff;
    /* 深色模式下调亮蓝色，提高识别度 */
  }

  /* 增加点击态反馈 */
  .action-link:active {
    opacity: 0.7;
  }

  /* --- 呼吸灯核心动画 --- */
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }

    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  /* 呼吸灯光圈：仅在 isBackingUp 为 true 时通过 rotating 类（或新增类）触发 */
  .rotating.backup-orb::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background: inherit;
    /* 继承球体的蓝色渐变 */
    z-index: -1;
    /* 放在球体下方 */
    animation: pulse 2s infinite ease-out;
  }

  /* 深色模式下的光晕加强 */
  .container.dark .rotating.backup-orb::after {
    background: rgba(0, 122, 255, 0.6);
    box-shadow: 0 0 20px rgba(0, 122, 255, 0.4);
  }

  @keyframes orb-breath {

    0%,
    100% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.03);
    }
  }

  .rotating.backup-orb {
    animation: orb-breath 2s infinite ease-in-out;
  }

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

  /* .container.dark .tab-item {
    color: #999;
  } */

  .container.dark .tab-item.active {
    background: #58a6ff;
  }

  .tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

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

  .backup-info-left {
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
</style>