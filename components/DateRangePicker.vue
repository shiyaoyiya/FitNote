<template>
  <view class="date-range-picker">
    <view class="picker-header">
      <text class="picker-title">选择日期范围</text>
      <view class="picker-mode-switch">
        <view 
          :class="['mode-btn', { active: mode === 'range' }]" 
          @click="mode = 'range'"
        >
          范围选择
        </view>
        <view 
          :class="['mode-btn', { active: mode === 'multi' }]" 
          @click="mode = 'multi'"
        >
          多选日期
        </view>
      </view>
    </view>
    
    <!-- 范围选择模式 -->
    <view v-if="mode === 'range'" class="range-mode">
      <view class="quick-select">
        <view class="quick-btn" @click="selectLastDays(7)">近7天</view>
        <view class="quick-btn" @click="selectLastDays(30)">近1个月</view>
        <view class="quick-btn" @click="selectLastDays(180)">近半年</view>
        <view class="quick-btn" @click="selectAllDates">全部</view>
      </view>
      <view class="date-inputs">
        <view class="date-input-group">
          <text class="input-label">开始日期</text>
          <picker mode="date" :value="startDate" @change="onStartDateChange">
            <view class="date-input">{{ startDate || '选择日期' }}</view>
          </picker>
        </view>
        <text class="separator">至</text>
        <view class="date-input-group">
          <text class="input-label">结束日期</text>
          <picker mode="date" :value="endDate" @change="onEndDateChange">
            <view class="date-input">{{ endDate || '选择日期' }}</view>
          </picker>
        </view>
      </view>
      <view class="range-info" v-if="startDate && endDate">
        <text class="info-text">已选择 {{ selectedDates.length }} 天</text>
        <text class="info-hint" v-if="filteredCount > 0">
          （已过滤 {{ filteredCount }} 天无数据日期）
        </text>
      </view>
    </view>
    
    <!-- 多选模式 -->
    <view v-if="mode === 'multi'" class="multi-mode">
      <view class="calendar-header">
        <view class="nav-btn" @click="prevMonth">◀</view>
        <text class="current-month">{{ currentYear }}年{{ currentMonth }}月</text>
        <view class="nav-btn" @click="nextMonth">▶</view>
      </view>
      <view class="calendar-grid">
        <view class="weekday" v-for="day in weekDays" :key="day">{{ day }}</view>
        <view 
          v-for="(day, index) in calendarDays" 
          :key="index"
          :class="['calendar-day', { 
            'other-month': !day.currentMonth,
            'selected': isSelected(day.date),
            'has-data': day.hasData,
            'no-data': !day.hasData
          }]"
          @click="toggleDate(day)"
        >
          <text class="day-number">{{ day.day }}</text>
          <view class="data-indicator" v-if="day.hasData"></view>
        </view>
      </view>
      <view class="selected-dates" v-if="selectedDates.length > 0">
        <text class="selected-title">已选日期：</text>
        <view class="date-tags">
          <view 
            class="date-tag" 
            v-for="date in selectedDates" 
            :key="date"
            @click="removeDate(date)"
          >
            <text>{{ formatDateShort(date) }}</text>
            <text class="remove-btn">×</text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="picker-actions">
      <view class="btn-cancel" @click="onCancel">取消</view>
      <view class="btn-confirm" @click="onConfirm">确认选择</view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    availableDates: {
      type: Array,
      default: () => []
    },
    initialDates: {
      type: Array,
      default: () => []
    }
  },
  data() {
    const now = new Date()
    return {
      mode: 'range',
      startDate: '',
      endDate: '',
      selectedDates: [...this.initialDates],
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      weekDays: ['日', '一', '二', '三', '四', '五', '六']
    }
  },
  computed: {
    calendarDays() {
      const days = []
      const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1)
      const lastDay = new Date(this.currentYear, this.currentMonth, 0)
      
      // 填充上个月的日期
      const startDay = firstDay.getDay()
      const prevMonthLastDay = new Date(this.currentYear, this.currentMonth - 1, 0).getDate()
      
      for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i
        const date = this.formatDateStr(this.currentYear, this.currentMonth - 1, day)
        days.push({
          day,
          date,
          currentMonth: false,
          hasData: this.availableDates.includes(date)
        })
      }
      
      // 当前月的日期
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = this.formatDateStr(this.currentYear, this.currentMonth, i)
        days.push({
          day: i,
          date,
          currentMonth: true,
          hasData: this.availableDates.includes(date)
        })
      }
      
      // 填充下个月的日期
      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        const date = this.formatDateStr(this.currentYear, this.currentMonth + 1, i)
        days.push({
          day: i,
          date,
          currentMonth: false,
          hasData: this.availableDates.includes(date)
        })
      }
      
      return days
    },
    filteredCount() {
      if (!this.startDate || !this.endDate) return 0
      const start = new Date(this.startDate)
      const end = new Date(this.endDate)
      let count = 0
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDate(d)
        if (!this.availableDates.includes(dateStr)) {
          count++
        }
      }
      
      return count
    }
  },
  methods: {
    formatDateStr(year, month, day) {
      let m = month
      let y = year
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      m = m.toString().padStart(2, '0')
      const d = day.toString().padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    formatDate(date) {
      if (typeof date === 'string') return date
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    formatDateShort(date) {
      const parts = date.split('-')
      return `${parts[1]}-${parts[2]}`
    },
    onStartDateChange(e) {
      this.startDate = e.detail.value
      this.updateRangeSelection()
    },
    onEndDateChange(e) {
      this.endDate = e.detail.value
      this.updateRangeSelection()
    },
    updateRangeSelection() {
      if (!this.startDate || !this.endDate) return
      
      const start = new Date(this.startDate)
      const end = new Date(this.endDate)
      const dates = []
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDate(d)
        if (this.availableDates.includes(dateStr)) {
          dates.push(dateStr)
        }
      }
      
      this.selectedDates = dates
    },
    isSelected(date) {
      return this.selectedDates.includes(date)
    },
    toggleDate(day) {
      if (!day.currentMonth) return
      
      const idx = this.selectedDates.indexOf(day.date)
      if (idx >= 0) {
        this.selectedDates.splice(idx, 1)
      } else {
        this.selectedDates.push(day.date)
      }
    },
    removeDate(date) {
      const idx = this.selectedDates.indexOf(date)
      if (idx >= 0) {
        this.selectedDates.splice(idx, 1)
      }
    },
    prevMonth() {
      if (this.currentMonth === 1) {
        this.currentMonth = 12
        this.currentYear--
      } else {
        this.currentMonth--
      }
    },
    nextMonth() {
      if (this.currentMonth === 12) {
        this.currentMonth = 1
        this.currentYear++
      } else {
        this.currentMonth++
      }
    },
    selectLastDays(days) {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days + 1)
      
      this.startDate = this.formatDate(start)
      this.endDate = this.formatDate(end)
      this.updateRangeSelection()
    },
    selectAllDates() {
      if (this.availableDates.length === 0) {
        this.selectedDates = []
        return
      }
      
      const sorted = [...this.availableDates].sort()
      this.startDate = sorted[0]
      this.endDate = sorted[sorted.length - 1]
      this.selectedDates = [...this.availableDates]
    },
    onCancel() {
      this.$emit('cancel')
    },
    onConfirm() {
      this.$emit('confirm', this.selectedDates)
    }
  }
}
</script>

<style scoped>
.date-range-picker {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.picker-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.picker-mode-switch {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 2px;
}

.mode-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-radius: 6px;
}

.mode-btn.active {
  background: var(--primary);
  color: #ffffff;
}

.range-mode {
  margin-bottom: 20px;
}

.quick-select {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.quick-btn {
  flex: 1;
  min-width: 60px;
  padding: 8px 4px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.quick-btn:active {
  background: var(--primary);
  color: #ffffff;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-input-group {
  flex: 1;
}

.input-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: block;
}

.date-input {
  background: var(--bg-tertiary);
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  color: var(--text-primary);
}

.separator {
  color: var(--text-muted);
  margin-top: 20px;
}

.range-info {
  margin-top: 10px;
  text-align: center;
}

.info-text {
  font-size: 14px;
  color: var(--text-primary);
}

.info-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.multi-mode {
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.nav-btn {
  padding: 8px;
  color: var(--primary);
  cursor: pointer;
}

.current-month {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 15px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  padding: 5px;
}

.calendar-day {
  position: relative;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.calendar-day.other-month {
  opacity: 0.3;
}

.calendar-day.selected {
  background: var(--primary);
}

.calendar-day.selected .day-number {
  color: #ffffff;
}

.calendar-day.has-data {
  background: var(--bg-tertiary);
}

.calendar-day.no-data {
  opacity: 0.5;
}

.day-number {
  font-size: 14px;
  color: var(--text-primary);
}

.data-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}

.selected-dates {
  margin-top: 15px;
}

.selected-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: block;
}

.date-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.date-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-tertiary);
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  color: var(--text-primary);
}

.remove-btn {
  color: var(--danger);
  cursor: pointer;
}

.picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--text-primary);
}

.btn-confirm {
  padding: 10px 20px;
  background: var(--primary);
  border-radius: 8px;
  color: #ffffff;
}
</style>
