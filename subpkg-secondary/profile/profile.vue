<template>
  <scroll-view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <view class="profile-card">
      <!-- 头像区 -->
      <view class="avatar-area" @click="handleChooseAvatar">
        <view class="avatar-circle">
          <image v-if="avatarDisplaySrc" class="avatar-img" :src="avatarDisplaySrc" mode="aspectFill" @error="onAvatarError" />
          <view v-else class="avatar-placeholder"></view>
        </view>
        <view class="avatar-edit-badge">
          <text class="badge-icon">📷</text>
        </view>
        <text class="avatar-hint">{{ avatarUploading ? '上传中…' : '点击更换头像' }}</text>
      </view>

      <!-- 昵称 + 账号信息 -->
      <view class="section-title">账号信息</view>
      <!-- 昵称：默认只读，点击进入编辑 -->
      <view class="info-row" v-if="!editingNickname" @click="startEditNickname">
        <text class="info-label">昵称</text>
        <view class="info-value-row">
          <text class="info-value">{{ form.nickname || '-' }}</text>
          <text class="edit-arrow">›</text>
        </view>
      </view>
      <view class="info-row edit-row" v-else>
        <text class="info-label">昵称</text>
        <view class="edit-input-wrap">
          <input class="edit-input" v-model="form.nickname" placeholder="请输入昵称" maxlength="30" :focus="true" @blur="saveNickname" @confirm="saveNickname" />
          <text class="edit-done" @click="saveNickname">完成</text>
        </view>
      </view>
      <!-- #ifndef MP-WEIXIN -->
      <view class="info-row">
        <text class="info-label">账号</text>
        <text class="info-value">{{ profile.username || '-' }}</text>
      </view>
      <!-- #endif -->
      <!-- 注册时间：仅本地服务端模式显示（云开发无此字段） -->
      <view class="info-row" v-if="!_isCloudMode()">
        <text class="info-label">注册时间</text>
        <text class="info-value">{{ formatDate(profile.registerTime) }}</text>
      </view>

      <!-- 训练统计（只读） -->
      <view class="section-title">训练统计</view>
      <view class="info-row">
        <text class="info-label">累计训练天数</text>
        <text class="info-value">{{ computedStats.totalTrainDays }} 天</text>
      </view>
      <view class="info-row">
        <text class="info-label">累计训练总量</text>
        <text class="info-value">{{ formatVolume(computedStats.totalVolumeKg) }} kg</text>
      </view>

      <button class="btn-primary" @click="handleSave" :disabled="saving">
        {{ saving ? '保存中…' : '保存修改' }}
      </button>

      <view v-if="statusMessage" class="status-banner" :class="statusType">
        <text class="status-icon">{{ statusType === 'success' ? '✅' : '❌' }}</text>
        <text>{{ statusMessage }}</text>
      </view>

      <view class="info-row" style="margin-top: 20px;" @click="goToServerConfig">
        <text class="info-label">服务器设置</text>
        <view class="info-value-row">
          <text class="info-value" :class="{ 'status-online': serverStatus === 'online', 'status-offline': serverStatus === 'offline' }">
            {{ serverStatus === 'online' ? '已连接' : serverStatus === 'offline' ? '未连接' : '检测中…' }}
          </text>
          <text class="edit-arrow">›</text>
        </view>
      </view>

      <button class="btn-logout" @click="handleLogout" :disabled="loggingOut">
        {{ loggingOut ? '退出中…' : '退出登录' }}
      </button>
    </view>
  </scroll-view>
</template>

<script>
  import { useDaySettingsStore } from '@/stores/daySettings.js'
  import { useUserProfileStore } from '@/stores/userProfile.js'
  import {
    isLoggedIn,
    me,
    logoutUser,
    isLocalServerAvailable,
  } from '@/utils/serverBackup.js'
  import {
    getMyProfile,
    updateMyProfile,
    uploadMyAvatar,
  } from '@/subpkg-secondary/utils/serverCommunity.js'
  import {
    updateCurrentUser,
    resolveAvatarUrl,
    cacheProfile,
    getCachedProfile,
    getCachedAvatarImage,
    downloadAndCacheAvatar,
  } from '@/utils/serverRequest.js'
  import { rememberCurrentBaseUrl } from '@/utils/serverConfig.js'
  // #ifdef MP-WEIXIN
  import {
    isCloudLoginMode,
    uploadAvatar as cloudUploadAvatar,
    cloudUpdateProfile,
    cloudLogout,
  } from '@/utils/cloudAuth.js'
  // #endif

  export default {
    components: {},
    data() {
      const today = new Date()
      const pad = (n) => n.toString().padStart(2, '0')
      return {
        daySettingsStore: useDaySettingsStore(),
        profile: {},
        form: {
          nickname: '',
          avatarUrl: '',
          birthday: '',
        },
        todayStr: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
        saving: false,
        avatarUploading: false,
        loggingOut: false,
        editingNickname: false,
        statusType: '',
        statusMessage: '',
        // 服务器连接状态：'checking' | 'online' | 'offline'
        serverStatus: 'checking',
        // 头像加载失败后的本地 base64 兜底
        avatarFallback: '',
        avatarFallbackTried: false,
      }
    },
    computed: {
      /**
       * 头像显示地址：优先本地 base64 缓存（离线/服务器地址变化时仍能显示），
       * 其次原 URL；加载失败时通过 onAvatarError 下载并缓存 base64 兜底。
       */
      avatarDisplaySrc() {
        const url = this.form.avatarUrl
        if (!url) return ''
        if (this.avatarFallback) return this.avatarFallback
        const cached = getCachedAvatarImage(url)
        if (cached) return cached
        return resolveAvatarUrl(url)
      },
      /**
       * 训练统计：直接从本地 storage 中 fitness_daydata_* 键聚合
       * 无论云开发还是本地服务器模式，训练数据都存在本地，
       * 按天扫描 templates.actionWeights 计算累计天数和总量
       */
      computedStats() {
        try {
          const DAYDATA_PREFIX = 'fitness_daydata_'
          const info = uni.getStorageInfoSync()
          const allKeys = info.keys || []
          let totalDays = 0
          let totalVolume = 0
          allKeys.forEach((key) => {
            if (!key.startsWith(DAYDATA_PREFIX)) return
            const data = uni.getStorageSync(key) || {}
            const templates = data.templates || {}
            if (Object.keys(templates).length === 0) return
            totalDays += 1
            for (const tplName in templates) {
              const tpl = templates[tplName]
              const actionWeights = tpl.actionWeights || {}
              for (const actionName in actionWeights) {
                totalVolume += actionWeights[actionName] || 0
              }
            }
          })
          return {
            totalTrainDays: totalDays,
            totalVolumeKg: Math.round(totalVolume * 100) / 100,
          }
        } catch (e) {
          return { totalTrainDays: 0, totalVolumeKg: 0 }
        }
      },
    },
    watch: {
      // 头像 URL 变化时重置错误兜底状态
      'form.avatarUrl'() {
        this.avatarFallback = ''
        this.avatarFallbackTried = false
      },
    },
    onLoad() {
      this.daySettingsStore.load()
      useUserProfileStore().load()
      // 未登录直接跳登录
      if (!isLoggedIn()) {
        uni.redirectTo({
          url: '/pages/login/login',
          fail: () => uni.showToast({ title: '请先登录', icon: 'none' }),
        })
        return
      }
      this.checkServerStatus()
      this.loadProfile()
    },
    methods: {
      /** 是否云开发登录模式（仅 MP-WEIXIN 会返回 true） */
      _isCloudMode() {
        // #ifdef MP-WEIXIN
        try { return isCloudLoginMode() } catch (e) { return false }
        // #endif
        return false
      },
      /** 自动检测服务器连接状态（本地服务器模式），并记住成功地址 */
      async checkServerStatus() {
        if (this._isCloudMode()) {
          this.serverStatus = 'online'
          return
        }
        try {
          const ok = await isLocalServerAvailable(true)
          this.serverStatus = ok ? 'online' : 'offline'
          if (ok) rememberCurrentBaseUrl()
        } catch (e) {
          this.serverStatus = 'offline'
        }
      },
      async loadProfile() {
        // ===== 云开发模式：本地登录态即权威数据 =====
        if (this._isCloudMode()) {
          const local = isLoggedIn() ? me() : null
          const vo = local ? {
            id: local.id,
            username: local.openid ? ('wx_' + (local.openid).slice(-6)) : (local.username || '云用户'),
            nickname: local.nickname || '',
            avatarUrl: local.avatarUrl || '',
            birthday: local.birthday || '',
            totalTrainDays: local.totalTrainDays ?? 0,
            totalVolumeKg: local.totalVolumeKg ?? 0,
            registerTime: local.createTime || local.registerTime || '',
          } : null
          this.profile = vo || {}
          this.form.nickname = vo?.nickname || vo?.username || ''
          this.form.avatarUrl = vo?.avatarUrl || ''
          this.form.birthday = vo?.birthday || ''
          return
        }

        // ===== 本地服务器模式 =====
        // 1) 先用本地登录态/缓存立即渲染，避免网络慢/不可达时整页显示“-”
        const localUser = isLoggedIn() ? me() : null
        const cached = getCachedProfile()
        const initialVo = cached || (localUser ? {
          id: localUser.id,
          username: localUser.username || '',
          nickname: localUser.nickname || '',
          avatarUrl: localUser.avatarUrl || '',
          birthday: localUser.birthday || '',
          totalTrainDays: localUser.totalTrainDays ?? 0,
          totalVolumeKg: localUser.totalVolumeKg ?? 0,
          registerTime: localUser.createTime || localUser.registerTime || '',
        } : null)
        if (initialVo) {
          this.profile = initialVo
          this.form.nickname = initialVo.nickname || initialVo.username || ''
          this.form.avatarUrl = initialVo.avatarUrl || ''
          this.form.birthday = initialVo.birthday || ''
        }

        // 2) 异步拉取服务器最新资料
        try {
          const vo = await getMyProfile()
          this.profile = vo || {}
          // 昵称独立于账号（username），可自由修改
          this.form.nickname = vo?.nickname || vo?.username || ''
          this.form.avatarUrl = vo?.avatarUrl || ''
          this.form.birthday = vo?.birthday || ''
          // 写离线缓存（24h），服务器不可达时也能显示账号信息
          cacheProfile(vo)
          // 预下载头像为 base64 缓存，供离线/服务器地址变化时兜底显示
          if (vo?.avatarUrl) {
            downloadAndCacheAvatar(vo.avatarUrl).catch(() => {})
          }
          // 同步本地登录态（后端最新昵称/头像等；缺失字段不会覆盖本地）
          const next = updateCurrentUser({
            username: vo?.username,
            nickname: vo?.nickname || vo?.username,
            avatarUrl: vo?.avatarUrl,
            totalTrainDays: vo?.totalTrainDays,
            totalVolumeKg: vo?.totalVolumeKg,
            registerTime: vo?.registerTime,
          })
          uni.$emit && uni.$emit('cloud-user-changed', next)
        } catch (e) {
          // 服务器不可达：保留第 1 步渲染的本地数据，仅提示数据来源
          this.setStatus('error', '服务器未连接，当前显示本地缓存数据')
        }
      },
      resolveAvatarUrl(url) {
        return resolveAvatarUrl(url)
      },
      /** 头像图片加载失败：尝试用本地 base64 缓存兜底显示 */
      onAvatarError() {
        if (this.avatarFallbackTried) return
        this.avatarFallbackTried = true
        const url = this.form.avatarUrl
        if (!url) return
        downloadAndCacheAvatar(url)
          .then((base64) => {
            if (base64 && base64 !== url) this.avatarFallback = base64
          })
          .catch(() => {})
      },
      onBirthdayChange(e) {
        this.form.birthday = e.detail.value || ''
      },
      async handleChooseAvatar() {
        if (this.avatarUploading) return
        try {
          const res = await new Promise((resolve, reject) => {
            uni.chooseImage({
              count: 1,
              sizeType: ['compressed'],
              sourceType: ['album', 'camera'],
              success: (r) => resolve(r),
              fail: (err) => reject(err),
            })
          })
          let tempPath = (res.tempFilePaths && res.tempFilePaths[0]) || (res.tempFiles && res.tempFiles[0].path)
          if (!tempPath) return

          // 1:1 裁剪（微信小程序）
          // #ifdef MP-WEIXIN
          if (typeof wx !== 'undefined' && typeof wx.cropImage === 'function') {
            try {
              const cropRes = await new Promise((resolve, reject) => {
                wx.cropImage({
                  src: tempPath,
                  cropStyle: '1:1',
                  success: (r) => resolve(r),
                  fail: (e) => reject(e),
                })
              })
              if (cropRes && cropRes.tempFilePath) {
                tempPath = cropRes.tempFilePath
              }
            } catch (e) {
              // 用户取消裁剪或 API 不可用，使用原图
            }
          }
          // #endif

          this.avatarUploading = true
          this.setStatus('', '')

          let url = ''
          if (this._isCloudMode()) {
            // #ifdef MP-WEIXIN
            const fileID = await cloudUploadAvatar(tempPath)
            await cloudUpdateProfile({ avatarUrl: fileID })
            url = fileID
            // #endif
          } else {
            url = await uploadMyAvatar(tempPath)
          }

          // 立即更新表单，预览（后端已写库）
          this.form.avatarUrl = url
          // 同步本地登录态
          const next = updateCurrentUser({ avatarUrl: url })
          // 异步下载图片并缓存为 base64，供离线/服务器地址变化时兜底显示
          downloadAndCacheAvatar(url).catch(() => {})
          // 通知其他页面（如首页）刷新头像
          uni.$emit && uni.$emit('cloud-user-changed', next)
          uni.$emit && uni.$emit('avatar-changed', url)
          uni.showToast({ title: '头像已更新', icon: 'success' })
        } catch (e) {
          const msg = (e && e.message) || ''
          if (msg.indexOf('cancel') >= 0 || msg.indexOf('chooseImage') >= 0) return
          this.setStatus('error', msg || '头像上传失败')
        } finally {
          this.avatarUploading = false
        }
      },
      async handleSave() {
        const nickname = (this.form.nickname || '').trim()
        const birthday = this.form.birthday || null
        this.saving = true
        this.setStatus('', '')
        try {
          let vo = null
          if (this._isCloudMode()) {
            // #ifdef MP-WEIXIN
            const patch = {}
            if (nickname) patch.nickname = nickname
            const updated = await cloudUpdateProfile(patch)
            vo = {
              id: updated.id,
              username: this.profile.username,
              nickname: updated.nickname,
              avatarUrl: updated.avatarUrl,
              birthday: birthday || null,
              totalTrainDays: this.profile.totalTrainDays ?? 0,
              totalVolumeKg: this.profile.totalVolumeKg ?? 0,
              registerTime: this.profile.registerTime || '',
            }
            this.profile.birthday = birthday || null
            // #endif
          } else {
            vo = await updateMyProfile({ nickname, birthday })
          }
          this.profile = vo || this.profile
          this.form.nickname = vo?.nickname || this.form.nickname
          const next = updateCurrentUser({
            username: vo?.username,
            nickname: vo?.nickname || vo?.username,
            avatarUrl: vo?.avatarUrl,
            totalTrainDays: vo?.totalTrainDays,
            totalVolumeKg: vo?.totalVolumeKg,
          })
          uni.$emit && uni.$emit('cloud-user-changed', next)
          // 同步更新离线缓存
          cacheProfile(this.profile)
          this.setStatus('success', '保存成功')
          uni.showToast({ title: '已保存', icon: 'success' })
        } catch (e) {
          this.setStatus('error', e.message || '保存失败')
        } finally {
          this.saving = false
        }
      },
      startEditNickname() {
        this.editingNickname = true
      },
      async saveNickname() {
        if (!this.editingNickname) return
        const nickname = (this.form.nickname || '').trim()
        if (!nickname) {
          uni.showToast({ title: '昵称不能为空', icon: 'none' })
          return
        }
        if (nickname.length > 30) {
          uni.showToast({ title: '昵称不超过30字', icon: 'none' })
          return
        }
        this.editingNickname = false
        // 昵称有变化才提交
        if (nickname === (this.profile.nickname || this.profile.username || '')) return
        try {
          let vo = null
          if (this._isCloudMode()) {
            // #ifdef MP-WEIXIN
            const updated = await cloudUpdateProfile({ nickname })
            vo = {
              id: updated.id,
              username: this.profile.username,
              nickname: updated.nickname,
              avatarUrl: updated.avatarUrl,
            }
            // #endif
          } else {
            vo = await updateMyProfile({ nickname })
          }
          this.profile = vo || this.profile
          this.form.nickname = vo?.nickname || nickname
          const next = updateCurrentUser({
            username: vo?.username,
            nickname: vo?.nickname || vo?.username,
          })
          uni.$emit && uni.$emit('cloud-user-changed', next)
          // 同步更新离线缓存
          cacheProfile(this.profile)
          uni.showToast({ title: '昵称已更新', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: e.message || '更新失败', icon: 'none' })
        }
      },
      async handleLogout() {
        uni.showModal({
          title: '退出登录',
          content: '确定要退出当前云端账号吗？',
          confirmText: '退出',
          success: (res) => {
            if (!res.confirm) return
            this.loggingOut = true
            // 根据登录模式选择退出清理方式
            if (this._isCloudMode()) {
              // #ifdef MP-WEIXIN
              try { cloudLogout() } catch (e) { /* ignore */ }
              // #endif
            } else {
              logoutUser()
            }
            uni.$emit && uni.$emit('cloud-user-changed', null)
            setTimeout(() => {
              this.loggingOut = false
              uni.showToast({ title: '已退出登录', icon: 'success' })
              setTimeout(() => {
                uni.navigateBack({
                  fail: () => uni.switchTab({ url: '/pages/index/index' }),
                })
              }, 400)
            }, 200)
          },
        })
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
      formatDate(t) {
        if (!t) return '-'
        const s = String(t).replace('T', ' ')
        return s.substring(0, 16)
      },
      formatVolume(v) {
        if (v == null) return '0'
        const n = Number(v)
        if (Number.isNaN(n)) return '0'
        return Number.isInteger(n) ? String(n) : n.toFixed(1)
      },
      goToServerConfig() {
        uni.navigateTo({
          url: '/subpkg-secondary/serverConfig/serverConfig',
        })
      },
    },
  }
</script>

<style scoped>
  .container {
    min-height: 100vh;
    background-color: var(--bg-primary);
    padding: 30px 22px 60px;
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

  .profile-card {
    background: var(--bg-secondary);
    border-radius: 24px;
    padding: 24px 20px 28px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  }

  /* 头像区 */
  .avatar-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 18px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 10px;
  }
  .avatar-circle {
    position: relative;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary, #379bff), var(--primary-deep, #0048ff));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 18px rgba(55, 155, 255, 0.3);
    overflow: hidden;
  }
  .avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
  .avatar-placeholder {
    width: 50px;
    height: 50px;
    background-color: #ffffff;
    -webkit-mask-image: url('/static/profile.svg');
    mask-image: url('/static/profile.svg');
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
  .avatar-edit-badge {
    margin-top: -22px;
    margin-left: 70px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--primary, #379bff);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }
  .badge-icon {
    font-size: 15px;
    line-height: 1;
  }
  .avatar-hint {
    margin-top: 12px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .section-title {
    padding: 16px 4px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 4px;
    border-bottom: 1px solid var(--border-color);
  }
  .info-label {
    font-size: 14px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  .info-value {
    font-size: 14px;
    color: var(--text-primary);
    text-align: right;
    flex: 1;
    min-width: 0;
    word-break: break-all;
  }
  .info-value-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  .edit-arrow {
    font-size: 18px;
    color: var(--text-muted);
    line-height: 1;
  }
  .status-online {
    color: var(--success, #2ed573);
    font-weight: 600;
  }
  .status-offline {
    color: var(--danger, #ff5a5d);
    font-weight: 600;
  }
  .edit-row {
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 6px 12px;
    margin: 4px -4px;
  }
  .edit-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: flex-end;
  }
  .edit-input {
    flex: 1;
    height: 38px;
    font-size: 14px;
    color: var(--text-primary);
    text-align: right;
    max-width: 180px;
  }
  .edit-done {
    font-size: 14px;
    color: var(--primary, #379bff);
    font-weight: 600;
    flex-shrink: 0;
  }

  /* 表单 */
  .form-item {
    margin-top: 14px;
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
  .picker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .picker-text {
    font-size: 14px;
    color: var(--text-primary);
  }
  .picker-text.placeholder {
    color: var(--text-muted);
  }
  .picker-arrow {
    font-size: 22px;
    color: var(--text-muted);
    line-height: 1;
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
    margin-top: 22px;
    box-shadow: 0 6px 16px rgba(55, 155, 255, 0.25);
  }
  .btn-primary[disabled] {
    opacity: 0.6;
    box-shadow: none;
  }

  .btn-logout {
    width: 100%;
    background: transparent;
    color: var(--danger, #ff5a5d);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    height: 46px;
    line-height: 46px;
    font-size: 14px;
    margin-top: 14px;
  }
  .btn-logout[disabled] {
    opacity: 0.6;
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
</style>
