<template>
  <view class="container dark">
    <!-- 顶部改名输入框 -->
    <view class="header-fixed">
      <span class="text">重命名：</span>
      <input v-model="actionName" @blur="onNameBlur(actionName)" class="action-name-input" />
    </view>
    <scroll-view class="history-list" scroll-y @scrolltolower="loadMore" :lower-threshold="100">
      <view v-for="(item, idx) in historyItems" :key="idx" class="history-row">
        <!-- 左侧：上面是 entriesText，下面是 "总重(±增减)" -->
        <view class="left-block">
          <!-- 明细列表：展示每组重量 -->
          <view v-if="actionEntries[idx]?.length > 0" class="action-entries">
            <view v-for="(entry, eidx) in actionEntries[idx]" :key="eidx" class="entry-row">
              <text class="entry-index">第{{ eidx + 1 }}组：</text>
              <text class="entry-text">{{ entry.input }}kg</text>
            </view>
          </view>
          <!-- 第二行：总重 + （增减） -->
          <text class="total-diff-text">
            总重：{{ item.totalToday }}kg
            <text v-if="allHist[idx + 1]"
              :class="item.diffValue > 0 ? 'diff-positive' : (item.diffValue < 0 ? 'diff-negative' : 'diff-neutral')">
              ({{ item.diffValue > 0 ? '+' + item.diffValue + 'kg' : item.diffValue + 'kg' }})
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
  export default {
    data() {
      return {
        actionName: '',
        originalName: '',
        historyItems: [],
        actionEntries: [],
        allHist: [],
        allEnts: [],
        displayCount: 10,
        loadingMore: false,
        DAYDATA_PREFIX: 'fitness_daydata_',
      }
    },

    onLoad(options) {
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
          if (arr.length) {
            recs.push({
              dateStr,
              totalToday: arr.reduce((s, e) => s + e.total, 0),
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
            diffValue = r.totalToday - recs[i + 1].totalToday
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
        this.displayCount = 10
        this.updateDisplayData()
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
    },
  }
</script>

<style scoped>
  /* ================= 整体容器 & 深色模式 ================= */
  .header-fixed {
    flex-shrink: 0;
    background: inherit;
    z-index: 10;
    border-bottom: 1px solid #ccc;
    display: flex;
    align-items: center;
    height: 44px;
  }

  .container.dark .header-fixed {
    border-color: #555;
    color: #f7f7f7;
  }

  .text {
    flex: 0 0 auto;
    height: 36px;
    font-size: 18px;
    margin-top: 5px;
    margin-left: 10px;
    color: #888;
  }

  .container.dark .text {
    color: #bbb;
  }

  .action-name-input {
    width: 100%;
    height: 36px;
    font-size: 18px;
    border: none;
  }

  .container.dark .action-name-input {
    border-color: #555;
    color: #f7f7f7;
  }

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

  /* 历史列表：scroll-view 负责滚动 */
  .history-list {
    flex: 1;
    height: 0;
    overflow-y: auto;
    width: 90vw;
    margin: 0 20px;
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
    padding: 10px 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .container.dark .history-row {
    border-color: #333333;
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
    color: #888888;
  }

  .container.dark .total-diff-text {
    color: #bbbbbb;
  }

  /* 括号里的"增减"要比总重量字体小一点 */
  .total-diff-text text {
    font-size: 14px;
    margin-left: 4px;
  }

  /* 增减文本颜色 */
  .diff-positive {
    color: #e5514f;
    /* 红色+号 */
  }

  .diff-negative {
    color: #4fa052;
    /* 绿色-号 */
  }

  .diff-neutral {
    color: #757575;
    /* 灰色0 */
  }

  /* 右侧的日期 */
  .right-block {
    /* 右对齐 */
  }

  .date-text {
    font-size: 14px;
    color: #888888;
  }

  .container.dark .date-text {
    color: #bbbbbb;
  }

  /* "暂无历史" 文本 */
  .no-data {
    margin-top: 50px;
    text-align: center;
    color: #999999;
  }

  .container.dark .no-data {
    color: #bbbbbb;
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
    color: #999999;
  }

  .container.dark .load-more-text,
  .container.dark .no-more-text {
    color: #bbbbbb;
  }
</style>