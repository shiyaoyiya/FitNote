/**
 * Bug1 修复验证：云端恢复（applyBackupToLocal）后 day 页「对比上次」能否查到导入的历史
 * 关键点：store 的内存索引在应用启动时已加载（indexLoaded=true），
 * 恢复备份后若不重建索引，sortedDates 仍是旧的 → 查不到备份中的历史日期
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

// ---------- mock uni ----------
const storage = new Map()
globalThis.uni = {
  getStorageSync: (k) => (storage.has(k) ? storage.get(k) : ''),
  setStorageSync: (k, v) => storage.set(k, v),
  removeStorageSync: (k) => storage.delete(k),
  getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
  $emit() {}, $on() {}, $off() {},
}

const DAYDATA_PREFIX = 'fitness_daydata_'
const INDEX_KEY = 'fitness_index'
const TEMPLATE_KEY = 'fitness_templates'
const ACTION_KEY = 'fitness_actions'

// ---------- dayDataCache store（与 stores/dayDataCache.js 一致） ----------
function createStore() {
  return {
    cache: new Map(),
    dateIndex: new Set(),
    sortedDates: [],
    indexLoaded: false,
    getDayData(dateStr) {
      if (this.cache.has(dateStr)) return this.cache.get(dateStr)
      const d = uni.getStorageSync(DAYDATA_PREFIX + dateStr)
      this.cache.set(dateStr, d || {})
      return d || {}
    },
    batchGetLatestRecords(actNames, todayDateStr) {
      const results = {}
      const remaining = new Set(actNames)
      for (const dateStr of this.sortedDates) {
        if (dateStr === todayDateStr) continue
        if (remaining.size === 0) break
        let data
        if (this.cache.has(dateStr)) data = this.cache.get(dateStr)
        else { try { data = uni.getStorageSync(DAYDATA_PREFIX + dateStr) } catch (e) { continue } }
        if (!data || !data.entries) continue
        for (const actName of remaining) {
          if (data.entries[actName] && data.entries[actName].length > 0) {
            const entries = data.entries[actName]
            const computedTotal = entries.reduce((sum, e) => sum + (e.total || 0), 0)
            if (computedTotal <= 0) continue
            results[actName] = {
              date: dateStr,
              total: data.actions?.[actName] != null ? data.actions[actName] : Math.round(computedTotal * 100) / 100,
              entry: entries,
            }
            remaining.delete(actName)
          }
        }
      }
      return results
    },
    saveDayData(dateStr, dayData) {
      this.cache.set(dateStr, dayData)
      uni.setStorageSync(DAYDATA_PREFIX + dateStr, dayData)
      const has = this.checkHasActivity(dayData)
      if (has) { this.dateIndex.add(dateStr); this.saveIndex() }
      else if (this.dateIndex.has(dateStr)) { this.dateIndex.delete(dateStr); this.saveIndex() }
      this.sortedDates = Array.from(this.dateIndex).sort((a, b) => b.localeCompare(a))
    },
    checkHasActivity(dayData) {
      if (!dayData || typeof dayData !== 'object') return false
      if (dayData.isRestDay) return false
      if (dayData.templates && typeof dayData.templates === 'object') {
        for (const n of Object.keys(dayData.templates)) {
          const tpl = dayData.templates[n]
          if (tpl && typeof tpl === 'object' && Object.keys(tpl).length > 0) {
            if (tpl.actionWeights && typeof tpl.actionWeights === 'object') {
              for (const a of Object.keys(tpl.actionWeights)) if (tpl.actionWeights[a] > 0) return true
            }
            if (tpl.totalWeight && tpl.totalWeight > 0) return true
          }
        }
      }
      return false
    },
    buildIndex() {
      const info = uni.getStorageInfoSync()
      const dates = []
      info.keys.forEach((k) => { if (k.startsWith(DAYDATA_PREFIX)) { const s = k.slice(DAYDATA_PREFIX.length); if (s) dates.push(s) } })
      this.setIndex(dates)
      this.saveIndex()
      return dates
    },
    setIndex(dates) {
      this.dateIndex = new Set(dates)
      this.sortedDates = dates.slice().sort((a, b) => b.localeCompare(a))
      this.indexLoaded = true
    },
    saveIndex() { uni.setStorageSync(INDEX_KEY, { version: 1, dates: Array.from(this.dateIndex), updatedAt: Date.now() }) },
    loadIndex() {
      if (this.indexLoaded) return
      const data = uni.getStorageSync(INDEX_KEY)
      if (data && data.dates && Array.isArray(data.dates)) this.setIndex(data.dates)
      else this.buildIndex()
    },
    clearCache() { this.cache.clear() },
  }
}

function formatDateStr(date) {
  if (typeof date === 'string') date = new Date(date.replace(/\./g, '/').replace(/-/g, '/'))
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function isPlaceholderEntry(e) { return e && e.isPlaceholder === true }
function createPlaceholderEntry() { return { isPlaceholder: true, type: 'normal', input: '', total: 0, stages: [] } }
function getTotalWeight(entries) { return Math.round((entries || []).reduce((s, i) => s + (i.total || 0), 0) * 100) / 100 }
function createStage(reps, weight) {
  const r = Number(reps), w = weight ? Number(weight) : 0
  return { reps: r, weight: w, total: w > 0 ? Math.round(r * w * 100) / 100 : r }
}
function buildEntry(type, stages) {
  const built = stages.filter(s => s.reps && Number(s.reps) > 0).map(s => createStage(s.reps, s.weight))
  if (!built.length) return null
  const total = built.reduce((s, x) => s + x.total, 0)
  return { input: built.map(s => (s.weight > 0 ? `${s.reps}×${s.weight}` : `${s.reps}`)).join('+'), total, type: type || 'normal', stages: built }
}
function normalizeEntry(entry) {
  if (!entry) return null
  if (entry.isPlaceholder) return entry
  if (entry.stages && entry.stages.length > 0) return entry
  const parts = (entry.input || '').split('+')
  return { input: entry.input, total: entry.total, type: 'normal', stages: parts.map(p => { const [r, w] = p.split('×'); return createStage(Number(r), w ? Number(w) : 0) }) }
}
function normalizeEntries(entries) { return Array.isArray(entries) ? entries.map(e => normalizeEntry(e)).filter(Boolean) : [] }

// ---------- 加载备份 ----------
const backupFile = join(projectRoot, 'data', 'backups', '5', '202609', '15fb128958de439d888f58ce566a9cd6.json')
const raw = JSON.parse(readFileSync(backupFile, 'utf8'))
const payload = raw.data || raw
const tplArr = (payload.fitness_templates || []).filter(t => !t.isAerobic)
const daydata = payload.fitness_daydata || {}
const TODAY = '2026-09-21'

// ---------- 场景：应用启动时已加载索引（旧数据），然后云端恢复 ----------
function run(withIndexRebuild) {
  storage.clear()
  // 1. 应用启动：本地已有一些旧数据（不含备份中的历史），loadIndex 建立内存索引
  uni.setStorageSync(TEMPLATE_KEY, tplArr)
  uni.setStorageSync(ACTION_KEY, payload.fitness_actions || [])
  uni.setStorageSync(DAYDATA_PREFIX + '2026-09-01', { templates: {}, actions: {}, entries: {} }) // 旧数据日期
  const store = createStore()
  store.loadIndex()
  console.log('  启动时索引天数:', store.sortedDates.length, '(旧数据)')

  // 2. 云端恢复（applyBackupToLocal overwrite）：清空 + 写入备份数据
  const clearAllData = () => {
    const info = uni.getStorageInfoSync()
    info.keys.forEach((k) => {
      if (k === TEMPLATE_KEY || k === ACTION_KEY || k.startsWith(DAYDATA_PREFIX) || k === 'annivs' || k === INDEX_KEY) uni.removeStorageSync(k)
    })
  }
  clearAllData()
  uni.setStorageSync(TEMPLATE_KEY, tplArr)
  uni.setStorageSync(ACTION_KEY, payload.fitness_actions || [])
  Object.keys(daydata).forEach((date) => uni.setStorageSync(DAYDATA_PREFIX + date, daydata[date] || {}))
  // applyBackupToLocal 修复前不重建索引；修复后重建
  if (withIndexRebuild) {
    store.buildIndex()
    store.clearCache()
  }

  // 3. 用户进入 day 页面（此时 store.indexLoaded=true，loadIndex 直接返回，不再重新扫描）
  store.loadIndex()
  console.log('  恢复后（loadIndex 早退）内存索引天数:', store.sortedDates.length,
    withIndexRebuild ? '（已重建 ✓）' : '（未重建 ✗ 仍为旧索引）')

  // 4. day 页面加载并计算「对比上次」
  const rawToday = store.getDayData(TODAY)
  const dayData = { templates: rawToday.templates || {}, actions: rawToday.actions || {}, entries: rawToday.entries || {} }
  let tplName = Object.keys(dayData.templates).pop()
  let chosenActions = []
  if (tplName) {
    chosenActions = dayData.templates[tplName].actionOrder || []
  } else {
    tplName = tplArr[0].name
    chosenActions = tplArr[0].actions || []
  }
  let actionEntries = chosenActions.map((name) => {
    const arr = dayData.entries[name]
    if (Array.isArray(arr) && arr.length > 0) return normalizeEntries(arr)
    const placeholders = []
    for (let i = 0; i < 4; i++) placeholders.push(createPlaceholderEntry())
    dayData.entries[name] = placeholders
    dayData.actions[name] = 0
    return placeholders
  })
  store.saveDayData(TODAY, dayData)

  const todayDateStr = formatDateStr(new Date(TODAY))
  const records = store.batchGetLatestRecords(chosenActions, todayDateStr)
  const missing = chosenActions.filter((a) => !records[a])
  console.log('  「对比上次」查找结果:', missing.length === 0
    ? `全部 ${chosenActions.length} 个动作均找到历史 ✓`
    : `有 ${missing.length} 个动作未找到历史 ✗（前3个: ${missing.slice(0, 3).join('、')}）`)

  // 5. 用户为第一个动作新建记录后再查
  if (missing.length > 0) {
    const actName = missing[0]
    const idx = chosenActions.indexOf(actName)
    const entry = buildEntry('normal', [{ reps: 10, weight: 40 }])
    const cur = actionEntries[idx] || []
    const pi = cur.findIndex((e) => isPlaceholderEntry(e))
    if (pi !== -1) cur[pi] = entry
    else actionEntries[idx] = [...cur, entry]
    const r2 = store.getDayData(todayDateStr)
    const d2 = { templates: r2.templates || {}, actions: r2.actions || {}, entries: r2.entries || {} }
    d2.entries[actName] = actionEntries[idx] || []
    d2.actions[actName] = getTotalWeight(actionEntries[idx])
    store.saveDayData(todayDateStr, d2)
    const rec = store.batchGetLatestRecords([actName], todayDateStr)
    console.log(`  新建记录后 "${actName}" 查找:`, rec[actName] ? `找到 ${rec[actName].date} ✓` : '未找到 ✗（与用户反馈一致）')
  } else {
    const actName = chosenActions[0]
    const rec = store.batchGetLatestRecords([actName], todayDateStr)
    console.log(`  新建记录后 "${actName}" 查找:`, rec[actName] ? `找到 ${rec[actName].date} ✓` : '未找到 ✗')
  }
  console.log('')
}

console.log('===== 修复前（applyBackupToLocal 不重建索引）=====')
run(false)
console.log('===== 修复后（applyBackupToLocal 重建索引+清缓存）=====')
run(true)
