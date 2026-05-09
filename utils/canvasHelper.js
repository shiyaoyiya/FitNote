/**
 * 跨平台 Canvas 管理器
 * 统一处理 H5、微信小程序、App 的 Canvas 获取和操作
 */

let systemInfoCache = null

/**
 * 获取系统信息（兼容所有平台）
 * @returns {Promise<Object>} 系统信息对象
 */
export function getSystemInfo() {
  if (systemInfoCache) {
    return Promise.resolve(systemInfoCache)
  }

  // #ifdef H5
  systemInfoCache = {
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    platform: 'h5'
  }
  return Promise.resolve(systemInfoCache)
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.getSystemInfo({
      success: (res) => {
        systemInfoCache = {
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight,
          pixelRatio: res.pixelRatio || 1,
          platform: 'mp-weixin'
        }
        resolve(systemInfoCache)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.getSystemInfo({
      success: (res) => {
        systemInfoCache = {
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight,
          pixelRatio: res.pixelRatio || 1,
          platform: 'app'
        }
        resolve(systemInfoCache)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
  // #endif

  // #ifndef H5 && !MP-WEIXIN && !APP-PLUS
  return Promise.resolve({
    windowWidth: 375,
    windowHeight: 667,
    pixelRatio: 2,
    platform: 'unknown'
  })
  // #endif
}

/**
 * Canvas 管理器类
 * 用于统一管理 Canvas 的获取和操作
 */
export class CanvasManager {
  constructor(canvasId, componentContext = null) {
    this.canvasId = canvasId
    this.componentContext = componentContext
    this.canvasNode = null
    this.ctx = null
    this.isReady = false
    this.pixelRatio = 1
  }

  /**
   * 初始化 Canvas - 获取节点并设置尺寸
   * @param {number} width - Canvas 宽度
   * @param {number} height - Canvas 高度
   * @returns {Promise<Object>} 返回 { canvas, ctx }
   */
  async init(width = 300, height = 300) {
    return new Promise((resolve, reject) => {
      const query = uni.createSelectorQuery()

      if (this.componentContext) {
        query.in(this.componentContext)
      }

      query
        .select('#' + this.canvasId)
        .node((res) => {
          if (!res || !res.node) {
            console.warn('Canvas node not found:', this.canvasId)
            resolve(null)
            return
          }

          this.canvasNode = res.node
          const canvas = this.canvasNode

          // 获取像素比
          // #ifdef H5
          this.pixelRatio = window.devicePixelRatio || 1
          // #endif

          // #ifdef MP-WEIXIN
          try {
            const sysInfo = uni.getSystemInfoSync()
            this.pixelRatio = sysInfo.pixelRatio || 1
          } catch (e) {
            this.pixelRatio = 1
          }
          // #endif

          // #ifdef APP-PLUS
          try {
            const sysInfo = uni.getSystemInfoSync()
            this.pixelRatio = sysInfo.pixelRatio || 1
          } catch (e) {
            this.pixelRatio = 1
          }
          // #endif

          // 设置 Canvas 尺寸
          canvas.width = width * this.pixelRatio
          canvas.height = height * this.pixelRatio

          // #ifdef H5
          // H5 端：直接获取 2D 上下文
          this.ctx = canvas.getContext('2d')
          if (this.ctx && this.pixelRatio !== 1) {
            this.ctx.scale(this.pixelRatio, this.pixelRatio)
          }
          // #endif

          // #ifdef MP-WEIXIN
          // 小程序端：使用 uni.createCanvasContext
          this.ctx = uni.createCanvasContext(this.canvasId, this.componentContext)
          // #endif

          // #ifdef APP-PLUS
          // App 端：使用 uni.createCanvasContext
          this.ctx = uni.createCanvasContext(this.canvasId)
          // #endif

          this.isReady = true
          resolve({ canvas, ctx: this.ctx })
        })
        .exec()
    })
  }

  /**
   * 清除画布
   * @param {number} x - 起始 x
   * @param {number} y - 起始 y
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  clearRect(x = 0, y = 0, width = 0, height = 0) {
    if (!this.ctx) return

    // 如果没有指定尺寸，使用 Canvas 实际尺寸
    if (width === 0 || height === 0) {
      if (this.canvasNode) {
        width = this.canvasNode.width / this.pixelRatio
        height = this.canvasNode.height / this.pixelRatio
      }
    }

    this.ctx.clearRect(x, y, width, height)
  }

  /**
   * 提交绘制（仅小程序需要）
   */
  draw() {
    // #ifdef MP-WEIXIN
    if (this.ctx && this.ctx.draw) {
      this.ctx.draw()
    }
    // #endif
  }

  /**
   * 获取上下文
   */
  getContext() {
    return this.ctx
  }

  /**
   * 获取 Canvas 节点
   */
  getCanvas() {
    return this.canvasNode
  }

  /**
   * 检查是否就绪
   */
  ready() {
    return this.isReady
  }
}

/**
 * 测量文本宽度（兼容不同平台）
 * @param {Object} ctx - Canvas 上下文
 * @param {string} text - 文本
 * @returns {number} 文本宽度
 */
export function measureTextWidth(ctx, text) {
  if (!ctx) return text.length * 6

  // H5 Canvas 2D API
  if (ctx.measureText) {
    return ctx.measureText(text).width
  }

  // 小程序旧版 API
  if (typeof ctx.measureText === 'function') {
    try {
      const result = ctx.measureText({ text })
      return result ? (result.width || text.length * 6) : text.length * 6
    } catch (e) {
      return text.length * 6
    }
  }

  return text.length * 6
}
