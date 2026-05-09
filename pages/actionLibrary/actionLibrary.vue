<template>
  <view class="container" :class="{ dark: daySettingsStore.isDarkMode, light: !daySettingsStore.isDarkMode }">
    <view class="search-bar">
      <view class="search-inner">
        <text class="search-icon">🔍</text>
        <input v-model="searchQuery" placeholder="搜索动作名称..." class="search-input" @input="onSearchInput" />
        <text v-if="searchQuery" class="search-clear" @click="clearSearch">×</text>
      </view>
    </view>

    <view class="category-tabs">
      <scroll-view class="category-scroll" scroll-x="true" show-scrollbar="false">
        <view v-for="cat in allCategories" :key="cat.id" class="category-tab"
          :class="{ active: activeCategory === cat.id }" @click="activeCategory = cat.id">
          <text class="category-name">{{ cat.name }}</text>
          <text class="category-count">{{ categoryCounts[cat.id] || 0 }}</text>
        </view>
      </scroll-view>
    </view>

    <scroll-view class="action-list" scroll-y="true" show-scrollbar="false">
      <view class="action-list-content">
        <view v-if="hasResults">
          <view v-for="group in groupedActions" :key="group.categoryId" class="category-section">
            <view v-if="activeCategory === 'all'" class="section-header" @click="toggleCollapse(group.categoryId)">
              <view class="section-header-left">
                <text class="collapse-arrow" :class="{ collapsed: isCollapsed(group.categoryId) }">▾</text>
                <text class="section-title">{{ group.categoryName }}</text>
                <text class="section-count">{{ group.totalCount }}个动作</text>
              </view>
              <view class="section-header-right" @click.stop="openAddPopupForCategory(group.categoryId)">
                <text class="add-inline-btn">+</text>
              </view>
            </view>
            <view class="action-grid-wrapper"
              :class="{ collapsed: activeCategory === 'all' && isCollapsed(group.categoryId) }"
              :style="activeCategory !== 'all' ? 'max-height: none; opacity: 1; overflow-y: auto;' : ''">
              <block v-for="sub in group.subGroups" :key="sub.subcategoryId">
                <view class="subcategory-header">
                  <text class="subcategory-indicator"></text>
                  <text class="subcategory-title">{{ sub.subcategoryName }}</text>
                  <text class="subcategory-count">{{ sub.actions.length }}个动作</text>
                </view>
                <view class="action-grid">
                  <view v-for="act in sub.actions" :key="act.id" class="slide-wrapper">
                    <view class="delete-btn-container">
                      <view class="delete-btn" @click.stop="handleDelete(act)">删除</view>
                    </view>
                    <view class="action-card"
                      :style="{ transform: 'translateX(' + ((slideOffset[act.id] !== undefined ? slideOffset[act.id] : 0)) + 'px)' }"
                      @touchstart="onTouchStart($event, act.id)" @touchmove="onTouchMove($event, act.id)"
                      @touchend="onTouchEnd($event, act.id)">
                      <view class="action-info" @click.stop="openEditPopup(act)">
                        <text class="action-name">{{ act.name }}</text>
                        <view class="action-category-tags">
                          <text v-for="catId in act.categories" :key="catId"
                            class="action-category-tag">{{ getCategoryNameById(catId) }}</text>
                        </view>
                      </view>
                      <view class="action-history-area" @click.stop="goToHistory(act)">
                        <text class="arrow-icon">›</text>
                      </view>
                    </view>
                  </view>
                </view>
              </block>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon">💪</view>
          <text class="empty-text" v-if="searchQuery">未找到包含"{{ searchQuery }}"的动作</text>
          <text class="empty-text" v-else>动作库暂无内容</text>
          <text class="empty-hint" v-if="searchQuery">是否添加该动作？</text>
          <text class="empty-hint" v-else>点击下方按钮添加第一个动作</text>
          <view class="btn-add-from-empty" @click="quickAddFromSearch" v-if="searchQuery">
            添加"{{ searchQuery }}"
          </view>
        </view>

        <view class="list-bottom-space"></view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <view class="btn-add-action" @click="openAddPopup">
        <text class="btn-add-icon">+</text>
        <text class="btn-add-label">新建动作</text>
      </view>
    </view>

    <view v-if="showAddPopup" class="popup-overlay" @click.self="closeAddPopup">
      <view class="overlay-bg" @click="closeAddPopup"></view>
      <view class="popup-panel slide-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">{{ isEditing ? '编辑动作' : '新建动作' }}</text>
          <text class="close-btn" @click="closeAddPopup">×</text>
        </view>
        <view class="panel-body">
          <view class="form-group">
            <text class="form-label">动作名称</text>
            <input v-model="formName" placeholder="输入动作名称" class="form-input" maxlength="20" />
          </view>
          <view class="form-group">
            <text class="form-label">身体部位（可多选）</text>
            <view class="category-selector">
              <view v-for="cat in categoryOptions" :key="cat.id" class="category-option"
                :class="{ selected: formCategories.includes(cat.id) }" @click="toggleFormCategory(cat.id)">
                <text class="category-option-check">{{ formCategories.includes(cat.id) ? '✓' : '' }}</text>
                <text>{{ cat.name }}</text>
              </view>
            </view>
          </view>
          <view class="form-group">
            <view class="checkbox-row" @click="formIsUnilateral = !formIsUnilateral">
              <view class="checkbox-box" :class="{ checked: formIsUnilateral }">
                <text class="checkbox-check" v-if="formIsUnilateral">✓</text>
              </view>
              <view class="checkbox-content">
                <text class="checkbox-label">单侧动作</text>
                <text class="checkbox-hint">（如哑铃单臂弯举，容量自动×2）</text>
              </view>
            </view>
          </view>
          <view class="form-group" v-for="cat in categoryOptions" :key="'sub_'+cat.id">
            <view v-if="formCategories.includes(cat.id) && getSubcategories(cat.id).length > 0"
              class="subcategory-section-form">
              <text class="form-label subcategory-form-label">{{ cat.name }} - 细分部位</text>
              <view class="subcategory-selector">
                <view v-for="sub in getSubcategories(cat.id)" :key="sub.id" class="subcategory-option"
                  :class="{ selected: isSubcategorySelected(cat.id, sub.id) }"
                  @click="toggleSubcategory(cat.id, sub.id)">
                  <text>{{ sub.name }}</text>
                </view>
              </view>
            </view>
          </view>
          <view class="auto-detect-hint" v-if="!isEditing && detectedCategory">
            自动检测：<text class="detected-cat-tag">{{ detectedCategoryName }}</text>
            <text class="use-detected-btn" @click="useDetectedCategory">使用</text>
          </view>
        </view>
        <view class="panel-footer btn-row">
          <text class="btn-return" @click="closeAddPopup">取消</text>
          <text class="btn-confirm" @click="confirmAction">{{ isEditing ? '保存' : '添加' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    useActionStore
  } from '@/stores/action.js'
  import {
    useDaySettingsStore
  } from '@/stores/daySettings.js'

  export default {
    data() {
      return {
        actStore: useActionStore(),
        daySettingsStore: useDaySettingsStore(),
        searchQuery: '',
        activeCategory: 'all',
        collapsedCategories: this.getSavedCollapsedState(),
        showAddPopup: false,
        isEditing: false,
        editingActionId: null,
        formName: '',
        formCategories: [],
        formSubcategories: {},
        slideOffset: {},
        startX: 0,
        startY: 0,
        startTime: 0,
        isClick: false,
        formIsUnilateral: false,
      }
    },

    computed: {
      allCategories() {
        return [{
            id: 'all',
            name: '全部'
          },
          ...this.actStore.categories,
        ]
      },
      categoryOptions() {
        return this.actStore.categories
      },
      detectedCategory() {
        if (this.isEditing || !this.formName.trim()) return null
        return this.actStore.detectCategoryByName(this.formName.trim())
      },
      detectedCategoryName() {
        if (!this.detectedCategory) return ''
        const cat = this.actStore.categories.find(c => c.id === this.detectedCategory)
        return cat ? cat.name : '腹部'
      },
      filteredActions() {
        let list = this.actStore.actions
        if (this.activeCategory !== 'all') {
          list = list.filter(a => a.categories.includes(this.activeCategory))
        }
        if (this.searchQuery && this.searchQuery.trim()) {
          const q = this.searchQuery.trim().toLowerCase()
          list = list.filter(a => a.name.toLowerCase().includes(q))
        }
        return list
      },
      groupedActions() {
        const groups = []
        const catMap = {}
        const allSubcategories = this.actStore.getAllSubcategories()

        this.actStore.categories.forEach(c => {
          catMap[c.id] = {
            categoryId: c.id,
            categoryName: c.name,
            totalCount: 0,
            subGroups: [],
          }
        })

        const uncategorizedSubId = '__uncategorized__'

        this.filteredActions.forEach(act => {
          act.categories.forEach(catId => {
            if (!catMap[catId]) return
            const group = catMap[catId]
            const assignedSubs = act.subcategories?.[catId] || []
            const subsList = allSubcategories[catId] || []

            if (assignedSubs.length > 0) {
              assignedSubs.forEach(subId => {
                const subDef = subsList.find(s => s.id === subId)
                const subName = subDef ? subDef.name : subId
                let subGroup = group.subGroups.find(sg => sg.subcategoryId === subId)
                if (!subGroup) {
                  subGroup = {
                    subcategoryId: subId,
                    subcategoryName: subName,
                    actions: [],
                  }
                  group.subGroups.push(subGroup)
                }
                if (!subGroup.actions.find(a => a.id === act.id)) {
                  subGroup.actions.push(act)
                  group.totalCount++
                }
              })
            } else {
              let subGroup = group.subGroups.find(sg => sg.subcategoryId === uncategorizedSubId)
              if (!subGroup) {
                subGroup = {
                  subcategoryId: uncategorizedSubId,
                  subcategoryName: '通用',
                  actions: [],
                }
                group.subGroups.push(subGroup)
              }
              subGroup.actions.push(act)
              group.totalCount++
            }
          })
        })

        this.actStore.categories.forEach(c => {
          if (catMap[c.id] && catMap[c.id].totalCount > 0) {
            const subs = allSubcategories[c.id] || []
            catMap[c.id].subGroups.sort((a, b) => {
              if (a.subcategoryId === uncategorizedSubId) return 1
              if (b.subcategoryId === uncategorizedSubId) return -1
              const idxA = subs.findIndex(s => s.id === a.subcategoryId)
              const idxB = subs.findIndex(s => s.id === b.subcategoryId)
              return idxA - idxB
            })
            groups.push(catMap[c.id])
          }
        })
        return groups
      },
      categoryCounts() {
        const counts = {
          all: 0
        }
        this.actStore.categories.forEach(c => {
          counts[c.id] = 0
        })
        this.actStore.actions.forEach(a => {
          counts.all++
          a.categories.forEach(catId => {
            if (counts[catId] !== undefined) counts[catId]++
          })
        })
        return counts
      },
      hasResults() {
        return this.filteredActions.length > 0
      },
    },

    created() {
      this.actStore = useActionStore()
      this.actStore.load()
      this.daySettingsStore.load()
    },

    onShow() {
      this.actStore.load();
      this.collapsedCategories = this.getSavedCollapsedState();
    },

    methods: {
      getCategoryNameById(catId) {
        const cat = this.actStore.categories.find(c => c.id === catId)
        return cat ? cat.name : catId
      },
      getSubcategories(categoryId) {
        return this.actStore.getSubcategories(categoryId)
      },
      isCollapsed(categoryId) {
        return this.collapsedCategories.includes(categoryId)
      },
      getSavedCollapsedState() {
        try {
          const saved = uni.getStorageSync('actionCategoryCollapsed');
          return saved ? JSON.parse(saved) : [];
        } catch (e) {
          console.error('读取折叠状态失败:', e);
          return [];
        }
      },
      saveCollapsedState() {
        try {
          uni.setStorageSync('actionCategoryCollapsed', JSON.stringify(this.collapsedCategories));
        } catch (e) {
          console.error('保存折叠状态失败:', e);
        }
      },
      toggleCollapse(categoryId) {
        const idx = this.collapsedCategories.indexOf(categoryId);
        if (idx === -1) {
          this.collapsedCategories.push(categoryId);
        } else {
          this.collapsedCategories.splice(idx, 1);
        }
        this.saveCollapsedState();
      },

      onSearchInput() {
        this.activeCategory = 'all'
      },

      clearSearch() {
        this.searchQuery = ''
      },

      toggleFormCategory(catId) {
        const idx = this.formCategories.indexOf(catId)
        if (idx === -1) {
          this.formCategories.push(catId)
        } else {
          this.formCategories.splice(idx, 1)
          this.$delete(this.formSubcategories, catId)
        }
      },

      isSubcategorySelected(catId, subId) {
        return this.formSubcategories[catId] && this.formSubcategories[catId].includes(subId)
      },

      toggleSubcategory(catId, subId) {
        if (!this.formSubcategories[catId]) {
          this.$set(this.formSubcategories, catId, [])
        }
        const subs = this.formSubcategories[catId]
        const idx = subs.indexOf(subId)
        if (idx === -1) {
          subs.push(subId)
        } else {
          subs.splice(idx, 1)
        }
      },

      useDetectedCategory() {
        if (this.detectedCategory && !this.formCategories.includes(this.detectedCategory)) {
          this.formCategories.push(this.detectedCategory)
        }
      },

      openAddPopup() {
        this.isEditing = false
        this.editingActionId = null
        this.formName = this.searchQuery || ''
        const detected = this.detectedCategory
        this.formCategories = detected ? [detected] : []
        this.formSubcategories = {}
        this.formIsUnilateral = false
        this.showAddPopup = true
      },

      openAddPopupForCategory(categoryId) {
        this.isEditing = false
        this.editingActionId = null
        this.formName = ''
        this.formCategories = [categoryId]
        this.formSubcategories = {}
        this.formIsUnilateral = false
        this.showAddPopup = true
      },

      openEditPopup(act) {
        this.isEditing = true
        this.editingActionId = act.id
        this.formName = act.name
        this.formCategories = [...act.categories]
        this.formSubcategories = JSON.parse(JSON.stringify(act.subcategories || {}))
        this.formIsUnilateral = act.isUnilateral || false
        this.showAddPopup = true
      },

      closeAddPopup() {
        this.showAddPopup = false
        this.editingActionId = null
        this.formName = ''
        this.formCategories = []
        this.formSubcategories = {}
        this.formIsUnilateral = false
      },

      confirmAction() {
        const name = this.formName.trim()
        if (!name) {
          uni.showToast({
            title: '请输入动作名称',
            icon: 'none'
          })
          return
        }

        if (this.formCategories.length === 0) {
          uni.showToast({
            title: '请至少选择一个身体部位',
            icon: 'none'
          })
          return
        }

        if (this.isEditing) {
          this.actStore.updateAction(this.editingActionId, {
            name: name,
            categories: this.formCategories,
            subcategories: {
              ...this.formSubcategories
            },
            isUnilateral: this.formIsUnilateral,
          })
          uni.showToast({
            title: '已更新',
            icon: 'success'
          })
        } else {
          const exists = this.actStore.actions.some(a => a.name === name)
          if (exists) {
            uni.showToast({
              title: '动作已存在',
              icon: 'none'
            })
            return
          }
          this.actStore.addAction(name, this.formCategories)
          const newAction = this.actStore.getActionByName(name)
          if (newAction && Object.keys(this.formSubcategories).length > 0) {
            this.actStore.updateAction(newAction.id, {
              subcategories: {
                ...this.formSubcategories
              },
            })
          }
          uni.showToast({
            title: '已添加',
            icon: 'success'
          })
        }
        this.closeAddPopup()
      },

      quickAddFromSearch() {
        const name = this.searchQuery.trim()
        if (!name) return
        const exists = this.actStore.actions.some(a => a.name === name)
        if (exists) {
          uni.showToast({
            title: '动作已存在',
            icon: 'none'
          })
          return
        }
        const detectedCategory = this.actStore.detectCategoryByName(name)
        this.actStore.addAction(name, [detectedCategory])
        uni.showToast({
          title: '已添加',
          icon: 'success'
        })
        this.searchQuery = ''
      },

      onTouchStart(e, actId) {
        this.startX = e.touches[0].pageX
        this.startY = e.touches[0].pageY
        this.startTime = Date.now()
        this.isClick = true
        this.$set(this.slideOffset, actId, this.slideOffset[actId] || 0)
      },

      onTouchMove(e, actId) {
        const currentX = e.touches[0].pageX
        const currentY = e.touches[0].pageY
        const deltaX = currentX - this.startX
        const deltaY = currentY - this.startY

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.isClick = false
        }

        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            this.$set(this.slideOffset, actId, Math.max(deltaX, -100))
          } else if (deltaX > 0 && (this.slideOffset[actId] || 0) < 0) {
            this.$set(this.slideOffset, actId, Math.min(0, (this.slideOffset[actId] || 0) + deltaX))
          }

          if (e.cancelable) {
            e.preventDefault()
            e.stopPropagation()
          }
        } else {
          this.$set(this.slideOffset, actId, 0)
        }
      },

      onTouchEnd(e, actId) {
        const touchDuration = Date.now() - this.startTime

        if ((this.slideOffset[actId] || 0) < -50) {
          this.$set(this.slideOffset, actId, -80)
        } else {
          this.$set(this.slideOffset, actId, 0)
        }

        this.isClick = false
        this.startX = 0
        this.startTime = 0
      },

      goToHistory(act) {
        uni.navigateTo({
          url: `/pages/actionHistory/actionHistory?action=${encodeURIComponent(act.name)}`
        })
      },

      handleDelete(act) {
        uni.vibrateShort({
          type: 'light'
        })
        uni.showModal({
          title: '删除动作',
          content: `确定要删除「${act.name}」吗？`,
          confirmColor: '#ff5a5d',
          success: res => {
            if (res.confirm) {
              this.actStore.removeActionById(act.id)
              this.$set(this.slideOffset, act.id, 0)
            } else {
              this.$set(this.slideOffset, act.id, 0)
            }
          },
        })
      },
    },
  }
</script>

<style scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background-color: #121212;
    color: #f7f7f7;
  }

  .container.light {
    background-color: #f5f5f5;
    color: #333333;
  }

  .search-bar {
    padding: 10px 16px;
    flex-shrink: 0;
  }

  .search-inner {
    display: flex;
    align-items: center;
    background-color: #2a2a2a;
    border-radius: 10px;
    padding: 0 12px;
    height: 40px;
  }

  .container.light .search-inner {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
  }

  .search-icon {
    font-size: 16px;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    height: 100%;
    font-size: 15px;
    color: inherit;
    background: transparent;
    border: none;
    outline: none;
  }

  .search-input::placeholder {
    color: #888;
  }

  .container.light .search-input::placeholder {
    color: #999;
  }

  .search-clear {
    font-size: 18px;
    color: #888;
    padding: 4px 4px 4px 8px;
    flex-shrink: 0;
  }

  .category-tabs {
    flex-shrink: 0;
    padding: 0 16px 8px 16px;
  }

  .category-scroll {
    display: flex;
    flex-direction: row;
    white-space: nowrap;
    overflow: hidden;
  }

  .category-tab {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    margin-right: 8px;
    border-radius: 20px;
    background-color: #2a2a2a;
    font-size: 13px;
    color: #aaa;
    flex-shrink: 0;
  }

  .container.light .category-tab {
    background-color: #e8e8e8;
    color: #666;
  }

  .container.light .category-tab.active {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
  }

  .category-tab.active {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
  }

  .category-name {
    margin-right: 6px;
  }

  .category-count {
    font-size: 11px;
    opacity: 0.8;
  }

  .action-list-content {
    padding: 0 16px;
  }

  .action-list {
    flex: 1;
    overflow-y: auto;
  }

  .list-bottom-space {
    height: 80px;
  }

  .category-section {
    margin-bottom: 8px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 4px;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.15s;
  }

  .section-header:active {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .container.light .section-header:active {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .section-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .section-header-right {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #2a2a2a;
    flex-shrink: 0;
  }

  .container.light .section-header-right {
    background-color: #e8e8e8;
  }

  .section-header-right:active {
    opacity: 0.6;
  }

  .add-inline-btn {
    font-size: 18px;
    font-weight: bold;
    color: #379bff;
    line-height: 1;
  }

  .collapse-arrow {
    font-size: 30px;
    color: #888;
    transition: transform 0.2s ease;
    flex-shrink: 0;
    width: 16px;
    text-align: center;
  }

  .container.light .collapse-arrow {
    color: #999;
  }

  .collapse-arrow.collapsed {
    transform: rotate(-90deg);
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: inherit;
  }

  .section-count {
    font-size: 12px;
    color: #888;
  }

  .container.light .section-count {
    color: #999;
  }

  .action-grid-wrapper {
    overflow-y: auto;
    max-height: 600px;
    transition: max-height 0.25s ease, opacity 0.2s ease;
    opacity: 1;
  }

  .action-grid-wrapper.collapsed {
    max-height: 0;
    opacity: 0;
  }

  /* 子分类 section-header 样式 */
  .subcategory-header {
    display: flex;
    align-items: center;
    padding: 6px 4px 6px 24px;
    gap: 8px;
  }

  .subcategory-indicator {
    width: 3px;
    height: 16px;
    border-radius: 2px;
    background: linear-gradient(180deg, #379bff, #0048ff);
    flex-shrink: 0;
  }

  .subcategory-title {
    font-size: 14px;
    font-weight: 500;
    color: #ccc;
  }

  .container.light .subcategory-title {
    color: #555;
  }

  .subcategory-count {
    font-size: 11px;
    color: #666;
  }

  .container.light .subcategory-count {
    color: #999;
  }

  .action-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 4px 4px 4px;
  }

  .slide-wrapper {
    position: relative;
    width: 100%;
    overflow: visible;
    background-color: transparent;
  }

  .delete-btn-container {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    z-index: 1;
  }

  .delete-btn {
    width: 70px;
    height: 62px;
    background-color: #ff5a5d;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    margin-right: 2px;
  }

  .delete-btn:active {
    opacity: 0.8;
  }

  .action-card {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #1e1e1e;
    border-radius: 12px;
    padding: 2px 16px;
    transition: transform 0.2s ease;
  }

  .container.light .action-card {
    background-color: #ffffff;
  }

  .action-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .action-name {
    font-size: 15px;
    color: inherit;
    font-weight: 500;
    flex-shrink: 0;
  }

  .action-category-tags {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .action-category-tag {
    font-size: 10px;
    color: #aaa;
    background-color: #2a2a2a;
    padding: 1px 6px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .container.light .action-category-tag {
    background-color: #e8e8e8;
  }

  .action-history-area {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 8px;
    padding: 8px 4px 8px 12px;
    border-radius: 8px;
    min-height: 44px;
    min-width: 44px;
  }

  .action-history-area:active {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .container.light .action-history-area:active {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .arrow-icon {
    font-size: 20px;
    color: #555;
  }

  .container.light .arrow-icon {
    color: #ccc;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 15px;
    color: #888;
    text-align: center;
    margin-bottom: 6px;
  }

  .empty-hint {
    font-size: 13px;
    color: #666;
    text-align: center;
    margin-bottom: 16px;
  }

  .btn-add-from-empty {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
    padding: 10px 24px;
    border-radius: 10px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-add-from-empty:active {
    opacity: 0.8;
  }

  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px 16px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    background: rgba(20, 20, 20, 0.9);
    backdrop-filter: blur(25px);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    z-index: 100;
  }

  .container.light .bottom-bar {
    background: rgba(255, 255, 255, 0.9);
    border-top-color: rgba(0, 0, 0, 0.05);
  }

  .btn-add-action {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #379bff, #0048ff);
    border-radius: 12px;
    padding: 14px 0;
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-add-action:active {
    opacity: 0.8;
  }

  .btn-add-icon {
    font-size: 20px;
    color: #fff;
    margin-right: 6px;
    font-weight: bold;
  }

  .btn-add-label {
    font-size: 16px;
    color: #fff;
    font-weight: 500;
  }

  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }

  .overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
  }

  .popup-panel {
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    background-color: #1e1e1e;
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 1;
    animation: slideUp 0.25s ease-out;
  }

  .container.light .popup-panel {
    background-color: #ffffff;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .container.light .panel-header {
    border-bottom-color: rgba(0, 0, 0, 0.08);
  }

  .panel-title {
    font-size: 17px;
    font-weight: 600;
    color: inherit;
  }

  .close-btn {
    font-size: 22px;
    color: #888;
    padding: 4px 8px;
  }

  .container.light .close-btn {
    color: #666;
  }

  .close-btn:active {
    opacity: 0.6;
  }

  .panel-body {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    color: #aaa;
    margin-bottom: 8px;
  }

  .form-input {
    width: 100%;
    height: 44px;
    background-color: #2a2a2a;
    border: none;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 16px;
    color: inherit;
    box-sizing: border-box;
  }

  .container.light .form-input {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
  }

  .form-input::placeholder {
    color: #666;
  }

  .container.light .form-input::placeholder {
    color: #999;
  }

  .auto-detect-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background-color: #2a2a2a;
    border-radius: 10px;
    font-size: 13px;
    color: #aaa;
  }

  .container.light .auto-detect-hint {
    background-color: #f0f0f0;
  }

  .detected-cat-tag {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 12px;
  }

  .use-detected-btn {
    color: #379bff;
    font-size: 12px;
    text-decoration: underline;
    margin-left: auto;
  }

  .container.light .use-detected-btn {
    color: #379bff;
  }

  .use-detected-btn:active {
    opacity: 0.6;
  }

  .category-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .category-option {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    border-radius: 20px;
    background-color: #2a2a2a;
    font-size: 13px;
    color: #aaa;
  }

  .container.light .category-option {
    background-color: #e8e8e8;
    color: #666;
  }

  .category-option.selected {
    background: linear-gradient(135deg, #379bff, #0048ff);
    color: #fff;
  }

  .category-option:active {
    opacity: 0.7;
  }

  .category-option-check {
    font-size: 12px;
    font-weight: bold;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background-color: #2a2a2a;
    border-radius: 10px;
    transition: background-color 0.2s ease;
  }

  .container.light .checkbox-row {
    background-color: #e8e8e8;
  }

  .checkbox-box {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid #555;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .container.light .checkbox-box {
    border-color: #999;
  }

  .checkbox-box.checked {
    background: linear-gradient(135deg, #379bff, #0048ff);
    border-color: #379bff;
  }

  .checkbox-check {
    color: #fff;
    font-size: 14px;
    font-weight: bold;
  }

  .checkbox-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .checkbox-label {
    font-size: 15px;
    color: inherit;
    font-weight: 500;
  }

  .checkbox-hint {
    font-size: 12px;
    color: #888;
  }

  .container.light .checkbox-hint {
    color: #999;
  }

  .subcategory-section-form {
    margin-top: -8px;
  }

  .subcategory-form-label {
    font-size: 12px;
    color: #888;
    padding-left: 12px;
    margin-bottom: 6px;
  }

  .container.light .subcategory-form-label {
    color: #999;
  }

  .subcategory-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-left: 12px;
  }

  .subcategory-option {
    padding: 5px 12px;
    border-radius: 14px;
    background-color: #2a2a2a;
    font-size: 12px;
    color: #999;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .container.light .subcategory-option {
    background-color: #e8e8e8;
    color: #777;
  }

  .subcategory-option.selected {
    background-color: rgba(55, 155, 255, 0.2);
    border-color: #379bff;
    color: #379bff;
  }

  .subcategory-option:active {
    opacity: 0.7;
  }

  .panel-footer {
    padding: 16px 20px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }

  .btn-row {
    display: flex;
    gap: 12px;
  }

  .btn-return {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    border-radius: 10px;
    font-size: 15px;
    color: #aaa;
    background-color: #2a2a2a;
  }

  .container.light .btn-return {
    background-color: #e8e8e8;
    color: #666;
  }

  .btn-return:active {
    opacity: 0.7;
  }

  .btn-confirm {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    border-radius: 10px;
    font-size: 15px;
    color: #fff;
    background: linear-gradient(135deg, #379bff, #0048ff);
    box-shadow: 0 4px 12px rgba(55, 155, 255, 0.3);
  }

  .btn-confirm:active {
    opacity: 0.8;
  }
</style>