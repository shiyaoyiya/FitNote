/**
 * 回归测试：备份导入（本地/云端/文本）后，day 页「对比上次」应能查到导入的历史，
 * 不得误显「无历史记录」。
 *
 * 覆盖三类真实漏洞：
 * 1) 导入后索引重建被静默吞掉（store 内存索引停留在导入前的旧状态，indexLoaded=true，
 *    day 页 loadIndex 早退 → sortedDates 为空 → 查不到历史）
 * 2) 文本导入逐日 saveDayData 按 checkHasActivity 过滤，漏掉「有 entries 但无 templates
 *    结构」的旧版本日期 → 部分历史日期未入索引
 * 3) 真正无历史时不得触发无谓的自愈重试（行为保持正确）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDayDataCacheStore } from '../stores/dayDataCache.js'

const DAYDATA_PREFIX = 'fitness_daydata_'
const INDEX_KEY = 'fitness_index'
const TEMPLATE_KEY = 'fitness_templates'
const ACTION_KEY = 'fitness_actions'

// ---------- 内存 uni mock ----------
const storage = new Map()
const mockUni = {
  getStorageSync: (k) => (storage.has(k) ? storage.get(k) : ''),
  setStorageSync: (k, v) => storage.set(k, v),
  removeStorageSync: (k) => storage.delete(k),
  getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
  $emit() {}, $on() {}, $off() {},
}

function makeDay(date, actionEntries) {
  // 构造正常 daydata（含 templates/actionWeights，checkHasActivity=true）
  const entries = {}
  const actions = {}
  const actionWeights = {}
  Object.entries(actionEntries).forEach(([act, sets]) => {
    const total = sets.reduce((s, x) => s + x.total, 0)
    entries[act] = sets
    actions[act] = total
    actionWeights[act] = total
  })
  const totalWeight = Object.values(actionWeights).reduce((a, b) => a + b, 0)
  return {
    templates: {
      [date + '-tpl']: {
        actionOrder: Object.keys(entries),
        actionWeights,
        totalWeight,
      },
    },
    actions,
    entries,
  }
}

function makeLegacyDay(act, sets) {
  // 旧版本数据：只有 entries，无 templates/actions（checkHasActivity=false）
  return { entries: { [act]: sets } }
}

const setEntry = (reps, weight) => ({ isPlaceholder: false, type: 'normal', input: `${reps}×${weight}`, total: reps * weight, stages: [{ reps, weight, total: reps * weight }] })

describe('day 页「对比上次」历史查询', () => {
  beforeEach(() => {
    storage.clear()
    globalThis.uni = mockUni
    setActivePinia(createPinia())
  })

  it('新设备：应用启动加载空索引后，本地/云端导入（重建索引）→ 能查到导入的历史', () => {
    const store = useDayDataCacheStore()
    // 新设备首次启动：loadIndex → 无索引 → 空索引，indexLoaded=true
    store.loadIndex()
    expect(store.sortedDates.length).toBe(0)

    // 导入备份（overwrite）：清空 + 写入 + buildIndex + clearCache
    uni.setStorageSync(TEMPLATE_KEY, [])
    uni.setStorageSync(ACTION_KEY, [])
    uni.setStorageSync(DAYDATA_PREFIX + '2026-09-10', makeDay('2026-09-10', { 卧推: [setEntry(10, 50)] }))
    uni.setStorageSync(DAYDATA_PREFIX + '2026-09-15', makeDay('2026-09-15', { 卧推: [setEntry(10, 60)] }))
    store.buildIndex()
    store.clearCache()

    // 进入 day 页：loadIndex 早退（indexLoaded=true），用内存索引查询
    store.loadIndex()
    const records = store.batchGetLatestRecords(['卧推'], '2026-09-21')
    expect(records['卧推']).toBeTruthy()
    expect(records['卧推'].total).toBe(600) // 60×10，最近一次 2026-09-15
    expect(records['卧推'].date).toBe('2026-09-15')
  })

  it('导入后索引重建被静默吞掉（sortedDates 仍为空）→ 自愈重建并查到历史', () => {
    const store = useDayDataCacheStore()
    // 应用启动时加载了空索引
    store.loadIndex()
    expect(store.sortedDates.length).toBe(0)

    // 导入写入数据，但 buildIndex 在 try/catch 中静默失败 → 内存索引未更新
    uni.setStorageSync(TEMPLATE_KEY, [])
    uni.setStorageSync(ACTION_KEY, [])
    uni.setStorageSync(DAYDATA_PREFIX + '2026-09-10', makeDay('2026-09-10', { 深蹲: [setEntry(8, 80)] }))
    uni.setStorageSync(DAYDATA_PREFIX + '2026-09-12', makeDay('2026-09-12', { 深蹲: [setEntry(8, 90)] }))
    // 注意：不调用 buildIndex（模拟失败），store.sortedDates 仍为 []
    expect(store.sortedDates.length).toBe(0)

    // 进入 day 页查询：索引与 storage 键数不一致 → 应自愈重建并找到历史
    const records = store.batchGetLatestRecords(['深蹲'], '2026-09-21')
    expect(records['深蹲']).toBeTruthy()
    expect(records['深蹲'].date).toBe('2026-09-12')
    expect(store.sortedDates.length).toBe(2)
  })

  it('文本导入逐日 saveDayData 漏索引「有 entries 无 templates」的旧日期 → 自愈后仍能查到', () => {
    const store = useDayDataCacheStore()
    store.loadIndex()

    // 文本导入（ImportTab 旧行为）：逐日 saveDayData
    store.saveDayData('2026-08-01', makeDay('2026-08-01', { 卧推: [setEntry(10, 50)] }))
    // 旧版本日期：有 entries 但无 templates → checkHasActivity=false → 未入索引
    store.saveDayData('2026-07-15', makeLegacyDay('硬拉', [setEntry(5, 90)]))

    // 历史页（直接扫 storage）能看到 2 天，但索引只有 1 天（07-15 被漏掉）
    expect(store.sortedDates.length).toBe(1)
    expect(store.storageDayCount()).toBe(2)

    // 「硬拉」唯一的历史就在未入索引的 2026-07-15
    const records = store.batchGetLatestRecords(['硬拉'], '2026-09-21')
    // 首次扫描：索引只有 08-01（无硬拉）→ 未找到；storageDayCount(2) != sortedDates(1)
    // → 自愈重建索引 + 清缓存 → 重试找到 07-15
    expect(records['硬拉']).toBeTruthy()
    expect(records['硬拉'].date).toBe('2026-07-15')
    expect(store.sortedDates.length).toBe(2)
  })

  it('真正无历史（storage 无数据）→ 返回空结果，不误报也不触发无谓重建', () => {
    const store = useDayDataCacheStore()
    store.loadIndex()
    expect(store.sortedDates.length).toBe(0)
    const before = uni.getStorageInfoSync().keys.length
    const records = store.batchGetLatestRecords(['卧推'], '2026-09-21')
    expect(records['卧推']).toBeFalsy()
    // 无数据时键数一致（0==0），不触发自愈重试，不写多余 storage
    expect(uni.getStorageInfoSync().keys.length).toBe(before)
  })

  it('同一天的数据不计入「上次」对比（跳过当天）', () => {
    const store = useDayDataCacheStore()
    store.loadIndex()
    store.saveDayData('2026-09-21', makeDay('2026-09-21', { 卧推: [setEntry(10, 50)] }))
    const records = store.batchGetLatestRecords(['卧推'], '2026-09-21')
    expect(records['卧推']).toBeFalsy() // 当天记录被跳过，无更早历史
  })
})
