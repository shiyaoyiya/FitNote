<template>
  <view class="container dark">
    <!-- 顶部：年月 -->
    <view class="calendar-container" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view class="calendar-slide-container" :style="{ transform: `translateX(${slideOffset}px)` }">
        <view class="calendar-month" :class="{ sliding: isSliding }" v-show="currentMonthView === 0">
          <view class="calendar-header">
            <text class="month-title" @click="goToYearPage">{{ curYear }}/{{ curMonth + 1 }}</text>
            <view class="icon-add-wrap" @click="openAnnivPopup(null)">
              <text class="icon-plus">＋</text>
            </view>
          </view>
          <view class="weekday-row">
            <text class="weekday">日</text>
            <text class="weekday">一</text>
            <text class="weekday">二</text>
            <text class="weekday">三</text>
            <text class="weekday">四</text>
            <text class="weekday">五</text>
            <text class="weekday">六</text>
          </view>

          <!-- ===== 修改后的“日网格”部分 ===== -->
          <view class="calendar-grid">
            <view v-for="date in monthDays" :key="date.key" class="calendar-cell" :class="{
              today: date.isToday && !getTemplateColor(date.full),           /* 如果今天且无模板，用“today”类 */
              'today-has-template': date.isToday && getTemplateColor(date.full) /* 今天有模板时用另一类 */
            }" :style="getCellStyle(date.full)" @click="!date.isEmpty && handleDateClick(date.full)"
              @longpress="!date.isEmpty && onDateLongPress(date.full)">
              <view class="cell-content">
                <!-- 如果是空位，什么都不渲染 -->
                <template v-if="date.isEmpty">
                  <!-- 占位空格 -->
                </template>

                <!-- 非空格、有模板时优先显示模板背景与边框 -->
                <template v-else-if="getTemplateColor(date.full)">
                  <!-- 横向累计重量 -->
                  <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
                    :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
                  </text>

                  <!-- 日期数字 -->
                  <text class="cell-text" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ date.day }}
                  </text>
                  <!-- 模板名 -->
                  <text class="template-name" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTemplateName(date.full) }}
                  </text>
                </template>

                <!-- 非空格、无模板时正常渲染 -->
                <template v-else>
                  <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
                    :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
                  </text>

                  <text class="cell-text">{{ date.day }}</text>
                  <text v-if="getTemplateName(date.full)" class="template-name">
                    {{ getTemplateName(date.full) }}
                  </text>
                </template>
              </view>
            </view>
          </view>
        </view>

        <view class="calendar-month" :class="{ sliding: isSliding }" v-show="currentMonthView === -1">
          <view class="calendar-header">
            <text class="month-title" @click="goToYearPage">{{ getPrevMonthYear() }}/{{ getPrevMonth() + 1 }}</text>
            <view class="icon-add-wrap" @click="openAnnivPopup(null)">
              <text class="icon-plus">＋</text>
            </view>
          </view>
          <view class="weekday-row">
            <text class="weekday">日</text>
            <text class="weekday">一</text>
            <text class="weekday">二</text>
            <text class="weekday">三</text>
            <text class="weekday">四</text>
            <text class="weekday">五</text>
            <text class="weekday">六</text>
          </view>
          <view class="calendar-grid">
            <view v-for="date in prevMonthDays" :key="date.key" class="calendar-cell" :class="{
              today: date.isToday && !getTemplateColor(date.full),
              'today-has-template': date.isToday && getTemplateColor(date.full)
            }" :style="getCellStyle(date.full)" @click="!date.isEmpty && handleDateClick(date.full)"
              @longpress="!date.isEmpty && onDateLongPress(date.full)">
              <view class="cell-content">
                <template v-if="date.isEmpty">
                </template>
                <template v-else-if="getTemplateColor(date.full)">
                  <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
                    :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
                  </text>
                  <text class="cell-text" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ date.day }}
                  </text>
                  <text class="template-name" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTemplateName(date.full) }}
                  </text>
                </template>
                <template v-else>
                  <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
                    :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
                  </text>
                  <text class="cell-text">{{ date.day }}</text>
                  <text v-if="getTemplateName(date.full)" class="template-name">
                    {{ getTemplateName(date.full) }}
                  </text>
                </template>
              </view>
            </view>
          </view>
        </view>

        <view class="calendar-month" :class="{ sliding: isSliding }" v-show="currentMonthView === 1">
          <view class="calendar-header">
            <text class="month-title" @click="goToYearPage">{{ getNextMonthYear() }}/{{ getNextMonth() + 1 }}</text>
            <view class="icon-add-wrap" @click="openAnnivPopup(null)">
              <text class="icon-plus">＋</text>
            </view>
          </view>
          <view class="weekday-row">
            <text class="weekday">日</text>
            <text class="weekday">一</text>
            <text class="weekday">二</text>
            <text class="weekday">三</text>
            <text class="weekday">四</text>
            <text class="weekday">五</text>
            <text class="weekday">六</text>
          </view>
          <view class="calendar-grid">
            <view v-for="date in nextMonthDays" :key="date.key" class="calendar-cell" :class="{
              today: date.isToday && !getTemplateColor(date.full),
              'today-has-template': date.isToday && getTemplateColor(date.full)
            }" :style="getCellStyle(date.full)" @click="!date.isEmpty && handleDateClick(date.full)"
              @longpress="!date.isEmpty && onDateLongPress(date.full)">
              <view class="cell-content">
                <template v-if="date.isEmpty">
                </template>
                <template v-else-if="getTemplateColor(date.full)">
                  <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
                    :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
                  </text>
                  <text class="cell-text" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ date.day }}
                  </text>
                  <text class="template-name" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTemplateName(date.full) }}
                  </text>
                </template>
                <template v-else>
                  <text v-if="getTotalWeight(date.full) > 0" class="weight-text"
                    :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ getTotalWeight(date.full) }}{{ isAerobicDay(date.full) ? 'min' : '' }}
                  </text>
                  <text class="cell-text">{{ date.day }}</text>
                  <text v-if="getTemplateName(date.full)" class="template-name">
                    {{ getTemplateName(date.full) }}
                  </text>
                </template>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>


    <!-- 底部：重量显示 + 模板/动作 按钮 -->
    <view class="tab-bar-fixed">
      <view class="tab-item" @click="goToTrainingStat">
        <view class="tab-icon">
          <view class="icon-base icon-statistic"></view>
        </view>
        <text class="tab-label">训练统计</text>
      </view>

      <view class="tab-item" @click="goToBackup">
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
    </view>

    <!-- 底部：多条纪念日卡片以及新增按钮 -->
    <view class="anniv-list-container">
      <view v-for="(item, idx) in annivs" :key="idx" class="anniv-item" @click="openAnnivPopup(idx)"
        @longpress="onAnnivLongPress(idx)">
        <view class="anniv-dot"></view>
        <view class="anniv-content">
          <view class="anniv-title-row">
            <text class="anniv-title-text">{{ item.title }}</text>
            <text class="anniv-days-tag">{{ item.daysText }}</text>
          </view>
          <view class="anniv-sub-text">纪念日 | {{ item.date }}</view>
        </view>
      </view>
      <view class="safe-area-inset"></view>
    </view>

    <!-- 纪念日输入弹窗 -->
    <view v-if="showAnnivPopup" class="popup-overlay" @click.self="showAnnivPopup = false">
      <view class="overlay-bg" @click="showAnnivPopup = false"></view>
      <view class="modal-panel fade-in" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingIndex === null ? '新增纪念日' : '编辑纪念日' }}</text>
          <text class="close-icon" @click="showAnnivPopup = false">×</text>
        </view>
        <view class="modal-body">
          <view class="input-row">
            <input v-model="annivTitleInput" placeholder="纪念内容" class="action-input" />
          </view>
          <view class="input-row">
            <input v-model="annivDateInput" placeholder="日期" type="date" class="action-input" />
          </view>
        </view>
        <view class="modal-footer btn-row">
          <text class="btn-confirm" @click="saveAnniv">保存</text>
        </view>
      </view>
    </view>
    <!-- 有氧详情弹窗 -->
    <view v-if="showAerobicDetail" class="popup-overlay" @click.self="closeAerobicDetail">
      <view class="overlay-bg" @click="closeAerobicDetail"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">有氧</text>
          <text class="close-icon" @click="closeAerobicDetail">×</text>
        </view>
        <view class="modal-body">
          <text>类型：{{ aerobicDetail.name }}</text>
          <text>时长：{{ aerobicDetail.time }} 分钟</text>
          <text class="btn-set-color" @click="showAerobicColorPicker = !showAerobicColorPicker">
            {{ showAerobicColorPicker ? '取消设置颜色' : '设置颜色' }}
          </text>

          <!-- 圆形配色选择区 -->
          <view class="aerobic-color-picker" :style="{ display: showAerobicColorPicker ? 'flex' : 'none' }">
            <view v-for="(cObj, idx) in presetColors" :key="idx" class="color-option-item"
              @click="selectAerobicColor(cObj.value)">
              <view class="color-circle" :style="{ backgroundColor: cObj.value }">
                <view v-if="aerobicDetail.color === cObj.value" class="color-selected"></view>
              </view>
              <text class="color-name">{{ cObj.name }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- 休息日详情弹窗 -->
    <view v-if="showRestDetail" class="popup-overlay" @click.self="closeRestDetail">
      <view class="overlay-bg" @click="closeRestDetail"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">休息</text>
          <text class="close-icon" @click="closeRestDetail">×</text>
        </view>
        <view class="modal-body">
          <text>理由：{{ restDetail.reason }}</text>
          <text class="btn-set-color" @click="showRestColorPicker = !showRestColorPicker">
            {{ showRestColorPicker ? '取消设置颜色' : '设置颜色' }}
          </text>

          <!-- 圆形配色选择区 -->
          <view class="aerobic-color-picker" :style="{ display: showRestColorPicker ? 'flex' : 'none' }">
            <view v-for="(cObj, idx) in presetColors" :key="idx" class="color-option-item"
              @click="selectRestColor(cObj.value)">
              <view class="color-circle" :style="{ backgroundColor: cObj.value }">
                <view v-if="restDetail.color === cObj.value" class="color-selected"></view>
              </view>
              <text class="color-name">{{ cObj.name }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

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

  export default {
    data() {
      return {
        // ========== 日历相关 ==========
        curYear: 0,
        curMonth: 0,
        monthDays: [],
        monthKey: 0,
        DAYDATA_PREFIX: 'fitness_daydata_',

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
          },
        ],

        // ========== 重量统计 ==========
        thisWeekTotal: 0,
        lastWeekTotal: 0,
        diffText: '0kg',
        diffClass: 'diff-neutral',

        // ========== 纪念日 ==========
        annivs: [],
        showAnnivPopup: false,
        annivTitleInput: '',
        annivDateInput: '',
        editingIndex: null,

        // ========== 有氧/休息 ==========
        showAerobicDetail: false,
        aerobicDetail: {
          date: '',
          name: '',
          time: 0,
          color: ''
        },
        showAerobicColorPicker: false,
        showRestDetail: false,
        restDetail: {
          date: '',
          reason: '',
          color: ''
        },
        showRestColorPicker: false,
        // 新增滑动相关数据
        canSlide: true, // 是否可以滑动切换
        isAnimating: false, // 是否正在执行切换动画
        slideOffset: 0, // 滑动偏移量
        isSliding: false, // 是否正在滑动
        slideDirection: 0, // 滑动方向：-1左滑，1右滑，0无
        touchStartX: 0,
        touchStartY: 0,
        slideThreshold: 50, // 滑动阈值
        currentMonthView: 0,
        prevMonthDays: [],
        nextMonthDays: [],
        dayDataCache: {}
      }
    },
    computed: {
      actionNames() {
        return this.actionStore.actionNames
      },
      templates() {
        return this.templateStore.templates
      }
    },
    created() {
      this.actionStore = useActionStore()
      this.actionStore.load()
      this.templateStore = useTemplateStore()
      this.templateStore.load()
      this.dayDataCacheStore = useDayDataCacheStore()
      this.dayDataCacheStore.loadIndex()
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

      this.resetSlideStateForSwitch();
      this.dayDataCache = {};
      this.currentMonthView = 0;
      this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
      this.prepareAdjacentMonths();

      this.$nextTick(() => {
        this.calcWeeklyTotals();
        this.canSlide = true;
      });
      this.loadAnnivs()
    },
    onLoad(options) {
      this.tplStore = useTemplateStore()
      this.tplStore.load()

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
      this.loadAnnivs()
    },

    mounted() {
      if (typeof this.curYear === 'undefined' || this.curYear === 0) {
        this.initCalendar()
      }
      this.tplStore = useTemplateStore()
      this.tplStore.load()
      this.templates = this.tplStore.templates
      this.$nextTick(() => {
        setTimeout(() => {
          this.canSlide = true;
        }, 500);
      });
    },
    methods: {
      closeRestDetail() {
        this.showRestDetail = false;
      },
      selectRestColor(color) {
        this.restDetail.color = color;

        const key = this.DAYDATA_PREFIX + this.restDetail.date;
        const dayData = uni.getStorageSync(key) || {};
        dayData.color = color;
        uni.setStorageSync(key, dayData);

        uni.showToast({
          title: '已保存颜色',
          icon: 'success'
        });
        this.showRestDetail = false;
      },
      // 判断某天是否是休息日
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
      // 新增：点击"年/月"标题，跳转到年份页面
      goToYearPage() {
        // 直接跳转，不需要 loading
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
      // 生成对比色字体
      getContrastColor(hex) {
        // 如果是对象且有 value 字段，取出真正的字符串
        if (hex && typeof hex === 'object' && 'value' in hex) {
          hex = hex.value;
        }

        // 强制转换成字符串，并去掉前导 '#'
        let str = String(hex).replace(/^#/, '').trim();

        // 只接受 3 位或 6 位合法十六进制
        // if (!/^[0-9A-Fa-f]{3}$/.test(str) && !/^[0-9A-Fa-f]{6}$/.test(str)) {
        //   return '#000000';
        // }
        if (str.length === 3) {
          str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
        }
        const r = parseInt(str.substr(0, 2), 16);
        const g = parseInt(str.substr(2, 2), 16);
        const b = parseInt(str.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
      },
      // ========== 新增方法：获取某天的“最后一个模板名称”（如果存在） ==========
      getTemplateName(fullDate) {
        const dayData = this.getDayData(fullDate);
        if (dayData.templates && typeof dayData.templates === 'object') {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length > 0) {
            // 取“最后写入”的那个模板名称
            return tplNames[tplNames.length - 1];
          }
        }
        return null;
      },
      // —— 新增：获取某天总重量 —— 
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
        return sum;
      }, // ================= 日历相关 =================
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
      formatDate(date) {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return (
          y +
          '-' +
          (m < 10 ? '0' + m : m) +
          '-' +
          (d < 10 ? '0' + d : d)
        );
      },
      onTouchStart(e) {
        if (!this.canSlide || this.isAnimating) return; // 如果不可滑动或正在动画中，直接返回

        this.touchStartX = e.changedTouches[0].clientX;
        this.touchStartY = e.changedTouches[0].clientY;
        this.slideOffset = 0;
        this.isSliding = false;
      },

      onTouchEnd(e) {
        if (!this.canSlide || this.isAnimating) return; // 双重检查

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - this.touchStartX;
        const dy = endY - this.touchStartY;

        // 只处理水平滑动
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

      // 仅重置动画相关状态，不改变 canSlide
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

      // 修复月份切换方法
      prevMonth() {
        if (this.isAnimating && this.slideDirection !== 1) return;

        let y = this.curYear,
          m = this.curMonth - 1;
        if (m < 0) {
          y -= 1;
          m = 11;
        }

        // 不在这里显示loading，在切换完成后统一处理
        this.curYear = y;
        this.curMonth = m;
        this.monthKey += 1;

        // 构建新的月份数据
        this.buildMonthDays(y, m, () => {
          // 月份切换完成后的回调
          setTimeout(() => {
            this.slideOffset = 0;
            this.isSliding = false;
            this.slideDirection = 0;
            this.isAnimating = false; // 动画结束
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
          this.showRestColorPicker = false;
          return;
        }
        const tplNames = dayData.templates ? Object.keys(dayData.templates) : [];

        // 如果只有一个模板，且无具体动作（actionWeights 为空），视作有氧
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
        // 否则正常跳转到 day 页面
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

      // 计算本周/上周重量
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
        const s = new Date(start);
        const e = new Date(end);
        const year = s.getFullYear();
        const weekNumber = this.getWeekNumberForRange(s, e);

        // 尝试从缓存获取
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

        // 缓存结果
        this.dayDataCacheStore.setWeekStats(year, weekNumber, sum);
        return sum;
      },

      // 获取日期范围内的周数（简化版，假设范围在一周内）
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

      // ================= 纪念日管理 =================
      updateAnnivDaysFor(dateStr) {
        if (!dateStr) return '0 天';
        let dateText = dateStr.trim();
        if (dateText.includes('年') && dateText.includes('月') && dateText.includes('日')) {
          // “2020年08月15日”之类 ➞ “2020/08/15”
          dateText = dateText.replace('年', '/').replace('月', '/').replace('日', '');
        }
        const parsedDate = new Date(dateText.replace(/-/g, '/'));
        if (isNaN(parsedDate.getTime())) {
          return '0 天';
        }
        // 计算天数差
        const today = new Date();
        const diffTime = today.setHours(0, 0, 0, 0) - parsedDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays+1} 天`;
      },

      // 加载本地存储中的多条纪念日
      loadAnnivs() {
        const raw = uni.getStorageSync('annivs') || '[]';
        try {
          this.annivs = JSON.parse(raw);
        } catch (e) {
          this.annivs = [];
        }
        // 为每条计算 daysText
        this.annivs.forEach((it) => {
          it.daysText = this.updateAnnivDaysFor(it.date);
        });
      },
      // 保存到本地
      saveAnnivs() {
        uni.setStorageSync('annivs', JSON.stringify(this.annivs));
      },
      // 打开弹窗：index 为 null 时“新增”，否则为“编辑”第几条
      openAnnivPopup(index) {
        if (index === null) {
          this.editingIndex = null;
          this.annivTitleInput = '';
          this.annivDateInput = '';
        } else {
          this.editingIndex = index;
          const item = this.annivs[index];
          this.annivTitleInput = item.title;
          this.annivDateInput = item.date;
        }
        this.showAnnivPopup = true;
      },
      // 点击“确认”后新增/编辑
      saveAnniv() {
        const title = this.annivTitleInput.trim();
        const date = this.annivDateInput;
        if (!title || !date) {
          uni.showToast({
            title: '请填写完整信息',
            icon: 'none'
          });
          return;
        }
        // 使用原方法计算天数文本
        const daysText = this.updateAnnivDaysFor(date);

        if (this.editingIndex === null) {
          // 新增一条
          this.annivs.push({
            title,
            date,
            daysText
          });
        } else {
          // 编辑已有一条
          this.annivs[this.editingIndex] = {
            title,
            date,
            daysText
          };
        }
        this.saveAnnivs();
        this.showAnnivPopup = false;
      },
      // 删除某一条
      removeAnniv(idx) {
        uni.showModal({
          title: '确认删除',
          content: `删除「${this.annivs[idx].title}」吗？`,
          success: (res) => {
            if (res.confirm) {
              this.annivs.splice(idx, 1);
              this.saveAnnivs();
            }
          }
        });
      },
      // 长按纪念日卡片时调用
      onAnnivLongPress(idx) {
        // 1. 先短震动反馈
        uni.vibrateShort({
          type: 'light' // 轻微震动；也可以用 'medium' 或 'heavy'，视机型支持情况而定
        });

        // 2. 弹出确认框，再删除
        uni.showModal({
          title: '确认删除',
          content: `确定要删除「${this.annivs[idx].title}」吗？`,
          success: (res) => {
            if (res.confirm) {
              this.annivs.splice(idx, 1);
              this.saveAnnivs();
            }
          }
        });
      },
      // ========== 新增：跳转到“动作历史”页面 ==========
      // ==== 新增：根据日期拿模板颜色 ====
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

        // 1. 休息日颜色
        if (dayData.isRestDay && dayData.color) {
          return dayData.color;
        }

        // 2. 全局颜色
        if (dayData.color) {
          return dayData.color;
        }

        // 3. 模板颜色（从日期数据中获取）
        if (dayData.templates) {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length) {
            const lastTplName = tplNames[tplNames.length - 1];
            const tplData = dayData.templates[lastTplName];

            // 优先使用日期数据中保存的模板颜色
            if (tplData && tplData.color) {
              return tplData.color;
            }

            // 如果日期数据中没有颜色，尝试从全局模板中查找
            const globalTpl = this.templates.find(t => t.name === lastTplName);
            if (globalTpl && globalTpl.color) {
              return globalTpl.color;
            }
          }
        }

        // 4. 默认颜色
        if (dayData.templates && Object.keys(dayData.templates).length > 0) {
          return this.presetColors[0]?.value || '#93d5dc';
        }

        return '';
      },
      // ==== 新增：根据日期决定这个格子的 style ====
      getCellStyle(fullDate) {
        const todayStr = this.formatDate(new Date());
        const templateColor = fullDate ? this.getTemplateColor(fullDate) : '';

        // 1. 如果是"今天"且存在模板色，用模板色做背景并加边框
        if (fullDate === todayStr && templateColor) {
          return {
            backgroundColor: templateColor,
            boxShadow: 'inset 0 0 10px 5px #287eff'
          };
        }

        // 2. 如果是"今天"且**无**模板，则用原来的渐变高亮
        if (fullDate === todayStr) {
          return {
            backgroundColor: '#287eff'
          };
        }

        // 3. 如果非今天，但有模板色，就用模板色
        if (templateColor) {
          return {
            backgroundColor: templateColor
          };
        }

        // 4. 其它情况不设背景
        return {};
      },
      openAerobicDetail() {
        const raw = uni.getStorageSync(this.DAYDATA_PREFIX + this.date) || {};
        const tplNames = Object.keys(raw.templates || {});
        if (tplNames.length === 1 && Object.keys(raw.templates[tplNames[0]].actionWeights).length === 0) {
          // 只有有氧
          this.aerobicDetail.name = tplNames[0];
          this.aerobicDetail.time = raw.templates[tplNames[0]].totalWeight;
          this.showAerobicDetail = true;
        }
      },
      closeAerobicDetail() {
        this.showAerobicDetail = false;
        this.showAerobicColorPicker = false;
      },
      // 选中后：
      selectAerobicColor(color) {
        const key = this.DAYDATA_PREFIX + this.aerobicDetail.date;
        const dayData = this.getDayData(this.aerobicDetail.date) || {};
        const tpl = dayData.templates[this.aerobicDetail.name] || {};
        tpl.color = color;
        dayData.templates[this.aerobicDetail.name] = tpl;
        uni.setStorageSync(key, dayData);
        this.dayDataCache[this.aerobicDetail.date] = dayData;

        this.aerobicDetail.color = color;
        this.showAerobicColorPicker = false;
        this.showAerobicDetail = false;
        uni.showToast({
          title: '已保存颜色',
          icon: 'success'
        });
        this.monthDays = this.buildMonthDaysData(this.curYear, this.curMonth);
        this.prepareAdjacentMonths();
      },
      isAerobicDay(fullDate) {
        const dayData = this.getDayData(fullDate);
        const templates = dayData.templates || {};
        const names = Object.keys(templates);
        if (names.length !== 1) return false;
        const tpl = templates[names[0]];
        // 只要 actionWeights 为空或专门标记 isAerobic，都当作有氧
        const noActions = tpl.actionWeights && Object.keys(tpl.actionWeights).length === 0;
        return tpl.isAerobic === true || noActions;
      },
    },
  };
</script>

<style scoped>
  .container {
    min-height: 100vh;
    overflow-y: auto;
  }

  .container.light {
    background-color: #f5f5f5;
    color: #333333;
  }

  .container.dark {
    background-color: #121212;
    color: #f7f7f7;
  }

  .calendar-container {
    width: 100vw;
    border-radius: 0 0 15px 15px;
    background-color: #fff;
  }

  .container.dark .calendar-container {
    background-color: #121212;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    margin-bottom: 5px;
  }

  .month-title {
    font-size: 34px;
    font-weight: bold;
    color: inherit;
  }

  .icon-add-wrap {
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(128, 128, 128, 0.1);
    border-radius: 50%;
  }

  .icon-plus {
    font-size: 22px;
    color: #379bff;
    font-weight: 300;
    /* 线条细一点才有高级感 */
  }

  .weekday-row {
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
    margin-bottom: 10px;
  }

  .weekday {
    width: calc(100% / 7);
    text-align: center;
    font-size: 14px;
    color: #666666;
  }

  .container.dark .weekday {
    color: #bbbbbb;
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
    color: #000;
    font-weight: bold;
  }

  .container.dark .cell-text {
    color: #fff;
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

  /* 底部固定导航栏 */
  .tab-bar-fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 75px;
    /* 稍微压低一点高度 */
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: rgba(255, 255, 255, 0.85);
    /* 提高透明度 */
    backdrop-filter: blur(25px);
    /* 加强毛玻璃 */
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-bottom: env(safe-area-inset-bottom);
    /* 适配苹果底部横条 */
    z-index: 999;
  }

  /* 深色模式下的导航栏 */
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
    /* 核心：将 SVG 设为遮罩 */
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    /* 在这里控制颜色 */
    background-color: #191919;
  }

  /* 适配深色模式（假设你的外层 class 是 darkMode） */
  .container.dark .icon-base {
    background-color: #f2f2f2;
    /* 深色模式下变白色 */
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

  .icon-moon {
    -webkit-mask-image: url('/static/moon.svg');
    mask-image: url('/static/moon.svg');
  }

  .icon-sun {
    -webkit-mask-image: url('/static/ty.svg');
    mask-image: url('/static/ty.svg');
    /* 太阳用金黄色 */
  }

  .tab-label {
    margin-top: 5px;
    font-size: 10px;
    color: #888;
  }

  /* 激活态反馈 */
  .tab-item:active .tab-icon {
    transform: scale(0.9);
  }

  .anniv-list-container {
    padding: 10px 16px;
    /* 解决无法滑动的关键：给底部留出 Tabbar 的高度 */
    padding-bottom: 110px;
  }

  .anniv-header {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    color: #000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .container.dark .anniv-header {
    color: #fff;
  }

  .anniv-sub {
    font-size: 12px;
    text-align: left;
    color: #888;
    margin-top: 4px;
  }

  .add-anniv {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #ddd;
    cursor: pointer;
  }

  .container.dark .add-anniv {
    background-color: #3a3a3a;
  }

  .anniv-placeholder {
    font-size: 16px;
    color: #999999;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
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

  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    /* 明确宽度 */
    height: 100vh;
    /* 明确高度 */
    z-index: 9999;
    /* 调至最高 */
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
    /* 确保捕获点击 */
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7) !important;
    /* 强制变黑 */
  }

  .popup-panel {
    position: relative;
    width: 85vw;
    max-width: 320px;
    /* 移除这里的 !important，确保 flex 布局生效 */
    background-color: #fff;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    /* 增加投影确认它是否出来了 */
  }

  .container.dark .popup-panel {
    background-color: #1e1e1e;
    border: 1px solid #333;
  }

  .panel-title {
    font-size: 18px;
    font-weight: 600;
    color: inherit;
  }

  .close-btn {
    font-size: 20px;
    color: #999;
  }

  .panel-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
  }

  .container.dark .panel-header {
    border-bottom: 1px solid #333;
  }

  .panel-body {
    padding: 12px;
    display: flex !important;
    /* 必须是 flex */
    flex-direction: column;
    min-height: 200px;
    /* 给个保底高度 */
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
    background-color: #fff;
    border-radius: 10px;
    min-height: 44px;
    padding: 8px 44px;
    margin: 0 12px 6px 12px;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .container.dark .template-tag {
    background-color: #505050;
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
    color: #666;
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

  .container.dark .move-btn {
    color: #bbb;
  }

  .container.dark .move-btn:active {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .no-data {
    text-align: center;
    color: #999;
    font-size: 14px;
    padding: 20px;
    margin: 20px 12px;
    background-color: #f8f8f8;
    border-radius: 10px;
  }

  .container.dark .no-data {
    background-color: #3a3a3a;
    color: #bbb;
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
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0 10px;
    font-size: 14px;
  }

  .container.dark .action-input {
    border-color: #444;
    background-color: #262626;
    color: #fff;
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

  .color-option-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    align-items: center;
    margin: 5px;
  }

  .color-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    position: relative;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border: 2px solid transparent;
    transition: transform 0.2s ease;
    width: 36px;
    height: 36px;
  }

  .color-selected {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border: 2px solid #379bff;
    border-radius: 50%;
    animation: breathe 2s infinite ease-in-out;
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
    border: 2px solid #fff;
  }

  @keyframes breathe {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }

    50% {
      transform: scale(1.1);
      opacity: 0.4;
    }

    100% {
      transform: scale(1);
      opacity: 0.8;
    }
  }

  .color-name {
    font-size: 11px;
    color: #888;
    margin-top: 4px;
    font-size: 12px;
    color: #333;
  }

  .container.dark .color-name {
    color: #f7f7f7;
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
    background-color: #f0f0f0;
    color: #666;
  }

  .container.dark .btn-return {
    background-color: #444;
    color: #bbb;
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
    position: relative;
    width: 80vw;
    max-width: 320px;
    background-color: #fff;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1001;
  }

  .container.dark .modal-panel {
    background-color: #1e1e1e;
  }

  .modal-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
  }

  .container.dark .modal-header {
    border-bottom: 1px solid #333;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
  }

  .close-icon {
    font-size: 20px;
    color: #999;
  }

  .modal-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
  }

  .modal-footer {
    padding: 10px;
    display: flex;
    justify-content: center;
  }

  .anniv-item {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border-radius: 14px;
    /* 圆角稍微收小一点 */
    margin-bottom: 10px;
    /* 只有底部间距，避免叠加过大 */
    padding: 14px 16px;
    position: relative;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }

  .anniv-item:active {
    background-color: #e0e0e0;
  }

  .container.dark .anniv-item {
    background-color: #1c1c1e;
    border: 1px solid #2c2c2e;
  }

  /* 左侧彩色小圆点 (图二精髓) */
  .anniv-dot {
    width: 8px;
    height: 8px;
    background: #379bff;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .anniv-content {
    flex: 1;
  }

  .anniv-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .anniv-title-text {
    font-size: 15px;
    font-weight: 600;
    color: inherit;
  }

  .anniv-days-tag {
    font-size: 13px;
    color: #379bff;
    font-weight: bold;
  }

  .anniv-sub-text {
    font-size: 11px;
    color: #888;
    margin-top: 2px;
  }

  /* 去掉原来的红色/蓝色侧边条，改用圆点更精致 */
  .anniv-item::before {
    display: none;
  }

  /* 底部占位 */
  .safe-area-inset {
    height: 20px;
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
    background-color: #f5f5f5;
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
    background-color: #333333;
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
    background-color: #333333;
    color: #f7f7f7;
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

  .aerobic-color-picker {
    flex-wrap: wrap;
    flex-direction: row;
    margin-top: 10px;
    justify-content: space-around;
  }

  .btn-set-color {
    margin-top: 12px;
    color: #379bff;
  }
</style>