// utils/floatTimer.js
// 计时结束本地通知
export function notifyTimerEnd() {
  // #ifdef APP-PLUS
  try {
    if (plus.push && typeof plus.push.createPush === 'function') {
      plus.push.createPush('组间休息结束，继续训练！', { title: 'FitNote 计时结束' })
    } else {
      // 降级：Toast + 长振动
      uni.showToast({ title: '计时结束，继续训练！', icon: 'none', duration: 3000 })
      uni.vibrateLong()
    }
  } catch (e) {
    console.log('[floatTimer] notifyTimerEnd failed, 使用降级方式')
    uni.showToast({ title: '计时结束', icon: 'none', duration: 3000 })
    uni.vibrateLong()
  }
  // #endif
}
