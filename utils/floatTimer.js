// utils/floatTimer.js
// 倒计时悬浮提醒
// 系统悬浮窗（plus.android WindowManager）—— 前台后台桌面均可见，需 SYSTEM_ALERT_WINDOW 权限
// 需自定义基座运行（标准基座 plus.android bridge 不可用）

let sysTextView = null    // 系统悬浮 TextView
let sysWM = null          // WindowManager
let sysParams = null

// ============ 悬浮窗权限检查 ============
export function hasOverlayPermission() {
  // #ifdef APP-PLUS
  try {
    if (!plus.android) { console.log('[floatTimer] plus.android 不可用'); return false }
    const main = plus.android.runtimeMainActivity()
    if (!main) { console.log('[floatTimer] runtimeMainActivity 为空'); return false }
    // 方式1：importClass + 直接调用
    try {
      const Settings = plus.android.importClass('android.provider.Settings')
      const result = Settings.canDrawOverlays(main)
      if (typeof result === 'boolean') return result
      if (typeof result === 'number') return result !== 0
      return !!result
    } catch (e1) {
      console.log('[floatTimer] canDrawOverlays 方式1失败:', JSON.stringify(e1))
    }
    // 方式2：plus.android.invoke
    try {
      const result = plus.android.invoke('android.provider.Settings', 'canDrawOverlays', main)
      if (typeof result === 'boolean') return result
      if (typeof result === 'number') return result !== 0
      return !!result
    } catch (e2) {
      console.log('[floatTimer] canDrawOverlays 方式2失败:', JSON.stringify(e2))
    }
    return false
  } catch (e) {
    console.log('[floatTimer] hasOverlayPermission 异常:', JSON.stringify(e))
    return false
  }
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

// 跳转到悬浮窗权限设置页面（多级降级）
export function requestOverlayPermission() {
  // #ifdef APP-PLUS
  const ctx = plus.android.runtime.getContext()
  // 方式1：直接跳悬浮窗权限页（MANAGE_OVERLAY_PERMISSION）
  try {
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const uri = Uri.parse('package:' + ctx.getPackageName())
    const intent = new Intent('android.settings.action.MANAGE_OVERLAY_PERMISSION', uri)
    intent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
    ctx.startActivity(intent)
    console.log('[floatTimer] 跳转 MANAGE_OVERLAY_PERMISSION 成功')
    return true
  } catch (e) {
    console.log('[floatTimer] 方式1 MANAGE_OVERLAY_PERMISSION 失败', JSON.stringify(e))
  }
  // 方式2：跳应用详情页（用户手动找"显示在其他应用上层"）
  try {
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const uri = Uri.parse('package:' + ctx.getPackageName())
    const intent = new Intent('android.settings.APPLICATION_DETAILS_SETTINGS', uri)
    intent.addFlags(0x10000000)
    ctx.startActivity(intent)
    console.log('[floatTimer] 方式2 APPLICATION_DETAILS_SETTINGS 成功')
    return true
  } catch (e) {
    console.log('[floatTimer] 方式2 APPLICATION_DETAILS_SETTINGS 失败', JSON.stringify(e))
  }
  // 方式3：跳通用设置页
  try {
    const Intent = plus.android.importClass('android.content.Intent')
    const intent = new Intent('android.settings.SETTINGS')
    intent.addFlags(0x10000000)
    ctx.startActivity(intent)
    console.log('[floatTimer] 方式3 SETTINGS 成功')
    return true
  } catch (e) {
    console.log('[floatTimer] 方式3 SETTINGS 失败', JSON.stringify(e))
    return false
  }
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

// ============ 系统悬浮窗 ============
// 直接尝试 addView，有权限就成功，无权限 catch 返回 false
// 不依赖 hasOverlayPermission 前置检查（该函数可能误判）
export function showSystemFloatTimer(initialText) {
  // #ifdef APP-PLUS
  try {
    closeSystemFloatTimer()
    const main = plus.android.runtimeMainActivity()
    const LP = plus.android.importClass('android.view.WindowManager$LayoutParams')
    const TextView = plus.android.importClass('android.widget.TextView')
    const Gravity = plus.android.importClass('android.view.Gravity')
    const GradientDrawable = plus.android.importClass('android.graphics.drawable.GradientDrawable')

    sysWM = main.getSystemService('window')
    sysTextView = new TextView(main)
    sysTextView.setText(initialText)
    sysTextView.setTextColor(0xFFFFFFFF)
    sysTextView.setTextSize(14)
    sysTextView.setGravity(Gravity.CENTER)
    const bg = new GradientDrawable()
    bg.setColor(0xCC379BFF)
    bg.setCornerRadius(36)
    bg.setStroke(2, 0xFFFFFFFF)
    sysTextView.setBackgroundDrawable(bg)

    sysParams = new LP(144, 144)
    sysParams.type = 2038 // TYPE_APPLICATION_OVERLAY (Android 8+)
    sysParams.format = -3 // PIXEL_FORMAT_RGBX_8888
    sysParams.flags = 0x838 // FLAG_NOT_FOCUSABLE | FLAG_LAYOUT_IN_SCREEN | FLAG_LAYOUT_NO_LIMITS
    sysParams.gravity = Gravity.BOTTOM | Gravity.LEFT
    sysParams.x = 20
    sysParams.y = 240
    sysWM.addView(sysTextView, sysParams)
    console.log('[floatTimer] 系统悬浮窗已显示')
    return true
  } catch (e) {
    // addView 失败通常是无权限
    console.log('[floatTimer] addView 失败（可能无权限）:', JSON.stringify(e))
    return false
  }
  // #endif
  return false
}

export function updateSystemFloatTimer(text) {
  // #ifdef APP-PLUS
  try {
    if (sysTextView && sysWM) {
      sysTextView.setText(text)
    }
  } catch (e) {}
  // #endif
}

export function closeSystemFloatTimer() {
  // #ifdef APP-PLUS
  try {
    if (sysTextView && sysWM) {
      sysWM.removeView(sysTextView)
      sysTextView = null; sysWM = null; sysParams = null
    }
  } catch (e) {}
  // #endif
}

// ============ 本地通知（计时结束提醒） ============
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

// ============ 统一入口 ============
// 启动悬浮窗（检查权限，无权限返回 false 让调用方引导）
export function startFloatTimer(initialText) {
  return showSystemFloatTimer(initialText)
}

export function updateFloatTimerText(text) {
  updateSystemFloatTimer(text)
}

export function stopFloatTimer() {
  closeSystemFloatTimer()
}
