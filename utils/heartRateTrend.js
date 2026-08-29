// utils/heartRateTrend.js
export function calculateHrTrend(hrHistory, windowSize = 5) {
  if (!Array.isArray(hrHistory) || hrHistory.length < 2) {
    return { trend: 'stable', change: 0 }
  }

  if (!Number.isInteger(windowSize) || windowSize <= 0) {
    windowSize = 5
  }

  if (!hrHistory.every(h => typeof h === 'number' && !isNaN(h))) {
    return { trend: 'stable', change: 0 }
  }

  const recent = hrHistory.slice(-windowSize)
  const older = hrHistory.slice(-windowSize * 2, -windowSize)
  
  if (older.length === 0) {
    return { trend: 'stable', change: 0 }
  }
  
  const recentAvg = recent.reduce((sum, h) => sum + h, 0) / recent.length
  const olderAvg = older.reduce((sum, h) => sum + h, 0) / older.length
  
  const change = recentAvg - olderAvg
  const threshold = 3 // 3 bpm 阈值
  
  if (change > threshold) {
    return { trend: 'up', change: Math.round(change) }
  } else if (change < -threshold) {
    return { trend: 'down', change: Math.round(change) }
  } else {
    return { trend: 'stable', change: Math.round(change) }
  }
}

export function getTrendIcon(trend) {
  switch (trend) {
    case 'up': return '↑'
    case 'down': return '↓'
    default: return '→'
  }
}

export function getTrendColor(trend) {
  switch (trend) {
    case 'up': return '#ef4444'
    case 'down': return '#3b82f6'
    default: return '#22c55e'
  }
}