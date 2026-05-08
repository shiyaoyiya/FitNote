<template>
  <view class="action-card-content">

    <!-- 卡片头部：动作名称 + 输入 + 确认 -->
    <view class="card-header">
      <text class="tag" @click.stop="$emit('go-history')">{{ actionName }}</text>
      <view class="header-right">
        <view class="input-pair">
          <input type="digit" v-model="mainReps" placeholder="次数" class="input-reps"
            @focus="onInputFocus('reps')" @blur="onInputBlur" />
          <text class="input-mult">×</text>
          <input type="digit" v-model="mainWeight" placeholder="kg" class="input-weight"
            @focus="onInputFocus('weight')" @blur="onInputBlur" />
        </view>
        <button class="confirm-btn" @click="confirmEntry">✓️</button>
      </view>
    </view>

    <!-- 快捷输入气泡 -->
    <view v-if="showBubble" class="bubble-container" @click.stop="fillHistoryData">
      <text class="bubble-text">{{ bubbleContent }}</text>
    </view>

    <!-- 组类型选择 + 展开 -->
    <view class="type-selector">
      <view class="type-btn" :class="{ active: entryType === 'normal' }" @click="selectType('normal')">
        <text>正常组</text>
      </view>
      <view class="type-btn" :class="{ active: entryType === 'decreasing' }" @click="selectType('decreasing')">
        <text>递减组</text>
      </view>
      <view class="type-btn" :class="{ active: entryType === 'paused' }" @click="selectType('paused')">
        <text>暂停组</text>
      </view>
      <text class="expand-icon" @click="expanded = !expanded">{{ expanded ? '▲' : '▼' }}</text>
    </view>

    <!-- 递减/暂停阶段（动态添加） -->
    <view v-if="entryType !== 'normal'" class="extra-stages">
      <view v-for="(stage, i) in extraStages" :key="i" class="extra-stage-row">
        <text class="stage-label">{{ entryType === 'decreasing' ? '递减' : '暂停' }}{{ i + 1 }}：</text>
        <view class="input-pair">
          <input type="digit" v-model="stage.reps" placeholder="次数" class="input-reps" />
          <text class="input-mult">×</text>
          <input type="digit" v-model="stage.weight" placeholder="kg" class="input-weight" />
        </view>
        <text class="remove-stage-btn" @click="removeExtraStage(i)">×</text>
        <button class="extra-confirm-btn" @click="confirmExtraStages">✓️</button>
      </view>
      <text class="add-stage-btn" @click="addExtraStage">+ 添加{{ entryType === 'decreasing' ? '递减' : '暂停' }}阶段</text>
    </view>

    <!-- 展开区域：历史记录 -->
    <view v-show="expanded" class="expanded-area">
      <!-- 明细列表 -->
      <view v-if="entries.length > 0" class="action-entries">
        <view v-for="(item, eidx) in entries" :key="eidx" class="entry-row">
          <text class="entry-index">第{{ eidx + 1 }}组：</text>
          <text class="entry-text" @touchstart.stop="handleEntryTouchStart(eidx)" @touchmove.stop="handleEntryTouchMove"
            @touchend.stop="handleEntryTouchEnd" @click.stop="$emit('edit-entry', eidx)">
            {{ getEntryDisplayText(item) }}
          </text>
        </view>
      </view>

      <!-- 对比信息 -->
      <view class="action-diff" v-if="diff !== null && entries.length > 0">
        <text class="total-weight">总容量：{{ getTotalWeight(entries) }}kg</text>
        <text>与上次相比：</text>
        <text :class="diff.class">{{ diff.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    ENTRY_TYPE,
    getEntryDisplayText,
    getTotalWeight,
    normalizeEntries
  } from '@/utils/dayHelper.js'

  export default {
    name: 'ActionCard',
    props: {
      actionName: {
        type: String,
        required: true
      },
      entries: {
        type: Array,
        default: () => []
      },
      diff: {
        type: Object,
        default: null
      },
      latestRecord: {
        type: Object,
        default: null
      },
      bubbleFill: {
        type: Boolean,
        default: true
      },
    },
    emits: ['confirm-entry', 'delete-action', 'delete-entry', 'edit-entry', 'go-history', 'update-entry'],
    data() {
      return {
        expanded: false,
        entryType: ENTRY_TYPE.NORMAL,
        mainReps: '',
        mainWeight: '',
        extraStages: [],
        // 气泡
        showBubble: false,
        bubbleContent: '',
        focusedField: '',
        // 长按删除 entry
        longPressTimer: null,
        pressedEntryIdx: -1,
        longPressThreshold: 500,
      }
    },
    watch: {
      expanded(val) {
        this.saveExpandedState(val)
      },
    },
    created() {
      this.loadExpandedState()
    },
    methods: {
      ENTRY_TYPE,
      getEntryDisplayText,
      getTotalWeight,
      normalizeEntries,

      loadExpandedState() {
        try {
          const map = uni.getStorageSync('fitness_card_expanded') || {}
          if (map.hasOwnProperty(this.actionName)) {
            this.expanded = !!map[this.actionName]
          }
        } catch (e) {}
      },
      saveExpandedState(val) {
        try {
          const map = uni.getStorageSync('fitness_card_expanded') || {}
          map[this.actionName] = val
          uni.setStorageSync('fitness_card_expanded', map)
        } catch (e) {}
      },

      onInputFocus(field) {
        this.focusedField = field
        if (!this.bubbleFill) return
        const currentVal = field === 'reps' ? this.mainReps : this.mainWeight
        if (currentVal) return
        const history = this.getHistoryDataForGroup()
        if (!history) return
        const repsVal = field === 'reps' ? history.reps : history.weight
        this.bubbleContent = `上次：${history.reps}×${history.weight}kg，点击填入`
        this.showBubble = true
      },
      onInputBlur() {
        setTimeout(() => { this.showBubble = false }, 200)
      },
      getHistoryDataForGroup() {
        if (!this.latestRecord || !this.latestRecord.entry) return null
        const historyEntries = normalizeEntries(this.latestRecord.entry)
        const groupIndex = this.entries.length + 1
        if (groupIndex > historyEntries.length) return null
        const entry = historyEntries[groupIndex - 1]
        if (!entry || !entry.stages || !entry.stages[0]) return null
        const { reps, weight } = entry.stages[0]
        if (reps <= 0 && weight <= 0) return null
        return { reps, weight }
      },
      fillHistoryData() {
        const history = this.getHistoryDataForGroup()
        if (!history) return
        if (this.focusedField === 'reps' && !this.mainReps) {
          this.mainReps = String(history.reps)
        }
        if (this.focusedField === 'weight' && !this.mainWeight) {
          this.mainWeight = String(history.weight)
        }
        if (this.focusedField === 'reps' && !this.mainWeight) {
          this.mainWeight = String(history.weight)
        }
        if (this.focusedField === 'weight' && !this.mainReps) {
          this.mainReps = String(history.reps)
        }
        this.showBubble = false
      },

      addExtraStage() {
        this.extraStages.push({
          reps: '',
          weight: ''
        })
      },
      removeExtraStage(index) {
        this.extraStages.splice(index, 1)
      },
      selectType(val) {
        this.entryType = val
        if (val === ENTRY_TYPE.NORMAL) {
          this.extraStages = []
        }
      },

      confirmExtraStages() {
        // 主输入框有内容时，走 confirmEntry 创建新 entry
        if (this.mainReps || this.mainWeight) {
          this.confirmEntry()
          return
        }
        const validStages = this.extraStages.filter(s => s.reps && Number(s.reps) > 0)
        if (validStages.length === 0) {
          uni.showToast({ title: '请至少输入一个阶段', icon: 'none' })
          return
        }
        if (!this.entries || this.entries.length === 0) {
          uni.showToast({ title: '请先添加正式组', icon: 'none' })
          return
        }
        const lastIdx = this.entries.length - 1
        const lastEntry = this.entries[lastIdx]
        const newStages = validStages.map(s => ({
          reps: Number(s.reps),
          weight: s.weight ? Number(s.weight) : 0,
          total: s.weight ? Number(s.reps) * Number(s.weight) : Number(s.reps),
        }))
        const mergedStages = [...(lastEntry.stages || []), ...newStages]
        const total = mergedStages.reduce((sum, s) => sum + s.total, 0)
        const stageStrings = mergedStages.map(s =>
          s.weight > 0 ? `${s.reps}×${s.weight}` : `${s.reps}`
        )
        const updatedEntry = {
          input: stageStrings.join('+'),
          total,
          type: this.entryType,
          stages: mergedStages,
        }
        this.$emit('update-entry', { entryIdx: lastIdx, entry: updatedEntry })
        this.extraStages = []
        this.entryType = ENTRY_TYPE.NORMAL
        uni.showToast({ title: '已存入最后一组', icon: 'success' })
      },

      confirmEntry() {
        const reps = this.mainReps
        const weight = this.mainWeight

        // 验证：次数必填
        if (!reps || Number(reps) <= 0) {
          uni.showToast({
            title: '请输入次数',
            icon: 'none'
          })
          return
        }

        // 构建 stages
        const stages = [{
          reps: Number(reps),
          weight: weight ? Number(weight) : 0
        }]

        if (this.entryType !== ENTRY_TYPE.NORMAL) {
          for (const s of this.extraStages) {
            if (s.reps && Number(s.reps) > 0) {
              stages.push({
                reps: Number(s.reps),
                weight: s.weight ? Number(s.weight) : 0
              })
            }
          }
        }

        this.$emit('confirm-entry', {
          type: this.entryType,
          stages,
        })

        // 重置输入
        this.mainReps = ''
        this.mainWeight = ''
        this.extraStages = []
        this.entryType = ENTRY_TYPE.NORMAL
      },

      // Entry 长按删除
      handleEntryTouchStart(eIdx) {
        this.pressedEntryIdx = eIdx
        clearTimeout(this.longPressTimer)
        this.longPressTimer = setTimeout(() => {
          if (this.pressedEntryIdx === eIdx) {
            this.handleEntryLongPress(eIdx)
          }
        }, this.longPressThreshold)
      },
      handleEntryTouchMove() {
        clearTimeout(this.longPressTimer)
      },
      handleEntryTouchEnd() {
        clearTimeout(this.longPressTimer)
        this.pressedEntryIdx = -1
      },
      handleEntryLongPress(eIdx) {
        uni.vibrateShort({
          type: 'light'
        })
        this.$emit('delete-entry', eIdx)
        this.pressedEntryIdx = -1
      },
    },
    beforeUnmount() {
      clearTimeout(this.longPressTimer)
    },
  }
</script>

<style scoped>
  .action-card-content {
    position: relative;
    background-color: #242424;
    border-radius: 15px;
    padding: 5px;
    border: 1rpx solid #333;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
    margin-bottom: 10px;
  }

  /* 快捷输入气泡 */
  .bubble-container {
    position: absolute;
    top: 42px;
    right: 60px;
    z-index: 50;
    background: #379bff;
    border-radius: 8px;
    padding: 6px 12px;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.4);
  }
  .bubble-text {
    font-size: 12px;
    color: #fff;
    white-space: nowrap;
  }

  /* 卡片头部 */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tag {
    background-color: #242424;
    padding: 6px 12px;
    border-radius: 15px;
    border: 1rpx solid #333;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: 10px;
  }

  /* 组类型选择 */
  .type-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px 4px;
  }

  .expand-icon {
    margin-left: auto;
    font-size: 12px;
    color: #888;
    padding: 6px 15px;
    flex-shrink: 0;
  }

  .type-btn {
    padding: 3px 10px;
    border-radius: 6px;
    background: #1a1a1a;
    border: 1rpx solid #444;
    font-size: 11px;
  }

  .type-btn.active {
    background: rgba(55, 155, 255, 0.15);
    border-color: #379bff;
  }

  .type-btn.active text {
    color: #379bff;
  }

  /* 输入区域 */
  .input-pair {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .input-reps,
  .input-weight {
    width: 36px;
    height: 34px;
    padding: 2px 6px;
    border: none;
    border-radius: 6px;
    background-color: #121212;
    font-size: 13px;
  }

  .input-mult {
    font-size: 14px;
    color: #666;
  }

  /* 递减/暂停阶段 */
  .extra-stages {
    margin-top: 6px;
  }

  .extra-stage-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }

  .stage-label {
    font-size: 11px;
    color: #888;
    min-width: 40px;
  }

  .remove-stage-btn {
    font-size: 20px;
    color: #ff5a5d;
    padding: 4px 8px;
  }

  .add-stage-btn {
    padding: 4px 0;
    font-size: 12px;
    color: #379bff;
  }

  .extra-confirm-btn {
    height: 34px;
    line-height: 34px;
    background-color: #121212;
    color: #f5f5f5;
    border-radius: 6px;
    font-size: 14px;
    min-width: 40px;
    padding: 0 6px;
    flex-shrink: 0;
    border: none;
  }

  /* 确认按钮 */
  .confirm-btn {
    height: 34px;
    line-height: 34px;
    background-color: #121212;
    color: #f5f5f5;
    border-radius: 6px;
    font-size: 14px;
    width: 40px;
    padding: 0 6px;
    flex-shrink: 0;
  }

  /* 展开区域 */
  .expanded-area {
    padding: 4px 0;
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
    color: #aaaaaa;
    margin-left: 10px;
  }

  .entry-text {
    color: #f5f5f5;
    font-size: 13px;
  }

  .action-diff {
    margin-left: 10px;
    margin-bottom: 5px;
    font-size: 12px;
    color: #aaaaaa;
    display: flex;
  }

  .total-weight {
    font-size: 12px;
    color: #999;
    margin-right: 10px;
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
</style>