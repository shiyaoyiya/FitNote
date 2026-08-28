// utils/bleHeartRate.js
// 蓝牙心率连接管理：扫描/连接/重连/断开/解析 HRS(0x180D/0x2A37)

const HR_SERVICE_UUID = '0000180D-0000-1000-8000-00805F9B34FB'
const HR_MEASUREMENT_UUID = '00002A37-0000-1000-8000-00805F9B34FB'
const DEVICE_ID_KEY = 'hr_device_id'
const MAX_RETRIES = 3
const RECONNECT_DELAY = 1500

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

export function createBleHeartRate() {
  let state = 'disconnected' // disconnected|connecting|connected|reconnecting
  let deviceId = uni.getStorageSync(DEVICE_ID_KEY) || null
  let retries = 0
  let hrCallback = null
  let stateCallback = null
  let valueChangeHandler = null
  let stateChangeHandler = null

  function setState(s) { state = s; stateCallback && stateCallback(s) }

  function onValueChange(res) {
    const hr = parseHeartRate(res.value)
    if (hr && hrCallback) hrCallback(hr)
  }
  function onConnStateChange(res) {
    if (!res.connected && state === 'connected') {
      setState('reconnecting'); reconnect()
    }
  }

  function subscribe() {
    uni.notifyBLECharacteristicValueChange({
      deviceId, serviceId: HR_SERVICE_UUID, characteristicId: HR_MEASUREMENT_UUID,
      state: true, success: () => {
        if (valueChangeHandler) uni.off('onBLECharacteristicValueChange', valueChangeHandler)
        valueChangeHandler = onValueChange
        uni.on('onBLECharacteristicValueChange', onValueChange)
      },
    })
  }

  function connect(id) {
    return new Promise((resolve, reject) => {
      deviceId = id
      setState('connecting')
      uni.createBLEConnection({
        deviceId: id, success: () => {
          uni.setStorageSync(DEVICE_ID_KEY, id)
          subscribe()
          setState('connected'); retries = 0; resolve()
        }, fail: (e) => { setState('disconnected'); reject(e) }
      })
    })
  }

  function reconnect() {
    if (retries >= MAX_RETRIES || !deviceId) { setState('disconnected'); return }
    retries++
    setTimeout(() => {
      uni.createBLEConnection({
        deviceId, success: () => { subscribe(); setState('connected'); retries = 0 },
        fail: () => { if (retries < MAX_RETRIES) reconnect(); else setState('disconnected') },
      })
    }, RECONNECT_DELAY)
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
    onHeartRate(cb) { hrCallback = cb },
    onStateChange(cb) {
      stateCallback = cb
      if (!stateChangeHandler) {
        stateChangeHandler = onConnStateChange
        uni.on('onBLEConnectionStateChange', onConnStateChange)
      }
    },
    getLastDeviceId() { return deviceId },
    disconnect() {
      if (valueChangeHandler) { uni.off('onBLECharacteristicValueChange', valueChangeHandler); valueChangeHandler = null }
      if (stateChangeHandler) { uni.off('onBLEConnectionStateChange', stateChangeHandler); stateChangeHandler = null }
      if (deviceId) {
        uni.closeBLEConnection({ deviceId, complete: () => setState('disconnected') })
      } else { setState('disconnected') }
    },
    getState() { return state },
  }
}
