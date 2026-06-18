<template>
  <view class="year-container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
    <!-- 外部垂直滚动容器 -->
    <scroll-view class="year-scroll-container" scroll-y="true" :scroll-with-animation="true"
      @scrolltolower="onScrollToLower" @scroll="onScroll">

      <!-- 年份列表 -->
      <view v-for="yearData in yearList" :key="yearData.year" class="year-section">
        <!-- 年份标题行 -->
        <view class="year-header">
          <text class="year-title">{{ yearData.year }} 年 · 共训练{{ yearData.totalDays }}天</text>
        </view>

        <!-- 四行三列的 12 个月布局 -->
        <view class="year-grid">
          <view v-for="monthObj in yearData.months" :key="monthObj.monthIndex" class="month-block"
            @click.stop="selectMonth(yearData.year, monthObj.monthIndex)">

            <!-- 月份标签 -->
            <view class="month-label">
              <text class="month-text" :style="getMonthLabelStyle(yearData.year, monthObj.monthIndex)">
                {{ monthObj.monthIndex + 1 }}月
              </text>
            </view>

            <!-- 星期缩写行（小号字体） -->
            <view class="weekday-row-sm">
              <text class="weekday-sm">日</text>
              <text class="weekday-sm">一</text>
              <text class="weekday-sm">二</text>
              <text class="weekday-sm">三</text>
              <text class="weekday-sm">四</text>
              <text class="weekday-sm">五</text>
              <text class="weekday-sm">六</text>
            </view>

            <!-- 当月天数网格 -->
            <view class="month-days-grid">
              <view v-for="date in monthObj.days" :key="date.key" class="day-cell-sm"
                :style="!date.empty ? getCellStyle(date.full) : {}">
                <!-- 1. 空格子还是照常 -->
                <template v-if="date.empty">
                </template>

                <!-- 2. 如果是 “今天”，文字直接白色 -->
                <template v-else-if="date.isToday">
                  <text class="day-text-sm" style="color: #FFFFFF;">
                    {{ date.day }}
                  </text>
                </template>

                <!-- 3. 如果非“今天” 且 有模板颜色，用模板色 + 对比色字体 -->
                <template v-else-if="getTemplateColor(date.full)">
                  <text class="day-text-sm" :style="{ color: getContrastColor(getTemplateColor(date.full)) }">
                    {{ date.day }}
                  </text>
                </template>

                <!-- 4. 其他普通日期，深浅模式下文字继承默认 -->
                <template v-else>
                  <text class="day-text-sm">{{ date.day }}</text>
                </template>
              </view>

            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
  import {
    useDayDataCacheStore
  } from '@/stores/dayDataCache.js';
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js';

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        currentYear: new Date().getFullYear(),
        yearList: [], // 存储多个年份的数据 [{ year, months }]
        todayYear: new Date().getFullYear(),
        todayMonth: new Date().getMonth(),
        DAYDATA_PREFIX: 'fitness_daydata_',
        templateColorCache: new Map(),
        dayDataCacheStore: null,
        earliestYear: null, // 最早有数据的年份
        lastKnownDates: '', // 用于检测训练数据变化的标记
        loadedYears: new Set(), // 已加载的年份
      };
    },
    onLoad(options) {
      console.log('年页面开始加载');

      this.daySettingsStore.load()

      uni.showLoading({
        title: '加载中...',
        mask: true
      });

      this.dayDataCacheStore = useDayDataCacheStore();
      // 清空 store 缓存，防止跨页面缓存污染导致读取到旧数据
      this.dayDataCacheStore.clearCache();
      this.dayDataCacheStore.loadIndex();

      uni.setNavigationBarTitle({
        title: '年度总览'
      });

      // 获取最早年份
      this.earliestYear = this.dayDataCacheStore.getEarliestYear();
      // 初始加载当前年份
      this.loadedYears = new Set();
      this.loadNextYear(() => {
        // 等待 Vue 渲染完成后再隐藏 loading
        this.$nextTick(() => {
          uni.hideLoading();
        });
      });
    },

    onShow() {
      // 重新加载索引（强制刷新，确保显示最新数据）
      if (this.dayDataCacheStore) {
        // 清空 store 的日数据缓存，强制重新从 storage 读取
        this.dayDataCacheStore.clearCache();
        // 强制重建索引，而不是使用缓存的索引
        this.dayDataCacheStore.buildIndex();
        // 每次回来都清空颜色缓存，确保显示最新数据
        this.templateColorCache.clear();
        console.log('年页面 onShow，清空数据缓存，重建索引，清空颜色缓存');

        // 更新最早年份（可能变化）
        const newEarliestYear = this.dayDataCacheStore.getEarliestYear();
        if (newEarliestYear !== this.earliestYear) {
          this.earliestYear = newEarliestYear;
        }

        // 重新加载当前年份数据，确保 UI 刷新
        if (this.yearList.length > 0) {
          this.rebuildYearList();
        }
      }
    },

    onUnload() {
      // 离开页面时清空缓存，确保下次进入时重新计算
      this.yearList = [];
      this.loadedYears.clear();
      this.templateColorCache.clear();
    },

    methods: {
      // 重新构建年份列表（用于数据更新后刷新UI）
      rebuildYearList() {
        console.log('重建年份列表');
        // 保存已加载的年份集合
        const yearsToRebuild = [...this.loadedYears];
        // 清空现有数据
        this.yearList = [];
        // 重新构建每个年份的数据
        yearsToRebuild.forEach(year => {
          const months = this.buildBasicMonthStructure(year);
          this.yearList.push({
            year: year,
            months,
            totalDays: this.countYearTrainingDays(year)
          });
        });
        // 按年份排序（新的在前面）
        this.yearList.sort((a, b) => b.year - a.year);
      },

      // 懒加载下一个年份
      loadNextYear(callback = null) {
        // 从当前年份往下加载，直到最早年份
        if (this.earliestYear === null) {
          this.earliestYear = this.dayDataCacheStore.getEarliestYear();
        }

        // 找到下一个未加载的年份
        let yearToLoad = this.currentYear;
        while (this.loadedYears.has(yearToLoad) && yearToLoad >= this.earliestYear) {
          yearToLoad--;
        }

        // 如果没有更多年份需要加载，停止
        if (yearToLoad < this.earliestYear || this.loadedYears.has(yearToLoad)) {
          console.log('所有年份已加载完成');
          if (callback) callback();
          return;
        }

        console.log(`懒加载年份: ${yearToLoad}`);

        // 构建月份数据
        const months = this.buildBasicMonthStructure(yearToLoad);

        // 添加到列表（保持年份从新到旧排序）
        this.yearList.push({
          year: yearToLoad,
          months,
          totalDays: this.countYearTrainingDays(yearToLoad)
        });

        // 标记为已加载
        this.loadedYears.add(yearToLoad);

        // 按年份排序（新的在前面）
        this.yearList.sort((a, b) => b.year - a.year);

        // 执行回调
        if (callback) callback();
      },

      // 【核心修正】构建月份结构，确保星期对齐
      buildBasicMonthStructure(year) {
        // 强制转成数字，防止字符串年份导致Date计算异常
        year = Number(year);
        const arr = [];
        const todayStr = this.formatDate(new Date());

        for (let m = 0; m < 12; m++) {
          const firstDay = new Date(year, m, 1);
          const monthDays = new Date(year, m + 1, 0).getDate();
          // 0=周日, 1=周一, ..., 6=周六，和星期行顺序完全对应
          const startDay = firstDay.getDay();

          const days = [];
          // 1. 前置空格：让当月1号对齐到正确的星期列
          for (let i = 0; i < startDay; i++) {
            days.push({
              day: null,
              empty: true,
              key: `empty-pre-${year}-${m}-${i}` // 单独key防止Vue复用错乱
            });
          }

          // 2. 添加当月日期
          for (let d = 1; d <= monthDays; d++) {
            const dt = new Date(year, m, d);
            const fullDate = this.formatDate(dt);
            days.push({
              day: d,
              full: fullDate,
              empty: false,
              isToday: fullDate === todayStr,
              key: `day-${year}-${m}-${d}`
            });
          }

          // 3. 后置补空格：确保每个月的格子数是7的倍数，防止flex换行错位
          const totalCells = Math.ceil((startDay + monthDays) / 7) * 7;
          for (let i = days.length; i < totalCells; i++) {
            days.push({
              day: null,
              empty: true,
              key: `empty-post-${year}-${m}-${i}`
            });
          }

          arr.push({
            monthIndex: m,
            days: days
          });
        }
        return arr;
      },

      // 选择月份
      selectMonth(year, month) {
        console.log('点击月份:', year, month);
        // 保存选中的年月，让首页加载时使用
        uni.setStorageSync('selectedYear', year);
        uni.setStorageSync('selectedMonth', month);
        // 使用 navigateTo 跳转到首页，保持完整页面栈
        uni.navigateTo({
          url: '/pages/index/index'
        });
      },

      // 格式化日期
      formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },

      // 获取模板名称
      getTemplateName(fullDate) {
        // 使用store缓存获取数据
        const dayData = this.dayDataCacheStore.getDayData(fullDate);

        if (dayData.isRestDay) {
          const tplNames = Object.keys(dayData.templates || {});
          return tplNames.length > 0 ? tplNames[0] : null;
        }

        if (dayData.templates && typeof dayData.templates === 'object') {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length > 0) {
            return tplNames[tplNames.length - 1];
          }
        }
        return null;
      },

      // 获取模板颜色（带缓存）
      getTemplateColor(fullDate) {
        if (this.templateColorCache.has(fullDate)) {
          return this.templateColorCache.get(fullDate);
        }

        // 使用store缓存获取数据
        const dayData = this.dayDataCacheStore.getDayData(fullDate);
        let color = '';

        // 1. 休息日颜色
        if (dayData.isRestDay && dayData.color) {
          color = dayData.color;
        }
        // 2. 全局颜色
        else if (dayData.color) {
          color = dayData.color;
        }
        // 3. 模板颜色
        else if (dayData.templates) {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length > 0) {
            const lastTplName = tplNames[tplNames.length - 1];
            const tplData = dayData.templates[lastTplName];

            // 优先使用日期数据中保存的模板颜色
            if (tplData && tplData.color) {
              color = tplData.color;
            } else {
              // 如果日期数据中没有颜色，尝试从全局模板中查找
              const tplArr = uni.getStorageSync('fitness_templates') || [];
              const globalTpl = tplArr.find(t => t.name === lastTplName);
              if (globalTpl && globalTpl.color) {
                color = globalTpl.color;
              }
              // 有氧模板默认色（马尔斯绿），用户自定义颜色优先
              if (!color && tplData && tplData.isAerobic) {
                color = '#01847f';
              }
            }
          }
        }

        // 4. 如果没有找到颜色，但有 templates 数据，使用默认颜色
        if (!color && dayData.templates && Object.keys(dayData.templates).length > 0) {
          color = '#93d5dc';
        }

        this.templateColorCache.set(fullDate, color);
        return color;
      },

      // 计算对比色
      getContrastColor(hex) {
        if (hex && typeof hex === 'object' && 'value' in hex) {
          hex = hex.value;
        }
        if (!hex || typeof hex !== 'string') {
          return '#333333';
        }
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#333333' : '#FFFFFF';
      },
      // 计算指定年份的训练总天数（有颜色格子 = 有训练数据）
      countYearTrainingDays(year) {
        let total = 0;
        // 遍历当年12个月
        for (let month = 0; month < 12; month++) {
          // 获取当月总天数
          const monthDays = new Date(year, month + 1, 0).getDate();
          // 遍历当月每一天
          for (let day = 1; day <= monthDays; day++) {
            const fullDate = this.formatDate(new Date(year, month, day));
            // 有颜色 = 有训练数据，计数+1
            if (this.getTemplateColor(fullDate)) {
              total++;
            }
          }
        }
        return total;
      },
      getCellStyle(fullDate) {
        const todayStr = this.formatDate(new Date());
        const color = this.getTemplateColor(fullDate);

        // 今天有颜色：用颜色
        if (fullDate === todayStr && color) return {
          backgroundColor: color
        };
        // 今天无颜色：默认蓝色高亮（修复丢失的功能）
        if (fullDate === todayStr) return {
          backgroundColor: '#0d82cf'
        };
        // 普通日期有颜色
        if (color) return {
          backgroundColor: color
        };
        return {};
      },
      getMonthLabelStyle(year, monthIndex) {
        if (monthIndex === this.todayMonth && year === this.todayYear) {
          return {
            color: '#117bca'
          };
        }
        return {};
      },
      // 滚动到底部，加载下一年份
      onScrollToLower() {
        console.log('滚动到底部，加载更多年份');
        this.loadNextYear();
      },

      // 滚动事件
      onScroll(e) {
        // 可以在这里添加滚动相关的逻辑
      }
    }
  };
</script>

<style lang="scss" scoped>
  .year-container {
    min-height: 100vh;
    background: var(--bg-primary);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .year-scroll-container {
    height: 100vh;
  }

  .year-section {
    height: 100vh;
    border-bottom: 2rpx solid var(--border-color);
  }

  .year-header {
    padding: 30rpx 20rpx;
    text-align: center;
  }

  .year-title {
    font-size: 32rpx;
    font-weight: bold;
    color: var(--text-primary);
  }

  .year-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .month-block {
    width: calc(33.333% - 1rpx);
    padding: 10rpx;
    box-sizing: border-box;
    cursor: pointer;
    margin-bottom: 5rpx;
  }

  .month-label {
    margin-bottom: 10rpx;
    margin-left: 10rpx;
    pointer-events: none;
  }

  .month-text {
    font-size: 28rpx;
    font-weight: bold;
    color: var(--text-primary);
    pointer-events: none;
  }

  .weekday-row-sm {
    display: flex;
    justify-content: space-around;
    margin-bottom: 5rpx;
    pointer-events: none;
  }

  .weekday-sm {
    font-size: 16rpx;
    color: var(--text-muted);
    width: 36rpx;
    text-align: center;
    pointer-events: none;
  }

  .month-days-grid {
    display: flex;
    flex-wrap: wrap;
    pointer-events: none;
  }

  .day-cell-sm {
    width: 28rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5rpx;
    margin: 2rpx 2rpx;
    pointer-events: none;
  }

  .day-text-sm {
    font-size: 18rpx;
    color: var(--text-primary);
    pointer-events: none;
  }

  .dark {
    .year-title {
      color: var(--text-primary);
    }

    .month-text {
      color: var(--text-primary);
    }

    .weekday-sm {
      color: var(--text-muted);
    }

    .day-text-sm {
      color: var(--text-secondary);
    }
  }

  .light {
    background: linear-gradient(to bottom, var(--bg-primary) 0%, var(--bg-secondary) 100%);

    .year-title {
      color: var(--text-primary);
    }

    .month-block {
      background: var(--bg-tertiary);
    }

    .month-text {
      color: var(--text-primary);
    }

    .weekday-sm {
      color: var(--text-muted);
    }

    .day-text-sm {
      color: var(--text-secondary);
    }

    .year-section {
      border-bottom-color: var(--border-color);
    }
  }

  .year-container.light {
    background: var(--bg-primary);
  }

  .year-container.light .year-title {
    color: var(--text-primary);
  }

  .year-container.light .month-text {
    color: var(--text-primary);
  }

  .year-container.light .weekday-sm {
    color: var(--text-muted);
  }

  .year-container.light .day-text-sm {
    color: var(--text-secondary);
  }

  .year-container.light .year-section {
    border-bottom-color: var(--border-color);
  }

  .year-container.light .month-block {
    background: var(--bg-tertiary);
  }
</style>