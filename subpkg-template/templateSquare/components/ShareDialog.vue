<!-- pages/templateSquare/components/ShareDialog.vue -->
<template>
  <view v-if="visible" class="share-overlay" @click="close">
    <view class="share-sheet" @click.stop>
      <text class="close-btn" @click="close">×</text>
      <text class="share-title">分享我的模板</text>
      <view class="share-section">
        <text class="section-label">选择要分享的模板</text>
        <view class="share-pick-list">
          <view
            v-for="tpl in myTemplates"
            :key="tpl.id"
            class="share-pick"
            :class="{ active: shareForm.tplId === tpl.id }"
            @click="selectTemplate(tpl)"
          >
            <text class="pick-name">{{ tpl.name }}</text>
            <text class="pick-count">{{ tpl.actions?.length || 0 }} 动作</text>
          </view>
          <view v-if="myTemplates.length === 0" class="empty-tip">暂无本地模板</view>
        </view>
      </view>
      <view class="share-section">
        <text class="section-label">分享名称<span class="req">*</span></text>
        <input
          v-model="shareForm.name"
          class="share-input"
          placeholder="不超过50字"
          maxlength="50"
        />
      </view>
      <view class="share-section">
        <text class="section-label">简介<span class="req">*</span></text>
        <textarea
          v-model="shareForm.description"
          class="share-textarea"
          placeholder="介绍一下这个模板的训练目标、适合人群等..."
          maxlength="2000"
        />
      </view>
      <view v-if="selectedTemplate" class="share-section">
        <text class="section-label">封面颜色</text>
        <view class="color-row">
          <view
            v-for="c in colorOptions"
            :key="c"
            class="color-dot"
            :class="{ active: shareForm.coverColor === c }"
            :style="{ backgroundColor: c }"
            @click="shareForm.coverColor = c"
          />
        </view>
      </view>
      <view class="share-section">
        <text class="section-label">部位标签（可多选）</text>
        <view class="tag-select">
          <view
            v-for="t in tagList"
            :key="t.id"
            class="tag-opt"
            :class="{ active: shareForm.tagIds.includes(t.id) }"
            @click="toggleTag(t.id)"
          >{{ t.name }}</view>
        </view>
      </view>
      <view class="share-actions">
        <view class="share-btn ghost" @click="close">取消</view>
        <view class="share-btn primary" @click="submitShare">提交分享</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useTemplateStore } from '@/stores/template.js'
import { shareTemplate, listTemplateTags } from '@/subpkg-template/utils/serverCommunity.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const templateStore = useTemplateStore()
const myTemplates = ref([])
const tagList = ref([])
const selectedTemplate = ref(null)
const shareForm = ref({
  tplId: null,
  name: '',
  description: '',
  coverColor: '#379bff',
  tagIds: []
})

const colorOptions = ['#379bff', '#ff6b6b', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c']

// 打开时加载本地模板和标签
watch(() => props.visible, (val) => {
  if (val) {
    try {
      templateStore.load()
      myTemplates.value = (templateStore.templates || []).filter(t => t && !t.isAerobic)
      shareForm.value = { tplId: null, name: '', description: '', coverColor: '#379bff', tagIds: [] }
      selectedTemplate.value = null
      loadTags()
    } catch (e) {
      console.error('加载本地模板失败:', e)
      myTemplates.value = []
    }
  }
})

const loadTags = async () => {
  try {
    tagList.value = await listTemplateTags()
  } catch (e) {
    tagList.value = []
  }
}

const toggleTag = (id) => {
  const idx = shareForm.value.tagIds.indexOf(id)
  if (idx > -1) shareForm.value.tagIds.splice(idx, 1)
  else shareForm.value.tagIds.push(id)
}

const selectTemplate = (tpl) => {
  shareForm.value.tplId = tpl.id
  shareForm.value.name = tpl.name || ''
  shareForm.value.coverColor = tpl.color || '#379bff'
  selectedTemplate.value = tpl
}

const totalSets = computed(() => {
  if (!selectedTemplate.value) return 0
  const actions = selectedTemplate.value.actions || []
  const setsMap = selectedTemplate.value.actionSets || {}
  let s = 0
  for (const a of actions) {
    if (typeof a === 'string') s += Number(setsMap[a]) || 0
    else if (a && typeof a === 'object') s += Number(a.sets) || 0
  }
  return s
})

const close = () => {
  shareForm.value = { tplId: null, name: '', description: '', coverColor: '#379bff', tagIds: [] }
  selectedTemplate.value = null
  emit('close')
}

const submitShare = async () => {
  if (!shareForm.value.tplId) {
    uni.showToast({ title: '请选择要分享的模板', icon: 'none' })
    return
  }
  if (!shareForm.value.name) {
    uni.showToast({ title: '请填写分享名称', icon: 'none' })
    return
  }

  const tpl = selectedTemplate.value
  const actionCount = tpl?.actions?.length || 0
  if (actionCount < 1) {
    uni.showToast({ title: '模板至少需要1个动作', icon: 'none' })
    return
  }

  try {
    await shareTemplate({
      name: shareForm.value.name,
      description: shareForm.value.description,
      coverColor: shareForm.value.coverColor,
      actionCount,
      totalSets: totalSets.value,
      templateData: JSON.stringify(tpl),
      tagIds: shareForm.value.tagIds
    })
    uni.showToast({ title: '分享成功，等待审核', icon: 'success' })
    emit('success')
    close()
  } catch (e) {
    uni.showToast({ title: e.message || '分享失败', icon: 'none' })
  }
}
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.share-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
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

.share-title {
  font-size: 36rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 20px;
}

.share-section {
  margin-bottom: 16px;
}

.section-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.req {
  color: #ff4d4f;
  margin-left: 4rpx;
}

.hint {
  font-size: 20rpx;
  color: var(--text-secondary);
  font-weight: normal;
}

.count-hint {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: var(--text-secondary);
  margin-top: 4rpx;
}

.share-pick-list {
  max-height: 40vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.share-pick {
  padding: 12rpx 20rpx;
  border: 1rpx solid var(--border-color);
  border-radius: 12rpx;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-pick.active {
  border-color: var(--primary);
  background: rgba(55, 155, 255, 0.1);
}

.empty-tip {
  padding: 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.pick-name {
  font-size: 28rpx;
}

.pick-count {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.share-input,
.share-textarea {
  width: 100%;
  height: 88rpx;
  background: var(--bg-tertiary);
  border: 1rpx solid var(--border-color);
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.share-textarea {
  height: 160rpx;
  padding: 16rpx 24rpx;
  line-height: 1.5;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.color-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  box-sizing: border-box;
}

.color-dot.active {
  border-color: var(--text-primary);
  transform: scale(1.1);
}

.tag-select {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-opt {
  padding: 8rpx 20rpx;
  border-radius: 999px;
  font-size: 24rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.tag-opt.active {
  background: var(--primary);
  color: #fff;
}

.share-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.share-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.share-btn.ghost {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.share-btn.primary {
  background: var(--primary);
  color: #fff;
}

/* 平板适配 */
@media (min-width: 500px) {
  .share-input { height: 40px !important; font-size: 13px !important; }
  .share-textarea { height: 80px !important; font-size: 13px !important; padding: 8px 12px !important; }
  .pick-name { font-size: 13px !important; }
  .pick-count { font-size: 11px !important; }
  .share-btn { height: 40px !important; font-size: 13px !important; }
}
</style>
