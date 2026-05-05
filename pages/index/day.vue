<template>
  <view class="container dark">
    <!-- ========== 选择模板弹窗 ========== -->
    <view v-if="showChooseTpl" class="popup-overlay" @click.self="closeChooseTpl">
      <view class="overlay-bg" @click="closeChooseTpl"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">请选择模板</text>
          <view class="btn-aerobic" @click="openAerobicPopup">
            <text>有氧</text>
          </view>
          <view class="btn-rest" @click="openRestPopup">
            <text>休息日</text>
          </view>
          <text class="close-icon" @click="closeChooseTpl">×</text>
        </view>
        <view class="modal-body">
          <scroll-view class="tpl-select-list" scroll-y="true" show-scrollbar="false">
            <view v-for="tpl in templates.filter(t => !t.isAerobic)" :key="tpl.name" class="tpl-item"
              :style="{ backgroundColor: tpl.color }" @click="chooseTemplateByName(tpl.name)">
              <text :style="{ color: getContrastColor(tpl.color) }">{{ tpl.name }}</text>
            </view>
            <view v-if="templates.length === 0" class="no-data">
              <text>暂无可用模板，请返回首页新建</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- ========== 休息日状态展示 ========== -->
    <view v-if="isRestDay" class="rest-day-header">
      <text class="rest-day-text">📅 今日标记为休息日：{{ restReasonStored }}</text>
    </view>

    <!-- ========== 模板动作列表（侧滑删除 + 长按排序） ========== -->
    <scroll-view class="action-list" scroll-y="true" v-if="!isRestDay">
      <view v-for="(actName, idx) in chosenActions" :key="actName" class="slide-wrapper">
        <!-- 删除按钮（在卡片后面） -->
        <view class="delete-btn-container">
          <view class="delete-btn" @click.stop="handleDeleteAction(idx)">删除</view>
        </view>
        <!-- 可滑动的卡片 -->
        <view class="action-card-content" :style="{ transform: 'translateX(' + (slideOffset[idx] || 0) + 'px)' }"
          @touchstart="onSwipeStart($event, idx); onCardLongPressStart($event, idx)"
          @touchmove="onSwipeMove($event, idx); onCardLongPressCancel()"
          @touchend="onSwipeEnd($event, idx); onCardLongPressCancel()">
          <view class="row-top">
            <view class="tag-group">
              <text class="tag" @click.stop="goHistory(idx)">{{ actName }}</text>
            </view>
            <view class="input-pair">
              <input type="digit" v-model="actionInputs[idx].reps" placeholder="次数" class="input-reps"
                @input="onInputChange(idx)" />
              <text class="input-mult">×</text>
              <input type="number" decimal-length="1" v-model="actionInputs[idx].weight" placeholder="kg"
                class="input-weight" @input="onInputChange(idx)" />
              <button class="confirm-btn" @click="confirmEntry(idx)">✓️</button>
            </view>
          </view>

          <!-- 明细列表 -->
          <view v-if="actionEntries[idx]?.length > 0" class="action-entries">
            <view v-for="(item, eidx) in actionEntries[idx]" :key="eidx" class="entry-row">
              <text class="entry-index">第{{ eidx + 1 }}组：</text>
              <text class="entry-text" @touchstart.stop="handleEntryTouchStart(idx, eidx)"
                @touchmove.stop="handleEntryTouchMove" @touchend.stop="handleEntryTouchEnd"
                @click.stop="openEditEntryPopup(idx, eidx)">{{ item.input }}kg</text>
            </view>
          </view>

          <!-- 对比信息 -->
          <view class="action-diff" v-if="diffs[idx] !== null && actionEntries[idx]?.length > 0">
            <text class="total-weight">
              总容量：{{ getTotalWeight(idx) }}kg
            </text>
            <text>与上次相比：</text>
            <text :class="diffs[idx].class">{{ diffs[idx].text }}</text>
          </view>
        </view>
      </view>
      <view class="list-bottom-space"></view>
    </scroll-view>

    <!-- ========== 底部按钮行 ========== -->
    <view class="save-row" v-if="!isRestDay">
      <view class="minimal-timer-btn" @click="openTimerPopup">
        <text class="mini-icon">⏱</text>
        <text class="mini-text">开始计时休息</text>
      </view>
      <view class="minimal-add-btn" @click="openAddActionPopup">
        <text class="add-plus">+</text>
      </view>
    </view>

    <!-- ========== 选择动作弹窗 ========== -->
    <view v-if="showAddActionPopup" class="popup-overlay" style="z-index: 1000;" @click.self="closeAddActionPopup">
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
                @input="filterAvailableActions" confirm-type="search" />
              <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">×</text>
            </view>
          </view>

          <scroll-view class="action-grid-list" scroll-y="true" show-scrollbar="false">
            <view class="action-grid-inner">
              <view v-for="(act, idx) in filteredActions" :key="idx" class="action-grid-item"
                :class="{ 'action-selected': selectedActionIdx === idx }" @click="selectAction(idx)">
                <view class="act-name-container">
                  <text class="act-name">{{ typeof act === 'string' ? act : act?.name || act }}</text>
                </view>
                <view v-if="selectedActionIdx === idx" class="select-check">✓</view>
              </view>

              <view v-if="filteredActions.length === 0" class="no-data-v2">
                <text class="no-data-icon">🤷‍♂️</text>
                <text class="no-data-text">未找到相关动作</text>
                <text class="no-data-sub">请检查关键词或在首页添加</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="modal-footer action-picker-footer no-border">
          <button class="confirm-add-btn" @click="addSelectedAction">确认添加</button>
        </view>
      </view>
    </view>

    <!-- ========== 计时器弹窗 ========== -->
    <view v-if="showTimerPopup" class="popup-overlay" style="z-index: 2000;">
      <view class="overlay-bg"></view>
      <view class="timer-panel fade-in" :class="dark">
        <view class="timer-full-body">
          <view class="quick-settings">
            <view class="quick-btn" @click="setQuickTime(180)">
              <text class="quick-label">胸背腿</text>
              <text class="quick-time">3:00</text>
            </view>
            <view class="quick-btn" @click="setQuickTime(120)">
              <text class="quick-label">肩手</text>
              <text class="quick-time">2:00</text>
            </view>
          </view>
          <view class="timer-core">
            <canvas canvas-id="timerCanvas" style="width:250px; height:250px;"></canvas>
            <view class="time-text">{{ displayTime }}</view>
          </view>
          <view class="timer-actions">
            <button class="action-btn" @click.stop="adjustDuration(-10)">－10s</button>
            <button class="action-btn" @click.stop="adjustDuration(+10)">＋10s</button>
            <button class="action-btn done-btn" @click.stop="completeTimer">完成</button>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 有氧弹窗 ========== -->
    <view v-if="showAerobicPopup" class="popup-overlay" @click.self="closeAerobicPopup">
      <view class="overlay-bg" @click="closeAerobicPopup"></view>
      <view class="modal-panel fade-in" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加有氧</text>
          <text class="close-icon" @click="closeAerobicPopup">×</text>
        </view>
        <view class="modal-body">
          <view class="input-row1">
            <input v-model="aerobicName" placeholder="有氧名称" class="action-input" />
          </view>
          <view class="input-row">
            <input v-model.number="aerobicTime" type="number" placeholder="时长（分钟）" class="action-input"
              @input="validateAerobicTime" />
          </view>
          <view class="divider"></view>
          <view v-if="aerobicHistory.length > 0" class="aerobic-history">
            <text class="subtitle">历史有氧</text>
            <view class="tag-container">
              <text v-for="(a, i) in aerobicHistory" :key="i" class="reason-tag" @click="aerobicName = a">
                {{ a }}
              </text>
            </view>
          </view>
        </view>
        <view class="modal-footer btn-row">
          <button @click="saveAerobic">完成</button>
        </view>
      </view>
    </view>

    <!-- ========== 休息日理由弹窗 ========== -->
    <view v-if="showRestPopup" class="popup-overlay" @click.self="closeRestPopup">
      <view class="overlay-bg" @click="closeRestPopup"></view>
      <view class="modal-panel fade-in" @click.stop>
        <view class="modal-header">
          <text class="modal-title">休息日</text>
          <text class="close-icon" @click="closeRestPopup">×</text>
        </view>
        <view class="modal-body">
          <input v-model="restReason" placeholder="输入标题，例如腿伤了，姨妈等等..." class="action-input rest" />
          <text class="subtitle">常用理由</text>
          <view class="tag-container">
            <text v-for="r in commonReasons" :key="r" class="reason-tag" @click="restReason = r">
              {{ r }}
            </text>
          </view>
        </view>
        <view class="modal-footer">
          <button @click="saveRestDay">保存</button>
        </view>
      </view>
    </view>
    <!-- ========== 新增：修改记录弹窗 ========== -->
    <view v-if="showEditEntryPopup" class="popup-overlay" @click.self="closeEditEntryPopup">
      <view class="overlay-bg" @click="closeEditEntryPopup"></view>
      <view class="modal-panel edit-panel fade-in" @click.stop>
        <view class="modal-header no-border">
          <text class="modal-title">编辑记录</text>
          <text class="close-icon" @click="closeEditEntryPopup">×</text>
        </view>

        <view class="modal-body edit-body">
          <view class="edit-badge">
            <text>第 {{ editEntryInfo.entryIdx + 1 }} 组</text>
          </view>

          <view class="edit-main-row">
            <view class="input-item">
              <input type="digit" v-model="editEntryReps" class="big-input" focus />
              <text class="unit-label">次</text>
            </view>

            <text class="x-mark">×</text>

            <view class="input-item">
              <input type="digit" v-model="editEntryWeight" class="big-input" />
              <text class="unit-label">kg</text>
            </view>
          </view>
        </view>

        <view class="modal-footer no-border">
          <button class="save-entry-btn" @click="saveEditedEntry">确认修改</button>
        </view>
      </view>
    </view>

    <!-- ========== 全屏排序窗口 ========== -->
    <view v-if="showSortModal" class="sort-modal-overlay">
      <!-- 顶部提示栏 -->
      <view class="sort-header">
        <text class="sort-hint-icon">💡</text>
        <text class="sort-hint-text">提示：请长按每一个动作条进行拖拽排序</text>
      </view>

      <!-- 主体内容区：可拖拽动作列表 -->
      <scroll-view class="sort-body" :scroll-y="!isDragMode" :scroll-with-animation="false">
        <movable-area class="sort-movable-area" :style="{ height: sortedActions.length * 110 + 'rpx' }">
          <view v-for="(item, index) in sortedActions" :key="'slot'+index" class="sort-item-slot"
            :style="{ top: index * 110 + 'rpx' }"></view>

          <movable-view v-for="(act, idx) in sortedActions" :key="act" direction="vertical" class="sort-movable-item"
            :y="itemY[idx]" :disabled="!isDragMode" :class="{ 'is-dragging': dragIdx === idx }"
            @touchstart="onSortTouchStart($event, idx)" @touchmove="onSortTouchMove($event, idx)"
            @touchend="onSortTouchEnd($event, idx); isDragMode ? onSortDragEnd() : null"
            @change="onSortDragMove($event, idx)">
            <view class="sort-card">
              <text class="sort-card-label">{{ act }}</text>
            </view>
          </movable-view>
        </movable-area>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="sort-footer">
        <button class="sort-btn-save" @click="saveSort">保存当前排序</button>
        <button class="sort-btn-cancel" @click="cancelSort">取消</button>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useTemplateStore
  } from '@/stores/template'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    getContrastColor
  } from '@/utils/color.js'
  import {
    formatDate,
    formatDateStr
  } from '@/utils/theme.js'
  export default {
    data() {
      return {
        templateStore: useTemplateStore(),
        dayDataCacheStore: useDayDataCacheStore(),
        date: '',
        ACTIONS_KEY: 'fitness_actions',
        TEMPLATES_KEY: 'fitness_templates',
        DAYDATA_PREFIX: 'fitness_daydata_',
        templates: [],
        showChooseTpl: true,
        chosenTplIdx: null,
        chosenTplName: '',
        chosenTplColor: '',
        chosenActions: [],
        actionInputs: [],
        diffs: [],
        actionEntries: [],
        availableActions: [],
        showAddActionPopup: false,
        longPressTimer: null,
        longPressThreshold: 500,
        pressedEntry: {
          actionIdx: -1,
          entryIdx: -1
        },
        showTimerPopup: false,
        totalDuration: 60,
        remaining: 60,
        defaultTimerDuration: 60,
        canvasCtx: null,
        timerInterval: null,
        arcTime: 270,
        angle: 0,
        endTimestamp: 0,
        notified: false,
        audioCtx: null,
        showAerobicPopup: false,
        aerobicName: '',
        aerobicTime: null,
        AEROBIC_COLOR: '#01847f',
        showRestPopup: false,
        restReason: '',
        commonReasons: ['休息日', '有事', '月经', '姨妈', '生病', '受伤'],
        isRestDay: false,
        restReasonStored: '',
        isSearching: false,
        searchKeyword: '',
        filteredActions: [],
        selectedActionIdx: null,
        saveTimer: null,
        calcDiffTimer: null,
        isCalculating: false,
        loadTimer: null,
        actionLatestRecordCache: {},
        // 侧滑删除相关
        slideOffset: [],
        startX: 0,
        startY: 0,
        startTime: 0,
        isClick: false,
        // 全屏排序相关
        cardLongPressTimer: null,
        sortLongPressTimer: null, // 排序长按计时器
        sortLongPressThreshold: 100, // 排序拖拽触发时间
        showSortModal: false,
        itemY: [],
        isDragMode: false,
        dragIdx: -1,
        isDragTriggered: false,
        hasSwapped: false,
        lastTargetIdx: -1,
        sortedActions: [],
        sortedInputs: [],
        sortedEntries: [],
        sortedDiffs: [],
        rowHeight: 130,
        showEditEntryPopup: false,
        editEntryInfo: {
          actionIdx: -1,
          entryIdx: -1
        },
        editEntryReps: '',
        editEntryWeight: ''
      };
    },
    beforeUnmount() {
      this.clearAllTimers();
      if (this.audioCtx) {
        this.audioCtx.stop();
        this.audioCtx = null;
      }
    },
    computed: {
      displayTime() {
        if (this.remaining >= 60) {
          const m = Math.floor(this.remaining / 60);
          const s = this.remaining % 60;
          return `${m}:${s < 10 ? '0' + s : s}`;
        }
        return String(this.remaining);
      },
      aerobicHistory() {
        return this.templates
          .filter(t => t.isAerobic)
          .map(t => t.name);
      }
    },
    created() {
      const audio = uni.createInnerAudioContext();
      audio.src = '/static/notification.mp3';
      audio.loop = false;
      this.audioCtx = audio;
    },
    onLoad(options) {
      uni.showLoading({
        title: '加载中...',
        mask: true
      });

      // 只加载索引，不预加载所有数据
      this.dayDataCacheStore.loadIndex();

      if (options.date) {
        this.date = options.date;
      } else {
        const now = new Date();
        this.date = this.formatDate(now);
      }
    },
    mounted() {
      this.templateStore.load();
      this.loadDayData();
    },
    watch: {
      chosenActions(newVal) {
        if (newVal.length > 0) {
          // 当动作列表变化时，重新预加载缓存
          this.preloadActionLatestRecordCache();
        }
      }
    },
    methods: {
      /* ========== 通用工具方法 ========== */
      getContrastColor,
      formatDate,
      formatDateStr,
      preloadActionLatestRecordCache() {
        if (!this.chosenActions || this.chosenActions.length === 0) return;
        this.chosenActions.forEach(actName => {
          this.calcActionLatestRecord(actName);
        });
      },
      clearAllTimers() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        if (this.calcDiffTimer) clearTimeout(this.calcDiffTimer);
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        if (this.loadTimer) clearTimeout(this.loadTimer);
        if (this.cardLongPressTimer) clearTimeout(this.cardLongPressTimer); // 新增
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer); // 新增
        this.clearTimer();
        this.saveTimer = this.calcDiffTimer = this.longPressTimer = this.loadTimer = null;
        clearTimeout(this.cardLongPressTimer);
      },

      /* ========== 数据加载与存储 ========== */
      calcActionLatestRecord(actName) {
        const todayDateStr = this.formatDateStr(new Date(this.date));
        const currentDate = new Date(todayDateStr);

        // 从 dayDataCacheStore 的 dateIndex 获取所有有数据的日期
        const datesWithData = Array.from(this.dayDataCacheStore.dateIndex);

        // 对日期进行降序排序，从最近的开始查找
        datesWithData.sort((a, b) => new Date(b) - new Date(a));

        for (const dateStr of datesWithData) {
          if (dateStr === todayDateStr) continue;

          const recordDate = new Date(dateStr);
          if (isNaN(recordDate.getTime()) || recordDate >= currentDate) continue;

          // 直接从存储读取数据，不经过缓存，避免加载不必要的数据
          try {
            const key = this.DAYDATA_PREFIX + dateStr;
            const dayData = uni.getStorageSync(key);

            if (dayData && dayData.entries?.[actName] && dayData.entries[actName].length > 0) {
              const latestRecord = {
                date: dateStr,
                total: dayData.actions?.[actName] || 0,
                entry: dayData.entries[actName]
              };
              this.actionLatestRecordCache[actName] = latestRecord;
              return latestRecord;
            }
          } catch (e) {
            continue;
          }
        }

        // 如果没有找到任何记录
        this.actionLatestRecordCache[actName] = null;
        return null;
      },

      calcLastDayDate() {
        const currentDate = new Date(this.date);
        currentDate.setDate(currentDate.getDate() - 1);
        this.lastDayDate =
          `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
      },
      loadDayData() {
        if (this.loadTimer) clearTimeout(this.loadTimer);
        this.loadTimer = setTimeout(() => this._loadDayData(), 50);
      },
      _loadDayData() {
        uni.setNavigationBarTitle({
          title: this.date.replace(/-/g, '/')
        });
        const tplArr = uni.getStorageSync(this.TEMPLATES_KEY) || [];
        this.templates = Array.isArray(tplArr) ? tplArr : [];
        const key = this.DAYDATA_PREFIX + this.date;
        // 优先从全局缓存获取，没有的话再读取 storage
        let raw = this.dayDataCacheStore.getDayData(this.date);
        if (Object.keys(raw).length === 0) {
          raw = uni.getStorageSync(key) || {};
        }
        const dayData = {
          templates: raw.templates || {},
          actions: raw.actions || {},
          entries: raw.entries || {},
          isRestDay: raw.isRestDay || false
        };
        this.isRestDay = dayData.isRestDay;
        this.restReasonStored = dayData.isRestDay ? (Object.keys(dayData.templates)[0] || '') : '';
        const names = Object.keys(dayData.templates);

        // 分支1：无模板且非休息日 → 显示选模板弹窗
        if (names.length === 0 && !this.isRestDay) {
          this.showChooseTpl = true;
          const actionStore = useActionStore();
          actionStore.load();
          this.availableActions = actionStore.actionNames;
          // 新增：隐藏加载提示
          uni.hideLoading();
          return;
        }

        this.showChooseTpl = false;

        // 分支2：是休息日 → 直接返回
        if (this.isRestDay) {
          // 新增：隐藏加载提示
          uni.hideLoading();
          return;
        }

        // 分支3：正常加载模板和动作数据
        const tplName = names[names.length - 1];
        this.chosenTplName = tplName;
        this.chosenTplIdx = this.templates.findIndex(t => t.name === tplName);
        this.chosenTplColor = this.chosenTplIdx !== -1 ? this.templates[this.chosenTplIdx].color : '';
        const tplInfo = dayData.templates[tplName] || {};
        const defaultActions = (this.chosenTplIdx !== -1) ? this.templates[this.chosenTplIdx].actions.slice() : [];
        const dayActionOrder = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : defaultActions;
        this.chosenActions = dayActionOrder;
        this.actionInputs = this.chosenActions.map(() => ({
          reps: '',
          weight: ''
        }));
        this.diffs = this.chosenActions.map(() => null);
        this.actionEntries = this.chosenActions.map(name => {
          const arr = dayData.entries[name];
          return Array.isArray(arr) ? [...arr] : [];
        });

        // 计算差异后隐藏提示（和原有逻辑同步）
        setTimeout(() => {
          this.calcAllDiffs();
          // 新增：隐藏加载提示
          uni.hideLoading();
        }, 100);
      },
      debounceSaveToStorage(idx) {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.saveEntryToStorage(idx), 200);
      },
      saveEntryToStorage(idx) {
        const actName = this.chosenActions[idx];
        const todayDateStr = this.formatDateStr(new Date(this.date));
        const key = this.DAYDATA_PREFIX + todayDateStr;
        uni.getStorage({
          key: key,
          success: (res) => {
            const raw = res.data || {};
            const dayData = {
              templates: raw.templates || {},
              actions: raw.actions || {},
              entries: raw.entries || {}
            };
            dayData.entries[actName] = this.actionEntries[idx] || [];
            dayData.actions[actName] = (this.actionEntries[idx] || []).reduce((sum, item) => sum + item.total, 0);
            const tplInfo = dayData.templates[this.chosenTplName] || {
              totalWeight: 0,
              actionWeights: {},
              actionOrder: [...this.chosenActions]
            };
            tplInfo.actionWeights[actName] = dayData.actions[actName];
            tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => a + b, 0);
            dayData.templates[this.chosenTplName] = tplInfo;
            uni.setStorage({
              key: key,
              data: dayData
            });
            // 同时更新全局缓存
            this.dayDataCacheStore.saveDayData(todayDateStr, dayData);
            delete this.actionLatestRecordCache[actName];
            this.calcActionLatestRecord(actName);
          },
          fail: () => {
            const dayData = {
              templates: {
                [this.chosenTplName]: {
                  totalWeight: (this.actionEntries[idx] || []).reduce((sum, item) => sum + item.total, 0),
                  actionWeights: {
                    [actName]: (this.actionEntries[idx] || []).reduce((sum, item) => sum + item.total, 0)
                  },
                  actionOrder: [...this.chosenActions]
                }
              },
              actions: {
                [actName]: (this.actionEntries[idx] || []).reduce((sum, item) => sum + item.total, 0)
              },
              entries: {
                [actName]: this.actionEntries[idx] || []
              }
            };
            uni.setStorage({
              key: key,
              data: dayData
            });
            // 同时更新全局缓存
            this.dayDataCacheStore.saveDayData(todayDateStr, dayData);
            delete this.actionLatestRecordCache[actName];
            this.calcActionLatestRecord(actName);
          }
        });
      },
      updateTemplateData(dayData) {
        const actionWeights = {};
        this.chosenActions.forEach((name) => {
          const entries = dayData.entries[name] || [];
          actionWeights[name] = entries.reduce((sum, item) => sum + item.total, 0);
        });
        dayData.templates[this.chosenTplName] = {
          totalWeight: Object.values(actionWeights).reduce((a, b) => a + b, 0),
          actionWeights,
          actionOrder: [...this.chosenActions]
        };
      },
      persistOrder() {
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };
        const tplInfo = dayData.templates[this.chosenTplName] || {};
        tplInfo.actionOrder = [...this.chosenActions];
        dayData.templates[this.chosenTplName] = tplInfo;
        uni.setStorageSync(key, dayData);
        // 同时更新全局缓存
        this.dayDataCacheStore.saveDayData(this.date, dayData);
      },

      /* ========== 动作列表操作 ========== */
      onInputChange(idx) {
        const reps = this.actionInputs[idx].reps;
        const weight = this.actionInputs[idx].weight;
        if (reps === '' || weight === '') return;
        this.debounceCalcDiffs();
      },
      debounceCalcDiffs() {
        if (this.calcDiffTimer) clearTimeout(this.calcDiffTimer);
        this.calcDiffTimer = setTimeout(() => this.calcAllDiffs(), 300);
      },
      getTotalWeight(idx) {
        const entries = this.actionEntries[idx];
        if (!entries || entries.length === 0) return 0;
        return entries.reduce((sum, item) => sum + item.total, 0);
      },
      confirmEntry(idx) {
        const reps = this.actionInputs[idx].reps;
        const weight = this.actionInputs[idx].weight;
        if (reps === '' || weight === '') {
          uni.showToast({
            title: '次数和重量都要输入',
            icon: 'none'
          });
          return;
        }
        const repsNum = Number(reps);
        const weightNum = Number(weight);
        if (repsNum <= 0 || weightNum <= 0) {
          uni.showToast({
            title: '请输入有效的数值',
            icon: 'none'
          });
          return;
        }
        const total = repsNum * weightNum;
        const inputStr = `${repsNum}×${weightNum}`;
        this.$set(this.actionEntries, idx, [
          ...(this.actionEntries[idx] || []),
          {
            input: inputStr,
            total
          }
        ]);
        this.$set(this.actionInputs, idx, {
          reps: '',
          weight: ''
        });
        Promise.resolve().then(() => {
          this.saveEntryToStorage(idx);
        });
        this.calcDiffForSingleAction(idx);
      },
      calcDiffForSingleAction(idx) {
        Promise.resolve().then(() => {
          try {
            const actName = this.chosenActions[idx];
            let latestRecord = null;
            if (this.actionLatestRecordCache[actName] !== undefined) {
              latestRecord = this.actionLatestRecordCache[actName];
            }
            if (!latestRecord) {
              latestRecord = this.calcActionLatestRecord(actName);
            }
            if (!latestRecord) {
              this.$set(this.diffs, idx, {
                text: '无历史记录',
                class: 'diff-neutral'
              });
            } else {
              this.updateDiffWithLatestRecord(actName, idx, latestRecord);
            }
          } catch (error) {
            const actName = this.chosenActions[idx];
            const latestRecord = this.calcActionLatestRecord(actName);
            if (!latestRecord) {
              this.$set(this.diffs, idx, {
                text: '无历史记录',
                class: 'diff-neutral'
              });
            } else {
              this.updateDiffWithLatestRecord(actName, idx, latestRecord);
            }
          }
        });
      },

      updateDiffWithLatestRecord(actName, idx, latestRecord) {
        const latestTotal = latestRecord.total;
        const todayEntry = this.actionEntries[idx] || [];
        const todayTotal = todayEntry.reduce((sum, item) => sum + item.total, 0);

        if (todayTotal > latestTotal) {
          const diff = todayTotal - latestTotal;
          this.$set(this.diffs, idx, {
            text: `+${diff}`,
            class: 'diff-up'
          });
        } else if (todayTotal < latestTotal) {
          const diff = latestTotal - todayTotal;
          this.$set(this.diffs, idx, {
            text: `-${diff}`,
            class: 'diff-down'
          });
        } else {
          this.$set(this.diffs, idx, {
            text: '持平',
            class: 'diff-neutral'
          });
        }
      },
      goHistory(idx) {
        const actName = this.chosenActions[idx];
        uni.navigateTo({
          url: `../actionHistory/actionHistory?action=${encodeURIComponent(actName)}`
        });
      },

      /* ========== 侧滑删除 ========== */
      onSwipeStart(e, idx) {
        this.startX = e.touches[0].pageX;
        this.startY = e.touches[0].pageY;
        this.startTime = Date.now();
        this.isClick = true;
        if (!this.isDragMode) {
          this.$set(this.slideOffset, idx, 0);
        }
      },
      onSwipeMove(e, idx) {
        const currentX = e.touches[0].pageX;
        const currentY = e.touches[0].pageY;
        const deltaX = currentX - this.startX;
        const deltaY = currentY - this.startY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.isClick = false;
        }

        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            this.$set(this.slideOffset, idx, Math.max(deltaX, -100));
          } else if (deltaX > 0 && this.slideOffset[idx] < 0) {
            this.$set(this.slideOffset, idx, Math.min(0, this.slideOffset[idx] + deltaX));
          }
          if (e.cancelable) {
            e.preventDefault();
            e.stopPropagation();
          }
        } else {
          this.$set(this.slideOffset, idx, 0);
        }
      },
      onSwipeEnd(e, idx) {
        const touchDuration = Date.now() - this.startTime;

        if (this.slideOffset[idx] < -50) {
          this.$set(this.slideOffset, idx, -80);
        } else {
          this.$set(this.slideOffset, idx, 0);
        }

        this.isClick = false;
        this.startX = 0;
        this.startTime = 0;
      },
      handleDeleteAction(idx) {
        uni.showModal({
          title: '删除动作',
          content: `确定要删除 "${this.chosenActions[idx]}" 吗？此操作仅删除当天动作，不会影响模板。`,
          success: (res) => {
            if (res.confirm) {
              this.$set(this.slideOffset, idx, 0);
              this.removeActionFromDay(idx);
            } else {
              this.$set(this.slideOffset, idx, 0);
            }
          }
        });
      },

      /* ========== 差异计算 ========== */
      calcAllDiffs() {
        this.chosenActions.forEach((actName, idx) => {
          this.calcDiffForSingleAction(idx);
        });
      },

      /* ========== 记录删除 ========== */
      handleEntryTouchStart(aIdx, eIdx) {
        this.pressedEntry = {
          actionIdx: aIdx,
          entryIdx: eIdx
        };
        clearTimeout(this.longPressTimer);
        clearTimeout(this.cardLongPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (this.pressedEntry.actionIdx === aIdx && this.pressedEntry.entryIdx === eIdx) {
            this.handleEntryLongPress(aIdx, eIdx);
          }
        }, this.longPressThreshold);
      },
      handleEntryTouchMove() {
        clearTimeout(this.longPressTimer);
        clearTimeout(this.cardLongPressTimer);
      },
      handleEntryTouchEnd() {
        clearTimeout(this.longPressTimer);
        clearTimeout(this.cardLongPressTimer);
        this.pressedEntry = {
          actionIdx: -1,
          entryIdx: -1
        };
      },
      handleEntryLongPress(aIdx, eIdx) {
        uni.vibrateShort({
          type: 'light'
        });
        uni.showModal({
          title: '删除记录',
          content: `确定删除 第${eIdx + 1}组 记录？`,
          success: (res) => {
            if (res.confirm) this.removeEntry(aIdx, eIdx);
          }
        });
        this.pressedEntry = {
          actionIdx: -1,
          entryIdx: -1
        };
      },
      removeEntry(aIdx, eIdx) {
        const actName = this.chosenActions[aIdx];
        const removed = this.actionEntries[aIdx].splice(eIdx, 1)[0];
        this.debounceSaveToStorage(aIdx);
        this.debounceCalcDiffs();
        uni.showToast({
          title: `已删除：${removed.input}kg`,
          icon: 'success',
          duration: 1000
        });
      },

      /* ========== 动作删除 ========== */
      removeActionFromDay(idx) {
        const actNameToRemove = this.chosenActions[idx];
        this.chosenActions.splice(idx, 1);
        this.actionInputs.splice(idx, 1);
        this.diffs.splice(idx, 1);
        this.actionEntries.splice(idx, 1);
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };
        delete dayData.entries[actNameToRemove];
        delete dayData.actions[actNameToRemove];
        const actionWeights = {};
        this.chosenActions.forEach(name => {
          const arr = Array.isArray(dayData.entries[name]) ? dayData.entries[name] : [];
          actionWeights[name] = arr.reduce((s, i) => s + i.total, 0);
        });
        const tplInfo = dayData.templates[this.chosenTplName] || {
          actionWeights: {},
          totalWeight: 0
        };
        tplInfo.actionWeights = {
          ...actionWeights
        };
        tplInfo.totalWeight = Object.values(actionWeights).reduce((a, b) => a + b, 0);
        const order = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : [];
        tplInfo.actionOrder = order.filter(name => name !== actNameToRemove);
        dayData.templates[this.chosenTplName] = tplInfo;
        uni.setStorageSync(key, dayData);
        // 同时更新全局缓存
        this.dayDataCacheStore.saveDayData(this.date, dayData);
        uni.showToast({
          title: `已删除动作：${actNameToRemove}`,
          icon: 'success'
        });
        this.calcAllDiffs();
      },

      /* ========== 选择模板弹窗 ========== */
      closeChooseTpl() {
        this.showChooseTpl = false;
      },
      chooseTemplateByName(name) {
        const idx = this.templates.findIndex(t => t.name === name);
        if (idx === -1) return;
        this.chooseTemplate(idx);
      },
      chooseTemplate(idx) {
        this.chosenTplIdx = idx;
        this.chosenTplName = this.templates[idx].name;
        this.chosenTplColor = this.templates[idx].color;
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = typeof raw === 'object' ? raw : {};
        dayData.templates = dayData.templates || {};
        const dayTpl = dayData.templates[this.chosenTplName] || {};
        let available = [];
        if (Array.isArray(dayTpl.actionOrder) && dayTpl.actionOrder.length > 0) {
          available = dayTpl.actionOrder.slice();
        } else {
          available = this.templates[idx].actions.slice() || [];
          dayTpl.actionOrder = available.slice();
        }
        dayTpl.actionWeights = dayTpl.actionWeights || {};
        dayData.templates[this.chosenTplName] = {
          ...dayTpl,
          actionOrder: dayTpl.actionOrder,
          actionWeights: dayTpl.actionWeights
        };
        uni.setStorageSync(key, dayData);
        // 同时更新全局缓存
        this.dayDataCacheStore.saveDayData(this.date, dayData);
        this.chosenActions = available;
        this.actionInputs = available.map(() => ({
          reps: '',
          weight: ''
        }));
        this.diffs = available.map(() => null);
        this.actionEntries = available.map(() => []);
        this.showChooseTpl = false;
        uni.showLoading({
          title: '正在计算对比...'
        });
        setTimeout(() => {
          this.calcAllDiffs();
          uni.hideLoading();
        }, 50);
      },

      /* ========== 计时器 ========== */
      clearTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.audioCtx) {
          this.audioCtx.stop();
          this.notified = false;
        }
      },
      updateRemaining() {
        const now = Date.now();
        const diff = Math.ceil((this.endTimestamp - now) / 1000);
        this.remaining = Math.max(0, diff);
        if (this.remaining > 0 && this.remaining <= 10) uni.vibrateShort();
        this.drawCircle();
        if (this.remaining <= 0 && !this.notified) {
          this.notified = true;
          this.clearTimer();
          uni.vibrateLong();
          this.audioCtx && this.audioCtx.play();
          uni.showToast({
            title: '计时结束',
            icon: 'none',
            duration: 2000
          });
          plus.push.addLocalNotification({
            id: Date.now(),
            title: '训练计时器',
            content: '计时结束，休息好再继续~',
          });
        }
      },
      setQuickTime(seconds) {
        uni.vibrateShort();
        this.defaultTimerDuration = seconds;
        this.totalDuration = seconds;
        this.remaining = seconds;
        this.endTimestamp = Date.now() + this.remaining * 1000;
        this.drawCircle();
      },
      openTimerPopup() {
        uni.vibrateShort();
        this.totalDuration = this.defaultTimerDuration;
        this.remaining = this.defaultTimerDuration;
        this.showTimerPopup = true;
        this.$nextTick(() => {
          this.drawCircle();
          this.startCountdown();
        });
      },
      adjustDuration(delta) {
        uni.vibrateShort({
          success: () => {},
          fail: () => {}
        });
        const newTotal = Math.max(1, this.totalDuration + delta);
        const newRemaining = Math.max(1, this.remaining + delta);
        this.totalDuration = newTotal;
        this.remaining = newRemaining;
        this.defaultTimerDuration = newTotal;
        this.notified = false;
        this.endTimestamp = Date.now() + this.remaining * 1000;
        this.drawCircle();
      },
      completeTimer() {
        this.showTimerPopup = false;
        this.clearTimer();
      },
      startCountdown() {
        this.clearTimer();
        this.endTimestamp = Date.now() + this.remaining * 1000;
        this.updateRemaining();
        this.timerInterval = setInterval(() => this.updateRemaining(), 1000);
      },
      drawCircle() {
        const ctx = uni.createCanvasContext('timerCanvas');
        const size = 250;
        const cx = size / 2,
          cy = size / 2,
          r = 110;
        ctx.clearRect(0, 0, size, size);
        ctx.setStrokeStyle(true ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
        ctx.setLineWidth(14);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
        const percent = this.remaining / this.totalDuration;
        const startAngle = Math.PI * 1.5;
        const endAngle = startAngle + 2 * Math.PI * percent;
        ctx.setStrokeStyle('#379bff');
        ctx.setLineWidth(17);
        ctx.setShadow(0, 0, 15, '#379bff');
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle, false);
        ctx.stroke();
        ctx.draw();
      },

      /* ========== 选择动作弹窗 ========== */
      openAddActionPopup() {
        const actionStore = useActionStore();
        actionStore.load();
        this.availableActions = actionStore.actionNames;
        this.filteredActions = this.availableActions.slice();
        this.isSearching = false;
        this.searchKeyword = '';
        this.selectedActionIdx = null;
        this.showAddActionPopup = true;
      },
      closeAddActionPopup() {
        this.showAddActionPopup = false;
        this.selectedActionIdx = null;
      },
      filterAvailableActions() {
        const kw = this.searchKeyword.trim().toLowerCase();
        if (!kw) {
          this.filteredActions = this.availableActions.slice();
        } else {
          this.filteredActions = this.availableActions.filter(act => {
            if (typeof act === 'string') return act.toLowerCase().includes(kw);
            if (act && typeof act === 'object' && act.name) return act.name.toLowerCase().includes(kw);
            return false;
          });
        }
        this.selectedActionIdx = null;
      },
      clearSearch() {
        this.searchKeyword = '';
        this.filterAvailableActions();
      },
      selectAction(idx) {
        this.selectedActionIdx = idx;
      },
      addSelectedAction() {
        if (this.selectedActionIdx === null) {
          uni.showToast({
            title: '请选择一个动作',
            icon: 'none'
          });
          return;
        }
        const actName = this.filteredActions[this.selectedActionIdx];
        if (this.chosenActions.includes(actName)) {
          uni.showToast({
            title: '动作已在列表中',
            icon: 'none'
          });
          return;
        }
        if (!this.chosenTplName) {
          uni.showToast({
            title: '请先选择训练模板',
            icon: 'none'
          });
          return;
        }
        this.chosenActions.push(actName);
        this.actionInputs.push({
          reps: '',
          weight: ''
        });
        this.diffs.push({
          text: '未记录',
          class: 'diff-neutral'
        });
        this.actionEntries.push([]);
        this.showAddActionPopup = false;
        uni.showToast({
          title: `已添加：${actName}`,
          icon: 'success'
        });
        const dayKey = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(dayKey) || {};
        const dayData = {
          ...raw,
          templates: raw.templates || {},
          actions: raw.actions || {},
          entries: raw.entries || {}
        };
        dayData.entries[actName] = dayData.entries[actName] || [];
        dayData.actions[actName] = dayData.actions[actName] || 0;
        const tplInfo = dayData.templates[this.chosenTplName] || {
          totalWeight: 0,
          actionWeights: {},
          actionOrder: [...this.chosenActions]
        };
        tplInfo.actionWeights[actName] = 0;
        tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => (a + (Number(b) || 0)), 0);
        tplInfo.actionOrder = [...this.chosenActions];
        dayData.templates[this.chosenTplName] = tplInfo;
        uni.setStorageSync(dayKey, dayData);
      },

      /* ========== 有氧弹窗 ========== */
      openAerobicPopup() {
        this.showChooseTpl = false;
        this.showAerobicPopup = true;
        this.aerobicName = '';
        this.aerobicTime = null;
      },
      closeAerobicPopup() {
        this.showAerobicPopup = false;
        this.showChooseTpl = true;
      },
      validateAerobicTime() {
        if (this.aerobicTime !== null && this.aerobicTime < 1) {
          this.aerobicTime = 1;
          uni.showToast({
            title: '时长不能小于1分钟',
            icon: 'none'
          });
        }
      },
      saveAerobic() {
        if (!this.aerobicName || this.aerobicTime === null || this.aerobicTime < 1) {
          uni.showToast({
            title: '请填写名称和有效的时长（≥1分钟）',
            icon: 'none'
          });
          return;
        }
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };
        dayData.templates[this.aerobicName] = {
          totalWeight: this.aerobicTime,
          actionWeights: {},
          isAerobic: true
        };
        uni.setStorageSync(key, dayData);
        uni.showToast({
          title: '已添加有氧',
          icon: 'success'
        });
        this.showAerobicPopup = false;
        this.showChooseTpl = false;
      },

      /* ========== 休息日弹窗 ========== */
      openRestPopup() {
        this.showChooseTpl = false;
        this.showRestPopup = true;
        this.restReason = '';
      },
      closeRestPopup() {
        this.showRestPopup = false;
        this.showChooseTpl = true;
      },
      saveRestDay() {
        if (!this.restReason.trim()) {
          uni.showToast({
            title: '请输入理由',
            icon: 'none'
          });
          return;
        }
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          ...raw
        };
        dayData.isRestDay = true;
        dayData.templates = {
          [this.restReason]: {
            totalWeight: 0,
            actionWeights: {}
          }
        };
        uni.setStorageSync(key, dayData);
        // 同时更新全局缓存
        this.dayDataCacheStore.saveDayData(this.date, dayData);
        uni.showToast({
          title: '已标记休息日',
          icon: 'success'
        });
        this.closeRestPopup();
        this.showChooseTpl = false;
        this.isRestDay = true;
        this.restReasonStored = this.restReason;
      },
      /* ========== 修改记录弹窗相关方法 ========== */
      openEditEntryPopup(actionIdx, entryIdx) {
        // 记录要修改的条目信息
        this.editEntryInfo = {
          actionIdx,
          entryIdx
        };

        // 获取当前条目的数据并拆分显示
        const entry = this.actionEntries[actionIdx][entryIdx];
        const [reps, weight] = entry.input.split('×');

        // 填充到输入框
        this.editEntryReps = reps;
        this.editEntryWeight = weight;

        // 显示弹窗
        this.showEditEntryPopup = true;
      },

      closeEditEntryPopup() {
        this.showEditEntryPopup = false;
        this.editEntryInfo = {
          actionIdx: -1,
          entryIdx: -1
        };
        this.editEntryReps = '';
        this.editEntryWeight = '';
      },

      saveEditedEntry() {
        const {
          actionIdx,
          entryIdx
        } = this.editEntryInfo;
        const reps = this.editEntryReps;
        const weight = this.editEntryWeight;

        // 验证输入
        if (reps === '' || weight === '') {
          uni.showToast({
            title: '次数和重量都要输入',
            icon: 'none'
          });
          return;
        }

        const repsNum = Number(reps);
        const weightNum = Number(weight);

        if (repsNum <= 0 || weightNum <= 0) {
          uni.showToast({
            title: '请输入有效的数值',
            icon: 'none'
          });
          return;
        }

        // 更新数据
        const inputStr = `${repsNum}×${weightNum}`;
        const total = repsNum * weightNum;

        this.$set(this.actionEntries[actionIdx], entryIdx, {
          input: inputStr,
          total
        });

        // 保存到本地存储
        this.saveEntryToStorage(actionIdx);

        // 重新计算差异
        this.calcDiffForSingleAction(actionIdx);

        // 关闭弹窗并提示
        this.closeEditEntryPopup();
        uni.showToast({
          title: '修改成功',
          icon: 'success',
          duration: 1000
        });
      },

      /* ========== 全屏排序 ========== */
      // 新增：卡片长按开始
      onCardLongPressStart(e, idx) {
        // 200ms 短按触发排序（你想要的快响应）
        this.cardLongPressTimer = setTimeout(() => {
          this.openSortModal(idx);
        }, 200);
      },
      // 新增：取消卡片长按
      onCardLongPressCancel() {
        clearTimeout(this.cardLongPressTimer);
      },
      // 排序长按开始
      onSortTouchStart(e, idx) {
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer);
        this.sortLongPressTimer = setTimeout(() => {
          this.onSortDragTrigger(idx); // 触发拖拽模式
        }, this.sortLongPressThreshold);
      },
      // 排序移动时取消长按
      onSortTouchMove(e, idx) {
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer);
      },
      // 触摸结束取消长按
      onSortTouchEnd(e, idx) {
        if (this.sortLongPressTimer) clearTimeout(this.sortLongPressTimer);
      },
      openSortModal(idx) {
        uni.vibrateShort();
        this.sortedActions = [...this.chosenActions];
        this.sortedInputs = this.actionInputs.map(i => ({
          ...i
        }));
        this.sortedEntries = this.actionEntries.map(e => [...e]);
        this.sortedDiffs = this.diffs.map(d => d ? {
          ...d
        } : null);
        this.$nextTick(() => {
          this.initSortPositions();
          this.showSortModal = true;
        });
      },
      initSortPositions() {
        const sys = uni.getSystemInfoSync();
        const rh = (sys.windowWidth / 750) * 110;
        this.rowHeight = rh;
        const newItemY = [];
        for (let i = 0; i < this.sortedActions.length; i++) {
          newItemY[i] = Math.round(i * rh);
        }
        this.$set(this, 'itemY', newItemY);
      },
      onSortDragTrigger(idx) {
        this.isDragTriggered = true;
        this.hasSwapped = false;
        this.dragIdx = idx;
        this.isDragMode = true;
        this.lastTargetIdx = -1;
        uni.vibrateShort();
      },
      onSortDragMove(e, idx) {
        if (!this.isDragMode || this.dragIdx !== idx) return;

        const currentY = e.detail.y;
        const baseY = idx * this.rowHeight;
        const offsetY = currentY - baseY;

        const shouldSwapDown = offsetY > this.rowHeight * 0.5 && idx < this.sortedActions.length - 1;
        const shouldSwapUp = offsetY < -this.rowHeight * 0.5 && idx > 0;

        if (shouldSwapDown || shouldSwapUp) {
          const targetIdx = shouldSwapDown ? idx + 1 : idx - 1;

          if (targetIdx === this.lastTargetIdx) return;
          this.lastTargetIdx = targetIdx;
          this.hasSwapped = true;

          const list = [...this.sortedActions];
          [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
          this.sortedActions = list;

          this.dragIdx = targetIdx;

          this.smoothSortPositions();
          uni.vibrateShort();
        } else {
          const minY = 0;
          const maxY = (this.sortedActions.length - 1) * this.rowHeight;
          const clampedY = Math.max(minY, Math.min(currentY, maxY));
          this.$set(this.itemY, idx, clampedY);
        }
      },
      smoothSortPositions() {
        for (let i = 0; i < this.sortedActions.length; i++) {
          this.$set(this.itemY, i, i * this.rowHeight);
        }
        this.fixSortPositionGaps();
      },
      fixSortPositionGaps() {
        for (let i = 0; i < this.sortedActions.length; i++) {
          const expectedY = i * this.rowHeight;
          const currentY = this.itemY[i];
          if (Math.abs(currentY - expectedY) > 2) {
            this.$set(this.itemY, i, expectedY);
          }
        }
      },
      onSortDragEnd() {
        if (!this.isDragTriggered) return;

        this.isDragMode = false;
        this.dragIdx = -1;
        this.lastTargetIdx = -1;

        if (this.isDragTriggered) {
          this.initSortPositions();
        }

        this.isDragTriggered = false;
        this.hasSwapped = false;
      },
      saveSort() {
        const newOrder = this.sortedActions.map(name =>
          this.chosenActions.indexOf(name)
        );
        if (newOrder.some(i => i === -1)) {
          uni.showToast({
            title: '排序出错，请重试',
            icon: 'none'
          });
          return;
        }
        this.chosenActions = [...this.sortedActions];
        this.actionInputs = newOrder.map(i => ({
          ...this.actionInputs[i]
        }));
        this.actionEntries = newOrder.map(i => [...this.actionEntries[i]]);
        this.diffs = newOrder.map(i => this.diffs[i] ? {
          ...this.diffs[i]
        } : null);
        this.persistOrder();
        this.showSortModal = false;
        uni.showToast({
          title: '排序已保存',
          icon: 'success',
          duration: 1000
        });
      },
      cancelSort() {
        this.showSortModal = false;
        this.isDragMode = false;
        this.dragIdx = -1;
      }
    },
    onShow() {
      if (!this.showChooseTpl) this.loadDayData();
      if (this.showTimerPopup && this.endTimestamp) this.updateRemaining();
    },
    onUnload() {
      this.clearAllTimers();
    }
  };
</script>

<style scoped>
  /* ========== 整体容器 & 深色模式 ========== */
  .container {
    position: relative;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .container.light {
    background-color: #f5f5f5;
    color: #333333;
  }

  .container.dark {
    background-color: #121212;
    color: #f7f7f7;
  }

  /* ========== 动作列表 ========== */
  .action-list {
    flex: 1;
    height: 0;
    width: calc(100% - 40px);
    margin: 0 20px;
  }

  /* ========== 侧滑删除相关样式 ========== */
  .slide-wrapper {
    position: relative;
    width: 100%;
    overflow: visible;
    margin-bottom: 10px;
  }

  .delete-btn-container {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
  }

  .delete-btn {
    width: 120rpx;
    height: calc(100% - 10rpx);
    background-color: #ff5a5d;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 28rpx;
    z-index: 1;
  }

  .action-card-content {
    position: relative;
    z-index: 2;
    background-color: #fff;
    border-radius: 15px;
    padding: 5px;
    transition: transform 0.2s ease;
  }

  .container.dark .action-card-content {
    background-color: #242424;
    border: 1rpx solid #333;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
  }

  .list-bottom-space {
    width: 100%;
    height: 65px;
    background: transparent;
    pointer-events: none;
  }

  .row-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tag-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tag {
    background-color: #fff;
    padding: 6px 12px;
    border-radius: 15px;
  }

  .container.dark .tag {
    background-color: #242424;
    border: 1rpx solid #333;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
  }

  .total-weight {
    font-size: 12px;
    color: #999;
    margin-right: 10px;
  }

  .input-pair {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .input-reps,
  .input-weight {
    width: 40px;
    height: 36px;
    padding: 4px 8px;
    border: none;
    border-radius: 6px;
    background-color: #f5f5f5;
  }

  .container.dark .input-reps,
  .container.dark .input-weight {
    background-color: #121212;
  }

  .input-mult {
    font-size: 16px;
    color: #666;
  }

  .action-entries {
    margin-top: 4px;
  }

  .entry-row {
    display: flex;
    align-items: center;
    padding: 2px 0;
  }

  .entry-index {
    max-width: 60px;
    font-size: 12px;
    color: #666;
    margin-left: 10px;
  }

  .container.dark .total-weight,
  .container.dark .entry-index,
  .container.dark .action-diff {
    color: #aaaaaa;
  }

  .container.dark .entry-text {
    color: #f5f5f5;
  }

  .action-diff {
    margin-left: 10px;
    margin-bottom: 5px;
    font-size: 12px;
    color: #999;
    display: flex;
  }

  .diff-positive {
    color: #e53935;
  }

  .diff-negative {
    color: #43a047;
  }

  .diff-up {
    color: #ff4757;
  }

  .diff-down {
    color: #2ed573;
  }

  .diff-neutral {
    color: #757575;
  }

  .confirm-btn {
    height: 36px;
    line-height: 36px;
    background-color: #f5f5f5;
    color: #121212;
    border-radius: 6px;
    font-size: 16px;
    margin-right: 5px;
  }

  .container.dark .confirm-btn {
    background-color: #121212;
    color: #f5f5f5;
  }

  /* ========== 底部按钮行 ========== */
  .save-row {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(10, 10, 10, 0.85) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1rpx solid rgba(255, 255, 255, 0.03);
  }

  .container.dark .save-row {
    background: rgba(18, 18, 18, 0.5) !important;
    border-top: 1rpx solid rgba(255, 255, 255, 0.1);
  }

  .minimal-timer-btn {
    flex: 1;
    height: 48px;
    background: rgba(255, 255, 255, 0.05);
    border: 1rpx solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .mini-icon {
    font-size: 16px;
    color: #379bff;
    margin-right: 8px;
  }

  .mini-text {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 300;
  }

  .minimal-add-btn {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.05);
    border: 1rpx solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-plus {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 200;
  }

  .minimal-timer-btn:active,
  .minimal-add-btn:active {
    transform: scale(0.97);
    background: rgba(255, 255, 255, 0.1);
  }

  .container.light .minimal-timer-btn,
  .container.light .minimal-add-btn {
    background: #fff;
    border: 1rpx solid #e0e0e0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .container.light .mini-text {
    color: #333;
  }

  .container.light .add-plus {
    color: #666;
  }

  /* ========== 通用弹窗样式 ========== */
  .popup-overlay {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
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

  .modal-panel {
    position: relative;
    width: 80vw;
    max-height: 70vh;
    background-color: #f5f5f5;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-top: -44px;
  }

  .container.dark .modal-panel {
    background-color: #1e1e1e;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 72vw;
    height: 1px;
    background-color: #eee;
  }

  .container.dark .modal-header::after {
    background-color: #555;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
    margin-left: 2vw
  }

  .close-icon {
    width: 40px;
    height: 40px;
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

  .modal-footer {
    padding: 10px 16px;
    display: flex;
    justify-content: center;
    position: relative;
  }

  .modal-footer::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 72vw;
    height: 1px;
    background-color: #eee;
  }

  .container.dark .modal-footer::before {
    background-color: #555;
  }

  .modal-footer>button {
    width: 100px;
    height: 36px;
    line-height: 36px;
    background-color: #379bff;
    color: #fff;
    border-radius: 5px;
  }

  .no-data {
    text-align: center;
    margin-top: 20px;
    color: #999;
  }

  .container.dark .no-data {
    color: #bbb;
  }

  /* ========== 选择模板弹窗专属 ========== */
  .tpl-select-list {
    max-height: 40vh;
  }

  .tpl-item {
    background-color: #ccc;
    padding: 10px;
    margin: 6px 0;
    border-radius: 6px;
    text-align: center;
    font-size: 16px;
    color: #fff;
  }

  .btn-aerobic,
  .btn-rest {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e6e6e6;
    font-size: 14px;
  }

  .container.dark .btn-aerobic,
  .container.dark .btn-rest {
    border-color: #555;
  }

  /* ========== 优化版选择动作弹窗专属样式 ========== */
  .action-picker-panel {
    width: 85vw !important;
    max-height: 70vh !important;
    border-radius: 24px !important;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  }

  .action-picker-header {
    padding: 16px 20px 0 !important;
  }

  .action-picker-body {
    padding: 0 20px !important;
    /* 移除左右内边距，搜索栏自己控制 */
    display: flex;
    flex-direction: column;
  }

  /* 融合搜索栏 Container */
  .search-bar-container {
    padding: 15px 0 12px;
    background-color: inherit;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .search-bar-inner {
    display: flex;
    align-items: center;
    height: 48px;
    background: #f0f0f0;
    border-radius: 100px;
    /* 胶囊搜索栏 */
    padding: 0 16px;
    border: 1rpx solid transparent;
    transition: all 0.2s;
  }

  .search-bar-inner:focus-within {
    border-color: rgba(55, 155, 255, 0.5);
    background: #fff;
    box-shadow: 0 0 10rpx rgba(55, 155, 255, 0.2);
  }

  .container.dark .search-bar-inner {
    background: #1a1a1a;
  }

  .container.dark .search-bar-inner:focus-within {
    background: #000;
    border-color: rgba(55, 155, 255, 0.3);
  }

  .search-icon {
    font-size: 16px;
    color: #999;
    margin-right: 10px;
  }

  .search-bar-input {
    flex: 1;
    height: 100%;
    font-size: 15px;
    color: #333;
  }

  .container.dark .search-bar-input {
    color: #fff;
  }

  .clear-icon {
    font-size: 20px;
    color: #999;
    padding: 5px;
  }

  /* 动作网格列表 */
  .action-grid-list {
    flex: 1;
    height: 0;
    /* 允许 scroll-view 占据剩余空间 */
  }

  .action-grid-inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .action-grid-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(50% - 8px);
    margin-bottom: 12px;
    height: 54px;
    background: #fff;
    border-radius: 14px;
    padding: 0 12px;
    border: 1rpx solid #e0e0e0;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  .act-name-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .action-grid-item:active {
    transform: scale(0.96);
    opacity: 0.8;
  }

  .container.dark .action-grid-item {
    background: #2e2e2e;
    border-color: #333;
  }

  .act-name {
    font-size: 14px;
    color: #333;
    text-align: center;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-weight: 500;
  }

  .container.dark .act-name {
    color: #eee;
  }

  /* 选定状态样式 */
  .action-selected {
    background: linear-gradient(135deg, rgba(55, 155, 255, 0.1), rgba(55, 155, 255, 0.2)) !important;
    box-shadow: 0 4px 10rpx rgba(55, 155, 255, 0.1);
    border: 2px solid #379bff !important;
  }

  .container.dark .action-selected {
    background: rgba(55, 155, 255, 0.15) !important;
    border-color: #379bff !important;
  }

  .action-selected .act-name {
    color: #379bff !important;
    font-weight: bold;
  }

  .select-check {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    background: #379bff;
    color: #fff;
    border-radius: 50%;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  /* 优化版无数据提示 */
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
    color: #666;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .no-data-sub {
    font-size: 13px;
    color: #999;
  }

  .container.dark .no-data-text {
    color: #eee;
  }

  .container.dark .no-data-sub {
    color: #aaa;
  }

  /* 确认添加按钮优化 */
  .action-picker-footer {
    padding: 0 20px 12px !important;
  }

  .confirm-add-btn {
    width: 100% !important;
    height: 54px !important;
    line-height: 54px !important;
    background: linear-gradient(135deg, #379bff, #2d82d6) !important;
    border-radius: 16px !important;
    font-size: 16px !important;
    font-weight: bold;
    border: none;
    box-shadow: 0 5px 15px rgba(55, 155, 255, 0.3);
  }

  .confirm-add-btn:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  /* 响应式调整：如果名称都很短，支持两列布局显示更多名称 */
  @media screen and (max-width: 350px) {
    .action-grid-item {
      min-width: calc(50% - 6px);
    }
  }

  /* ========== 计时器弹窗专属 ========== */
  .timer-panel {
    position: relative;
    z-index: 2001;
    width: 320px;
    border-radius: 24px;
    overflow: hidden;
  }

  .container.dark .timer-panel {
    background-color: #1e1e1e;
    border: 1rpx solid #444;
  }

  .timer-full-body {
    background-color: #ffffff;
    padding: 24px 0 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .container.dark .timer-full-body {
    background-color: #1e1e1e;
  }

  .quick-settings {
    display: flex;
    width: 100%;
    padding: 0 20px;
    justify-content: space-between;
    gap: 15px;
    box-sizing: border-box;
  }

  .quick-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    background: rgba(55, 155, 255, 0.1);
    border: 1rpx solid rgba(55, 155, 255, 0.2);
    border-radius: 12px;
  }

  .quick-btn:active {
    transform: scale(0.96);
    background: rgba(55, 155, 255, 0.15);
  }

  .container.dark .quick-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1rpx solid rgba(255, 255, 255, 0.1);
  }

  .quick-label {
    font-size: 15px;
    font-weight: bold;
    color: #379bff;
    line-height: 1.2;
  }

  .quick-time {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }

  .timer-core {
    position: relative;
    margin: 10px 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .time-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #121212;
    font-size: 48px;
  }

  .container.dark .time-text {
    color: #fff;
  }

  .timer-actions {
    display: flex;
    width: 100%;
    padding: 10px 16px 0;
    justify-content: space-between;
    gap: 10px;
    box-sizing: border-box;
  }

  .action-btn {
    flex: 1;
    height: 46px;
    line-height: 46px;
    font-size: 14px;
    border-radius: 12px;
    background: #f0f0f0;
    color: #333;
    border: none;
    transition: all 0.1s ease;
  }

  .container.dark .action-btn {
    background: #2a2a2a;
    color: #eee;
  }

  .action-btn:active {
    transform: scale(0.92);
    background-color: #e0e0e0;
  }

  .container.dark .action-btn:active {
    background-color: #3a3a3a;
  }

  .done-btn {
    background-color: #379bff !important;
    color: #fff !important;
    font-weight: bold;
    box-shadow: 0 4px 10px rgba(55, 155, 255, 0.3);
  }

  .done-btn:active {
    box-shadow: 0 2px 6px rgba(55, 155, 255, 0.5) !important;
    transform: scale(0.92);
  }

  /* ========== 有氧/休息日弹窗专属 ========== */
  .input-row1 {
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 5px;
  }

  .container.dark .input-row1 {
    border-color: #555;
  }

  .rest {
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 5px;
  }

  .container.dark .rest {
    border-color: #555;
  }

  .subtitle {
    margin-top: 12px;
    font-size: 14px;
    color: #666;
  }

  .divider {
    width: 100%;
    height: 1px;
    background-color: #eee;
    margin: 10px 0;
  }

  .container.dark .divider {
    background-color: #555;
  }

  .tag-container {
    flex-wrap: wrap;
    display: flex;
    margin-top: 8px;
    gap: 6px;
  }

  .reason-tag {
    padding: 4px 8px;
    background: #eee;
    border-radius: 4px;
    font-size: 15px;
  }

  .container.dark .reason-tag {
    background: #555;
  }

  /* ========== 优化版修改弹窗专属样式 ========== */
  .edit-panel {
    width: 70vw !important;
    /* 稍微窄一点，显得精致 */
    border-radius: 20px !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .no-border::after,
  .no-border::before {
    display: none !important;
    /* 去掉生硬的分割线 */
  }

  .edit-body {
    padding: 10px 20px 30px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* 组数小标签 */
  .edit-badge {
    background: rgba(55, 155, 255, 0.1);
    padding: 4px 12px;
    border-radius: 100px;
    margin-bottom: 24px;
  }

  .edit-badge text {
    font-size: 13px;
    color: #379bff;
    font-weight: bold;
  }

  /* 输入大行 */
  .edit-main-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }

  .input-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .big-input {
    width: 80px;
    height: 60px;
    background: #f0f0f0;
    border-radius: 12px;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    color: #333;
  }

  .container.dark .big-input {
    background: #1a1a1a;
    color: #fff;
  }

  .unit-label {
    font-size: 12px;
    color: #999;
  }

  .x-mark {
    font-size: 20px;
    color: #666;
    margin-top: -20px;
    /* 对齐数字中心 */
  }

  /* 保存按钮优化 */
  .save-entry-btn {
    width: 100% !important;
    height: 50px !important;
    line-height: 50px !important;
    background: linear-gradient(135deg, #379bff, #2d82d6) !important;
    border-radius: 12px !important;
    font-size: 16px !important;
    font-weight: bold;
    margin-bottom: 10px;
    border: none;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .save-entry-btn:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  /* ========== 全屏排序窗口样式 ========== */
  .sort-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
  }

  .sort-header {
    padding: 30rpx;
    background-color: rgba(30, 30, 30, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
  }

  .sort-hint-icon {
    font-size: 32rpx;
  }

  .sort-hint-text {
    font-size: 26rpx;
    color: #aaaaaa;
  }

  .sort-body {
    flex: 1;
    height: 0;
    background-color: rgba(30, 30, 30, 0.1);
  }

  .sort-movable-area {
    width: 100%;
    position: relative;
  }

  .sort-item-slot {
    position: absolute;
    left: 0;
    right: 0;
    height: 110rpx;
    pointer-events: none;
  }

  .sort-movable-item {
    width: 100%;
    height: 110rpx;
    display: flex;
    align-items: center;
  }

  .sort-movable-item:not(.is-dragging) {
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
  }

  .sort-card {
    width: 100%;
    height: 80rpx;
    margin: 0 20rpx;
    background-color: #242424;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 5rpx rgba(0, 0, 0, 0.3);
  }

  .sort-card-label {
    font-size: 25rpx;
    color: #f7f7f7;
  }

  .is-dragging .sort-card {
    transform: scale(1.05);
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.8);
    border: 1rpx solid #555;
    z-index: 999;
  }

  .is-dragging {
    z-index: 999 !important;
    transition: none !important;
  }

  .sort-footer {
    padding: 30rpx;
    background-color: rgba(30, 30, 30, 0.1);
    display: flex;
    gap: 20rpx;
    justify-content: center;
  }

  .sort-btn-save {
    flex: 1;
    height: 90rpx;
    line-height: 90rpx;
    background-color: #2ed573;
    color: #fff;
    border-radius: 12rpx;
    font-size: 30rpx;
    text-align: center;
  }

  .sort-btn-cancel {
    flex: 1;
    height: 90rpx;
    line-height: 90rpx;
    background-color: #555;
    color: #fff;
    border-radius: 12rpx;
    font-size: 30rpx;
    text-align: center;
  }
</style>