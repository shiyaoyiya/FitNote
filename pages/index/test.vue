<template>
  <view class="container" :class="darkModeClass">
    <view class="emoji-switch" @tap="onEmojiTap">
      <!-- 把监听放在 <view>，兼容性更好 -->
      <view class="emoji-icon" :class="{ 'animate-emoji': animateJump }" @animationend="onAnimationEnd">
        {{ darkMode ? '🌙' : '☀️' }}
      </view>
    </view>

    <view class="message">当前模式：<text>{{ darkMode ? '暗黑' : '明亮' }}</text></view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        animateJump: false,
        darkMode: false,
        darkModeClass: 'light'
      };
    },
    methods: {
      onEmojiTap() {
        if (this.animateJump) return;
        console.log('点击了');
        this.darkMode = !this.darkMode;
        uni.setStorageSync('darkMode', this.darkMode);
        this.darkModeClass = this.darkMode ? 'dark' : 'light';
        // 再触发动画
        this.animateJump = true;
        console.log('此时 animateJump =', this.animateJump);
      },
      onAnimationEnd(evt) {
        console.log('收到了 animationend，animationName =', evt.animationName);
        // if (evt.animationName !== 'jumpRotate') return;
        // console.log('真正跑完 jumpRotate，切回 animateJump = false');
        this.animateJump = false;
      }
    }
  };
</script>

<style scoped>
  .container {
    padding: 20px;
  }

  .emoji-switch {
    margin-top: 20px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eee;
    border-radius: 6px;
  }

  .emoji-icon {
    display: inline-block;
    font-size: 24px;
  }

  /* 只要给元素加上 .animate-emoji 才会跑下面关键帧 */
  .animate-emoji {
    animation: jumpRotate 0.5s ease-out forwards;
  }

  @keyframes jumpRotate {
    0% {
      transform: translateY(0) rotate(0deg);
    }

    40% {
      transform: translateY(-12px) rotate(90deg);
    }

    80% {
      transform: translateY(-8px) rotate(135deg);
    }

    100% {
      transform: translateY(0) rotate(180deg);
    }
  }

  .message {
    margin-top: 20px;
    font-size: 16px;
  }

  /* 暗黑模式示范（可选） */
  .light {
    background: #fafafa;
    color: #333;
  }

  .dark {
    background: #333;
    color: #fafafa;
  }
</style>