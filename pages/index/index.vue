<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <!-- 顶部：年月 -->
    <view class="calendar-container" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view class="calendar-slide-container" :style="{ transform: `translateX(${slideOffset}px)` }">
        <!-- 当前月 -->
        <CalendarMonth v-show="currentMonthView === 0" :year="curYear" :month="curMonth" :month-days="monthDays"
          :is-sliding="isSliding" :get-template-color="getTemplateColor" :get-total-weight="getTotalWeight"
          :is-aerobic-day="isAerobicDay" :get-template-name="getTemplateName" :get-contrast-color="getContrastColor"
          :get-cell-style="getCellStyle" :train-btn-visible="todayTrainBtnVisible" :is-light-mode="!daySettingsStore.isDarkMode" @date-click="handleDateClick"
          @date-longpress="onDateLongPress" @go-to-year-page="goToYearPage" @open-anniv-popup="$refs.annivSection.openAdd()"
          @toggle-train-btn="onToggleTrainBtn" @open-more-menu="openMoreMenu" />

        <!-- 上个月 -->
        <CalendarMonth v-show="currentMonthView === -1" :year="getPrevMonthYear()" :month="getPrevMonth()"
          :month-days="prevMonthDays" :is-sliding="isSliding" :get-template-color="getTemplateColor"
          :get-total-weight="getTotalWeight" :is-aerobic-day="isAerobicDay" :get-template-name="getTemplateName"
          :get-contrast-color="getContrastColor" :get-cell-style="getCellStyle"
          :train-btn-visible="todayTrainBtnVisible" :is-light-mode="!daySettingsStore.isDarkMode" @date-click="handleDateClick" @date-longpress="onDateLongPress"
          @go-to-year-page="goToYearPage" @open-anniv-popup="$refs.annivSection.openAdd()" @toggle-train-btn="onToggleTrainBtn"
          @open-more-menu="openMoreMenu" />

        <!-- 下个月 -->
        <CalendarMonth v-show="currentMonthView === 1" :year="getNextMonthYear()" :month="getNextMonth()"
          :month-days="nextMonthDays" :is-sliding="isSliding" :get-template-color="getTemplateColor"
          :get-total-weight="getTotalWeight" :is-aerobic-day="isAerobicDay" :get-template-name="getTemplateName"
          :get-contrast-color="getContrastColor" :get-cell-style="getCellStyle"
          :train-btn-visible="todayTrainBtnVisible" :is-light-mode="!daySettingsStore.isDarkMode" @date-click="handleDateClick" @date-longpress="onDateLongPress"
          @go-to-year-page="goToYearPage" @open-anniv-popup="$refs.annivSection.openAdd()" @toggle-train-btn="onToggleTrainBtn"
          @open-more-menu="openMoreMenu" />
      </view>
    </view>


    <!-- 今日训练快捷按钮 -->
    <view v-if="todayTrainBtnVisible" class="today-train-btn" @click="onTodayBtnClick" @longpress="onTodayBtnLongPress">
      <text class="today-train-text">{{ todayBtnText }}</text>
    </view>

    <!-- 分化计划设置弹窗 -->
    <TrainingSplitPlan v-if="showSplitPlan" :templates="templates" :mode="splitPlan.mode"
      :cycle-days="splitPlan.cycleDays" :week-plan="splitPlan.weekPlan"
      @close="onCloseSplitPlan" @save="onSaveSplitPlan" />

    <!-- 底部：重量显示 + 模板/动作 按钮 -->
    <view class="tab-bar-fixed">
      <view class="tab-item" @click="goToTrainingStat">
        <view class="tab-icon">
          <view class="icon-base icon-statistic"></view>
        </view>
        <text class="tab-label">训练统计</text>
      </view>

      <view class="tab-item" @click="goToBackup" @longpress="onExportCSV">
        <view class="tab-icon">
          <view class="icon-base icon-backup"></view>
        </view>
        <text class="tab-label">数据备份</text>
      </view>

      <view class="tab-item" @click="goToTemplateManager">
        <view class="tab-icon">
          <view class="icon-base icon-template"></view>
        </view>
        <text class="tab-label">训练模板</text>
      </view>

      <view class="tab-item" @click="goToActionLibrary">
        <view class="tab-icon">
          <view class="icon-base icon-muscle"></view>
        </view>
        <text class="tab-label">动作库</text>
      </view>

      <view class="tab-item" @click="goToProfile">
        <view class="tab-icon">
          <view class="icon-base icon-profile"></view>
        </view>
        <text class="tab-label">个人中心</text>
      </view>
    </view>

    <!-- 纪念日区域 -->
    <AnniversarySection ref="annivSection" />

    <!-- 更多菜单弹窗 -->
    <MoreMenu :visible="showMoreMenu" :is-dark-mode="daySettingsStore.isDarkMode"
      :train-btn-visible="todayTrainBtnVisible" :liquid-glass-enabled="daySettingsStore.liquidGlassEnabled"
      @close="showMoreMenu = false" @read-guide="showGuidePanel = true"
      @add-anniv="$refs.annivSection.openAdd()" @toggle-train-btn="onToggleTrainBtn"
      @toggle-theme="onToggleTheme" @toggle-liquid-glass="onToggleLiquidGlass" />
    <!-- 阅读说明弹窗 -->
    <GuidePopup :visible="showGuidePanel" @close="showGuidePanel = false" />
    <!-- 有氧详情弹窗 -->
    <DayDetailPopup :visible="showAerobicDetail" type="aerobic" :detail="aerobicDetail"
      @close="showAerobicDetail = false" @color-change="selectAerobicColor" @save-edit="onSaveAerobicEdit" />
    <!-- 休息日详情弹窗 -->
    <DayDetailPopup :visible="showRestDetail" type="rest" :detail="restDetail"
      @close="showRestDetail = false" @color-change="selectRestColor" @save-edit="onSaveRestEdit" />

  </view>
</template>

<script>
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    useTemplateStore
  } from '@/stores/template.js'
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import {
    analyzeTrainingPattern
  } from '@/utils/trainingAnalyzer.js'
  import {
    exportToCSV,
    writeCSVFile
  } from '@/utils/backup.js'
  import CalendarMonth from '@/components/CalendarMonth.vue'
  import TrainingSplitPlan from '@/components/TrainingSplitPlan.vue'
  import AnniversarySection from '@/components/AnniversarySection.vue'
  import DayDetailPopup from '@/components/DayDetailPopup.vue'
  import MoreMenu from '@/components/MoreMenu.vue'
  import GuidePopup from '@/components/GuidePopup.vue'
  import { PRESET_COLORS } from '@/utils/color.js'
  import { formatDate } from '@/utils/theme.js'

  export default {
    components: {
      CalendarMonth,
      TrainingSplitPlan,
      AnniversarySection,
      DayDetailPopup,
      MoreMenu,
      GuidePopup
    },
    data() {
      return {
        curYear: 0,
        curMonth: 0,
        monthDays: [],
        monthKey: 0,
        DAYDATA_PREFIX: 'fitness_daydata_',
        todayTrainBtnVisible: true,

        presetColors: PRESET_COLORS,

        thisWeekTotal: 0,
        lastWeekTotal: 0,
        diffText: '0kg',
        diffClass: 'diff-neutral',

        showMoreMenu: false,
        showGuidePanel: false,

        showAerobicDetail: false,
        aerobicDetail: {
          date: '',
          name: '',
          time: 0,
          color: ''
        },
        showRestDetail: false,
        restDetail: {
          date: '',
          reason: '',
          color: ''
        },
        canSlide: true,
        isAnimating: false,
        slideOffset: 0,
        isSliding: false,
        slideDirection: 0,
        touchStartX: 0,
        touchStartY: 0,
        slideThreshold: 50,
        currentMonthView: 0,
        prevMonthDays: [],
        nextMonthDays: [],
        dayDataCache: {},
        daySettingsStore: null,
        showSplitPlan: false,
      }
    },
    computed: {
      actionNames() {
        return this.actionStore.actionNames
      },
      templates() {
        return this.templateStore.templates
      },
      splitPlan() {
        if (!this.daySettingsStore) return {
          enabled: false,
          cycleDays: []
        }
        return this.daySettingsStore.splitPlan
      },
      todayBtnText() {
        this.dayDataCacheStore.cacheVersion
        const todayStr = this.formatDate(new Date())
        const dayData = this.getDayData(todayStr)
        if (dayData.templates && typeof dayData.templates === 'object') {
          const tplNames = Object.keys(dayData.templates)
          if (tplNames.length > 0) {
            return `今日训练：${tplNames[tplNames.length - 1]}`
          }
        }

        const plan = this.splitPlan
        if (plan && plan.enabled) {
          if (plan.mode === 'week') {
            const dayPlan = this.daySettingsStore.getWeekDayPlan(todayStr)
            if (dayPlan && dayPlan.enabled && dayPlan.template) {
              const weekday = new Date(todayStr.replace(/-/g, '/')).getDay()
              const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
              return `${dayNames[weekday]}：${dayPlan.template}`
            }
            if (dayPlan && !dayPlan.enabled) {
              const weekday = new Date(todayStr.replace(/-/g, '/')).getDay()
              const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
              return `${dayNames[weekday]}：休息`
            }
          } else {
            if (plan.cycleDays && plan.cycleDays.length > 0) {
              const idx = this.daySettingsStore.getCycleIndex(todayStr, this.dayDataCacheStore)
              const dayPlan = plan.cycleDays[idx]
              if (dayPlan && dayPlan.enabled && dayPlan.template) {
                return `第${idx + 1}天：${dayPlan.template}`
              }
              if (dayPlan && !dayPlan.enabled) {
                return `第${idx + 1}天：休息`
              }
            }
          }
        }
        return '开始训练'
      },
      todayHasTemplate() {
        this.dayDataCacheStore.cacheVersion
        const plan = this.splitPlan
        if (plan && plan.enabled) {
          const todayStr = this.formatDate(new Date())
          if (plan.mode === 'week') {
            const dayPlan = this.daySettingsStore.getWeekDayPlan(todayStr)
            if (dayPlan && dayPlan.enabled && dayPlan.template) {
              return true
            }
          } else {
            if (plan.cycleDays && plan.cycleDays.length > 0) {
              const idx = this.daySettingsStore.getCycleIndex(todayStr, this.dayDataCacheStore)
              const dayPlan = plan.cycleDays[idx]
              if (dayPlan && dayPlan.enabled && dayPlan.template) {
                return true
              }
            }
          }
        }
        return false
      },
      isMiniProgram() {
        // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
        return true
        // #endif
        return false
      },
    },
    created() {
      this.actionStore = useActionStore()
      this.actionStore.load()
      this.templateStore = useTemplateStore()
      this.templateStore.load()
      this.dayDataCacheStore = useDayDataCacheStore()
      this.dayDataCacheStore.loadIndex()
      this.daySettingsStore = useDaySettingsStore()
      this.daySettingsStore.load()
      this.todayTrainBtnVisible = this.daySettingsStore.todayTrainBtnVisible
    },
    onShow() {
      const selectedYear = uni.getStorageSync('selectedYear');
      const selectedMonth = uni.getStorageSync('selectedMonth');

      if (selectedYear !== '' && selectedYear !== null && selectedYear !== undefined &&
        selectedMonth !== null && selectedMonth !== undefined) {
        this.curYear = Number(selectedYear);
        this.curMonth = Number(selectedMonth);
        uni.removeStorageSync('selectedYear');
        uni.removeStorageSync('selectedMonth');
      }

      this.actionStore.load()
      this.templateStore.load()
      this.daySettingsStore.load()

      this.resetSlideStateForSwitch();
      this.dayDataCache = {};
      this.currentMonthView = 0;
      this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
      this.prepareAdjacentMonths();

      this.$nextTick(() => {
        this.calcWeeklyTotals();
        this.canSlide = true;
      });
    },
    onLoad(options) {
      const now = new Date()
      this.curYear = (options && options.year) ? Number(options.year) : now.getFullYear()
      this.curMonth = (options && (typeof options.month !== 'undefined')) ? Number(options.month) : now.getMonth()

      this.currentMonthView = 0;
      this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
      this.prepareAdjacentMonths();

      this.$nextTick(() => {
        this.calcWeeklyTotals();
        this.canSlide = true;
      });
    },

    mounted() {
      if (typeof this.curYear === 'undefined' || this.curYear === 0) {
        this.initCalendar()
      }
      this.$nextTick(() => {
        setTimeout(() => {
          this.canSlide = true;
        }, 500);
      });
    },
    methods: {
      selectRestColor(color) {
        this.restDetail.color = color;
        const date = this.restDetail.date;
        const dayData = this.getDayData(date) || {};
        dayData.color = color;
        uni.setStorageSync(this.DAYDATA_PREFIX + date, dayData);
        this.dayDataCache[date] = dayData;
        uni.showToast({ title: '已保存颜色', icon: 'success' });
        this.showRestDetail = false;
        this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
        this.prepareAdjacentMonths();
      },
      onSaveAerobicEdit({ name, time }) {
        const date = this.aerobicDetail.date;
        const oldName = this.aerobicDetail.name;
        const key = this.DAYDATA_PREFIX + date;
        const dayData = this.getDayData(date) || {};

        // 如果名称变了，删除旧的
        if (name !== oldName && dayData.templates) {
          delete dayData.templates[oldName];
        }

        dayData.templates = dayData.templates || {};
        dayData.templates[name] = {
          totalWeight: time,
          actionWeights: {},
          isAerobic: true
        };
        uni.setStorageSync(key, dayData);
        this.dayDataCache[date] = dayData;

        // 保存到模板 store
        this.templateStore.addAerobic(name);

        this.aerobicDetail.name = name;
        this.aerobicDetail.time = time;
        this.showAerobicDetail = false;
        uni.showToast({ title: '已更新', icon: 'success' });
        this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
        this.prepareAdjacentMonths();
      },
      onSaveRestEdit({ reason }) {
        const date = this.restDetail.date;
        const key = this.DAYDATA_PREFIX + date;
        const dayData = this.getDayData(date) || {};

        dayData.isRestDay = true;
        dayData.templates = {
          [reason]: { totalWeight: 0, actionWeights: {} }
        };
        uni.setStorageSync(key, dayData);
        this.dayDataCache[date] = dayData;

        this.restDetail.reason = reason;
        this.showRestDetail = false;
        uni.showToast({ title: '已更新', icon: 'success' });
        this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
        this.prepareAdjacentMonths();
      },
      isRestDay(fullDate) {
        const raw = this.getDayData(fullDate);
        return raw.isRestDay === true;
      },
      getRestReason(fullDate) {
        const raw = this.getDayData(fullDate);
        return raw.restReason || '';
      },
      goToBackup() {
        uni.navigateTo({
          url: '/pages/backup/backup'
        });
      },
      goToTemplateManager() {
        uni.navigateTo({
          url: '/pages/templateManager/templateManager'
        });
      },
      goToYearPage() {
        uni.navigateTo({
          url: `/pages/year/year?year=${this.curYear}&month=${this.curMonth}`,
          fail: (err) => {
            console.error('跳转到年页面失败:', err);
            uni.showToast({
              title: '跳转失败',
              icon: 'none'
            });
          }
        });
      },
      getContrastColor(hex) {
        if (hex && typeof hex === 'object' && 'value' in hex) {
          hex = hex.value;
        }

        let str = String(hex).replace(/^#/, '').trim();

        if (str.length === 3) {
          str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
        }
        const r = parseInt(str.substr(0, 2), 16);
        const g = parseInt(str.substr(2, 2), 16);
        const b = parseInt(str.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
      },
      getTemplateName(fullDate) {
        const dayData = this.getDayData(fullDate);
        if (dayData.templates && typeof dayData.templates === 'object') {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length > 0) {
            return tplNames[tplNames.length - 1];
          }
        }
        return null;
      },
      getTotalWeight(fullDate) {
        const dayData = this.getDayData(fullDate);
        if (
          !dayData.templates ||
          typeof dayData.templates !== 'object' ||
          Object.keys(dayData.templates).length === 0
        ) {
          return 0;
        }
        let sum = 0;
        for (const tplName in dayData.templates) {
          const tplObj = dayData.templates[tplName];
          if (tplObj && typeof tplObj.totalWeight === 'number') {
            sum += tplObj.totalWeight;
          }
        }
        return Math.round(sum * 100) / 100;
      },
      initCalendar() {
        const today = new Date();
        this.curYear = today.getFullYear();
        this.curMonth = today.getMonth();
        this.buildMonthDays(this.curYear, this.curMonth);
      },
      buildMonthDaysData(year, month) {
        const todayStr = this.formatDate(new Date());

        const cachedMonth = this.dayDataCacheStore.getMonthCache(year, month);

        if (cachedMonth) {
          return cachedMonth.days.map(item => ({
            ...item,
            isToday: !item.isEmpty && item.full === todayStr
          }));
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const arr = [];

        const firstWeekday = new Date(year, month, 1).getDay();

        for (let i = 0; i < firstWeekday; i++) {
          arr.push({
            key: `empty-${year}-${month}-${i}`,
            day: '',
            full: '',
            isToday: false,
            isEmpty: true
          });
        }

        for (let d = 1; d <= daysInMonth; d++) {
          const dt = new Date(year, month, d);
          const full = this.formatDate(dt);
          arr.push({
            key: `day-${year}-${month}-${d}`,
            day: d,
            full,
            isToday: full === todayStr,
            isEmpty: false
          });
        }

        const cacheData = {
          days: arr.map(item => ({
            ...item,
            isToday: false
          }))
        };
        this.dayDataCacheStore.setMonthCache(year, month, cacheData);

        return arr;
      },
      buildMonthDays(year, month, callback = null) {
        this.canSlide = false;

        this.monthDays = this.buildMonthDaysData(year, month);

        setTimeout(() => {
          this.calcWeeklyTotals();
          if (callback) callback();
        }, 30);
      },
      prepareAdjacentMonths() {
        let prevY = this.curYear,
          prevM = this.curMonth - 1;
        if (prevM < 0) {
          prevY -= 1;
          prevM = 11;
        }

        let nextY = this.curYear,
          nextM = this.curMonth + 1;
        if (nextM > 11) {
          nextY += 1;
          nextM = 0;
        }

        this.prevMonthDays = this.buildMonthDaysData(prevY, prevM);
        this.nextMonthDays = this.buildMonthDaysData(nextY, nextM);
      },
      getPrevMonthYear() {
        let y = this.curYear,
          m = this.curMonth - 1;
        if (m < 0) {
          y -= 1;
          m = 11;
        }
        return y;
      },
      getPrevMonth() {
        let m = this.curMonth - 1;
        if (m < 0) m = 11;
        return m;
      },
      getNextMonthYear() {
        let y = this.curYear,
          m = this.curMonth + 1;
        if (m > 11) {
          y += 1;
          m = 0;
        }
        return y;
      },
      getNextMonth() {
        let m = this.curMonth + 1;
        if (m > 11) m = 0;
        return m;
      },
      formatDate,
      onTouchStart(e) {
        if (!this.canSlide || this.isAnimating) return;

        this.touchStartX = e.changedTouches[0].clientX;
        this.touchStartY = e.changedTouches[0].clientY;
        this.slideOffset = 0;
        this.isSliding = false;
      },

      onTouchEnd(e) {
        if (!this.canSlide || this.isAnimating) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - this.touchStartX;
        const dy = endY - this.touchStartY;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
          this.handleSwipe(dx);
        }
      },

      handleSwipe(dx) {
        if (this.isAnimating) return;

        const direction = dx > 0 ? 1 : -1;
        this.startSlideAnimation(direction);

        setTimeout(() => {
          if (direction > 0) {
            this.switchToPrevMonth();
          } else {
            this.switchToNextMonth();
          }
        }, 50);
      },

      startSlideAnimation(direction) {
        this.isAnimating = true;
        this.isSliding = true;
        this.slideDirection = direction;
        this.slideOffset = direction > 0 ? 40 : -40;
        this.currentMonthView = direction > 0 ? -1 : 1;
      },

      switchToPrevMonth() {
        let y = this.curYear,
          m = this.curMonth - 1;
        if (m < 0) {
          y -= 1;
          m = 11;
        }
        this.switchMonth(y, m);
      },

      switchToNextMonth() {
        let y = this.curYear,
          m = this.curMonth + 1;
        if (m > 11) {
          y += 1;
          m = 0;
        }
        this.switchMonth(y, m);
      },

      switchMonth(year, month) {
        this.resetSlideStateForSwitch();
        this.dayDataCache = {};

        this.curYear = year;
        this.curMonth = month;
        this.currentMonthView = 0;

        this.monthDays = this.buildMonthDaysData(year, month);

        let prevY = year,
          prevM = month - 1;
        if (prevM < 0) {
          prevY -= 1;
          prevM = 11;
        }
        let nextY = year,
          nextM = month + 1;
        if (nextM > 11) {
          nextY += 1;
          nextM = 0;
        }

        this.prevMonthDays = this.buildMonthDaysData(prevY, prevM);
        this.nextMonthDays = this.buildMonthDaysData(nextY, nextM);

        this.$nextTick(() => {
          this.calcWeeklyTotals();
          this.canSlide = true;
        });
      },

      resetSlideStateForSwitch() {
        this.slideOffset = 0;
        this.isSliding = false;
        this.slideDirection = 0;
        this.isAnimating = false;
      },

      resetSlideState() {
        this.slideOffset = 0;
        this.isSliding = false;
        this.slideDirection = 0;
        this.isAnimating = false;
        this.canSlide = false;
      },

      prevMonth() {
        if (this.isAnimating && this.slideDirection !== 1) return;

        let y = this.curYear,
          m = this.curMonth - 1;
        if (m < 0) {
          y -= 1;
          m = 11;
        }

        this.curYear = y;
        this.curMonth = m;
        this.monthKey += 1;

        this.buildMonthDays(y, m, () => {
          setTimeout(() => {
            this.slideOffset = 0;
            this.isSliding = false;
            this.slideDirection = 0;
            this.isAnimating = false;
          }, 300);
        });
      },

      nextMonth() {
        if (this.isAnimating && this.slideDirection !== -1) return;

        let y = this.curYear,
          m = this.curMonth + 1;
        if (m > 11) {
          y += 1;
          m = 0;
        }

        this.curYear = y;
        this.curMonth = m;
        this.monthKey += 1;

        this.buildMonthDays(y, m, () => {
          setTimeout(() => {
            this.slideOffset = 0;
            this.isSliding = false;
            this.slideDirection = 0;
            this.isAnimating = false;
          }, 300);
        });
      },
      handleDateClick(full) {
        const dayData = this.getDayData(full);
        if (dayData.isRestDay) {
          const reason = Object.keys(dayData.templates || {})[0] || '未填写理由';
          const color = dayData.color || '';
          this.restDetail = {
            date: full,
            reason,
            color
          };
          this.showRestDetail = true;
          return;
        }
        const tplNames = dayData.templates ? Object.keys(dayData.templates) : [];

        if (tplNames.length === 1) {
          const tpl = dayData.templates[tplNames[0]];
          const isAerobic = tpl && tpl.totalWeight > 0 &&
            (!tpl.actionWeights || Object.keys(tpl.actionWeights).length === 0);
          if (isAerobic) {
            this.aerobicDetail.date = full;
            this.aerobicDetail.name = tplNames[0];
            this.aerobicDetail.time = tpl.totalWeight;
            this.showAerobicDetail = true;
            return;
          }
        }
        uni.navigateTo({
          url: `/pages/index/day?date=${full}`
        });
      },
      onDateLongPress(full) {
        uni.vibrateShort({
          type: 'light'
        });
        uni.showModal({
          title: '提示',
          content: `是否清空 ${full} 的所有记录？`,
          success: (res) => {
            if (res.confirm) {
              uni.removeStorageSync(this.DAYDATA_PREFIX + full);
              this.dayDataCache[full] = {};
              this.dayDataCacheStore.saveDayData(full, {});
              this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
              this.prepareAdjacentMonths();
              uni.showToast({
                title: '已清空',
                icon: 'none'
              });
              this.calcWeeklyTotals();
              this.canSlide = true;
            }
          }
        });
      },
      hasDataForDate(full) {
        const data = this.getDayData(full);
        return Object.keys(data).length > 0;
      },

      getWeekRange(date) {
        const day = date.getDay();
        const offsetToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(date);
        monday.setDate(date.getDate() + offsetToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return [this.formatDate(monday), this.formatDate(sunday)];
      },
      calcTotalInRange(start, end, forceRefresh = false) {
        const s = new Date(start.replace(/\./g, '/').replace(/-/g, '/'));
        const e = new Date(end.replace(/\./g, '/').replace(/-/g, '/'));
        const year = s.getFullYear();
        const weekNumber = this.getWeekNumberForRange(s, e);

        if (!forceRefresh) {
          const cached = this.dayDataCacheStore.getWeekStats(year, weekNumber);
          if (cached !== null) {
            return cached;
          }
        }

        let sum = 0;

        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          const full = this.formatDate(d);
          const dayData = this.dayDataCacheStore.getDayData(full);
          const templates = dayData.templates || {};

          for (const tplName in templates) {
            const tpl = templates[tplName];
            const noActions = tpl.actionWeights && Object.keys(tpl.actionWeights).length === 0;
            if (tpl.isAerobic || noActions) continue;

            if (typeof tpl.totalWeight === 'number') {
              sum += tpl.totalWeight;
            }
          }
        }

        this.dayDataCacheStore.setWeekStats(year, weekNumber, sum);
        return sum;
      },

      getWeekNumberForRange(start, end) {
        const d = new Date(start);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      },

      calcWeeklyTotals() {
        const today = new Date();
        const [thisMon, thisSun] = this.getWeekRange(today);
        this.thisWeekTotal = this.calcTotalInRange(thisMon, thisSun);
        const monDate = new Date(thisMon);
        const lastMon = new Date(monDate);
        lastMon.setDate(monDate.getDate() - 7);
        const lastMonStr = this.formatDate(lastMon);
        const lastSun = new Date(lastMon);
        lastSun.setDate(lastMon.getDate() + 6);
        const lastSunStr = this.formatDate(lastSun);
        this.lastWeekTotal = this.calcTotalInRange(lastMonStr, lastSunStr);
        const diff = this.thisWeekTotal - this.lastWeekTotal;
        if (diff > 0) {
          this.diffText = `+${diff}kg`;
          this.diffClass = 'diff-positive';
        } else if (diff < 0) {
          this.diffText = `${diff}kg`;
          this.diffClass = 'diff-negative';
        } else {
          this.diffText = '0kg';
          this.diffClass = 'diff-neutral';
        }
      },

      goToActionLibrary() {
        uni.navigateTo({
          url: '/pages/actionLibrary/actionLibrary'
        })
      },
      goToTrainingStat() {
        uni.navigateTo({
          url: '/pages/trainingStat/trainingStat'
        })
      },
      goToProfile() {
        uni.navigateTo({
          url: '/pages/profile/profile'
        })
      },

      getDayData(fullDate) {
        if (!fullDate) return {};
        if (this.dayDataCache[fullDate]) {
          return this.dayDataCache[fullDate];
        }
        const data = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
        this.dayDataCache[fullDate] = data;
        return data;
      },
      getTemplateColor(fullDate) {
        const dayData = this.getDayData(fullDate);

        if (dayData.isRestDay && dayData.color) {
          return dayData.color;
        }

        if (dayData.color) {
          return dayData.color;
        }

        if (dayData.templates) {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length) {
            const lastTplName = tplNames[tplNames.length - 1];
            const tplData = dayData.templates[lastTplName];

            if (tplData && tplData.color) {
              return tplData.color;
            }

            const globalTpl = this.templates.find(t => t.name === lastTplName);
            if (globalTpl && globalTpl.color) {
              return globalTpl.color;
            }
          }
        }

        if (dayData.templates && Object.keys(dayData.templates).length > 0) {
          return this.presetColors[0]?.value || '#93d5dc';
        }

        return '';
      },
      getCellStyle(fullDate) {
        const todayStr = this.formatDate(new Date());
        const templateColor = fullDate ? this.getTemplateColor(fullDate) : '';

        if (fullDate === todayStr && templateColor) {
          return {
            backgroundColor: templateColor,
            boxShadow: 'inset 0 0 10px 5px #287eff'
          };
        }

        if (fullDate === todayStr) {
          return {
            backgroundColor: '#287eff'
          };
        }

        if (templateColor) {
          return {
            backgroundColor: templateColor
          };
        }

        return {};
      },
      openAerobicDetail() {
        const raw = uni.getStorageSync(this.DAYDATA_PREFIX + this.date) || {};
        const tplNames = Object.keys(raw.templates || {});
        if (tplNames.length === 1 && Object.keys(raw.templates[tplNames[0]].actionWeights).length === 0) {
          this.aerobicDetail.name = tplNames[0];
          this.aerobicDetail.time = raw.templates[tplNames[0]].totalWeight;
          this.showAerobicDetail = true;
        }
      },
      selectAerobicColor(color) {
        const key = this.DAYDATA_PREFIX + this.aerobicDetail.date;
        const dayData = this.getDayData(this.aerobicDetail.date) || {};
        const tpl = dayData.templates[this.aerobicDetail.name] || {};
        tpl.color = color;
        dayData.templates[this.aerobicDetail.name] = tpl;
        uni.setStorageSync(key, dayData);
        this.dayDataCache[this.aerobicDetail.date] = dayData;
        this.aerobicDetail.color = color;
        this.showAerobicDetail = false;
        uni.showToast({ title: '已保存颜色', icon: 'success' });
        this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
        this.prepareAdjacentMonths();
      },
      isAerobicDay(fullDate) {
        const dayData = this.getDayData(fullDate);
        const templates = dayData.templates || {};
        const names = Object.keys(templates);
        if (names.length !== 1) return false;
        const tpl = templates[names[0]];
        const noActions = tpl.actionWeights && Object.keys(tpl.actionWeights).length === 0;
        return tpl.isAerobic === true || noActions;
      },

      /* ========== 今日训练快捷按钮 ========== */
      onTodayBtnClick() {
        const now = new Date()
        const todayStr = this.formatDate(now)
        const dayData = this.getDayData(todayStr)

        if (dayData.templates && typeof dayData.templates === 'object' && Object.keys(dayData.templates).length > 0) {
          uni.navigateTo({
            url: `/pages/index/day?date=${todayStr}`
          })
          return
        }

        const plan = this.splitPlan
        if (plan && plan.enabled) {
          if (plan.mode === 'week') {
            const dayPlan = this.daySettingsStore.getWeekDayPlan(todayStr)
            if (dayPlan && dayPlan.enabled && dayPlan.template) {
              uni.navigateTo({
                url: `/pages/index/day?date=${todayStr}&tpl=${encodeURIComponent(dayPlan.template)}`
              })
              return
            }
            if (dayPlan && !dayPlan.enabled) {
              uni.showToast({
                title: '今天是休息日',
                icon: 'none'
              })
              return
            }
          } else {
            if (plan.cycleDays && plan.cycleDays.length > 0) {
              const idx = this.daySettingsStore.getCycleIndex(todayStr, this.dayDataCacheStore)
              const dayPlan = plan.cycleDays[idx]
              if (dayPlan && dayPlan.enabled && dayPlan.template) {
                this.daySettingsStore.advanceCycleOffset(todayStr)
                uni.navigateTo({
                  url: `/pages/index/day?date=${todayStr}&tpl=${encodeURIComponent(dayPlan.template)}`
                })
                return
              }
              if (dayPlan && !dayPlan.enabled) {
                this.daySettingsStore.advanceCycleOffset(todayStr)
                uni.showToast({
                  title: '今天是休息日',
                  icon: 'none'
                })
                return
              }
            }
          }
        }

        uni.navigateTo({
          url: `/pages/index/day?date=${todayStr}`
        })
      },
      onTodayBtnLongPress() {
        uni.vibrateShort({
          type: 'light'
        })
        this.showSplitPlan = true
      },
      onCloseSplitPlan() {
        this.showSplitPlan = false
      },
      onSaveSplitPlan(planData) {
        this.daySettingsStore.splitPlan.enabled = true
        this.daySettingsStore.saveSplitPlan(planData)
        this.showSplitPlan = false
        uni.showToast({
          title: '分化计划已保存',
          icon: 'success'
        })
      },
      onToggleTrainBtn() {
        this.daySettingsStore.toggleTodayTrainBtn()
        this.todayTrainBtnVisible = this.daySettingsStore.todayTrainBtnVisible
        uni.showToast({
          title: this.todayTrainBtnVisible ? '已显示快捷训练按钮' : '已隐藏快捷训练按钮',
          icon: 'none'
        })
      },
      openMoreMenu() {
        this.showMoreMenu = true
      },
      onToggleTheme() {
        this.daySettingsStore.toggleTheme()
        this.showMoreMenu = false
        uni.showToast({
          title: this.daySettingsStore.isDarkMode ? '已切换为深色模式' : '已切换为浅色模式',
          icon: 'none'
        })
        uni.$emit('themeChanged', this.daySettingsStore.isDarkMode ? 'dark' : 'light')
      },
      onToggleLiquidGlass() {
        this.daySettingsStore.toggleLiquidGlass()
        this.showMoreMenu = false
        uni.showToast({
          title: this.daySettingsStore.liquidGlassEnabled ? '已开启液态玻璃' : '已关闭液态玻璃',
          icon: 'none'
        })
        uni.$emit('liquidGlassChanged', this.daySettingsStore.liquidGlassEnabled)
      },

      /* ========== 智能推荐 ========== */
      refreshRecommendation() {
        // 推荐功能已移除
      },

      /* ========== CSV 导出 ========== */
      onExportCSV() {
        if (this.isMiniProgram) {
          return
        }
        uni.vibrateShort({
          type: 'light'
        })
        uni.showModal({
          title: '导出训练记录',
          content: '将导出最近90天的训练记录为CSV文件，可在Excel中打开。',
          success: (res) => {
            if (res.confirm) {
              this.doExportCSV()
            }
          }
        })
      },
      async doExportCSV() {
        if (this.isMiniProgram) {
          return
        }
        uni.showLoading({
          title: '导出中...'
        })
        try {
          const dates = this.dayDataCacheStore.getDates()
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - 90)
          const cutoffStr = this.formatDate(cutoff)
          const recentDates = dates.filter(d => d >= cutoffStr)

          if (recentDates.length === 0) {
            uni.hideLoading()
            uni.showToast({
              title: '暂无训练数据',
              icon: 'none'
            })
            return
          }

          const csvContent = exportToCSV(recentDates, this.dayDataCacheStore)
          await writeCSVFile(csvContent)
          uni.hideLoading()
          uni.showToast({
            title: '导出成功',
            icon: 'success'
          })
        } catch (e) {
          uni.hideLoading()
          console.error('CSV导出失败:', e)
          uni.showToast({
            title: '导出失败: ' + (e.message || ''),
            icon: 'none'
          })
        }
      },
    },
  };
</script>

<style scoped>
  .container {
    min-height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .container.light {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.dark {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .calendar-container {
    width: 100vw;
    border-radius: 0 0 15px 15px;
    background-color: var(--bg-primary);
  }

  .today-train-btn {
    margin: 10px 16px 6px;
    padding: 14px 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, #379bff, #2d82d6);
    box-shadow: 0 4px 16px rgba(55, 155, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .today-train-btn:active {
    transform: scale(0.97);
    opacity: 0.9;
  }

  .today-train-text {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
  }

  .calendar-slide-container {
    transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform;
  }

  .calendar-month {
    transition: all 0.3s ease;
  }

  .calendar-month.sliding {
    opacity: 0.7;
  }

  .calendar-grid {
    display: flex;
    flex-wrap: wrap;
  }

  .calendar-cell {
    width: calc(100% / 7 - 4px);
    margin: 2px;
    margin-bottom: 5px;
    aspect-ratio: 1;
    border-radius: 20rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 60px;
  }

  .cell-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .cell-text {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: bold;
  }

  .template-name {
    font-size: 9px;
    margin: 0 4px;
  }

  .calendar-cell.today {
    background-color: #379bff;
  }

  .calendar-cell.today .cell-text {
    color: #fff;
  }

  .weekday {
    width: calc(100% / 7);
    text-align: center;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .tab-bar-fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    min-height: 75px;
    height: calc(75px + env(safe-area-inset-bottom, 0px));
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(25px);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    box-sizing: border-box;
    z-index: 999;
  }

  .container.dark .tab-bar-fixed {
    background: rgba(20, 20, 20, 0.8);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
  }

  .icon-base {
    width: 25px;
    height: 25px;
    display: inline-block;
    vertical-align: middle;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    background-color: var(--text-primary);
  }

  .icon-muscle {
    -webkit-mask-image: url('/static/muscle.svg');
    mask-image: url('/static/muscle.svg');
  }

  .icon-template {
    -webkit-mask-image: url('/static/template.svg');
    mask-image: url('/static/template.svg');
  }

  .icon-backup {
    -webkit-mask-image: url('/static/backup.svg');
    mask-image: url('/static/backup.svg');
  }

  .icon-statistic {
    -webkit-mask-image: url('/static/statistic.svg');
    mask-image: url('/static/statistic.svg');
  }

  .icon-profile {
    -webkit-mask-image: url('/static/profile.svg');
    mask-image: url('/static/profile.svg');
  }

  .icon-moon {
    -webkit-mask-image: url('/static/moon.svg');
    mask-image: url('/static/moon.svg');
  }

  .icon-sun {
    -webkit-mask-image: url('/static/ty.svg');
    mask-image: url('/static/ty.svg');
  }

  .tab-label {
    margin-top: 5px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .tab-item:active .tab-icon {
    transform: scale(0.9);
  }

  .fade-in {
    animation: modalFadeIn 0.25s ease;
  }

  .popup-overlay {
    width: 100vw;
    height: 100vh;
    pointer-events: auto;
    align-items: center;
  }

  .overlay-bg {
    background-color: rgba(0, 0, 0, 0.7) !important;
  }

  .popup-panel {
    position: relative;
    width: 85vw;
    max-width: 320px;
    background-color: var(--bg-secondary);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .container.dark .popup-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
  }

  .panel-title {
    font-size: 18px;
    font-weight: 600;
    color: inherit;
  }

  .close-btn {
    font-size: 20px;
    color: var(--text-muted);
  }

  .panel-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
  }

  .container.dark .panel-header {
    border-bottom: 1px solid var(--border-color);
  }

  .panel-body {
    padding: 12px;
    display: flex !important;
    flex-direction: column;
    min-height: 200px;
  }

  .btn-add {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
    padding: 0 16px;
    height: 40px;
    border-radius: 8px;
    line-height: 40px;
    font-size: 14px;
    font-weight: bold;
    transition: opacity 0.2s;
    margin-left: 5px;
  }

  .btn-add:active {
    opacity: 0.8;
  }

  .template-tag-scroll {
    flex: 1;
    min-height: 0;
    background-color: transparent;
  }

  .template-tag-container {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }

  .template-tag {
    position: relative;
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border-radius: 10px;
    min-height: 44px;
    padding: 8px 44px;
    margin: 0 12px 6px 12px;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .tag-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: 4px 0;
  }

  .move-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 32px;
    border: none;
    background: transparent !important;
    font-size: 16px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .move-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .move-btn.left {
    left: 4px;
  }

  .move-btn.right {
    right: 4px;
  }

  .move-btn:disabled {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .container.dark .move-btn:active {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .no-data {
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
    padding: 20px;
    margin: 20px 12px;
    background-color: var(--bg-tertiary);
    border-radius: 10px;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
  }

  .action-input {
    flex: 1;
    height: 38px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 14px;
  }

  .container.dark .action-input {
    background-color: #262626;
    color: var(--text-primary);
  }

  .template-tag-scroll ::-webkit-scrollbar {
    width: 4px;
  }

  .template-tag-scroll ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  .template-tag-scroll ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  .container.dark .template-tag-scroll ::-webkit-scrollbar-track {
    background: #3a3a3a;
  }

  .container.dark .template-tag-scroll ::-webkit-scrollbar-thumb {
    background: #666;
  }

  .color-picker-row {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }

  .container.dark .color-picker-row {
    border-top: 1px solid #444;
  }

  .color-picker-row>text {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 12px;
    display: block;
  }

  .color-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 15px;
    justify-items: center;
    padding: 5px 0;
  }

  .btn-row {
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  .panel-footer.btn-row {
    padding: 15px;
    display: flex;
    gap: 15px;
    background-color: transparent;
  }

  .btn-return,
  .btn-confirm {
    flex: 1;
    height: 44px;
    line-height: 44px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    margin: 0;
  }

  .modal-footer .btn-confirm {
    margin-top: -15px;
  }

  .btn-return {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .btn-confirm {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-confirm:active {
    transform: scale(0.95);
    opacity: 0.9;
  }

  .modal-panel {
    width: 80vw;
    max-width: 320px;
    border-radius: 10px;
    z-index: 1001;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-title {
    font-weight: bold;
  }

  .modal-body {
    padding: 12px;
  }

  .modal-footer {
    padding: 10px;
  }

  .weight-text {
    font-size: 10px;
    margin-bottom: -4px;
    text-align: center;
    width: 100%;
  }

  .custom-switch {
    margin-top: 15px;
    width: 60px;
    height: 30px;
    position: relative;
    display: inline-block;
    margin-bottom: 15px;
  }

  .switch-track {
    width: 100%;
    height: 100%;
    background-color: var(--bg-tertiary);
    border-radius: 15px;
    transition: background-color 0.3s;
    z-index: 1;
  }

  .track-checked {
    background-color: #121212;
  }

  .switch-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 26px;
    height: 26px;
    background-color: transparent;
    border-radius: 50%;
    transition: left 0.3s ease;
    z-index: 2;
  }

  .thumb-checked {
    left: 32px;
  }

  .emoji-thumb {
    display: block;
    width: 100%;
    height: 100%;
    font-size: 22px;
    line-height: 22px;
    text-align: center;
    transition: transform 0.3s ease;
  }

  .thumb-rotated {
    transform: rotate(360deg);
  }

  .container.dark .emoji-thumb {
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }

  .emoji-switch {
    margin-top: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  .emoji-icon {
    display: inline-block;
    font-size: 24px;
  }

  @keyframes jumpRotate {
    0% {
      transform: translateY(0) rotate(0deg);
    }

    25% {
      transform: translateY(-8px) rotate(90deg);
    }

    50% {
      transform: translateY(-14px) rotate(180deg);
    }

    75% {
      transform: translateY(-8px) rotate(270deg);
    }

    100% {
      transform: translateY(0) rotate(360deg);
    }
  }

  .animate-emoji {
    animation: jumpRotate 0.3s linear forwards;
  }

  .action-select-list {
    display: grid !important;
    grid-template-columns: repeat(1, 1fr) !important;
    grid-gap: 10px !important;
    width: 100% !important;
    padding: 10px 4px !important;
    box-sizing: border-box !important;
  }

  .checkbox-row {
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    background-color: var(--bg-secondary);
    padding: 10px 8px !important;
    border-radius: 10px;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  .action-select-list ::v-deep .uni-scroll-view-content {
    width: 100% !important;
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    grid-gap: 10px !important;
  }

  .container.dark .checkbox-row {
    color: var(--text-primary);
  }

  .checkbox-row:active {
    background-color: #444444;
    transform: scale(0.97);
  }

  .checkbox-icon {
    flex-shrink: 0 !important;
    font-size: 14px;
  }

  .checkbox-label {
    flex: 1 !important;
    font-size: 13px !important;
    color: #efefef;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    margin-left: 6px !important;
  }

  .checkbox-input {
    margin-right: 0px;
  }

</style>

<!-- 非 scoped 样式块，覆盖 scoped 无法生效的伪元素选择器 -->
<style>
  page::-webkit-scrollbar,
  uni-page-wrapper::-webkit-scrollbar,
  uni-page-body::-webkit-scrollbar,
  .container::-webkit-scrollbar {
    display: none;
    width: 0;
    background: transparent;
  }
  page,
  uni-page-wrapper,
  uni-page-body,
  .container {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
</style>
