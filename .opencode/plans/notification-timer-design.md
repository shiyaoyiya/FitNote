# 通知栏倒计时显示设计方案

## 1. 背景与问题

### 1.1 当前实现
- 使用 Android 系统悬浮窗 (`TYPE_APPLICATION_OVERLAY`) 显示计时器
- 需要 `SYSTEM_ALERT_WINDOW` 权限
- 通过 `Settings.canDrawOverlays()` 检查权限
- 使用 `MANAGE_OVERLAY_PERMISSION` Intent 跳转权限设置

### 1.2 问题
- 小米 MIUI 系统的悬浮窗权限设置路径与原生 Android 不同
- `MANAGE_OVERLAY_PERMISSION` Intent 在小米系统上不起作用
- 用户在设置中找不到悬浮窗选项
- 降级方案（本地通知）只在计时结束时显示，无法实时显示倒计时

### 1.3 需求
- 应用在后台时，屏幕上显示倒计时（通知栏）
- 应用在后台时，计时器继续运行（已实现）
- 无需特殊权限，所有 Android 设备都支持

## 2. 解决方案

### 2.1 核心思路
使用 Android 通知栏显示倒计时进度，替代系统悬浮窗：
- 创建常驻通知，显示倒计时进度
- 每秒更新通知内容
- 点击通知可直接返回应用
- 计时结束后自动清除通知

### 2.2 技术实现

#### 2.2.1 新增文件
`utils/notificationTimer.js` - 通知栏计时器模块

```javascript
// 核心功能
export function showNotificationTimer(initialText)
export function updateNotificationTimer(text)
export function closeNotificationTimer()
```

#### 2.2.2 Android 原生 API 使用

```javascript
// 1. 获取 Android Context
const main = plus.android.runtimeMainActivity()
const Context = plus.android.importClass('android.content.Context')

// 2. 获取 NotificationManager
const notificationManager = main.getSystemService('notification')

// 3. 创建通知渠道（Android 8+ 需要）
const NotificationChannel = plus.android.importClass('android.app.NotificationChannel')
const channel = new NotificationChannel(
  'fitnote_timer_channel',
  'FitNote 计时器',
  NotificationManager.IMPORTANCE_LOW
)
channel.setDescription('显示训练计时进度')
notificationManager.createNotificationChannel(channel)

// 4. 构建通知
const NotificationCompat = plus.android.importClass('androidx.core.app.NotificationCompat')
const Intent = plus.android.importClass('android.content.Intent')
const PendingIntent = plus.android.importClass('android.app.PendingIntent')

// 创建点击通知返回应用的 Intent
const intent = new Intent(main, main.getClass())
intent.setAction('android.intent.action.MAIN')
intent.addCategory('android.intent.category.LAUNCHER')
const pendingIntent = PendingIntent.getActivity(
  main,
  0,
  intent,
  PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
)

// 构建通知
const notification = new NotificationCompat.Builder(main, 'fitnote_timer_channel')
  .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)  // 使用系统图标
  .setContentTitle('FitNote 计时器')
  .setContentText(initialText)
  .setOngoing(true)  // 不可滑动清除
  .setContentIntent(pendingIntent)
  .setPriority(NotificationCompat.PRIORITY_LOW)
  .build()

// 5. 显示通知
const TIMER_NOTIFICATION_ID = 1001
notificationManager.notify(TIMER_NOTIFICATION_ID, notification)
```

#### 2.2.3 通知更新与关闭

```javascript
// 更新通知文本
export function updateNotificationTimer(text) {
  // 重新构建通知并更新
}

// 关闭通知
export function closeNotificationTimer() {
  notificationManager.cancel(TIMER_NOTIFICATION_ID)
}
```

## 3. 与现有代码的整合

### 3.1 修改文件

#### 3.1.1 `utils/floatTimer.js`
- 保留现有悬浮窗功能（作为可选增强）
- 新增通知栏计时功能
- 修改 `startFloatTimer` 逻辑：优先尝试通知栏，失败再尝试悬浮窗

```javascript
// 修改后的启动逻辑
export function startFloatTimer(initialText) {
  // #ifdef APP-PLUS
  // 优先尝试通知栏（更可靠）
  const notificationOk = showNotificationTimer(initialText)
  if (notificationOk) return true
  
  // 通知栏失败，尝试悬浮窗（需要特殊权限）
  const floatOk = showSystemFloatTimer(initialText)
  if (floatOk) return true
  
  // 都失败，返回 false 让调用方引导
  return false
  // #endif
}

export function updateFloatTimerText(text) {
  // 同时更新通知栏和悬浮窗
  updateNotificationTimer(text)
  updateSystemFloatTimer(text)
}

export function stopFloatTimer() {
  // 同时关闭通知栏和悬浮窗
  closeNotificationTimer()
  closeSystemFloatTimer()
}
```

#### 3.1.2 `pages/index/day.vue`
- 修改 `tryStartFloatTimer` 方法，优先使用通知栏
- 调整权限引导提示，通知栏不需要特殊权限

```javascript
tryStartFloatTimer(text) {
  // #ifdef APP-PLUS
  const ok = startFloatTimer(text)
  if (ok) return
  
  // 启动失败（理论上通知栏不会失败）
  console.log('[floatTimer] 通知栏和悬浮窗都启动失败')
  // #endif
}
```

### 3.2 权限处理

#### 3.2.1 通知栏权限
- 通知栏权限是 Android 系统的基础权限
- 应用安装后默认拥有通知权限
- 无需特殊权限检查和引导

#### 3.2.2 悬浮窗权限（可选增强）
- 保留现有的悬浮窗权限检查逻辑
- 作为可选增强功能
- 用户可选择开启悬浮窗以获得更好的体验

## 4. 用户体验

### 4.1 正常流程
1. 用户点击"开始计时"
2. 计时器启动，通知栏显示倒计时
3. 用户切换到其他应用或锁屏
4. 通知栏持续显示倒计时进度
5. 用户点击通知返回应用
6. 计时结束，通知自动清除

### 4.2 异常处理
- 通知权限被关闭：降级为本地通知（现有逻辑）
- 应用被杀：计时器停止，通知清除
- 系统清理：计时器停止，通知清除

## 5. 兼容性

### 5.1 Android 版本
- Android 8.0+ (API 26+): 使用 NotificationChannel
- Android 7.1 及以下: 直接构建通知

### 5.2 设备兼容性
- 所有 Android 设备都支持通知栏
- 无需特殊权限
- 不受厂商定制影响

### 5.3 uni-app 兼容性
- 使用 `plus.android` 原生 API
- 需要自定义基座运行
- 标准基座可能不支持

## 6. 测试要点

### 6.1 功能测试
- [ ] 计时器启动后通知栏显示倒计时
- [ ] 倒计时每秒更新
- [ ] 点击通知返回应用
- [ ] 计时结束通知自动清除
- [ ] 应用切后台通知持续显示

### 6.2 兼容性测试
- [ ] Android 8.0+ 设备测试
- [ ] Android 7.1 及以下设备测试
- [ ] 不同品牌设备测试（小米、华为、OPPO、vivo）

### 6.3 权限测试
- [ ] 通知权限开启时正常显示
- [ ] 通知权限关闭时降级处理
- [ ] 悬浮窗权限开启时同时显示（可选）

## 7. 后续优化

### 7.1 功能增强
- 通知栏显示训练信息（当前动作、组数等）
- 支持通知栏快捷操作（暂停、继续、停止）
- 自定义通知样式（大文本、进度条等）

### 7.2 性能优化
- 减少通知更新频率（每秒 → 每 2 秒）
- 使用 NotificationManager 的批量更新
- 优化电池消耗

## 8. 总结

本方案使用 Android 通知栏替代系统悬浮窗，解决了小米 MIUI 系统悬浮窗权限问题：
- ✅ 无需特殊权限，所有 Android 设备都支持
- ✅ 后台可靠显示，不会被系统清理
- ✅ 用户体验一致，不依赖厂商定制
- ✅ 与现有代码整合，改动最小

实现简单、可靠、兼容性好，是解决当前问题的最佳方案。