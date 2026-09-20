<template>
  <view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }">
    <!-- 顶部：标题行 + 搜索 + 排序 -->
    <view class="sq-header">
      <view class="sq-title-row">
        <text class="sq-page-title">模板广场</text>
        <view class="sq-status-row">
          <view v-if="store.isOffline" class="offline-badge">
            <text class="offline-dot">●</text>
            <text class="offline-text">离线模式</text>
          </view>
          <text class="sq-page-sub">{{ store.total }} 个模板 · 分享你的训练方案</text>
        </view>
      </view>
      <SearchBar />
      <view class="sq-sort-row">
        <SortBar />
        <TagFilter />
      </view>
    </view>

    <!-- 网格列表 -->
    <TemplateGrid @cardClick="handleCardClick" />

    <!-- 底部分享按钮（FAB）- 仅在线模式显示 -->
    <view v-if="!store.isOffline" class="sq-share-fab" @click="showShare = true">
      <text class="sq-share-fab-icon">📤</text>
      <text class="sq-share-fab-text">分享我的模板</text>
    </view>

    <!-- 详情弹窗 -->
    <TemplateDetail
      :visible="showDetail"
      :template="selectedTemplate"
      :is-offline="store.isOffline"
      @close="showDetail = false"
      @download="handleDownload"
    />

    <!-- 分享弹窗 -->
    <ShareDialog
      :visible="showShare"
      @close="showShare = false"
      @success="handleShareSuccess"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useDaySettingsStore } from '@/stores/daySettings.js'
import { useTemplateSquareStore } from '../stores/templateSquare.js'
import { useTemplateStore } from '@/stores/template.js'
import { downloadTemplate, getTemplateDetail } from '@/subpkg-template/utils/serverCommunity.js'

import SearchBar from './components/SearchBar.vue'
import TagFilter from './components/TagFilter.vue'
import SortBar from './components/SortBar.vue'
import TemplateGrid from './components/TemplateGrid.vue'
import TemplateDetail from './components/TemplateDetail.vue'
import ShareDialog from './components/ShareDialog.vue'

const daySettingsStore = useDaySettingsStore()
const store = useTemplateSquareStore()
const templateStore = useTemplateStore()

const showDetail = ref(false)
const showShare = ref(false)
const selectedTemplate = ref(null)

const handleCardClick = async (template) => {
  if (!template) return
  selectedTemplate.value = template
  showDetail.value = true
  
  // 尝试加载详情（支持离线缓存）
  try {
    const detail = await store.loadTemplateDetail(template.id)
    if (detail) {
      selectedTemplate.value = detail
    }
  } catch (e) {
    console.warn('获取模板详情失败，仅展示列表信息:', e)
  }
}

const handleDownload = async (template) => {
  if (!template || !template.id) return
  if (store.isOffline) {
    uni.showToast({ title: '离线模式无法下载模板', icon: 'none' })
    return
  }
  try {
    const dataStr = await downloadTemplate(template.id)
    const tplData = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr
    if (!tplData || !tplData.name) throw new Error('模板数据无效')

    templateStore.load()
    const name = String(tplData.name).trim()
    const existing = templateStore.templates.find(t => t && t.name === name)
    if (existing) {
      const res = await new Promise((resolve) => {
        uni.showModal({
          title: '模板已存在',
          content: `模板「${name}」已存在，是否覆盖？`,
          confirmText: '覆盖',
          cancelText: '跳过',
          success: (r) => resolve(r.confirm)
        })
      })
      if (res) {
        Object.assign(existing, tplData, { id: existing.id, name })
        templateStore.save()
        uni.showToast({ title: '覆盖成功', icon: 'success' })
      }
    } else {
      templateStore.templates.push({
        ...tplData,
        name,
        id: String(Date.now()) + Math.random().toString(36).slice(2)
      })
      templateStore.save()
      uni.showToast({ title: '导入成功', icon: 'success' })
    }
    showDetail.value = false
  } catch (e) {
    uni.showToast({ title: e.message || '导入失败', icon: 'none' })
  }
}

const handleShareSuccess = () => {
  store.loadTemplates()
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.sq-header {
  padding: 14px 16px 8px;
  box-sizing: border-box;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.sq-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.sq-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.offline-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 152, 0, 0.15);
  border-radius: 12px;
}

.offline-dot {
  font-size: 10px;
  color: #ff9800;
}

.offline-text {
  font-size: 12px;
  color: #ff9800;
  font-weight: 600;
}

.sq-page-title {
  font-size: 22px;
  font-weight: 700;
}

.sq-page-sub {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.sq-sort-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

/* 分享按钮 FAB */
.sq-share-fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--primary, #379bff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 100;
  white-space: nowrap;
  width: max-content;
  max-width: calc(100% - 32px);
}

.sq-share-fab:active {
  transform: translateX(-50%) scale(0.96);
}

.sq-share-fab-icon {
  font-size: 18px;
  white-space: nowrap;
}

.sq-share-fab-text {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

/* 平板适配 */
@media (min-width: 500px) {
  .sq-page-title { font-size: 18px !important; }
  .sq-page-sub { font-size: 12px !important; }
  .sq-share-fab { padding: 10px 24px !important; }
  .sq-share-fab-icon { font-size: 16px !important; }
  .sq-share-fab-text { font-size: 14px !important; }
}
</style>
