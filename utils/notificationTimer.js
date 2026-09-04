// utils/notificationTimer.js
// 通知栏倒计时显示
// 使用 Android NotificationManager 显示计时进度，无需特殊权限

let notificationManager = null
let currentNotification = null
const TIMER_NOTIFICATION_ID = 1001
const TIMER_CHANNEL_ID = 'fitnote_timer_channel'

// 初始化 NotificationManager
function initNotificationManager() {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    if (!main) {
      console.log('[notificationTimer] runtimeMainActivity 为空')
      return false
    }
    notificationManager = main.getSystemService('notification')
    if (!notificationManager) {
      console.log('[notificationTimer] NotificationManager 获取失败')
      return false
    }
    return true
  } catch (e) {
    console.log('[notificationTimer] initNotificationManager 异常:', JSON.stringify(e))
    return false
  }
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

export { initNotificationManager }

// 创建通知渠道（Android 8.0+ 需要）
function createNotificationChannel() {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const NotificationChannel = plus.android.importClass('android.app.NotificationChannel')
    const channel = new NotificationChannel(
      TIMER_CHANNEL_ID,
      'FitNote 计时器',
      notificationManager.IMPORTANCE_LOW
    )
    channel.setDescription('显示训练计时进度')
    channel.setShowBadge(false)
    notificationManager.createNotificationChannel(channel)
    console.log('[notificationTimer] 通知渠道创建成功')
    return true
  } catch (e) {
    console.log('[notificationTimer] createNotificationChannel 异常:', JSON.stringify(e))
    return false
  }
  // #endif
  return false
}

export { createNotificationChannel }

// 显示计时通知
export function showNotificationTimer(initialText) {
  // #ifdef APP-PLUS
  try {
    // 初始化 NotificationManager
    if (!notificationManager) {
      if (!initNotificationManager()) {
        console.log('[notificationTimer] NotificationManager 初始化失败')
        return false
      }
    }

    // 创建通知渠道
    createNotificationChannel()

    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const PendingIntent = plus.android.importClass('android.app.PendingIntent')

    // 创建点击通知返回应用的 Intent
    const intent = new Intent(main, main.getClass())
    intent.setAction('android.intent.action.MAIN')
    intent.addCategory('android.intent.category.LAUNCHER')
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
    
    const pendingIntent = PendingIntent.getActivity(
      main,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    )

    // 构建通知
    const NotificationCompat = plus.android.importClass('androidx.core.app.NotificationCompat')
    const notification = new NotificationCompat.Builder(main, TIMER_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle('FitNote 计时器')
      .setContentText(initialText)
      .setOngoing(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .build()

    // 显示通知
    notificationManager.notify(TIMER_NOTIFICATION_ID, notification)
    console.log('[notificationTimer] 通知显示成功')
    return true
  } catch (e) {
    console.log('[notificationTimer] showNotificationTimer 异常:', JSON.stringify(e))
    return false
  }
  // #endif
  return false
}

// 更新通知文本
export function updateNotificationTimer(text) {
  // #ifdef APP-PLUS
  try {
    if (!notificationManager) return false

    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const PendingIntent = plus.android.importClass('android.app.PendingIntent')

    // 创建点击通知返回应用的 Intent
    const intent = new Intent(main, main.getClass())
    intent.setAction('android.intent.action.MAIN')
    intent.addCategory('android.intent.category.LAUNCHER')
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
    
    const pendingIntent = PendingIntent.getActivity(
      main,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    )

    // 构建通知
    const NotificationCompat = plus.android.importClass('androidx.core.app.NotificationCompat')
    const notification = new NotificationCompat.Builder(main, TIMER_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle('FitNote 计时器')
      .setContentText(text)
      .setOngoing(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .build()

    // 更新通知
    notificationManager.notify(TIMER_NOTIFICATION_ID, notification)
    return true
  } catch (e) {
    console.log('[notificationTimer] updateNotificationTimer 异常:', JSON.stringify(e))
    return false
  }
  // #endif
  return false
}

// 关闭通知
export function closeNotificationTimer() {
  // #ifdef APP-PLUS
  try {
    if (notificationManager) {
      notificationManager.cancel(TIMER_NOTIFICATION_ID)
      console.log('[notificationTimer] 通知已关闭')
    }
    return true
  } catch (e) {
    console.log('[notificationTimer] closeNotificationTimer 异常:', JSON.stringify(e))
    return false
  }
  // #endif
  return false
}
