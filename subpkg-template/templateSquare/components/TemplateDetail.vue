<!-- pages/templateSquare/components/TemplateDetail.vue -->
<template>
  <view v-if="visible" class="detail-overlay" @click="emit('close')">
    <view class="detail-sheet" @click.stop>
      <text class="close-btn" @click="emit('close')">×</text>
      <view class="detail-cover" :style="{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor2})` }">
        <text class="author">作者：{{ maskAuthor(template?.userName || 'FitNote 用户') }}</text>
        <view class="tags">
          <text v-for="(tg, i) in normalizeTags(template)" :key="i" class="tag" :style="tg.color ? { background: tg.color } : {}">{{ tg.name || tg }}</text>
        </view>
        <text class="cover-icon">📋</text>
      </view>
      <text class="detail-title">{{ template?.name }}</text>
      <view class="stats-grid">
        <view class="stats-cell">
          <text class="stats-num">{{ template?.actionCount ?? actions.length }}</text>
          <text class="stats-label">动作数</text>
        </view>
        <view class="stats-cell">
          <text class="stats-num">{{ totalSets }}</text>
          <text class="stats-label">总组数</text>
        </view>
        <view class="stats-cell">
          <text class="stats-num">{{ template?.downloadCount ?? template?.downloads ?? 0 }}</text>
          <text class="stats-label">下载量</text>
        </view>
        <view class="stats-cell">
          <text class="stats-num">{{ template?.collectCount ?? template?.likes ?? 0 }}</text>
          <text class="stats-label">收藏量</text>
        </view>
      </view>
      <view v-if="actions.length > 0" class="actions-preview">
        <view class="section-title">动作清单</view>
        <view class="action-list">
          <view v-for="(a, i) in actions" :key="i" class="action-row">
            <text class="action-index">{{ i + 1 }}</text>
            <text class="action-name">{{ a.name }}</text>
            <text class="action-sets">{{ a.sets }}组</text>
          </view>
        </view>
      </view>
      <view class="detail-section" v-if="template?.description">
        <text class="detail-label">模板描述</text>
        <text class="detail-desc">{{ template.description }}</text>
      </view>
      <view class="detail-actions">
        <view class="detail-btn ghost" @click="emit('close')">关闭</view>
        <view v-if="!isOffline" class="detail-btn primary" @click="emit('download', template)">导入到我的模板</view>
        <view v-else class="detail-btn offline-disabled">
          <text class="offline-icon">⚡</text>
          <text>离线不可用</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  template: {
    type: Object,
    default: null
  },
  isOffline: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'download'])

// 从 templateData（JSON字符串）解析动作列表：兼容 actions:string[]+actionSets 和 actions:object[]
const actions = computed(() => {
  if (!props.template) return []
  const dataStr = props.template.templateData
  if (!dataStr) return []
  try {
    const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr
    const acts = data?.actions || data?.actionList || []
    if (!Array.isArray(acts)) return []
    const setsMap = data?.actionSets || {}
    return acts.map((a, i) => {
      if (typeof a === 'string') {
        const n = a || ('动作' + (i + 1))
        return { name: n, sets: Number(setsMap[n]) || 0 }
      }
      if (a && typeof a === 'object') {
        return { name: a.name || a.actionName || ('动作' + (i + 1)), sets: Number(a.sets) || 0 }
      }
      return { name: '动作' + (i + 1), sets: 0 }
    })
  } catch (e) {
    console.warn('解析 templateData 失败:', e)
    return []
  }
})

const coverColor = computed(() => props.template?.coverColor || '#379bff')
const coverColor2 = computed(() => {
  const base = coverColor.value
  // 简单生成一个稍深的渐变色
  return base
})

// 总组数：优先用后端 totalSets，否则从 actions 累加
const totalSets = computed(() => {
  if (props.template && Number.isFinite(Number(props.template.totalSets)) && Number(props.template.totalSets) > 0) {
    return Number(props.template.totalSets)
  }
  return actions.value.reduce((s, a) => s + (Number(a.sets) || 0), 0)
})

const maskAuthor = (name) => {
  if (!name) return 'FitNote 用户'
  return String(name)
}

const normalizeTags = (tpl) => {
  if (!tpl) return []
  const raw = tpl.tags || tpl.tagList || tpl.tagNames || []
  if (!Array.isArray(raw)) return []
  return raw
    .map((t) => {
      if (typeof t === 'string') return { name: t }
      if (t && typeof t === 'object') return { name: t.name || t.label || t.tag || '', color: t.color }
      return null
    })
    .filter(t => t && t.name)
    .slice(0, 6)
}
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.detail-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 72vh;
  background: var(--bg-primary);
  border-radius: 20px 20px 0 0;
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.close-btn {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  font-size: 40rpx;
  color: var(--text-secondary);
  padding: 8rpx;
  z-index: 5;
}

.detail-cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24rpx 24rpx 32rpx;
  color: #fff;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.author {
  position: relative;
  z-index: 2;
  font-size: 24rpx;
  opacity: 0.9;
  display: block;
  margin-bottom: 10rpx;
}

.tags {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.tag {
  padding: 4rpx 14rpx;
  background: rgba(255,255,255,0.22);
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #fff;
  backdrop-filter: blur(6rpx);
}

.cover-icon {
  position: absolute;
  right: 24rpx;
  bottom: 20rpx;
  font-size: 72rpx;
  opacity: 0.35;
}

.detail-title {
  font-size: 36rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.stats-cell {
  background: var(--bg-tertiary);
  border-radius: 10rpx;
  padding: 12px 10px;
  text-align: center;
  box-sizing: border-box;
  min-width: 0;
}

.stats-num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.stats-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-secondary);
}

.actions-preview {
  background: var(--bg-secondary);
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  max-height: 480rpx;
  overflow-y: auto;
  overflow-x: hidden;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
  color: var(--text-primary);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 12rpx;
  background: var(--bg-tertiary);
  border-radius: 12rpx;
  min-height: 64rpx;
}

.action-index {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #6ab6ff);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-name {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-sets {
  padding: 4rpx 14rpx;
  background: rgba(55,155,255,0.15);
  color: var(--primary);
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.detail-desc {
  display: block;
  width: 100%;
  padding: 16rpx 20rpx;
  background: var(--bg-tertiary);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  box-sizing: border-box;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.detail-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.detail-btn.ghost {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.detail-btn.primary {
  background: var(--primary);
  color: #fff;
}

.detail-btn.offline-disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.offline-icon {
  font-size: 14px;
}

/* 平板适配 */
@media (min-width: 500px) {
  .stats-num { font-size: 17px !important; }
  .stats-label { font-size: 11px !important; }
  .detail-title { font-size: 17px !important; }
}
</style>
