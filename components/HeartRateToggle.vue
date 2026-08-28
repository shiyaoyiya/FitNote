<template>
  <view class="hr-toggle">
    <!-- 心率按钮：未连接/收起/展开 三态由 expanded + connected 控制 -->
    <view
      class="hr-chip"
      :class="{ open: expanded, connected: connected }"
      @click="onClick"
      @longpress="onLongPress"
    >
      <!-- 收起态：♥心率 -->
      <view class="hr-collapsed" v-if="!expanded">
        <text v-if="connected">♥{{ hr != null ? hr : '--' }}</text>
        <text v-else class="hr-off">♥--</text>
      </view>
      <!-- 展开态：心率 + 区间条 + 档位 + 卡路里 + 时长 -->
      <view class="hr-expanded" v-else>
        <view class="hr-blk">
          <text class="hr-val">♥{{ hr != null ? hr : '--' }}</text>
          <text class="hr-unit">bpm</text>
        </view>
        <view class="hr-zones" v-if="connected && zones">
          <view class="hr-bar">
            <view
              v-for="(z, i) in zones" :key="i"
              class="hr-seg"
              :style="{ background: z.color, opacity: (zone && zone.index===i) ? 1 : 0.45 }"
            />
          </view>
          <text class="hr-zone-label" :style="{ color: zone ? zone.color : '#999' }">{{ zone ? zone.label : '静息' }}</text>
        </view>
        <view class="hr-kcal-blk">
          <text class="hr-kcal">🔥{{ Math.round(kcalTotal) }} kcal</text>
          <text class="hr-dur">{{ formatDur(durationSec) }}</text>
        </view>
      </view>
    </view>
    <!-- 计时/设置按钮：展开时隐藏（由父级控制或本组件 v-if） -->
    <slot name="actions" v-if="!expanded" />
  </view>
</template>

<script>
export default {
  props: {
    hr: { type: Number, default: null },
    kcalTotal: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    zone: { type: Object, default: null },
    zones: { type: Array, default: () => [] },
    connected: { type: Boolean, default: false },
  },
  emits: ['toggle-connect', 'request-settings'],
  data() { return { expanded: false } },
  methods: {
    onClick() {
      if (!this.connected) { this.$emit('toggle-connect'); return }
      this.expanded = !this.expanded
    },
    onLongPress() { this.$emit('request-settings') },
    formatDur(sec) {
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return `${m}:${String(s).padStart(2, '0')}`
    },
  },
}
</script>

<style scoped>
.hr-toggle{display:flex;align-items:center;gap:8px}
.hr-chip{position:relative;height:52px;width:52px;border-radius:26px;border:2px solid #ccc;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;transition:width .28s ease,border-radius .28s ease,border-color .2s}
.hr-chip.connected{border-color:#ef4444}
.hr-chip.open{width:280px;border-radius:14px}
.hr-collapsed{font-size:15px;font-weight:700;color:#ef4444}
.hr-collapsed .hr-off{color:#999}
.hr-expanded{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 12px;box-sizing:border-box;gap:6px}
.hr-blk{display:flex;align-items:baseline}
.hr-val{font-size:15px;font-weight:700;color:#ef4444;white-space:nowrap}
.hr-unit{font-size:9px;color:#888;margin-left:2px}
.hr-zones{display:flex;align-items:center;gap:5px}
.hr-bar{display:flex;gap:2px}
.hr-seg{width:9px;height:7px;border-radius:2px}
.hr-zone-label{font-size:10px;font-weight:700;white-space:nowrap}
.hr-kcal-blk{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15}
.hr-kcal{font-size:12px;font-weight:700;color:#f59e0b;white-space:nowrap}
.hr-dur{font-size:9px;color:#888;white-space:nowrap}
</style>
