// utils/floatTimer.js
// 倒计时悬浮提醒
// 方案3：App 内悬浮球（plus.nativeObj.View）—— 前台可见，稳定
// 方案4：系统悬浮窗（plus.android WindowManager）—— 后台/桌面可见，需 SYSTEM_ALERT_WINDOW 权限
//        权限缺失或调用失败时自动降级到方案3

let floatView = null      // plus.nativeObj.View（App 内）
let sysTextView = null    // 系统悬浮 TextView
let sysWM = null          // WindowManager
let sysParams = null

// ============ 方案3：App 内悬浮球 ============
export function showFloatTimer(initialText) {
  // #ifdef APP-PLUS
  try {
    closeFloatTimer()
    floatView = new plus.nativeObj.View('fitnoteFloatTimer', {
      bottom: '120px', right: '20px', width: '70px', height: '70px',
      background: 'rgba(0,0,0,0.6)', borderRadius: '35px',
    })
    drawTime(floatView, initialText)
    floatView.show()
    floatView.addEventListener('touch', () => {
      try { plus.runtime.restart() } catch (e) {}
    })
  } catch (e) {
    console.log('[floatTimer] showFloatTimer failed', e)
  }
  // #endif
}

export function updateFloatTimer(text) {
  // #ifdef APP-PLUS
  try {
    if (floatView) drawTime(floatView, text)
  } catch (e) {}
  // #endif
}

function drawTime(view, text) {
  // #ifdef APP-PLUS
  view.drawText(text, {
    top: '0px', left: '0px', width: '100%', height: '100%',
    align: 'center', verticalAlign: 'middle',
    color: 'rgb(255,255,255)', size: '13px', weight: 'bold',
  }, 'timeText')
  // #endif
}

export function closeFloatTimer() {
  // #ifdef APP-PLUS
  try {
    if (floatView) { floatView.close(); floatView = null }
  } catch (e) {}
  // #endif
}

// ============ 方案4：系统悬浮窗 ============
export function hasOverlayPermission() {
  // #ifdef APP-PLUS
  try {
    const Settings = plus.android.importClass('android.provider.Settings')
    const ctx = plus.android.runtime.getContext()
    return Settings.canDrawOverlays(ctx)
  } catch (e) { return false }
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

export function requestOverlayPermission() {
  // #ifdef APP-PLUS
  try {
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const ctx = plus.android.runtime.getContext()
    const uri = Uri.parse('package:' + ctx.getPackageName())
    const intent = new Intent('android.settings.action.MANAGE_OVERLAY_PERMISSION', uri)
    intent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
    ctx.startActivity(intent)
  } catch (e) {
    console.log('[floatTimer] requestOverlayPermission failed', e)
  }
  // #endif
}

export function showSystemFloatTimer(initialText) {
  // #ifdef APP-PLUS
  if (!hasOverlayPermission()) { showFloatTimer(initialText); return }
  try {
    const ctx = plus.android.runtime.getContext()
    const LP = plus.android.importClass('android.view.WindowManager$LayoutParams')
    const TextView = plus.android.importClass('android.widget.TextView')
    const Gravity = plus.android.importClass('android.view.Gravity')
    const GradientDrawable = plus.android.importClass('android.graphics.drawable.GradientDrawable')

    sysWM = ctx.getSystemService('window')
    sysTextView = new TextView(ctx)
    sysTextView.setText(initialText)
    sysTextView.setTextColor(0xFFFFFFFF)
    sysTextView.setTextSize(13)
    sysTextView.setGravity(Gravity.CENTER)
    const bg = new GradientDrawable()
    bg.setColor(0x99000000)
    bg.setCornerRadius(35)
    sysTextView.setBackgroundDrawable(bg)

    sysParams = new LP(150, 150)
    sysParams.type = 2038 // TYPE_APPLICATION_OVERLAY (Android 8+)
    sysParams.format = -3 // PIXEL_FORMAT_RGBX_8888
    sysParams.flags = 0x838 // FLAG_NOT_FOCUSABLE | FLAG_LAYOUT_IN_SCREEN | FLAG_LAYOUT_NO_LIMITS
    sysParams.gravity = Gravity.BOTTOM | Gravity.RIGHT
    sysParams.x = 40
    sysParams.y = 240
    sysWM.addView(sysTextView, sysParams)
  } catch (e) {
    console.log('[floatTimer] showSystemFloatTimer failed, fallback', e)
    showFloatTimer(initialText)
  }
  // #endif
}

export function updateSystemFloatTimer(text) {
  // #ifdef APP-PLUS
  try {
    if (sysTextView && sysWM) sysTextView.setText(text)
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

// ============ 统一入口（按前后台自动切换） ============
export function startFloatTimer(initialText, inBackground) {
  // #ifdef APP-PLUS
  if (inBackground) showSystemFloatTimer(initialText)
  else showFloatTimer(initialText)
  // #endif
}

export function updateFloatTimerText(text, inBackground) {
  // #ifdef APP-PLUS
  if (inBackground && sysTextView) updateSystemFloatTimer(text)
  else updateFloatTimer(text)
  // #endif
}

export function stopFloatTimer() {
  closeFloatTimer()
}
