<template>
  <view class="hr-profile-chart" :style="{ width: width + 'px' }">
    <view class="hr-pc-title">{{ targetActionName }} · HR Profile 长期分布</view>
    <view class="hr-pc-body">
      <view
        class="hr-pc-col"
        v-for="(p, i) in displayProfiles"
        :key="i"
        :class="{ dim: p.sampleSets === 0 }"
      >
        <view class="hr-pc-col-head">
          <text class="hr-pc-bucket">{{ p.weightBucket || '?' }}</text>
          <text class="hr-pc-samples">{{ p.sampleSets || 0 }}组</text>
        </view>
        <view class="hr-pc-bar-stack">
          <!-- 堆叠：热身→有氧→无氧→极限 -->
          <view
            class="hr-pc-seg seg-warm"
            :style="{ height: segPct(p, 'warm') + '%' }"
            :title="'热身 ' + (p.zonePct || {}).warm + '%'"
          ></view>
          <view
            class="hr-pc-seg seg-fat"
            :style="{ height: segPct(p, 'fat') + '%' }"
            :title="'燃脂 ' + (p.zonePct || {}).fat + '%'"
          ></view>
          <view
            class="hr-pc-seg seg-aero"
            :style="{ height: segPct(p, 'aero') + '%' }"
            :title="'有氧 ' + (p.zonePct || {}).aero + '%'"
          ></view>
          <view
            class="hr-pc-seg seg-ana"
            :style="{ height: segPct(p, 'ana') + '%' }"
            :title="'无氧 ' + (p.zonePct || {}).ana + '%'"
          ></view>
          <view
            class="hr-pc-seg seg-max"
            :style="{ height: segPct(p, 'max') + '%' }"
            :title="'极限 ' + (p.zonePct || {}).max + '%'"
          ></view>
        </view>
        <view class="hr-pc-avg-hr" v-if="p.sampleSets > 0">
          ♥{{ p.avgHr || '—' }}
        </view>
        <view class="hr-pc-avg-hr empty" v-else>—</view>
      </view>
    </view>
    <view class="hr-pc-legend">
      <view class="hr-pc-lg"><span class="sw seg-warm"></span>热身</view>
      <view class="hr-pc-lg"><span class="sw seg-fat"></span>燃脂</view>
      <view class="hr-pc-lg"><span class="sw seg-aero"></span>有氧</view>
      <view class="hr-pc-lg"><span class="sw seg-ana"></span>无氧</view>
      <view class="hr-pc-lg"><span class="sw seg-max"></span>极限</view>
    </view>
  </view>
</template>

<script>
const ZONE_KEYS = ['warm', 'fat', 'aero', 'ana', 'max']

export default {
  name: 'HrProfileChart',
  props: {
    profiles: { type: Array, default: () => [] },
    targetActionName: { type: String, default: '' },
    width: { type: Number, default: 320 },
  },
  computed: {
    displayProfiles() {
      const list = Array.isArray(this.profiles) ? this.profiles : []
      return list.filter(p => p && typeof p === 'object').map(p => {
        const samples = Array.isArray(p.samples) ? p.samples : []
        const zoneCount = { warm: 0, fat: 0, aero: 0, ana: 0, max: 0 }
        let sum = 0, total = 0, sampleSets = 0
        for (const s of samples) {
          if (typeof s.avgHr === 'number' && !isNaN(s.avgHr)) {
            sum += s.avgHr
            total++
          }
          if (typeof s.zone === 'string' && zoneCount[s.zone] !== undefined) {
            zoneCount[s.zone]++
          }
          sampleSets++
        }
        const countTotal = Object.values(zoneCount).reduce((a, b) => a + b, 0) || 1
        const zonePct = {}
        for (const k of ZONE_KEYS) zonePct[k] = Math.round((zoneCount[k] / countTotal) * 100)
        const avgHr = total > 0 ? Math.round(sum / total) : null
        // weight 段排序顺序：按 weightBucketLower
        return {
          weightBucket: p.weightBucket || '?',
          weightBucketLower: Number(p.weightBucketLower) || 0,
          sampleSets: Number(p.sampleSets) || sampleSets,
          zonePct,
          avgHr,
        }
      }).sort((a, b) => a.weightBucketLower - b.weightBucketLower)
    },
  },
  methods: {
    segPct(p, key) {
      if (!p || !p.zonePct) return 0
      const v = Number(p.zonePct[key]) || 0
      return Math.max(0, Math.min(100, v))
    },
  },
}
</script>

<style scoped>
.hr-profile-chart {
  margin: 12px auto 6px;
  background: rgba(20, 22, 28, 0.6);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 12px 14px 10px;
  color: var(--text-primary, #eaeaea);
  box-sizing: border-box;
}
.hr-pc-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 10px;
  opacity: 0.92;
}
.hr-pc-body {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  min-height: 200px;
}
.hr-pc-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.hr-pc-col.dim { opacity: 0.45; }
.hr-pc-col-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
}
.hr-pc-bucket {
  font-weight: 600;
  opacity: 0.9;
}
.hr-pc-samples {
  opacity: 0.7;
  font-size: 9px;
}
.hr-pc-bar-stack {
  width: 100%;
  height: 140px;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.hr-pc-seg {
  width: 100%;
  transition: height 400ms cubic-bezier(0.22, 0.61, 0.36, 1);
  min-height: 0;
}
.seg-warm { background: #3b82f6; }
.seg-fat  { background: #10b981; }
.seg-aero { background: #eab308; }
.seg-ana  { background: #f97316; }
.seg-max  { background: #ef4444; }

.hr-pc-avg-hr {
  font-size: 11px;
  font-weight: 600;
  color: #f87171;
}
.hr-pc-avg-hr.empty { opacity: 0.4; color: inherit; }

.hr-pc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 10px;
  opacity: 0.85;
  margin-top: 10px;
}
.hr-pc-lg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.hr-pc-lg .sw {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
</style>
