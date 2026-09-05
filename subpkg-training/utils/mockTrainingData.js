/**
 * 训练分析模块 — 模拟数据生成 & 注入工具
 * ============================================================
 * 适用场景：快速在 dayDataCache（uni storage）里注入一整段带 HR 采样的力量训练，
 *          用来测试 TrainingAnalysisCard / trainingAnalysis 独立页 / HR Profile 页 / HR Bar Chart。
 *
 * 使用方式（uni-app 运行时 + VConsole / DevTools）：
 *   1) import { generateMockSession, injectMockSession, clearMockSession } from '@/utils/mockTrainingData.js'
 *
 *   2) // 往今天注入一段 3 动作 × 4 组的推/拉/腿训练（约 90 分钟训练时长）
 *      await injectMockSession({ date: 'today' })
 *
 *   3) // 往指定日期（历史）注入一段个性化训练，用于 HR Profile 长期数据测试
 *      await injectMockSession({
 *        date: '2026-08-20',
 *        actionCount: 5,
 *        setsPerAction: [4, 5, 4, 3, 5],
 *        restingHR: 62,
 *        startHour: 19,
 *        startMinute: 15,
 *      })
 *
 *   4) // 清空某一天的 mock 数据
 *      clearMockSession({ date: '2026-08-20' })
 *
 *   5) // 仅生成内存对象，自己调试分析器算法（不写 storage）
 *      const { hrSamplesWithTs, entries, analysisInput } = generateMockSession({...})
 *
 * ============================================================
 */

/* ====== 纯函数部分（不依赖 uni / Pinia，可直接 Node 跑 / 单测） ====== */

const DEFAULT_ACTION_POOL = [
  { actionName: '杠铃卧推',       category: '推',    baseWeight: 60,  warmupRamp: [0.5, 0.7, 0.85], workSets: [0.8, 0.85, 0.82, 0.8], workReps: [8,6,8,8], intensity: 0.78, workDuration: [20, 35] },
  { actionName: '哑铃上斜卧推',   category: '推',    baseWeight: 32,  warmupRamp: [0.6, 0.8],         workSets: [0.82, 0.85, 0.8],    workReps: [10, 8, 10],    intensity: 0.72, workDuration: [18, 30] },
  { actionName: '负重双杠臂屈伸', category: '推',    baseWeight: 20,  warmupRamp: [0.4, 0.7],         workSets: [0.85, 0.9, 0.8],    workReps: [10, 8, 10],    intensity: 0.7,  workDuration: [22, 36] },
  { actionName: '引体向上',       category: '拉',    baseWeight: 20,  warmupRamp: [0.3, 0.6],         workSets: [0.85, 0.9, 0.85, 0.8], workReps: [8, 6, 8, 10], intensity: 0.74, workDuration: [24, 40] },
  { actionName: '杠铃划船',       category: '拉',    baseWeight: 50,  warmupRamp: [0.5, 0.75, 0.88],   workSets: [0.85, 0.9, 0.88, 0.85], workReps: [8, 6, 8, 10], intensity: 0.76, workDuration: [20, 34] },
  { actionName: '坐姿划船',       category: '拉',    baseWeight: 45,  warmupRamp: [0.6, 0.8],         workSets: [0.85, 0.9, 0.85, 0.8], workReps: [10, 8, 10, 12], intensity: 0.7,  workDuration: [18, 30] },
  { actionName: '面拉',           category: '拉',    baseWeight: 22,  warmupRamp: [0.6],              workSets: [0.85, 0.9, 0.95],   workReps: [15, 12, 12],    intensity: 0.55, workDuration: [16, 26] },
  { actionName: '杠铃深蹲',       category: '腿',    baseWeight: 80,  warmupRamp: [0.5, 0.7, 0.85],   workSets: [0.85, 0.9, 0.85, 0.82], workReps: [6, 5, 6, 8], intensity: 0.82,  workDuration: [26, 44] },
  { actionName: '罗马尼亚硬拉',   category: '腿',    baseWeight: 70,  warmupRamp: [0.6, 0.82],        workSets: [0.85, 0.9, 0.88, 0.85], workReps: [8, 6, 8, 10], intensity: 0.78, workDuration: [24, 40] },
  { actionName: '腿举',           category: '腿',    baseWeight: 140, warmupRamp: [0.5, 0.75],        workSets: [0.85, 0.92, 0.9, 0.85], workReps: [12, 10, 12, 15], intensity: 0.7, workDuration: [22, 36] },
  { actionName: '腿弯举',         category: '腿',    baseWeight: 32,  warmupRamp: [0.6],              workSets: [0.85, 0.9, 0.9],    workReps: [12, 10, 12],    intensity: 0.56, workDuration: [16, 28] },
  { actionName: '站姿提踵',       category: '腿',    baseWeight: 40,  warmupRamp: [0.5],              workSets: [0.8, 0.88, 0.92, 0.9], workReps: [15, 12, 12, 15], intensity: 0.48, workDuration: [14, 24] },
  { actionName: '实力举',         category: '推',    baseWeight: 30,  warmupRamp: [0.5, 0.7, 0.88],   workSets: [0.85, 0.9, 0.88, 0.85], workReps: [6, 5, 6, 8], intensity: 0.78,  workDuration: [24, 38] },
  { actionName: '侧平举',         category: '推',    baseWeight: 8,   warmupRamp: [0.6],              workSets: [0.85, 0.9, 0.9],    workReps: [15, 12, 15],    intensity: 0.42, workDuration: [14, 22] },
  { actionName: '硬拉',           category: '拉',    baseWeight: 90,  warmupRamp: [0.5, 0.7, 0.88],   workSets: [0.9, 0.95, 0.93, 0.9], workReps: [5, 3, 5, 5],  intensity: 0.86,  workDuration: [28, 46] },
]

function seedRand(seed) {
  // Mulberry32 确定性 PRNG（同一 seed 同一段训练可复现）
  let a = seed >>> 0
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pick(arr, rand = Math.random) {
  return arr[Math.floor(rand() * arr.length)]
}

function randRange(min, max, rand = Math.random) {
  return min + (max - min) * rand()
}

function randInt(min, max, rand = Math.random) {
  return Math.round(randRange(min, max, rand))
}

/**
 * 生成一个 mock 训练会话（纯内存）。
 *
 * @param {Object} opts
 * @param {string}  opts.date              'today' 或 YYYY-MM-DD。默认 today。
 * @param {number}  opts.startHour         训练开始小时（0-23）。默认 19。
 * @param {number}  opts.startMinute       训练开始分钟（0-59）。默认 30。
 * @param {number}  opts.actionCount       要生成的动作数量。默认 4。
 * @param {string[]} opts.actionNames      可选，指定动作名（从 DEFAULT_ACTION_POOL 中匹配）。
 * @param {number[]} opts.setsPerAction    每个动作的正式组数（不含热身）。不传会根据模板默认值。
 * @param {number}  opts.restSec           组间歇（秒）。不传则用 90~150 的随机值。
 * @param {number}  opts.restingHR         静息心率。默认 62。
 * @param {number}  opts.maxHR             最大心率。默认 185（≈ 220 - 35 岁）。
 * @param {number}  opts.hrSampleIntervalMs HR 采样间隔毫秒。默认 1000（每秒 1 次，模拟 Polar H10 广播）。
 * @param {number}  opts.seed              随机种子。不传就用当前时间戳。
 */
export function generateMockSession(opts = {}) {
  const seed = typeof opts.seed === 'number' ? opts.seed : Math.floor(Math.random() * 0x7fffffff)
  const rand = seedRand(seed)

  const dateStr = (opts.date === 'today' || !opts.date)
    ? formatDate(new Date())
    : opts.date

  const startHour = typeof opts.startHour === 'number' ? opts.startHour : 19
  const startMinute = typeof opts.startMinute === 'number' ? opts.startMinute : 30
  const baseRestSec = opts.restSec ?? null
  const restingHR = opts.restingHR ?? 62
  const maxHR = opts.maxHR ?? 185
  const hrIntervalMs = opts.hrSampleIntervalMs ?? 1000

  // 选动作池
  let poolPick
  if (opts.actionNames && opts.actionNames.length) {
    poolPick = opts.actionNames
      .map(n => DEFAULT_ACTION_POOL.find(a => a.actionName === n))
      .filter(Boolean)
    if (!poolPick.length) poolPick = [DEFAULT_ACTION_POOL[0]]
  } else {
    const n = Math.max(1, Math.min(DEFAULT_ACTION_POOL.length, opts.actionCount ?? 4))
    const shuffled = [...DEFAULT_ACTION_POOL].sort(() => rand() - 0.5)
    // 保证一次训练里推/拉/腿尽量均衡
    const grouped = { 推: [], 拉: [], 腿: [] }
    for (const a of shuffled) (grouped[a.category] || grouped.推).push(a)
    const cats = Object.keys(grouped).filter(c => grouped[c].length)
    poolPick = []
    let i = 0
    while (poolPick.length < n) {
      const c = cats[i % cats.length]
      const arr = grouped[c]
      if (arr.length) poolPick.push(arr.shift())
      i++
    }
  }

  // 每组的元信息
  const plannedSets = [] // {actionName, weight, reps, timestamp, estDurationMs, restMs}
  let [y, mo, d] = dateStr.split('-').map(Number)
  const baseTs = new Date(y, mo - 1, d, startHour, startMinute, 0).getTime()
  let nowCursor = baseTs

  poolPick.forEach((act, ai) => {
    const workSetCount = opts.setsPerAction && opts.setsPerAction[ai]
      ? opts.setsPerAction[ai]
      : act.workSets.length

    // Warmup sets
    for (let wi = 0; wi < act.warmupRamp.length; wi++) {
      const ramp = act.warmupRamp[wi]
      const w = Math.round(act.baseWeight * ramp)
      const reps = Math.max(3, Math.round(12 - wi * 2))
      const dur = Math.round(randRange(12, 20, rand)) * 1000 // 热身做组 12-20s
      const rest = 45000 + Math.round(rand() * 30000) // 热身组间歇 45-75s
      plannedSets.push({
        actionName: act.actionName,
        category: act.category,
        isWarmup: true,
        intensity: ramp,
        weight: w,
        reps,
        setDurationMs: dur,
        restMs: rest,
        ts: nowCursor,
      })
      nowCursor += dur + rest
    }
    // Work sets
    for (let si = 0; si < workSetCount; si++) {
      const rampIdx = si % act.workSets.length
      const repsIdx = si % act.workReps.length
      const ramp = act.workSets[rampIdx]
      const targetReps = act.workReps[repsIdx]
      const reps = Math.max(1, targetReps + randInt(-1, 1, rand))
      const w = Math.round(act.baseWeight * ramp)
      const [dmin, dmax] = act.workDuration
      const dur = Math.round(randRange(dmin, dmax, rand)) * 1000
      const rest = baseRestSec != null
        ? baseRestSec * 1000
        : (60 + Math.round(randRange(act.intensity * 120, act.intensity * 220, rand))) * 1000 // 强度越高间歇越长
      plannedSets.push({
        actionName: act.actionName,
        category: act.category,
        isWarmup: false,
        intensity: act.intensity,
        weight: w,
        reps,
        setDurationMs: dur,
        restMs: rest,
        ts: nowCursor,
      })
      nowCursor += dur + rest
    }
    // 动作与动作之间多加 1 分钟整理时间
    nowCursor += 60000
  })

  // ===== 生成 HR 采样（模拟心率随训练变化的轨迹） =====
  // 模型：热身阶段线性爬升；做组期快速爬升 + 小波动；休息期指数衰减到 baseline（baseline 随训练推进逐渐抬升表示疲劳累积）。
  const totalMs = Math.max(0, (plannedSets[plannedSets.length - 1]?.ts ?? baseTs) - baseTs + 180_000) // 末尾加 3 分钟冷身
  const sessionEndTs = baseTs + totalMs
  const hrSamplesWithTs = []

  let currentHR = restingHR
  let fatigueBaseline = restingHR // 训练中越拖越长，休息回落的底会越来越高
  let lastSetEndTs = baseTs

  // 开场前 60s 静息采样 + 热身走动
  for (let t = baseTs - 60_000; t < baseTs; t += hrIntervalMs) {
    if (t < baseTs - 30_000) {
      currentHR += (restingHR - currentHR) * 0.2 + randRange(-1, 1, rand)
    } else {
      // 走动 + 轻微热身
      const target = restingHR + 10
      currentHR += (target - currentHR) * 0.1 + randRange(-1.5, 1.5, rand)
    }
    hrSamplesWithTs.push({ ts: t, hr: Math.round(currentHR) })
  }

  // 训练主体 HR 模拟
  for (const s of plannedSets) {
    // 从 lastSetEndTs 到 s.ts 这段是休息/间歇/动作间隙
    const restEnd = s.ts
    for (let t = lastSetEndTs; t < restEnd; t += hrIntervalMs) {
      const elapsed = (t - lastSetEndTs) / 1000
      // 指数衰减：目标 baseline = fatigueBaseline
      const targetHR = fatigueBaseline + 2
      const alpha = 1 - Math.exp(-elapsed / 25) // 25s 时间常数
      const expected = currentHR - (currentHR - targetHR) * alpha
      currentHR = expected + randRange(-1.5, 1.5, rand)
      hrSamplesWithTs.push({ ts: t, hr: Math.round(Math.max(restingHR, currentHR)) })
    }
    // 做组期 HR
    const durSec = s.setDurationMs / 1000
    const intensityFactor = s.isWarmup ? 0.6 + s.intensity * 0.3 : 0.72 + s.intensity * 0.4 // 越强爬越高
    const peakTarget = restingHR + (maxHR - restingHR) * intensityFactor
    for (let i = 0; i < durSec; i += hrIntervalMs / 1000) {
      // 做组期分两段：前 60% 爬升，后 40% 维持 + 尖峰
      const progress = Math.min(1, i / durSec)
      let target
      if (progress < 0.7) {
        target = currentHR + (peakTarget - currentHR) * (progress / 0.7) * 0.12
      } else {
        target = peakTarget + randRange(-3, 5, rand)
      }
      currentHR += (target - currentHR) * 0.25 + randRange(-2, 2, rand)
      hrSamplesWithTs.push({
        ts: Math.floor(s.ts + i * 1000),
        hr: Math.round(Math.max(restingHR, Math.min(maxHR + 3, currentHR))),
      })
    }
    lastSetEndTs = s.ts + s.setDurationMs
    // 每做完一个 work set，疲劳基线抬升一点
    if (!s.isWarmup) {
      fatigueBaseline = Math.min(restingHR + 25, fatigueBaseline + 1.2)
    }
  }
  // 冷身 3 分钟
  for (let t = lastSetEndTs; t < sessionEndTs; t += hrIntervalMs) {
    const elapsed = (t - lastSetEndTs) / 1000
    const targetHR = restingHR + 5
    const alpha = 1 - Math.exp(-elapsed / 40)
    currentHR += ((targetHR - currentHR) * alpha) * 0.3 + randRange(-1, 1, rand)
    hrSamplesWithTs.push({ ts: t, hr: Math.round(Math.max(restingHR, currentHR)) })
  }

  // ===== entries 对象结构（TrainingAnalysisCard 接受的 entriesFlatRestore）=====
  // 同时也输出给 analyzeTrainingSession 用的扁平数组
  const entriesObj = {}
  const analysisInputEntries = []
  for (const s of plannedSets) {
    // Card 期望的 entries: { actionName: [ { stages, reps, weight, timestamp, bwMode, isPlaceholder }, ... ] }
    const entry = {
      isPlaceholder: false,
      bwMode: null,
      timestamp: s.ts,
      weight: s.weight,
      reps: s.reps,
      stages: [{ reps: s.reps, weight: s.weight, total: s.weight * s.reps }],
      _meta: { isWarmup: s.isWarmup, category: s.category, intensity: s.intensity, seed },
    }
    if (!entriesObj[s.actionName]) entriesObj[s.actionName] = []
    entriesObj[s.actionName].push(entry)

    // analyzer 期望的扁平 entries 数组，直接读取 entry.weight/reps/timestamp/actionName
    analysisInputEntries.push({
      actionName: s.actionName,
      weight: s.weight,
      reps: s.reps,
      timestamp: s.ts,
    })
  }

  return {
    seed,
    date: dateStr,
    restingHR,
    maxHR,
    plannedSets,
    sessionStartTs: baseTs,
    sessionEndTs,
    hrSamplesWithTs,
    entries: entriesObj,
    /**
     * 给 analyzeTrainingSession() 直接喂的 entries 扁平数组。
     * restDurationSecByAction: 返回对应动作的预估间歇（取 work sets 的平均 rest）。
     */
    analysisInput: {
      entries: analysisInputEntries,
      restDurationSecByAction: (actionName) => {
        const actionSets = plannedSets.filter(s => s.actionName === actionName && !s.isWarmup)
        if (!actionSets.length) return 90
        const avgRest = actionSets.reduce((a, b) => a + b.restMs, 0) / actionSets.length
        return Math.round(avgRest / 1000)
      },
    },
  }
}

/* ====== uni-app 环境下直接写入 Pinia store（dayDataCache）====== */

const DAYDATA_PREFIX = 'fitness_daydata_'
const INDEX_KEY = 'fitness_index'

function mergeIntoDayData(existing, mock) {
  const merged = { ...(existing || {}) }
  // hrSamplesWithTs: 若同一天已存在真数据，则只在未被占用的时间戳上追加（真数据优先）
  if (mock.hrSamplesWithTs && mock.hrSamplesWithTs.length) {
    if (!Array.isArray(merged.hrSamplesWithTs)) merged.hrSamplesWithTs = []
    const existTs = new Set(merged.hrSamplesWithTs.map(x => Number(x.ts)))
    for (const s of mock.hrSamplesWithTs) {
      if (!existTs.has(Number(s.ts))) merged.hrSamplesWithTs.push(s)
    }
    merged.hrSamplesWithTs.sort((a, b) => Number(a.ts) - Number(b.ts))
  }
  // entries 合并：同名动作直接替换为 mock 的内容（避免真/假 entries 混在一起 timestamp 乱序导致窗口异常）
  if (mock.entries && Object.keys(mock.entries).length) {
    merged.entries = merged.entries ? { ...merged.entries } : {}
    for (const [name, list] of Object.entries(mock.entries)) {
      merged.entries[name] = list
    }
  }
  // templates 中同名动作挂载的陈旧 entries 也要清（loadDay 会读 templates.entries[actionName] 作为 fallback）
  // 策略：如果模板中 该动作 totalWeight <= 0（仅保存模板骨架），则保留；否则清掉该动作的历史 entries，
  //       保证 merged.entries 是唯一生效的训练来源，避免 timestamp 冲突。
  if (merged.templates && typeof merged.templates === 'object') {
    const mockActions = Object.keys(mock.entries || {})
    for (const [tplName, tpl] of Object.entries(merged.templates)) {
      if (!tpl || typeof tpl !== 'object') continue
      if (tpl.entries && typeof tpl.entries === 'object') {
        for (const an of mockActions) {
          if (tpl.entries[an]) delete tpl.entries[an]
        }
      }
    }
  }
  // trainingAnalysis 清掉（重新打开页面会自动重新计算）
  delete merged.trainingAnalysis
  // 打上 mock 标记，方便清除
  merged.__mockTraining = true
  return merged
}

function tryUni(fnName, args) {
  if (typeof uni !== 'undefined' && typeof uni[fnName] === 'function') {
    try { return uni[fnName].apply(uni, args) } catch (e) { return undefined }
  }
  return undefined
}

/**
 * 获取 DayDataCache Pinia store 的实例（兼容"第一次 import 的懒加载"场景，避免循环引用）。
 */
async function getCacheStore() {
  try {
    const mod = await import('@/stores/dayDataCache.js')
    if (mod && typeof mod.useDayDataCacheStore === 'function') {
      return mod.useDayDataCacheStore()
    }
  } catch (e) { /* ignore */ }
  return null
}

/**
 * 把 generateMockSession 生成的数据写入 dayDataCache（Pinia store）。
 *
 * ✅ 走 store.saveDayData：
 *      1) 内存 cache Map 和 storage 同步更新，不会出现"写了 storage 但内存缓存还是旧值 → 页面显示空"的问题；
 *      2) checkHasActivity 会自动把日期加入/移出 fitness_index；
 *      3) sortedDates、monthCache、weekStatsCache 自动失效。
 *
 * 写入完成后会调用 analyzeTrainingSession 生成 trainingAnalysis 缓存，并再次写入，
 * 这样训练分析页一打开就能看到 finalized 的分析结果。
 */
export async function injectMockSession(opts = {}) {
  const mock = generateMockSession(opts)

  const store = await getCacheStore()
  const existing = store
    ? (store.getDayData(mock.date) || {})
    : ((typeof uni !== 'undefined' && uni.getStorageSync) ? (uni.getStorageSync(DAYDATA_PREFIX + mock.date) || {}) : {})
  const merged = mergeIntoDayData(existing, mock)

  // 第一次 write：先写入 entries & HR 采样，确保分析函数如果 fallback 读 storage 也是对的
  if (store) {
    store.saveDayData(mock.date, merged)
  } else {
    tryUni('setStorageSync', [DAYDATA_PREFIX + mock.date, merged])
    try {
      const rawIndex = tryUni('getStorageSync', [INDEX_KEY]) || {}
      const dates = Array.isArray(rawIndex.dates) ? rawIndex.dates.slice() : []
      if (!dates.includes(mock.date)) dates.push(mock.date)
      dates.sort()
      tryUni('setStorageSync', [INDEX_KEY, { dates, updatedAt: Date.now() }])
    } catch (e) { /* ignore */ }
  }

  // 生成训练分析结果
  let analysis = null
  try {
    const mod = await import('@/utils/strengthTrainingAnalyzer.js')
    if (mod && mod.analyzeTrainingSession) {
      const profile = opts.profile || { age: 28, restingHR: mock.restingHR, weightKg: 70, heightCm: 175 }
      analysis = mod.analyzeTrainingSession({
        entries: mock.analysisInput.entries,
        hrSamplesWithTs: mock.hrSamplesWithTs,
        restDurationSecByAction: mock.analysisInput.restDurationSecByAction,
        profile,
      })
      analysis.status = 'finalized'
      analysis.sessionEndTs = mock.sessionEndTs
      merged.trainingAnalysis = analysis
    }
  } catch (e) {
    console.warn('[mockTrainingData] 自动预生成分析失败，页面打开时会自动重算：', e && e.message || e)
  }

  // 第二次 write：带上预生成的 trainingAnalysis。store.saveDayData 会再跑一遍 checkHasActivity
  if (store) {
    store.saveDayData(mock.date, merged)
    // 清掉跟这个日期相关的聚合缓存（保险起见清整月）
    try {
      const [yy, mm] = mock.date.split('-').map(Number)
      store.clearMonthCache(yy, mm)
      store.clearRelatedWeekStatsCache(mock.date)
    } catch (e) { /* ignore */ }
  } else {
    tryUni('setStorageSync', [DAYDATA_PREFIX + mock.date, merged])
  }

  return {
    seed: mock.seed,
    date: mock.date,
    sampleCount: mock.hrSamplesWithTs.length,
    setCount: mock.plannedSets.length,
    actionCount: Object.keys(mock.entries).length,
    sessionMinutes: Math.round((mock.sessionEndTs - mock.sessionStartTs) / 60000),
    totalVolumeLoad: analysis ? analysis.session.totalVolumeLoad : null,
    analysis,
    dayData: merged,
  }
}

/**
 * 一次性注入多段历史训练（用来测 HR Profile 长期数据）。
 * days = 14 则连续 14 天每天一段；weekdaysOnly=true 仅在工作日注入。
 */
export async function injectMockHistory({ days = 14, weekdaysOnly = true, endDate = 'today', actionsPerDay = 4, ...rest } = {}) {
  const baseDate = endDate === 'today' ? new Date() : (() => {
    const [y,m,d] = endDate.split('-').map(Number); return new Date(y, m-1, d)
  })()
  const results = []
  let injected = 0
  const cursor = new Date(baseDate.getTime())
  const store = await getCacheStore()
  while (injected < days) {
    const wd = cursor.getDay() // 0=Sunday
    if (!weekdaysOnly || (wd >= 1 && wd <= 5)) {
      const ds = formatDate(cursor)
      const r = await injectMockSession({
        ...rest,
        date: ds,
        actionCount: actionsPerDay,
        startHour: 18 + (injected % 2),
        startMinute: [15, 30, 45][injected % 3],
      })
      results.push(r)
      injected++
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  // 全部注入完，再强制刷新一下 store 的 index（如果存在），让首页月历上立刻看到 14 天都标了数据
  if (store) {
    try { store.loadIndex(true) } catch (e) { /* ignore */ }
  }
  return results
}

/**
 * 清除某天由 injectMockSession 写入的 mock 数据（只清除打过 __mockTraining=true 标记的 dayData 字段）。
 */
export async function clearMockSession({ date }) {
  if (!date) return false
  const store = await getCacheStore()
  try {
    const data = store
      ? (store.getDayData(date) || {})
      : ((typeof uni !== 'undefined' && uni.getStorageSync) ? (uni.getStorageSync(DAYDATA_PREFIX + date) || {}) : {})
    if (!data.__mockTraining) {
      // 没有 mock 标记：什么都不做，避免误删真数据
      return false
    }
    // 清掉 mock 注入的字段 + 陈旧 templates 下的同名 action entries 还原标记（留 templates.actionWeights 不动）
    delete data.hrSamplesWithTs
    delete data.entries
    delete data.trainingAnalysis
    delete data.__mockTraining
    if (data.templates && typeof data.templates === 'object') {
      // no-op: 对真实 templates 不做改动（用户手动选的动作模板本身应该保留）
    }

    const remains = Object.keys(data).filter(k => !['cacheVersion', '_meta', '__mockTraining'].includes(k))
    if (remains.length === 0) {
      if (store) {
        // 整天空了：把日期从 index 中移除 = saveDayData 写入空对象，store 会自动维护 index
        store.saveDayData(date, {})
      } else {
        tryUni('removeStorageSync', [DAYDATA_PREFIX + date])
        try {
          const rawIndex = tryUni('getStorageSync', [INDEX_KEY]) || {}
          const dates = (Array.isArray(rawIndex.dates) ? rawIndex.dates : []).filter(d => d !== date)
          tryUni('setStorageSync', [INDEX_KEY, { dates, updatedAt: Date.now() }])
        } catch (e) { /* ignore */ }
      }
    } else {
      if (store) store.saveDayData(date, data)
      else tryUni('setStorageSync', [DAYDATA_PREFIX + date], data)
    }
    if (store) {
      try {
        const [yy, mm] = date.split('-').map(Number)
        store.clearMonthCache(yy, mm)
        store.clearRelatedWeekStatsCache(date)
        store.loadIndex(true)
      } catch (e) { /* ignore */ }
    }
    return true
  } catch (e) {
    console.error('[mockTrainingData] clearMockSession 失败:', e)
    return false
  }
}

export default { generateMockSession, injectMockSession, injectMockHistory, clearMockSession }

