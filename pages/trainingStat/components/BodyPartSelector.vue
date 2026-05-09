<template>
  <view class="selector-overlay" @touchmove.prevent>
    <view class="overlay-bg" @click="$emit('close')"></view>
    <view class="selector-panel slide-up">
      <view class="selector-header">
        <text class="back-btn" @click="$emit('close')">‹ 返回</text>
        <text class="selector-title">选择部位</text>
        <view class="header-spacer"></view>
      </view>
      <view class="selector-body">
        <scroll-view class="category-col" scroll-y>
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            :class="{ active: activeCategory === cat.id }"
            @click="onCategoryClick(cat)"
          >
            {{ cat.name }}
          </view>
        </scroll-view>
        <scroll-view class="subcategory-col" scroll-y>
          <view
            class="subcategory-item category-all"
            :class="{ selected: selectedBodyPart === activeCategory }"
            @click="selectCategoryAll"
          >
            <text class="sub-name">{{ activeCategoryName }}（全部）</text>
            <text v-if="selectedBodyPart === activeCategory" class="check-mark">✓</text>
          </view>
          <view
            v-for="sub in currentSubcategories"
            :key="sub.id"
            class="subcategory-item"
            :class="{ selected: sub.id === selectedBodyPart }"
            @click="selectSub(sub)"
          >
            <text class="sub-name">{{ sub.name }}</text>
            <text v-if="sub.id === selectedBodyPart" class="check-mark">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => [
      { id: 'chest', name: '胸部' },
      { id: 'back', name: '背部' },
      { id: 'shoulders', name: '肩部' },
      { id: 'arms', name: '手臂' },
      { id: 'legs', name: '腿部' },
      { id: 'abs', name: '腹部' },
    ],
  },
  subcategories: {
    type: Object,
    default: () => ({
      chest: [{ id: 'upper_chest', name: '上胸' }, { id: 'mid_lower_chest', name: '中下胸' }],
      back: [{ id: 'teres_major', name: '大圆' }, { id: 'upper_traps', name: '上斜方' }, { id: 'mid_lower_traps', name: '中下斜方' }, { id: 'lats', name: '背阔' }, { id: 'erector_spinae', name: '竖脊肌' }],
      shoulders: [{ id: 'front_delt', name: '前束' }, { id: 'side_delt', name: '中束' }, { id: 'rear_delt', name: '后束' }],
      arms: [{ id: 'biceps', name: '二头' }, { id: 'triceps', name: '三头' }],
      legs: [{ id: 'quads', name: '股四头' }, { id: 'hamstrings', name: '腘绳' }, { id: 'calves', name: '小腿' }, { id: 'glutes', name: '臀部' }],
      abs: [{ id: 'abs', name: '腹部' }],
    }),
  },
  selectedBodyPart: {
    type: String,
    default: 'upper_chest',
  },
})

const emit = defineEmits(['close', 'select'])

const activeCategory = ref(getDefaultCategory())

function getDefaultCategory() {
  const catMap = { chest: true, back: true, shoulders: true, arms: true, legs: true, abs: true }
  if (catMap[props.selectedBodyPart]) {
    return props.selectedBodyPart
  }
  for (const [catId, subs] of Object.entries(props.subcategories)) {
    if (subs.some(s => s.id === props.selectedBodyPart)) {
      return catId
    }
  }
  return 'chest'
}

const activeCategoryName = computed(() => {
  const cat = props.categories.find(c => c.id === activeCategory.value)
  return cat ? cat.name : ''
})

const currentSubcategories = computed(() => {
  return props.subcategories[activeCategory.value] || []
})

function onCategoryClick(cat) {
  if (activeCategory.value === cat.id) {
    emit('select', cat.id)
  } else {
    activeCategory.value = cat.id
  }
}

function selectCategoryAll() {
  emit('select', activeCategory.value)
}

function selectSub(sub) {
  emit('select', sub.id)
}
</script>

<style scoped>
.selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: auto;
}

.overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.container.light .overlay-bg {
  background-color: rgba(0, 0, 0, 0.5);
}

.container.dark .overlay-bg {
  background-color: rgba(0, 0, 0, 0.6);
}

.selector-panel {
  position: relative;
  width: 100%;
  height: 70vh;
  background-color: #ffffff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  z-index: 1001;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}

.slide-up {
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.container.light .selector-panel {
  background-color: #ffffff;
}

.container.dark .selector-panel {
  background-color: #1e1e1e;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.container.light .selector-header {
  border-bottom: 1px solid #e0e0e0;
}

.container.dark .selector-header {
  border-bottom: 1px solid #333;
}

.back-btn {
  font-size: 16px;
  color: #379bff;
  padding: 4px 0;
}

.selector-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary, #333333);
}

.header-spacer {
  width: 50px;
}

.selector-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.category-col {
  width: 110px;
  flex-shrink: 0;
  background-color: #f8f8f8;
  padding: 8px 0;
}

.container.light .category-col {
  background-color: #f8f8f8;
}

.container.dark .category-col {
  background-color: #2a2a2a;
}

.category-item {
  padding: 14px 16px;
  font-size: 15px;
  color: var(--text-primary, #333333);
}

.category-item.active {
  color: #379bff;
  font-weight: bold;
  background-color: #ffffff;
}

.container.light .category-item.active {
  background-color: #ffffff;
}

.container.dark .category-item.active {
  background-color: #1e1e1e;
}

.subcategory-col {
  flex: 1;
  padding: 8px 0;
}

.subcategory-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 15px;
  color: var(--text-primary, #333333);
}

.subcategory-item.selected {
  color: #379bff;
  font-weight: bold;
}

.subcategory-item:active {
  background-color: rgba(55, 155, 255, 0.08);
}

.category-all {
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 4px;
}

.container.light .category-all {
  border-bottom: 1px solid #e0e0e0;
}

.container.dark .category-all {
  border-bottom: 1px solid #333;
}

.check-mark {
  color: #379bff;
  font-weight: bold;
  font-size: 16px;
}
</style>
