<template>
  <view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <view class="header-fixed">
      <view class="input-wrapper">
        <text class="pen-icon">重命名：️️</text>
        <input v-model="templateName" placeholder="模板名称" class="template-name-input" @blur="onNameBlur" />
      </view>
    </view>

    <view class="mid-scroll">
      <movable-area v-if="showList" class="movable-area" :style="{ height: chosenActions.length * 130 + 'rpx' }">
        <view v-for="(item, index) in chosenActions" :key="'slot'+index" class="item-slot"
          :style="{ top: index * 130 + 'rpx' }"></view>

        <movable-view v-for="(act, idx) in chosenActions" :key="act" direction="vertical" class="movable-item"
          :y="itemY[idx]" :disabled="!isDragMode" :class="{ 'is-dragging': dragIdx === idx }"
          @change="onDragMove($event, idx)" @touchend="isDragMode ? onDragEnd() : null">
          <view class="slide-wrapper">
            <view class="delete-btn-container">
              <view class="delete-btn" @click.stop="handleDelete(idx)"
                :style="{display: isDragMode ? 'none' : 'flex',height: '90rpx', marginTop: '10rpx'}">
                删除
              </view>
            </view>
            <view class="action-card" :style="{ transform: 'translateX(' + (slideOffset[idx] || 0) + 'px)' }"
              @touchstart="onTouchStart($event, idx)" @touchmove="onTouchMove($event, idx)"
              @touchend="onTouchEnd($event, idx)" @longpress="onDragTrigger(idx)">
              <view class="action-info" @click.stop="openEditPopup(idx)">
                <text class="action-name">{{ act }}</text>
              </view>
              <view class="set-count-btn" @click.stop="openSetSelector(idx)">
                <text class="set-count-text">{{ getSetCount(idx) }}组</text>
              </view>
              <view class="action-history-area" @click.stop="goToHistory(idx)">
                <text class="arrow-icon">›</text>
              </view>
            </view>
          </view>
        </movable-view>
      </movable-area>
    </view>

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

    <view v-if="showSetSelectorPopup" class="popup-overlay" @click.self="closeSetSelector">
      <view class="overlay-bg" @click="closeSetSelector"></view>
      <view class="set-selector-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">设置组数</text>
          <text class="close-btn" @click="closeSetSelector">×</text>
        </view>
        <view class="panel-body set-selector-body">
          <view class="current-action-name">{{ chosenActions[setSelectorIdx] }}</view>
          <view class="quick-set-options">
            <view class="quick-set-btn" @click="quickSetChange(-1)">
              <text>-1</text>
            </view>
            <view class="set-display">
              <text class="set-number">{{ setSelectorValue }}</text>
              <text class="set-unit">组</text>
            </view>
            <view class="quick-set-btn" @click="quickSetChange(1)">
              <text>+1</text>
            </view>
          </view>
          <view class="preset-sets">
            <view v-for="n in [2,3, 4, 5]" :key="n" class="preset-set-btn" :class="{ selected: setSelectorValue === n }"
              @click="setSelectorValue = n">
              <text>{{ n }}</text>
            </view>
          </view>
          <view class="custom-set-row">
            <text class="custom-set-label">自定义：</text>
            <input type="number" v-model.number="setSelectorValue" class="custom-set-input" min="1" max="20" />
            <text class="custom-set-unit">组</text>
          </view>
        </view>
        <view class="panel-footer btn-row">
          <text class="btn-return" @click="closeSetSelector">取消</text>
          <text class="btn-confirm" @click="confirmSetChange">确认</text>
        </view>
      </view>
    </view>

    <view v-if="showAddActionPopup" class="popup-overlay action-picker-overlay" @click.self="closeAddActionPopup">
      <view class="overlay-bg" @click="closeAddActionPopup"></view>
      <view class="modal-panel action-picker-panel fade-in" @click.stop>
        <view class="modal-header action-picker-header">
          <text class="modal-title">选择动作</text>
          <text class="close-icon" @click="closeAddActionPopup">×</text>
        </view>
        <view class="modal-body action-picker-body">
          <view class="search-bar-container">
            <view class="search-bar-inner">
              <text class="search-icon">🔍</text>
              <input ref="searchInput" v-model="searchKeyword" class="search-bar-input" placeholder="搜索动作名称..."
                @input="filterActions" confirm-type="search" :focus="searchFocus" />
              <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">×</text>
            </view>
          </view>
          <view class="action-grid-inner">
            <view v-for="(act, idx) in filteredActions" :key="idx" class="action-grid-item"
              :class="{ 'action-selected': selectedActionIdxs.includes(idx), 'action-already-added': chosenActions.includes(act) }"
              @click="selectAction(idx)">
              <view class="act-name-container">
                <text class="act-name">{{ act }}</text>
              </view>
              <view v-if="selectedActionIdxs.includes(idx)" class="select-check">✓</view>
            </view>
            <view v-if="filteredActions.length === 0" class="no-data-v2">
              <text class="no-data-icon">🤷‍♂️</text>
              <text class="no-data-text">未找到相关动作</text>
              <text class="no-data-sub">请检查关键词或在首页添加</text>
            </view>
            <view class="list-bottom-guard"></view>
          </view>
          <view class="confirm-add-btn" @click="addSelectedAction">确认添加{{ selectedActionIdxs.length ? ' (' + selectedActionIdxs.length + ')' : '' }}</view>
        </view>
      </view>
    </view>

    <view v-if="showColorPopup" class="color-popup-overlay" @click.self="closeColorPopup" @click="closeColorPopup">
      <view class="overlay-bg"></view>
      <view class="color-picker-card" @click.stop>
        <view class="cp-header">
          <text class="cp-title">选择模板配色</text>
          <text class="cp-close" @click="closeColorPopup">✕</text>
        </view>

        <scroll-view class="cp-body" scroll-y="true">
          <view class="color-grid">
            <view class="color-item" @click="clearColor">
              <view class="color-circle empty-icon empty-icon-dark">
                <text class="slash">×</text>
              </view>
              <text class="color-name color-name-dark">清空</text>
            </view>

            <!-- 关键修改1：添加触摸事件和长按事件 -->
            <view v-for="(cObj, idx) in displayColors" :key="idx" class="color-item" @click="selectColor(cObj.value)"
              @touchstart="handleColorTouchStart(idx, cObj)" @touchmove="handleColorTouchMove"
              @touchend="handleColorTouchEnd" @longpress="handleColorLongPress(idx, cObj)">
              <view class="color-circle" :style="{ backgroundColor: cObj.value }">
                <view v-if="currentColor === cObj.value" class="selected-check">✓</view>
              </view>
              <text class="color-name color-name-dark">{{ cObj.name }}</text>
            </view>

            <view class="color-item placeholder"></view>
            <view class="color-item placeholder"></view>
            <view class="color-item placeholder"></view>
          </view>
        </scroll-view>

        <view class="cp-footer">
          <button class="btn-custom-add" @click="openCustomColorPopup">
            + 自定义颜色
          </button>
        </view>
      </view>
    </view>

    <view v-if="showCustomColorPopup" class="color-popup-overlay" @click.self="closeCustomColorPopup"
      @click="closeCustomColorPopup">
      <view class="overlay-bg"></view>

      <view class="custom-color-card animate-pop" @click.stop>
        <view class="custom-header">
          <text class="custom-title">添加自定义颜色</text>
          <text class="close-icon-new" @click="closeCustomColorPopup">✕</text>
        </view>

        <view class="custom-body">
          <view class="input-group">
            <text class="input-label">颜色名称</text>
            <input v-model="newColorName" placeholder="例如：珊瑚红" class="modern-input" maxlength="12" />
          </view>

          <view class="input-group">
            <text class="input-label">颜色代码 (HEX)</text>
            <view class="hex-input-row">
              <view class="preview-box" :style="{ backgroundColor: isValidHex ? newColorCode : '#333' }">
                <text v-if="!isValidHex" class="preview-tip">?</text>
              </view>
              <input v-model="newColorCode" placeholder="#RRGGBB" class="modern-input hex-field" maxlength="7" />
            </view>
          </view>

          <view v-if="colorError" class="error-msg">{{ colorError }}</view>
        </view>

        <view class="custom-footer">
          <button class="btn-cancel" @click="closeCustomColorPopup">取消</button>
          <button class="btn-confirm-add" @click="addCustomColor">确认添加</button>
        </view>
      </view>
    </view>

    <view v-if="showEditPopup" class="popup-overlay" @click.self="closeEditPopup">
      <view class="overlay-bg" @click="closeEditPopup"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">编辑动作</text>
          <text class="close-btn" @click="closeEditPopup">×</text>
        </view>
        <view class="panel-body">
          <view class="form-group">
            <text class="form-label">动作名称</text>
            <input v-model="editFormName" placeholder="输入动作名称" class="form-input" maxlength="20" />
          </view>
          <view class="form-group">
            <text class="form-label">身体部位（可多选）</text>
            <view class="category-selector">
              <view v-for="cat in categoryOptions" :key="cat.id" class="category-option"
                :class="{ selected: editFormCategories.includes(cat.id) }" @click="toggleEditFormCategory(cat.id)">
                <text class="category-option-check">{{ editFormCategories.includes(cat.id) ? '✓' : '' }}</text>
                <text>{{ cat.name }}</text>
              </view>
            </view>
          </view>
          <view class="form-group">
            <view class="checkbox-row" @click="editFormIsUnilateral = !editFormIsUnilateral">
              <view class="checkbox-box" :class="{ checked: editFormIsUnilateral }">
                <text class="checkbox-check" v-if="editFormIsUnilateral">✓</text>
              </view>
              <view class="checkbox-content">
                <text class="checkbox-label">单侧动作</text>
                <text class="checkbox-hint">（如哑铃单臂弯举，容量自动×2）</text>
              </view>
            </view>
          </view>
          <view class="form-group" v-for="cat in categoryOptions" :key="'edit_sub_'+cat.id">
            <view v-if="editFormCategories.includes(cat.id) && getEditSubcategories(cat.id).length > 0"
              class="subcategory-section-form">
              <text class="form-label subcategory-form-label">{{ cat.name }} - 细分部位</text>
              <view class="subcategory-selector">
                <view v-for="sub in getEditSubcategories(cat.id)" :key="sub.id" class="subcategory-option"
                  :class="{ selected: isEditSubcategorySelected(cat.id, sub.id) }"
                  @click="toggleEditSubcategory(cat.id, sub.id)">
                  <text>{{ sub.name }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="panel-footer btn-row">
          <text class="btn-return" @click="closeEditPopup">取消</text>
          <text class="btn-confirm" @click="confirmEdit">保存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useTemplateStore
  } from '@/stores/template.js'
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        rowHeight: 80,
        listKey: 0,
        _isMounted: false,
        isRefreshing: false,
        isDragTriggered: false,
        hasSwapped: false,
        showList: true,
        itemY: [],
        slideOffset: [],
        isDragMode: false,
        dragIdx: -1,
        startX: 0,
        startTime: 0,
        isClick: false,
        lastTargetIdx: -1,
        templateName: '',
        originalName: '',
        chosenActions: [],
        chosenActionSets: {},
        currentColor: '',
        showAddActionPopup: false,
        showSetSelectorPopup: false,
        setSelectorIdx: -1,
        setSelectorValue: 4,
        filteredActions: [],
        selectedActionIdxs: [],
        showColorPopup: false,
        showCustomColorPopup: false,
        newColorName: '',
        newColorCode: '',
        colorError: '',
        pressedColorIndex: -1,
        longPressColorTimer: null,
        longPressThreshold: 500,
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
        searchKeyword: '',
        searchFocus: false,
        lastVibrateTime: 0,
        isNavigating: false,
        showEditPopup: false,
        editingAction: null,
        editingActionIndex: -1,
        editFormName: '',
        editFormCategories: [],
        editFormSubcategories: {},
        editFormIsUnilateral: false
      }
    },
    computed: {
      isValidHex() {
        // 简单的正则判断是否为合法的 Hex 颜色代码
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(this.newColorCode);
      },
      displayColors() {
        const {
          customColors
        } = this.tplStore.loadTemplateDetail(this.templateName)
        return [
          ...(customColors || []),
          ...this.presetColors
        ]
      },
      categoryOptions() {
        return this.actStore.categories
      }
    },
    onLoad(options) {
      if (options.template) {
        this.templateName = decodeURIComponent(options.template);
        this.originalName = this.templateName;
        uni.setNavigationBarTitle({
          title: this.templateName + ' 模板详情'
        });
      }

      this.tplStore = useTemplateStore();
      this.tplStore.load();

      this.actStore = useActionStore();
      this.actStore.load();

      this.loadTemplateDetail();
    },
    onShow() {
      this.tplStore.load()

      const backup = uni.getStorageSync('temp_template_actions_backup')
      if (backup && backup.templateName === this.templateName) {
        this.chosenActions = [...backup.actions]
        this.chosenActionSets = {
          ...(backup.actionSets || {})
        }
        uni.removeStorageSync('temp_template_actions_backup')
        this.$nextTick(() => {
          this.initPositions()
        })
      } else {
        this.loadTemplateDetail(true)
      }
    },
    onHide() {
      if (this.chosenActions && this.chosenActions.length > 0) {
        uni.setStorageSync('temp_template_actions_last_state', {
          templateName: this.templateName,
          actions: this.chosenActions,
          actionSets: {
            ...this.chosenActionSets
          },
          timestamp: Date.now()
        });
      }

      uni.removeStorageSync('temp_template_actions_backup');
    },
    onUnload() {
      this._isMounted = false;
      this.isRefreshing = false;
      uni.removeStorageSync('temp_template_actions_backup');
      uni.removeStorageSync('temp_template_actions_last_state');
      uni.removeStorageSync('currentTemplateName');

      this.isNavigating = false;
      this.isDragMode = false;
    },
    mounted() {
      this._isMounted = true;
      this.daySettingsStore.load();

      const sys = uni.getSystemInfoSync();
      this.rowHeight = (sys.windowWidth / 750) * 130;

      this.$nextTick(() => {
        setTimeout(() => {
          this.initPositions();
        }, 100);
      });
    },
    watch: {
      chosenActions: {
        handler(newVal) {
          if (this._isMounted && newVal && newVal.length > 0) {
            setTimeout(() => {
              this.initPositions();
            }, 100);
          }
        }
      }
    },
    methods: {
      initPositions() {
        console.log('initPositions 调用，chosenActions长度:', this.chosenActions.length);

        if (!this._isMounted || !this.chosenActions || this.chosenActions.length === 0) {
          console.warn('跳过位置初始化：页面未挂载或数据为空');
          return;
        }

        const query = uni.createSelectorQuery().in(this);
        query.select('.movable-area').boundingClientRect(rect => {
          if (!rect) {
            console.warn('movable-area 未渲染，跳过位置初始化');
            return;
          }

          const newItemY = [];
          for (let i = 0; i < this.chosenActions.length; i++) {
            const exactY = i * this.rowHeight;
            newItemY[i] = Math.round(exactY);
          }

          this.$set(this, 'itemY', newItemY);

          if (this.slideOffset.length !== this.chosenActions.length) {
            this.slideOffset = new Array(this.chosenActions.length).fill(0);
          }

          console.log('initPositions 完成，itemY:', this.itemY);
        }).exec();
      },
      onDragTrigger(idx) {
        this.isDragTriggered = true;
        this.hasSwapped = false;
        this.dragIdx = idx;
        this.isDragMode = true;
        uni.vibrateShort();
        this.$set(this.slideOffset, idx, 0);
      },
      onDragStart(idx) {
        this.isDragMode = true;
        this.dragIdx = idx;
        this.isDragTriggered = true;
        this.lastTargetIdx = -1;
        this.hasSwapped = false;
        this.lastVibrateTime = Date.now();
        console.log('开始拖拽，索引：', idx);
      },
      onDragMove(e, idx) {
        if (!this.isDragMode || this.dragIdx !== idx) return;

        const currentY = e.detail.y;
        const baseY = idx * this.rowHeight;
        const offsetY = currentY - baseY;

        const shouldSwapDown = offsetY > this.rowHeight * 0.5 && idx < this.chosenActions.length - 1;
        const shouldSwapUp = offsetY < -this.rowHeight * 0.5 && idx > 0;

        if (shouldSwapDown || shouldSwapUp) {
          const targetIdx = shouldSwapDown ? idx + 1 : idx - 1;

          if (targetIdx === this.lastTargetIdx) return;
          this.lastTargetIdx = targetIdx;
          this.hasSwapped = true;

          const list = [...this.chosenActions];
          [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
          this.chosenActions = list;

          this.dragIdx = targetIdx;

          this.smoothUpdatePositions();

          const now = Date.now();
          if (now - this.lastVibrateTime > 150) {
            uni.vibrateShort();
            this.lastVibrateTime = now;
          }
        } else {
          const minY = 0;
          const maxY = (this.chosenActions.length - 1) * this.rowHeight;
          const clampedY = Math.max(minY, Math.min(currentY, maxY));
          this.$set(this.itemY, idx, clampedY);
        }
      },
      smoothUpdatePositions() {
        for (let i = 0; i < this.chosenActions.length; i++) {
          this.$set(this.itemY, i, i * this.rowHeight);
        }
        this.fixPositionGaps();
      },
      fixPositionGaps() {
        for (let i = 0; i < this.chosenActions.length; i++) {
          const expectedY = i * this.rowHeight;
          const currentY = this.itemY[i];
          if (Math.abs(currentY - expectedY) > 2) {
            this.$set(this.itemY, i, expectedY);
          }
        }
      },
      onDragEnd() {
        if (!this.isDragTriggered) return;

        console.log('拖拽结束，是否交换：', this.hasSwapped);

        this.isDragMode = false;
        this.dragIdx = -1;
        this.lastTargetIdx = -1;

        if (this.isDragTriggered) {
          this.initPositions();
          this.saveToStore();
        }

        this.isDragTriggered = false;
        this.hasSwapped = false;
      },
      performPartialRefresh() {
        if (this.isRefreshing || !this._isMounted) return;
        this.isRefreshing = true;
        this.listKey += 1;
        this.showList = false;

        setTimeout(() => {
          this.$nextTick(() => {
            this.showList = true;

            setTimeout(() => {
              this.initPositions();
              this.saveToStore();
              this.isRefreshing = false;
            }, 300);
          });
        }, 150);
      },
      saveToStore() {
        if (this.isNavigating) return;

        if (!this.templateName || !this.chosenActions) return;

        const template = this.tplStore.templates.find(t => t.name === this.templateName);
        if (template) {
          template.actionWeights = template.actionWeights || {};
          template.actionOrder = template.actionOrder || [...this.chosenActions];
          template.actions = [...this.chosenActions];
          template.actionSets = {
            ...this.chosenActionSets
          };
          this.tplStore.save();
        }
      },
      onTouchStart(e, idx) {
        this.startX = e.touches[0].pageX;
        this.startY = e.touches[0].pageY;
        this.startTime = Date.now();
        this.isClick = true;

        if (!this.isDragMode) {
          this.$set(this.slideOffset, idx, 0);
        }
      },
      onTouchMove(e, idx) {
        if (this.isDragMode) return;

        const currentX = e.touches[0].pageX;
        const currentY = e.touches[0].pageY;
        const deltaX = currentX - this.startX;
        const deltaY = currentY - this.startY; // 修正：用this.startY计算垂直偏移

        // 移动超过5px则判定为非点击
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.isClick = false;
        }

        // 只有水平滑动明显大于垂直滑动时，才处理侧滑并阻止默认事件
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          // 侧滑删除逻辑
          if (deltaX < 0) {
            this.$set(this.slideOffset, idx, Math.max(deltaX, -100));
          } else if (deltaX > 0 && this.slideOffset[idx] < 0) {
            this.$set(this.slideOffset, idx, Math.min(0, this.slideOffset[idx] + deltaX));
          }

          // 仅在侧滑时阻止默认事件，避免影响垂直滚动
          if (e.cancelable) {
            e.preventDefault();
            e.stopPropagation();
          }
        } else {
          // 垂直滑动时不阻止默认事件，允许页面正常滚动
          // 可选：垂直滑动时重置侧滑状态
          this.$set(this.slideOffset, idx, 0);
        }
      },
      onTouchEnd(e, idx) {
        if (this.isDragMode) return;

        if (this.slideOffset[idx] < -50) {
          this.$set(this.slideOffset, idx, -80);
        } else {
          this.$set(this.slideOffset, idx, 0);
        }

        this.isClick = false;
        this.startX = 0;
        this.startTime = 0;
      },
      handleDelete(idx) {
        uni.showModal({
          title: '确认删除',
          content: `确定要删除动作「${this.chosenActions[idx]}」吗？`,
          confirmText: '删除',
          cancelText: '取消',
          confirmColor: '#ff5a5d',
          success: (res) => {
            if (res.confirm) {
              this.chosenActions.splice(idx, 1);
              this.tplStore.removeAction(this.templateName, idx);
              this.loadTemplateDetail(true);
              this.$nextTick(() => {
                this.initPositions();
                this.slideOffset = new Array(this.chosenActions.length).fill(0);
              });
              uni.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 1500
              });
            } else {
              this.$set(this.slideOffset, idx, 0);
              uni.showToast({
                title: '已取消删除',
                icon: 'none',
                duration: 1500
              });
            }
          }
        });
      },
      loadTemplateDetail(forceRefresh = false) {
        if (!this.templateName) return;

        if (!forceRefresh) {
          const lastState = uni.getStorageSync('temp_template_actions_last_state');
          if (lastState && lastState.templateName === this.templateName) {
            const now = Date.now();
            const stateTime = lastState.timestamp || 0;

            if (now - stateTime < 30000) {
              this.$set(this, 'chosenActions', [...lastState.actions]);
              this.chosenActionSets = {
                ...(lastState.actionSets || {})
              };
              this.$nextTick(() => this.initPositions());
              return;
            }
          }
        }

        const detail = this.tplStore.loadTemplateDetail(this.templateName);
        const newActions = Array.isArray(detail?.actions) ? detail.actions : [];

        this.$set(this, 'chosenActions', [...newActions]);
        this.chosenActionSets = {
          ...(detail?.actionSets || {})
        };
        this.currentColor = (detail && detail.color) || '';

        this.$nextTick(() => {
          this.initPositions();
          this.slideOffset = new Array(this.chosenActions.length).fill(0);
        });
      },
      goToHistory(idx) {
        if (this.isDragMode) return;
        const actName = this.chosenActions[idx];
        uni.navigateTo({
          url: `/pages/actionHistory/actionHistory?action=${encodeURIComponent(actName)}`
        });
      },
      goHistory(idx) {
        if (this.isDragMode) return;

        if (!this.chosenActions || !this.chosenActions[idx]) return;

        this.isNavigating = true;

        this.saveToStoreNow();
        uni.setStorageSync('temp_template_actions_last_state', {
          templateName: this.templateName,
          actions: [...this.chosenActions],
          timestamp: Date.now()
        });

        const actName = this.chosenActions[idx];

        uni.navigateTo({
          url: `../actionHistory/actionHistory?action=${encodeURIComponent(actName)}`,
          fail: (err) => {
            this.isNavigating = false;
          },
          complete: () => {
            this.isNavigating = false;
          }
        });
      },
      saveToStoreNow() {
        if (!this.templateName || !this.chosenActions) return;

        const template = this.tplStore.templates.find(t => t.name === this.templateName);
        if (template) {
          template.actions = [...this.chosenActions];
          template.actionSets = {
            ...this.chosenActionSets
          };
          this.tplStore.save();
        }
      },
      onNameBlur() {
        const oldName = this.originalName.trim();
        const newName = this.templateName.trim();

        if (!newName || newName === oldName) return;

        if (this.tplStore.templates.some(t => t.name === newName && t.name !== oldName)) {
          uni.showToast({
            title: '模板名称已存在',
            icon: 'none'
          });
          this.templateName = oldName;
          return;
        }

        const template = this.tplStore.templates.find(t => t.name === oldName);
        if (!template) {
          this.templateName = oldName;
          return;
        }

        this.preserveTemplateColorInHistory(oldName, template.color);

        template.name = newName;
        this.tplStore.save();

        this.originalName = newName;
        uni.setNavigationBarTitle({
          title: newName + ' 模板详情'
        });
        this.loadTemplateDetail();

        uni.showToast({
          title: '重命名成功',
          icon: 'success'
        });
      },
      preserveTemplateColorInHistory(templateName, templateColor) {
        if (!templateColor) return;

        try {
          const storageInfo = uni.getStorageInfoSync();
          const dayKeys = storageInfo.keys.filter(key => key.startsWith('fitness_daydata_'));

          dayKeys.forEach(key => {
            const dayData = uni.getStorageSync(key) || {};
            if (dayData.templates && dayData.templates[templateName]) {
              const tplData = dayData.templates[templateName];

              if (!tplData.color) {
                tplData.color = templateColor;
              }

              if (!dayData.color) {
                dayData.color = templateColor;
              }

              uni.setStorageSync(key, dayData);
            }
          });
        } catch (error) {
          console.error('保存模板颜色到历史数据时出错:', error);
        }
      },
      addSelectedAction() {
        if (this.selectedActionIdxs.length === 0) {
          uni.showToast({
            title: '请选择至少一个动作',
            icon: 'none'
          });
          return;
        }
        let added = 0;
        let skipped = 0;
        this.selectedActionIdxs.forEach(idx => {
          const actName = this.filteredActions[idx];
          if (!this.chosenActions.includes(actName)) {
            this.chosenActions.push(actName);
            this.chosenActionSets[actName] = 4;
            this.tplStore.addAction(this.templateName, actName);
            added++;
          } else {
            skipped++;
          }
        });
        this.saveToStore();
        this.loadTemplateDetail(true);
        this.showAddActionPopup = false;
        if (added > 0) {
          const msg = skipped > 0 ? `已添加 ${added} 个动作（跳过 ${skipped} 个重复）` : `已添加 ${added} 个动作`;
          uni.showToast({ title: msg, icon: 'success', duration: 1500 });
        } else {
          uni.showToast({ title: '所选动作已在模板中', icon: 'none' });
        }
      },
      selectColor(c) {
        this.tplStore.setColor(this.templateName, c)
        this.currentColor = c
        this.showColorPopup = false
      },
      clearColor() {
        this.tplStore.clearColor(this.templateName)
        this.currentColor = ''
      },
      openCustomColorPopup() {
        this.showColorPopup = false
        this.showCustomColorPopup = true
      },
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
      // 关键修改2：完善触摸事件处理
      handleColorTouchStart(idx, colorObj) {
        this.pressedColorIndex = idx
        this.currentPressColor = colorObj // 保存当前触摸的颜色对象
        clearTimeout(this.longPressColorTimer)
        // 长按计时
        this.longPressColorTimer = setTimeout(() => {
          this.handleColorLongPress(idx, colorObj)
        }, this.longPressThreshold)
      },
      handleColorTouchMove() {
        // 移动时取消长按计时
        clearTimeout(this.longPressColorTimer)
      },
      handleColorTouchEnd() {
        // 触摸结束取消计时
        clearTimeout(this.longPressColorTimer)
        this.pressedColorIndex = -1
        this.currentPressColor = null
      },
      // 关键修改3：完善长按删除逻辑
      // 修复后的长按删除自定义颜色逻辑
      handleColorLongPress(idx, colorObj) {
        // 1. 判断是否是预设颜色（预设颜色不允许删除）
        const isPresetColor = this.presetColors.some(pc => pc.value === colorObj.value);
        if (isPresetColor) {
          uni.showToast({
            title: '预设颜色无法删除',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        // 2. 判断该颜色是否正在被使用
        if (this.currentColor === colorObj.value) {
          uni.showToast({
            title: '当前使用的颜色无法删除',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        // 3. 确认删除自定义颜色
        uni.showModal({
          title: '删除自定义颜色',
          content: `确定删除 "${colorObj.name}" 吗？`,
          confirmText: '删除',
          cancelText: '取消',
          confirmColor: '#ff5a5d',
          success: res => {
            if (res.confirm) {
              try {
                // 获取模板的自定义颜色列表
                const templateDetail = this.tplStore.loadTemplateDetail(this.templateName);
                const customColors = templateDetail.customColors || [];

                // 关键修复1：直接使用当前遍历的索引（displayColors中自定义颜色在前，预设在后）
                // 只删除自定义颜色部分的目标项
                if (idx < customColors.length) {
                  // 调用store删除指定索引的自定义颜色
                  this.tplStore.removeCustomColor(this.templateName, idx);

                  // 关键修复2：强制刷新颜色列表（重新获取最新的自定义颜色）
                  this.$forceUpdate(); // 强制更新视图，确保displayColors重新计算

                  // 提示删除成功
                  uni.showToast({
                    title: '删除成功',
                    icon: 'success',
                    duration: 1500
                  });
                } else {
                  uni.showToast({
                    title: '无法删除预设颜色',
                    icon: 'none',
                    duration: 2000
                  });
                }
              } catch (error) {
                console.error('删除自定义颜色失败:', error);
                uni.showToast({
                  title: '删除失败，请重试',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
          }
        });
      },
      saveTemplate() {
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })
        uni.navigateBack()
      },
      openAddActionPopup() {
        this.showAddActionPopup = true
        this.filterActions()
        this.selectedActionIdxs = []
        this.searchKeyword = ''
        this.$nextTick(() => {
          this.searchFocus = true
        })
      },
      closeAddActionPopup() {
        this.showAddActionPopup = false
        this.searchFocus = false
        this.selectedActionIdxs = []
        this.searchKeyword = ''
      },
      selectAction(idx) {
        const act = this.filteredActions[idx]
        if (this.chosenActions.includes(act)) {
          uni.showToast({
            title: '动作已在列表中',
            icon: 'none'
          })
          return
        }
        const i = this.selectedActionIdxs.indexOf(idx)
        if (i === -1) {
          this.selectedActionIdxs.push(idx)
        } else {
          this.selectedActionIdxs.splice(i, 1)
        }
      },
      filterActions() {
        const kw = this.searchKeyword.trim().toLowerCase()
        const all = this.actStore ? this.actStore.actionNames : []
        if (!kw) {
          this.filteredActions = all.slice()
        } else {
          this.filteredActions = all.filter(act =>
            act.toLowerCase().includes(kw)
          )
        }
        this.selectedActionIdxs = []
      },
      clearSearch() {
        this.searchKeyword = ''
        this.filterActions()
      },
      closeColorPopup() {
        this.showColorPopup = false
      },
      closeCustomColorPopup() {
        this.showCustomColorPopup = false
        this.newColorName = ''
        this.newColorCode = ''
        this.colorError = ''
      },
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
      openEditPopup(idx) {
        if (this.isDragMode) return;
        if (!this.chosenActions || !this.chosenActions[idx]) return;

        const actName = this.chosenActions[idx];
        const actStore = useActionStore();
        const action = actStore.getActionByName(actName);

        if (!action) {
          uni.showToast({
            title: '未找到该动作',
            icon: 'none'
          });
          return;
        }

        this.editingActionIndex = idx;
        this.editingAction = action;
        this.editFormName = action.name;
        this.editFormCategories = [...action.categories];
        this.editFormSubcategories = JSON.parse(JSON.stringify(action.subcategories || {}));
        this.editFormIsUnilateral = action.isUnilateral || false;
        this.showEditPopup = true;
      },
      closeEditPopup() {
        this.showEditPopup = false;
        this.editingAction = null;
        this.editingActionIndex = -1;
        this.editFormName = '';
        this.editFormCategories = [];
        this.editFormSubcategories = {};
        this.editFormIsUnilateral = false;
      },
      toggleEditFormCategory(catId) {
        const idx = this.editFormCategories.indexOf(catId);
        if (idx === -1) {
          this.editFormCategories.push(catId);
        } else {
          this.editFormCategories.splice(idx, 1);
          this.$delete(this.editFormSubcategories, catId);
        }
      },
      getEditSubcategories(categoryId) {
        return this.actStore.getSubcategories(categoryId);
      },
      isEditSubcategorySelected(catId, subId) {
        return this.editFormSubcategories[catId] && this.editFormSubcategories[catId].includes(subId);
      },
      toggleEditSubcategory(catId, subId) {
        if (!this.editFormSubcategories[catId]) {
          this.$set(this.editFormSubcategories, catId, []);
        }
        const subs = this.editFormSubcategories[catId];
        const idx = subs.indexOf(subId);
        if (idx === -1) {
          subs.push(subId);
        } else {
          subs.splice(idx, 1);
        }
      },
      getSetCount(idx) {
        const actName = this.chosenActions[idx];
        return this.chosenActionSets[actName] || 4;
      },
      openSetSelector(idx) {
        if (this.isDragMode) return;
        this.setSelectorIdx = idx;
        const actName = this.chosenActions[idx];
        this.setSelectorValue = this.chosenActionSets[actName] || 4;
        this.showSetSelectorPopup = true;
      },
      closeSetSelector() {
        this.showSetSelectorPopup = false;
        this.setSelectorIdx = -1;
      },
      quickSetChange(delta) {
        const newVal = this.setSelectorValue + delta;
        if (newVal >= 1 && newVal <= 20) {
          this.setSelectorValue = newVal;
        }
      },
      confirmSetChange() {
        if (this.setSelectorIdx === -1) return;
        const actName = this.chosenActions[this.setSelectorIdx];
        this.chosenActionSets[actName] = this.setSelectorValue;
        this.saveToStore();
        this.closeSetSelector();
        uni.showToast({
          title: `已设置为 ${this.setSelectorValue} 组`,
          icon: 'success'
        });
      },
      confirmEdit() {
        const name = this.editFormName.trim();
        if (!name) {
          uni.showToast({
            title: '请输入动作名称',
            icon: 'none'
          });
          return;
        }

        if (this.editFormCategories.length === 0) {
          uni.showToast({
            title: '请至少选择一个身体部位',
            icon: 'none'
          });
          return;
        }

        if (!this.editingAction) return;

        const actStore = useActionStore();
        actStore.updateAction(this.editingAction.id, {
          name: name,
          categories: this.editFormCategories,
          subcategories: {
            ...this.editFormSubcategories
          },
          isUnilateral: this.editFormIsUnilateral,
        });

        if (this.editingActionIndex !== -1 && name !== this.chosenActions[this.editingActionIndex]) {
          this.chosenActions[this.editingActionIndex] = name;
          this.saveToStore();
        }

        uni.showToast({
          title: '已更新',
          icon: 'success'
        });

        this.closeEditPopup();
      }
    }
  }
</script>
<style scoped>
  /* 整体 & 深色模式 */
  .container {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    /* 新增：flex垂直布局，占满视口高度 */
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .container.dark {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.light {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  /* 顶部固定 输入框 */
  .header-fixed {
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    padding: 10rpx 40rpx;
    box-sizing: border-box;
    z-index: 10;
    display: flex;
    align-items: center;
    border-bottom: 1rpx solid var(--border-color);
    flex-shrink: 0;
  }

  .container.dark .header-fixed {
    border-bottom-color: var(--border-color);
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
    color: var(--text-muted);
  }

  .container.dark .pen-icon {
    color: var(--text-secondary);
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
    color: var(--text-placeholder);
  }

  .container.dark .template-name-input::placeholder {
    color: var(--text-muted);
  }

  /* 中间滚动区域 */
  .mid-scroll {
    position: relative;
    top: auto;
    bottom: auto;
    left: 0;
    right: 0;
    flex: 1;
    overflow-y: auto;
    background-color: transparent;
    padding-bottom: 80px;
  }

  /* 空状态文字 */
  .no-data-mid {
    padding-top: 100rpx;
    text-align: center;
    color: var(--text-muted);
    font-size: 26rpx;
  }

  .container.dark .no-data-mid {
    color: var(--text-placeholder);
  }

  /* 底部固定 区域 */
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
    border-top: 1px solid var(--border-color);
    z-index: 10;
  }

  .container.dark .footer-fixed {
    border-top-color: var(--border-color);
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
    border: 1px solid var(--border-color);
  }

  .container.dark .color-circle-lg {
    border-color: var(--text-placeholder);
  }

  .no-color-text,
  .color-text {
    font-size: 14px;
    color: var(--text-muted);
  }

  .container.dark .no-color-text,
  .container.dark .color-text {
    color: var(--text-secondary);
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
    background-color: var(--primary);
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

  /* ========== 选择动作弹窗 CSS（居中模态框）========== */
  .action-picker-panel {
    width: 85vw !important;
    max-height: 70vh !important;
    border-radius: 24px !important;
    overflow: hidden;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  }

  .action-picker-header {
    padding: 16px 20px 0 !important;
  }

  .action-picker-body {
    padding: 0 20px !important;
    position: relative;
  }

  /* 搜索栏样式 */
  .search-bar-container {
    padding: 15px 0 12px;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .search-bar-inner {
    display: flex;
    align-items: center;
    height: 48px;
    background: var(--bg-secondary);
    border-radius: 100px;
    padding: 0 16px;
    border: 1rpx solid rgba(200,200,200,0.3);
    transition: all 0.2s;
  }

  .container.dark .search-bar-inner {
    background: var(--bg-tertiary);
    border-color: rgba(255,255,255,0.12);
  }

  .search-bar-inner:focus-within {
    border-color: rgba(55, 155, 255, 0.3);
  }

  .search-icon {
    font-size: 16px;
    color: var(--text-muted);
    margin-right: 10px;
  }

  .search-bar-input {
    flex: 1;
    height: 100%;
    font-size: 15px;
    color: inherit;
  }

  .clear-icon {
    font-size: 20px;
    color: var(--text-muted);
    padding: 5px;
  }

  /* 双列网格布局 */
  .action-grid-inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding-bottom: 20px;
  }

  .list-bottom-guard {
    height: 8px;
    width: 100%;
    pointer-events: none;
  }

  .action-grid-item {
    position: relative;
    width: calc(50% - 8px);
    height: 54px;
    background: var(--bg-secondary);
    border-radius: 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    box-sizing: border-box;
    border: 1px solid rgba(200,200,200,0.3);
    transition: all 0.15s ease;
  }

  .container.dark .action-grid-item {
    background: var(--bg-tertiary);
    border-color: rgba(255,255,255,0.08);
  }

  .action-grid-item:active {
    transform: scale(0.96);
    opacity: 0.8;
  }

  .act-name {
    font-size: 14px;
    text-align: center;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-weight: 500;
  }

  /* 选中状态 */
  .action-selected {
    background: rgba(55, 155, 255, 0.2) !important;
    border: 2px solid var(--primary) !important;
  }

  .action-selected .act-name {
    color: var(--primary) !important;
    font-weight: bold;
  }

  .action-already-added {
    opacity: 0.5;
  }

  .action-already-added .act-name {
    color: var(--text-muted) !important;
  }

  .select-check {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    background: var(--primary);
    color: #fff;
    border-radius: 50%;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  /* 居中弹窗覆盖层 */
  .popup-overlay.action-picker-overlay {
    align-items: center;
  }

  /* 模态框容器 - 页面特定覆盖 */
  .modal-panel {
    width: 80vw;
    max-height: 70vh;
    border: 1rpx solid rgba(255,255,255,0.1);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  }

  .container.light .modal-panel {
    border-color: rgba(200,200,200,0.3);
  }

  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    position: relative;
    padding: 12px;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
    margin-left: 2vw;
    color: inherit;
  }

  .close-icon {
    width: 40px;
    height: 40px;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .confirm-add-btn {
    position: sticky;
    bottom: 20px;
    z-index: 10;
    width: 100%;
    height: 48px;
    background: rgba(36, 36, 36, 0.6);
    border: 1rpx solid rgba(255, 255, 255, 0.12);
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 400;
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    box-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.08) inset,
      0 1px 3px rgba(255, 255, 255, 0.06) inset,
      0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .container.light .confirm-add-btn {
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(200, 200, 200, 0.35);
    color: var(--text-primary);
    box-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.5) inset,
      0 1px 3px rgba(255, 255, 255, 0.4) inset,
      0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .confirm-add-btn:active {
    transform: scale(0.97);
    opacity: 0.8;
  }

  .no-data-v2 {
    width: 100%;
    padding: 50px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .no-data-icon {
    font-size: 40px;
    margin-bottom: 15px;
  }

  .no-data-text {
    font-size: 16px;
    color: inherit;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .no-data-sub {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* 颜色弹窗遮罩层 - 核心修改：改为垂直居中对齐 */
  .color-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    /* 改为居中对齐（水平+垂直） */
    display: flex;
    justify-content: center;
    align-items: center;
    /* 添加半透明遮罩，提升视觉层次 */
    background-color: rgba(0, 0, 0, 0.3);
  }

  /* 弹窗主体卡片 */
  .color-picker-card {
    width: 85vw;
    max-height: 80vh;
    background-color: var(--bg-secondary);
    /* 关键：使用 px 单位保证圆角稳定，同时明确四个角的圆角值 */
    border-radius: 40rpx !important;
    /* 加 !important 提升优先级 */
    -webkit-border-radius: 40rpx !important;
    /* 兼容微信小程序/uni-app */
    position: relative;
    bottom: auto;
    left: auto;
    transform: none;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.4);
    /* 关键：防止子元素溢出遮挡圆角 */
    overflow: hidden;
  }

  .container.dark .color-picker-card {
    background-color: var(--bg-secondary);
    /* 同步深色模式的圆角，保持一致 */
    border-radius: 40rpx !important;
    -webkit-border-radius: 40rpx !important;
    overflow: hidden;
  }

  .container.light .color-picker-card {
    background-color: var(--bg-secondary);
    box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.15);
  }

  .container.light .cp-footer {
    background-color: var(--bg-secondary) !important;
  }

  .container.light .btn-custom-add {
    background: rgba(55, 155, 255, 0.1);
    color: var(--primary);
  }

  /* 头部样式 */
  .cp-header {
    padding: 15px 30px 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    position: relative;
  }


  .container.dark .cp-header {
    border-bottom-color: var(--border-color);
  }

  .cp-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 72vw;
    height: 1px;
    background-color: var(--border-color);
  }

  .container.dark .cp-header::after {
    background-color: var(--text-placeholder);
  }

  .cp-title {
    font-size: 32rpx;
    font-weight: bold;
  }

  .cp-close {
    font-size: 40rpx;
    color: var(--text-muted);
    padding: 10rpx;
  }

  /* 网格布局关键代码 */
  .cp-body {
    flex: 1;
    max-height: 50vh;
    overflow-y: auto;
    padding-top: 5px;
  }

  .color-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    padding: 10px 15px;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .color-item {
    width: calc(25% - 10rpx);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;
    /* 减少底部间距，更紧凑 */
    box-sizing: border-box;
    padding: 0 5rpx;
  }


  .color-item.placeholder {
    height: 0;
    margin-bottom: 0;
  }

  .color-circle {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    margin-bottom: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .color-circle:active {
    transform: scale(0.9);
  }

  .color-name {
    font-size: 22rpx;
    color: var(--text-secondary);
    width: 100%;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .color-name-dark {
    color: var(--text-secondary);
  }

  /* 特殊状态：空/选中 */
  .empty-icon {
    background-color: var(--bg-tertiary);
    border: 2rpx dashed var(--border-color);
  }

  .empty-icon-dark {
    background: var(--bg-tertiary);
    border-color: var(--text-placeholder);
  }

  .slash {
    color: var(--danger);
    font-weight: bold;
  }

  .selected-check {
    color: #fff;
    font-size: 36rpx;
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
    /* 如果是白底颜色，勾选改用深色 */
  }

  /* 底部按钮 */
  .cp-footer {
    padding: 10px 30px;
    /* 关键：背景色和弹窗主体一致，且不设置圆角（继承父级） */
    background-color: var(--bg-secondary) !important;
    width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;
    /* 移除底部内边距的多余值，避免撑满底部 */
    padding-bottom: 20px;
  }

  .color-popup-overlay .overlay-bg {
    display: none;
  }

  .btn-custom-add {
    width: 100%;
    height: 90rpx;
    line-height: 90rpx;
    background-color: #1a334d;
    color: var(--primary);
    /* 按钮自身圆角不要超过弹窗圆角，避免溢出 */
    border-radius: 20rpx !important;
    font-size: 30rpx;
    border: none;
    font-weight: 500;
    /* 按钮和弹窗底部保留间距 */
    margin-bottom: 10rpx;
  }

  .container.dark .btn-custom-add {
    background: #1e3a5a;
    color: var(--primary);
  }

  @keyframes modalShow {
    from {
      opacity: 0;
      transform: scale(0.9);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* 自定义颜色 弹窗 样式 */
  .custom-color-card {
    width: 80vw;
    background-color: var(--bg-secondary);
    /* 保持与你主色调一致 */
    border-radius: 40rpx;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1rpx solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 30rpx 60rpx rgba(0, 0, 0, 0.5);
  }

  .custom-header {
    padding: 40rpx 40rpx 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
  }

  .custom-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 72vw;
    height: 1px;
    background-color: var(--border-color);
  }

  .container.dark .custom-header::after {
    background-color: var(--text-placeholder);
  }

  .container.light .custom-header::after {
    background-color: var(--border-color);
  }

  .container.light .custom-title {
    color: var(--text-primary);
  }

  .container.light .close-icon-new {
    color: var(--text-secondary);
  }

  .custom-title {
    color: var(--text-primary);
    font-size: 34rpx;
    font-weight: 600;
  }

  .close-icon-new {
    color: var(--text-muted);
    font-size: 36rpx;
  }

  /* 表单部分 */
  .custom-body {
    padding: 10px 15px 10px;
  }

  .input-group {
    margin-bottom: 30rpx;
  }

  .input-label {
    display: block;
    color: var(--text-placeholder);
    font-size: 24rpx;
    margin-bottom: 12rpx;
    margin-left: 10rpx;
  }

  .container.light .input-label {
    color: var(--text-secondary);
  }

  .modern-input {
    width: 100%;
    height: 90rpx;
    background: var(--bg-tertiary);
    border-radius: 20rpx;
    padding: 0 30rpx;
    color: var(--text-primary);
    font-size: 28rpx;
    box-sizing: border-box;
    border: 1rpx solid var(--border-color);
  }

  .container.light .modern-input {
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    color: var(--text-primary);
  }

  /* Hex 输入行与预览 */
  .hex-input-row {
    display: flex;
    gap: 20rpx;
    align-items: center;
  }

  .preview-box {
    width: 90rpx;
    height: 90rpx;
    border-radius: 20rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1rpx solid rgba(255, 255, 255, 0.1);
    transition: background-color 0.3s ease;
  }

  .container.light .preview-box {
    border: 1rpx solid var(--border-color);
  }

  .preview-tip {
    color: var(--text-secondary);
    font-size: 30rpx;
  }

  .hex-field {
    flex: 1;
    font-family: monospace;
    /* 代码样式字体 */
    letter-spacing: 2rpx;
  }

  /* 底部按钮 */
  .custom-footer {
    display: flex;
    padding: 0 40rpx 40rpx;
    gap: 20rpx;
  }

  .btn-cancel {
    flex: 1;
    height: 90rpx;
    line-height: 90rpx;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: 20rpx;
    font-size: 28rpx;
  }

  .container.light .btn-cancel {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .btn-confirm-add {
    flex: 2;
    height: 90rpx;
    line-height: 90rpx;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: #fff;
    border-radius: 20rpx;
    font-size: 28rpx;
    font-weight: bold;
  }

  .error-msg {
    color: var(--danger);
    font-size: 24rpx;
    margin-top: 10rpx;
    text-align: center;
  }

  /* 弹出动画 */
  .animate-pop {
    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* 搜索区域 */
  .search-wrapper {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    margin: 0 10px;
  }

  .search-trigger {
    flex: 0 0 auto;
    margin-right: 6px;
    color: var(--text-muted);
    margin-left: 10px;
    width: 100px;
    height: 32px;
    line-height: 32px;
    text-align: center;
  }

  .search-input {
    flex: 1 1 auto;
    height: 32px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0 6px;
    box-sizing: border-box;
  }

  .clear-search {
    flex: 0 0 auto;
    margin-left: 6px;
    color: var(--text-muted);
    cursor: pointer;
  }

  /* 拖拽相关样式 */
  .movable-area {
    width: 100%;
    position: relative;
    opacity: 1;
    transition: opacity 0.2s ease;
    overflow: visible;
  }

  .movable-item {
    width: 100%;
    height: 130rpx;
    display: flex;
    align-items: center;
    transition: none !important;
    overflow: hidden;
  }

  .movable-item:not(.is-dragging) {
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
  }

  .is-dragging {
    z-index: 999 !important;
    transition: none !important;
  }

  .slide-wrapper {
    position: relative;
    width: 100%;
    height: 110rpx;
    margin: 0 20rpx;
    overflow: visible;
    background-color: transparent;
  }

  .delete-btn {
    position: absolute;
    right: 2rpx;
    top: 0;
    bottom: 0;
    width: 120rpx;
    background-color: var(--danger);
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    z-index: 1;
  }

  .action-card {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    background-color: var(--bg-tertiary);
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
    box-sizing: border-box;
    transition: transform 0.2s ease;
    overflow: hidden;
    box-shadow: 0 0 5rpx rgba(0, 0, 0, 0.3);
  }

  .container.light .action-card {
    background-color: var(--bg-secondary);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  }

  .action-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 30rpx;
  }

  .action-name {
    font-size: 30rpx;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .container.light .action-name {
    color: var(--text-primary);
  }

  .action-history-area {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 8px;
    padding: 8px 4px 8px 12px;
    border-radius: 8px;
    min-height: 44px;
    min-width: 44px;
  }

  .action-history-area:active {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .arrow-icon {
    font-size: 20px;
    color: var(--text-placeholder);
  }

  .container.light .arrow-icon {
    color: var(--text-muted);
  }

  .tag-label {
    flex: 1;
    text-align: center;
    font-size: 30rpx;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .container.dark .tag-label {
    color: var(--text-primary);
  }

  .container.light .tag-label {
    color: var(--text-primary);
  }

  .is-dragging .action-card {
    transition: none;
    transform: scale(1.05) !important;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.8);
    border: 1rpx solid var(--text-placeholder);
  }

  .popup-panel {
    max-width: 100%;
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.25s ease-out;
  }

  .popup-overlay {
    align-items: flex-end;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .container.light .panel-header {
    border-bottom-color: var(--border-color);
  }

  .container.light .panel-title {
    color: var(--text-primary);
  }

  .container.light .close-btn {
    color: var(--text-secondary);
  }

  .panel-title {
    font-size: 17px;
    font-weight: 600;
    color: inherit;
  }

  .close-btn {
    font-size: 22px;
    color: var(--text-muted);
    padding: 4px 8px;
  }

  .close-btn:active {
    opacity: 0.6;
  }

  .panel-body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    color: var(--text-placeholder);
    margin-bottom: 8px;
  }

  .container.light .form-label {
    color: var(--text-secondary);
  }

  .form-input {
    width: 100%;
    height: 44px;
    background-color: var(--bg-tertiary);
    border: none;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 16px;
    color: inherit;
    box-sizing: border-box;
  }

  .container.dark .form-input {
    background-color: var(--bg-tertiary);
  }

  .container.light .form-input {
    background-color: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    color: var(--text-primary);
  }

  .form-input::placeholder {
    color: var(--text-secondary);
  }

  .category-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .category-option {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    border-radius: 20px;
    background-color: var(--bg-tertiary);
    font-size: 13px;
    color: var(--text-placeholder);
  }

  .category-option.selected {
    background: linear-gradient(135deg, var(--primary), #0048ff);
    color: #fff;
  }

  .container.light .category-option {
    background-color: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    color: var(--text-secondary);
  }

  .container.light .category-option.selected {
    background: linear-gradient(135deg, var(--primary), #0048ff);
    color: #ffffff;
  }

  .category-option:active {
    opacity: 0.7;
  }

  .category-option-check {
    font-size: 12px;
    font-weight: bold;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background-color: var(--bg-tertiary);
    border-radius: 10px;
    transition: background-color 0.2s ease;
  }

  .container.light .checkbox-row {
    background-color: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
  }

  .checkbox-box {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid var(--text-placeholder);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .container.light .checkbox-box {
    border-color: var(--text-muted);
  }

  .checkbox-box.checked {
    background: linear-gradient(135deg, var(--primary), #0048ff);
    border-color: var(--primary);
  }

  .checkbox-check {
    color: #fff;
    font-size: 14px;
    font-weight: bold;
  }

  .checkbox-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .checkbox-label {
    font-size: 15px;
    color: inherit;
    font-weight: 500;
  }

  .checkbox-hint {
    font-size: 12px;
    color: var(--text-muted);
  }

  .subcategory-section-form {
    margin-top: -8px;
  }

  .subcategory-form-label {
    font-size: 12px;
    color: var(--text-muted);
    padding-left: 12px;
    margin-bottom: 6px;
  }

  .subcategory-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-left: 12px;
  }

  .subcategory-option {
    padding: 5px 12px;
    border-radius: 14px;
    background-color: var(--bg-tertiary);
    font-size: 12px;
    color: var(--text-muted);
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .subcategory-option.selected {
    background-color: rgba(55, 155, 255, 0.2);
    border-color: var(--primary);
    color: var(--primary);
  }

  .container.light .subcategory-option {
    background-color: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    color: var(--text-secondary);
  }

  .container.light .subcategory-option.selected {
    background-color: rgba(55, 155, 255, 0.1);
    border-color: var(--primary);
    color: var(--primary);
  }

  .subcategory-option:active {
    opacity: 0.7;
  }

  .panel-footer {
    padding: 16px 20px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }

  .btn-row {
    display: flex;
    gap: 12px;
  }

  .btn-return {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    border-radius: 10px;
    font-size: 15px;
    color: var(--text-placeholder);
    background-color: var(--bg-tertiary);
  }

  .container.light .btn-return {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .btn-return:active {
    opacity: 0.7;
  }

  .btn-confirm {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    border-radius: 10px;
    font-size: 15px;
    color: #fff;
    background: linear-gradient(135deg, var(--primary), #0048ff);
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-confirm:active {
    opacity: 0.8;
  }

  .set-selector-panel {
    width: 100%;
    height: auto;
    max-height: 70vh;
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
  }

  .container.light .set-selector-body {
    background-color: var(--bg-secondary);
  }

  .container.light .current-action-name {
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.light .preset-set-btn {
    background: var(--bg-primary);
  }

  .container.light .preset-set-btn text {
    color: var(--text-secondary);
  }

  .container.light .custom-set-input {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1rpx solid var(--border-color);
  }

  .set-selector-body {
    padding: 20px;
  }

  .current-action-name {
    text-align: center;
    font-size: 16px;
    color: var(--text-primary);
    margin-bottom: 20px;
    padding: 10px;
    background: var(--bg-tertiary);
    border-radius: 10px;
  }

  .quick-set-options {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 30px;
    margin-bottom: 20px;
  }

  .quick-set-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quick-set-btn text {
    font-size: 20px;
    color: #fff;
    font-weight: bold;
  }

  .quick-set-btn:active {
    opacity: 0.7;
  }

  .set-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }

  .set-number {
    font-size: 40px;
    color: var(--text-primary);
    font-weight: bold;
  }

  .set-unit {
    font-size: 14px;
    color: var(--text-muted);
  }

  .preset-sets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
  }

  .preset-set-btn {
    width: 50px;
    height: 40px;
    border-radius: 8px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preset-set-btn text {
    font-size: 14px;
    color: var(--text-placeholder);
  }

  .preset-set-btn.selected {
    background: rgba(55, 155, 255, 0.2);
    border: 1px solid var(--primary);
  }

  .preset-set-btn.selected text {
    color: var(--primary);
  }

  .custom-set-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .custom-set-label {
    font-size: 14px;
    color: var(--text-muted);
  }

  .custom-set-input {
    width: 60px;
    height: 40px;
    background: var(--bg-tertiary);
    border: none;
    border-radius: 8px;
    text-align: center;
    font-size: 16px;
    color: var(--text-primary);
  }

  .custom-set-unit {
    font-size: 14px;
    color: var(--text-muted);
  }

  .set-count-btn {
    padding: 4px 10px;
    background: rgba(55, 155, 255, 0.15);
    border: 1px solid var(--primary);
    border-radius: 12px;
    margin-right: 8px;
    flex-shrink: 0;
    line-height: 20px;
  }

  .set-count-text {
    font-size: 12px;
    color: var(--primary);
  }

  .container.light .set-count-btn {
    background: rgba(55, 155, 255, 0.1);
  }
</style>