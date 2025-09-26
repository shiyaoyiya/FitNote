<template>
  <view :class="['container', darkModeClass]">
    <!-- 备忘录标题和添加按钮 -->
    <view class="header">
      <!-- <text class="title">📝 训练备忘录</text> -->
      <button class="add-btn" @click="startAdd">+</button>
    </view>
    <!-- 添加/修改笔记弹窗 -->
    <modal v-if="showInput" @close="cancelInput">
      <view class="input-container">
        <textarea v-model="newContent" placeholder="在这里输入你的训练计划..." auto-height maxlength="-1"
          @blur="saveNote"></textarea>
        <button @click="saveNote" :disabled="!newContent.trim()">{{ isEditing ? '修改' : '保存' }}</button>
      </view>
    </modal>
    <!-- 笔记列表 -->
    <scroll-view class="memo-list" scroll-y>
      <view v-for="(note, idx) in notes" :key="idx" class="memo-item" @click="startEdit(idx)"
        @touchstart="handleEntryTouchStart(idx, $event)" @touchmove="handleEntryTouchMove"
        @touchend="handleEntryTouchEnd"
        :style="{ display: (showInput && isEditing && editingIdx === idx) ? 'none' : 'flex' }">
        <text class="note-date">{{ formatDate(note.date) }}</text>
        <text class="note-content">{{ note.content }}</text>
      </view>
      <view v-if="notes.length === 0" class="empty">
        <text>暂时没有记录，点击 + 添加你的训练计划</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        darkMode: false,
        darkModeClass: 'light',
        notes: [],
        newContent: '',
        showInput: false,
        isEditing: false,
        editingIdx: null,
        pressedEntry: {
          actionIdx: -1,
          entryIdx: -1
        },
        longPressTimer: null,
        longPressThreshold: 600
      };
    },
    onLoad() {
      // 深色模式初始化
      const persist = uni.getStorageSync('darkMode');
      if (persist === 'auto') {
        const sysTheme = uni.getSystemInfoSync().theme || 'light';
        this.darkMode = sysTheme === 'dark';
      } else {
        this.darkMode = persist === true;
      }
      this.darkModeClass = this.darkMode ? 'dark' : 'light';
      this.updateNavigationBarStyle(this.darkMode);

      // 获取本地存储的笔记
      const stored = uni.getStorageSync('trainingNotes');
      if (stored) this.notes = JSON.parse(stored);
    },
    methods: {
      updateNavigationBarStyle(isDark) {
        uni.setNavigationBarColor({
          frontColor: isDark ? '#f7f7f7' : '#333333',
          backgroundColor: isDark ? '#121212' : '#f5f5f5',
          animation: {
            duration: 200,
            timingFunc: 'easeIn'
          }
        });
      },
      formatDate(ts) {
        const d = new Date(ts);
        return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      },
      startAdd() {
        this.isEditing = false;
        this.newContent = '';
        this.showInput = true;
      },
      startEdit(idx) {
        this.isEditing = true;
        this.editingIdx = idx;
        this.newContent = this.notes[idx].content;
        this.showInput = true;
      },
      saveNote() {
        if (this.isEditing) {
          this.$set(this.notes, this.editingIdx, {
            date: this.notes[this.editingIdx].date,
            content: this.newContent.trim()
          });
        } else {
          this.notes.unshift({
            date: Date.now(),
            content: this.newContent.trim()
          });
        }
        uni.setStorageSync('trainingNotes', JSON.stringify(this.notes));
        this.cancelInput();
      },
      cancelInput() {
        this.showInput = false;
        this.newContent = '';
        this.editingIdx = null;
      },
      removeEntry(aIdx, eIdx) {
        this.notes.splice(eIdx, 1);
        uni.setStorageSync('trainingNotes', JSON.stringify(this.notes));
      },
      handleEntryTouchStart(eIdx, e) {
        this.pressedEntry = {
          entryIdx: eIdx
        };
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (this.pressedEntry.entryIdx === eIdx) {
            this.handleEntryLongPress(eIdx);
          }
        }, this.longPressThreshold);
      },
      handleEntryTouchMove() {
        clearTimeout(this.longPressTimer);
      },
      handleEntryTouchEnd() {
        clearTimeout(this.longPressTimer);
        this.pressedEntry = {
          actionIdx: -1,
          entryIdx: -1
        };
      },
      handleEntryLongPress(eIdx) {
        uni.vibrateShort({
          type: 'light'
        });
        uni.showModal({
          title: '删除记录',
          content: `确定删除 第${eIdx + 1}条 记录？`,
          success: (res) => {
            if (res.confirm) {
              this.removeEntry(null, eIdx);
            }
          }
        });
        this.pressedEntry = {
          entryIdx: -1
        };
      }
    }
  };
</script>

<style scoped>
  .container {
    flex: 1;
    padding: 10px;
    background-color: #f5f5f5;
    min-height: 100vh;
  }

  .container.dark {
    background-color: #121212;
  }

  .header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .title {
    font-size: 20px;
    font-weight: bold;
  }

  .add-btn {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    font-size: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .memo-list {
    flex: 1;
  }

  .memo-item {
    background-color: #fff;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .note-date {
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
  }

  .note-content {
    font-size: 16px;
  }

  .empty {
    margin-top: 50px;
    text-align: center;
    color: #aaa;
  }

  .input-container {
    margin: 10px 0;
  }

  .dark .memo-item,
  .add-btn {
    background-color: #2e2e2e;
  }

  .dark .note-date,
  .dark .empty {
    color: #bbb;
  }

  .dark .container {
    background-color: #121212;
  }

  .container.dark .memo-item,
  .add-btn,
  .title,
  .input-container {
    color: #f5f5f5;
  }

  .container.dark .input-container>button {
    background-color: #2e2e2e;
    color: #f5f5f5;
  }
</style>