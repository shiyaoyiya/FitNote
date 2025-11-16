<template>
  <view :class="['year-container', darkModeClass]" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <!-- 页眉显示“今年运动天数：X 天”  -->
    <view class="year-header">
      <text class="year-title">今年运动天数：{{ activeDays }} 天</text>
    </view>

    <!-- 四行三列的 12 个月布局 -->
    <scroll-view class="year-body" scroll-y="true" :style="{ backgroundColor: 'transparent' }">
      <view class="year-grid">
        <view v-for="monthObj in months" :key="monthObj.monthIndex" class="month-block"
          @click="selectMonth(monthObj.monthIndex)">

          <!-- 月份标签 -->
          <view class="month-label">
            <text class="month-text" :style="getMonthLabelStyle(monthObj.monthIndex)">
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
                <!-- 占位，只占格子 -->
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
    </scroll-view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        year: 0, // 当前展示的年份
        months: [], // 存放 12 个月数据的数组，每项：{ monthIndex: 0~11, days: [...] }
        activeDays: 0, // 当年有模板的天数统计
        darkMode: false, // 是否深色模式
        darkModeClass: 'light', // 用于切换 .light / .dark
        touchStartX: 0, // 触摸开始时的 X 坐标，用于左右滑动切换年份
        longPressTimer: null,
        longPressThreshold: 500, // 若需实现长按此处可用
        todayYear: new Date().getFullYear(),
        todayMonth: new Date().getMonth(), // 0-11
        DAYDATA_PREFIX: 'fitness_daydata_',
        templateColorCache: new Map(), // 新增：颜色缓存
        isCalculating: false, // 防止重复计算
        isLoading: false, // 新增：加载状态标记
        hasDataLoaded: false, // 新增：标记数据是否已加载
      };
    },
    onLoad(options) {
      console.log('年页面开始加载');
      this.isLoading = true;

      // 设置年份和深色模式（快速操作）
      if (options.year) {
        this.year = parseInt(options.year, 10);
      } else {
        this.year = new Date().getFullYear();
      }

      const dm = uni.getStorageSync('darkMode');
      if (dm === 'auto') {
        const sysTheme = uni.getSystemInfoSync().theme || 'light';
        this.darkMode = (sysTheme === 'dark');
      } else {
        this.darkMode = (dm === true);
      }
      this.darkModeClass = this.darkMode ? 'dark' : 'light';

      // 立即设置导航栏（快速操作）
      this.updateNavigationBarStyle(this.darkMode);
      uni.setNavigationBarTitle({
        title: `${this.year} 年`
      });

      // 开始构建月份数据
      this.buildAllMonths(this.year);
    },

    onShow() {
      if (this.hasDataLoaded && this.isLoading) {
        setTimeout(() => {
          uni.hideLoading();
          this.isLoading = false;
        }, 300);
      }
      // 原有的 onShow 逻辑
      this.updateNavigationBarStyle(this.darkMode);
      uni.setNavigationBarTitle({
        title: `${this.year} 年`
      });
    },
    mounted() {
      // 如果需要在 mounted 还执行一些逻辑可以放这里，但 buildAllMonths 已在 onLoad 里完成
    },
    methods: {
      // 触摸开始
      onTouchStart(e) {
        this.touchStartX = e.changedTouches[0].clientX;
      },
      // 触摸结束：判断左右滑动
      onTouchEnd(e) {
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        if (dx > 50) {
          // 向右滑：切到上一年
          this.prevYear();
          uni.showLoading({
            title: '加载中…',
            mask: true
          });
          setTimeout(() => {
            uni.hideLoading();
          }, 300)
        } else if (dx < -50) {
          // 向左滑：切到下一年
          this.nextYear();
          uni.showLoading({
            title: '加载中…',
            mask: true
          });
          setTimeout(() => {
            uni.hideLoading();
          }, 300)
        }
      },

      // 切换年份时优化
      prevYear() {
        this.year -= 1;
        uni.setNavigationBarTitle({
          title: `${this.year} 年`
        });

        uni.showLoading({
          title: '加载中...',
          mask: true
        });
        this.isLoading = true;
        this.hasDataLoaded = false;

        // 清空缓存
        this.templateColorCache.clear();

        this.buildAllMonths(this.year);
      },

      nextYear() {
        this.year += 1;
        uni.setNavigationBarTitle({
          title: `${this.year} 年`
        });

        uni.showLoading({
          title: '加载中...',
          mask: true
        });
        this.isLoading = true;
        this.hasDataLoaded = false;

        // 清空缓存
        this.templateColorCache.clear();

        this.buildAllMonths(this.year);
      },

      // 返回上一页（首页）
      onBack() {
        uni.navigateBack();
      },

      // 点击某个月：使用 redirectTo 替换当前页面栈
      selectMonth(monthIndex) {
        if (monthIndex < 0) monthIndex = 0;
        if (monthIndex > 11) monthIndex = 11;

        uni.showLoading({
          title: '跳转中...',
          mask: true
        });

        // 使用 redirectTo 而不是 navigateTo
        // redirectTo 会关闭当前页面，直接跳转到新页面
        uni.redirectTo({
          url: `/pages/index/index?year=${this.year}&month=${monthIndex}`,
          success: () => {
            // 跳转成功后隐藏loading
            setTimeout(() => {
              uni.hideLoading();
            }, 100);
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            uni.hideLoading();
            uni.showToast({
              title: '跳转失败',
              icon: 'none'
            });
          }
        });
      },

      // 优化的构建方法
      async buildAllMonths(year) {
        try {
          console.log('开始构建月份数据');

          // 1. 先快速构建基础月份结构
          const months = this.buildBasicMonthStructure(year);
          this.months = months;
          this.hasDataLoaded = true;

          // 2. 立即更新UI，然后进行耗时操作
          this.$nextTick(() => {
            // 3. 延迟执行耗时的统计和颜色计算
            setTimeout(async () => {
              await this.calcActiveDays();
              await this.preloadTemplateColors();

              // 所有数据加载完成后再隐藏loading
              console.log('年页面数据加载完成');
              if (this.isLoading) {
                uni.hideLoading();
                this.isLoading = false;
              }
            }, 100);
          });

        } catch (error) {
          console.error('构建月份数据出错:', error);

          // 出错时也要隐藏loading
          if (this.isLoading) {
            uni.hideLoading();
            this.isLoading = false;
          }

          // 降级方案
          this.calcActiveDaysSimple();
        }
      },

      // 快速构建基础月份结构
      buildBasicMonthStructure(year) {
        const arr = [];
        const todayStr = this.formatDate(new Date());

        for (let m = 0; m < 12; m++) {
          const daysArray = [];
          const firstWeekday = new Date(year, m, 1).getDay();

          // 添加空白格
          for (let i = 0; i < firstWeekday; i++) {
            daysArray.push({
              key: `empty-${m}-${i}`,
              day: '',
              full: '',
              empty: true
            });
          }

          // 添加日期格
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(year, m, d);
            const full = this.formatDate(dt);
            daysArray.push({
              key: `day-${m}-${d}`,
              day: d,
              full,
              empty: false,
              isToday: (full === todayStr)
            });
          }

          arr.push({
            monthIndex: m,
            days: daysArray
          });
        }

        return arr;
      },

      // 将 Date 转为 “YYYY-MM-DD”
      formatDate(date) {
        const y = date.getFullYear();
        const mm = date.getMonth() + 1;
        const dd = date.getDate();
        return (
          y +
          '-' +
          (mm < 10 ? '0' + mm : mm) +
          '-' +
          (dd < 10 ? '0' + dd : dd)
        );
      },
      // 优化的统计方法（分批处理）
      async calcActiveDays() {
        try {
          const storageInfo = uni.getStorageInfoSync();
          const allKeys = Array.isArray(storageInfo.keys) ? storageInfo.keys : [];
          const dayDataKeys = allKeys.filter(key => key.startsWith(this.DAYDATA_PREFIX));

          // 创建日期到数据的映射
          const dateDataMap = new Map();

          // 分批读取存储数据（避免阻塞）
          const batchSize = 30;
          for (let i = 0; i < dayDataKeys.length; i += batchSize) {
            const batch = dayDataKeys.slice(i, i + batchSize);
            await this.processBatch(batch, dateDataMap);
          }

          // 统计有效天数
          let count = 0;
          this.months.forEach(monthObj => {
            monthObj.days.forEach(dateObj => {
              if (dateObj.empty) return;

              const dayData = dateDataMap.get(dateObj.full) || {};
              if (dayData.isRestDay) return;

              if (dayData.templates && Object.keys(dayData.templates).length > 0) {
                count += 1;
              }
            });
          });

          this.activeDays = count;

        } catch (error) {
          console.error('统计活动天数出错:', error);
          this.calcActiveDaysSimple(); // 降级方案
        }
      },

      // 处理一批数据
      processBatch(batch, dateDataMap) {
        return new Promise(resolve => {
          setTimeout(() => {
            batch.forEach(key => {
              const date = key.replace(this.DAYDATA_PREFIX, '');
              const data = uni.getStorageSync(key) || {};
              dateDataMap.set(date, data);
            });
            resolve();
          }, 10);
        });
      },

      // 预加载模板颜色（优化渲染性能）
      preloadTemplateColors() {
        // 预加载最近几个月的颜色数据
        const recentMonths = [this.year - 1, this.year, this.year + 1];
        recentMonths.forEach(year => {
          for (let m = 0; m < 12; m++) {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            for (let d = 1; d <= Math.min(10, daysInMonth); d++) { // 只预加载前10天
              const full = this.formatDate(new Date(year, m, d));
              this.getTemplateColor(full); // 触发预加载
            }
          }
        });
      },

      // ========== 修改后的“模板颜色”相关方法，与首页保持一致 ==========
      getTemplateName(fullDate) {
        const key = this.DAYDATA_PREFIX + fullDate;
        const dayData = uni.getStorageSync(key) || {};

        // 如果是休息日，返回休息理由作为"模板名"
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

      // 优化的颜色获取（带缓存）
      getTemplateColor(fullDate) {
        if (this.templateColorCache.has(fullDate)) {
          return this.templateColorCache.get(fullDate);
        }

        const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
        let color = '';

        if (dayData.isRestDay && dayData.color) {
          color = dayData.color;
        } else if (dayData.color) {
          color = dayData.color;
        } else if (dayData.templates) {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length) {
            const last = tplNames[tplNames.length - 1];
            const tplObj = dayData.templates[last];
            if (tplObj && tplObj.color) {
              color = tplObj.color;
            }
          }
        }

        if (!color) {
          const tplName = this.getTemplateName(fullDate);
          if (tplName) {
            const tplArr = uni.getStorageSync('fitness_templates') || [];
            const global = tplArr.find(t => t.name === tplName);
            color = global && global.color ? global.color :
              (dayData.templates && Object.keys(dayData.templates).length > 0 ? '#93d5dc' : '');
          }
        }

        this.templateColorCache.set(fullDate, color);
        return color;
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

      getCellStyle(fullDate) {
        const todayStr = this.formatDate(new Date());
        const templateColor = this.getTemplateColor(fullDate);

        // 1. 如果是"今天"且存在模板色，用模板色做背景
        if (fullDate === todayStr && templateColor) {
          return {
            backgroundColor: templateColor
          };
        }

        // 2. 如果是"今天"且**无**模板，则用蓝色高亮
        if (fullDate === todayStr) {
          return {
            backgroundColor: '#0d82cf'
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
      // ================================================

      // 更新导航栏的深色/浅色样式（和首页保持一致）
      updateNavigationBarStyle(isDark) {
        const bgColor = isDark ? '#121212' : '#f5f5f5';
        const frontColor = isDark ? '#f7f7f7' : '#333333';
        uni.setNavigationBarColor({
          frontColor,
          backgroundColor: bgColor,
          animation: {
            duration: 200,
            timingFunc: 'easeIn'
          }
        });
      },
      // 判断传入的 monthIndex（0-11）是否正好是“当月”
      isCurrentMonth(monthIndex) {
        return this.year === this.todayYear && monthIndex === this.todayMonth;
      },

      // 如果是当月，就返回那段渐变背景样式，否则返回 {}
      getMonthLabelStyle(monthIndex) {
        if (this.isCurrentMonth(monthIndex)) {
          return {
            color: '#117bca'
          };
        }
        return {};
      },
      calcActiveDaysSimple() {
        let count = 0;
        this.months.forEach(monthObj => {
          monthObj.days.forEach(dateObj => {
            if (dateObj.empty) return;

            const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + dateObj.full) || {};
            if (dayData.isRestDay) return;

            if (dayData.templates && Object.keys(dayData.templates).length > 0) {
              count += 1;
            }
          });
        });
        this.activeDays = count;
      },
    }
  };
</script>

<style scoped>
  .year-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* 深色/浅色背景 */
  .light {
    background-color: #f5f5f5;
    color: #333333;
  }

  .dark {
    background-color: #121212;
    color: #f0f0f0;
  }

  /* 顶部导航 */
  .year-header {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: inherit;
    box-sizing: border-box;
    z-index: 1;
  }

  .year-title {
    font-size: 18px;
    font-weight: bold;
  }

  /* 年份页面主体滚动区域 */
  .year-body {
    flex: 1;
    margin-top: 15px;
  }

  /* 四行三列布局，用 flex-wrap 实现 */
  .year-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  /* 单个“月份”小块 */
  .month-block {
    width: 32%;
    /* 100% / 3 - margin （示例） */
    margin-bottom: 12px;
    border-radius: 8px;
    padding: 4px;
    box-sizing: border-box;
    background-color: inherit;
  }

  /* 月份文本 */
  .month-label {
    width: 100%;
    height: 24px;
    display: flex;
    align-items: center;
    padding-left: 4px;
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 10px;
  }

  /* 星期缩写行（小号字体） */
  .weekday-row-sm {
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
    margin: 2px 0;
  }

  .weekday-sm {
    font-size: 8px;
    width: calc(100% / 7 - 2px);
    text-align: center;
    color: #888;
  }

  /* 每个月的“天数”网格 */
  .month-days-grid {
    display: flex;
    flex-wrap: wrap;
  }

  .day-cell-sm {
    width: calc(100% / 7 - 2px);
    height: 20px;
    margin: 1px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
  }

  .day-text-sm {
    font-size: 10px;
    color: inherit;
  }

  .light .day-text-sm {
    color: #333333;
    /* 浅色模式下的默认文字色 */
  }

  .dark .day-text-sm {
    color: #f0f0f0;
    /* 深色模式下的默认文字色 */
  }
</style>