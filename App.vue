<script>
  // 1. 导入模板store（新增）
  import {
    useTemplateStore
  } from './stores/template.js'
  // 导入backup.js中的函数
  import {
    getBackupConfig,
    saveBackupConfig
  } from './utils/backup.js'

  export default {
    onLaunch() {
      console.log('App Launch')
      // 2. 应用启动时加载模板数据（新增核心代码）
      const templateStore = useTemplateStore()
      templateStore.load()

      this.setupActivityResultListener()
    },

    methods: {
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
    },
    onHide: function() {
      console.log('App Hide')
    },
  }
</script>

<style>
  /* 全局根容器配置 */
  page {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* 统一各页面的最外层容器 */
  .container {
    display: flex;
    flex-direction: column;
    /* 使用 vh 在某些手机浏览器会有工具栏遮挡问题，改为 100% 配合 page 设置 */
    height: 100vh;
    background-color: #f8f9fa;
    box-sizing: border-box;
    overflow: hidden;
    /* 必须禁止，否则会产生双滚动条 */
  }

  .container {
    background-color: #121212;
  }
</style>