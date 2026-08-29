// utils/bleHeartRate.js
// 蓝牙心率连接管理：扫描/连接/重连/断开/解析 HRS(0x180D/0x2A37)

const HR_SERVICE_UUID = '0000180D-0000-1000-8000-00805F9B34FB'
const HR_MEASUREMENT_UUID = '00002A37-0000-1000-8000-00805F9B34FB'
const DEVICE_ID_KEY = 'hr_device_id'
const MAX_RETRIES = 3
const SUBSCRIBE_DELAY = 800      // 连接成功后延迟订阅，等待 BLE 服务就绪
const SUBSCRIBE_MAX_TRIES = 3   // 订阅失败重试次数
const CONNECTION_TIMEOUT = 10000 // 10秒连接超时

const RECONNECT_INTERVALS = {
  normal: 1500,
  weak_signal: 3000,
  device_off: 5000
}

// HRS 数据解析：flags byte bit0=1 → 心率 uint16，否则 uint8
export function parseHeartRate(buffer) {
  const data = new Uint8Array(buffer)
  if (!data || data.length < 2) return null
  const flags = data[0]
  const isUInt16 = (flags & 0x01) === 1
  let hr
  if (isUInt16 && data.length >= 3) {
    hr = data[1] | (data[2] << 8)
  } else {
    hr = data[1]
  }
  if (hr <= 0 || hr > 220) return null
  return hr
}

function getDeviceRssi(deviceId) {
  return new Promise((resolve, reject) => {
    uni.getBLEDeviceRSSI({
      deviceId,
      success: (res) => {
        resolve(res.rssi)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export function createBleHeartRate() {
  let state = 'disconnected' // disconnected|connecting|connected|reconnecting
  let deviceId = uni.getStorageSync(DEVICE_ID_KEY) || null
  let retries = 0
  let hrCallback = null
  let stateCallback = null
  let valueChangeHandler = null
  let stateChangeHandler = null
  let lastDisconnectReason = 'normal'

  function getReconnectInterval() {
    return RECONNECT_INTERVALS[lastDisconnectReason] || RECONNECT_INTERVALS.normal
  }

  function setDisconnectReason(reason) {
    lastDisconnectReason = reason
  }

  function setState(s) { state = s; stateCallback && stateCallback(s) }

  function onValueChange(res) {
    const hr = parseHeartRate(res.value)
    if (hr && hrCallback) hrCallback(hr)
  }
  function onConnStateChange(res) {
    if (!res.connected && state === 'connected') {
      // 根据断开原因设置重连间隔
      setDisconnectReason('normal')
      setState('reconnecting'); reconnect()
    }
  }

  let subscribeTimeout = null

  // 订阅心率特征（支持重试+超时检测，防止卡死）
  function subscribe(tryCount = 0) {
    if (tryCount === 0) {
      console.log('[BLE] 开始订阅心率特征, deviceId=', deviceId)
    } else {
      console.log(`[BLE] 第 ${tryCount + 1}/${SUBSCRIBE_MAX_TRIES} 次尝试订阅`)
    }
    // 超时检测：5 秒内未完成订阅则重试，防止 getBLEDeviceServices 等回调不触发卡死
    if (subscribeTimeout) clearTimeout(subscribeTimeout)
    subscribeTimeout = setTimeout(() => {
      console.log('[BLE] 订阅超时，回调未触发，重试')
      retrySubscribe(tryCount)
    }, 5000)
    uni.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        const hrSvc = res.services.find(s => /180D/i.test(s.uuid))
        if (!hrSvc) {
          console.log('[BLE] 未找到心率服务，设备服务列表:', res.services.map(s => s.uuid))
          retrySubscribe(tryCount)
          return
        }
        uni.getBLEDeviceCharacteristics({
          deviceId, serviceId: hrSvc.uuid,
          success: (cres) => {
            const hrChar = cres.characteristics.find(c => /2A37/i.test(c.uuid))
            if (!hrChar) {
              console.log('[BLE] 未找到心率特征，特征列表:', cres.characteristics.map(c => c.uuid))
              retrySubscribe(tryCount)
              return
            }
            uni.notifyBLECharacteristicValueChange({
              deviceId, serviceId: hrSvc.uuid, characteristicId: hrChar.uuid,
              state: true,
              success: () => {
                if (subscribeTimeout) { clearTimeout(subscribeTimeout); subscribeTimeout = null }
                // App 端可能没有 offBLECharacteristicValueChange，跳过即可
                // onBLECharacteristicValueChange 是全局监听，重复注册会覆盖旧的
                valueChangeHandler = onValueChange
                uni.onBLECharacteristicValueChange(onValueChange)
                console.log('[BLE] 心率订阅成功', hrSvc.uuid, hrChar.uuid)
              },
              fail: (e) => {
                console.log('[BLE] notify 失败', e)
                retrySubscribe(tryCount)
              },
            })
          },
          fail: (e) => {
            console.log('[BLE] 获取特征失败', e)
            retrySubscribe(tryCount)
          },
        })
      },
      fail: (e) => {
        console.log('[BLE] 获取服务失败', e)
        retrySubscribe(tryCount)
      },
    })
  }

  // 订阅失败重试：等待 SUBSCRIBE_DELAY 后重试，超过次数则标记断开
  function retrySubscribe(tryCount) {
    if (subscribeTimeout) { clearTimeout(subscribeTimeout); subscribeTimeout = null }
    if (tryCount + 1 >= SUBSCRIBE_MAX_TRIES) {
      console.log('[BLE] 订阅重试已达上限，放弃')
      setState('disconnected')
      return
    }
    setTimeout(() => subscribe(tryCount + 1), SUBSCRIBE_DELAY)
  }

  function connect(id) {
    return new Promise((resolve, reject) => {
      deviceId = id
      setState('connecting')
      uni.createBLEConnection({
        deviceId: id, success: () => {
          uni.setStorageSync(DEVICE_ID_KEY, id)
          console.log('[BLE] 连接成功，延迟', SUBSCRIBE_DELAY, 'ms 后订阅')
          setTimeout(() => subscribe(), SUBSCRIBE_DELAY)
          setState('connected'); retries = 0; resolve()
        }, fail: (e) => {
          // 设备已连接（常见于页面刷新重连场景），直接订阅
          const errMsg = (e.errMsg || '') + (e.errCode || '')
          if (errMsg.includes('already') || errMsg.includes('已连接') || errMsg.includes('-1')) {
            console.log('[BLE] 设备已连接，直接订阅')
            uni.setStorageSync(DEVICE_ID_KEY, id)
            setTimeout(() => subscribe(), SUBSCRIBE_DELAY)
            setState('connected'); retries = 0; resolve()
          } else {
            console.log('[BLE] 连接失败', e)
            setState('disconnected'); reject(e)
          }
        }
      })
    })
  }

  // 注意：超时只拒绝 Promise.race，底层 BLE 连接仍会继续尝试。
  // 连接会在设备不可用时自然失败，无需显式取消。
  async function connectWithTimeout(deviceId) {
    return Promise.race([
      connect(deviceId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('连接超时')), CONNECTION_TIMEOUT)
      )
    ])
  }

  async function reconnect() {
    while (retries < MAX_RETRIES && deviceId) {
      setState('reconnecting')

      const interval = getReconnectInterval()
      await new Promise(resolve => setTimeout(resolve, interval))

      retries++
      try {
        await connectWithTimeout(deviceId)
        return // 连接成功，退出循环
      } catch (err) {
        // 继续下一次重试
      }
    }
    setState('disconnected')
  }

  return {
    initAdapter() {
      return new Promise((resolve, reject) => {
        uni.openBluetoothAdapter({
          success: () => resolve(true),
          fail: (e) => { resolve(false) },
        })
      })
    },
    startScan(onFound) {
      uni.startBluetoothDevicesDiscovery({
        services: [HR_SERVICE_UUID],
        success: () => {
          uni.onBluetoothDeviceFound((res) => {
            res.devices.forEach((d) => onFound && onFound(d))
          })
        },
      })
    },
    stopScan() { uni.stopBluetoothDevicesDiscovery() },
    connect,
    subscribe,
    onHeartRate(cb) { hrCallback = cb },
    onStateChange(cb) {
      stateCallback = cb
      if (!stateChangeHandler) {
        stateChangeHandler = onConnStateChange
        uni.onBLEConnectionStateChange(onConnStateChange)
      }
    },
    getLastDeviceId() { return deviceId },
    setDeviceId(id) { deviceId = id },
    // 检查 BLE 是否已连接某设备（用于重进页面时恢复状态）
    // 新实例的 deviceId 可能为 null，从 storage 读取
    checkConnected() {
      return new Promise((resolve) => {
        const id = deviceId || uni.getStorageSync(DEVICE_ID_KEY)
        if (!id) { resolve(null); return }
        uni.getConnectedBluetoothDevices({
          services: [HR_SERVICE_UUID],
          success: (res) => {
            const found = res.devices.find(d => d.deviceId === id)
            if (found) {
              deviceId = id  // 恢复实例的 deviceId
              resolve(id)
            } else {
              resolve(null)
            }
          },
          fail: () => resolve(null),
        })
      })
    },
    // 退出页面时只清理事件监听器，不断开 BLE 连接（保持手环连接）
    detachCallbacks() {
      if (valueChangeHandler) {
        if (typeof uni.offBLECharacteristicValueChange === 'function') {
          uni.offBLECharacteristicValueChange(valueChangeHandler)
        }
        valueChangeHandler = null
      }
      if (stateChangeHandler) {
        if (typeof uni.offBLEConnectionStateChange === 'function') {
          uni.offBLEConnectionStateChange(stateChangeHandler)
        }
        stateChangeHandler = null
      }
      hrCallback = null
      stateCallback = null
    },
    // 断开 BLE 连接（返回 Promise，确保断连完成）
    disconnect() {
      return new Promise((resolve) => {
        if (valueChangeHandler) {
          if (typeof uni.offBLECharacteristicValueChange === 'function') {
            uni.offBLECharacteristicValueChange(valueChangeHandler)
          }
          valueChangeHandler = null
        }
        if (stateChangeHandler) {
          if (typeof uni.offBLEConnectionStateChange === 'function') {
            uni.offBLEConnectionStateChange(stateChangeHandler)
          }
          stateChangeHandler = null
        }
        if (deviceId) {
          uni.closeBLEConnection({
            deviceId,
            complete: () => { setState('disconnected'); resolve() }
          })
        } else { setState('disconnected'); resolve() }
      })
    },
    getDeviceRssi,
    setDisconnectReason,
    getReconnectInterval,
    getState() { return state },
  }
}
