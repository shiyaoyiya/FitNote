<template>
  <view class="container"
    :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode, 'liquid-glass': daySettingsStore.liquidGlassEnabled }"
    @touchstart="onPageSwipeStart" @touchmove="onPageSwipeMove" @touchend="onPageSwipeEnd">

    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 顶部主 Tab 栏：我的模板 / 模板广场 -->
    <view v-else class="main-tab-bar" :class="{ 'no-transition': swipeTabNoTransition }">
      <view
        v-for="(t, i) in mainTabs" :key="t.key"
        class="main-tab-item"
        :class="{ active: activeMainTab === t.key }"
        @click="switchMainTab(t.key, true)"
      >
        <text class="main-tab-text">{{ t.label }}</text>
      </view>
      <!-- 滑动高亮指示线 -->
      <view
        class="tab-highlight-bar"
        :style="{ transform: `translateX(${tabHighlightX}px)`, width: tabHighlightW + 'px' }"
      ></view>
    </view>

    <view v-if="!loading" class="mid-scroll">
      <!-- ========== 我的模板 Tab ========== -->
      <movable-area v-show="activeMainTab === 'mine'" v-if="showList" class="movable-area"
        :style="{ height: filteredTemplates.length * rowHeight + 'px' }">
        <view v-for="(item, index) in filteredTemplates" :key="'slot'+index" class="item-slot"
          :style="{ top: index * rowHeight + 'px' }"></view>

        <movable-view v-for="(tpl, idx) in filteredTemplates" :key="tpl.id" direction="vertical" class="movable-item"
          :y="itemY[idx]" :disabled="!isDragMode" :class="{ 'is-dragging': dragIdx === idx }"
          @change="onDragMove($event, idx)" @touchend="isDragMode ? onDragEnd() : null">
          <view class="slide-wrapper">
            <view class="delete-btn-container">
              <view class="delete-btn" @click.stop="handleDelete(idx)"
                :style="{ display: isDragMode ? 'none' : 'flex' }">
                删除
              </view>
            </view>
            <view class="action-card" :style="{ transform: 'translateX(' + (slideOffset[idx] || 0) + 'px)' }"
              @touchstart="onTouchStart($event, idx)" @touchmove="onTouchMove($event, idx)"
              @touchend="onTouchEnd($event, idx)" @longpress="onDragTrigger(idx)">
              <view class="card-color-bar" :style="{ backgroundColor: tpl.color || '#555' }"></view>
              <view class="card-info">
                <text class="card-name">{{ tpl.name }}</text>
                <text class="card-count">{{ tpl.actions ? tpl.actions.length : 0 }} 个动作</text>
              </view>
              <text class="card-arrow">›</text>
            </view>
          </view>
        </movable-view>

        <view v-if="filteredTemplates.length === 0" class="empty-state-inside">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无模板，快去创建一个吧~</text>
        </view>
      </movable-area>

      <!-- ========== 模板广场 Tab ========== -->
      <view v-show="activeMainTab === 'square'" class="square-wrap">
        <!-- 搜索 + 排序 -->
        <view class="square-toolbar">
          <view class="square-search">
            <text class="sq-search-icon">🔍</text>
            <input v-model="squareSearch" class="sq-search-input" placeholder="搜索模板名 / 动作 / 标签" />
            <text v-if="squareSearch" class="sq-clear" @click="squareSearch=''">×</text>
          </view>
          <view class="square-sort">
            <view
              v-for="s in squareSorts" :key="s.key"
              class="sq-sort-item"
              :class="{ active: squareSort === s.key }"
              @click="squareSort = s.key"
            >{{ s.label }}</view>
          </view>
        </view>
        <!-- 标签 chips -->
        <scroll-view class="square-tags" scroll-x="true" show-scrollbar="false">
          <view
            v-for="tag in squareTagOptions" :key="tag.key"
            class="sq-tag-chip"
            :class="{ active: squareTag === tag.key }"
            @click="squareTag = tag.key"
          >{{ tag.label }}</view>
        </scroll-view>
        <!-- 网格卡片 -->
        <view class="square-grid">
          <view
            v-for="(tpl, i) in filteredSquareTemplates" :key="i"
            class="sq-card"
            @click="openSquareDetail(tpl)"
          >
            <view class="sq-card-top" :style="{ background: `linear-gradient(135deg, ${tpl.color}, ${tpl.color2 || tpl.color})` }">
              <text class="sq-card-name">{{ tpl.name }}</text>
              <text class="sq-card-author">by {{ tpl.author }}</text>
            </view>
            <view class="sq-card-body">
              <view class="sq-card-tags">
                <text v-for="tg in tpl.tags" :key="tg" class="sq-card-tag">{{ tg }}</text>
              </view>
              <view class="sq-card-meta">
                <text class="sq-meta">{{ tpl.actions.length }} 动作</text>
                <text class="sq-meta">♥ {{ tpl.likes }}</text>
                <text class="sq-meta">⬇ {{ tpl.downloads }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="filteredSquareTemplates.length === 0" class="empty-state-inside">
          <text class="empty-icon">🔍</text>
          <text class="empty-text">没有找到匹配的模板</text>
        </view>
      </view>
    </view>

    <!-- 模板广场：分享 FAB -->
    <view class="sq-share-fab" v-show="activeMainTab === 'square'" @click="openSquareShare">
      <text class="sq-share-fab-icon">📤</text>
      <text class="sq-share-fab-text">分享我的模板</text>
    </view>

    <view class="bottom-bar" v-show="activeMainTab === 'mine'">
      <view class="btn-import-export" @click="openImportExportPanel">
        <text class="btn-icon">📤</text>
        <text class="btn-label">导入/导出</text>
      </view>
      <view class="btn-create" @click="openCreatePanel">
        <text class="btn-create-icon">+</text>
        <text class="btn-create-label">新建模板</text>
      </view>
    </view>

    <view v-if="showCreatePanel" class="popup-overlay" @click.self="closeCreatePanel">
      <view class="overlay-bg" @click="closeCreatePanel"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">新建模板</text>
          <text class="close-btn" @click="closeCreatePanel">×</text>
        </view>

        <view class="panel-body">
          <view class="form-group">
            <text class="form-label">模板名称</text>
            <input v-model="newTemplateName" placeholder="输入模板名称" class="form-input" maxlength="20" />
          </view>

          <view class="search-bar">
            <view class="search-bar-inner">
              <text class="search-icon">🔍</text>
              <input v-model="searchTerm" placeholder="搜索动作名称..." class="search-input" />
              <text v-if="searchTerm" class="clear-icon" @click="searchTerm = ''">×</text>
            </view>
          </view>

          <scroll-view class="category-scroll" scroll-x="true" show-scrollbar="false">
            <view v-for="cat in categories" :key="cat.id" class="category-tab"
              :class="{ active: activeCategory === cat.id }" @click="activeCategory = cat.id">
              <text class="category-name">{{ cat.name }}</text>
              <text class="category-count">{{ categoryCounts[cat.id] || 0 }}</text>
            </view>
          </scroll-view>

          <scroll-view class="action-list" scroll-y="true" show-scrollbar="false">
            <view class="action-grid">
              <view v-for="act in filteredActions" :key="act.id" class="action-item"
                :class="{ selected: selectedActions.includes(act.name) }" @click="toggleAction(act.name)">
                <text class="action-name">{{ act.name }}</text>
                <text v-if="selectedActions.includes(act.name)" class="check-mark">✓</text>
              </view>
            </view>
            <view v-if="filteredActions.length === 0" class="no-actions">
              <text>未找到匹配的动作</text>
            </view>
          </scroll-view>

          <view class="selected-count">
            <text>已选 {{ selectedActions.length }} 个动作</text>
          </view>

          <view class="color-section">
            <text class="color-label">模板配色</text>
            <view class="color-options">
              <view v-for="(c, ci) in presetColors" :key="ci" class="color-item"
                :class="{ active: selectedColor === c.value }" @click="selectedColor = c.value">
                <view class="color-circle" :style="{ backgroundColor: c.value }"></view>
                <text class="color-name">{{ c.name }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="panel-footer">
          <button class="btn-confirm" @click="confirmCreate">确认创建</button>
        </view>
      </view>
    </view>

    <view v-if="showImportExportPanel" class="popup-overlay" @click.self="closeImportExportPanel">
      <view class="overlay-bg" @click="closeImportExportPanel"></view>
      <view class="popup-panel import-export-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">导入/导出模板</text>
          <text class="close-btn" @click="closeImportExportPanel">×</text>
        </view>

        <view class="tab-bar">
          <view class="tab-item" :class="{ active: importExportTab === 'export' }" @click="importExportTab = 'export'">
            <text>导出</text>
          </view>
          <view class="tab-item" :class="{ active: importExportTab === 'import' }" @click="importExportTab = 'import'">
            <text>导入</text>
          </view>
        </view>

        <view class="panel-body" v-if="importExportTab === 'export'">
          <view class="select-all-row">
            <view class="select-all-btn" @click="toggleSelectAll">
              <text v-if="selectedExportTemplates.length === filteredTemplates.length">✓ 取消全选</text>
              <text v-else>☐ 全选</text>
            </view>
          </view>
          <scroll-view class="template-list" scroll-y="true">
            <view v-for="(tpl, idx) in filteredTemplates" :key="tpl.id" class="template-checkbox-item"
              @click="toggleTemplateSelect(tpl)">
              <view class="checkbox-box" :class="{ checked: isTemplateSelected(tpl) }">
                <text v-if="isTemplateSelected(tpl)" class="checkbox-check">✓</text>
              </view>
              <view class="template-info">
                <text class="template-name">{{ tpl.name }}</text>
                <text class="template-count">{{ tpl.actions ? tpl.actions.length : 0 }}个动作</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="panel-body" v-else>
          <view class="paste-btn-row">
            <view class="paste-btn" @click="pasteFromClipboard">
              <text>📋 粘贴</text>
            </view>
          </view>
          <textarea v-model="importText" class="import-textarea" placeholder="在此粘贴模板数据，格式：模板名：动作名×组数" @input="onImportTextInput"></textarea>
          <view v-if="parsedTemplates.length > 0" class="parse-result">
            <text class="parse-success">✓ 识别到 {{ parsedTemplates.length }} 个模板</text>
          </view>
        </view>

        <view class="panel-footer">
          <view class="btn-cancel-popup" @click="closeImportExportPanel">取消</view>
          <view class="btn-confirm-popup" @click="confirmImportExport" :class="{ disabled: !canConfirmImportExport }">
            <text>{{ importExportTab === 'export' ? '确认导出' : '确认导入' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showConflictPanel" class="popup-overlay" @click.self="closeConflictPanel">
      <view class="overlay-bg" @click="closeConflictPanel"></view>
      <view class="popup-panel conflict-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">模板名称冲突</text>
          <text class="close-btn" @click="closeConflictPanel">×</text>
        </view>
        <view class="panel-body">
          <view v-for="(item, idx) in conflictItems" :key="idx" class="conflict-item">
            <text class="conflict-name">{{ item.name }}</text>
            <view class="conflict-options">
              <view class="conflict-option" :class="{ active: item.action === 'overwrite' }"
                @click="setConflictAction(idx, 'overwrite')">覆盖</view>
              <view class="conflict-option" :class="{ active: item.action === 'rename' }"
                @click="setConflictAction(idx, 'rename')">重命名</view>
              <view class="conflict-option" :class="{ active: item.action === 'skip' }"
                @click="setConflictAction(idx, 'skip')">跳过</view>
            </view>
          </view>
        </view>
        <view class="panel-footer">
          <view class="btn-cancel-popup" @click="closeConflictPanel">取消</view>
          <view class="btn-confirm-popup" @click="confirmConflictResolve">确认</view>
        </view>
      </view>
    </view>

    <!-- 广场：模板详情弹窗 -->
    <view v-if="showSquareDetail" class="popup-overlay" @click.self="closeSquareDetail">
      <view class="overlay-bg" @click="closeSquareDetail"></view>
      <view class="popup-panel square-detail-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">{{ activeSquareTemplate?.name || '模板详情' }}</text>
          <text class="close-btn" @click="closeSquareDetail">×</text>
        </view>
        <view v-if="activeSquareTemplate" class="panel-body" style="padding-bottom: 0;">
          <view class="sq-detail-hero" :style="{ background: `linear-gradient(135deg, ${activeSquareTemplate.color}, ${activeSquareTemplate.color2 || activeSquareTemplate.color})` }">
            <text class="sqd-author">作者：{{ activeSquareTemplate.author }}</text>
            <view class="sqd-tags">
              <text v-for="tg in activeSquareTemplate.tags" :key="tg" class="sqd-tag">{{ tg }}</text>
            </view>
            <view class="sqd-stat-row">
              <view class="sqd-stat"><text class="sqd-stat-num">{{ activeSquareTemplate.actions.length }}</text><text class="sqd-stat-lb">动作</text></view>
              <view class="sqd-stat"><text class="sqd-stat-num">{{ activeSquareTemplate.likes }}</text><text class="sqd-stat-lb">点赞</text></view>
              <view class="sqd-stat"><text class="sqd-stat-num">{{ activeSquareTemplate.downloads }}</text><text class="sqd-stat-lb">导入</text></view>
            </view>
          </view>
          <view class="sq-detail-actions-preview">
            <view class="sqd-section-title">动作清单</view>
            <view class="sqd-action-list">
              <view v-for="(a, i) in activeSquareTemplate.actions" :key="i" class="sqd-action-row">
                <text class="sqd-action-index">{{ i + 1 }}</text>
                <text class="sqd-action-name">{{ a.name }}</text>
                <text class="sqd-action-sets">{{ a.sets }}组</text>
              </view>
            </view>
          </view>
        </view>
        <view class="panel-footer">
          <view class="btn-cancel-popup" @click="shareSquareTemplate">📤 分享</view>
          <view class="btn-confirm-popup" @click="importSquareTemplate" :style="{ background: 'linear-gradient(135deg,#379bff,#2d82d6)', color: '#fff' }">✨ 导入到我的模板</view>
        </view>
      </view>
    </view>

    <!-- 模板广场：分享弹窗 -->
    <view v-if="showSquareShare" class="popup-overlay" @click.self="closeSquareShare">
      <view class="overlay-bg" @click="closeSquareShare"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">分享我的模板</text>
          <text class="close-btn" @click="closeSquareShare">×</text>
        </view>
        <view class="panel-body">
          <view v-if="!shareForm.templateId" class="sq-share-pick-list">
            <view v-for="tpl in templateStore.templates" :key="tpl.id" class="sq-share-pick"
              @click="shareForm.templateId = tpl.id; shareForm.name = tpl.name">
              <text class="sq-share-pick-name">{{ tpl.name }}</text>
              <text class="sq-share-pick-count">{{ tpl.actions?.length || 0 }} 动作</text>
            </view>
            <view v-if="templateStore.templates.length === 0" class="empty-state-inside">
              <text class="empty-text">暂无模板可分享</text>
            </view>
          </view>
          <view v-else>
            <view class="form-group">
              <text class="form-label">模板名称</text>
              <input v-model="shareForm.name" class="sq-share-input" placeholder="不超过50字" maxlength="50" />
            </view>
            <view class="form-group">
              <text class="form-label">模板介绍</text>
              <textarea v-model="shareForm.desc" class="sq-share-textarea" placeholder="介绍一下这个模板..." maxlength="200" />
            </view>
          </view>
        </view>
        <view class="panel-footer">
          <view class="btn-cancel-popup" @click="closeSquareShare">取消</view>
          <view class="btn-confirm-popup" @click="doShareTemplate" :style="{ background: 'linear-gradient(135deg,#379bff,#2d82d6)', color: '#fff' }">📤 分享</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useTemplateStore
  } from '@/stores/template'
  import {
    useActionStore
  } from '@/stores/action'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'
  import { PRESET_COLORS } from '@/utils/color.js'

  const DAYDATA_PREFIX = 'fitness_daydata_'

  export default {
    data() {
      return {
        daySettingsStore: useDaySettingsStore(),
        _isImportingSquare: false,
        loading: true,
        rowHeight: 0,
        showList: true,
        _isMounted: false,

        // 拖拽（与 templateDetail.vue 完全一致）
        isDragMode: false,
        isDragTriggered: false,
        hasSwapped: false,
        itemY: [],
        dragIdx: -1,
        lastTargetIdx: -1,
        lastVibrateTime: 0,

        // 侧滑（与 templateDetail.vue 完全一致）
        slideOffset: [],
        startX: 0,
        startY: 0,
        startTime: 0,
        isClick: false,
        isNavigating: false,

        longPressTimer: null,
        longPressThreshold: 500,

        showCreatePanel: false,
        newTemplateName: '',
        searchTerm: '',
        activeCategory: 'all',
        selectedActions: [],
        selectedColor: '#93d5dc',
        presetColors: PRESET_COLORS,
        showImportExportPanel: false,
        importExportTab: 'export',
        selectedExportTemplates: [],
        importText: '',
        parsedTemplates: [],
        showConflictPanel: false,
        conflictItems: [],

        // ===== 主 Tab：我的模板 / 模板广场 =====
        activeMainTab: 'mine',
        swipeTabNoTransition: false,
        swipeStartX: 0, swipeStartY: 0, swipeStartTime: 0,
        tabHighlightX: 0, tabHighlightW: 0, tabHighlightMeasured: false,
        swipeDeltaX: 0, swipeViewWidth: 0, swipeIsTracking: false, baseTabHighlightX: 0,

        // ===== 模板广场 =====
        squareSearch: '',
        squareSort: 'hot',
        squareTag: 'all',
        showSquareDetail: false,
        activeSquareTemplate: null,
        showSquareShare: false,
        shareForm: { name: '', desc: '', templateId: '' },
        squareSorts: [
          { key: 'hot', label: '🔥 热度' },
          { key: 'newest', label: '🆕 最新' },
          { key: 'downloads', label: '⬇ 下载' },
        ],
        squareTagOptions: [
          { key: 'all', label: '全部' },
          { key: '胸', label: '胸部' },
          { key: '背', label: '背部' },
          { key: '腿', label: '腿部' },
          { key: '肩', label: '肩部' },
          { key: '手臂', label: '手臂' },
          { key: '核心', label: '核心' },
          { key: '有氧', label: '有氧' },
          { key: '全身', label: '全身' },
        ],
        squareTemplates: [
          {
            id: 'sq_001', name: '新手5x5全身', author: 'FitNote官方',
            color: '#6366f1', color2: '#a855f7', likes: 3214, downloads: 8921,
            tags: ['全身', '新手', '增肌'],
            actions: [
              { name: '深蹲', sets: 5 },
              { name: '卧推', sets: 5 },
              { name: '杠铃划船', sets: 5 },
              { name: '推举', sets: 3 },
              { name: '硬拉', sets: 1 },
            ]
          },
          {
            id: 'sq_002', name: '推拉腿三分化', author: '大骏',
            color: '#0ea5e9', color2: '#14b8a6', likes: 2731, downloads: 7210,
            tags: ['全身', '分化', '增肌'],
            actions: [
              { name: '卧推', sets: 4 }, { name: '上斜哑铃飞鸟', sets: 3 },
              { name: '推举', sets: 4 }, { name: '侧平举', sets: 3 },
              { name: '绳索下压', sets: 3 },
            ]
          },
          {
            id: 'sq_003', name: '胸背超级组', author: '铁锤教练',
            color: '#f97316', color2: '#ef4444', likes: 1892, downloads: 4820,
            tags: ['胸', '背', '中级'],
            actions: [
              { name: '卧推', sets: 4 }, { name: '引体向上', sets: 4 },
              { name: '上斜卧推', sets: 3 }, { name: '高位下拉', sets: 3 },
              { name: '绳索夹胸', sets: 3 }, { name: '坐姿划船', sets: 3 },
            ]
          },
          {
            id: 'sq_004', name: '臀腿塑形(女)', author: 'JennyFitness',
            color: '#ec4899', color2: '#f43f5e', likes: 2540, downloads: 6100,
            tags: ['腿', '塑形', '女性'],
            actions: [
              { name: '臀推', sets: 4 }, { name: '深蹲', sets: 3 },
              { name: '保加利亚分腿蹲', sets: 3 }, { name: '罗马尼亚硬拉', sets: 3 },
              { name: '腿举', sets: 3 }, { name: '腿弯举', sets: 3 },
            ]
          },
          {
            id: 'sq_005', name: '核心雕刻(30min)', author: 'CoreGuru',
            color: '#10b981', color2: '#22d3ee', likes: 3980, downloads: 9280,
            tags: ['核心', '快速', '居家'],
            actions: [
              { name: '平板支撑', sets: 3 }, { name: '卷腹', sets: 4 },
              { name: '俄罗斯转体', sets: 3 }, { name: '悬垂举腿', sets: 3 },
              { name: '死虫式', sets: 3 },
            ]
          },
          {
            id: 'sq_006', name: '肩手轰炸', author: 'IronBabe',
            color: '#8b5cf6', color2: '#3b82f6', likes: 1721, downloads: 3340,
            tags: ['肩', '手臂', '进阶'],
            actions: [
              { name: '推举', sets: 4 }, { name: '侧平举', sets: 4 },
              { name: '前平举', sets: 3 }, { name: '杠铃弯举', sets: 4 },
              { name: '臂屈伸', sets: 4 }, { name: '锤式弯举', sets: 3 },
            ]
          },
        ],
      }
    },

    computed: {
      templateStore() {
        return useTemplateStore()
      },
      actionStore() {
        return useActionStore()
      },
      templates() {
        return this.templateStore.templates
      },
      filteredTemplates() {
        return (this.templates || []).filter(t => !t.isAerobic)
      },
      canConfirmImportExport() {
        if (this.importExportTab === 'export') {
          return this.selectedExportTemplates.length > 0
        } else {
          return this.parsedTemplates.length > 0
        }
      },
      categories() {
        return [{
            id: 'all',
            name: '全部'
          },
          ...this.actionStore.categories,
        ]
      },
      categoryCounts() {
        const counts = {
          all: this.actionStore.actions.length
        }
        this.actionStore.categories.forEach(c => {
          counts[c.id] = this.actionStore.actions.filter(a => a.categories.includes(c.id)).length
        })
        return counts
      },
      filteredActions() {
        let result = this.actionStore.actions
        if (this.activeCategory !== 'all') {
          result = result.filter(a => a.categories.includes(this.activeCategory))
        }
        if (this.searchTerm.trim()) {
          const q = this.searchTerm.trim().toLowerCase()
          result = result.filter(a => a.name.toLowerCase().includes(q))
        }
        return result
      },
      mainTabs() {
        return [
          { key: 'mine', label: '我的模板' },
          { key: 'square', label: '模板广场' },
        ]
      },
      filteredSquareTemplates() {
        const q = this.squareSearch.trim().toLowerCase()
        let list = this.squareTemplates || []
        if (this.squareTag !== 'all') {
          list = list.filter(t => (t.tags || []).includes(this.squareTag))
        }
        if (q) {
          list = list.filter(t => {
            const names = (t.actions || []).map(a => a.name)
            return (
              (t.name || '').toLowerCase().includes(q) ||
              (t.author || '').toLowerCase().includes(q) ||
              (t.tags || []).some(tg => String(tg).toLowerCase().includes(q)) ||
              names.some(n => String(n).toLowerCase().includes(q))
            )
          })
        }
        const sorted = list.slice()
        if (this.squareSort === 'newest') sorted.reverse()
        if (this.squareSort === 'downloads') sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        if (this.squareSort === 'hot') sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
        return sorted
      },
    },

    onShow() {
      this.loadData()
      this.$nextTick(() => this.measureTabHighlight())
    },

    onHide() {
      uni.removeStorageSync('temp_template_actions_backup')
    },

    onUnload() {
      this._isMounted = false
      uni.removeStorageSync('temp_template_actions_backup')
      this.isDragMode = false
      this.isNavigating = false
    },

    mounted() {
      this._isMounted = true
      this.daySettingsStore.load()
      const sys = uni.getSystemInfoSync()
      this.rowHeight = (sys.windowWidth / 750) * 180
      this.$nextTick(() => {
        setTimeout(() => this.initPositions(), 100)
      })
    },

    watch: {
      filteredTemplates: {
        handler() {
          if (this._isMounted && this.filteredTemplates.length > 0) {
            setTimeout(() => this.initPositions(), 100)
          }
        },
      },
    },

    methods: {
      // ===== 主 Tab 切换 + 页面级侧滑手势 =====
      switchMainTab(key, fromClick) {
        if (this.activeMainTab === key) return
        if (fromClick) uni.vibrateShort()
        this.activeMainTab = key
        this.$nextTick(() => this.measureTabHighlight())
      },

      // 链接9: 从模板广场导入到我的模板（覆盖/跳过 选择）
      async importSquareTemplate() {
        if (this._isImportingSquare) return
        const tpl = this.activeSquareTemplate
        if (!tpl) return

        const existing = this.templateStore.templates.find(t =>
          t.id === tpl.id || t.name === tpl.name)

        if (existing) {
          uni.showModal({
            title: '模板已存在',
            content: `检测到「${existing.name}」已存在，是否覆盖？`,
            confirmText: '覆盖',
            cancelText: '跳过',
            success: async (res) => {
              if (res.cancel) {
                uni.showToast({ title: '已跳过', icon: 'none' })
                return
              }
              await this._doImportSquareTemplate(tpl, existing, true)
            },
          })
        } else {
          await this._doImportSquareTemplate(tpl, null, false)
        }
      },

      async _doImportSquareTemplate(tpl, existing, isOverwrite) {
        this._isImportingSquare = true
        try {
          const newTpl = {
            id: isOverwrite && existing ? existing.id : ('sq_' + Date.now()),
            name: tpl.name,
            color: tpl.color || '#379bff',
            actions: JSON.parse(JSON.stringify(tpl.actions || [])),
            tags: tpl.tags || [],
            source: 'square',
            squareId: tpl.id,
            importedAt: Date.now(),
          }

          if (isOverwrite && existing) {
            const idx = this.templateStore.templates.findIndex(t => t.id === existing.id)
            if (idx >= 0) {
              this.templateStore.templates.splice(idx, 1, newTpl)
            }
            uni.showToast({ title: '已覆盖', icon: 'success' })
          } else {
            this.templateStore.templates.push(newTpl)
            uni.showToast({ title: '导入成功', icon: 'success' })
          }
          this.templateStore.saveTemplates()
          this.loadData()
          this.closeSquareDetail()
        } catch (e) {
          console.error('导入失败:', e)
          uni.showToast({ title: '导入失败: ' + (e.message || ''), icon: 'none' })
        } finally {
          this._isImportingSquare = false
        }
      },

      // ===== 模板广场：分享 =====
      openSquareShare() {
        this.shareForm = { name: '', desc: '', templateId: '' }
        this.showSquareShare = true
      },
      closeSquareShare() {
        this.showSquareShare = false
      },
      // 详情弹窗里的"分享"：复制当前广场模板为分享码
      shareSquareTemplate() {
        const tpl = this.activeSquareTemplate
        if (!tpl) return
        try {
          const code = JSON.stringify({ n: tpl.name, a: tpl.actions, t: tpl.tags, c: tpl.color })
          uni.setClipboardData({
            data: code,
            success: () => uni.showToast({ title: '分享码已复制', icon: 'success' }),
          })
        } catch (e) {
          uni.showToast({ title: '分享失败', icon: 'none' })
        }
      },
      // FAB 分享：将我的模板复制为分享码
      doShareTemplate() {
        if (!this.shareForm.templateId) {
          uni.showToast({ title: '请先选择模板', icon: 'none' })
          return
        }
        const tpl = this.templateStore.templates.find(t => t.id === this.shareForm.templateId)
        if (!tpl) return
        try {
          const code = JSON.stringify({
            n: this.shareForm.name || tpl.name,
            d: this.shareForm.desc,
            a: tpl.actions,
            c: tpl.color,
          })
          uni.setClipboardData({
            data: code,
            success: () => {
              uni.showToast({ title: '分享码已复制', icon: 'success' })
              this.closeSquareShare()
            },
          })
        } catch (e) {
          uni.showToast({ title: '分享失败', icon: 'none' })
        }
      },

      measureTabHighlight() {
        this.$nextTick(() => {
          uni.createSelectorQuery().in(this).selectAll('.main-tab-item').boundingClientRect().exec(res => {
            if (res && res[0] && res[0].length > 0) {
              const items = res[0]
              const idx = this.mainTabs.findIndex(t => t.key === this.activeMainTab)
              if (idx >= 0 && items[idx]) {
                this.tabHighlightX = items[idx].left - items[0].left
                this.tabHighlightW = items[idx].width
                this.tabHighlightMeasured = true
              }
            }
          })
        })
      },

      onPageSwipeStart(e) {
        if (this.isDragMode || this.showImportExportPanel) return
        if (e.touches.length !== 1) return
        this.swipeStartX = e.touches[0].pageX
        this.swipeStartY = e.touches[0].pageY
        this.swipeStartTime = Date.now()
        this.swipeDeltaX = 0
        this.swipeTabNoTransition = true
        this.swipeIsTracking = true
        this.baseTabHighlightX = this.tabHighlightX
        if (!this.tabHighlightMeasured) this.measureTabHighlight()
      },

      onPageSwipeMove(e) {
        if (!this.swipeIsTracking || e.touches.length !== 1) return
        const dx = e.touches[0].pageX - this.swipeStartX
        const dy = e.touches[0].pageY - this.swipeStartY
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        if (absDx <= absDy * 1.9) return
        this.swipeDeltaX = dx
        // 高亮框跟手（带边界阻尼）
        const curIdx = this.mainTabs.findIndex(t => t.key === this.activeMainTab)
        let deltaX = dx
        if ((curIdx === 0 && dx > 0) || (curIdx === this.mainTabs.length - 1 && dx < 0)) {
          deltaX = dx * 0.3
        }
        this.tabHighlightX = this.baseTabHighlightX + deltaX
        if (e.cancelable) e.preventDefault()
      },

      onPageSwipeEnd() {
        if (!this.swipeIsTracking) return
        this.swipeIsTracking = false
        this.swipeTabNoTransition = false
        const dx = this.swipeDeltaX
        const absDx = Math.abs(dx)
        const dt = Date.now() - this.swipeStartTime
        const distThreshold = (this.tabHighlightW || 80) * 0.5
        const speedThreshold = 0.3
        if (absDx < distThreshold && dt > 0 && absDx / dt < speedThreshold) {
          this.swipeDeltaX = 0
          this.measureTabHighlight()
          return
        }
        // 方向：右滑 → 上一个；左滑 → 下一个
        const dir = dx > 0 ? -1 : 1
        const curIdx = this.mainTabs.findIndex(t => t.key === this.activeMainTab)
        const nextIdx = curIdx + dir
        if (nextIdx < 0 || nextIdx >= this.mainTabs.length) {
          this.swipeDeltaX = 0
          this.measureTabHighlight()
          return
        }
        this.swipeDeltaX = 0
        uni.vibrateShort()
        this.switchMainTab(this.mainTabs[nextIdx].key, false)
      },

      openImportExportPanel() {
        this.showImportExportPanel = true
        this.importExportTab = 'export'
        this.selectedExportTemplates = []
        this.importText = ''
        this.parsedTemplates = []
      },
      loadData() {
        this.loading = true
        this.actionStore.load()
        this.templateStore.load()
        this.slideOffset = []
        this.$nextTick(() => {
          this.loading = false
        })
      },

      // ========== 位置初始化（与 templateDetail.vue 一致） ==========

      initPositions() {
        if (!this._isMounted || this.filteredTemplates.length === 0) return

        const newItemY = []
        for (let i = 0; i < this.filteredTemplates.length; i++) {
          const exactY = i * this.rowHeight
          newItemY[i] = Math.round(exactY)
        }

        this.itemY = newItemY

        if (this.slideOffset.length !== this.filteredTemplates.length) {
          this.slideOffset = new Array(this.filteredTemplates.length).fill(0)
        }
      },

      // ========== 侧滑删除（与 templateDetail.vue 一致） ==========

      onTouchStart(e, idx) {
        this.startX = e.touches[0].pageX
        this.startY = e.touches[0].pageY
        this.startTime = Date.now()
        this.isClick = true

        if (!this.isDragMode) {
          this.$set(this.slideOffset, idx, 0)
        }
      },

      onTouchMove(e, idx) {
        if (this.isDragMode) return

        const currentX = e.touches[0].pageX
        const currentY = e.touches[0].pageY
        const deltaX = currentX - this.startX
        const deltaY = currentY - this.startY

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.isClick = false
        }

        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            this.$set(this.slideOffset, idx, Math.max(deltaX, -100))
          } else if (deltaX > 0 && this.slideOffset[idx] < 0) {
            this.$set(this.slideOffset, idx, Math.min(0, this.slideOffset[idx] + deltaX))
          }

          if (e.cancelable) {
            e.preventDefault()
            e.stopPropagation()
          }
        } else {
          this.$set(this.slideOffset, idx, 0)
        }
      },

      onTouchEnd(e, idx) {
        if (this.isDragMode) return

        const touchDuration = Date.now() - this.startTime

        if (this.isClick && touchDuration < 300 && (this.slideOffset[idx] || 0) === 0) {
          setTimeout(() => {
            if (!this.isDragMode) {
              this.goToTemplateDetail(this.filteredTemplates[idx].name)
            }
          }, 50)
        }

        if ((this.slideOffset[idx] || 0) < -50) {
          this.$set(this.slideOffset, idx, -80)
        } else {
          this.$set(this.slideOffset, idx, 0)
        }

        this.isClick = false
        this.startX = 0
        this.startTime = 0
      },

      // ========== 拖拽排序（与 templateDetail.vue 完全一致） ==========

      onDragTrigger(idx) {
        this.isDragTriggered = true
        this.hasSwapped = false
        this.dragIdx = idx
        this.isDragMode = true
        uni.vibrateShort()
        this.$set(this.slideOffset, idx, 0)
      },

      onDragMove(e, idx) {
        if (!this.isDragMode || this.dragIdx !== idx) return

        const currentY = e.detail.y
        const baseY = idx * this.rowHeight
        const offsetY = currentY - baseY

        const shouldSwapDown = offsetY > this.rowHeight * 0.5 && idx < this.filteredTemplates.length - 1
        const shouldSwapUp = offsetY < -this.rowHeight * 0.5 && idx > 0

        if (shouldSwapDown || shouldSwapUp) {
          const targetIdx = shouldSwapDown ? idx + 1 : idx - 1

          if (targetIdx === this.lastTargetIdx) return
          this.lastTargetIdx = targetIdx
          this.hasSwapped = true

          const globalIdx = this.templateStore.templates.findIndex(t => t.id === this.filteredTemplates[idx].id)
          const targetGlobalIdx = this.templateStore.templates.findIndex(t => t.id === this.filteredTemplates[targetIdx]
            .id)
          if (globalIdx !== -1 && targetGlobalIdx !== -1) {
            const arr = this.templateStore.templates.slice();
            [arr[globalIdx], arr[targetGlobalIdx]] = [arr[targetGlobalIdx], arr[globalIdx]]
            this.templateStore.templates = arr
            this.templateStore.save()
          }

          this.dragIdx = targetIdx
          this.smoothUpdatePositions()

          const now = Date.now()
          if (now - this.lastVibrateTime > 150) {
            uni.vibrateShort()
            this.lastVibrateTime = now
          }
        } else {
          const minY = 0
          const maxY = (this.filteredTemplates.length - 1) * this.rowHeight
          const clampedY = Math.max(minY, Math.min(currentY, maxY))
          this.$set(this.itemY, idx, clampedY)
        }
      },

      smoothUpdatePositions() {
        for (let i = 0; i < this.filteredTemplates.length; i++) {
          this.$set(this.itemY, i, i * this.rowHeight)
        }
      },

      onDragEnd() {
        if (!this.isDragTriggered) return

        this.isDragMode = false
        this.dragIdx = -1
        this.lastTargetIdx = -1

        if (this.isDragTriggered) {
          this.initPositions()
          this.templateStore.save()
        }

        this.isDragTriggered = false
        this.hasSwapped = false
      },

      // ========== 删除 ==========

      handleDelete(filteredIdx) {
        const filt = this.filteredTemplates
        if (!filt || filteredIdx < 0 || filteredIdx >= filt.length) return
        const tpl = filt[filteredIdx]

        uni.showModal({
          title: '删除模板',
          content: `确定删除「${tpl.name}」吗？`,
          confirmText: '删除',
          cancelText: '取消',
          confirmColor: '#ff5a5d',
          success: res => {
            if (res.confirm) {
              this.backupTemplateColorToDayData(tpl.name, tpl.color)
              this.templateStore.removeTemplate(tpl.id || tpl.name)
              this.$nextTick(() => {
                this.initPositions()
                this.slideOffset = new Array(this.filteredTemplates.length).fill(0)
              })
              uni.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 1500
              })
            } else {
              this.$set(this.slideOffset, filteredIdx, 0)
              uni.showToast({
                title: '已取消删除',
                icon: 'none',
                duration: 1500
              })
            }
          },
        })
      },

      backupTemplateColorToDayData(templateName, templateColor) {
        if (!templateColor) return
        const storageInfo = uni.getStorageInfoSync()
        const dayKeys = storageInfo.keys.filter(key => key.startsWith(DAYDATA_PREFIX))

        dayKeys.forEach(key => {
          const dayData = uni.getStorageSync(key) || {}
          if (dayData.templates && dayData.templates[templateName]) {
            if (!dayData.color) {
              dayData.color = templateColor
              uni.setStorageSync(key, dayData)
            }
            if (dayData.templates[templateName] && !dayData.templates[templateName].color) {
              dayData.templates[templateName].color = templateColor
              uni.setStorageSync(key, dayData)
            }
          }
        })
      },

      goToTemplateDetail(name) {
        if (this.isDragMode) return
        if (this.isNavigating) return
        this.isNavigating = true
        uni.navigateTo({
          url: `/pages/templateDetail/templateDetail?template=${encodeURIComponent(name)}`,
          complete: () => {
            this.isNavigating = false
          },
        })
      },

      // ========== 新建模板 ==========

      openCreatePanel() {
        this.showCreatePanel = true
        this.newTemplateName = ''
        this.searchTerm = ''
        this.activeCategory = 'all'
        this.selectedActions = []
        this.selectedColor = this.presetColors[0].value
      },

      closeCreatePanel() {
        this.showCreatePanel = false
        this.newTemplateName = ''
        this.searchTerm = ''
        this.activeCategory = 'all'
        this.selectedActions = []
        this.selectedColor = this.presetColors[0].value
      },

      toggleAction(name) {
        const idx = this.selectedActions.indexOf(name)
        if (idx === -1) {
          this.selectedActions.push(name)
        } else {
          this.selectedActions.splice(idx, 1)
        }
      },

      confirmCreate() {
        const name = this.newTemplateName.trim()
        if (!name) {
          uni.showToast({
            title: '请输入模板名称',
            icon: 'none'
          })
          return
        }
        if (this.templateStore.templates.some(t => t.name === name)) {
          uni.showToast({
            title: '已存在同名模板',
            icon: 'none'
          })
          return
        }

        this.templateStore.addTemplate(name)
        const tpl = this.templateStore.templates.find(t => t.name === name)
        if (tpl) {
          tpl.actions = [...this.selectedActions]
          tpl.color = this.selectedColor
          this.templateStore.save()
        }

        uni.showToast({
          title: '模板创建成功',
          icon: 'success'
        })
        this.closeCreatePanel()
      },
      closeImportExportPanel() {
        this.showImportExportPanel = false
      },
      isTemplateSelected(tpl) {
        return this.selectedExportTemplates.some(t => t.id === tpl.id)
      },
      toggleTemplateSelect(tpl) {
        const idx = this.selectedExportTemplates.findIndex(t => t.id === tpl.id)
        if (idx === -1) {
          this.selectedExportTemplates.push(tpl)
        } else {
          this.selectedExportTemplates.splice(idx, 1)
        }
      },
      toggleSelectAll() {
        if (this.selectedExportTemplates.length === this.filteredTemplates.length) {
          this.selectedExportTemplates = []
        } else {
          this.selectedExportTemplates = [...this.filteredTemplates]
        }
      },
      exportTemplates() {
        if (this.selectedExportTemplates.length === 0) {
          uni.showToast({
            title: '请选择要导出的模板',
            icon: 'none'
          })
          return
        }

        let text = ''
        this.selectedExportTemplates.forEach((tpl, idx) => {
          if (idx > 0) text += '\n\n'
          text += `${tpl.name}：\n`
          if (tpl.actions && tpl.actions.length > 0) {
            tpl.actions.forEach(act => {
              const sets = (tpl.actionSets && tpl.actionSets[act]) || 4
              text += `${act}×${sets}\n`
            })
          }
        })

        uni.setClipboardData({
          data: text,
          success: () => {
            uni.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
            this.closeImportExportPanel()
          }
        })
      },
      pasteFromClipboard() {
        uni.getClipboardData({
          success: (res) => {
            if (res && res.data) {
              this.importText = res.data
              const parsed = this.parseTemplateText(res.data)
              this.parsedTemplates = parsed
              if (parsed.length === 0) {
                uni.showToast({ title: '未能识别到模板数据', icon: 'none' })
              }
            } else {
              uni.showToast({ title: '剪贴板为空', icon: 'none' })
            }
          },
          fail: () => {
            uni.showToast({ title: '获取剪贴板失败', icon: 'none' })
          }
        })
      },
      parseTemplateText(text) {
        const templates = []
        if (!text || !text.trim()) return templates
        
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        
        const tplBlocks = normalizedText.trim().split(/\n\s*\n/)
        
        if (tplBlocks.length === 0) {
          return this.trySingleTemplateParse(normalizedText)
        }
        
        tplBlocks.forEach(block => {
          const trimmedBlock = block.trim()
          if (!trimmedBlock) return
          
          const lines = trimmedBlock.split('\n')
          if (!lines.length) return
          
          const nameLine = lines[0].trim()
          let name = ''
          if (nameLine.endsWith('：')) {
            name = nameLine.slice(0, -1).trim()
          } else if (nameLine.endsWith(':')) {
            name = nameLine.slice(0, -1).trim()
          } else {
            const colonIndex = nameLine.lastIndexOf('：')
            if (colonIndex > 0) {
              name = nameLine.slice(0, colonIndex).trim()
            } else {
              const colonIndexEn = nameLine.lastIndexOf(':')
              if (colonIndexEn > 0) {
                name = nameLine.slice(0, colonIndexEn).trim()
              }
            }
          }
          if (!name) return
          
          const actions = []
          const actionSets = {}
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            
            const match = line.match(/^(.+?)[\u00D7\u0078\u00D7×x*](\d+)\s*$/)
            if (match) {
              const actName = match[1].trim()
              const sets = parseInt(match[2])
              if (actName && sets > 0) {
                actions.push(actName)
                actionSets[actName] = sets
              }
            } else {
              const simpleMatch = line.match(/^(.+?)\s*[\u00D7×x*]\s*(\d+)/)
              if (simpleMatch) {
                const actName = simpleMatch[1].trim()
                const sets = parseInt(simpleMatch[2])
                if (actName && sets > 0) {
                  actions.push(actName)
                  actionSets[actName] = sets
                }
              }
            }
          }
          
          if (actions.length > 0) {
            templates.push({
              id: String(Date.now()) + Math.random().toString(36).slice(2),
              name,
              actions,
              actionSets,
              actionOrder: [...actions],
              actionWeights: {},
              color: '',
              customColors: [],
              isAerobic: false
            })
          }
        })
        
        return templates.length > 0 ? templates : this.trySingleTemplateParse(normalizedText)
      },
      trySingleTemplateParse(text) {
        const templates = []
        const lines = text.trim().split('\n')
        if (lines.length < 2) return templates
        
        const nameLine = lines[0].trim()
        let name = ''
        if (nameLine.endsWith('：')) {
          name = nameLine.slice(0, -1).trim()
        } else if (nameLine.endsWith(':')) {
          name = nameLine.slice(0, -1).trim()
        }
        if (!name) return templates
        
        const actions = []
        const actionSets = {}
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          const match = line.match(/^(.+?)[\u00D7\u0078\u00D7×x*](\d+)\s*$/)
          if (match) {
            const actName = match[1].trim()
            const sets = parseInt(match[2])
            if (actName && sets > 0) {
              actions.push(actName)
              actionSets[actName] = sets
            }
          } else {
            const simpleMatch = line.match(/^(.+?)\s*[\u00D7×x*]\s*(\d+)/)
            if (simpleMatch) {
              const actName = simpleMatch[1].trim()
              const sets = parseInt(simpleMatch[2])
              if (actName && sets > 0) {
                actions.push(actName)
                actionSets[actName] = sets
              }
            }
          }
        }
        
        if (actions.length > 0) {
          templates.push({
            id: String(Date.now()) + Math.random().toString(36).slice(2),
            name,
            actions,
            actionSets,
            actionOrder: [...actions],
            actionWeights: {},
            color: '',
            customColors: [],
            isAerobic: false
          })
        }
        
        return templates
      },
      onImportTextInput() {
        this.parsedTemplates = this.parseTemplateText(this.importText)
      },
      checkConflicts(templates) {
        const conflicts = []
        templates.forEach(tpl => {
          const exists = this.templateStore.templates.some(t => t.name === tpl.name)
          if (exists) {
            conflicts.push({
              name: tpl.name,
              action: 'skip',
              template: tpl
            })
          }
        })
        return conflicts
      },
      resolveConflictsAndImport() {
        this.conflictItems.forEach(item => {
          if (item.action === 'skip') return

          let newName = item.name
          if (item.action === 'rename') {
            let idx = 1
            while (this.templateStore.templates.some(t => t.name === `${newName} (${idx})`)) {
              idx++
            }
            newName = `${newName} (${idx})`
          } else if (item.action === 'overwrite') {
            const existingIdx = this.templateStore.templates.findIndex(t => t.name === item.name)
            if (existingIdx !== -1) {
              this.templateStore.templates.splice(existingIdx, 1)
            }
          }

          const tpl = {
            ...item.template
          }
          tpl.id = String(Date.now()) + Math.random().toString(36).slice(2)
          tpl.name = newName
          this.templateStore.templates.push(tpl)
        })

        this.templateStore.save()
        uni.showToast({
          title: '导入成功',
          icon: 'success'
        })
        this.closeConflictPanel()
        this.closeImportExportPanel()
      },
      confirmImportExport() {
        if (this.importExportTab === 'export') {
          this.exportTemplates()
        } else {
          this.startImport()
        }
      },
      startImport() {
        if (this.parsedTemplates.length === 0) {
          uni.showToast({
            title: '未能识别到模板数据',
            icon: 'none'
          })
          return
        }

        const conflicts = this.checkConflicts(this.parsedTemplates)

        if (conflicts.length > 0) {
          this.conflictItems = conflicts
          this.showConflictPanel = true
        } else {
          this.parsedTemplates.forEach(tpl => {
            this.templateStore.templates.push(tpl)
          })
          this.templateStore.save()
          uni.showToast({
            title: '导入成功',
            icon: 'success'
          })
          this.closeImportExportPanel()
        }
      },
      closeConflictPanel() {
        this.showConflictPanel = false
        this.conflictItems = []
      },
      setConflictAction(idx, action) {
        this.conflictItems[idx].action = action
      },
      confirmConflictResolve() {
        const conflictTplNames = this.conflictItems.map(c => c.name)
        const nonConflictTpls = this.parsedTemplates.filter(t => !conflictTplNames.includes(t.name))

        nonConflictTpls.forEach(tpl => {
          this.templateStore.templates.push(tpl)
        })

        this.resolveConflictsAndImport()
      },
    }
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

  .mid-scroll {
    position: relative;
    flex: 1;
    overflow-y: auto;
    background-color: transparent;
    padding-bottom: 80px;
  }

  .loading-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid var(--border-color);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    margin-top: 20rpx;
    font-size: 28rpx;
    color: var(--text-secondary);
  }

  /* 拖拽容器（与 templateDetail.vue 一致） */
  .movable-area {
    width: 100%;
    position: relative;
    opacity: 1;
    transition: opacity 0.2s ease;
    overflow: visible;
  }

  .item-slot {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 92%;
    height: 180rpx;
    /* background: rgba(55, 155, 255, 0.06);
    border-radius: 16rpx;
    border: 2rpx dashed rgba(55, 155, 255, 0.18); */
  }

  .movable-item {
    width: 100%;
    height: 180rpx;
    display: flex;
    align-items: center;
    transition: none !important;
  }

  .movable-item:not(.is-dragging) {
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
  }

  .is-dragging {
    z-index: 999 !important;
    transition: none !important;
  }

  /* 侧滑容器（与 templateDetail.vue 一致） */
  .slide-wrapper {
    position: relative;
    width: 100%;
    height: 156rpx;
    margin: 0 30rpx;
    overflow: visible;
    background-color: transparent;
  }

  .delete-btn-container {
    position: absolute;
    right: 2rpx;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
  }

  .delete-btn {
    width: 130rpx;
    height: 100rpx;
    background-color: var(--danger);
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 26rpx;
    font-weight: 500;
    z-index: 1;
  }

  .action-card {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    background: var(--bg-secondary);
    border-radius: 16rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 12rpx var(--shadow-color);
    transition: transform 0.2s ease;
  }

  .container.light .action-card {
    background: var(--bg-secondary);
    box-shadow: 0 4rpx 12rpx var(--shadow-color);
  }

  .card-color-bar {
    width: 12rpx;
    flex-shrink: 0;
    align-self: stretch;
  }

  .card-info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    flex: 1;
    min-width: 0;
    padding: 28rpx 20rpx;
  }

  .card-name {
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-count {
    font-size: 24rpx;
    color: var(--text-secondary);
  }

  .container.light .card-name {
    color: var(--text-primary);
  }

  .container.light .card-count {
    color: var(--text-muted);
  }

  .card-arrow {
    font-size: 36rpx;
    color: var(--text-placeholder);
    padding: 28rpx 24rpx;
    flex-shrink: 0;
  }

  .container.light .card-arrow {
    color: var(--text-secondary);
  }

  /* 拖拽高亮（与 templateDetail.vue 一致） */
  .is-dragging .action-card {
    transition: none;
    transform: scale(1.05) !important;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.8);
    border: 1rpx solid var(--border-color);
  }

  .is-dragging .card-arrow {
    display: none;
  }

  /* 空状态 */
  .empty-state-inside {
    position: absolute;
    top: 200rpx;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: var(--text-muted);
  }

  .container.light .empty-text {
    color: var(--text-secondary);
  }

  /* 底部新建按钮 */
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 20rpx;
    padding: 20rpx 30rpx 40rpx;
    background: linear-gradient(transparent, var(--bg-primary) 40rpx);
    z-index: 10;
  }

  .container.light .bottom-bar {
    background: linear-gradient(transparent, var(--bg-primary) 40rpx);
  }

  .btn-import-export {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    height: 88rpx;
    background: var(--bg-tertiary);
    border-radius: 44rpx;
    color: var(--text-primary);
    font-size: 28rpx;
    font-weight: 600;
  }

  .container.light .btn-import-export {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-icon {
    font-size: 32rpx;
  }

  .btn-label {
    font-size: 28rpx;
  }

  .btn-create {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    height: 88rpx;
    background: var(--primary);
    border-radius: 44rpx;
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
    box-shadow: 0 8rpx 24rpx rgba(55, 155, 255, 0.3);
  }

  .btn-create:active {
    opacity: 0.8;
  }

  .btn-create-icon {
    font-size: 36rpx;
    font-weight: 400;
  }

  .btn-create-label {
    font-size: 30rpx;
  }

  .container.light .panel-header {
    border-bottom-color: var(--border-color);
  }

  .container.light .panel-title {
    color: var(--text-primary);
  }

  .container.light .close-btn {
    color: var(--text-muted);
  }

  .popup-overlay {
    align-items: flex-end;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx;
    border-bottom: 1rpx solid var(--border-color);
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 34rpx;
    font-weight: 700;
    color: var(--text-primary);
  }

  .close-btn {
    font-size: 40rpx;
    color: var(--text-secondary);
    padding: 8rpx;
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 24rpx 32rpx;
    padding-bottom: 0;
  }

  .btn-confirm {
    width: 100%;
    height: 88rpx;
    background: var(--primary);
    border-radius: 44rpx;
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    box-shadow: 0 8rpx 24rpx rgba(55, 155, 255, 0.3);
  }

  .btn-confirm:active {
    opacity: 0.8;
  }

  .form-group {
    margin-bottom: 24rpx;
  }

  .form-label {
    display: block;
    font-size: 28rpx;
    color: var(--text-secondary);
    margin-bottom: 12rpx;
  }

  .container.light .form-label {
    color: var(--text-muted);
  }

  .form-input {
    width: 100%;
    height: 72rpx;
    background: var(--bg-tertiary);
    border-radius: 16rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .form-input::placeholder {
    color: var(--text-muted);
  }

  .container.light .form-input {
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    color: var(--text-primary);
  }

  .container.light .form-input::placeholder {
    color: var(--text-secondary);
  }

  .search-bar {
    margin-bottom: 20rpx;
  }

  .search-bar-inner {
    display: flex;
    align-items: center;
    height: 64rpx;
    background: var(--bg-tertiary);
    border-radius: 32rpx;
    padding: 0 24rpx;
  }

  .container.light .search-bar-inner {
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
  }

  .search-icon {
    font-size: 24rpx;
    margin-right: 12rpx;
  }

  .container.light .search-icon {
    color: var(--text-secondary);
  }

  .search-input {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .container.light .search-input {
    color: var(--text-primary);
  }

  .container.light .search-input::placeholder {
    color: var(--text-secondary);
  }

  .clear-icon {
    font-size: 32rpx;
    color: var(--text-muted);
    padding: 8rpx;
  }

  .category-scroll {
    margin-bottom: 20rpx;
    white-space: nowrap;
    padding-bottom: 8rpx;
  }

  .category-tab {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    margin-right: 16rpx;
    background: var(--bg-tertiary);
    border-radius: 24rpx;
    font-size: 24rpx;
    color: var(--text-secondary);
  }

  .category-tab.active {
    background: var(--primary);
    color: #fff;
  }

  .container.light .category-tab {
    background: var(--bg-secondary);
    color: var(--text-muted);
    border: 1rpx solid var(--border-color);
  }

  .container.light .category-tab.active {
    background: var(--primary);
    color: #ffffff;
  }

  .category-name {
    font-size: 24rpx;
  }

  .category-count {
    font-size: 20rpx;
    opacity: 0.7;
  }

  .action-list {
    max-height: 400rpx;
    margin-bottom: 16rpx;
  }

  .action-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 16rpx 24rpx;
    background: var(--bg-tertiary);
    border-radius: 16rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    border: 2rpx solid transparent;
    transition: all 0.2s;
  }

  .action-item.selected {
    background: rgba(55, 155, 255, 0.15);
    border-color: var(--primary);
    color: var(--primary);
  }

  .action-item:active {
    opacity: 0.7;
  }

  .container.light .action-item {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1rpx solid var(--border-color);
  }

  .container.light .action-item.selected {
    background: rgba(55, 155, 255, 0.1);
    border-color: var(--primary);
    color: var(--primary);
  }

  .action-name {
    font-size: 26rpx;
  }

  .check-mark {
    font-size: 20rpx;
    color: var(--primary);
  }

  .no-actions {
    text-align: center;
    padding: 40rpx 0;
    color: var(--text-muted);
    font-size: 26rpx;
  }

  .selected-count {
    text-align: center;
    padding: 12rpx 0;
    font-size: 24rpx;
    color: var(--text-secondary);
    border-top: 1rpx solid var(--border-color);
    margin-bottom: 16rpx;
  }

  .container.light .selected-count {
    border-top-color: var(--border-color);
    color: var(--text-muted);
  }

  .color-section {
    margin-bottom: 20rpx;
  }

  .color-label {
    display: block;
    font-size: 28rpx;
    color: var(--text-secondary);
    margin-bottom: 16rpx;
  }

  .color-options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .color-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    width: calc(20% - 16rpx);
    padding: 8rpx 0;
    border-radius: 12rpx;
    border: 2rpx solid transparent;
  }

  .color-item.active {
    border-color: var(--primary);
    background: rgba(55, 155, 255, 0.1);
  }

  .color-circle {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.3);
  }

  .color-name {
    font-size: 20rpx;
    color: var(--text-secondary);
    text-align: center;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1rpx solid var(--border-color);
  }

  .container.light .tab-bar {
    border-bottom-color: var(--border-color);
  }

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    font-size: 28rpx;
    color: var(--text-secondary);
    border-bottom: 3rpx solid transparent;
  }

  .tab-item.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .select-all-row {
    padding: 10rpx 0;
  }

  .select-all-btn {
    display: inline-flex;
    align-items: center;
    padding: 8rpx 16rpx;
    background: var(--bg-tertiary);
    border-radius: 8rpx;
    font-size: 24rpx;
    color: var(--text-primary);
  }

  .container.light .select-all-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .template-list {
    max-height: 500rpx;
  }

  .template-checkbox-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 20rpx 0;
    border-bottom: 1rpx solid var(--border-color);
  }

  .container.light .template-checkbox-item {
    border-bottom-color: var(--border-color);
  }

  .checkbox-box {
    width: 40rpx;
    height: 40rpx;
    border: 2rpx solid var(--text-muted);
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .checkbox-box.checked {
    background: var(--primary);
    border-color: var(--primary);
  }

  .checkbox-check {
    color: #fff;
    font-size: 24rpx;
    font-weight: bold;
  }

  .template-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  .template-name {
    font-size: 28rpx;
    color: var(--text-primary);
  }

  .container.light .template-name {
    color: var(--text-primary);
  }

  .template-count {
    font-size: 22rpx;
    color: var(--text-secondary);
  }

  .paste-btn-row {
    margin-bottom: 16rpx;
  }

  .paste-btn {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    background: var(--primary);
    border-radius: 8rpx;
    font-size: 26rpx;
    color: #fff;
  }

  .import-textarea {
    width: 100%;
    height: 300rpx;
    background: var(--bg-tertiary);
    border-radius: 16rpx;
    padding: 20rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .container.light .import-textarea {
    background: var(--bg-secondary);
    border: 1rpx solid var(--border-color);
    color: var(--text-primary);
  }

  .import-textarea::placeholder {
    color: var(--text-muted);
  }

  .parse-result {
    margin-top: 16rpx;
    padding: 12rpx;
    background: rgba(55, 155, 255, 0.1);
    border-radius: 8rpx;
  }

  .parse-success {
    color: var(--primary);
    font-size: 24rpx;
  }

  .panel-footer {
    display: flex;
    gap: 16rpx;
    padding: 20rpx 32rpx 40rpx;
  }

  .btn-cancel-popup {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 40rpx;
    color: var(--text-primary);
    font-size: 28rpx;
  }

  .container.light .btn-cancel-popup {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-confirm-popup {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    border-radius: 40rpx;
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
  }

  .btn-confirm-popup.disabled {
    opacity: 0.5;
  }

  .conflict-item {
    padding: 20rpx 0;
    border-bottom: 1rpx solid var(--border-color);
  }

  .container.light .conflict-item {
    border-bottom-color: var(--border-color);
  }

  .conflict-name {
    font-size: 28rpx;
    color: var(--text-primary);
    display: block;
    margin-bottom: 12rpx;
  }

  .container.light .conflict-name {
    color: var(--text-primary);
  }

  .conflict-options {
    display: flex;
    gap: 12rpx;
  }

  .conflict-option {
    flex: 1;
    padding: 12rpx;
    text-align: center;
    background: var(--bg-tertiary);
    border-radius: 8rpx;
    font-size: 24rpx;
    color: var(--text-primary);
  }

  .container.light .conflict-option {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .conflict-option.active {
    background: var(--primary);
    color: #fff;
  }

  /* ========== 链接6: 平板适配 — 容器宽度封顶 + rpx→px 媒体查询 ========== */
  /* 第一层：水平宽度封顶（关键容器 + flex 居中） */
  .main-tab-bar,
  .mid-scroll,
  .bottom-bar,
  .square-wrap,
  .popup-panel,
  .square-detail-panel {
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
  }

  .bottom-bar {
    left: 50%;
    transform: translateX(-50%);
  }

  /* 第二层：封面改用 aspect-ratio 替代固定高度 */
  .sq-tpl-cover,
  .sq-detail-cover {
    aspect-ratio: 16 / 10;
    width: 100%;
    height: auto !important;
  }

  /* 第三层：@media (min-width: 500px) 把 rpx 关键尺寸回退到手机 375px 视觉比例 */
  @media (min-width: 500px) {
    /* 顶部 tab */
    .main-tab-item { padding: 10px 12px !important; font-size: 14px !important; }
    .main-tab-text { font-size: 14px !important; }

    /* 卡片 */
    .item-slot,
    .movable-item { height: 90px !important; }
    .slide-wrapper { height: 78px !important; }
    .delete-btn { width: 65px !important; height: 50px !important; font-size: 13px !important; }
    .action-card { padding: 10px 12px !important; }
    .card-name { font-size: 15px !important; }
    .card-count { font-size: 11px !important; }
    .card-arrow { font-size: 18px !important; }
    .card-color-bar { width: 3px !important; }

    /* 底部按钮 */
    .btn-import-export,
    .btn-create { height: 44px !important; font-size: 14px !important; padding: 0 16px !important; }
    .btn-icon,
    .btn-create-icon { font-size: 16px !important; }
    .btn-label,
    .btn-create-label { font-size: 13px !important; }

    /* 广场版 */
    .square-wrap { padding: 12px !important; }
    .sq-search-input { height: 36px !important; font-size: 13px !important; padding: 0 10px !important; }
    .sq-sort-item { font-size: 12px !important; padding: 4px 10px !important; }
    .sq-tpl-card { padding: 10px !important; }
    .sq-tpl-title { font-size: 15px !important; }
    .sq-tpl-stat { font-size: 11px !important; }
    .sq-tpl-cover-icon { font-size: 32px !important; }

    /* 详情/分享弹窗 */
    .popup-panel { padding: 14px 16px !important; }
    .popup-header { font-size: 16px !important; padding-bottom: 10px !important; }
    .sq-detail-cover { aspect-ratio: 16 / 9 !important; }

    /* 颜色选择 */
    .color-item { padding: 4px 0 !important; }
    .color-circle { width: 28px !important; height: 28px !important; }
    .color-name { font-size: 10px !important; }
  }

  /* ===== 模板广场：分享 FAB ===== */
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
  .sq-share-fab:active { transform: translateX(-50%) scale(0.96); }
  .sq-share-fab-icon { font-size: 18px; white-space: nowrap; }
  .sq-share-fab-text { font-size: 16px; font-weight: 700; white-space: nowrap; }

  /* ===== 模板广场：分享弹窗输入框 ===== */
  .sq-share-input,
  .sq-share-textarea {
    width: 100%;
    height: 88rpx;
    background: var(--bg-tertiary);
    border: 1rpx solid var(--border-color);
    border-radius: 20rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }
  .sq-share-textarea {
    height: 160rpx;
    padding: 16rpx 24rpx;
    line-height: 1.5;
  }
  .sq-share-pick-list {
    max-height: 50vh;
    overflow-y: auto;
  }
  .sq-share-pick {
    padding: 12rpx 20rpx;
    border: 1rpx solid var(--border-color);
    border-radius: 12rpx;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sq-share-pick:active { opacity: 0.7; }
  .sq-share-pick-name { font-size: 28rpx; color: var(--text-primary); }
  .sq-share-pick-count { font-size: 24rpx; color: var(--text-secondary); }
</style>