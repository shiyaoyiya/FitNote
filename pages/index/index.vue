<template>
  <view :class="['container', darkModeClass]">
    <!-- 顶部：年月 -->
    <view class="calendar-container" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view :key="monthKey">
        <view class="calendar-header">
          <text class="month-title" @click="goToYearPage">{{ curYear }}/{{ curMonth + 1 }}</text>
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
    </view>


    <!-- 底部：深色模式切换 + 重量显示 + 模板/动作 按钮 -->
    <view class="bottom-container">
      <view class="bottom-left">
        <view class="custom-switch" @click="toggleDarkMode">
          <view :class="['switch-track', darkMode ? 'track-checked' : '']"></view>
          <view :class="['switch-thumb', darkMode ? 'thumb-checked' : '']">
            <text class="emoji-thumb" :class="{ 'thumb-rotated': darkMode }">
              {{ darkMode ? '🌙' : '☀️' }}
            </text>
          </view>
        </view>
        <text class="round-btn help-btn" @click="goToHelp">备忘录</text>

      </view>
      <view class="bottom-center">
        <view class="weight-info">
          <text class="weight-line">本周：{{ thisWeekTotal }}kg</text>
          <text class="weight-line">上周：{{ lastWeekTotal }}kg</text>
        </view>
      </view>
      <view class="bottom-right">
        <text class="round-btn" @click="showTemplatePopup = true">模板</text>
        <text class="round-btn" @click="showActionPopup = true">动作</text>
      </view>
    </view>

    <!-- 底部：多条纪念日卡片以及新增按钮 -->
    <view class="anniv-list">
      <!-- 已有纪念日 -->
      <view v-for="(item, idx) in annivs" :key="idx" class="anniv-item" :class="darkModeClass"
        @click="openAnnivPopup(idx)" @longpress="onAnnivLongPress(idx)">
        <view class="anniv-header">
          <text>{{ item.title }} · {{ item.daysText }}</text>
        </view>
        <view class="anniv-sub">纪念日 | {{ item.date }}</view>
      </view>

      <!-- “＋” 按钮，用于新增 -->
      <view class="anniv-item add-anniv" @click="openAnnivPopup(null)">
        <text class="anniv-placeholder">＋ 添加纪念日</text>
      </view>
    </view>

    <!-- 动作管理弹窗 -->
    <view v-if="showActionPopup" class="popup-overlay" @click.self="showActionPopup = false">
      <view class="overlay-bg" @click="showActionPopup = false"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">管理动作</text>
          <text class="close-btn" @click="showActionPopup = false">×</text>
        </view>
        <view class="panel-body">
          <view class="input-row">
            <input v-model="newActionName" placeholder="输入新动作名称" class="action-input" />
            <text class="btn-add" @click="addAction">添加</text>
          </view>
          <scroll-view class="tag-scroll" scroll-y="true" show-scrollbar="false" :style="{ maxHeight: '30vh' }">
            <view class="tag-container">
              <view v-for="(act, idx) in actions" :key="idx" class="tag" @touchstart="handleTagTouchStart(idx)"
                @touchmove="handleTagTouchMove" @touchend="handleTagTouchEnd" @click="goToActionHistory(act)">
                <text class="tag-text-center">{{ act }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 模板管理弹窗 -->
    <view v-if="showTemplatePopup" class="popup-overlay" @click.self="showTemplatePopup = false">
      <view class="overlay-bg" @click="showTemplatePopup = false"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">快速创建模板</text>
          <text class="close-btn" @click="showTemplatePopup = false">×</text>
        </view>

        <view class="panel-body">
          <!-- 输入区 -->
          <view class="input-row">
            <input v-model="newTemplateName" placeholder="输入模板名称" class="action-input" />
            <text class="btn-add" @click="prepareNewTemplate">确认</text>
          </view>

          <!-- 模板区 -->
          <scroll-view class="template-tag-scroll" scroll-y="true" show-scrollbar="false"
            :style="{ maxHeight: '40vh' }">
            <view class="template-tag-container">

              <view v-for="(tpl, idx) in filteredTemplates" :key="tpl.id ? tpl.id : tpl.name" class="template-tag"
                :style="{ backgroundColor: tpl.color || '#ddd' }" @touchstart="handleTemplateTouchStart(idx)"
                @touchmove="handleTemplateTouchMove" @touchend="handleTemplateTouchEnd(idx)">
                <!-- 左：上移按钮 -->
                <button v-if="idx !== 0" class="move-btn left" @click.stop="moveTemplate(idx, -1)">
                  ↑
                </button>

                <!-- 模板主体 -->
                <view class="tag-body" @click="goToTemplateDetail(tpl.name)">
                  <text class="tag-text-center" :style="{ color: getContrastColor(tpl.color || '#ddd') }">
                    {{ tpl.name }}
                  </text>
                </view>

                <!-- 右：下移按钮 -->
                <button v-if="idx !== filteredTemplates.length - 1" class="move-btn right"
                  @click.stop="moveTemplate(idx, +1)">
                  ↓
                </button>
              </view>

              <view v-if="filteredTemplates.length === 0" class="no-data">
                <text>暂无模板，先添加一个吧~</text>
              </view>

            </view>
          </scroll-view>
        </view>
      </view>
    </view>




    <!-- 新建模板——选择动作 & 颜色 弹窗 -->
    <view v-if="showTemplateActionPopup" class="popup-overlay" @click.self="cancelNewTemplate">
      <view class="overlay-bg" @click="cancelNewTemplate"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">为模板 “{{ newTemplateName }}” 选择动作</text>
          <text class="close-btn" @click="cancelNewTemplate">×</text>
        </view>
        <scroll-view class="template-tag-scroll" scroll-y="true" show-scrollbar="false" :style="{ maxHeight: '30vh' }">
          <view class="panel-body">
            <!-- 自定义“可选动作列表” -->
            <scroll-view class="action-select-list" scroll-y>
              <view v-for="act in actions" :key="act" class="checkbox-row" @click="toggleTemplateAction(act)">
                <!-- 模拟一个复选框图标 -->
                <text class="checkbox-icon">
                  {{ newTemplateActions.includes(act) ? '✔️' : '◻️' }}
                </text>
                <text class="checkbox-label">{{ act }}</text>
              </view>
              <view v-if="actions.length===0" class="no-data">
                <text>暂无动作，请先在“动作”弹窗里添加</text>
              </view>
            </scroll-view>



            <view class="color-picker-row">
              <text>选择模板颜色：</text>
              <view class="color-options">
                <view v-for="(cObj, idx) in presetColors" :key="idx" class="color-option-item"
                  @click="newTemplateColor = cObj.value">
                  <!-- 圆形展示 -->
                  <view class="color-circle" :style="{ backgroundColor: cObj.value }">
                    <!-- 选中状态显示标记 -->
                    <view v-if="newTemplateColor === cObj.value" class="color-selected"></view>
                  </view>
                  <!-- 圆圈下方显示名称 -->
                  <text class="color-name">{{ cObj.name }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="panel-footer btn-row">
          <text class="btn-return" @click="cancelNewTemplate">返回</text>
          <text class="btn-confirm" @click="addTemplate">添加</text>
        </view>
      </view>
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
          <text class="btn-confirm" @click="saveAnniv">确认</text>
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

  export default {
    data() {
      return {
        // ========== 深色模式 ==========
        darkMode: false,
        darkModeClass: 'light',
        // ========== 日历相关 ==========
        curYear: 0,
        curMonth: 0,
        monthDays: [],
        monthKey: 0,
        touchStartX: 0,
        DAYDATA_PREFIX: 'fitness_daydata_',

        // ========== 弹窗 & 表单 ==========
        showActionPopup: false,
        newActionName: '',
        pressedActionIndex: -1,
        longPressTimer: null,
        longPressThreshold: 500,

        showTemplatePopup: false,
        newTemplateName: '',
        showTemplateActionPopup: false,
        newTemplateActions: [],
        newTemplateColor: '#93d5dc',
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
        pressedTemplateIndex: -1,

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
      }
    },
    computed: {
      actions() {
        return this.actionStore.actions
      },
      templates() {
        return this.templateStore.templates
      },
      filteredTemplates() {
        return (this.templates || []).filter(t => !t.isAerobic)
      }
    },
    created() {
      this.actionStore = useActionStore()
      this.actionStore.load()
      this.templateStore = useTemplateStore()
      this.templateStore.load()
    },
    onShow() {
      // 每次回来都刷新 store
      this.actionStore.load()
      this.templateStore.load()
      this.buildMonthDays(this.curYear, this.curMonth)
      this.calcWeeklyTotals()
      this.loadAnnivs()
    },
    onLoad(options) {
      // 保留并初始化 store（你的原逻辑）
      this.actStore = useActionStore()
      this.actStore.load()
      this.actions = this.actStore.actions
      this.tplStore = useTemplateStore()
      this.tplStore.load()

      // 读取外部传参（来自 year 页），优先使用传参
      const now = new Date()
      // 注意：options.month 预期是 0-11
      this.curYear = (options && options.year) ? Number(options.year) : now.getFullYear()
      this.curMonth = (options && (typeof options.month !== 'undefined')) ? Number(options.month) : now.getMonth()

      // 根据 curYear/curMonth 初始化视图（确保立即渲染正确的月份）
      this.buildMonthDays(this.curYear, this.curMonth)
      this.calcWeeklyTotals()
      this.loadAnnivs()
    },

    mounted() {
      // 深色模式
      const dm = uni.getStorageSync('darkMode')
      if (dm === 'auto') {
        const sys = uni.getSystemInfoSync().theme || 'light'
        this.darkMode = sys === 'dark'
      } else {
        this.darkMode = dm === true
      }
      this.darkModeClass = this.darkMode ? 'dark' : 'light'
      this.updateNavigationBarStyle(this.darkMode)
      // —— 日历初始化：只有在 onLoad 没设置 curYear/curMonth 时，才使用当前日期初始化
      // 如果 onLoad 已经把 curYear/curMonth 设好（例如从 year 页传参），就用它们。
      if (typeof this.curYear === 'undefined' || this.curYear === 0) {
        this.initCalendar()
      } else {
        // 确保视图与数据同步（onLoad 里也会调用，但防护无妨）
        this.buildMonthDays(this.curYear, this.curMonth)
      }
      this.tplStore = useTemplateStore()
      this.tplStore.load()
      this.templates = this.tplStore.templates
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
        const raw = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
        return raw.isRestDay === true;
      },
      // 拿出休息理由
      getRestReason(fullDate) {
        const raw = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
        return raw.restReason || '';
      },
      toggleTemplateAction(act) {
        const i = this.newTemplateActions.indexOf(act);
        if (i === -1) {
          // **点选**：push 到末尾，保证顺序
          this.newTemplateActions.push(act);
        } else {
          // **取消**：从数组里 splice 掉
          this.newTemplateActions.splice(i, 1);
        }
        console.log('当前 newTemplateActions 顺序:', this.newTemplateActions);
      },
      toggleCheckbox(act) {
        // 这里模拟点某行时，先用原来的 onTemplateActionsChange 逻辑让 group 重算一次
        // 然后在 nextTick 去读取 ref 的值
        this.$nextTick(() => {
          const checked = this.$refs.cg.value;
          // 某些平台可能需要 this.$refs.cg.getValues()
          this.newTemplateActions = checked.slice();
          console.log('同步后 newTemplateActions=', this.newTemplateActions);
        });
      },
      goToHelp() {
        uni.navigateTo({
          url: '/pages/help/help'
        });
      },
      // 新增：点击“年/月”标题，跳转到年份页面
      goToYearPage() {
        // 立即显示加载提示
        uni.showLoading({
          title: '加载中...',
          mask: true
        });

        // 使用 Promise 确保跳转和加载逻辑
        setTimeout(() => {
          uni.navigateTo({
            url: `/pages/year/year?year=${this.curYear}&month=${this.curMonth}`,
            success: () => {
              console.log('跳转到年页面成功');
              // 不在这里隐藏 loading，让年页面自己控制
            },
            fail: (err) => {
              console.error('跳转到年页面失败:', err);
              uni.hideLoading();
              uni.showToast({
                title: '跳转失败',
                icon: 'none'
              });
            }
          });
        }, 50);
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
      // 新增：点击模板标签后跳转到 模板详情 页面
      goToTemplateDetail(tplName) {
        this.showTemplatePopup = false;
        uni.navigateTo({
          url: `/pages/templateDetail/templateDetail?template=${encodeURIComponent(tplName)}`
        });
      },
      // ========== 新增方法：获取某天的“最后一个模板名称”（如果存在） ==========
      getTemplateName(fullDate) {
        // 从本地 storage 读取当日数据
        const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
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
        const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
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
      },
      // ================= 深色模式 =================
      toggleDarkMode() {
        const persist = uni.getStorageSync('darkMode');
        if (persist === 'auto') {
          this.darkMode = !this.darkMode;
          uni.setStorageSync('darkMode', this.darkMode);
        } else {
          uni.setStorageSync('darkMode', 'auto');
          const sysTheme = uni.getSystemInfoSync().theme || 'light';
          this.darkMode = sysTheme === 'dark';
        }
        this.darkModeClass = this.darkMode ? 'dark' : 'light';
        this.updateNavigationBarStyle(this.darkMode);
      },
      // 点击 Emoji 开关：先播放关键帧 jumpRotate，不立刻切主题
      onEmojiTap() {
        if (this.animateJump) return;
        this.darkMode = !this.darkMode;
        uni.setStorageSync('darkMode', this.darkMode);
        this.darkModeClass = this.darkMode ? 'dark' : 'light';
        this.updateNavigationBarStyle(this.darkMode);
        this.animateJump = true;
      },
      onAnimationEnd(evt) {
        this.animateJump = false;
      },
      updateNavigationBarStyle(isDark) {
        const bgColor = isDark ? '#121212' : '#FFFFFF';
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

      // ================= 日历相关 =================
      initCalendar() {
        const today = new Date();
        this.curYear = today.getFullYear();
        this.curMonth = today.getMonth();
        this.buildMonthDays(this.curYear, this.curMonth);
      },
      buildMonthDays(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const arr = [];
        const todayStr = this.formatDate(new Date());

        // 1. 计算当月第一天是星期几：0=周日，1=周一…6=周六
        const firstWeekday = new Date(year, month, 1).getDay();
        // 2. 在数组前面插入 firstWeekday 个“空位”
        for (let i = 0; i < firstWeekday; i++) {
          arr.push({
            key: `empty-${year}-${month}-${i}`,
            day: '',
            full: '',
            isToday: false,
            isEmpty: true
          });
        }
        // 3. 插入每一天
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
        this.monthDays = arr;
        this.calcWeeklyTotals();
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
        this.touchStartX = e.changedTouches[0].clientX;
      },
      onTouchEnd(e) {
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        if (dx > 50) this.prevMonth();
        else if (dx < -50) this.nextMonth();
      },
      prevMonth() {
        let y = this.curYear,
          m = this.curMonth - 1;
        if (m < 0) {
          y -= 1;
          m = 11;
        }
        this.curYear = y;
        this.curMonth = m;
        this.monthKey += 1;
        this.buildMonthDays(y, m);
      },
      nextMonth() {
        let y = this.curYear,
          m = this.curMonth + 1;
        if (m > 11) {
          y += 1;
          m = 0;
        }
        this.curYear = y;
        this.curMonth = m;
        this.monthKey += 1;
        this.buildMonthDays(y, m);
      },
      handleDateClick(full) {
        const key = this.DAYDATA_PREFIX + full;
        const dayData = uni.getStorageSync(key) || {};
        // 👉 如果是休息日，弹出休息日详情弹窗
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
              uni.showToast({
                title: '已清空',
                icon: 'none'
              });
              this.buildMonthDays(this.curYear, this.curMonth);
              this.calcWeeklyTotals();
            }
          }
        });
      },
      hasDataForDate(full) {
        return !!uni.getStorageSync(this.DAYDATA_PREFIX + full);
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
      calcTotalInRange(start, end) {
        const s = new Date(start);
        const e = new Date(end);
        let sum = 0;

        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          const full = this.formatDate(d);
          const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + full) || {};
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

        return sum;
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

      // ========== 动作管理 ==========
      addAction() {
        const name = this.newActionName.trim()
        if (!name) {
          uni.showToast({
            title: '请输入动作名称',
            icon: 'none'
          })
          return
        }
        if (this.actStore.actions.includes(name)) {
          uni.showToast({
            title: '动作已存在',
            icon: 'none'
          })
          this.newActionName = ''
          return
        }
        this.actStore.addAction(name)
        this.newActionName = ''
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
        clearTimeout(this.longPressTimer)
        this.pressedActionIndex = -1
      },
      handleTagLongPress(idx) {
        const act = this.actionStore.actions[idx] // 用 this.actionStore 而不是 actStore，也不要用 index
        uni.vibrateShort({
          type: 'light'
        })
        uni.showModal({
          title: '删除动作',
          content: `确定要删除「${act}」吗？`,
          success: res => {
            if (res.confirm) {
              // 从 store 里删除
              this.actionStore.removeActionByIndex(idx)
              // 并且让弹窗自动收起
              // （因为 computed 会重新读取 this.actionStore.actions）
            }
          }
        })
        this.pressedActionIndex = -1
        clearTimeout(this.longPressTimer)
      },

      goToActionHistory(act) {
        this.showActionPopup = false
        uni.navigateTo({
          url: `/pages/actionHistory/actionHistory?action=${encodeURIComponent(act)}`
        })
      },


      // —— 模板管理 —— 
      moveTemplate(filteredIdx, delta) {
        const filt = this.filteredTemplates;
        if (!filt || filteredIdx < 0 || filteredIdx >= filt.length) return;

        const tplName = filt[filteredIdx].name;
        const globalIdx = this.templateStore.templates.findIndex(t => t.name === tplName);
        if (globalIdx === -1) return;

        const newIdx = globalIdx + delta;
        if (newIdx < 0 || newIdx >= this.templateStore.templates.length) return;

        // 调整模板顺序
        const arr = this.templateStore.templates.slice();
        const [moved] = arr.splice(globalIdx, 1);
        arr.splice(newIdx, 0, moved);

        // 写回 store
        this.templateStore.templates = arr;
        if (typeof this.templateStore.save === 'function') {
          this.templateStore.save();
        } else {
          uni.setStorageSync(this.TEMPLATES_KEY, arr);
        }

        // 同步视图
        this.templates = arr;
      },


      prepareNewTemplate() {
        const name = this.newTemplateName.trim()
        if (!name) {
          uni.showToast({
            title: '请输入模板名称',
            icon: 'none'
          })
          return
        }
        if (this.tplStore.templates.some(t => t.name === name)) {
          uni.showToast({
            title: '模板已存在',
            icon: 'none'
          })
          this.newTemplateName = ''
          return
        }
        // 1) 在 Pinia 里新增一个模板（空动作/空色）
        this.tplStore.addTemplate(name)
        // 2) 刷新本地列表
        this.templates = this.tplStore.templates
        // 3) 进入动作+颜色选择阶段
        this.showTemplatePopup = false
        this.showTemplateActionPopup = true
        this.newTemplateActions = []
        this.newTemplateColor = this.presetColors[0].value
      },

      cancelNewTemplate() {
        this.showTemplateActionPopup = false
        this.showTemplatePopup = true
        this.newTemplateName = ''
        this.newTemplateActions = []
        this.newTemplateColor = this.presetColors[0].value
      },

      addTemplate() {
        // 从 newTemplateActions/newTemplateColor 写回当前刚创建的模板
        const name = this.newTemplateName.trim()
        const tpl = this.tplStore.templates.find(t => t.name === name)
        if (!tpl) return
        tpl.actions = [...this.newTemplateActions]
        tpl.color = this.newTemplateColor
        this.tplStore.save()
        // 刷新模板列表
        this.templates = this.tplStore.templates
        uni.showToast({
          title: '模板创建成功',
          icon: 'success'
        })
        // 关闭弹窗
        this.showTemplateActionPopup = false
        this.newTemplateName = ''
        this.newTemplateActions = []
      },

      goToTemplateDetail(name) {
        this.showTemplatePopup = false
        uni.navigateTo({
          url: `/pages/templateDetail/templateDetail?template=${encodeURIComponent(name)}`
        })
      },

      // —— 模板标签长按删除 —— 
      // 触摸开始：记录按下的模板名，并启动长按定时器
      handleTemplateTouchStart(filteredIdx) {
        this.pressedTemplateIndex = filteredIdx
        clearTimeout(this.longPressTimer)
        this.longPressTimer = setTimeout(() => this.handleTemplateLongPress(filteredIdx), this.longPressThreshold)
      },
      handleTemplateTouchMove() {
        clearTimeout(this.longPressTimer)
      },
      handleTemplateTouchEnd(filteredIdx) {
        clearTimeout(this.longPressTimer)
        this.pressedTemplateIndex = -1
      },

      handleTemplateLongPress(filteredIdx) {
        const filt = this.filteredTemplates
        if (!filt || filteredIdx < 0 || filteredIdx >= filt.length) return
        const tpl = filt[filteredIdx]

        uni.vibrateShort({
          type: 'light'
        })

        uni.showModal({
          title: '删除模板',
          content: `确定删除「${tpl.name}」吗？`,
          success: res => {
            if (res.confirm) {
              // 在删除模板前，先保存颜色信息到相关日期数据中
              this.backupTemplateColorToDayData(tpl.name, tpl.color);

              // 然后删除模板
              if (typeof this.templateStore.removeTemplate === 'function') {
                this.templateStore.removeTemplate(tpl.id || tpl.name)
              } else {
                const gIdx = this.templateStore.templates.findIndex(t => t.name === tpl.name)
                if (gIdx !== -1) {
                  this.templateStore.templates.splice(gIdx, 1)
                  if (typeof this.templateStore.save === 'function') this.templateStore.save()
                  else uni.setStorageSync(this.TEMPLATES_KEY, this.templateStore.templates)
                }
              }

              this.templates = this.templateStore.templates
            }
          }
        })

        this.pressedTemplateIndex = -1
        clearTimeout(this.longPressTimer)
      },

      // 新增方法：在删除模板前备份颜色信息到日期数据中
      backupTemplateColorToDayData(templateName, templateColor) {
        if (!templateColor) return;

        // 获取所有日期键
        const storageInfo = uni.getStorageInfoSync();
        const dayKeys = storageInfo.keys.filter(key => key.startsWith(this.DAYDATA_PREFIX));

        dayKeys.forEach(key => {
          const dayData = uni.getStorageSync(key) || {};
          if (dayData.templates && dayData.templates[templateName]) {
            // 如果该日期使用了这个模板，保存颜色信息
            if (!dayData.color) {
              dayData.color = templateColor;
              uni.setStorageSync(key, dayData);
            }

            // 同时保存到模板数据中
            if (dayData.templates[templateName] && !dayData.templates[templateName].color) {
              dayData.templates[templateName].color = templateColor;
              uni.setStorageSync(key, dayData);
            }
          }
        });
      },

      // goToTemplateDetail 保持不变（但确保传入模板名而不是 filtered idx）
      goToTemplateDetail(name) {
        this.showTemplatePopup = false
        uni.navigateTo({
          url: `/pages/templateDetail/templateDetail?template=${encodeURIComponent(name)}`
        })
      },

      // （可选）关闭弹窗简便方法
      closeTemplatePopup() {
        this.showTemplatePopup = false
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
      goToActionHistory(actName) {
        this.showActionPopup = false;
        uni.navigateTo({
          url: `/pages/actionHistory/actionHistory?action=${encodeURIComponent(actName)}`
        });
      },
      // ==== 新增：根据日期拿模板颜色 ====
      getTemplateColor(fullDate) {
        // 1) 先读当天的 dayData
        const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};

        // 2) 如果是休息日且有 color 字段，就用它
        if (dayData.isRestDay && dayData.color) {
          return dayData.color;
        }

        // 3) 如果有全局 color 字段，优先使用
        if (dayData.color) {
          return dayData.color;
        }

        // 4) 再看 templates 里最后一个 tplName 有没有自带 color
        if (dayData.templates) {
          const tplNames = Object.keys(dayData.templates);
          if (tplNames.length) {
            const last = tplNames[tplNames.length - 1];
            const tplObj = dayData.templates[last];
            if (tplObj && tplObj.color) {
              return tplObj.color;
            }
          }
        }

        // 5) 最后回退到全局模板列表里的默认色（如果模板已被删除，这里会返回空）
        const tplName = this.getTemplateName(fullDate);
        if (!tplName) return '';

        // 修改：即使全局模板列表中找不到，也要保持原来的颜色逻辑
        const global = this.templates.find(t => t.name === tplName);
        if (global && global.color) {
          return global.color;
        }

        // 新增：如果全局模板列表中找不到，但当天数据中有模板记录，使用默认颜色
        if (dayData.templates && Object.keys(dayData.templates).length > 0) {
          // 返回一个默认颜色，或者从预设颜色中取第一个
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
        // 1) 更新“当日”存储里的模板 color
        const key = this.DAYDATA_PREFIX + this.aerobicDetail.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          ...raw
        };
        const tpl = dayData.templates[this.aerobicDetail.name] || {};
        tpl.color = color;
        dayData.templates[this.aerobicDetail.name] = tpl;
        uni.setStorageSync(key, dayData);

        // 2) 更新页面 state
        this.aerobicDetail.color = color;
        this.showAerobicColorPicker = false;
        this.showAerobicDetail = false;
        uni.showToast({
          title: '已保存颜色',
          icon: 'success'
        });
        // 3) 立即刷新日历
        this.buildMonthDays(this.curYear, this.curMonth);
      },
      isAerobicDay(fullDate) {
        const dayData = uni.getStorageSync(this.DAYDATA_PREFIX + fullDate) || {};
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
  /* ================= 整体容器：min-height + 隐藏滚动条 ================= */
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
  }

  /* ========== 主题色 ==========*/
  .container.light {
    background-color: #ffffff;
    background-color: #f5f5f5;
    color: #333333;
  }

  .container.dark {
    background-color: #121212;
    color: #f7f7f7;
  }

  /* ========== 日历样式 ========== */
  .calendar-container {
    width: 100vw;
    /* border: 1px #000 solid; */
    border-radius: 0 0 15px 15px;
    background-color: #fff;
  }

  .container.dark .calendar-container {
    background-color: #121212;
  }

  .calendar-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 18px;
    margin-left: 20px;
    margin-top: 30px;
  }

  .month-title {
    font-size: 34px;
    font-weight: bold;
    color: inherit;
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

  /* 新增：模板名称显示为小字，居中，深色模式下字体微调 */
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

  /* ========== 底部区域 ========== */
  .bottom-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 12px 8px;
    /* border: 1px #000 solid; */
    border-radius: 15px;
    margin: 10px;
    background-color: #fff;
  }

  .container.dark .bottom-container {
    background-color: #2e2e2e;
  }

  .bottom-left {
    width: 20%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }

  .theme-toggle {
    font-size: 24px;
  }

  .bottom-center {
    width: 60%;
    display: flex;
    justify-content: center;
  }

  .weight-info {
    text-align: center;
  }

  .weight-line {
    display: block;
    font-size: 16px;
  }

  .bottom-right {
    width: 20%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .round-btn {
    width: 60px;
    height: 60px;
    border-radius: 30px;
    /* background-color: #379bff; */
    color: #2e2e2e;
    font-size: 14px;
    text-align: center;
    line-height: 60px;
    margin-bottom: 10px;
    background: linear-gradient(10deg, #0048ff, #93d5dc);
    /* box-shadow: 0 5px 0 0 #002fa7; */
    background-size: 400%;
    transition: all .05s ease;

  }

  .container.dark .round-btn {
    color: #fff;
  }

  .round-btn:active {
    /* box-shadow: 0 1px 0 0 #93d5dc;
    transform: translateY(4px); */
    transform: scale(0.95);
    /* box-shadow: 0 1px 0 0 #93d5dc; */
    /* 拟态风 */
    box-shadow:
      inset -5px -5px 15px rgba(255, 255, 255, .5),
      inset 5px 5px 5px rgba(70, 70, 70, .7);
    /* box-shadow:
      inset -5px -5px 15px rgba(255, 255, 255, .5),
      inset 0 0 10px 5px rgba(70, 70, 70, 0.7); */
  }

  /* ========== 多条纪念日卡片 ========== */
  .anniv-list {
    width: 90vw;
    max-width: 360px;
    margin: 16px auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .container.dark .anniv-item {
    background-color: #2e2e2e;
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

  /* 删除按钮（右上角） */
  .delete-anniv {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 18px;
    color: #999;
  }

  /* “＋ 添加” 卡片 */
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

  /* ========== 弹窗（弹出层） ========== */
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
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
  }

  .popup-panel {
    position: relative;
    width: 80vw;
    max-width: 320px;
    max-height: 50vh;
    background-color: #fff;
    background-color: #f5f5f5;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1001;
  }

  .container.dark .popup-panel {
    background-color: #2e2e2e;
  }

  .panel-title {
    font-size: 16px;
    font-weight: bold;
  }

  .close-btn {
    font-size: 20px;
    color: #999;
  }

  .panel-header {
    position: relative;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-header::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 296px;
    height: 1px;
    background-color: #c8c8c8;
  }

  .panel-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
  }

  .btn-add {
    background-color: #379bff;
    color: #fff;
    padding: 0 20px;
    height: 36px;
    border-radius: 5px;
    text-align: center;
    line-height: 36px;
    margin-left: 5px;
  }

  .tag-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    background-color: #e0e0e0;
    padding: 10px 20px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 60vw;
  }

  .container.dark .tag {
    background-color: #505050;
  }

  .tag-text-center {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  /* ========== 模板管理弹窗专用样式 ========== */
  .template-tag-scroll {
    flex: 1;
    min-height: 0;
    /* 重要：让滚动区域可以收缩 */
  }

  .template-tag-container {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
    /* 上下留点内边距 */
  }

  /* 模板标签样式 - 完全重写 */
  .template-tag {
    position: relative;
    display: flex;
    align-items: center;
    background-color: #fff;
    border-radius: 10px;
    min-height: 44px;
    /* 最小高度 */
    padding: 8px 44px;
    /* 调整内边距 */
    margin: 0 12px 6px 12px;
    /* 只设置底部外边距 */
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .container.dark .template-tag {
    background-color: #505050;
  }

  /* 标签主体内容 */
  .tag-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    /* 重要：允许内容收缩 */
    padding: 4px 0;
    /* 内部上下留白 */
  }

  .tag-text-center {
    font-size: 15px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    /* 防止文本溢出 */
  }

  /* 移动按钮样式 */
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

  /* 无数据提示 */
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

  /* 弹窗面板高度优化 */
  .popup-panel {
    max-height: 70vh !important;
    /* 增加最大高度 */
    min-height: 200px;
    /* 设置最小高度 */
  }

  .panel-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* 重要：让内容区域可以收缩 */
  }

  /* 输入行样式 */
  .input-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    flex-shrink: 0;
    /* 防止输入行被压缩 */
  }

  .action-input {
    flex: 1;
    height: 36px;
    padding: 0 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
  }

  .container.dark .action-input {
    border-color: #555;
    background-color: #3a3a3a;
    color: #fff;
  }

  .btn-add {
    background-color: #379bff;
    color: #fff;
    padding: 0 16px;
    height: 36px;
    border-radius: 6px;
    text-align: center;
    line-height: 36px;
    margin-left: 8px;
    font-size: 14px;
    flex-shrink: 0;
  }

  /* 滚动条样式优化 */
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

  /* ========== 颜色选择行 ========== */
  .color-picker-row {
    flex-direction: row;
    align-items: center;
    margin-top: 12px;
  }

  /* 外层容器：水平排列多个带文字的“颜色小块” */
  .color-options {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-left: 8px;
  }

  /* 每个颜色选项独占一列，内容垂直排列 */
  .color-option-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }

  /* 圆形小块 */
  .color-circle {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    position: relative;
    border: 1px solid #ccc;
  }

  /* 选中状态小圆标记 */
  .color-selected {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 16px;
    height: 16px;
    border-radius: 8px;
    background-color: #fff;
  }

  /* 圆形下方的小字（颜色名称） */
  .color-name {
    margin-top: 4px;
    font-size: 12px;
    color: #333;
  }

  /* 深色模式下调整文字颜色 */
  .container.dark .color-name {
    color: #f7f7f7;
  }

  .btn-row {
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  .btn-return,
  .btn-confirm {
    background-color: #379bff;
    color: #fff;
    padding: 0 20px;
    height: 36px;
    width: 60px;
    border-radius: 5px;
    text-align: center;
    line-height: 36px;
    margin-bottom: 10px;
  }

  /* ========== 纪念日 弹窗 ========== */
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
    background-color: #2e2e2e;
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
    width: 296px;
    height: 1px;
    background-color: #c8c8c8;
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

  .input-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 12px;
  }

  .action-input {
    flex: 1;
    height: 36px;
    padding: 0 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  .anniv-item {
    border-radius: 20rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    background-color: #fff;
    transition: background-color 0.3s;
    /* border: #000 1px solid; */

  }

  .anniv-item:active {
    background-color: #e0e0e0;
  }

  /* ========== 新增：在日期格子上方显示当日总重量（小字号、居中） ========== */
  .weight-text {
    font-size: 10px;
    margin-bottom: -4px;
    text-align: center;
    width: 100%;
  }

  /* ====== 自制滑动开关 样式 ====== */
  .custom-switch {
    margin-top: 15px;
    /* 根据需要调整 */
    width: 60px;
    height: 30px;
    position: relative;
    display: inline-block;
    /* 确保有点击区域 */
    margin-bottom: 15px;
  }

  /* 轨道 */
  .switch-track {
    width: 100%;
    height: 100%;
    background-color: #3a3256;
    border-radius: 15px;
    transition: background-color 0.3s;
    z-index: 1;
  }

  .track-checked {
    background-color: #f5f5f5;
  }

  /* 滑块：外层容器 */
  .switch-thumb {
    position: absolute;
    top: 2px;
    /* 让滑块垂直居中 */
    left: 2px;
    /* 未选中时在左侧 */
    width: 26px;
    /* = 轨道高度 30 - 上下边距 2*2 */
    height: 26px;
    background-color: transparent;
    /* 背景改为透明，因为实际用 Emoji */
    border-radius: 50%;
    transition: left 0.3s ease;
    z-index: 2;
  }

  /* 滑块选中时移到右侧 */
  .thumb-checked {
    left: 32px;
    /* = 60 - 26 - 2 */
  }

  /* 滑块内部 Emoji 样式 */
  .emoji-thumb {
    display: block;
    width: 100%;
    height: 100%;
    font-size: 22px;
    /* Emoji 大小可调 */
    line-height: 22px;
    /* 垂直居中 */
    text-align: center;
    /* 水平居中 */
    transition: transform 0.3s ease;
  }

  /* 当 darkMode === true 时，加上旋转样式 */
  .thumb-rotated {
    transform: rotate(360deg);
  }

  /* （可选）深色模式下可以微调 Emoji 颜色或阴影 */
  .container.dark .emoji-thumb {
    /* 例如加白色阴影： */
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }

  /* === 结束 自制滑动开关 样式 === */
  /* ====== 新版：Emoji 旋转开关 样式 ====== */
  .emoji-switch {
    margin-top: 8px;
    /* 距离上方 Emoji 切换文字可自行调整 */
    width: 32px;
    /* 宽度可根据 Emoji 大小适当调整 */
    height: 32px;
    /* 高度与宽度保持一致，方便居中 */
    display: flex;
    align-items: center;
    justify-content: center;
    /* 可选：给点击区域加一点 padding，扩大可点范围 */
    padding: 8px;
  }

  .emoji-icon {
    display: inline-block;
    font-size: 24px;
    /* Emoji 大小 */
    /* transition: transform 0.3s ease; */
    /* 旋转过渡效果 */
  }

  /* translate-rotate 类：点击时让 Emoji 跳起并旋转到 180° */
  /* .translate-rotate {
    transform: translateY(-20px) rotate(180deg);
  } */

  /* 当 darkMode === true 时，加上 rotated 类，让 Emoji 旋转 180° */
  /* .rotated {
    transform: rotate(180deg);
  } */

  /* 深色模式时，如果想让 Emoji 颜色或阴影不同，也可在这里写 */
  .container.dark .emoji-icon {
    /* 例如：color: #f7f7f7; */
  }

  /* 关键帧动画：跳起并旋转到 180° */
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

  /* 只要给 Emoji 加上 .animate-emoji，就会播放 jumpRotate 动画 */
  .animate-emoji {
    animation: jumpRotate 0.3s linear forwards;
  }

  /* ========== 重点：让复选框列表响应式多列 ========== */
  .action-select-list {
    display: flex;
    flex-wrap: wrap;
    margin: -4px;
  }

  .checkbox-row {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    margin: 4px;
    padding: 6px 8px;
    background: #e0e0e0;
    border-radius: 8px;
  }

  .container.dark .checkbox-row {
    background-color: #505050;
  }

  /* 让复选框与文字之间留一点空隙 */
  .checkbox-input {
    margin-right: 0px;
  }

  /* 容器水平换行，平均分布 */
  .aerobic-color-picker {
    flex-wrap: wrap;
    flex-direction: row;
    margin-top: 10px;
    justify-content: space-around;
  }

  /* 每个选项垂直布局 */
  .color-option-item {
    align-items: center;
    margin: 5px;
  }

  /* 圆形色块 */
  .color-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    position: relative;
  }

  /* 选中时中间的小对勾或高亮圈 */
  .color-selected {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
    border: 2px solid #fff;
    border-radius: 50%;
  }

  /* 颜色名称文本 */
  .color-name {
    font-size: 12px;
    margin-top: 4px;
    color: #333;
  }

  /* 设置颜色按钮 */
  .btn-set-color {
    margin-top: 12px;
    color: #379bff;
  }

  /*苹果拟态风 */
  .round-btn {
    box-shadow:
      -5px -5px 10px rgba(255, 255, 255, .1),
      5px 5px 10px rgba(70, 70, 70, .5),
      inset 5px 5px 15px rgba(255, 255, 255, .5),
      inset -5px -5px 15px rgba(70, 70, 70, .7);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);

  }
</style>