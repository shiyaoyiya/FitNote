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
      <view class="type-btn" :class="{ 'type-btn-active': entryType === 'normal' }" @click="selectType('normal')">
        <text :class="{ 'type-text-active': entryType === 'normal' }">正常组</text>
      </view>
      <view class="type-btn" :class="{ 'type-btn-active': entryType === 'decreasing' }" @click="selectType('decreasing')">
        <text :class="{ 'type-text-active': entryType === 'decreasing' }">递减组</text>
      </view>
      <view class="type-btn" :class="{ 'type-btn-active': entryType === 'paused' }" @click="selectType('paused')">
        <text :class="{ 'type-text-active': entryType === 'paused' }">暂停组</text>
      </view>
      <text class="expand-icon" @click="expanded = !expanded">{{ expanded ? '▲' : '▼' }}</text>
    </view>

    <!-- 递减/暂停阶段（动态添加） -->
    <view v-if="entryType !== 'normal'" class="extra-stages">
      <view v-for="(stage, i) in extraStages" :key="i" class="extra-stage-row">
        <text class="stage-label">{{ entryType === 'decreasing' ? '递减' : '暂停' }}{{ i + 1 }}：</text>
        <view class="input-pair">
          <input type="digit" v-model="stage.reps" placeholder="次数" class="input-reps"
            @focus="onExtraInputFocus(i, 'reps')" @blur="onInputBlur" />
          <text class="input-mult">×</text>
          <input type="digit" v-model="stage.weight" placeholder="kg" class="input-weight"
            @focus="onExtraInputFocus(i, 'weight')" @blur="onInputBlur" />
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
        <view v-for="(item, eidx) in entries" :key="eidx" class="entry-row"
          :class="{ 'entry-placeholder': isPlaceholderEntry(item) }">
          <text class="entry-index">第{{ eidx + 1 }}组：</text>
          <text v-if="isPlaceholderEntry(item)" class="entry-placeholder-text"
            @touchstart.stop="handleEntryTouchStart(eidx)" @touchmove.stop="handleEntryTouchMove"
            @touchend.stop="handleEntryTouchEnd" @click.stop="$emit('edit-entry', eidx)">
            待填写
          </text>
          <text v-else class="entry-text" @touchstart.stop="handleEntryTouchStart(eidx)"
            @touchmove.stop="handleEntryTouchMove" @touchend.stop="handleEntryTouchEnd"
            @click.stop="$emit('edit-entry', eidx)">
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
    normalizeEntries,
    isPlaceholderEntry
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
        focusedStageIndex: -1,
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
      getEntryDisplayText,
      getTotalWeight,
      normalizeEntries,
      isPlaceholderEntry,

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
        this.focusedStageIndex = -1
        if (!this.bubbleFill) return
        const currentVal = field === 'reps' ? this.mainReps : this.mainWeight
        if (currentVal) return
        const history = this.getHistoryDataForGroup()
        if (!history) return
        this.bubbleContent = history.displayText
        this.showBubble = true
      },
      onInputBlur() {
        setTimeout(() => { this.showBubble = false }, 200)
      },
      getHistoryDataForGroup() {
        if (!this.latestRecord || !this.latestRecord.entry) return null
        const historyEntries = normalizeEntries(this.latestRecord.entry)
        const validCount = this.entries.filter(e => !isPlaceholderEntry(e)).length
        const groupIndex = validCount + 1
        if (groupIndex > historyEntries.length) return null
        const entry = historyEntries[groupIndex - 1]
        if (!entry || !entry.stages || !entry.stages[0]) return null
        const main = entry.stages[0]
        if (main.reps <= 0 && main.weight <= 0) return null

        // 构建显示文案
        const parts = entry.stages
          .filter(s => s.reps > 0)
          .map(s => s.weight > 0 ? `${s.reps}×${s.weight}kg` : `${s.reps}`)
        const typeSuffix = entry.type === 'decreasing' ? ' 递减' :
                           entry.type === 'paused' ? ' 暂停' : ''
        const displayText = `上次：${parts.join('+')}${typeSuffix}，点击填入`

        return {
          stages: entry.stages,
          type: entry.type || 'normal',
          displayText,
        }
      },
      fillHistoryData() {
        // 额外阶段单独填充
        if (this.focusedStageIndex >= 0) {
          const history = this.getHistoryDataForExtraStage(this.focusedStageIndex)
          if (!history) return
          const stage = this.extraStages[this.focusedStageIndex]
          if (!stage) { this.showBubble = false; this.focusedStageIndex = -1; return }
          this.entryType = history.type || ENTRY_TYPE.NORMAL
          if (this.focusedField === 'reps' && !stage.reps) stage.reps = String(history.reps)
          if (this.focusedField === 'weight' && !stage.weight) stage.weight = String(history.weight)
          this.showBubble = false
          this.focusedStageIndex = -1
          return
        }

        // 主输入框填充：填充主阶段 + 自动创建额外阶段
        const history = this.getHistoryDataForGroup()
        if (!history) return
        const { stages, type } = history

        // 填充主输入
        if (!this.mainReps) this.mainReps = String(stages[0].reps)
        if (!this.mainWeight) this.mainWeight = String(stages[0].weight)

        // 如果历史有额外阶段（递减/暂停），自动创建并填充
        if (stages.length > 1) {
          this.entryType = type || ENTRY_TYPE.NORMAL
          this.extraStages = stages.slice(1).map(s => ({
            reps: String(s.reps),
            weight: s.weight > 0 ? String(s.weight) : ''
          }))
        }

        this.showBubble = false
      },

      onExtraInputFocus(stageIndex, field) {
        this.focusedField = field
        this.focusedStageIndex = stageIndex
        if (!this.bubbleFill) return
        const stage = this.extraStages[stageIndex]
        if (!stage) return
        const currentVal = field === 'reps' ? stage.reps : stage.weight
        if (currentVal) return
        const history = this.getHistoryDataForExtraStage(stageIndex)
        if (!history) return
        const typeLabel = history.type === 'decreasing' ? '递减' : '暂停'
        this.bubbleContent = `上次${typeLabel}${stageIndex + 1}：${history.reps}×${history.weight}kg，点击填入`
        this.showBubble = true
      },
      getHistoryDataForExtraStage(stageIndex) {
        if (!this.latestRecord || !this.latestRecord.entry) return null
        const historyEntries = normalizeEntries(this.latestRecord.entry)
        const validCount = this.entries.filter(e => !isPlaceholderEntry(e)).length
        const groupIndex = validCount + 1
        if (groupIndex > historyEntries.length) return null
        const entry = historyEntries[groupIndex - 1]
        if (!entry || !entry.stages) return null
        const stage = entry.stages[stageIndex + 1]
        if (!stage || (stage.reps <= 0 && stage.weight <= 0)) return null
        return { 
          reps: stage.reps, 
          weight: stage.weight,
          type: entry.type || 'normal'
        }
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

        this.expanded = true

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
    background-color: var(--bg-card);
    border-radius: 15px;
    padding: 5px;
    border: 1rpx solid var(--border-color);
    box-shadow: 0 4rpx 12rpx var(--shadow-color);
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
    background-color: var(--tag-bg);
    padding: 6px 12px;
    border-radius: 15px;
    border: 1rpx solid var(--border-color);
    box-shadow: 0 4rpx 12rpx var(--shadow-color);
    flex-shrink: 0;
    color: var(--text-primary);
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
    color: var(--text-secondary);
    padding: 6px 15px;
    flex-shrink: 0;
  }

  .type-btn {
    padding: 3px 10px;
    border-radius: 6px;
    background: var(--bg-btn);
    border: 1rpx solid var(--border-color);
    font-size: 11px;
    color: var(--text-secondary);
  }

  .type-btn-active {
    background: rgba(55, 155, 255, 0.15);
    border-color: #379bff;
  }

  .type-text-active {
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
    background-color: var(--bg-input);
    font-size: 13px;
    color: var(--text-primary);
  }

  .input-mult {
    font-size: 14px;
    color: var(--text-muted);
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
    color: var(--text-secondary);
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
    background-color: var(--bg-btn);
    color: var(--text-btn);
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
    background-color: var(--bg-btn);
    color: var(--text-btn);
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
    color: var(--text-secondary);
    margin-left: 10px;
  }

  .entry-text {
    color: var(--text-primary);
    font-size: 13px;
  }

  .entry-placeholder-text {
    color: var(--text-placeholder);
    font-size: 13px;
    font-style: italic;
  }

  .entry-placeholder {
    opacity: 0.6;
  }

  .action-diff {
    margin-left: 10px;
    margin-bottom: 5px;
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
  }

  .total-weight {
    font-size: 12px;
    color: var(--text-muted);
    margin-right: 10px;
  }

  .diff-up {
    color: #ff4757;
  }

  .diff-down {
    color: #2ed573;
  }

  .diff-neutral {
    color: var(--text-muted);
  }
</style>