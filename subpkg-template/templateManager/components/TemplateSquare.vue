<template>
  <view class="square-wrap">
    <!-- 搜索 + 排序 -->
    <view class="square-toolbar">
      <view class="square-search">
        <text class="sq-search-icon">🔍</text>
        <input v-model="search" class="sq-search-input" placeholder="搜索模板名 / 动作 / 标签" />
        <text v-if="search" class="sq-clear" @click="search=''">×</text>
      </view>
      <view class="square-sort">
        <view
          v-for="s in sorts" :key="s.key"
          class="sq-sort-item"
          :class="{ active: sort === s.key }"
          @click="sort = s.key"
        >{{ s.label }}</view>
      </view>
    </view>
    <!-- 标签 chips -->
    <scroll-view class="square-tags" scroll-x="true" show-scrollbar="false">
      <view
        v-for="tag in tagOptions" :key="tag.key"
        class="sq-tag-chip"
        :class="{ active: tagFilter === tag.key }"
        @click="tagFilter = tag.key"
      >{{ tag.label }}</view>
    </scroll-view>
    <!-- 网格卡片 -->
    <view class="square-grid">
      <view
        v-for="(tpl, i) in filteredTemplates" :key="i"
        class="sq-card"
        @click="handleSelect(tpl)"
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
    <view v-if="filteredTemplates.length === 0" class="empty-state-inside">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">没有找到匹配的模板</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TemplateSquare',
  props: {
    templates: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      search: '',
      sort: 'hot',
      tagFilter: 'all',
      sorts: [
        { key: 'hot', label: '🔥 热度' },
        { key: 'newest', label: '🆕 最新' },
        { key: 'downloads', label: '⬇ 下载' }
      ],
      tagOptions: [
        { key: 'all', label: '全部' },
        { key: '胸', label: '胸部' },
        { key: '背', label: '背部' },
        { key: '腿', label: '腿部' },
        { key: '肩', label: '肩部' },
        { key: '手臂', label: '手臂' },
        { key: '核心', label: '核心' },
        { key: '有氧', label: '有氧' },
        { key: '全身', label: '全身' }
      ]
    }
  },
  computed: {
    filteredTemplates() {
      const q = this.search.trim().toLowerCase()
      let list = this.templates || []
      if (this.tagFilter !== 'all') {
        list = list.filter(t => (t.tags || []).includes(this.tagFilter))
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
      if (this.sort === 'newest') sorted.reverse()
      if (this.sort === 'downloads') sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
      if (this.sort === 'hot') sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
      return sorted
    }
  },
  methods: {
    handleSelect(tpl) {
      this.$emit('select', tpl)
    }
  }
}
</script>

<style scoped>
.square-wrap {
  padding: 20rpx 24rpx 120rpx;
}

.square-toolbar {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.square-search {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.sq-search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  opacity: 0.6;
}

.sq-search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-primary);
  height: 72rpx;
}

.sq-clear {
  font-size: 32rpx;
  color: var(--text-muted);
  padding: 0 8rpx;
}

.square-sort {
  display: flex;
  gap: 12rpx;
}

.sq-sort-item {
  padding: 8rpx 20rpx;
  border-radius: 32rpx;
  background: var(--bg-tertiary);
  font-size: 24rpx;
  color: var(--text-secondary);
}

.sq-sort-item.active {
  background: var(--primary);
  color: #fff;
}

.square-tags {
  white-space: nowrap;
  margin-bottom: 20rpx;
}

.sq-tag-chip {
  display: inline-block;
  padding: 8rpx 22rpx;
  margin-right: 12rpx;
  border-radius: 32rpx;
  background: var(--bg-tertiary);
  font-size: 24rpx;
  color: var(--text-secondary);
}

.sq-tag-chip.active {
  background: var(--primary);
  color: #fff;
}

.square-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.sq-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx var(--shadow-color);
  transition: transform 0.2s ease;
}

.sq-card:active {
  transform: scale(0.97);
}

.sq-card-top {
  padding: 22rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sq-card-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

.sq-card-author {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.sq-card-body {
  padding: 16rpx 20rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.sq-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.sq-card-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.sq-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
}

.sq-meta {
  font-size: 22rpx;
  color: var(--text-muted);
}

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
</style>
