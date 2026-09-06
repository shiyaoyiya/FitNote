<template>
  <view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    @touchstart="onPageTouchStart" @touchmove="onPageTouchMove" @touchend="onPageTouchEnd">
    <!-- 顶部 Tab 栏 + 高亮框 -->
    <view class="tab-bar" :class="{ 'no-transition': swipeNoTransition }">
      <view v-for="(t, i) in tabs" :key="t.key" class="tab-item" :class="{ active: activeTab === t.key }"
        @click="switchTab(t.key, true)">
        <text class="tab-label">{{ t.label }}</text>
      </view>
      <view class="tab-highlight" :style="tabHighlightStyle"></view>
    </view>

    <!-- ========== 本地备份 ========== -->
    <view v-show="activeTab === 'local'" class="tab-content">
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

        <view v-if="isBackingUp" class="progress-container">
          <progress :percent="backupProgress" stroke-width="4" activeColor="#007aff" />
          <text class="progress-text">{{ backupProgress }}%</text>
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

    <!-- ========== 云端备份 ========== -->
    <view v-show="activeTab === 'cloud'" class="tab-content">
      <view class="status-card card">
        <view class="path-header">
          <view class="title-group">
            <text class="label-text">备份模式</text>
            <view class="path-badge mode-badge" :class="currentMode">
              {{ currentMode === 'cloud' ? '☁️ 云开发' : currentMode === 'local' ? '🖥 本地服务器' : modeDetected ? '⚠️ 未连接' : '❓ 未检测' }}
            </view>
          </view>
          <text class="action-link" @click="testServerPing">测试连接</text>
        </view>
        <view class="path-display-area">
          <view class="folder-circle">
            <text class="folder-icon">{{ currentMode === 'cloud' ? '☁️' : '🖥' }}</text>
          </view>
          <view class="path-info">
            <text class="path-filename-text">{{ serverAddress }}</text>
            <text
              class="last-time-text">{{ isLoggedIn ? '已登录：' + (cloudUser?.nickname || cloudUser?.username || '') : '未登录' }}</text>
          </view>
        </view>
      </view>

      <!-- 登录引导（仅本地模式需要登录，云开发模式用 openid 隔离） -->
      <view v-if="currentMode !== 'cloud' && !isLoggedIn" class="login-guide card">
        <text class="guide-title">请先登录以使用云端备份</text>
        <button class="btn-primary" @click="goToLogin">去登录</button>
      </view>

      <!-- 操作区 -->
      <view v-else class="cloud-action-zone">
        <view class="main-action-zone">
          <view :class="['backup-orb', isUploading ? 'rotating' : '']" @click="handleCloudBackup">
            <view class="orb-content">
              <text class="orb-icon">{{ isUploading ? '⏳' : '☁️' }}</text>
              <text class="orb-text">{{ isUploading ? '上传中...' : '立即备份' }}</text>
            </view>
            <view class="pulse-ring" v-if="isUploading"></view>
          </view>

          <view v-if="isUploading" class="progress-container">
            <progress :percent="uploadProgress" stroke-width="4" activeColor="#007aff" />
            <text class="progress-text">{{ uploadProgress }}%</text>
          </view>

          <text class="hint-text">最多保留 {{ maxBackups }} 份云端备份，超出自动删除最旧的</text>
        </view>

        <!-- 备份历史列表 -->
        <view class="backup-history">
          <view class="history-title">备份历史</view>
          <view v-if="cloudBackupList.length === 0 && !isLoadingList" class="empty-history">
            暂无云端备份记录
          </view>
          <view v-for="item in cloudBackupList" :key="item.id" class="history-item card">
            <view class="history-info">
              <text class="history-time">{{ formatCloudTime(item) }}</text>
              <text class="history-note" v-if="item.note">备注：{{ item.note }}</text>
              <text class="history-size" v-if="item.size">大小：{{ formatSize(item.size) }}</text>
            </view>
            <view class="history-actions">
              <text class="history-btn" @click="downloadCloudBackup(item)">恢复</text>
              <text class="history-btn danger" @click="deleteCloudBackup(item)">删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 文本备份（原导出导入） ========== -->
    <view v-show="activeTab === 'text'" class="tab-content">
      <view class="export-import-tabs">
        <view :class="['sub-tab', { active: exportImportTab === 'export' }]" @click="exportImportTab = 'export'">
          📤 导出
        </view>
        <view :class="['sub-tab', { active: exportImportTab === 'import' }]" @click="exportImportTab = 'import'">
          📥 导入
        </view>
      </view>

      <view class="export-import-content">
        <ExportTab v-if="exportImportTab === 'export'" @export-success="onExportSuccess" />
        <ImportTab v-if="exportImportTab === 'import'" @import-success="onImportSuccess" />
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
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import ExportTab from '@/components/ExportTab.vue'
  import ImportTab from '@/components/ImportTab.vue'
  import {
    uploadToServer,
    listServerBackups,
    downloadFromServer,
    deleteServerBackup,
    applyBackupToLocal,
    isLocalServerAvailable,
    getCurrentBackupMode,
    BACKUP_MODE,
    isLoggedIn,
    me,
  } from '@/utils/serverBackup.js'
  import {
    SERVER_BASE_URL
  } from '@/utils/serverConfig.js'

  export default {
    components: {
      ExportTab,
      ImportTab
    },
    computed: {
      isMpWeixin() {
        // #ifdef MP-WEIXIN
        return true
        // #endif
        // #ifndef MP-WEIXIN
        return false
        // #endif
      },
      tabs() {
        // 微信小程序无本地文件系统，隐藏「本地备份」tab
        if (this.isMpWeixin) {
          return [{
              key: 'cloud',
              label: '☁️ 云端备份'
            },
            {
              key: 'text',
              label: '📝 文本备份'
            },
          ]
        }
        return [{
            key: 'local',
            label: '📂 本地备份'
          },
          {
            key: 'cloud',
            label: '☁️ 云端备份'
          },
          {
            key: 'text',
            label: '📝 文本备份'
          },
        ]
      },
      activeIndex() {
        return this.tabs.findIndex(t => t.key === this.activeTab)
      },
      isLoggedIn() {
        return isLoggedIn()
      },
      cloudUser() {
        return me()
      },
      serverAddress() {
        return this.currentMode === 'cloud' ? '微信云开发' : SERVER_BASE_URL
      },
      tabHighlightStyle() {
        if (!this.tabRectsMeasured || this.tabRects.length === 0) return {
          opacity: 0
        }
        const curIdx = this.activeIndex
        if (curIdx < 0) return {
          opacity: 0
        }
        const cur = this.tabRects[curIdx]
        if (!cur) return {
          opacity: 0
        }
        let left = cur.left
        let width = cur.width
        if (this.swipeDeltaX !== 0 && this.swipeViewWidth > 0) {
          const dir = this.swipeDeltaX > 0 ? -1 : 1
          const nextIdx = curIdx + dir
          if (nextIdx >= 0 && nextIdx < this.tabRects.length) {
            const next = this.tabRects[nextIdx]
            const progress = Math.min(Math.abs(this.swipeDeltaX) / (this.swipeViewWidth * 0.3), 1)
            left = cur.left + (next.left - cur.left) * progress
            width = cur.width + (next.width - cur.width) * progress
          } else {
            left = cur.left + this.swipeDeltaX * 0.2
          }
        }
        return {
          transform: `translateX(${left}px)`,
          width: `${width}px`,
          opacity: 1,
        }
      },
      currentMode() {
        return this.backupMode
      }
    },
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        dayDataCacheStore: useDayDataCacheStore(),
        backupMode: 'unknown',
        modeDetected: false,
        backupPath: '',
        lastBackupTime: '',
        isBackingUp: false,
        isRestoring: false,
        backupProgress: 0,
        backupStatus: {
          type: '',
          message: ''
        },
        activeTab: 'local',
        exportImportTab: 'export',
        // 侧滑手势
        swipeStartX: 0,
        swipeStartY: 0,
        swipeStartTime: 0,
        swipeDeltaX: 0,
        swipeViewWidth: 0,
        swipeNoTransition: false,
        swipeIsTracking: false,
        tabRects: [],
        tabRectsMeasured: false,
        // 云端备份
        isUploading: false,
        isLoadingList: false,
        uploadProgress: 0,
        cloudBackupList: [],
        maxBackups: 5,
      }
    },

    onLoad() {
      this.daySettingsStore.load()
      try {
        const lastTime = uni.getStorageSync('last_backup_time');
        this.lastBackupTime = lastTime || '';
        this.backupPath = getFriendlyBackupPath()
        // 微信小程序默认进云端备份 tab
        if (this.isMpWeixin) {
          this.activeTab = 'cloud'
        }
        // 异步探测备份模式
        this.detectBackupMode()
        console.log('页面加载完成')
      } catch (err) {
        console.error('页面加载失败:', err)
      }
    },

    onShow() {
      // 登录返回后刷新云端列表
      if (this.activeTab === 'cloud') {
        this.refreshCloudList()
      }
      this.measureTabRects()
    },

    methods: {
      // ============ 侧滑手势 ============
      measureTabRects() {
        this.$nextTick(() => {
          setTimeout(() => {
            const query = uni.createSelectorQuery().in(this)
            query.select('.tab-bar').boundingClientRect()
            query.selectAll('.tab-item').boundingClientRect()
            query.exec(res => {
              const container = res && res[0]
              const items = res && res[1]
              if (container && items && items.length > 0) {
                this.tabRects = items.map(it => ({
                  left: it.left - container.left,
                  width: it.width,
                }))
                this.tabRectsMeasured = true
                this.swipeViewWidth = container.width
              }
            })
          }, 50)
        })
      },

      onPageTouchStart(e) {
        if (e.touches.length !== 1) return
        this.swipeStartX = e.touches[0].pageX
        this.swipeStartY = e.touches[0].pageY
        this.swipeStartTime = Date.now()
        this.swipeDeltaX = 0
        this.swipeNoTransition = true
        this.swipeIsTracking = true
        if (!this.tabRectsMeasured) this.measureTabRects()
      },

      onPageTouchMove(e) {
        if (!this.swipeIsTracking || e.touches.length !== 1) return
        const dx = e.touches[0].pageX - this.swipeStartX
        const dy = e.touches[0].pageY - this.swipeStartY
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        // 方向锁：横向必须明显大于纵向
        if (absDx <= absDy * 1.9) return
        // 记录 delta 用于高亮框跟手（不移动屏幕内容）
        this.swipeDeltaX = dx
        if (e.cancelable) e.preventDefault()
      },

      onPageTouchEnd(e) {
        if (!this.swipeIsTracking) return
        this.swipeIsTracking = false
        this.swipeNoTransition = false
        const dx = this.swipeDeltaX
        const absDx = Math.abs(dx)
        const dt = Date.now() - this.swipeStartTime
        // 阈值判断：距离 > 视图宽度 15% 或 速度 > 0.3px/ms
        const distThreshold = this.swipeViewWidth * 0.15
        const speedThreshold = 0.3
        if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
          this.swipeDeltaX = 0
          return
        }
        // 方向：dx > 0 右滑 → 上一个(i-1)；dx < 0 左滑 → 下一个(i+1)
        const dir = dx > 0 ? -1 : 1
        const nextIdx = this.activeIndex + dir
        if (nextIdx < 0 || nextIdx >= this.tabs.length) {
          this.swipeDeltaX = 0
          return
        }
        this.swipeDeltaX = 0
        uni.vibrateShort()
        this.switchTab(this.tabs[nextIdx].key, false)
        this.measureTabRects()
      },

      switchTab(key, fromClick) {
        if (fromClick) {
          uni.vibrateShort()
        }
        this.activeTab = key
        if (key === 'cloud') {
          this.refreshCloudList()
        }
        this.measureTabRects()
      },

      // ============ 备份模式检测 ============
      async detectBackupMode() {
        try {
          await isLocalServerAvailable(false)
        } catch (e) {
          // 探测失败不阻塞
        }
        this.backupMode = getCurrentBackupMode()
        this.modeDetected = true
      },

      async testServerPing() {
        uni.showLoading({
          title: '检测中...'
        })
        try {
          await isLocalServerAvailable(true)
          this.backupMode = getCurrentBackupMode()
          this.modeDetected = true
          uni.showToast({
            title: this.backupMode === 'cloud' ? '已切换到云开发模式' : this.backupMode === 'local' ? '本地服务器已连接' : '未连接到服务器',
            icon: 'none'
          })
          this.refreshCloudList()
        } catch (e) {
          uni.showToast({
            title: '检测失败',
            icon: 'none'
          })
        } finally {
          uni.hideLoading()
        }
      },

      goToLogin() {
        uni.navigateTo({
          url: '/pages/login/login'
        })
      },

      // ============ 云端备份 ============
      async handleCloudBackup() {
        if (this.isUploading) return
        // 本地模式需要登录
        if (this.currentMode !== 'cloud' && !this.isLoggedIn) {
          uni.showToast({
            title: '请先登录',
            icon: 'none'
          })
          return
        }
        this.isUploading = true
        this.uploadProgress = 0
        uni.vibrateShort()
        try {
          await uploadToServer({
            onProgress: (p) => {
              this.uploadProgress = p
            },
          })
          uni.showToast({
            title: '备份成功',
            icon: 'success'
          })
          this.refreshCloudList()
        } catch (e) {
          console.error('云端备份失败:', e)
          uni.showToast({
            title: '备份失败：' + (e.message || ''),
            icon: 'none'
          })
        } finally {
          this.isUploading = false
        }
      },

      async refreshCloudList() {
        // 云开发模式或未登录时不依赖 cloudUser
        if (this.currentMode !== 'cloud' && !this.isLoggedIn) {
          this.cloudBackupList = []
          return
        }
        this.isLoadingList = true
        try {
          const res = await listServerBackups(1, 20)
          this.cloudBackupList = res.list || res.records || []
        } catch (e) {
          console.error('获取备份列表失败:', e)
          this.cloudBackupList = []
        } finally {
          this.isLoadingList = false
        }
      },

      async downloadCloudBackup(item) {
        uni.showLoading({
          title: '下载中...'
        })
        try {
          const backupData = await downloadFromServer(item.id)
          uni.hideLoading()
          // 选择覆盖还是合并
          uni.showActionSheet({
            itemList: ['覆盖导入 (清除现有数据)', '合并导入 (保留现有数据)'],
            success: async (res) => {
              const mode = res.tapIndex === 0 ? 'overwrite' : 'merge'
              uni.showLoading({
                title: '恢复中...'
              })
              try {
                applyBackupToLocal(backupData, mode)
                uni.$emit('backup-restored')
                uni.showToast({
                  title: '恢复成功',
                  icon: 'success'
                })
              } catch (e) {
                uni.showToast({
                  title: '恢复失败',
                  icon: 'none'
                })
              } finally {
                uni.hideLoading()
              }
            }
          })
        } catch (e) {
          uni.hideLoading()
          uni.showToast({
            title: '下载失败',
            icon: 'none'
          })
        }
      },

      async deleteCloudBackup(item) {
        uni.showModal({
          title: '删除备份',
          content: '确定删除这份云端备份吗？',
          success: async (res) => {
            if (res.confirm) {
              try {
                await deleteServerBackup(item.id)
                uni.showToast({
                  title: '已删除',
                  icon: 'success'
                })
                this.refreshCloudList()
              } catch (e) {
                uni.showToast({
                  title: '删除失败',
                  icon: 'none'
                })
              }
            }
          }
        })
      },

      formatCloudTime(item) {
        const t = item.backupTime || item.createdAt || item.createTime
        if (!t) return ''
        try {
          const d = new Date(t)
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
        } catch (e) {
          return String(t)
        }
      },

      formatSize(bytes) {
        if (!bytes) return ''
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1024 / 1024).toFixed(1) + ' MB'
      },

      // ============ 本地备份（原有逻辑） ============
      getNowFormatDate() {
        const date = new Date();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const strDate = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${date.getFullYear()}-${month}-${strDate} ${hour}:${minute}`;
      },

      handleStartBackup() {
        if (this.isBackingUp) return

        this.isBackingUp = true
        this.backupProgress = 0
        this.setStatus('', '')
        uni.vibrateShort();
        this.$nextTick(async () => {
          try {
            await backupData('full', this.dayDataCacheStore, (progress) => {
              this.backupProgress = progress
            })
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

      handleStartImport() {
        uni.showActionSheet({
          itemList: ['覆盖导入 (清除现有数据)', '合并导入 (保留现有数据)'],
          success: (res) => {
            const overwrite = res.tapIndex === 0
            this.chooseAndRestore(overwrite)
          }
        })
      },

      chooseAndRestore(overwrite) {
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

        // #ifdef APP-PLUS
        if (isAndroidApp()) {
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
          const payload = await readBackupFile(path)

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

          const TEMPLATE_KEY = 'fitness_templates'
          const ACTION_KEY = 'fitness_actions'
          const DAYDATA_PREFIX = 'fitness_daydata_'
          const INDEX_KEY = 'fitness_index'

          const clearAllData = () => {
            const info = uni.getStorageInfoSync()
            info.keys.forEach(key => {
              if (key === TEMPLATE_KEY || key === ACTION_KEY || key.startsWith(DAYDATA_PREFIX) || key ===
                'annivs' || key === INDEX_KEY) {
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

          uni.$emit('backup-restored')

          this.setStatus('success', '导入成功，数据已更新')
          uni.showToast({
            title: '导入成功',
            icon: 'success'
          })
        } catch (err) {
          console.error('恢复数据失败:', err)

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

      onExportSuccess() {},

      onImportSuccess() {}
    }
  }
</script>

<style scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary);
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
  }

  /* 卡片样式优化 */
  .card {
    background: var(--bg-secondary);
    padding: 20px;
    border-radius: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
    margin-bottom: 20px;
  }

  .label-text {
    color: var(--text-secondary);
  }

  .path-filename-text {
    color: var(--text-primary);
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

  .mode-badge.cloud {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .mode-badge.local {
    background: #e1edff;
    color: #007aff;
  }

  .path-display-area {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .folder-circle {
    width: 44px;
    height: 44px;
    background: var(--bg-tertiary);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .path-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .last-time-text {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
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

  .hint-text {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* 进度条 */
  .progress-container {
    width: 80%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .progress-text {
    font-size: 14px;
    color: #007aff;
    font-weight: 500;
  }

  /* 底部操作 */
  .bottom-actions {
    padding-bottom: 40px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .btn-secondary {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 15px;
    color: var(--text-primary);
  }

  .btn-primary {
    background: linear-gradient(135deg, #007aff, #0056b3);
    color: #fff;
    border-radius: 12px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    margin-top: 12px;
  }

  /* 登录引导 */
  .login-guide {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 20px;
  }

  .guide-title {
    font-size: 15px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  /* 云端备份历史 */
  .cloud-action-zone {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .backup-history {
    margin-top: 16px;
  }

  .history-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .empty-history {
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
    padding: 40px 0;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    margin-bottom: 8px;
    border-radius: 12px;
    background: var(--bg-secondary);
  }

  .history-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .history-time {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .history-note {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .history-size {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .history-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .history-btn {
    font-size: 13px;
    color: #007aff;
    padding: 6px 12px;
    border: 1px solid #007aff;
    border-radius: 8px;
  }

  .history-btn.danger {
    color: #ff3b30;
    border-color: #ff3b30;
  }

  .history-btn:active {
    opacity: 0.6;
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
    color: var(--primary);
    transition: color 0.3s ease;
  }

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

  .rotating.backup-orb::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background: inherit;
    z-index: -1;
    animation: pulse 2s infinite ease-out;
  }

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

  /* ===== 顶部 Tab 栏 + 高亮框 ===== */
  .tab-bar {
    position: relative;
    display: flex;
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 20px;
  }

  .tab-item {
    position: relative;
    z-index: 1;
    flex: 1;
    text-align: center;
    padding: 10px 0;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 14px;
    transition: color 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .tab-item.active {
    color: #ffffff;
  }

  .tab-item:active {
    transform: scale(0.97);
  }

  .tab-highlight {
    position: absolute;
    top: 4px;
    left: 0;
    height: calc(100% - 8px);
    background: var(--primary);
    border-radius: 8px;
    z-index: 0;
    transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
    will-change: transform;
  }

  .tab-bar.no-transition .tab-highlight {
    transition: none;
  }

  .tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .export-import-tabs {
    display: flex;
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 16px;
  }

  .sub-tab {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 14px;
    transition: all 0.3s;
  }

  .sub-tab.active {
    background: var(--primary);
    color: #ffffff;
  }

  .export-import-content {
    flex: 1;
    overflow-y: auto;
  }
</style>

<style>
/* 禁用 backup-orb 的液态玻璃效果 */
.container.liquid-glass .backup-orb {
  background: linear-gradient(135deg, #007aff, #0056b3) !important;
  border: none !important;
  box-shadow: 0 15px 40px rgba(0, 122, 255, 0.3) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

.container.liquid-glass .rotating.backup-orb::after {
  background: inherit !important;
  box-shadow: none !important;
}
</style>