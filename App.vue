<script>
  import {
    useTemplateStore
  } from './stores/template.js'
  import {
    useDaySettingsStore
  } from './stores/daySettings.js'
  import {
    getBackupConfig,
    saveBackupConfig
  } from './utils/backup.js'
  import {
    updateNavBar
  } from './utils/theme.js'
  import {
    CLOUD_ENV
  } from './utils/serverConfig.js'

  const FIRST_LAUNCH_KEY = 'first_launch_done'

  const GUIDE_CONTENT = [
    { icon: '📅', title: '日历浏览', desc: '首页展示月历，点击日期可查看/记录当日训练。左滑右滑切换月份，长按日期可清空该日记录' },
    { icon: '🏋️', title: '今日训练', desc: '点击"开始训练"按钮进入训练页面，从预设模板中选择，记录每个动作的重量和次数，自动计算与上次训练的对比' },
    { icon: '💪', title: '训练模板', desc: '在"训练模板"页面管理个人模板，支持创建、编辑、删除，添加/移除动作' },
    { icon: '📊', title: '训练统计', desc: '查看周/月训练总量，各肌群训练频次分析' },
    { icon: '📝', title: '纪念日', desc: '记录重要日期，首页底部展示已过去的天数' },
    { icon: '⏱️', title: '计时休息', desc: '记录训练组间休息时长，自动计时功能，支持自定义时长' },
  ]

  export default {
    components: {},
    data() {
      return {
        showGuide: false,
        guideChecked: false,
        themeClass: 'dark',
      }
    },
    onLaunch() {
      console.log('App Launch')

      // #ifdef MP-WEIXIN
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      } else if (CLOUD_ENV && CLOUD_ENV !== 'fitnote-cloud-xxxx') {
        // 仅在用户填写了真实云开发环境 ID 时初始化
        wx.cloud.init({
          env: CLOUD_ENV,
          traceUser: true,
        })
      } else {
        console.warn('[云开发] serverConfig.js 中 CLOUD_ENV 仍为占位符，跳过云开发初始化；非局域网备份将不可用')
      }
      // #endif

      const templateStore = useTemplateStore()
      templateStore.load()

      const daySettingsStore = useDaySettingsStore()
      daySettingsStore.load()
      this.themeClass = daySettingsStore.isDarkMode ? 'dark' : 'light'
      updateNavBar()

      this.checkFirstLaunch()

      this.setupActivityResultListener()

      uni.$on('themeChanged', () => {
        updateNavBar()
      })
    },
    methods: {
      checkFirstLaunch() {
        const launched = uni.getStorageSync(FIRST_LAUNCH_KEY)
        if (!launched) {
          this.showGuide = true
        }
      },
      closeGuide() {
        if (this.guideChecked) {
          uni.setStorageSync(FIRST_LAUNCH_KEY, true)
        }
        this.showGuide = false
      },
      setupActivityResultListener() {
        // #ifdef APP-PLUS
        console.log('设置ActivityResult监听器...')

        // 保存原始的方法
        const main = plus.android.runtimeMainActivity()
        const originalOnActivityResult = main.onActivityResult

        // 覆写onActivityResult方法
        main.onActivityResult = (requestCode, resultCode, data) => {
          console.log('onActivityResult被调用:', {
            requestCode,
            resultCode,
            data: data ? '有数据' : '无数据'
          })

          // 先调用原始方法
          if (originalOnActivityResult) {
            originalOnActivityResult.call(main, requestCode, resultCode, data)
          }

          // 处理我们自己的逻辑
          this.handleActivityResult(requestCode, resultCode, data)
        }

        // 同时监听uni的事件（双保险）
        uni.$on('uni:onActivityResult', (res) => {
          console.log('uni:onActivityResult事件触发:', res)
          this.handleActivityResult(res.requestCode, res.resultCode, res.data)
        })
        // #endif
      },

      handleActivityResult(requestCode, resultCode, data) {
        console.log('处理ActivityResult:', {
          requestCode,
          resultCode
        })

        const g = typeof globalThis !== 'undefined' ? globalThis : {}

        // 处理文件夹选择（请求码 1001）
        if (requestCode === 1001) {
          // 防止重复处理
          if (g._activityResultProcessed) {
            console.log('ActivityResult已处理过，跳过')
            return
          }
          g._activityResultProcessed = true

          // 3秒后重置
          setTimeout(() => {
            g._activityResultProcessed = false
          }, 3000)

          try {
            if (resultCode !== -1) { // RESULT_OK = -1
              console.log('用户取消选择或选择失败')
              if (g._safBackupReject) {
                g._safBackupReject(new Error('用户取消选择'))
                g._safBackupReject = null
                g._safBackupResolve = null
              }
              return
            }

            if (!data) {
              console.log('没有返回数据')
              if (g._safBackupReject) {
                g._safBackupReject(new Error('没有选择任何路径'))
                g._safBackupReject = null
                g._safBackupResolve = null
              }
              return
            }

            const main = plus.android.runtimeMainActivity()
            const Intent = plus.android.importClass('android.content.Intent')

            const uri = data.getData()
            if (!uri) {
              console.log('无法获取URI')
              if (g._safBackupReject) {
                g._safBackupReject(new Error('无法获取选择路径'))
                g._safBackupReject = null
                g._safBackupResolve = null
              }
              return
            }

            const uriStr = uri.toString()
            console.log('获取到URI:', uriStr)

            // 修复权限持久化调用
            try {
              const resolver = main.getContentResolver()
              const flags =
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION

              // 安卓15兼容的权限持久化调用方式
              plus.android.invoke(resolver, "takePersistableUriPermission", uri, flags)
              console.log('权限持久化成功')
            } catch (permErr) {
              console.warn('权限持久化失败:', permErr.message)
              // 即使权限持久化失败，也继续处理
              // 在安卓15上，有时不需要显式持久化权限，系统会自动处理
            }

            // 保存配置
            const cfg = getBackupConfig()
            cfg.defaultPath = uriStr
            saveBackupConfig(cfg)
            console.log('保存路径到配置:', uriStr)

            if (g._safBackupResolve) {
              g._safBackupResolve(uriStr)
              g._safBackupResolve = null
              g._safBackupReject = null
            } else {
              console.warn('没有找到resolve回调')
            }

          } catch (e) {
            console.error('处理ActivityResult异常:', e)
            if (g._safBackupReject) {
              g._safBackupReject(e)
              g._safBackupReject = null
              g._safBackupResolve = null
            }
          }
        }
        // 处理 CREATE_DOCUMENT (1005)
        if (requestCode === 1005) {
          // 防止重复处理
          if (g._activityResultProcessedCreateDoc) {
            console.log('ActivityResult(CREATE_DOCUMENT)已处理过，跳过')
            return
          }
          g._activityResultProcessedCreateDoc = true

          setTimeout(() => {
            g._activityResultProcessedCreateDoc = false
          }, 3000)

          try {
            if (resultCode !== -1) { // RESULT_OK = -1
              console.log('用户取消CREATE_DOCUMENT')
              if (g._createDocReject) {
                g._createDocReject(new Error('用户取消'))
                g._createDocReject = null
                g._createDocResolve = null
                g._createDocContent = null
                g._createDocFileName = null
              }
              return
            }

            if (!data) {
              console.log('没有返回数据')
              if (g._createDocReject) {
                g._createDocReject(new Error('没有创建文件'))
                g._createDocReject = null
                g._createDocResolve = null
                g._createDocContent = null
                g._createDocFileName = null
              }
              return
            }

            const main = plus.android.runtimeMainActivity()
            const Intent = plus.android.importClass('android.content.Intent')

            const uri = data.getData()
            if (!uri) {
              console.log('无法获取URI')
              if (g._createDocReject) {
                g._createDocReject(new Error('无法获取文件URI'))
                g._createDocReject = null
                g._createDocResolve = null
                g._createDocContent = null
                g._createDocFileName = null
              }
              return
            }

            const uriStr = uri.toString()
            console.log('CREATE_DOCUMENT获取到URI:', uriStr)

            // 尝试持久化权限
            try {
              const resolver = main.getContentResolver()
              const flags =
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION

              plus.android.invoke(resolver, "takePersistableUriPermission", uri, flags)
              console.log('CREATE_DOCUMENT权限持久化成功')
            } catch (permErr) {
              console.warn('CREATE_DOCUMENT权限持久化失败:', permErr.message)
              // 即使权限持久化失败，也继续处理
              // 在安卓15上，有时不需要显式持久化权限，系统会自动处理
            }

            if (g._createDocResolve) {
              g._createDocResolve(uriStr)
              g._createDocResolve = null
              g._createDocReject = null
              // 注意：这里不清除 _createDocContent 和 _createDocFileName
              // 因为在 writeWithCreateDocument 的回调中还需要使用它们
            } else {
              console.warn('没有找到CREATE_DOCUMENT的resolve回调')
            }

          } catch (e) {
            console.error('处理CREATE_DOCUMENT ActivityResult异常:', e)
            if (g._createDocReject) {
              g._createDocReject(e)
              g._createDocReject = null
              g._createDocResolve = null
              g._createDocContent = null
              g._createDocFileName = null
            }
          }
        }
        // 处理文件选择（请求码 1002）
        if (requestCode === 1002) {
          // 防止重复处理
          if (g._activityResultProcessedFile) {
            console.log('ActivityResult(文件)已处理过，跳过')
            return
          }
          g._activityResultProcessedFile = true

          // 3秒后重置
          setTimeout(() => {
            g._activityResultProcessedFile = false
          }, 3000)

          try {
            if (resultCode !== -1) { // RESULT_OK = -1
              console.log('用户取消文件选择')
              if (g._safFileReject) {
                g._safFileReject(new Error('用户取消选择'))
                g._safFileReject = null
                g._safFileResolve = null
              }
              return
            }

            if (!data) {
              console.log('没有返回数据')
              if (g._safFileReject) {
                g._safFileReject(new Error('没有选择任何文件'))
                g._safFileReject = null
                g._safFileResolve = null
              }
              return
            }

            const main = plus.android.runtimeMainActivity()
            const Intent = plus.android.importClass('android.content.Intent')

            const uri = data.getData()
            if (!uri) {
              console.log('无法获取URI')
              if (g._safFileReject) {
                g._safFileReject(new Error('无法获取选择的文件'))
                g._safFileReject = null
                g._safFileResolve = null
              }
              return
            }

            const uriStr = uri.toString()
            console.log('获取到文件URI:', uriStr)

            // 尝试持久化权限
            try {
              const resolver = main.getContentResolver()
              const flags =
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION

              plus.android.invoke(resolver, "takePersistableUriPermission", uri, flags)
              console.log('文件权限持久化成功')
            } catch (permErr) {
              console.warn('文件权限持久化失败:', permErr.message)
              // 即使权限持久化失败，也继续处理
            }

            if (g._safFileResolve) {
              g._safFileResolve(uriStr)
              g._safFileResolve = null
              g._safFileReject = null
            } else {
              console.warn('没有找到文件选择的resolve回调')
            }

          } catch (e) {
            console.error('处理文件选择ActivityResult异常:', e)
            if (g._safFileReject) {
              g._safFileReject(e)
              g._safFileReject = null
              g._safFileResolve = null
            }
          }
        }
        // 处理重新授权（请求码 1003）
        if (requestCode === 1003) {
          console.log('处理重新授权请求 (1003)')

          // 防止重复处理
          if (g._activityResultProcessedReauth) {
            console.log('重新授权已处理过，跳过')
            return
          }
          g._activityResultProcessedReauth = true

          setTimeout(() => {
            g._activityResultProcessedReauth = false
          }, 3000)

          try {
            if (resultCode !== -1) { // RESULT_OK = -1
              console.log('用户取消重新授权')
              if (g._safPermissionReject) {
                g._safPermissionReject(new Error('用户取消授权'))
                g._safPermissionReject = null
                g._safPermissionResolve = null
              }
              return
            }

            if (!data) {
              console.log('没有返回数据')
              if (g._safPermissionReject) {
                g._safPermissionReject(new Error('没有选择任何路径'))
                g._safPermissionReject = null
                g._safPermissionResolve = null
              }
              return
            }

            const main = plus.android.runtimeMainActivity()
            const Intent = plus.android.importClass('android.content.Intent')

            const uri = data.getData()
            if (!uri) {
              console.log('无法获取URI')
              if (g._safPermissionReject) {
                g._safPermissionReject(new Error('无法获取选择路径'))
                g._safPermissionReject = null
                g._safPermissionResolve = null
              }
              return
            }

            const uriStr = uri.toString()
            console.log('重新授权获取到URI:', uriStr)

            // 尝试持久化权限
            try {
              const resolver = main.getContentResolver()
              const flags =
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION

              plus.android.invoke(resolver, "takePersistableUriPermission", uri, flags)
              console.log('重新授权权限持久化成功')
            } catch (permErr) {
              console.warn('重新授权权限持久化失败:', permErr.message)
              // 即使权限持久化失败，也继续处理
            }

            if (g._safPermissionResolve) {
              g._safPermissionResolve(uriStr)
              g._safPermissionResolve = null
              g._safPermissionReject = null
            } else {
              console.warn('没有找到重新授权的resolve回调')
            }

          } catch (e) {
            console.error('处理重新授权ActivityResult异常:', e)
            if (g._safPermissionReject) {
              g._safPermissionReject(e)
              g._safPermissionReject = null
              g._safPermissionResolve = null
            }
          }
        }
      }
    },

    onShow: function() {
      console.log('App Show')
      const daySettingsStore = useDaySettingsStore()
      daySettingsStore.load()
      const newClass = daySettingsStore.isDarkMode ? 'dark' : 'light'
      if (this.themeClass !== newClass) {
        this.themeClass = newClass
      }
      updateNavBar()
    },
    onHide: function() {
      console.log('App Hide')
    },
  }
</script>

<template>
  <view class="app-root" :class="themeClass">
    <slot></slot>

    <view v-if="showGuide" class="guide-overlay">
      <view class="guide-panel">
        <view class="guide-header">
          <text class="guide-title">欢迎使用 FitNote</text>
          <text class="guide-subtitle">以下是主要功能介绍</text>
        </view>
        <scroll-view class="guide-body" scroll-y="true">
          <view v-for="(item, idx) in GUIDE_CONTENT" :key="idx" class="guide-item">
            <text class="guide-icon">{{ item.icon }}</text>
            <view class="guide-content">
              <text class="guide-item-title">{{ item.title }}</text>
              <text class="guide-item-desc">{{ item.desc }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="guide-footer">
          <view class="guide-checkbox-row">
            <checkbox :checked="guideChecked" @change="guideChecked = !guideChecked" class="guide-checkbox" />
            <text class="guide-checkbox-label">下次不再提醒</text>
          </view>
          <button class="guide-confirm-btn" @click="closeGuide">开始使用</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
@import '@/static/css/liquid-glass.css';
  /* 全局根容器配置 */
  html, body {
    overflow: hidden;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  page {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  uni-page-wrapper, uni-page-body {
    overflow: hidden !important;
    height: 100%;
  }

  /* ===== 全局 Design Token（深色模式默认） ===== */
  .container.dark {
    --bg-primary: #121212;
    --bg-secondary: #1e1e1e;
    --bg-tertiary: #242424;
    --bg-card: #242424;
    --bg-input: #1a1a1a;
    --bg-btn: #121212;
    --border-color: #333333;
    --border-light: rgba(255, 255, 255, 0.1);
    --text-primary: #f7f7f7;
    --text-secondary: #999999;
    --text-muted: #666666;
    --text-placeholder: #555555;
    --text-btn: #f5f5f5;
    --icon-bg: #ffffff;
    --icon-color: #191919;
    --divider-color: #555555;
    --tag-bg: #242424;
    --shadow-color: rgba(0, 0, 0, 0.2);
    --primary: #379bff;
    --primary-dark: #2d82d6;
    --primary-deep: #0048ff;
    --success: #2ed573;
    --danger: #ff5a5d;
    --warning: #f0ad4e;
    --card-bg: #1c1c1e;
    --section-title: #ffffff;
    --chip-bg: #3a3a3a;
    --chip-text: #cccccc;
    --chart-text: #aaaaaa;
    --chart-label: #888888;
    --empty-text: #777777;
    --grid-item-bg: #2c2c2e;
  }

  /* ===== 全局 Design Token（浅色模式） ===== */
  .container.light {
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f0f0f0;
    --bg-card: #ffffff;
    --bg-input: #f8f8f8;
    --bg-btn: #ffffff;
    --border-color: #e2e8f0;
    --border-light: #e2e8f0;
    --text-primary: #1a1a1a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --text-placeholder: #94a3b8;
    --text-btn: #1a1a1a;
    --icon-bg: #ffffff;
    --icon-color: #ffffff;
    --divider-color: #e2e8f0;
    --tag-bg: #ffffff;
    --shadow-color: rgba(0, 0, 0, 0.08);
    --primary: #379bff;
    --primary-dark: #2d82d6;
    --primary-deep: #0048ff;
    --success: #2ed573;
    --danger: #ff5a5d;
    --warning: #f0ad4e;
    --card-bg: #ffffff;
    --section-title: #1a1a1a;
    --chip-bg: #e2e8f0;
    --chip-text: #1a1a1a;
    --chart-text: #475569;
    --chart-label: #64748b;
    --empty-text: #64748b;
    --grid-item-bg: #ffffff;
  }

  /* 统一各页面的最外层容器 */
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    box-sizing: border-box;
    overflow: hidden;
  }

  .guide-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.6);
  }
  .guide-panel {
    width: 85vw;
    max-height: 75vh;
    background-color: #1e1e1e;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .app-root.light .guide-panel {
    background-color: #ffffff;
  }

  .guide-header {
    padding: 18px 16px;
    text-align: center;
    border-bottom: 1px solid #333;
  }

  .app-root.light .guide-header {
    border-bottom: 1px solid #e0e0e0;
  }

  .guide-title {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
  }

  .app-root.light .guide-title {
    color: #333333;
  }

  .guide-subtitle {
    font-size: 13px;
    color: #888;
    margin-top: 4px;
  }

  .app-root.light .guide-subtitle {
    color: #666666;
  }

  .guide-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .guide-item {
    display: flex;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid #2a2a2a;
  }

  .app-root.light .guide-item {
    border-bottom: 1px solid #f0f0f0;
  }

  .guide-item:last-child {
    border-bottom: none;
  }

  .guide-icon {
    font-size: 24px;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .guide-content {
    flex: 1;
  }

  .guide-item-title {
    font-size: 15px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 4px;
  }

  .app-root.light .guide-item-title {
    color: #333333;
  }

  .guide-item-desc {
    font-size: 13px;
    color: #aaa;
    line-height: 1.5;
  }

  .app-root.light .guide-item-desc {
    color: #666666;
  }

  .guide-footer {
    padding: 12px 16px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .guide-checkbox-row {
    display: flex;
    align-items: center;
  }

  .guide-checkbox {
    width: 20px;
    height: 20px;
    margin-right: 8px;
    accent-color: #379bff;
  }

  .guide-checkbox-label {
    font-size: 14px;
    color: #aaa;
  }

  .app-root.light .guide-checkbox-label {
    color: #666666;
  }

  .guide-confirm-btn {
    width: 100%;
    height: 48px;
    background: linear-gradient(135deg, #379bff, #2d82d6);
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
  }

  .guide-confirm-btn:active {
    opacity: 0.9;
    transform: scale(0.98);
  }

  /* ===== 全局弹窗基础样式 ===== */

  /* 遮罩层 */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    justify-content: center;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
  }

  /* 居中弹窗 */
  .modal-panel {
    position: relative;
    width: 85vw;
    max-width: 360px;
    max-height: 80vh;
    background-color: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1;
    animation: modalFadeIn 0.25s ease;
  }

  /* 底部弹窗 */
  .popup-panel {
    position: relative;
    width: 100%;
    max-height: 85vh;
    background-color: var(--bg-secondary);
    border-radius: 16px 16px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1;
    animation: modalSlideUp 0.25s ease;
  }

  /* 弹窗头部 */
  .modal-header {
    height: 56px;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  /* 弹窗内容 */
  .modal-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }

  /* 弹窗底部 */
  .modal-footer {
    padding: 12px 16px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  /* 关闭按钮 */
  .close-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 20px;
    color: var(--text-muted);
    background: transparent;
  }

  .close-icon:active {
    background-color: var(--bg-tertiary);
  }

  /* 动画 */
  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes modalSlideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
</style>