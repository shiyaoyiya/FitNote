<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
    <!-- 顶部改名输入框 -->
    <view class="header-fixed">
      <span class="text">重命名：</span>
      <input v-model="actionName" @blur="onNameBlur(actionName)" class="action-name-input" />
    </view>
    <!-- 进步折线图（固定在顶部，不随列表滚动） -->
    <ProgressChart :data="chartData" :title="actionName + ' 重量趋势'" canvas-id="actionProgressCanvas"
      :is-light-mode="!daySettingsStore.isDarkMode" @range-change="onChartRangeChange" />
    <!-- 底部操作栏（选择模式时显示） -->
    <view v-if="isSelectMode" class="action-bar">
      <view class="action-bar-left">
        <view class="select-all-btn" @tap="toggleSelectAll">
          <text>{{ isAllSelected ? '取消全选' : '全选' }}</text>
        </view>
        <text class="selected-count">已选 {{ selectedIndices.size }} 项</text>
      </view>
      <view class="action-bar-right">
        <view class="export-btn" @tap="exportSelected">
          <text>复制</text>
        </view>
        <view class="cancel-btn" @tap="cancelSelect">
          <text>取消</text>
        </view>
      </view>
    </view>
    <scroll-view class="history-list" scroll-y @scrolltolower="loadMore" :lower-threshold="100">
      <view v-for="(item, idx) in historyItems" :key="idx" class="history-row"
        :class="{ 'selected': selectedIndices.has(idx) }" @touchstart="onRowTouchStart($event, idx)"
        @touchmove="onRowTouchMove" @touchend="onRowTouchEnd" @tap="onRowTap(idx)">
        <!-- 复选框（选择模式时显示） -->
        <view v-if="isSelectMode" class="checkbox-wrapper">
          <view class="checkbox" :class="{ 'checked': selectedIndices.has(idx) }">
            <text v-if="selectedIndices.has(idx)" class="checkmark">✓</text>
          </view>
        </view>
        <!-- 左侧：上面是 entriesText，下面是 "总重(±增减)" -->
        <view class="left-block">
          <!-- 明细列表：展示每组重量 -->
          <view v-if="actionEntries[idx]?.length > 0" class="action-entries">
            <view v-for="(entry, eidx) in actionEntries[idx].filter(e => !e.isPlaceholder)" :key="eidx"
              class="entry-row">
              <text class="entry-index">第{{ eidx + 1 }}组：</text>
               <text class="entry-text">{{ getHistoryEntryText(entry) }}</text>
            </view>
          </view>
          <!-- 第二行：总重/总次数 + （增减） -->
          <text v-if="!isBodyweightAction" class="total-diff-text">
             {{ getTotalDisplayText(item, actionEntries[idx]) }}
            <text v-if="allHist[idx + 1]"
              :class="item.diffValue > 0 ? 'diff-positive' : (item.diffValue < 0 ? 'diff-negative' : 'diff-neutral')">
              {{ getDiffText(item, actionEntries[idx]) }}
            </text>
          </text>
        </view>
        <!-- 右侧显示格式化日期 YYYY/MM/DD -->
        <view class="right-block">
          <text class="date-text">{{ item.displayDate }}</text>
        </view>
      </view>
      <!-- 如果没有记录，显示"暂无历史" -->
      <view v-if="historyItems.length === 0" class="no-data">
        <text>暂无该动作历史记录</text>
      </view>
      <!-- 加载更多提示 -->
      <view v-if="historyItems.length < allHist.length" class="load-more">
        <text class="load-more-text">{{ loadingMore ? '加载中...' : '上滑加载更多' }}</text>
      </view>
      <!-- 没有更多数据提示 -->
      <view v-if="historyItems.length > 0 && historyItems.length === allHist.length" class="no-more">
        <text class="no-more-text">没有更多记录了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
  import {
    useDayDataStore
  } from '@/stores/dayData.js'
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import ProgressChart from '@/components/ProgressChart.vue'
  import {
    normalizeEntry,
    getEntryDisplayText
  } from '@/utils/dayHelper.js'
  export default {
    components: {
      ProgressChart
    },
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        actionName: '',
        originalName: '',
        historyItems: [],
        actionEntries: [],
        allHist: [],
        allEnts: [],
        allRecs: [],
        displayCount: 10,
        loadingMore: false,
        DAYDATA_PREFIX: 'fitness_daydata_',
        chartData: [],
        isSelectMode: false,
        selectedIndices: new Set(),
        touchStartTime: 0,
        touchStartPos: null,
        touchMoved: false,
        longPressTimer: null,
      }
    },

    computed: {
      isAllSelected() {
        return this.historyItems.length > 0 && this.selectedIndices.size === this.historyItems.length
      },
      isBodyweightAction() {
        const action = this.actStore ? this.actStore.getActionByName(this.actionName) : null
        return action ? action.bodyweightMode : false
      },
    },

    onLoad(options) {
      this.daySettingsStore.load()
      if (options.action) {
        this.actionName = decodeURIComponent(options.action);
        this.originalName = this.actionName;
      } else {
        this.actionName = '未知动作';
      }
      uni.setNavigationBarTitle({
        title: this.actionName + ' 历史记录'
      });
      // 初始化 store
      this.actStore = useActionStore()
      this.actStore.load()
    },

    mounted() {
      // 加载数据
      this.buildActionHistory()
    },

    methods: {
      /** 触摸开始 */
      onRowTouchStart(e, idx) {
        this.touchStartTime = Date.now()
        this.touchStartPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        }
        this.touchMoved = false
        this.longPressTimer = setTimeout(() => {
          if (!this.touchMoved) {
            this.onRowLongPress(idx)
          }
        }, 400)
      },

      /** 触摸移动 */
      onRowTouchMove(e) {
        if (!this.touchStartPos) return
        const dx = Math.abs(e.touches[0].clientX - this.touchStartPos.x)
        const dy = Math.abs(e.touches[0].clientY - this.touchStartPos.y)
        if (dx > 10 || dy > 10) {
          this.touchMoved = true
          clearTimeout(this.longPressTimer)
        }
      },

      /** 触摸结束 */
      onRowTouchEnd() {
        clearTimeout(this.longPressTimer)
        this.touchStartPos = null
      },

      /** 长按进入选择模式 */
      onRowLongPress(idx) {
        uni.vibrateShort()
        if (!this.isSelectMode) {
          this.isSelectMode = true
          this.selectedIndices = new Set()
        }
        this.toggleSelection(idx)
      },

      /** 点击行（选择模式下切换选中状态） */
      onRowTap(idx) {
        if (this.isSelectMode) {
          this.toggleSelection(idx)
        }
      },

      /** 切换选中状态 */
      toggleSelection(idx) {
        const newSet = new Set(this.selectedIndices)
        if (newSet.has(idx)) {
          newSet.delete(idx)
        } else {
          newSet.add(idx)
        }
        this.selectedIndices = newSet
      },

      /** 全选/取消全选 */
      toggleSelectAll() {
        if (this.isAllSelected) {
          this.selectedIndices = new Set()
        } else {
          const newSet = new Set()
          for (let i = 0; i < this.historyItems.length; i++) {
            newSet.add(i)
          }
          this.selectedIndices = newSet
        }
      },

      /** 取消选择模式 */
      cancelSelect() {
        this.isSelectMode = false
        this.selectedIndices = new Set()
      },

      /** 导出选中项到剪贴板 */
      exportSelected() {
        if (this.selectedIndices.size === 0) {
          uni.showToast({
            title: '请先选择记录',
            icon: 'none'
          })
          return
        }

        const sortedIndices = Array.from(this.selectedIndices).sort((a, b) => a - b)
        let output = this.actionName + '：\n'

        sortedIndices.forEach((idx, i) => {
          const item = this.historyItems[idx]
          const entries = this.actionEntries[idx]
          const realEntries = entries ? entries.filter(e => !e.isPlaceholder) : []

          output += item.displayDate + '\n'
          realEntries.forEach((entry, eidx) => {
            output += '第' + (eidx + 1) + '组：' + this.getHistoryEntryText(entry) + '\n'
          })

          if (i < sortedIndices.length - 1) {
            output += '\n'
          }
        })

        uni.setClipboardData({
          data: output,
          success: () => {
            uni.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
            this.cancelSelect()
          }
        })
      },

      /** 获取历史条目显示文本（处理旧格式 + 单位） */
      getHistoryEntryText(entry) {
        const normalized = normalizeEntry(entry)
        return normalized ? getEntryDisplayText(normalized) : (entry.input || '')
      },

      /** 获取总重/总次数显示文本 */
      getTotalDisplayText(item, entries) {
        const realEntries = entries ? entries.filter(e => !e.isPlaceholder) : []
        const modes = realEntries.map(e => e.bwMode).filter(Boolean)
        if (modes.some(m => m === 'bodyweight')) {
          return `总次数：${item.totalToday}`
        }
        if (modes.some(m => m === 'weighted')) {
          return `总重：+${item.totalToday}kg`
        }
        return `总重：${item.totalToday}kg`
      },

      /** 获取差值显示文本 */
      getDiffText(item, entries) {
        const realEntries = entries ? entries.filter(e => !e.isPlaceholder) : []
        const isBW = realEntries.some(e => e.bwMode === 'bodyweight')
        const sign = item.diffValue > 0 ? '+' : ''
        return `(${sign}${item.diffValue}${isBW ? '' : 'kg'})`
      },

      /** 改名后的处理 */
      onNameBlur(newNameRaw) {
        const newName = newNameRaw.trim()
        const oldName = this.originalName.trim()
        if (!newName || newName === oldName) return

        // 调用 pinia 全局改名
        this.actStore.renameAction(oldName, newName)
        this.actionName = newName
        this.originalName = newName
        uni.setNavigationBarTitle({
          title: newName + ' 历史记录'
        })

        // 重新加载当前页
        this.buildActionHistory()
      },

      /** 修改后的构造历史逻辑 - 最新的在顶部 */
      buildActionHistory() {
        let info = {}
        try {
          info = uni.getStorageInfoSync()
        } catch {
          this.allHist = []
          this.allEnts = []
          this.historyItems = []
          this.actionEntries = []
          return
        }
        const allKeys = Array.isArray(info.keys) ? info.keys : []
        const dayKeys = allKeys.filter(k => k.startsWith(this.DAYDATA_PREFIX))

        const recs = []
        dayKeys.forEach(fullKey => {
          const dateStr = fullKey.replace(this.DAYDATA_PREFIX, '')
          const dd = uni.getStorageSync(fullKey) || {}
          const arr = Array.isArray(dd.entries?.[this.actionName]) ?
            dd.entries[this.actionName] : []
          const realEntries = Array.isArray(arr) ? arr.filter(e => !e.isPlaceholder) : []
          if (realEntries.length > 0) {
            recs.push({
              dateStr,
              totalToday: Math.round(realEntries.reduce((s, e) => s + e.total, 0) * 100) / 100,
              details: arr,
            })
          }
        })

        // 将排序改为降序，最新的在顶部
        recs.sort((a, b) => b.dateStr.localeCompare(a.dateStr))

        const hist = []
        const ents = []
        recs.forEach((r, i) => {
          const parts = r.dateStr.split('-')
          // 修改这里：计算差值
          let diffValue = 0
          if (i < recs.length - 1) { // 如果不是最后一条（最早的记录）
            // 当前记录（较新的日期）减去下一条记录（较旧的日期）
            diffValue = Math.round((r.totalToday - recs[i + 1].totalToday) * 100) / 100
          }

          hist.push({
            displayDate: `${parts[0]}/${parts[1]}/${parts[2]}`,
            totalToday: r.totalToday,
            diffValue: diffValue,
          })
          ents.push(r.details)
        })

        this.allHist = hist
        this.allEnts = ents
        this.allRecs = recs
        this.displayCount = 10
        this.updateDisplayData()
        this.buildChartData()
      },

      /** 更新显示数据 */
      updateDisplayData() {
        const count = Math.min(this.displayCount, this.allHist.length)
        this.historyItems = this.allHist.slice(0, count)
        this.actionEntries = this.allEnts.slice(0, count)
      },

      /** 加载更多 */
      loadMore() {
        if (this.loadingMore || this.historyItems.length >= this.allHist.length) {
          return
        }
        this.loadingMore = true
        setTimeout(() => {
          this.displayCount += 10
          this.updateDisplayData()
          this.loadingMore = false
        }, 200)
      },

      /** 构建图表数据：每天该动作总容量和最大重量 */
      buildChartData() {
        const data = []
        for (const rec of this.allRecs) {
          let maxWeight = 0
          let maxRepsAtMaxWeight = 0
          let totalVolume = 0
          for (const entry of rec.details) {
            const normalized = normalizeEntry(entry)
            const stages = normalized ? normalized.stages : []
            for (const stage of stages) {
              const w = Number(stage.weight) || 0
              const r = Number(stage.reps) || 0
              totalVolume += Math.round(w * r * 100) / 100
              if (w > maxWeight) {
                maxWeight = w
                maxRepsAtMaxWeight = r
              }
            }
          }
          data.push({
            date: rec.dateStr,
            maxWeight,
            maxReps: maxRepsAtMaxWeight,
            maxVolume: totalVolume,
          })
        }
        // 按日期升序排列
        data.sort((a, b) => a.date.localeCompare(b.date))
        this.chartData = data
      },

      onChartRangeChange(range) {
        // 图表组件内部自行处理筛选，这里可按需扩展
      },
    },
  }
</script>

<style scoped>
  /* ================= 整体容器 & 深色模式 ================= */
  .header-fixed {
    flex-shrink: 0;
    background: inherit;
    z-index: 10;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    height: 44px;
  }

  .container.light .header-fixed {
    border-bottom-color: var(--border-color);
  }

  .container.dark .header-fixed {
    border-color: var(--text-placeholder);
    color: var(--text-primary);
  }

  .text {
    flex: 0 0 auto;
    height: 36px;
    font-size: 18px;
    margin-top: 5px;
    margin-left: 10px;
    color: var(--text-muted);
  }

  .container.light .text {
    color: var(--text-muted);
  }

  .container.dark .text {
    color: var(--text-secondary);
  }

  .action-name-input {
    width: 100%;
    height: 36px;
    font-size: 18px;
    border: none;
  }

  .container.dark .action-name-input {
    border-color: var(--text-placeholder);
    color: var(--text-primary);
  }

  .container {
    position: relative;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .container.light {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .container.dark {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  /* 历史列表：scroll-view 负责滚动 */
  .history-list {
    flex: 1;
    height: 0;
    overflow-y: auto;
    width: 100vw;
  }

  .history-list::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  /* 每一行的布局 */
  .history-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 10px;
    border-bottom: 1px solid var(--border-color);
  }

  .container.dark .history-row {
    border-color: var(--border-color);
  }

  /* 左侧的两行：entries-text + diff */
  .left-block {
    display: flex;
    flex-direction: column;
  }

  .entry-index,
  .entry-text {
    font-size: 14px;
    margin-right: 2px;
  }

  /* 第二行：总重量 + 括号增减 */
  .total-diff-text {
    margin-top: 4px;
    font-size: 16px;
    color: var(--text-secondary);
  }

  .container.dark .total-diff-text {
    color: var(--text-secondary);
  }

  /* 括号里的"增减"要比总重量字体小一点 */
  .total-diff-text text {
    font-size: 14px;
    margin-left: 4px;
  }

  /* 增减文本颜色 */
  .diff-positive {
    color: var(--danger);
  }

  .diff-negative {
    color: var(--success);
  }

  .diff-neutral {
    color: var(--text-muted);
  }

  /* 右侧的日期 */
  .right-block {
    /* 右对齐 */
  }

  .date-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .container.dark .date-text {
    color: var(--text-secondary);
  }

  /* "暂无历史" 文本 */
  .no-data {
    margin-top: 50px;
    text-align: center;
    color: var(--text-secondary);
  }

  .container.dark .no-data {
    color: var(--text-secondary);
  }

  /* 加载更多提示 */
  .load-more,
  .no-more {
    padding: 20px 0;
    text-align: center;
  }

  .load-more-text,
  .no-more-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .container.dark .load-more-text,
  .container.dark .no-more-text {
    color: var(--text-secondary);
  }

  /* 底部操作栏 */
  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .container.dark .action-bar {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
  }

  .action-bar-left,
  .action-bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .select-all-btn,
  .export-btn,
  .cancel-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
  }

  .select-all-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .export-btn {
    background-color: var(--primary);
    color: #fff;
  }

  .cancel-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .selected-count {
    font-size: 14px;
    color: var(--text-secondary);
  }

  /* 复选框样式 */
  .checkbox-wrapper {
    display: flex;
    align-items: center;
    margin-right: 10px;
  }

  .checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .checkbox.checked {
    background-color: var(--primary);
    border-color: var(--primary);
  }

  .checkmark {
    color: #fff;
    font-size: 14px;
    font-weight: bold;
  }

  /* 选中行高亮 */
  .history-row.selected {
    background-color: var(--bg-secondary);
  }

  .container.dark .history-row.selected {
    background-color: var(--bg-secondary);
  }
</style>