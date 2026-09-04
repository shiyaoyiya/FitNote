<template>
  <scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
    <view class="login-card">
      <!-- 顶部标识 -->
      <view class="logo-area">
        <view class="logo-circle">
          <view class="logo-icon"></view>
        </view>
        <text class="app-title">FitNote</text>
        <text class="app-subtitle">
          {{ localMode === 'checking' ? '检测服务器连通性…' :
             localMode === 'local' ? (authMode === 'login' ? '欢迎回来，登录以同步云端' : '注册账号开启云端备份') :
             'Spring Boot 未连接，使用微信登录' }}
        </text>
      </view>

      <!-- ====== 本地模式：用户名/密码登录（原有 UI） ====== -->
      <template v-if="localMode === 'local'">
        <!-- 登录 / 注册 切换 -->
        <view class="auth-tabs">
          <view :class="['auth-tab', { active: authMode === 'login' }]" @click="switchMode('login')">登录</view>
          <view :class="['auth-tab', { active: authMode === 'register' }]" @click="switchMode('register')">注册</view>
        </view>

        <!-- 表单 -->
        <view class="form-item">
          <text class="form-label">账号</text>
          <input class="form-input" v-model="authForm.username" placeholder="请输入账号（3-30 字符）" maxlength="30" />
        </view>
        <view class="form-item">
          <text class="form-label">密码</text>
          <input class="form-input" v-model="authForm.password" password placeholder="6-30 位字符" maxlength="30" />
        </view>
        <view v-if="authMode === 'register'" class="form-item">
          <text class="form-label">确认密码</text>
          <input class="form-input" v-model="authForm.confirmPassword" password placeholder="请再次输入密码" maxlength="30" />
        </view>

        <button class="btn-primary" @click="handleAuth" :disabled="authLoading">
          {{ authLoading ? '处理中…' : (authMode === 'login' ? '登录' : '注册并登录') }}
        </button>
      </template>

      <!-- ====== 云开发模式：微信一键登录 ====== -->
      <template v-else-if="localMode === 'cloud'">
        <!-- 完善信息表单（首次登录时显示） -->
        <view v-if="showProfileForm" class="profile-form">
          <view class="form-item avatar-picker">
            <text class="form-label">头像</text>
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <image v-if="wxProfile.avatarTempPath" class="avatar-preview" :src="wxProfile.avatarTempPath" mode="aspectFill" />
              <view v-else class="avatar-placeholder">
                <text class="avatar-placeholder-text">点击选择</text>
              </view>
            </button>
          </view>
          <view class="form-item">
            <text class="form-label">昵称</text>
            <input class="form-input" type="nickname" v-model="wxProfile.nickname" placeholder="请输入昵称" maxlength="30" @blur="onNicknameBlur" />
          </view>
          <button class="btn-primary" @click="handleWxLoginConfirm" :disabled="authLoading">
            {{ authLoading ? '登录中…' : '确认并登录' }}
          </button>
        </view>

        <!-- 一键登录按钮 -->
        <button v-else class="btn-wx-login" @click="handleWxLogin" :disabled="authLoading">
          {{ authLoading ? '登录中…' : '微信一键登录' }}
        </button>
      </template>

      <!-- 检测中占位 -->
      <view v-else class="checking-placeholder">
        <text class="checking-text">正在检测服务器连通性…</text>
      </view>

      <view v-if="statusMessage" class="status-banner" :class="statusType">
        <text class="status-icon">{{ statusType === 'success' ? '✅' : '❌' }}</text>
        <text>{{ statusMessage }}</text>
      </view>

      <view class="back-link" @click="handleBack">返回上一页</view>
    </view>
  </scroll-view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'
  import {
    registerUser,
    loginUser,
    isLoggedIn,
    me,
    isLocalServerAvailable,
  } from '@/utils/serverBackup.js'
  import { SERVER_BASE_URL, SERVER_ENV } from '@/utils/serverConfig.js'
  import { setTokens } from '@/utils/serverRequest.js'
  // #ifdef MP-WEIXIN
  import {
    cloudLogin,
    uploadAvatar,
    cloudUpdateProfile,
    isCloudLoginMode,
  } from '@/utils/cloudAuth.js'
  // #endif

  // HMR 兜底：若 registerUser 编译缓存版本未携带 confirmPassword，则改用直连请求
  async function registerUserFallback({ username, password, confirmPassword, nickname }) {
    return new Promise((resolve, reject) => {
      uni.request({
        url: SERVER_BASE_URL + '/api/auth/user/register',
        method: 'POST',
        data: { username, password, confirmPassword, nickname },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          const d = res && res.data ? res.data : null
          if (!d) return reject(new Error('注册接口无响应'))
          if (d.code === 0 || d.code === 200 || d.success === true) return resolve(d.data || null)
          let msg = d.msg || d.message || '注册失败'
          if (d.data && typeof d.data === 'object' && !Array.isArray(d.data)) {
            const arr = Object.values(d.data).filter(v => typeof v === 'string')
            if (arr.length) msg = arr.join('；')
          } else if (Array.isArray(d.data)) {
            const arr = d.data.map(x => (x && x.message) || (x && x.msg) || String(x)).filter(Boolean)
            if (arr.length) msg = arr.join('；')
          }
          reject(new Error(msg))
        },
        fail: (err) => reject(new Error((err && err.errMsg) || '网络错误')),
      })
    })
  }
  // HMR 兜底：loginUser 缓存版本若不兼容，走页内直连
  async function loginUserDirect({ username, password }) {
    return new Promise((resolve, reject) => {
      uni.request({
        url: SERVER_BASE_URL + '/api/auth/user/login',
        method: 'POST',
        data: { username, password },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          const d = res && res.data ? res.data : null
          if (!d) return reject(new Error('登录接口无响应'))
          if (d.code === 0 || d.code === 200 || d.success === true) {
            const vo = d.data || {}
            // 后端 UserLoginVO: { token, expiresIn, user }
            if (vo && vo.token) {
              setTokens({ accessToken: vo.token, refreshToken: vo.token, user: vo.user })
            }
            return resolve(vo)
          }
          reject(new Error(d.msg || d.message || '登录失败'))
        },
        fail: (err) => reject(new Error((err && err.errMsg) || '网络错误')),
      })
    })
  }

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        authMode: 'login',
        authLoading: false,
        authForm: {
          username: '',
          password: '',
          confirmPassword: '',
          nickname: '',
        },
        statusType: '',
        statusMessage: '',
        // 路由模式：'checking' | 'local' | 'cloud'
        localMode: 'checking',
        // 微信登录完善信息表单
        showProfileForm: false,
        wxProfile: {
          nickname: '',
          avatarTempPath: '', // chooseAvatar 返回的临时路径
        },
      }
    },
    async onLoad(options) {
      this.daySettingsStore.load()
      // 支持通过参数指定模式：/pages/login/login?mode=register
      if (options && options.mode === 'register') this.authMode = 'register'

      // 已登录则直接返回
      if (isLoggedIn()) {
        setTimeout(() => uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) }), 0)
        return
      }

      // 自动检测本地服务器连通性
      try {
        const ok = await isLocalServerAvailable(true)
        this.localMode = ok ? 'local' : 'cloud'
      } catch (e) {
        this.localMode = 'cloud'
      }

      // #ifdef MP-WEIXIN
      // 云开发模式下，如果是已登录的云开发用户（从其他页面跳来），直接返回
      if (this.localMode === 'cloud' && isCloudLoginMode() && isLoggedIn()) {
        setTimeout(() => uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) }), 0)
      }
      // #endif
    },
    methods: {
      switchMode(m) {
        if (this.authLoading || this.authMode === m) return
        this.authMode = m
        this.statusMessage = ''
        this.statusType = ''
      },
      setStatus(type, message) {
        this.statusType = type
        this.statusMessage = message
        if (message) {
          setTimeout(() => {
            if (this.statusMessage === message) {
              this.statusType = ''
              this.statusMessage = ''
            }
          }, 3500)
        }
      },
      handleBack() {
        uni.navigateBack({
          fail: () => uni.switchTab({ url: '/pages/index/index' }),
        })
      },

      // ============ 微信云开发登录 ============
      // #ifdef MP-WEIXIN
      /**
       * 微信一键登录入口
       * 流程：wx.login → 云函数 login → 拿 openid + 用户信息
       *   - 老用户：直接登录成功
       *   - 新用户：显示完善信息表单（选头像 + 输昵称）
       */
      async handleWxLogin() {
        this.authLoading = true
        this.setStatus('', '')
        try {
          const { user, isNew } = await cloudLogin()
          if (isNew) {
            // 新用户：显示完善信息表单
            this.showProfileForm = true
            this.wxProfile.nickname = user.nickname && user.nickname !== '微信用户' ? user.nickname : ''
            this.setStatus('success', '登录成功，请完善个人信息')
          } else {
            // 老用户：直接登录成功
            this._onCloudLoginSuccess(user)
          }
        } catch (e) {
          this.setStatus('error', '微信登录失败：' + (e.message || ''))
        } finally {
          this.authLoading = false
        }
      },

      /**
       * chooseAvatar 回调：拿到头像临时文件路径
       */
      onChooseAvatar(e) {
        if (e && e.detail && e.detail.avatarUrl) {
          this.wxProfile.avatarTempPath = e.detail.avatarUrl
        }
      },

      /**
       * nickname 输入框失焦回调
       * 微信小程序 type="nickname" 的 input 在 blur 时才会真正写入 value
       */
      onNicknameBlur(e) {
        if (e && e.detail && e.detail.value) {
          this.wxProfile.nickname = e.detail.value
        }
      },

      /**
       * 完善信息表单的确认按钮
       * 流程：上传头像到云存储 → 调用 updateProfile 云函数 → 登录完成
       */
      async handleWxLoginConfirm() {
        const nickname = (this.wxProfile.nickname || '').trim()
        if (!nickname) {
          return uni.showToast({ title: '请输入昵称', icon: 'none' })
        }
        this.authLoading = true
        this.setStatus('', '')
        try {
          // 1. 上传头像到云存储（如果用户选了）
          let avatarUrl = ''
          if (this.wxProfile.avatarTempPath) {
            try {
              avatarUrl = await uploadAvatar(this.wxProfile.avatarTempPath)
            } catch (e) {
              console.warn('头像上传失败，继续登录流程', e)
            }
          }

          // 2. 更新用户资料
          const user = await cloudUpdateProfile({ nickname, avatarUrl })
          this._onCloudLoginSuccess(user)
        } catch (e) {
          this.setStatus('error', '资料更新失败：' + (e.message || ''))
        } finally {
          this.authLoading = false
        }
      },

      /**
       * 云开发登录成功后的统一处理
       */
      _onCloudLoginSuccess(user) {
        this.setStatus('success', '登录成功')
        uni.showToast({ title: '成功', icon: 'success' })
        uni.$emit && uni.$emit('cloud-user-changed', user)
        setTimeout(() => {
          uni.navigateBack({
            fail: () => uni.switchTab({ url: '/pages/index/index' }),
          })
        }, 600)
      },
      // #endif
      async handleAuth() {
        if (!this.authForm.username || !this.authForm.password) {
          return uni.showToast({ title: '请填写账号和密码', icon: 'none' })
        }
        if (this.authMode === 'register') {
          if (!this.authForm.confirmPassword) {
            return uni.showToast({ title: '请填写确认密码', icon: 'none' })
          }
          if (this.authForm.password !== this.authForm.confirmPassword) {
            return uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
          }
          if (this.authForm.password.length < 6 || this.authForm.password.length > 30) {
            return uni.showToast({ title: '密码长度需 6-30 位', icon: 'none' })
          }
          if (this.authForm.username.length < 3 || this.authForm.username.length > 30) {
            return uni.showToast({ title: '账号长度需 3-30 字符', icon: 'none' })
          }
        }
        this.authLoading = true
        this.setStatus('', '')
        try {
          if (this.authMode === 'register') {
            const regPayload = {
              username: this.authForm.username.trim(),
              password: this.authForm.password,
              confirmPassword: this.authForm.confirmPassword,
              nickname: this.authForm.nickname ? this.authForm.nickname.trim() : undefined,
            }
            try {
              await registerUser(regPayload)
            } catch (regErr) {
              const msg = (regErr && regErr.message) || ''
              if (msg.indexOf('确认密码必填') >= 0 || msg.indexOf('两次密码不一致') >= 0) {
                await registerUserFallback(regPayload)
              } else {
                throw regErr
              }
            }
          }
          const loginPayload = {
            username: this.authForm.username.trim(),
            password: this.authForm.password,
          }
          let vo
          try {
            vo = await loginUser(loginPayload)
          } catch (loginErr) {
            vo = await loginUserDirect(loginPayload)
          }
          // 校验持久化结果
          if (!isLoggedIn()) {
            // 后端响应未携带 token 字段，回退兜底
            vo = await loginUserDirect(loginPayload)
          }
          this.setStatus('success', this.authMode === 'register' ? '注册并登录成功' : '登录成功')
          uni.showToast({ title: '成功', icon: 'success' })
          // 通知其他页面登录态已变化
          uni.$emit && uni.$emit('cloud-user-changed', me())
          setTimeout(() => {
            uni.navigateBack({
              fail: () => uni.switchTab({ url: '/pages/index/index' }),
            })
          }, 600)
        } catch (e) {
          this.setStatus('error', e.message || '操作失败')
        } finally {
          this.authLoading = false
        }
      },
    },
  }
</script>

<style scoped>
  .container {
    min-height: 100vh;
    background-color: var(--bg-primary);
    padding: 40px 24px 60px;
    box-sizing: border-box;
  }

  .container.dark {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.light {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .login-card {
    background: var(--bg-secondary);
    border-radius: 24px;
    padding: 28px 22px 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  }

  .logo-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 22px;
  }

  .logo-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary, #379bff), var(--primary-deep, #0048ff));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(55, 155, 255, 0.3);
    margin-bottom: 12px;
  }

  .logo-icon {
    width: 34px;
    height: 34px;
    background-color: #ffffff;
    -webkit-mask-image: url('/static/profile.svg');
    mask-image: url('/static/profile.svg');
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }

  .app-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .app-subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 6px;
    text-align: center;
  }

  .auth-tabs {
    display: flex;
    background: var(--bg-tertiary);
    border-radius: 10px;
    padding: 3px;
    margin-bottom: 18px;
  }

  .auth-tab {
    flex: 1;
    text-align: center;
    padding: 9px 0;
    border-radius: 8px;
    font-size: 14px;
    color: var(--text-muted);
    transition: all 0.2s;
  }

  .auth-tab.active {
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  .form-item {
    margin-bottom: 14px;
  }

  .form-label {
    display: block;
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .form-input {
    height: 46px;
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 0 14px;
    font-size: 14px;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, var(--primary, #379bff), var(--primary-deep, #0048ff));
    color: #fff;
    border: none;
    border-radius: 14px;
    height: 50px;
    line-height: 50px;
    font-size: 15px;
    font-weight: 600;
    margin-top: 6px;
    box-shadow: 0 6px 16px rgba(55, 155, 255, 0.25);
  }

  .btn-primary[disabled] {
    opacity: 0.6;
    box-shadow: none;
  }

  .status-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    font-size: 13px;
    margin-top: 14px;
  }

  .status-banner.success {
    background: rgba(46, 213, 115, 0.12);
    color: var(--success, #2ed573);
  }

  .status-banner.error {
    background: rgba(255, 90, 93, 0.12);
    color: var(--danger, #ff5a5d);
  }

  .status-icon {
    font-size: 14px;
  }

  .back-link {
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    margin-top: 18px;
    padding: 6px 0;
  }

  .back-link:active {
    opacity: 0.6;
  }

  /* ============ 云开发模式样式 ============ */
  .btn-wx-login {
    width: 100%;
    background: #07c160;
    color: #fff;
    border: none;
    border-radius: 14px;
    height: 50px;
    line-height: 50px;
    font-size: 15px;
    font-weight: 600;
    box-shadow: 0 6px 16px rgba(7, 193, 96, 0.25);
  }

  .btn-wx-login[disabled] {
    opacity: 0.6;
    box-shadow: none;
  }

  .checking-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
  }

  .checking-text {
    font-size: 14px;
    color: var(--text-muted);
  }

  /* 完善信息表单 */
  .profile-form {
    margin-top: 8px;
  }

  .avatar-picker {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .avatar-btn {
    width: 80px;
    height: 80px;
    padding: 0;
    margin: 8px 0 0;
    border-radius: 50%;
    background: var(--bg-tertiary);
    border: 2px dashed var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    line-height: normal;
  }

  .avatar-btn::after {
    border: none;
  }

  .avatar-preview {
    width: 76px;
    height: 76px;
    border-radius: 50%;
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .avatar-placeholder-text {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
