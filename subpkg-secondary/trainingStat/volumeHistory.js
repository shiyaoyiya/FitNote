const STORAGE_KEY = 'training_volume_history'

const FIXED_RANGES = {
  chest: { low: 20, high: 40 },
  back: { low: 24, high: 64 },
  legs: { low: 20, high: 48 },
  glutes: { low: 16, high: 48 },
  front_delt: { low: 0, high: 12 },
  side_delt: { low: 16, high: 40 },
  rear_delt: { low: 12, high: 28 },
  biceps: { low: 12, high: 36 },
  triceps: { low: 12, high: 36 },
}

const VALID_BODY_PARTS = Object.keys(FIXED_RANGES)

function loadVolumeHistory() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    }
  } catch (e) { }
  return {}
}

function saveVolumeHistory(data) {
  uni.setStorageSync(STORAGE_KEY, data)
}

function normalizeWeekStart(weekStart) {
  const parts = weekStart.split('-')
  if (parts.length === 3) {
    const y = parts[0].padStart(4, '0')
    const m = parts[1].padStart(2, '0')
    const d = parts[2].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return weekStart
}

function getCurrentWeekStart() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function ensureBodyPartEntry(history, bodyPartId) {
  if (!history[bodyPartId]) {
    history[bodyPartId] = { weeks: [] }
  }
  return history[bodyPartId]
}

function ensureCurrentWeekRecord(bodyPartId, currentSets, history) {
  const entry = ensureBodyPartEntry(history, bodyPartId)
  const currentWeek = normalizeWeekStart(getCurrentWeekStart())
  const existingIndex = entry.weeks.findIndex(w => w.weekStart === currentWeek)

  if (existingIndex >= 0) {
    entry.weeks[existingIndex].sets = currentSets
  } else {
    entry.weeks.push({ weekStart: currentWeek, sets: currentSets })
  }

  entry.weeks.sort((a, b) => a.weekStart < b.weekStart ? -1 : 1)
  saveVolumeHistory(history)
}

function getLastNWeeksData(bodyPartId, n, history) {
  const entry = history[bodyPartId]
  if (!entry || !entry.weeks || entry.weeks.length === 0) return []

  const sorted = [...entry.weeks].sort((a, b) => a.weekStart < b.weekStart ? 1 : -1)
  return sorted.slice(0, n).reverse()
}

function getPhase(bodyPartId, history) {
  const entry = history[bodyPartId]
  if (!entry || !entry.weeks) return 'A'

  return entry.weeks.length >= 8 ? 'B' : 'A'
}

function getFixedRangeStatus(bodyPartId, history) {
  const range = FIXED_RANGES[bodyPartId]
  if (!range) return null

  const last2Weeks = getLastNWeeksData(bodyPartId, 2, history)
  if (last2Weeks.length === 0) return null

  const totalSets = last2Weeks.reduce((sum, w) => sum + w.sets, 0)

  if (totalSets < range.low) return 'low'
  if (totalSets > range.high) return 'high'
  return 'normal'
}

function computeWeightedMean(weeksData) {
  const n = weeksData.length
  if (n === 0) return 0

  const weightSum = n * (n + 1) / 2
  let weightedSum = 0

  for (let i = 0; i < n; i++) {
    const weight = (i + 1) / weightSum
    weightedSum += weeksData[i].sets * weight
  }

  return weightedSum
}

function getAdaptiveStatus(bodyPartId, history) {
  const entry = history[bodyPartId]
  if (!entry || !entry.weeks || entry.weeks.length === 0) return null

  const windowSize = Math.min(entry.weeks.length, 8)
  const recentData = getLastNWeeksData(bodyPartId, windowSize, history)

  if (recentData.length < 2) return null

  const currentWeekSets = recentData[recentData.length - 1].sets
  const pastData = recentData.slice(0, -1)

  const baseline = computeWeightedMean(pastData)
  const lowThreshold = baseline * 0.7
  const highThreshold = baseline * 1.3

  if (currentWeekSets < lowThreshold) return 'low'
  if (currentWeekSets > highThreshold) return 'high'
  return 'normal'
}

function updateBaseline(bodyPartId, history) {
  const entry = history[bodyPartId]
  if (!entry || !entry.weeks || entry.weeks.length < 2) return

  const windowSize = Math.min(entry.weeks.length, 8)
  const recentData = getLastNWeeksData(bodyPartId, windowSize, history)

  if (recentData.length < 2) return

  const pastData = recentData.slice(0, -1)
  const oldBaseline = computeWeightedMean(pastData)
  const currentWeekSets = recentData[recentData.length - 1].sets

  const newBaseline = 0.8 * oldBaseline + 0.2 * currentWeekSets

  entry.baseline = Math.round(newBaseline)
  saveVolumeHistory(history)
}

function getStatus(bodyPartId, history) {
  if (!VALID_BODY_PARTS.includes(bodyPartId)) return null

  const entry = history[bodyPartId]

  const status = getFixedRangeStatus(bodyPartId, history)
  if (status && entry && entry.weeks) {
    const last2Weeks = getLastNWeeksData(bodyPartId, 2, history)
    const totalSets = last2Weeks.reduce((sum, w) => sum + w.sets, 0)
    const range = FIXED_RANGES[bodyPartId]
    console.log(`[BadgeDebug] ${bodyPartId} Phase=A status=${status} weeks=${entry.weeks.length} last2Total=${totalSets} range=[${range.low},${range.high}]`)
  }

  return status || null
}

function updateWeeklyVolume(weeklyVolumeMap, history) {
  for (const [weekStart, bodyParts] of Object.entries(weeklyVolumeMap)) {
    const normalizedWeekStart = normalizeWeekStart(weekStart)
    for (const [subId, sets] of Object.entries(bodyParts)) {
      const mappedId = getMappedBodyPartId(subId)
      if (!mappedId) continue

      if (sets > 200) {
        console.warn(`[BadgeWarning] ${mappedId} week=${normalizedWeekStart} sets=${sets} exceeds 200, possible data issue`)
      }

      const entry = ensureBodyPartEntry(history, mappedId)
      const existingIndex = entry.weeks.findIndex(w => w.weekStart === normalizedWeekStart)

      if (existingIndex >= 0) {
        entry.weeks[existingIndex].sets = sets
      } else {
        entry.weeks.push({ weekStart: normalizedWeekStart, sets })
      }
    }
  }

  for (const entry of Object.values(history)) {
    if (entry.weeks) {
      entry.weeks.sort((a, b) => a.weekStart < b.weekStart ? -1 : 1)
    }
  }

  saveVolumeHistory(history)
}

function rebuildVolumeHistory(fullWeeklyVolumeMap) {
  const history = {}

  for (const [weekStart, bodyParts] of Object.entries(fullWeeklyVolumeMap)) {
    const normalizedWeekStart = normalizeWeekStart(weekStart)
    for (const [subId, sets] of Object.entries(bodyParts)) {
      const mappedId = getMappedBodyPartId(subId)
      if (!mappedId) continue

      if (!history[mappedId]) {
        history[mappedId] = { weeks: [] }
      }

      const existingIndex = history[mappedId].weeks.findIndex(w => w.weekStart === normalizedWeekStart)
      const setsValue = typeof sets === 'number' ? sets : 0
      if (existingIndex >= 0) {
        history[mappedId].weeks[existingIndex].sets += setsValue
      } else {
        history[mappedId].weeks.push({ weekStart: normalizedWeekStart, sets: setsValue })
      }
    }
  }

  for (const entry of Object.values(history)) {
    if (entry.weeks) {
      entry.weeks.sort((a, b) => a.weekStart < b.weekStart ? -1 : 1)
    }
  }

  saveVolumeHistory(history)
  return history
}

function getMappedBodyPartId(subId) {
  const mergeMap = {
    upper_chest: 'chest',
    mid_lower_chest: 'chest',
    teres_major: 'back',
    mid_lower_traps: 'back',
    lats: 'back',
    quads: 'legs',
    hamstrings: 'legs',
  }
  return mergeMap[subId] || subId
}

export {
  loadVolumeHistory,
  saveVolumeHistory,
  getLastNWeeksData,
  getPhase,
  getFixedRangeStatus,
  getAdaptiveStatus,
  updateBaseline,
  getStatus,
  updateWeeklyVolume,
  getMappedBodyPartId,
  rebuildVolumeHistory,
  FIXED_RANGES,
  VALID_BODY_PARTS,
}
