// utils/notification.js
// 消息推送封装：训练日提醒 + 组间休息到点

import { useDaySettingsStore } from '@/stores/daySettings.js'

const REMINDER_TEMPLATE_ID = 'REPLACE_WITH_YOUR_TEMPLATE_ID' // 训练日提醒订阅模板
const REST_TEMPLATE_ID = 'REPLACE_WITH_YOUR_TEMPLATE_ID'      // 休息到点订阅模板

// 平台判断
const isMpWeixin = (() => {
  // #ifdef MP-WEIXIN
  return true
  // #endif
  return false
})()
const isApp = (() => {
  // #ifdef APP-PLUS
  return true
  // #endif
  return false
})()

// 申请订阅消息授权（小程序）
function requestSubscribe(templateId) {
  return new Promise((resolve) => {
    if (!isMpWeixin) { resolve(false); return }
    uni.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (r) => resolve(r[templateId] === 'accept'),
      fail: () => resolve(false),
    })
  })
}

// 训练日提醒：检查今日是否训练日，是则（演示用）本地提示 + 申请订阅
export async function checkAndNotifyTrainingDay() {
  const settings = useDaySettingsStore()
  settings.load()
  const today = new Date().toISOString().slice(0, 10)
  const tplName = settings.getTodayWeekTemplate(today) // 复用周计划；循环模式需配合 getCycleIndex
  if (!tplName) return // 今日非训练日
  // 演示：本地通知（App）/控制台（小程序）+ 申请订阅
  if (isApp) {
    // #ifdef APP-PLUS
    if (plus.push && typeof plus.push.createPush === 'function') {
      plus.push.createPush(`今日训练：${tplName}`, { title: 'FitNote 训练提醒' })
    } else {
      uni.showToast({ title: `今日训练：${tplName}`, icon: 'none', duration: 3000 })
    }
    // #endif
  } else {
    console.log('[训练日提醒] 今日训练：', tplName)
    await requestSubscribe(REMINDER_TEMPLATE_ID)
  }
}

// 组间休息到点通知
export async function notifyRestEnd() {
  if (isApp) {
    // #ifdef APP-PLUS
    if (plus.push && typeof plus.push.createPush === 'function') {
      plus.push.createPush('组间休息结束，继续训练！', { title: 'FitNote' })
    } else {
      uni.showToast({ title: '组间休息结束，继续训练！', icon: 'none', duration: 3000 })
      uni.vibrateLong()
    }
    // #endif
  } else {
    await requestSubscribe(REST_TEMPLATE_ID)
    // 实际下发由云函数 sendReminder 完成（需配合 openid + 下发）
  }
}
