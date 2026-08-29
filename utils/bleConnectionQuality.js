const QUALITY_THRESHOLD = {
  excellent: -50,
  good: -70,
  fair: -85,
  poor: -100
}

export function evaluateSignalQuality(rssi) {
  if (rssi >= QUALITY_THRESHOLD.excellent) {
    return { level: 'excellent', label: '优秀', color: '#22c55e' }
  } else if (rssi >= QUALITY_THRESHOLD.good) {
    return { level: 'good', label: '良好', color: '#3b82f6' }
  } else if (rssi >= QUALITY_THRESHOLD.fair) {
    return { level: 'fair', label: '一般', color: '#eab308' }
  } else {
    return { level: 'poor', label: '较差', color: '#ef4444' }
  }
}

export function getConnectionStatusText(state) {
  switch (state) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'reconnecting': return '重新连接中...'
    case 'disconnected': return '未连接'
    default: return '未知状态'
  }
}

export function shouldShowWeakSignalWarning(rssi) {
  return rssi < QUALITY_THRESHOLD.good
}
