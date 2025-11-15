<template>
  <view :class="['container', darkModeClass]">
    <!-- ========== 自定义“选择模板”弹窗（页面加载时自动弹出） ========== -->
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

    <!-- ========== 模板动作列表 & 输入框 & 对比文本 ========== -->
    <!-- 外层滚动区只负责上下滑动 -->
    <scroll-view class="action-list" scroll-y="true">
      <view v-for="(actName, idx) in chosenActions" :key="actName" class="action-row">
        <view class="row-top">

          <!-- 点击/长按标签的事件 -->
          <view class="tag-group">
            <view class="move-controls">
              <button @click="moveAction(idx, -1)" :disabled="idx === 0">↑</button>
              <button @click="moveAction(idx, +1)" :disabled="idx === chosenActions.length - 1">↓</button>
            </view>
            <text class="tag" @click="goHistory(idx)" @longpress="handleTagLongPress(idx)">{{ actName }}</text>
          </view>
          <view class="input-pair">
            <input type="digit" v-model="actionInputs[idx].reps" placeholder="次数" class="input-reps" />
            <text class="input-mult">×</text>
            <input type="number" decimal-length="1" v-model="actionInputs[idx].weight" placeholder="kg"
              class="input-weight" @blur="confirmEntry(idx)" />
            <button class="confirm-btn" @click="confirmEntry.bind(this, idx)">✓️</button>
          </view>
        </view>

        <!-- 明细列表 -->
        <view v-if="actionEntries[idx]?.length > 0" class="action-entries">
          <view v-for="(item, eidx) in actionEntries[idx]" :key="eidx" class="entry-row"
            @touchstart="handleEntryTouchStart(idx, eidx)" @touchmove="handleEntryTouchMove"
            @touchend="handleEntryTouchEnd">
            <text class="entry-index">第{{ eidx + 1 }}组：</text>
            <text class="entry-text">{{ item.input }}kg</text>
          </view>
        </view>

        <!-- 对比信息 -->
        <view class="action-diff" v-if="diffs[idx] !== null">
          <text class="total-weight">
            总容量：{{ getTotalWeight(idx) }}kg
          </text>
          <text>与上次相比：</text>
          <text :class="diffs[idx].class">{{ diffs[idx].text }}</text>
        </view>
      </view>
    </scroll-view>



    <!-- ========== 底部按钮行：保存 + 添加动作 ========== -->
    <view class="save-row">
      <button @click="openTimerPopup">⏱ 计时器</button>
      <button class="add-action-btn" @click="openAddActionPopup">添加动作</button>
    </view>

    <!-- ========== 新增：选择动作弹窗 ========== -->
    <view v-if="showAddActionPopup" class="popup-overlay" @click.self="closeAddActionPopup">
      <view class="overlay-bg" @click="closeAddActionPopup"></view>
      <view class="modal-panel fade-in">
        <view class="modal-header">
          <text class="modal-title">选择要添加的动作</text>
          <view class="search-wrapper">
            <text v-if="!isSearching" class="search-trigger"
              @click="isSearching = true; $nextTick(() => $refs.searchInput && $refs.searchInput.focus())">搜索</text>
            <input v-else ref="searchInput" v-model="searchKeyword" class="search-input" placeholder="输入关键词"
              @input="filterAvailableActions" />
            <text v-if="isSearching && searchKeyword" class="clear-search" @click="clearSearch">清空</text>
          </view>
          <text class="close-icon" @click="closeAddActionPopup">×</text>
        </view>
        <view class="modal-body">
          <scroll-view class="action-select-list" scroll-y="true" show-scrollbar="false">
            <view v-for="(act, idx) in filteredActions" :key="idx" class="action-tag"
              :class="{ selected: selectedActionIdx === idx }" @click="selectAction(idx)">
              <text>{{ act }}</text>
            </view>
            <view v-if="filteredActions.length === 0" class="no-data">
              <text>暂无动作，请先在首页添加</text>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer">
          <button @click="addSelectedAction">确认添加</button>
        </view>
      </view>
    </view>
    <!-- 计时器弹窗 -->
    <view v-if="showTimerPopup" class="timer-overlay">
      <view class="timer-panel">
        <view class="timer-body">
          <!-- Canvas 圆环倒计时 -->
          <canvas canvas-id="timerCanvas"
            style="width:250px; height:250px; background:transparent; border-radius:50%;"></canvas>
          <view class="time-text">{{ displayTime }}</view>
        </view>
        <view class="timer-footer">
          <button @click.stop="adjustDuration(-10)">－10s</button>
          <button @click.stop="adjustDuration(+10)">＋10s</button>
          <button @click.stop="completeTimer">完成</button>
        </view>
      </view>
    </view>
    <!-- 有氧弹窗 -->
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
            <input v-model.number="aerobicTime" type="number" placeholder="时长（分钟）" class="action-input" />
          </view>
          <!-- 分割线 -->
          <view class="divider"></view>
          <!-- 新增：历史有氧模板 -->
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
    <!-- 休息日理由弹窗 -->
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

  </view>
</template>
<script>
  export default {
    data() {
      return {
        date: '',
        darkMode: false,
        darkModeClass: 'light',
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
        selectedActionIdx: null,
        longPressTimer: null,
        longPressThreshold: 500,
        pressedEntry: {
          actionIdx: -1,
          entryIdx: -1
        },
        showTimerPopup: false,
        timerDuration: 60,
        remaining: 60,
        canvasCtx: null,
        timerInterval: null,
        arcTime: 270, // 对应 0 秒起点角度
        angle: 0,
        endTimestamp: 0,
        notified: false, // 是否已提醒过
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
        // 搜索相关
        isSearching: false,
        searchKeyword: '',
        filteredActions: [],
        selectedActionIdx: null,
      };
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
      // 初始化音频实例（请把 'notification.mp3' 换成你项目里的实际路径）
      const audio = uni.createInnerAudioContext();
      audio.src = '/static/notification.mp3';
      audio.loop = false;
      this.audioCtx = audio;
    },
    onLoad(options) {
      // 解析路由参数 date（确保格式为 'YYYY-MM-DD'）
      if (options.date) {
        this.date = options.date;
      } else {
        const now = new Date();
        this.date = this.formatDate(now);
        console.warn(`[Debug] onLoad 没传 date，默认用今天 = ${this.date}`);
      }
    },
    mounted() {
      // ===== 初始化深色模式 =====
      const persist = uni.getStorageSync('darkMode');
      if (persist === 'auto') {
        const sysTheme = uni.getSystemInfoSync().theme || 'light';
        this.darkMode = sysTheme === 'dark';
      } else {
        this.darkMode = persist === true;
      }
      this.darkModeClass = this.darkMode ? 'dark' : 'light';
      this.updateNavigationBarStyle(this.darkMode);
      this.loadDayData();
    },
    methods: {
      loadDayData() {
        // 1. 同步 NavigationBar 标题
        uni.setNavigationBarTitle({
          title: this.date.replace(/-/g, '/')
        })

        // 2. 读全局模板列表
        const tplArr = uni.getStorageSync(this.TEMPLATES_KEY)
        this.templates = Array.isArray(tplArr) ? tplArr : []

        // 3. 读当天存储
        const key = this.DAYDATA_PREFIX + this.date
        const raw = uni.getStorageSync(key) || {}
        const dayData = {
          templates: (raw.templates && typeof raw.templates === 'object') ? raw.templates : {},
          actions: (raw.actions && typeof raw.actions === 'object') ? raw.actions : {},
          entries: (raw.entries && typeof raw.entries === 'object') ? raw.entries : {}
        }

        // 4. 如果没绑定任何模板，就弹“选模板”，并预加载动作列表
        const names = Object.keys(dayData.templates)
        if (names.length === 0) {
          this.showChooseTpl = true
          this.availableActions = uni.getStorageSync(this.ACTIONS_KEY) || []
          return
        }

        // 5. 已经绑定过模板，取最后一个
        this.showChooseTpl = false
        const tplName = names[names.length - 1]
        this.chosenTplName = tplName
        this.chosenTplIdx = this.templates.findIndex(t => t.name === tplName)
        this.chosenTplColor = this.chosenTplIdx !== -1 ?
          this.templates[this.chosenTplIdx].color :
          ''

        // 6. 决定动作列表：如果旧记录里有 actionWeights，就只用旧动作；
        //    否则用最新模板定义的动作列表
        const tplInfo = dayData.templates[tplName] || {}
        const savedWeights = tplInfo.actionWeights && typeof tplInfo.actionWeights === 'object' ?
          Object.keys(tplInfo.actionWeights) : []
        const defaultActions = (this.chosenTplIdx !== -1) ?
          this.templates[this.chosenTplIdx].actions.slice() : []

        // 选用基准动作列表
        const baseActions = savedWeights.length > 0 ?
          savedWeights :
          defaultActions

        // 7. 如果有保存的 actionOrder，则先按它排序，否则直接用 baseActions 原顺序
        const order = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : []
        let seq = []
        if (order.length > 0) {
          // 只保留在 baseActions 中的
          seq = order.filter(n => baseActions.includes(n))
          // 再把 baseActions 中但不在 order 的补上
          baseActions.forEach(n => {
            if (!seq.includes(n)) seq.push(n)
          })
        } else {
          seq = baseActions.slice()
        }
        this.chosenActions = seq

        // 8. 初始化并行状态
        this.actionInputs = this.chosenActions.map(() => ({
          reps: '',
          weight: ''
        }))
        this.diffs = this.chosenActions.map(() => null)
        this.actionEntries = this.chosenActions.map(name => {
          const arr = dayData.entries[name]
          return Array.isArray(arr) ? [...arr] : []
        })

        // 9. 触发计算 diff
        this.$nextTick(this.calcAllDiffs)
      },
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
        uni.showToast({
          title: '已标记休息日',
          icon: 'success'
        });
        this.closeRestPopup();
        // 你可以在界面上即时关闭“选择模板”弹窗
        this.showChooseTpl = false;
        // 或者刷新当前页面状态……
      },
      moveAction(idx, delta) {
        const newIdx = idx + delta;
        if (newIdx < 0 || newIdx >= this.chosenActions.length) return;
        // 通用交换函数
        const swap = arr => {
          const tmp = arr[idx];
          this.$set(arr, idx, arr[newIdx]);
          this.$set(arr, newIdx, tmp);
        };
        // 交换四个并行数组
        swap(this.chosenActions);
        swap(this.actionInputs);
        swap(this.actionEntries);
        swap(this.diffs);

        // 可选：持久化顺序到 dayData.templates.actionOrder
        this.persistOrder();
        // 调试输出
        const dayKey = this.DAYDATA_PREFIX + this.date;
        console.log('[After move] templates in storage:', uni.getStorageSync(dayKey).templates);
      },
      // 点击 tag 跳到该动作历史页面
      goHistory(idx) {
        const actName = this.chosenActions[idx];
        uni.navigateTo({
          url: `../actionHistory/actionHistory?action=${encodeURIComponent(actName)}`
        });
      },
      // 拖拽完成后，Sortable 会先更新 chosenActions，onDragEnd 里我们同步其它数组
      onDragEnd({
        oldIndex,
        newIndex
      }) {
        // helper: 把 arr[old] 移到 arr[new]
        const reorder = (arr) => {
          const v = arr.splice(oldIndex, 1)[0];
          arr.splice(newIndex, 0, v);
        };
        reorder(this.actionInputs);
        reorder(this.actionEntries);
        reorder(this.diffs);
        // chosenActions 已经被 v-model 更新
        // 最后，持久化新的顺序到 storage（可选）
        this.persistOrder();
      },

      // 如果你想在拖动过程中限制
      onDragMove(evt) {
        // evt.relatedContext.index 是目标 index
        return true; // 返回 false 可阻止
      },
      confirmEntry(idx) {
        const reps = this.actionInputs[idx].reps;
        const weight = this.actionInputs[idx].weight;

        // 检查输入是否为空
        if (reps === '' || weight === '') {
          uni.showToast({
            title: '次数和重量都要输入',
            icon: 'none'
          });
          return;
        }

        const repsNum = Number(reps);
        const weightNum = Number(weight);
        const total = repsNum * weightNum;
        const inputStr = `${repsNum}×${weightNum}`;
        // 推入本地显示数组
        this.actionEntries[idx].push({
          input: inputStr,
          total
        });

        // 持久化到 Storage
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };
        dayData.entries[this.chosenActions[idx]] = this.actionEntries[idx];
        dayData.actions[this.chosenActions[idx]] = this.actionEntries[idx]
          .reduce((s, i) => s + i.total, 0);

        // 更新模板汇总，并**保留 actionOrder**
        const allWeights = {};
        this.chosenActions.forEach((name) => {
          allWeights[name] = dayData.actions[name] || 0;
        });
        dayData.templates[this.chosenTplName] = {
          totalWeight: Object.values(allWeights).reduce((a, b) => a + b, 0),
          actionWeights: allWeights,
          actionOrder: [...this.chosenActions] // ← 加上这一行
        };

        uni.setStorageSync(key, dayData);

        // 再额外一次调用 persistOrder 保保险
        this.persistOrder();

        // 清空输入框 & 刷新对比
        this.$set(this.actionInputs, idx, {
          reps: '',
          weight: ''
        });
        this.calcAllDiffs();
      },

      getTotalWeight(idx) {
        return this.actionEntries[idx].reduce((sum, item) => sum + item.total, 0);
      },
      // 生成对比色字体
      getContrastColor(hex) {
        if (hex && typeof hex === 'object' && 'value' in hex) {
          hex = hex.value;
        }
        let str = String(hex).replace(/^#/, '').trim();
        if (!/^[0-9A-Fa-f]{3}$/.test(str) && !/^[0-9A-Fa-f]{6}$/.test(str)) {
          return '#000000';
        }
        if (str.length === 3) {
          str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
        }
        const r = parseInt(str.substr(0, 2), 16);
        const g = parseInt(str.substr(2, 2), 16);
        const b = parseInt(str.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
      },
      // ================= 深色模式相关 =================
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
      // ================= “选择模板” 弹窗相关 =================
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

        // 读取当日 dayData
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = typeof raw === 'object' ? raw : {};
        dayData.templates = dayData.templates || {};
        const dayTpl = dayData.templates[this.chosenTplName] || {};

        // 1) 优先用保存过的 actionOrder
        let available = [];
        if (Array.isArray(dayTpl.actionOrder) && dayTpl.actionOrder.length > 0) {
          available = dayTpl.actionOrder.slice();
        } else {
          // 第一次绑定，直接用全局模板动作
          available = this.templates[idx].actions.slice();
          dayTpl.actionOrder = available.slice();
        }

        // 保存回 storage
        dayData.templates[this.chosenTplName] = {
          ...dayTpl,
          actionOrder: dayTpl.actionOrder
        };
        uni.setStorageSync(key, dayData);

        // 刷新页面状态
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
        this.showChooseTpl = false;
        this.loadDayData();
      },






      // ================= 计算与“上一次”对比 =================
      calcAllDiffs() {
        let storageInfo = {};
        try {
          storageInfo = uni.getStorageInfoSync();
        } catch (e) {
          this.diffs = this.chosenActions.map(() => ({
            text: '未记录',
            class: 'diff-neutral'
          }));
          return;
        }
        const allKeys = Array.isArray(storageInfo.keys) ? storageInfo.keys : [];
        const dayDataKeys = allKeys.filter(key => key.startsWith(this.DAYDATA_PREFIX));

        this.chosenActions.forEach((actName, idx) => {
          const records = [];
          dayDataKeys.forEach(fullKey => {
            const datePart = fullKey.replace(this.DAYDATA_PREFIX, '');
            const dayData = uni.getStorageSync(fullKey) || {};
            const val = (dayData.actions && dayData.actions[actName]) || 0;
            if (val > 0) {
              const d = new Date(datePart);
              if (!isNaN(d.getTime())) {
                records.push({
                  date: datePart,
                  value: val
                });
              }
            }
          });

          if (records.length === 0) {
            this.$set(this.diffs, idx, {
              text: '未记录',
              class: 'diff-neutral'
            });
            return;
          }

          records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
          const currentDate = this.date;
          const pos = records.findIndex(item => item.date === currentDate);

          if (pos === -1) {
            this.$set(this.diffs, idx, {
              text: '未记录',
              class: 'diff-neutral'
            });
            return;
          }

          const currentValue = records[pos].value;
          if (pos === 0) {
            this.$set(this.diffs, idx, {
              text: '0kg',
              class: 'diff-neutral'
            });
          } else {
            const prevValue = records[pos - 1].value;
            const diff = currentValue - prevValue;
            let text = '0kg',
              cls = 'diff-neutral';
            if (diff > 0) {
              text = `+${diff}kg`;
              cls = 'diff-positive';
            } else if (diff < 0) {
              text = `${diff}kg`;
              cls = 'diff-negative';
            }
            this.$set(this.diffs, idx, {
              text,
              class: cls
            });
          }
        });
      },
      // 长按删除 entry
      handleEntryTouchStart(aIdx, eIdx) {
        this.pressedEntry = {
          actionIdx: aIdx,
          entryIdx: eIdx
        };
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (this.pressedEntry.actionIdx === aIdx && this.pressedEntry.entryIdx === eIdx) {
            this.handleEntryLongPress(aIdx, eIdx);
          }
        }, this.longPressThreshold);
      },
      handleEntryTouchMove() {
        clearTimeout(this.longPressTimer);
      },
      handleEntryTouchEnd() {
        clearTimeout(this.longPressTimer);
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
            if (res.confirm) {
              this.removeEntry(aIdx, eIdx);
            }
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

        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };

        // 更新 entries/actions
        dayData.entries[actName] = this.actionEntries[aIdx];
        dayData.actions[actName] = this.actionEntries[aIdx]
          .reduce((s, i) => s + i.total, 0);

        // 更新模板汇总，并**保留 actionOrder**
        const actionWeights = {};
        this.chosenActions.forEach((name) => {
          const arr = dayData.entries[name] || [];
          actionWeights[name] = arr.reduce((s, i) => s + i.total, 0);
        });
        dayData.templates[this.chosenTplName] = {
          totalWeight: Object.values(actionWeights).reduce((a, b) => a + b, 0),
          actionWeights,
          actionOrder: [...this.chosenActions] // ← 加上这一行
        };

        uni.setStorageSync(key, dayData);

        // 再额外一次调用 persistOrder 保保险
        this.persistOrder();

        uni.showToast({
          title: `已删除：${removed.input}kg`,
          icon: 'success'
        });
        this.calcAllDiffs();
      },
      // ================= 计时器 =================
      clearTimer() {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
      },
      updateRemaining() {
        const now = Date.now();
        const diff = Math.ceil((this.endTimestamp - now) / 1000);
        this.remaining = Math.max(0, diff);
        // ===== 新增：最后十秒，每秒短震一下 =====
        if (this.remaining > 0 && this.remaining <= 10) {
          uni.vibrateShort();
        }
        this.drawCircle();

        // 如果到时间了，而且还没提醒过
        if (this.remaining <= 0 && !this.notified) {
          this.notified = true;
          this.clearTimer();
          // 长震动
          uni.vibrateLong();
          // 播放提示音
          this.audioCtx && this.audioCtx.play();
          // 可选：系统通知或 Toast
          uni.showToast({
            title: '计时结束',
            icon: 'none',
            duration: 2000
          });
          plus.push.addLocalNotification({
            id: Date.now(), // 通知唯一 ID
            title: '训练计时器', // 通知标题
            content: '计时结束，休息好再继续~', // 通知内容
            // 立即推送
          });
        }
      },
      openTimerPopup() {
        uni.vibrateShort();
        // 初始化：满圈
        this.remaining = this.timerDuration;
        this.showTimerPopup = true;
        this.$nextTick(() => {
          this.drawCircle();
          this.startCountdown();
        });
      },
      // 调整“总时长”，从而改变下一秒的动画速度
      adjustDuration(delta) {
        // 保证总时长 >=1
        this.timerDuration = Math.max(1, this.timerDuration + delta);
        this.notified = false;
        this.completeTimer();
        this.openTimerPopup();
      },
      // 关闭弹窗并清理
      completeTimer() {
        this.showTimerPopup = false;
        this.clearTimer();
      },
      // 每秒走一步：减少 remaining、累加 angle
      startCountdown() {
        this.clearTimer();
        this.endTimestamp = Date.now() + this.remaining * 1000;
        // 立刻更新一次，保证如果本来就是 0 也能提醒
        this.updateRemaining();
        // 前台每秒刷新
        this.timerInterval = setInterval(() => {
          this.updateRemaining();
        }, 1000);
      },

      // 画圆环进度，percent 从 0（满圈）到 1（空圈）
      drawCircle() {
        const ctx = uni.createCanvasContext('timerCanvas');
        const size = 250;
        const cx = size / 2,
          cy = size / 2,
          r = 110;
        ctx.clearRect(0, 0, size, size);
        // 背景环
        ctx.setStrokeStyle('rgba(0, 0, 0, 0.1)');
        ctx.setLineWidth(14);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
        // 前景：剩余比例
        const percent = this.remaining / this.timerDuration;
        const startAngle = Math.PI * 1.5;
        const endAngle = startAngle + 2 * Math.PI * percent;
        ctx.setStrokeStyle('#379bff');
        ctx.setLineWidth(17);
        ctx.setShadow(0, 0, 15, '#379bff');
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle, false);
        ctx.stroke();
        // 绘制到画布
        ctx.draw();
      },

      // ================= “添加动作” 弹窗相关 =================
      openAddActionPopup() {
        const arr = uni.getStorageSync(this.ACTIONS_KEY) || [];
        this.availableActions = Array.isArray(arr) ? arr : [];
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
          this.filteredActions = this.availableActions.filter(act =>
            act.toLowerCase().includes(kw)
          );
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

        // 1) 更新页面状态
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

        // 2) 持久化到“当天数据”里
        const dayKey = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(dayKey) || {};
        const dayData = {
          templates: (raw.templates && typeof raw.templates === 'object') ? raw.templates : {},
          actions: (raw.actions && typeof raw.actions === 'object') ? raw.actions : {},
          entries: (raw.entries && typeof raw.entries === 'object') ? raw.entries : {},
        };
        // 初始化该动作
        dayData.entries[actName] = [];
        dayData.actions[actName] = 0;
        // 更新模板汇总
        const tplInfo = dayData.templates[this.chosenTplName] || {
          totalWeight: 0,
          actionWeights: {}
        };
        tplInfo.actionWeights[actName] = 0;
        tplInfo.totalWeight = Object.values(tplInfo.actionWeights).reduce((a, b) => a + b, 0);
        dayData.templates[this.chosenTplName] = tplInfo;
        uni.setStorageSync(dayKey, dayData);

        // 3) 持久化到“模板列表”里
        // 先把内存里 templates 更新
        // this.templates[this.chosenTplIdx].actions.push(actName);
        // // 再写回 storage
        // uni.setStorageSync(this.TEMPLATES_KEY, this.templates);
      },

      // ================= 长按删除“当天动作” 相关 =================
      handleTagTouchStart(index) {
        this.pressedActionIndex = index;
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        this.longPressTimer = setTimeout(() => {
          if (this.pressedActionIndex === index) {
            this.handleTagLongPress(index);
          }
        }, this.longPressThreshold);
      },
      handleTagTouchMove() {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      },
      handleTagTouchEnd() {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        this.pressedActionIndex = -1;
      },
      handleTagLongPress(idx) {
        // 先轻微振动
        uni.vibrateShort({
          type: 'light'
        });
        // 弹出确认删除
        uni.showModal({
          title: '删除动作',
          content: `确定要删除 "${this.chosenActions[idx]}" 吗？此操作仅删除当天动作，不会影响模板。`,
          success: (res) => {
            if (res.confirm) {
              this.removeActionFromDay(idx);
            }
          }
        });
        this.pressedActionIndex = -1;
        this.longPressTimer = null;
      },

      //  removeActionFromDay，先接收要删除的动作名
      removeActionFromDay(idx) {
        const actNameToRemove = this.chosenActions[idx];

        // —— 页面状态更新 （你已有） ——  
        this.chosenActions.splice(idx, 1);
        this.actionInputs.splice(idx, 1);
        this.diffs.splice(idx, 1);
        this.actionEntries.splice(idx, 1);

        // —— 本地 dayData 同步 ——  
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };

        // 1) 删除 entries/actions
        delete dayData.entries[actNameToRemove];
        delete dayData.actions[actNameToRemove];

        // 2) 重新计算 weights
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

        // 3) **删掉 actionOrder 里的同名项**  
        const order = Array.isArray(tplInfo.actionOrder) ? tplInfo.actionOrder : [];
        tplInfo.actionOrder = order.filter(name => name !== actNameToRemove);

        // 4) 写回 dayData.templates
        dayData.templates[this.chosenTplName] = tplInfo;
        uni.setStorageSync(key, dayData);

        uni.showToast({
          title: `已删除动作：${actNameToRemove}`,
          icon: 'success'
        });
        this.calcAllDiffs();
      },

      // （可选）把当前 chosenActions 顺序写回当天数据，用于下次打开保持顺序
      persistOrder() {
        const key = this.DAYDATA_PREFIX + this.date;
        const raw = uni.getStorageSync(key) || {};
        // 保留原有 actions/entries/templates
        const dayData = {
          templates: {},
          actions: {},
          entries: {},
          ...raw
        };
        // 确保这个模板条目存在
        const tplInfo = dayData.templates[this.chosenTplName] || {};
        // 覆盖或新增 actionOrder 字段
        tplInfo.actionOrder = [...this.chosenActions];
        // 把其它子字段也保留
        dayData.templates[this.chosenTplName] = tplInfo;
        uni.setStorageSync(key, dayData);
      },
      // ========== 辅助：格式化日期 ==========
      formatDate(dateObj) {
        const y = dateObj.getFullYear();
        const m = dateObj.getMonth() + 1;
        const d = dateObj.getDate();
        return (
          y +
          '-' +
          (m < 10 ? '0' + m : m) +
          '-' +
          (d < 10 ? '0' + d : d)
        );
      },
      // 打开/关闭
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

      // 保存有氧
      saveAerobic() {
        if (!this.aerobicName || !this.aerobicTime) {
          uni.showToast({
            title: '请填写名称和时长',
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

        // 1) 在当天模板里写入：把时长当作“totalWeight”
        dayData.templates[this.aerobicName] = {
          totalWeight: this.aerobicTime, // 这里还是存时长
          actionWeights: {}, // 保持空
          isAerobic: true // 标记这是有氧
        };
        uni.setStorageSync(key, dayData);

        // 2) 如果希望全局也能看到这个“有氧”模板，以便取配色：
        let tplArr = uni.getStorageSync(this.TEMPLATES_KEY) || [];
        // 避免重名
        if (!tplArr.find(t => t.name === this.aerobicName)) {
          tplArr.push({
            name: this.aerobicName,
            color: this.AEROBIC_COLOR,
            actions: [],
            isAerobic: true
          });
          uni.setStorageSync(this.TEMPLATES_KEY, tplArr);
        }

        uni.showToast({
          title: '已添加有氧',
          icon: 'success'
        });
        this.showAerobicPopup = false;
      },
    },
    onShow() {
      if (!this.showChooseTpl) {
        this.loadDayData();
      }
      // 从后台切回来，立刻同步 remaining
      if (this.showTimerPopup && this.endTimestamp) {
        this.updateRemaining();
      }
    },
    onHide() {
      // 切后台时不必特意清理，留着 endTimestamp，回来继续算
    },
    onUnload() {
      // 页面卸载前清除 interval
      clearInterval(this.timerInterval);
    },
  };
</script>

<style scoped>
  /* ================= 整体容器 & 深色模式 ================= */
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

  /* ===== Action 列表 ===== */
  .action-list {
    flex: 1;
    overflow-y: auto;
    width: calc(100% - 40px);
    margin: 20px;
    height: 100%;
  }

  .action-row {
    margin-bottom: 10px;
    /* border: 1px #000 solid; */
    background-color: #fff;
    border-radius: 15px;
    padding: 5px;
    touch-action: pan-y;
    /* display: flex; */
  }

  .container.dark .action-row {
    background-color: #2e2e2e;
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
    /* border: 1px #fff solid; */
  }

  .container.dark .tag {
    background-color: #2e2e2e;
    color: #f7f7f7;
  }

  .total-weight {
    font-size: 12px;
    color: #999;
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
    border: 1px solid #ccc;
    border-radius: 6px;
    border: none;
    background-color: #f5f5f5;
  }

  .input-mult {
    font-size: 16px;
    color: #666;
  }


  .container.dark .input-reps,
  .container.dark .input-weight {
    background-color: #121212;
  }

  .action-entries {
    margin-top: 4px;
  }

  .entries-text {
    font-size: 12px;
    color: #666;
  }

  .entry-index {
    max-width: 60px;
    font-size: 12px;
    color: #666;
    margin-left: 10px;
  }

  .entry-row {
    display: flex;
    align-items: center;
    padding: 2px 0;
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
    gap: 10px;
  }

  .diff-positive {
    color: #e53935;
  }

  .diff-negative {
    color: #43a047;
  }

  .diff-neutral {
    color: #757575;
  }

  /* ========== 底部按钮行 ========== */
  .save-row {
    bottom: 20px;
    left: 0;
    width: calc(100% - 40px);
    display: flex;
    margin: 20px;
    margin-top: 0px;
  }

  .save-row>button {
    width: 45%;
    height: 40px;
    line-height: 40px;
    background-color: #379bff;
    color: #fff;
    border-radius: 5px;
  }

  .container.dark .save-row>button {
    color: #fff;
  }

  .add-action-btn {
    background-color: #4caf50;
    /* 绿色 */
  }

  /* ========== “选择动作” 弹窗 ========== */
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
    background-color: #2e2e2e;
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

  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }

  .modal-header {
    position: relative;
    /* 为伪元素定位 */
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
    /* 控制边框长度，可自定义 */
    height: 1px;
    background-color: #eee;
    /* 默认颜色 */
  }

  /* 暗色模式下切换颜色 */
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
    /* background-color: #464646; */
  }

  .container.dark .close-icon {
    color: #ccc;
  }

  .search-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    margin-left: 8px;
  }

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

  .search-input {
    flex: 1;
    height: 32px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 0 6px;
    box-sizing: border-box;
  }

  .clear-search {
    flex: 0 0 auto;
    margin-left: 6px;
    color: #999;
    cursor: pointer;
  }

  /* 弹窗内容区 */
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

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


  .action-select-list {
    max-height: 50vh;
  }

  .action-tag {
    background-color: #fff;
    padding: 10px;
    margin: 6px 0;
    border-radius: 6px;
    text-align: center;
    font-size: 16px;
    color: #333;
  }

  .container.dark .action-tag {
    background-color: #505050;
    color: #f7f7f7;
  }

  .action-tag.selected {
    background-color: #ff5a5d;
  }

  .container.dark .action-tag.selected {
    background-color: #ff5a5d;
  }

  .no-data {
    text-align: center;
    margin-top: 20px;
    color: #999;
  }

  .container.dark .no-data {
    color: #bbb;
  }

  .modal-footer {
    padding: 10px 16px;
    display: flex;
    justify-content: center;
    position: relative;
    /* 为伪元素定位 */
  }

  .modal-footer::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 72vw;
    /* 控制边框长度，可自定义 */
    height: 1px;
    background-color: #eee;
    /* 默认颜色 */
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

  .tag-text-center {
    text-align: center;
    flex: 1;
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

  .timer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .timer-panel {
    width: 320px;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
  }

  .timer-footer {
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f5f5f5;
  }

  .timer-body {
    position: relative;
    padding: 16px;
    background: #f5f5f5;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .container.dark .timer-body,
  .container.dark .timer-footer {
    background-color: #121212;
  }

  .close-icon {
    font-size: 20px;
  }

  .timer-footer button {
    flex: 1;
    margin: 0 4px;
  }

  .container.dark .timer-footer button {
    background-color: #2e2e2e;
    color: #f5f5f5;
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

  .drag-handle {
    cursor: grab;
  }

  .move-controls {
    width: 20px;
    height: 50px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-right: 8px;
  }

  .move-controls button {
    flex: 1;
    padding: 4px;
    font-size: 16px;
    line-height: 16px;
    background-color: #fff;
    color: #121212;
  }

  .container.dark .move-controls button {
    background-color: #2e2e2e;
    color: #f5f5f5;
  }

  /* 苹果毛玻璃 */
  .save-row>button {
    color: #121212;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    box-shadow:
      -5px -5px 10px rgba(255, 255, 255, .1),
      5px 5px 10px rgba(70, 70, 70, .5),
      inset 5px 5px 15px rgba(255, 255, 255, .5),
      inset -5px -5px 15px rgba(70, 70, 70, .7);
  }

  /* .confirm-btn {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    box-shadow:
      inset 2px 2px 10px rgba(255, 255, 255, .5),
      inset -2px -2px 10px rgba(70, 70, 70, .7);
  } */

  .save-row>button:active {
    transform: scale(0.95);
    box-shadow:
      inset -5px -5px 15px rgba(255, 255, 255, .5),
      inset 5px 5px 5px rgba(70, 70, 70, .7);
  }

  .container.dark .save-row>button {
    color: #fff;
  }

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

  .btn-aerobic,
  .btn-rest {
    /* background-color: #fff; */
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e6e6e6;
    font-size: 14px;
  }

  .container.dark .btn-aerobic,
  .container.dark .btn-rest {
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
</style>