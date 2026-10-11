const CONFIG_KEY = 'training_stat_config'

// 配置版本：2 = 固定基线按周（7 天）口径；无此标记的旧配置视为两周口径，读取时自动 ÷2 迁移
const CONFIG_VERSION = 2

// 徽章判定窗口固定 14 天，静态判定把窗口总量折算为周均值（×7/14）与周区间同口径
const STATIC_WINDOW_DAYS = 14

const MIN_TRAINING_DAYS = 1

// 自适应基线：历史窗口（近 8 周）至少 2 个训练日才有均值意义，否则回退静态区间
const MIN_ADAPTIVE_DAYS = 2

// 固定基线：每周（7 天）训练量语义（原两周值 ÷2，与自适应基线观感更接近）
const FIXED_RANGES = {
  chest: { low: 10, high: 20 },
  back: { low: 12, high: 32 },
  legs: { low: 10, high: 24 },
  glutes: { low: 8, high: 24 },
  front_delt: { low: 0, high: 6 },
  side_delt: { low: 8, high: 20 },
  rear_delt: { low: 6, high: 14 },
  biceps: { low: 6, high: 18 },
  triceps: { low: 6, high: 18 },
}

const VALID_BODY_PARTS = Object.keys(FIXED_RANGES)

function cloneDefaultConfig() {
  const customRanges = {}
  for (const [id, r] of Object.entries(FIXED_RANGES)) {
    customRanges[id] = { low: r.low, high: r.high }
  }
  return { adaptive: false, customRanges }
}

const DEFAULT_CONFIG = cloneDefaultConfig()

/**
 * 配置读写（用户显式设置，不随训练数据隐式变化）。
 * 判定不依赖任何"自动写入的派生状态"，同一份数据 + 相同配置在任意设备结果一致。
 */
function loadConfig() {
  try {
    const raw = uni.getStorageSync(CONFIG_KEY)
    if (raw) {
      return normalizeConfig(typeof raw === 'string' ? JSON.parse(raw) : raw)
    }
  } catch (e) { }
  return cloneDefaultConfig()
}

function saveConfig(config) {
  uni.setStorageSync(CONFIG_KEY, JSON.stringify({ ...config, version: CONFIG_VERSION }))
}

function normalizeConfig(raw) {
  const config = cloneDefaultConfig()
  if (!raw || typeof raw !== 'object') return config

  config.adaptive = !!raw.adaptive
  // 旧配置（无 version 标记）为两周口径 → ÷2 迁移为周口径
  const legacy = raw.version !== CONFIG_VERSION
  if (raw.customRanges && typeof raw.customRanges === 'object') {
    for (const id of Object.keys(FIXED_RANGES)) {
      const userRange = raw.customRanges[id]
      if (!userRange || typeof userRange !== 'object') continue
      let low = Number(userRange.low)
      let high = Number(userRange.high)
      if (legacy) {
        low = low / 2
        high = high / 2
      }
      if (Number.isFinite(low) && low >= 0) config.customRanges[id].low = Math.round(low)
      if (Number.isFinite(high) && high >= 0) config.customRanges[id].high = Math.round(high)
      // low > high 时交换，保证区间有效
      if (config.customRanges[id].low > config.customRanges[id].high) {
        const t = config.customRanges[id].low
        config.customRanges[id].low = config.customRanges[id].high
        config.customRanges[id].high = t
      }
    }
  }
  return config
}

/**
 * 静态区间：用户手填的自定义值优先，未改过则用写死的 FIXED_RANGES。
 */
function getStaticRange(bodyPartId, config) {
  const custom = config && config.customRanges && config.customRanges[bodyPartId]
  if (custom && typeof custom.low === 'number' && typeof custom.high === 'number') {
    return { low: custom.low, high: custom.high }
  }
  return FIXED_RANGES[bodyPartId] || null
}

/**
 * 自适应区间：历史窗口（近 8 周，不含当前判定窗口）该部位"每训练日均值" ±30%。
 * baselineInfo 形如 { sets, days }（来自 computeAdaptiveBaselineByBodyPart）。
 * 数据不足（训练日 < MIN_ADAPTIVE_DAYS）返回 null，由调用方回退静态区间。
 */
function computeAdaptiveRange(bodyPartId, baselineInfo) {
  if (!baselineInfo || typeof baselineInfo.sets !== 'number' || typeof baselineInfo.days !== 'number') {
    return null
  }
  if (baselineInfo.days < MIN_ADAPTIVE_DAYS) return null
  const baseline = baselineInfo.sets / baselineInfo.days
  return {
    low: baseline * 0.7,
    high: baseline * 1.3,
  }
}

/**
 * 纯函数判定：根据滑动窗口聚合 + 用户配置 + 自适应基线窗口现算结果，判断偏高/偏低。
 * 不读写任何持久化派生状态，结果仅依赖传入数据（跨设备可复现）。
 * windowInfo 形如 { sets, days }（当前 14 天窗口，来自 computeWindowTotalsByBodyPart）；
 * baselineInfo 形如 { sets, days }（近 8 周基线窗口，来自 computeAdaptiveBaselineByBodyPart，仅自适应时需要）。
 * 优先级：自适应开启且数据充足 → 自适应区间（每训练日均值口径）；否则 → 静态区间（自定义优先，默认写死）。
 */
function judgeRange(totalSets, range) {
  if (totalSets < range.low) return 'low'
  if (totalSets > range.high) return 'high'
  return 'normal'
}

function getStatusFromConfig(bodyPartId, windowInfo, config, baselineInfo) {
  if (!VALID_BODY_PARTS.includes(bodyPartId)) return null

  const sets = windowInfo && typeof windowInfo.sets === 'number' ? windowInfo.sets : 0
  const days = windowInfo && typeof windowInfo.days === 'number' ? windowInfo.days : 0

  // 训练日门槛：窗口内该部位至少训练过 MIN_TRAINING_DAYS 天才判定
  if (days < MIN_TRAINING_DAYS) return null

  if (config && config.adaptive) {
    const adaptiveRange = computeAdaptiveRange(bodyPartId, baselineInfo)
    if (adaptiveRange) {
      // 自适应口径：每训练日均值 vs 历史基线均值 ±30%
      return judgeRange(sets / days, adaptiveRange)
    }
    // 历史数据不足 → 回退静态区间
  }

  const staticRange = getStaticRange(bodyPartId, config)
  if (!staticRange) return null
  // 固定基线按周口径：把 STATIC_WINDOW_DAYS 窗口总量折算为周均值再比较（与基线同口径，换算前后判定结果等价）
  return judgeRange(sets * 7 / STATIC_WINDOW_DAYS, staticRange)
}

export {
  CONFIG_KEY,
  CONFIG_VERSION,
  STATIC_WINDOW_DAYS,
  MIN_TRAINING_DAYS,
  MIN_ADAPTIVE_DAYS,
  FIXED_RANGES,
  VALID_BODY_PARTS,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  getStaticRange,
  computeAdaptiveRange,
  getStatusFromConfig,
  judgeRange,
}
