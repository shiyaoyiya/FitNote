# 通知栏倒计时显示实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Android 通知栏倒计时显示功能，替代系统悬浮窗，解决小米 MIUI 权限问题

**Architecture:** 使用 Android 原生 NotificationManager API 创建常驻通知，每秒更新倒计时进度，计时结束后自动清除。与现有 floatTimer.js 整合，优先使用通知栏，悬浮窗作为可选增强。

**Tech Stack:** uni-app, Vue 3, Android原生API (plus.android), Pinia

---

## 文件结构

### 新增文件
- `utils/notificationTimer.js` - 通知栏计时器模块（核心功能）

### 修改文件
- `utils/floatTimer.js` - 整合通知栏功能
- `pages/index/day.vue` - 调整启动逻辑和权限提示

---

## Task 1: 创建通知栏计时器模块

**Files:**
- Create: `utils/notificationTimer.js`

- [ ] **Step 1: 创建 notificationTimer.js 文件结构**

```javascript
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
```

- [ ] **Step 2: 添加创建通知渠道函数**

```javascript
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
```

- [ ] **Step 3: 添加显示通知函数**

```javascript
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
```

- [ ] **Step 4: 添加更新和关闭通知函数**

```javascript
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
```

- [ ] **Step 5: 验证文件语法**

检查 notificationTimer.js 文件语法是否正确，确保所有函数都已正确导出。

---

## Task 2: 修改 floatTimer.js 整合通知栏

**Files:**
- Modify: `utils/floatTimer.js`

- [ ] **Step 1: 添加导入语句**

```javascript
// utils/floatTimer.js
// 倒计时悬浮提醒
// 系统悬浮窗（plus.android WindowManager）—— 前台后台桌面均可见，需 SYSTEM_ALERT_WINDOW 权限
// 通知栏显示（NotificationManager）—— 后台可见，无需特殊权限

import {
  showNotificationTimer,
  updateNotificationTimer,
  closeNotificationTimer
} from './notificationTimer.js'

let sysTextView = null    // 系统悬浮 TextView
let sysWM = null          // WindowManager
let sysParams = null
```

- [ ] **Step 2: 修改 startFloatTimer 函数**

```javascript
// ============ 统一入口 ============
// 启动悬浮窗（优先通知栏，失败再尝试系统悬浮窗）
export function startFloatTimer(initialText) {
  // #ifdef APP-PLUS
  // 优先尝试通知栏（更可靠，无需特殊权限）
  const notificationOk = showNotificationTimer(initialText)
  if (notificationOk) {
    console.log('[floatTimer] 通知栏启动成功')
    return true
  }
  
  // 通知栏失败，尝试系统悬浮窗（需要特殊权限）
  const floatOk = showSystemFloatTimer(initialText)
  if (floatOk) {
    console.log('[floatTimer] 系统悬浮窗启动成功')
    return true
  }
  
  // 都失败
  console.log('[floatTimer] 通知栏和悬浮窗都启动失败')
  return false
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}
```

- [ ] **Step 3: 修改 updateFloatTimerText 函数**

```javascript
export function updateFloatTimerText(text) {
  // #ifdef APP-PLUS
  // 同时更新通知栏和悬浮窗（如果都存在）
  updateNotificationTimer(text)
  updateSystemFloatTimer(text)
  // #endif
}
```

- [ ] **Step 4: 修改 stopFloatTimer 函数**

```javascript
export function stopFloatTimer() {
  // #ifdef APP-PLUS
  // 同时关闭通知栏和悬浮窗
  closeNotificationTimer()
  closeSystemFloatTimer()
  // #endif
}
```

- [ ] **Step 5: 验证修改**

检查 floatTimer.js 修改是否正确，确保导入和导出都正常工作。

---

## Task 3: 修改 day.vue 调整启动逻辑

**Files:**
- Modify: `pages/index/day.vue`

- [ ] **Step 1: 找到 tryStartFloatTimer 方法位置**

在 day.vue 中找到 `tryStartFloatTimer` 方法（约第444行）。

- [ ] **Step 2: 修改 tryStartFloatTimer 方法**

```javascript
      // 尝试启动系统悬浮窗：先直接尝试显示，失败再引导权限
      tryStartFloatTimer(text) {
        // #ifdef APP-PLUS
        const ok = startFloatTimer(text)
        if (ok) return
        
        // 启动失败（理论上通知栏不会失败）
        console.log('[floatTimer] 通知栏和悬浮窗都启动失败')
        // #endif
      },
```

- [ ] **Step 3: 找到 onShow 方法中的悬浮窗检查**

在 day.vue 的 `onShow` 方法中（约第392行），找到悬浮窗权限检查代码。

- [ ] **Step 4: 修改 onShow 方法中的悬浮窗检查**

```javascript
      // 计时进行中且页面恢复时，检查是否需要恢复悬浮窗/通知栏
      // #ifdef APP-PLUS
      if (this.timerActive) {
        // 尝试恢复通知栏/悬浮窗显示
        startFloatTimer(this.timerDisplay || this.formatMiniTime(this.timerDuration))
      }
      // #endif
```

- [ ] **Step 5: 验证修改**

检查 day.vue 修改是否正确，确保逻辑流程正常。

---

## Task 4: 测试和调试

- [ ] **Step 1: 编译项目**

```bash
npm run dev:app
```

- [ ] **Step 2: 在小米手机上测试**

1. 启动应用，进入训练日页面
2. 点击"开始计时"按钮
3. 切换到其他应用或返回桌面
4. 检查通知栏是否显示倒计时
5. 点击通知，验证是否返回应用
6. 等待计时结束，验证通知是否自动清除

- [ ] **Step 3: 检查日志**

在 HBuilderX 控制台查看日志，确认：
- `[notificationTimer] 通知显示成功`
- `[floatTimer] 通知栏启动成功`

- [ ] **Step 4: 测试异常情况**

1. 关闭应用通知权限，验证降级处理
2. 杀掉应用后重启，验证计时器状态
3. 测试不同 Android 版本的兼容性

- [ ] **Step 5: 提交代码**

```bash
git add utils/notificationTimer.js utils/floatTimer.js pages/index/day.vue
git commit -m "feat: 使用通知栏替代悬浮窗显示计时器，解决小米MIUI权限问题"
```

---

## Task 5: 文档更新

- [ ] **Step 1: 更新 CODE_WIKI.md**

在 docs/CODE_WIKI.md 中添加通知栏计时器的说明。

- [ ] **Step 2: 更新 README.md**

在 README.md 中添加功能说明和使用方法。

- [ ] **Step 3: 提交文档更新**

```bash
git add docs/CODE_WIKI.md README.md
git commit -m "docs: 添加通知栏计时器功能文档"
```

---

## 完成检查

- [ ] notificationTimer.js 文件创建完成
- [ ] floatTimer.js 修改完成
- [ ] day.vue 修改完成
- [ ] 功能测试通过
- [ ] 异常情况测试通过
- [ ] 文档更新完成
- [ ] 代码提交完成