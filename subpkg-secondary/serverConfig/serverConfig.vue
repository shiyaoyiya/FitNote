<template>
  <scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <view class="config-card">
      <view class="section-title">服务器地址</view>
      <view class="desc">配置后端服务器地址，切换 WiFi / 手机热点时只需修改此处的 IP 即可。</view>

      <view class="input-group">
        <text class="input-label">服务器 IP 地址</text>
        <view class="input-row">
          <text class="protocol">http://</text>
          <input class="ip-input" :value="ipInput" @input="onIpInput" placeholder="例如 192.168.1.100" maxlength="30" />
        </view>
      </view>

      <view class="input-group">
        <text class="input-label">端口</text>
        <input class="port-input" :value="portInput" @input="onPortInput" placeholder="8080" type="number" maxlength="6" />
      </view>

      <view class="preview-row">
        <text class="preview-label">当前地址：</text>
        <text class="preview-url">{{ previewUrl }}</text>
      </view>

      <view class="status-row" v-if="testing">
        <view class="status-spinner"></view>
        <text class="status-text">正在测试连接...</text>
      </view>
      <view class="status-row" v-else-if="testResult !== null">
        <text class="status-icon">{{ testResult ? '✅' : '❌' }}</text>
        <text class="status-text" :class="{ ok: testResult, fail: !testResult }">
          {{ testResult ? '连接成功' : '连接失败，请检查 IP 和端口' }}
        </text>
      </view>

      <view class="btn-group">
        <button class="btn-test" @click="testConnection" :disabled="testing">测试连接</button>
        <button class="btn-save" @click="saveConfig" :disabled="saving">保存</button>
      </view>

      <view class="section-title" style="margin-top: 30px;">当前生效地址</view>
      <view class="info-row">
        <text class="info-label">SERVER_BASE_URL</text>
        <text class="info-value">{{ currentBaseUrl }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">ENV_MODE</text>
        <text class="info-value">{{ serverEnv }}</text>
      </view>

      <button class="btn-reset" @click="resetConfig">恢复默认地址</button>

      <view class="tips">
        <text class="tips-title">提示</text>
        <text class="tips-item">· 查看电脑 IP：Windows 上按 Win+R，输入 cmd，运行 ipconfig，找到 IPv4 地址</text>
        <text class="tips-item">· 手机和电脑需连接同一个 WiFi（校园网/企业网可能有 AP 隔离，无法互通）</text>
        <text class="tips-item">· 如果 Windows 防火墙阻止了连接，请放行 8080 端口入站规则</text>
        <text class="tips-item">· 手机热点模式：电脑 IP 通常为 192.168.x.x，热点网关即为电脑 IP</text>
      </view>
    </view>
  </scroll-view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'
  import { getCustomServerUrl, setCustomServerUrl, getServerBaseUrl, SERVER_ENV } from '@/utils/serverConfig.js'
  import { isLocalServerAvailable } from '@/utils/serverBackup.js'

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        ipInput: '',
        portInput: '8080',
        testing: false,
        testResult: null,
        saving: false,
        currentBaseUrl: getServerBaseUrl(),
        serverEnv: SERVER_ENV,
      }
    },
    computed: {
      previewUrl() {
        const ip = this.ipInput.trim()
        const port = this.portInput.trim() || '8080'
        if (!ip) return '(未配置)'
        return `http://${ip}:${port}`
      },
    },
    mounted() {
      this.loadCurrentConfig()
    },
    methods: {
      loadCurrentConfig() {
        const customUrl = getCustomServerUrl()
        if (customUrl) {
          const match = customUrl.match(/^https?:\/\/([^:]+):(\d+)/)
          if (match) {
            this.ipInput = match[1]
            this.portInput = match[2]
          } else {
            this.ipInput = customUrl.replace(/^https?:\/\//, '')
          }
        } else {
          this.currentBaseUrl = getServerBaseUrl()
        }
      },
      onIpInput(e) {
        this.ipInput = e.detail.value
        this.testResult = null
      },
      onPortInput(e) {
        this.portInput = e.detail.value
        this.testResult = null
      },
      buildUrl() {
        const ip = this.ipInput.trim()
        if (!ip) return ''
        const port = this.portInput.trim() || '8080'
        return `http://${ip}:${port}`
      },
      async testConnection() {
        const url = this.buildUrl()
        if (!url) {
          uni.showToast({ title: '请输入服务器 IP', icon: 'none' })
          return
        }
        this.testing = true
        this.testResult = null
        try {
          setCustomServerUrl(url)
          const available = await isLocalServerAvailable(true)
          this.testResult = available
        } catch (e) {
          this.testResult = false
        } finally {
          this.testing = false
        }
      },
      saveConfig() {
        const url = this.buildUrl()
        if (!url) {
          uni.showToast({ title: '请输入服务器 IP', icon: 'none' })
          return
        }
        this.saving = true
        setCustomServerUrl(url)
        this.currentBaseUrl = getServerBaseUrl()
        uni.showToast({ title: '保存成功', icon: 'success' })
        this.saving = false
      },
      resetConfig() {
        uni.showModal({
          title: '恢复默认',
          content: '将清除自定义服务器地址，恢复使用代码中的默认配置。确定吗？',
          success: (res) => {
            if (res.confirm) {
              setCustomServerUrl('')
              this.ipInput = ''
              this.portInput = '8080'
              this.testResult = null
              uni.showToast({ title: '已恢复默认', icon: 'success' })
            }
          },
        })
      },
    },
  }
</script>

<style scoped>
  .container {
    min-height: 100vh;
    background-color: var(--bg-primary);
  }

  .config-card {
    padding: 20px 16px 40px;
    max-width: 480px;
    margin: 0 auto;
  }

  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .input-group {
    margin-bottom: 16px;
  }

  .input-label {
    display: block;
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .input-row {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 0 12px;
    height: 48px;
  }

  .protocol {
    font-size: 14px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .ip-input {
    flex: 1;
    font-size: 16px;
    color: var(--text-primary);
    height: 48px;
  }

  .port-input {
    width: 100%;
    height: 48px;
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 0 12px;
    font-size: 16px;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .preview-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .preview-label {
    font-size: 13px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .preview-url {
    font-size: 14px;
    color: var(--primary);
    font-weight: 600;
    word-break: break-all;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .status-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status-icon {
    font-size: 18px;
  }

  .status-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .status-text.ok { color: #4caf50; }
  .status-text.fail { color: #f44336; }

  .btn-group {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }

  .btn-test, .btn-save {
    flex: 1;
    height: 44px;
    border-radius: 22px;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
  }

  .btn-test {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-save {
    background: var(--primary);
    color: #fff;
  }

  .btn-test:active, .btn-save:active {
    opacity: 0.8;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-label {
    font-size: 13px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .info-value {
    font-size: 13px;
    color: var(--text-primary);
    text-align: right;
    word-break: break-all;
  }

  .btn-reset {
    width: 100%;
    height: 44px;
    border-radius: 22px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 16px;
    border: none;
  }

  .btn-reset:active {
    opacity: 0.8;
  }

  .tips {
    margin-top: 24px;
    padding: 16px;
    background: var(--bg-tertiary);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tips-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .tips-item {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.6;
  }
</style>
