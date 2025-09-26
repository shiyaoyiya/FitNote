<template>
  <view :class="['container', darkModeClass]">
    <!-- 顶部固定：可编辑模板名称输入框 -->
    <view class="header-fixed">
      <view class="input-wrapper">
        <text class="pen-icon">重命名：️️</text>
        <input v-model="templateName" placeholder="模板名称" class="template-name-input" @blur="onNameBlur" />
      </view>
    </view>

    <!-- 中间：动作列表，只有此处可滚动 -->
    <view class="mid-scroll">
      <view class="action-list">
        <view v-for="(act, idx) in chosenActions" :key="idx" class="action-row" @touchstart="handleTagTouchStart(idx)"
          @touchmove="handleTagTouchMove" @touchend="handleTagTouchEnd">
          <view class="action-tag">
            <button class="move-btn left" @click.stop="moveAction(idx, -1)" :disabled="idx === 0">
              ↑
            </button>
            <text class="tag-label" @click="goHistory(idx)">
              {{ act }}
            </text>
            <button class="move-btn right" @click.stop="moveAction(idx, +1)"
              :disabled="idx === chosenActions.length - 1">
              ↓
            </button>
          </view>
        </view>
        <view v-if="chosenActions.length === 0" class="no-data-mid">
          <text>该模板下暂无动作，点击“添加动作”添加</text>
        </view>
      </view>
    </view>

    <!-- 底部固定：配色 + 添加动作 + 保存按钮 -->
    <view class="footer-fixed">
      <view class="color-display" @click="showColorPopup = true">
        <span class="color-text">模板配色：</span>
        <view v-if="currentColor" class="color-circle-lg" :style="{ backgroundColor: currentColor }"></view>
        <text v-else class="no-color-text">未设置配色</text>
      </view>
      <view class="footer-buttons">
        <button class="btn-add-action" @click="openAddActionPopup">
          添加动作
        </button>
        <button class="btn-save" @click="saveTemplate">保存</button>
      </view>
    </view>

    <!-- 添加动作 弹窗（同 Day 页面） -->
    <view v-if="showAddActionPopup" class="popup-overlay" @click.self="closeAddActionPopup">
      <view class="overlay-bg" @click="closeAddActionPopup"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择要添加的动作</text>
          <!-- ===== 新增 搜索区域 ===== -->
          <view class="search-wrapper">
            <text v-if="!showSearchInput" class="search-trigger" @click="showSearchInput = true">
              搜索
            </text>
            <input v-else v-model="searchTerm" placeholder="请输入关键字" class="search-input"
              @input="availableActions = filteredActions" />
            <!-- 点击 × 清空搜索 -->
            <text v-if="searchTerm" class="clear-search" @click="searchTerm=''; availableActions=allActions">
              清空
            </text>
          </view>
          <!-- ========== -->
          <text class="close-icon" @click="closeAddActionPopup">×</text>
        </view>
        <view class="modal-body">
          <scroll-view class="action-select-list" scroll-y="true" show-scrollbar="false" :style="{ height: '60vh' }">
            <view v-for="(act, idx) in availableActions" :key="idx" class="template-tag"
              :class="{ selected: selectedActionIdx === idx }" @click="selectAction(idx)">
              <text class="tag-text-center">{{ act }}</text>
            </view>
            <view v-if="availableActions.length === 0" class="no-data-mid">
              <text>暂无动作，请先在首页添加</text>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer btn-row">
          <button class="btn-confirm" @click="addSelectedAction">
            确认添加
          </button>
        </view>
      </view>
    </view>

    <!-- ========== 颜色选择 弹窗（居中弹出） ========== -->
    <view v-if="showColorPopup" class="color-popup-overlay" @click.self="closeColorPopup">
      <view class="overlay-bg" @click="closeColorPopup"></view>
      <view class="color-popup-center" @click.stop>
        <!-- 顶部：清空颜色 & 添加自定义 & 关闭 -->
        <view class="color-popup-header">
          <text class="clear-color" @click="clearColor">清空颜色</text>
          <!-- 新增：“添加自定义”按钮 -->
          <text class="add-custom-color" @click="openCustomColorPopup">
            添加自定义
          </text>
          <text class="close-icon" @click="closeColorPopup">×</text>
        </view>

        <!-- 中部：颜色列表（可滚动） -->
        <scroll-view class="color-popup-body" scroll-y="true" show-scrollbar="false">
          <view v-for="(cObj, idx) in presetColors" :key="idx" class="template-tag"
            :style="{ backgroundColor: cObj.value }" @click="selectColor(cObj.value)"
            @touchstart="handleColorTouchStart(idx)" @touchmove="handleColorTouchMove" @touchend="handleColorTouchEnd">
            <text class="tag-text-center" :style="{ color: getContrastColor(cObj.value) }">
              {{ cObj.name }}
            </text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 新增：自定义颜色 弹窗 ========== -->
    <view v-if="showCustomColorPopup" class="color-popup-overlay" @click.self="closeCustomColorPopup">
      <view class="overlay-bg" @click="closeCustomColorPopup"></view>
      <view class="custom-color-popup-center" @click.stop>
        <view class="color-popup-header">
          <text class="modal-title">添加自定义颜色</text>
          <text class="close-icon" @click="closeCustomColorPopup">×</text>
        </view>
        <view class="modal-body">
          <view class="input-row-custom">
            <input v-model="newColorName" placeholder="颜色名称（例如：珊瑚红）" class="color-name-input" maxlength="12" />
          </view>
          <view class="input-row-custom">
            <input v-model="newColorCode" placeholder="#RRGGBB" class="color-code-input" maxlength="7" />
            <button class="btn-add-color" @click="addCustomColor">添加</button>
          </view>
          <view v-if="colorError" class="error-text">
            {{ colorError }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useTemplateStore
  } from '@/stores/template.js'

  export default {
    data() {
      return {
        templateName: '',
        originalName: '',
        chosenActions: [],
        currentColor: '',
        showAddActionPopup: false,
        availableActions: [],
        selectedActionIdx: null,
        showColorPopup: false,
        showCustomColorPopup: false,
        newColorName: '',
        newColorCode: '',
        colorError: '',
        darkMode: false,
        darkModeClass: 'light',
        pressedActionIndex: -1,
        longPressTimer: null,
        longPressThreshold: 500,
        pressedColorIndex: -1,
        longPressColorTimer: null,
        presetColors: [{
            name: '清水蓝',
            value: '#93d5dc'
          },
          {
            name: '松石绿',
            value: '#4DB6AC'
          },
          {
            name: '藤萝紫',
            value: '#8076a3'
          },
          {
            name: '姜红',
            value: '#eeb8c3'
          },
          {
            name: '克莱因蓝',
            value: '#002fa7'
          },
          {
            name: '马尔斯绿',
            value: '#01847f'
          },
          {
            name: '申布伦黄',
            value: '#fbd26a'
          },
          {
            name: '提香红',
            value: '#d44848'
          },
          {
            name: '粉红',
            value: '#f2b9b2'
          },
          {
            name: '玛瑙灰',
            value: '#cfccc9'
          },
          {
            name: '汉白玉',
            value: '#f8f4ed'
          }
        ],
        // 搜索框
        showSearchInput: false, // 是否展示搜索框
        searchTerm: '', // 当前搜索关键字
        allActions: [], // 添加动作弹窗打开前的完整列表副本
      }
    },
    computed: {
      filteredActions() {
        if (!this.searchTerm) {
          return this.allActions.slice()
        }
        const kw = this.searchTerm.toLowerCase()
        return this.allActions.filter(a => a.toLowerCase().includes(kw))
      },
    },
    // uni-app 专用：onLoad 拿到参数
    onLoad(options) {
      // 1) 读取模板名
      if (options.template) {
        this.templateName = decodeURIComponent(options.template)
        this.originalName = this.templateName
        uni.setNavigationBarTitle({
          title: this.templateName + ' 模板详情'
        })
      }

      // 2) 初始化 Pinia Store
      this.tplStore = useTemplateStore()
      this.tplStore.load()

      // 3) 加载本地动作列表
      const arr = uni.getStorageSync('fitness_actions')
      this.availableActions = Array.isArray(arr) ? arr : []

      // 4) 读取模板详情到本地 state
      this.loadTemplateDetail()
    },
    onShow() {
      this.tplStore.load()
      this.loadTemplateDetail()
    },
    mounted() {
      // 深色模式初始化
      const dm = uni.getStorageSync('darkMode')
      if (dm === 'auto') {
        this.darkMode = uni.getSystemInfoSync().theme === 'dark'
      } else {
        this.darkMode = dm === true
      }
      this.darkModeClass = this.darkMode ? 'dark' : 'light'
      this.updateNavigationBarStyle(this.darkMode)
    },

    methods: {
      loadTemplateDetail() {
        const {
          actions,
          color,
          customColors
        } =
        this.tplStore.loadTemplateDetail(this.templateName)
        this.chosenActions = actions
        this.currentColor = color
      },
      goHistory(idx) {
        const actName = this.chosenActions[idx]
        uni.navigateTo({
          url: `../actionHistory/actionHistory?action=${encodeURIComponent(actName)}`
        })
      },
      // 改名
      onNameBlur() {
        const oldName = this.originalName.trim()
        const newName = this.templateName.trim()
        if (!newName || newName === oldName) return
        this.tplStore.rename(oldName, newName)
        this.originalName = newName
        uni.setNavigationBarTitle({
          title: newName
        })
        this.loadTemplateDetail()
      },

      // 添加/删除/移动动作
      addSelectedAction() {
        if (this.selectedActionIdx == null) {
          uni.showToast({
            title: '请选择一个动作',
            icon: 'none'
          });
          return;
        }
        const act = this.availableActions[this.selectedActionIdx];

        // —— 新增：重复校验 —— 
        if (this.chosenActions.includes(act)) {
          uni.showToast({
            title: '动作已在模板中',
            icon: 'none'
          });
          return;
        }

        // 真正在 Store 里添加，并刷新列表
        this.tplStore.addAction(this.templateName, act);
        this.loadTemplateDetail();
        this.showAddActionPopup = false;

        uni.showToast({
          title: `已添加：${act}`,
          icon: 'success'
        });
      },
      moveAction(idx, delta) {
        this.tplStore.moveAction(this.templateName, idx, idx + delta)
        this.loadTemplateDetail()
      },
      handleTagTouchStart(idx) {
        this.pressedActionIndex = idx
        clearTimeout(this.longPressTimer)
        this.longPressTimer = setTimeout(() => this.handleTagLongPress(idx), this.longPressThreshold)
      },
      handleTagTouchMove() {
        clearTimeout(this.longPressTimer)
      },
      handleTagTouchEnd() {
        clearTimeout(this.longPressTimer);
        this.pressedActionIndex = -1
      },
      handleTagLongPress(idx) {
        uni.vibrateShort({
          type: 'light'
        });
        uni.showModal({
          title: '删除动作',
          content: `确定删除 "${this.chosenActions[idx]}" 吗？`,
          success: res => {
            if (res.confirm) {
              this.tplStore.removeAction(this.templateName, idx)
              this.loadTemplateDetail()
            }
          }
        })
      },

      // 配色
      selectColor(c) {
        this.tplStore.setColor(this.templateName, c)
        this.currentColor = c
        this.showColorPopup = false
      },
      clearColor() {
        this.tplStore.clearColor(this.templateName)
        this.currentColor = ''
      },

      // 自定义颜色
      addCustomColor() {
        const name = this.newColorName.trim()
        const code = this.newColorCode.trim()
        if (!name) {
          this.colorError = '请输入颜色名称'
          return
        }
        if (!/^#([0-9A-Fa-f]{6})$/.test(code)) {
          this.colorError = '请输入合法 6 位十六进制色码'
          return
        }
        this.tplStore.addCustomColor(this.templateName, name, code)
        this.closeCustomColorPopup()
        this.showColorPopup = true
      },
      handleColorTouchStart(idx) {
        this.pressedColorIndex = idx
        clearTimeout(this.longPressColorTimer)
        this.longPressColorTimer = setTimeout(() => this.handleColorLongPress(idx), this.longPressThreshold)
      },
      handleColorTouchMove() {
        clearTimeout(this.longPressColorTimer)
      },
      handleColorTouchEnd() {
        clearTimeout(this.longPressColorTimer);
        this.pressedColorIndex = -1
      },
      handleColorLongPress(idx) {
        const colors = this.tplStore.loadTemplateDetail(this.templateName).customColors || []
        const nm = colors[idx]?.name || ''
        uni.showModal({
          title: '删除自定义颜色',
          content: `确定删除 "${nm}" 吗？`,
          success: res => {
            if (res.confirm) {
              this.tplStore.removeCustomColor(this.templateName, idx)
              // 如果删掉了当前配色，清空
              if (this.currentColor === colors[idx]?.value) {
                this.currentColor = ''
              }
            }
          }
        })
      },

      // 保存
      saveTemplate() {
        // Store 已自动保存所有改动
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })
        uni.navigateBack()
      },

      // 导航栏配色
      updateNavigationBarStyle(isDark) {
        uni.setNavigationBarColor({
          frontColor: isDark ? '#f7f7f7' : '#333333',
          backgroundColor: isDark ? '#121212' : '#f5f5f5',
          animation: {
            duration: 200,
            timingFunc: 'easeIn'
          }
        })
      },
      // ---------- “添加动作” 弹窗相关 ----------
      /** 打开“选择动作”弹窗 */
      openAddActionPopup() {
        // 把当前完整动作列表存一份
        this.allActions = uni.getStorageSync('fitness_actions') || []
        // 初始化搜索状态
        this.searchTerm = ''
        this.showSearchInput = false
        // 打开弹窗
        this.showAddActionPopup = true
        // 刷新 availableActions
        this.availableActions = this.allActions.slice()
        this.selectedActionIdx = null
      },
      /** 关闭“选择动作”弹窗 */
      closeAddActionPopup() {
        this.showAddActionPopup = false
        this.selectedActionIdx = null
      },
      /** 选中某个动作（高亮） */
      selectAction(idx) {
        this.selectedActionIdx = idx
      },

      // ---------- “颜色选择” 弹窗相关 ----------
      /** 关闭配色弹窗 */
      closeColorPopup() {
        this.showColorPopup = false
      },

      // ---------- “自定义颜色” 弹窗相关 ----------
      /** 关闭自定义颜色弹窗 */
      closeCustomColorPopup() {
        this.showCustomColorPopup = false
        this.newColorName = ''
        this.newColorCode = ''
        this.colorError = ''
      },

      // ---------- 配色用到的对比色计算 ----------
      /** 根据背景色计算文字对比色 */
      getContrastColor(hex) {
        if (!hex) return '#000000'
        let c = hex.replace('#', '')
        if (c.length === 3) {
          c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
        }
        const r = parseInt(c.slice(0, 2), 16)
        const g = parseInt(c.slice(2, 4), 16)
        const b = parseInt(c.slice(4, 6), 16)
        const yiq = (r * 299 + g * 587 + b * 114) / 1000
        return yiq >= 128 ? '#000000' : '#FFFFFF'
      },
    }
  }
</script>

<style scoped>
  /* ========== 整体 & 深色模式 ========== */
  .container {
    position: relative;
    height: 100vh;
    overflow: hidden;
    background-color: #f5f5f5;
    color: #333;
  }

  .container.dark {
    background-color: #121212;
    color: #f7f7f7;
  }

  /* ========== 顶部固定 输入框 ========== */
  .header-fixed {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    padding: 10px 20px;
    background-color: inherit;
    z-index: 10;
    display: flex;
    align-items: center;
  }

  .input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .pen-icon {
    font-size: 18px;
    margin-right: 8px;
    color: #888;
  }

  .container.dark .pen-icon {
    color: #bbb;
  }

  .template-name-input {
    flex: 1;
    height: 36px;
    font-size: 16px;
    color: inherit;
    background-color: transparent;
    border: none;
    padding: 0;
  }

  .template-name-input::placeholder {
    color: #aaa;
  }

  .container.dark .template-name-input::placeholder {
    color: #666;
  }

  /* ========== 中间：滚动区域 ========== */
  .mid-scroll {
    position: absolute;
    top: 56px;
    bottom: 76px;
    left: 0;
    right: 0;
    overflow-y: auto;
  }

  .action-list {
    padding: 10px 20px;
  }

  .action-row {
    margin-bottom: 10px;
  }

  .action-tag {
    position: relative;
    display: flex;
    align-items: center;
    background-color: #fff;
    border-radius: 8px;
    height: 50px;
    line-height: 50px;
    padding: 0 40px;
    box-sizing: border-box;
  }

  .container.dark .action-tag {
    background-color: #505050;
  }

  .tag-label {
    flex: 1;
    text-align: center;
    color: inherit;
  }

  .move-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    background-color: transparent !important;
    border: none;
    padding: 0;
    font-size: 16px;
    line-height: 32px;
    color: inherit;
  }

  .move-btn.left {
    left: 8px;
  }

  .move-btn.right {
    right: 8px;
  }

  .move-btn:disabled {
    opacity: 0.5;
  }

  .no-data-mid {
    text-align: center;
    color: #999;
  }

  /* ========== 底部固定 区域 ========== */
  .footer-fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background-color: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px solid #e0e0e0;
  }

  .container.dark .footer-fixed {
    border-top-color: #333;
  }

  .color-display {
    flex: 1;
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-left: 20px;
  }

  .color-circle-lg {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    border: 1px solid #ccc;
  }

  .container.dark .color-circle-lg {
    border-color: #555;
  }

  .no-color-text,
  .color-text {
    font-size: 14px;
    color: #999;
  }

  .container.dark .no-color-text,
  .container.dark .color-text {
    color: #bbb;
  }

  .footer-buttons {
    display: flex;
    flex-direction: row;
    gap: 12px;
    margin-right: 20px;
  }

  .btn-add-action,
  .btn-save {
    height: 36px;
    padding: 0 20px;
    background-color: #379bff;
    color: #fff;
    border-radius: 5px;
    font-size: 14px;
    line-height: 36px;
    text-align: center;
  }

  .btn-add-action {
    background-color: #4caf50;
  }

  .btn-add-action:active,
  .btn-save:active {
    opacity: 0.8;
  }

  /* ========== 添加动作 弹窗 ========== */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.3);
  }

  .popup-panel {
    position: relative;
    width: 80vw;
    max-height: 70vh;
    background-color: #f5f5f5;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1001;
    margin-top: -44px;
  }

  .container.dark .popup-panel {
    background-color: #2e2e2e;
  }

  .modal-header {
    position: relative;
    padding: 12px;
    display: flex;
    align-items: center;
    /* 不要 space-between，让搜索盒子自己撑开 */
    justify-content: flex-start;
  }

  .modal-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 72vw;
    height: 1px;
    background-color: #fff;
  }

  .container.dark .modal-header::after {
    background-color: #555;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
    flex: 0 0 auto;
  }

  .close-icon {
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    border-radius: 50%;
    color: #999;
  }

  .container.dark .close-icon {
    color: #ccc;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .action-select-list {
    width: 100%;
    flex: 1;
  }

  .template-tag {
    background-color: #fff;
    padding: 10px;
    margin: 6px 0;
    border-radius: 8px;
    text-align: center;
    font-size: 16px;
    color: #333;
  }

  .container.dark .template-tag {
    background-color: #505050;
    color: #f7f7f7;
  }

  .template-tag.selected {
    background-color: #ff5a5d;
  }

  .container.dark .template-tag.selected {
    background-color: #ff5a5d;
  }

  .modal-footer.btn-row {
    padding: 10px 16px;
    display: flex;
    justify-content: center;
    position: relative;
  }

  .modal-footer.btn-row::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 72vw;
    height: 1px;
    background-color: #fff;
  }

  .container.dark .modal-footer.btn-row::before {
    background-color: #555;
  }

  .btn-confirm {
    width: 100px;
    height: 36px;
    line-height: 36px;
    background-color: #379bff;
    color: #fff;
    border-radius: 5px;
  }

  /* ========== 颜色选择 弹窗（居中） ========== */
  .color-popup-overlay {
    position: fixed;
    top: -40px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .color-popup-center {
    width: 80vw;
    max-height: 60vh;
    background-color: #f5f5f5;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1001;
    margin-top: -44px;
  }

  .container.dark .color-popup-center {
    background-color: #2e2e2e;
  }

  .color-popup-header {
    position: relative;
    height: 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 16px;
  }

  .color-popup-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 70vw;
    height: 1px;
    background-color: #fff;
  }

  .container.dark .color-popup-header::after {
    background-color: #555;
  }

  .add-custom-color {
    /* background-color: #4caf50; */
    width: 90px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    border-radius: 6px;
    color: #4caf50;
  }

  .clear-color {
    width: 75px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    border-radius: 6px;
    color: #e53935;
    /* background-color: #464646; */
  }

  .color-popup-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px 0;
  }

  .color-popup-body .template-tag {
    margin: 10px 20px;
  }

  .tag-text-center {
    text-align: center;
    flex: 1;
  }

  /* ========== 新增：自定义颜色 弹窗 样式 ========== */
  .custom-color-popup-center {
    width: 80vw;
    max-height: 40vh;
    background-color: #fff;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1002;
  }

  .container.dark .custom-color-popup-center {
    background-color: #2e2e2e;
  }

  .input-row-custom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
  }

  /* 颜色名称输入框 */
  .color-name-input {
    flex: 1;
    height: 36px;
    padding: 0 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
    color: #333;
    margin-right: 10px;
  }

  .container.dark .color-name-input {
    border-color: #555;
    background-color: #1e1e1e;
    color: #f7f7f7;
  }

  .color-code-input {
    flex: 1;
    height: 36px;
    padding: 0 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
    color: #333;
    margin-right: 10px;
  }

  .container.dark .color-code-input {
    border-color: #555;
    background-color: #1e1e1e;
    color: #f7f7f7;
  }

  .btn-add-color {
    width: 80px;
    height: 36px;
    background-color: #379bff;
    color: #fff;
    border-radius: 5px;
    font-size: 14px;
    text-align: center;
    line-height: 36px;
    margin-right: 10px;
  }

  .btn-add-color:active {
    opacity: 0.8;
  }

  .error-text {
    color: #e53935;
    font-size: 12px;
    text-align: center;
    margin-top: 4px;
  }

  /* 搜索区域占据剩余所有空间 */
  .search-wrapper {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    margin: 0 10px;
    /* 两侧留点间距 */
  }

  /* “搜索” 文案固定宽度 */
  .search-trigger {
    flex: 0 0 auto;
    margin-right: 6px;
    color: #888;
    margin-left: 10px;
    width: 100px;
    height: 32px;
    line-height: 32px;
    text-align: center;
  }

  /* 输入框自动填满 */
  .search-input {
    flex: 1 1 auto;
    height: 32px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 0 6px;
    box-sizing: border-box;
  }

  /* 清空按钮同样固定宽度 */
  .clear-search {
    flex: 0 0 auto;
    margin-left: 6px;
    color: #999;
    cursor: pointer;
  }
</style>