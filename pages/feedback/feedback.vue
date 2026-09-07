<template>
  <scroll-view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    @touchstart="onSwipeTouchStart" @touchmove="onSwipeTouchMove" @touchend="onSwipeTouchEnd">
    <!-- 未登录引导 -->
    <view v-if="!isLoggedIn" class="login-guide card glass-base">
      <text class="guide-icon">💬</text>
      <text class="guide-title">登录后即可提交反馈与查看处理进度</text>
      <button class="btn-primary" @click="goToLogin">去登录</button>
    </view>

    <view v-else class="feedback-wrap">
      <!-- Tab 切换 -->
      <view class="swipe-tab-bar" :class="{ 'no-transition': swipeNoTransition }">
        <view class="swipe-tab-highlight" :style="swipeHighlightStyle"></view>
        <view v-for="(t, i) in tabs" :key="t.value" class="swipe-tab-item"
          :class="{ active: i === swipeCurrentIndex }" @click="onSwipeTabClick(i)">
          <text>{{ t.label }}</text>
        </view>
      </view>

      <!-- 提交反馈 -->
      <view v-show="activeTab === 'submit'" class="submit-form">
        <view class="form-card glass-base">
          <!-- 分类 -->
          <view class="form-item">
            <text class="form-label">反馈分类 <text class="required">*</text></text>
            <view class="category-grid">
              <view v-for="c in categories" :key="c.value" class="category-chip"
                :class="{ active: form.category === c.value }" @click="form.category = c.value">
                <text>{{ c.label }}</text>
              </view>
            </view>
          </view>

          <!-- 标题 -->
          <view class="form-item">
            <text class="form-label">标题 <text class="required">*</text></text>
            <input class="form-input" :value="form.title" @input="form.title = $event.detail.value"
              placeholder="一句话概括问题" maxlength="200" placeholder-class="input-placeholder" />
            <text class="counter">{{ form.title.length }}/200</text>
          </view>

          <!-- 描述 -->
          <view class="form-item">
            <text class="form-label">详细描述 <text class="required">*</text></text>
            <textarea class="form-textarea" :value="form.content" @input="form.content = $event.detail.value"
              placeholder="请描述您遇到的问题或建议（不少于10个字）" placeholder-class="input-placeholder" maxlength="1000" />
            <text class="counter">{{ form.content.length }}/1000</text>
          </view>

          <button :class="['btn-primary', 'submit-btn', { 'liquid-glass-btn': daySettingsStore.liquidGlassEnabled }]" :disabled="submitting || !canSubmit" @click="handleSubmit">
            {{ submitting ? '提交中...' : '提交反馈' }}
          </button>
        </view>
      </view>

      <!-- 我的反馈 -->
      <view v-show="activeTab === 'mine'" class="mine-list">
        <view v-if="!loading" class="feedback-cards">
          <view v-for="item in myFeedback" :key="item.id" class="feedback-card glass-base" @click="toggleExpand(item.id)">
            <view class="fb-header">
              <text class="fb-title">{{ item.title }}</text>
              <text class="fb-status" :class="'status-' + item.status">
                {{ item.statusText || '待处理' }}
              </text>
            </view>
            <view class="fb-meta">
              <text class="fb-category">{{ item.categoryText || '其他' }}</text>
              <text class="fb-time">{{ formatDate(item.createTime) }}</text>
            </view>

            <view v-if="expandedId === item.id" class="fb-detail">
              <text class="fb-content">{{ item.content }}</text>

              <view v-if="item.handleReply" class="fb-reply glass-base">
                <text class="reply-label">官方回复</text>
                <text class="reply-content">{{ item.handleReply }}</text>
                <text v-if="item.handlerAdminName" class="reply-meta">
                  {{ item.handlerAdminName }} · {{ formatDate(item.handleTime) }}
                </text>
              </view>
            </view>

            <text class="fb-expand-hint">
              {{ expandedId === item.id ? '收起' : '展开详情' }}
            </text>
          </view>

          <view v-if="myFeedback.length === 0" class="empty-state">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无反馈记录</text>
          </view>

          <view v-if="myFeedback.length > 0 && hasMore" class="load-more" @click="loadMore">
            <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
          </view>
        </view>

        <view v-if="loading" class="loading-state">
          <text>加载中...</text>
        </view>

        <view v-if="!loading && errorMsg" class="error-state" @click="reloadMine">
          <text>{{ errorMsg }}（点击重试）</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    submitFeedback,
    listMyFeedback
  } from '@/utils/serverCommunity.js'
  import {
    isLoggedIn
  } from '@/utils/serverBackup.js'
  import swipeTabMixin from '@/mixins/swipeTabMixin.js'

  export default {
    mixins: [swipeTabMixin],
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        isLoggedIn: isLoggedIn(),
        activeTab: 'submit',
        tabs: [{
            label: '提交反馈',
            value: 'submit'
          },
          {
            label: '我的反馈',
            value: 'mine'
          },
        ],
        categories: [{
            label: '产品建议',
            value: 1
          },
          {
            label: 'Bug 反馈',
            value: 2
          },
          {
            label: '数据问题',
            value: 3
          },
          {
            label: '其他',
            value: 4
          },
        ],
        form: {
          category: 1,
          title: '',
          content: '',
        },
        submitting: false,
        // 我的反馈列表
        myFeedback: [],
        page: 1,
        size: 10,
        total: 0,
        loading: false,
        loadingMore: false,
        hasMore: true,
        errorMsg: '',
        expandedId: null,
      }
    },
    onShow() {
      this.isLoggedIn = isLoggedIn()
      if (this.isLoggedIn && this.activeTab === 'mine' && this.myFeedback.length === 0) {
        this.fetchMine(true)
      }
      this.swipeMeasureTabRects()
    },
    onReady() {
      this.swipeMeasureTabRects()
    },
    computed: {
      swipeCurrentIndex() {
        return this.tabs.findIndex(t => t.value === this.activeTab)
      },
      canSubmit() {
        return this.form.title.trim().length > 0 && this.form.content.trim().length >= 10
      },
    },
    methods: {
      onSwipeTabChange(nextIdx) {
        const tab = this.tabs[nextIdx]
        this.activeTab = tab.value
        if (tab.value === 'mine' && this.myFeedback.length === 0) {
          this.fetchMine(true)
        }
      },
      goToLogin() {
        uni.navigateTo({
          url: '/pages/login/login'
        })
      },
      // ---------- 提交反馈 ----------
      validateForm() {
        if (!this.form.category) {
          uni.showToast({
            title: '请选择分类',
            icon: 'none'
          })
          return false
        }
        if (!this.form.title.trim()) {
          uni.showToast({
            title: '请填写标题',
            icon: 'none'
          })
          return false
        }
        if (!this.form.content.trim() || this.form.content.trim().length < 10) {
          uni.showToast({
            title: '描述不少于10个字',
            icon: 'none'
          })
          return false
        }
        return true
      },
      async handleSubmit() {
        if (this.submitting) return
        if (!this.validateForm()) return
        this.submitting = true
        try {
          await submitFeedback({
            category: this.form.category,
            title: this.form.title.trim(),
            content: this.form.content.trim(),
          })
          uni.showToast({
            title: '提交成功，感谢反馈！',
            icon: 'success'
          })
          // 重置表单
          this.form = {
            category: 1,
            title: '',
            content: ''
          }
          // 切换到我的反馈并刷新
          this.activeTab = 'mine'
          this.fetchMine(true)
        } catch (e) {
          uni.showToast({
            title: e?.message || '提交失败',
            icon: 'none'
          })
        } finally {
          this.submitting = false
        }
      },
      // ---------- 我的反馈 ----------
      async fetchMine(reset = false) {
        if (reset) {
          this.page = 1
          this.myFeedback = []
          this.hasMore = true
        }
        if (this.loading) return
        this.errorMsg = ''
        if (reset) this.loading = true
        else this.loadingMore = true
        try {
          const res = await listMyFeedback({
            page: this.page,
            size: this.size
          })
          const list = res?.list || []
          this.total = res?.total ?? 0
          if (reset) {
            this.myFeedback = list
          } else {
            this.myFeedback = this.myFeedback.concat(list)
          }
          this.hasMore = this.myFeedback.length < this.total
        } catch (e) {
          this.errorMsg = e?.message || '加载失败'
          if (reset) this.myFeedback = []
        } finally {
          this.loading = false
          this.loadingMore = false
        }
      },
      loadMore() {
        if (this.loadingMore || !this.hasMore) return
        this.page += 1
        this.fetchMine(false)
      },
      toggleExpand(id) {
        this.expandedId = this.expandedId === id ? null : id
      },
      reloadMine() {
        this.fetchMine(true)
      },
      // ---------- 工具 ----------
      formatDate(dt) {
        if (!dt) return ''
        const s = String(dt)
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
        if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`
        const dMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (dMatch) return `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`
        const n = Number(dt)
        if (!isNaN(n) && n > 0) {
          const d = new Date(n)
          const pad = (x) => String(x).padStart(2, '0')
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
        }
        return s
      },
    },
  }
</script>

<style scoped>
  @import '/static/css/swipe-tab-glass.css';

  .container {
    min-height: 100vh;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
  }

  .feedback-wrap {
    max-width: 600px;
    margin: 0 auto;
  }

  /* 登录引导 */
  .login-guide {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 24px;
    text-align: center;
  }

  .guide-icon {
    font-size: 48px;
  }

  .guide-title {
    font-size: 15px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .card {
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px solid var(--border-color);
  }

  /* Tab（页面特定布局，液态玻璃样式由 swipe-tab-glass.css 提供） */
  .swipe-tab-bar {
    margin-bottom: 16px;
  }

  .swipe-tab-item {
    flex: 1;
    padding: 10px 0;
    font-size: 15px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
  }

  .swipe-tab-item.active {
    background: var(--primary, #379bff);
    color: #fff;
    border-color: var(--primary, #379bff);
  }

  /* 表单 */
  .form-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 16px;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .required {
    color: #ff4d4f;
  }

  .category-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .category-chip {
    padding: 8px 16px;
    border-radius: 20px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    font-size: 13px;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .category-chip.active {
    background: var(--primary, #379bff);
    color: #fff;
    border-color: var(--primary, #379bff);
  }

  .form-input {
    width: 100%;
    height: 44px;
    line-height: 44px;
    box-sizing: border-box;
    padding: 0 14px;
    border-radius: 10px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    font-size: 15px;
    color: var(--text-primary);
  }

  .form-textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 120px;
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    font-size: 15px;
    color: var(--text-primary);
    line-height: 1.6;
  }

  .input-placeholder {
    color: var(--text-tertiary, #999);
  }

  .counter {
    align-self: flex-end;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .btn-primary {
    background: var(--primary, #379bff);
    color: #fff;
    border: none;
    border-radius: 12px;
    height: 48px;
    line-height: 48px;
    padding: 0;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
  }

  .btn-primary[disabled] {
    opacity: 0.6;
  }

  .submit-btn {
    margin-top: 4px;
    padding: 0 10px;
  }

  .btn-primary.liquid-glass-btn {
    background: var(--glass-bg) !important;
    border: none !important;
    box-shadow:
      0 0 0 0.5px var(--glass-edge) inset,
      0 1px 2px var(--glass-shadow-inner) inset !important;
    -webkit-backdrop-filter: blur(8px) saturate(120%) !important;
    backdrop-filter: blur(8px) saturate(120%) !important;
    color: var(--glass-text) !important;
  }

  .btn-primary.liquid-glass-btn:not([disabled]) {
    background: rgba(55, 155, 255, 0.6) !important;
    color: #ffffff !important;
  }

  .btn-primary.liquid-glass-btn:active {
    transform: scale(0.96) !important;
  }

  .btn-primary.liquid-glass-btn[disabled],
  .btn-primary.liquid-glass-btn.is-disabled {
    opacity: 0.5 !important;
  }

  /* 我的反馈列表 */
  .feedback-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .feedback-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 16px;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fb-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .fb-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
  }

  .fb-status {
    flex-shrink: 0;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
    line-height: 1.4;
  }

  .status-0 {
    background: #fff7e6;
    color: #d48806;
  }

  .status-1 {
    background: #e6f4ff;
    color: #1677ff;
  }

  .status-2 {
    background: #f6ffed;
    color: #389e0d;
  }

  .status-3 {
    background: #fff1f0;
    color: #cf1322;
  }

  .fb-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .fb-category {
    font-size: 11px;
    color: var(--primary, #379bff);
    background: rgba(55, 155, 255, 0.12);
    padding: 2px 8px;
    border-radius: 6px;
  }

  .fb-time {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .fb-detail {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .fb-content {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .fb-reply {
    background: var(--bg-primary);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .reply-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--primary, #379bff);
  }

  .reply-content {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .reply-meta {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .fb-expand-hint {
    align-self: flex-end;
    font-size: 12px;
    color: var(--text-secondary);
  }

  /* 状态 */
  .loading-state,
  .error-state {
    text-align: center;
    padding: 40px 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .load-more {
    text-align: center;
    padding: 16px 0;
    font-size: 14px;
    color: var(--primary, #379bff);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 60px 0;
  }

  .empty-icon {
    font-size: 40px;
  }

  .empty-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  /* 液态玻璃：表单/卡片容器已改用 glass-base 工具类 */
</style>