<template>
  <view v-if="visible" class="popup-overlay" @click.self="close">
    <view class="overlay-bg" @click="close"></view>
    <view class="modal-panel edit-panel fade-in" @click.stop>
      <view class="modal-header no-border">
        <text class="modal-title">编辑记录</text>
        <text class="close-icon" @click="close">×</text>
      </view>
      <view class="modal-body edit-body">
        <view class="edit-badge">
          <text>第 {{ entryIdx + 1 }} 组</text>
          <text v-if="entryType !== 'normal'" class="entry-type-tag">
            {{ entryType === 'decreasing' ? '🔻 递减' : '⏸ 暂停' }}
          </text>
        </view>
        <view v-if="stages.length <= 1" class="edit-main-row">
          <view class="input-item">
            <input type="digit" v-model="stages[0].reps" class="big-input" focus />
            <text class="unit-label">次</text>
          </view>
          <text class="x-mark">×</text>
          <view class="input-item">
            <input type="digit" v-model="stages[0].weight" class="big-input" />
            <text class="unit-label">kg</text>
          </view>
        </view>
        <view v-else class="edit-stages-wrap">
          <view v-for="(stage, si) in stages" :key="si" class="edit-stage-row">
            <text class="stage-label">{{ si === 0 ? '第1组' : '第' + (si + 1) + '组' }}</text>
            <view class="input-item">
              <input type="digit" v-model="stage.reps" class="small-input" />
              <text class="unit-label">次</text>
            </view>
            <text class="x-mark">×</text>
            <view class="input-item">
              <input type="digit" v-model="stage.weight" class="small-input" />
              <text class="unit-label">kg</text>
            </view>
          </view>
        </view>
      </view>
      <view class="modal-footer no-border">
        <button class="save-entry-btn" @click="save">确认修改</button>
      </view>
    </view>
  </view>
</template>

<script>
  import { ENTRY_TYPE } from '@/utils/dayHelper.js'

  export default {
    name: 'EditEntryPopup',
    props: {
      visible: { type: Boolean, default: false },
      entryIdx: { type: Number, default: 0 },
      entry: { type: Object, default: null },
    },
    emits: ['close', 'save'],
    data() {
      return {
        stages: [{ reps: '', weight: '' }],
        entryType: ENTRY_TYPE.NORMAL,
      }
    },
    watch: {
      visible(val) {
        if (val && this.entry) {
          this.initFromEntry()
        }
      },
    },
    methods: {
      initFromEntry() {
        if (this.entry.stages && this.entry.stages.length > 0) {
          this.stages = this.entry.stages.map(s => ({
            reps: String(s.reps),
            weight: s.weight > 0 ? String(s.weight) : '',
          }))
          this.entryType = this.entry.type || ENTRY_TYPE.NORMAL
        } else {
          const [reps, weight] = (this.entry.input || '').split('×')
          this.stages = [{ reps, weight: weight || '' }]
          this.entryType = ENTRY_TYPE.NORMAL
        }
      },
      close() {
        this.$emit('close')
      },
      save() {
        if (!this.stages[0].reps || Number(this.stages[0].reps) <= 0) {
          uni.showToast({ title: '请输入次数', icon: 'none' })
          return
        }
        this.$emit('save', {
          stages: this.stages,
          type: this.entryType,
        })
      },
    },
  }
</script>

<style scoped>
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

  .edit-panel {
    width: 70vw !important;
    border-radius: 20px !important;
    box-shadow: 0 20px 40px var(--shadow-color);
  }

  .modal-header {
    position: relative;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .no-border::after,
  .no-border::before {
    display: none !important;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
    margin-left: 2vw;
    color: var(--text-primary);
  }

  .close-icon {
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    border-radius: 50%;
    color: var(--text-secondary);
  }

  .edit-body {
    padding: 10px 20px 30px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .edit-badge {
    background: rgba(55, 155, 255, 0.1);
    padding: 4px 12px;
    border-radius: 100px;
    margin-bottom: 24px;
  }

  .edit-badge text {
    font-size: 13px;
    color: #379bff;
    font-weight: bold;
  }

  .entry-type-tag {
    margin-left: 6px;
    font-size: 11px;
    color: #ff8c00;
  }

  .edit-main-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }

  .edit-stages-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .edit-stage-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .stage-label {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 36px;
    text-align: right;
  }

  .input-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .big-input {
    width: 80px;
    height: 60px;
    background: var(--bg-input);
    border: 1rpx solid var(--border-color);
    border-radius: 12px;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    color: var(--text-primary);
  }

  .small-input {
    width: 60px;
    height: 44px;
    background: var(--bg-input);
    border: 1rpx solid var(--border-color);
    border-radius: 10px;
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    color: var(--text-primary);
  }

  .unit-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .x-mark {
    font-size: 20px;
    color: var(--text-muted);
  }

  .edit-stage-row .x-mark {
    margin-top: 0;
  }

  .modal-footer {
    padding: 10px 16px;
    display: flex;
    justify-content: center;
  }

  .save-entry-btn {
    width: 100% !important;
    height: 50px !important;
    line-height: 50px !important;
    background: linear-gradient(135deg, #379bff, #2d82d6) !important;
    border-radius: 12px !important;
    font-size: 16px !important;
    font-weight: bold;
    margin-bottom: 10px;
    border: none;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
    color: #ffffff;
  }

  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
