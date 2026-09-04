/**
 * 力量训练心率分析纯算法模块（无副作用，不依赖 uni / Pinia / DOM）。
 * 所有参数传值式调用，便于 node 下单测。
 */

export function calcVolumeLoad(weight, reps) {
  const w = Number(weight) || 0
  const r = Number(reps) || 0
  return w * r
}

export function estimateE1RMEpley(weight, reps) {
  const w = Number(weight) || 0
  const r = Number(reps) || 0
  if (w <= 0 || r <= 0) return 0
  return w * (1 + r / 30)
}

export function calcRelativeIntensity(weight, oneRM) {
  const w = Number(weight) || 0
  const o = Number(oneRM) || 0
  if (!o || o <= 0) return null
  return w / o
}

export function calcHRR(hr, restingHR, maxHR) {
  const h = Number(hr) || 0
  const r = Number(restingHR) || 0
  const m = Number(maxHR) || 0
  if (m <= r) return 0 // 异常：退化保护
  const raw = (h - r) / (m - r)
  if (raw < 0) return 0
  if (raw > 1) return 1
  return raw
}

export function extractHrWindow(hrSamplesWithTs, startTime, endTime, minSamples = 3) {
  const arr = Array.isArray(hrSamplesWithTs) ? hrSamplesWithTs : []
  const st = Number(startTime) || 0
  const et = Number(endTime) || 0
  const samples = []
  for (const s of arr) {
    if (!s || typeof s.ts !== 'number' || typeof s.hr !== 'number') continue
    if (s.ts >= st && s.ts <= et) samples.push(s)
  }
  return {
    samples,
    sampleCount: samples.length,
    analyzed: samples.length >= minSamples,
  }
}

export function calcHrMetrics(window) {
  if (!window || !window.analyzed) {
    return {
      analyzed: false,
      startHr: null,
      averageHr: null,
      peakHr: null,
      endHr: null,
      deltaHr: null,
      sampleCount: window ? (window.sampleCount | 0) : 0,
    }
  }
  const { samples } = window
  let sum = 0
  let peak = -Infinity
  for (const s of samples) {
    sum += s.hr
    if (s.hr > peak) peak = s.hr
  }
  const start = samples[0].hr
  const end = samples[samples.length - 1].hr
  const avg = sum / samples.length
  return {
    analyzed: true,
    startHr: start,
    averageHr: Math.round(avg * 10) / 10,
    peakHr: peak,
    endHr: end,
    deltaHr: peak - start,
    sampleCount: samples.length,
  }
}

export function calcCardiovascularLoad(hrSamplesWithTs, restingHR, maxHR, sessionStartTs, sessionEndTs) {
  const arr = Array.isArray(hrSamplesWithTs) ? hrSamplesWithTs : []
  const r = Number(restingHR) || 0
  const m = Number(maxHR) || 0
  const st = Number(sessionStartTs) || 0
  const et = Number(sessionEndTs) || Date.now()
  if (r >= m) {
    console.warn('[cardiovascularLoad] restingHR >= maxHR, skipped → null')
    return null
  }
  // 取 session 范围内样本（可能未排序，先按 ts 过滤再排序）
  const inRange = []
  for (const s of arr) {
    if (!s || typeof s.ts !== 'number' || typeof s.hr !== 'number') continue
    if (s.ts >= st && s.ts <= et) inRange.push(s)
  }
  if (inRange.length < 2) return null
  inRange.sort((a, b) => a.ts - b.ts)
  let total = 0
  for (let i = 1; i < inRange.length; i++) {
    const dtMin = (inRange[i].ts - inRange[i - 1].ts) / 60000
    if (dtMin <= 0) continue
    const avgHRR = (calcHRR(inRange[i - 1].hr, r, m) + calcHRR(inRange[i].hr, r, m)) / 2
    total += dtMin * avgHRR
  }
  return Math.round(total * 100) / 100
}

export function estimateRestingHr(hrSamplesWithTs, sessionStartTs, windowSec = 60, fallbackAge = null) {
  const st = Number(sessionStartTs) || 0
  const end = st + (windowSec * 1000)
  const win = []
  const arr = Array.isArray(hrSamplesWithTs) ? hrSamplesWithTs : []
  for (const s of arr) {
    if (!s || typeof s.ts !== 'number' || typeof s.hr !== 'number') continue
    if (s.ts >= st && s.ts <= end) win.push(s.hr)
  }
  if (win.length >= 10) {
    return { value: Math.min(...win), source: 'window' }
  }
  // fallback 公式
  const age = Number(fallbackAge)
  if (age && age > 0) {
    const maxHR = 220 - age
    const v = Math.round(maxHR * 0.4)
    return { value: v, source: 'formula' }
  }
  return { value: null, source: 'none' }
}

function numOr(v, d = 0) { const n = Number(v); return Number.isNaN(n) ? d : n }

export function analyzeTrainingSession(params) {
  const {
    entries = [],
    hrSamplesWithTs = [],
    restDurationSecByAction,
    profile,
    historicalBestGetter,
    // 支持调用方显式控制 status / sessionEndTs / finalized
    status,
    sessionEndTs,
    finalized,       // 兼容旧调用：finalized=true 等价于 status='finalized'
    // 兼容：旧调用误传 restDurationSec（数字），找不到函数时 fallback 到它
    restDurationSec,
  } = params || {}

  const out = {
    generatedAt: Date.now(),
    sessionStartTs: 0,
    sessionEndTs: null,
    status: 'in_progress',
    session: {
      totalVolumeLoad: 0,
      mechanicalLoad: 0,
      cardiovascularLoad: null,
      averageHr: null,
      peakHr: null,
      restingHrUsed: { value: null, source: 'estimated' },
      maxHrUsed: { value: null, source: 'formula' },
    },
    setAnalyses: [],
    actionAnalyses: {},
    hrProfiles: {},
  }

  if (!entries.length) return out

  // Step 2 - session 时间范围
  const tsList = entries.map(e => e.timestamp).filter(t => typeof t === 'number' && t > 0)
  out.sessionStartTs = tsList.length ? Math.min(...tsList) : Date.now()
  const maxTs = tsList.length ? Math.max(...tsList) : 0
  out.sessionEndTs = maxTs > 0 ? maxTs : Date.now()

  // Step 3 - restingHR / maxHR 决策
  const age = numOr(profile && profile.age, 0)
  let maxHR = null
  if (age > 0) {
    maxHR = 220 - age
    out.session.maxHrUsed = { value: maxHR, source: 'formula' }
  } else {
    out.session.maxHrUsed = { value: null, source: 'age-missing' }
  }
  let restingHR = null
  if (profile && profile.restingHR && profile.restingHR >= 30) {
    restingHR = profile.restingHR
    out.session.restingHrUsed = { value: restingHR, source: 'profile' }
  } else {
    const est = estimateRestingHr(hrSamplesWithTs, out.sessionStartTs, 60, age > 0 ? age : null)
    if (est.value !== null) restingHR = est.value
    out.session.restingHrUsed = { value: restingHR, source: est.source === 'none' ? 'estimated' : est.source }
  }

  // Step 4 - 每组分析
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const next = i + 1 < entries.length ? entries[i + 1] : null
    const transitionTimeSec = (next && e.timestamp && next.timestamp)
      ? Math.max(0, Math.round((next.timestamp - e.timestamp) / 1000))
      : null
    // restDurationSecByAction 是函数优先；否则 fallback 到数值型 restDurationSec
    let restDur = 0
    if (typeof restDurationSecByAction === 'function') {
      restDur = numOr(restDurationSecByAction(e.actionName), 0)
    } else {
      restDur = numOr(restDurationSec, 0)
    }
    const estimatedSetDurationSec = (transitionTimeSec === null) ? null : Math.max(0, transitionTimeSec - restDur)

    // 机械
    const w = numOr(e.weight, 0)
    const r = numOr(e.reps, 0)
    // 优先使用调用方传入的 volumeLoad（已正确处理单侧/复合/自重），退化到 w*r
    let vl
    if (e.volumeLoad !== undefined && e.volumeLoad !== null) {
      vl = numOr(e.volumeLoad, 0)
    } else {
      vl = w * r
    }
    // Epley e1RM
    let e1RM = null
    let riSource = null
    let riValue = null
    const best = historicalBestGetter ? historicalBestGetter(e.actionName) : null
    if (best && best.bestWeight > 0 && best.bestReps > 0) {
      e1RM = estimateE1RMEpley(best.bestWeight, best.bestReps)
      if (e1RM > 0) {
        riValue = calcRelativeIntensity(w, e1RM)
        riSource = 'epley'
      }
    }

    // HR 窗口
    let winResult
    if (typeof e.timestamp === 'number' && e.timestamp > 0) {
      const startWin = e.timestamp
      let endWin
      if (estimatedSetDurationSec !== null && estimatedSetDurationSec > 0) {
        endWin = startWin + estimatedSetDurationSec * 1000
      } else if (next && next.timestamp) {
        endWin = next.timestamp
      } else {
        endWin = out.sessionEndTs || Date.now()
      }
      winResult = extractHrWindow(hrSamplesWithTs, startWin, endWin, 3)
    } else {
      winResult = { samples: [], sampleCount: 0, analyzed: false }
    }
    const metrics = calcHrMetrics(winResult)

    out.setAnalyses.push({
      actionName: e.actionName,
      setIndex: numOr(e.setIndex, 1),
      timestamp: e.timestamp,
      weight: w,
      reps: r,
      volumeLoad: vl,
      relativeIntensity: { value: riValue, e1RM, e1RMEstimated: !!riSource, source: riSource },
      transitionTimeSec,
      restDurationSec: restDur,
      estimatedSetDurationSec,
      hr: metrics,
    })
  }

  // Step 5 - session 汇总
  out.session.totalVolumeLoad = out.setAnalyses.reduce((s, a) => s + a.volumeLoad, 0)
  out.session.mechanicalLoad = out.session.totalVolumeLoad
  if (maxHR !== null && restingHR !== null && restingHR < maxHR) {
    out.session.cardiovascularLoad = calcCardiovascularLoad(hrSamplesWithTs, restingHR, maxHR, out.sessionStartTs, out.sessionEndTs)
  }
  // session-wide HR avg/peak（不管 set 级窗口，直接取 session 范围全部采样，更稳定）
  const sessWin = extractHrWindow(hrSamplesWithTs, out.sessionStartTs, out.sessionEndTs || Date.now(), 1)
  if (sessWin.sampleCount > 0) {
    const hrs = sessWin.samples.map(s => s.hr)
    out.session.averageHr = Math.round(hrs.reduce((s, h) => s + h, 0) / hrs.length * 10) / 10
    out.session.peakHr = Math.max(...hrs)
  }

  // Step 6 - actionAnalyses
  for (const set of out.setAnalyses) {
    const k = set.actionName
    if (!out.actionAnalyses[k]) {
      out.actionAnalyses[k] = { actionName: k, setCount: 0, totalVolume: 0, averageHr: null, peakHr: null, avgDeltaHr: null, analyzedSetCount: 0 }
    }
    const aa = out.actionAnalyses[k]
    aa.setCount += 1
    aa.totalVolume += set.volumeLoad
    if (set.hr.analyzed) {
      aa.analyzedSetCount += 1
      aa._sumAvg = (aa._sumAvg || 0) + set.hr.averageHr
      aa._maxPeak = aa._maxPeak === undefined ? set.hr.peakHr : Math.max(aa._maxPeak, set.hr.peakHr)
      aa._sumDelta = (aa._sumDelta || 0) + set.hr.deltaHr
    }
  }
  // 收尾：把临时 _sum → average/peak/avgDeltaHr
  for (const k of Object.keys(out.actionAnalyses)) {
    const aa = out.actionAnalyses[k]
    if (aa.analyzedSetCount > 0) {
      aa.averageHr = Math.round(aa._sumAvg / aa.analyzedSetCount * 10) / 10
      aa.peakHr = aa._maxPeak
      aa.avgDeltaHr = Math.round(aa._sumDelta / aa.analyzedSetCount * 10) / 10
    }
    delete aa._sumAvg; delete aa._maxPeak; delete aa._sumDelta
  }

  // Step 7: 调用方显式控制 status / sessionEndTs（心率断开/手动结束时生效）
  if (typeof sessionEndTs === 'number' && sessionEndTs > 0) {
    out.sessionEndTs = sessionEndTs
  }
  if (typeof status === 'string' && status.length > 0) {
    out.status = status
  } else if (finalized === true) {
    out.status = 'finalized'
  }

  return out
}

const WEIGHT_BUCKETS = [20, 30, 40, 50, 60, 70, 80, 100, 120]
function bucketFor(w) {
  for (let i = WEIGHT_BUCKETS.length - 1; i >= 0; i--) {
    if (w >= WEIGHT_BUCKETS[i]) {
      return { lower: WEIGHT_BUCKETS[i], label: i === WEIGHT_BUCKETS.length - 1 ? '120+' : String(WEIGHT_BUCKETS[i]) }
    }
  }
  return { lower: 0, label: '<20' }
}

export function aggregateActionHrProfiles(historicalAnalyses, targetActionName) {
  // 初始化所有桶
  const buckets = {}
  for (const b of WEIGHT_BUCKETS) buckets[b] = { weightBucket: String(b), weightBucketLower: b, samples: [], points: [] }
  buckets['120+'] = { weightBucket: '120+', weightBucketLower: 120, samples: [], points: [] }
  if (!buckets['<20']) buckets['<20'] = { weightBucket: '<20', weightBucketLower: 0, samples: [], points: [] }

  const arr = Array.isArray(historicalAnalyses) ? historicalAnalyses : []
  for (const hist of arr) {
    const analysis = hist && hist.analysis
    if (!analysis || !Array.isArray(analysis.setAnalyses)) continue
    for (const set of analysis.setAnalyses) {
      if (set.actionName !== targetActionName) continue
      if (!set.hr.analyzed) continue
      const { label, lower } = bucketFor(set.weight)
      const key = label
      if (!buckets[key]) buckets[key] = { weightBucket: key, weightBucketLower: lower, samples: [], points: [] }
      buckets[key].samples.push({ avgHr: set.hr.averageHr, peakHr: set.hr.peakHr, deltaHr: set.hr.deltaHr })
      buckets[key].points.push({ date: hist.date, weight: set.weight, reps: set.reps, avgHr: set.hr.averageHr, peakHr: set.hr.peakHr, deltaHr: set.hr.deltaHr })
    }
  }
  // 整理结果数组
  const keysOrder = ['<20>', ...WEIGHT_BUCKETS.map(b => String(b)), '120+']
  return keysOrder
    .filter(k => buckets[k])
    .map(k => {
      const b = buckets[k]
      const n = b.samples.length
      if (n === 0) {
        return { weightBucket: b.weightBucket, weightBucketLower: b.weightBucketLower, avgHr: null, peakHr: null, avgDeltaHr: null, sampleSets: 0, points: [] }
      }
      let sAvg = 0, sPeak = 0, sDelta = 0
      for (const s of b.samples) {
        sAvg += s.avgHr; sPeak += s.peakHr; sDelta += s.deltaHr
      }
      return {
        weightBucket: b.weightBucket,
        weightBucketLower: b.weightBucketLower,
        avgHr: Math.round(sAvg / n * 10) / 10,
        peakHr: Math.round(sPeak / n * 10) / 10,
        avgDeltaHr: Math.round(sDelta / n * 10) / 10,
        sampleSets: n,
        points: b.points,
      }
    })
}
