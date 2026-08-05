/**
 * 通用请求工具
 * 跨平台兼容: H5 / 微信小程序 / App
 */

/**
 * uni.request 封装
 */
export function request(options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      timeout: options.timeout || 15000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`))
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 上传文件
 */
export function uploadFile(options = {}) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: options.url,
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || {},
      header: options.header || {},
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(data)
        } catch {
          resolve(res.data)
        }
      },
      fail: reject,
    })
  })
}

/**
 * 下载文件
 */
export function downloadFile(options = {}) {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: options.url,
      success: resolve,
      fail: reject,
    })
  })
}

/**
 * 获取本地存储
 */
export function getStorageData(key, defaultVal = null) {
  try {
    const val = uni.getStorageSync(key)
    return val || defaultVal
  } catch {
    return defaultVal
  }
}

/**
 * 设置本地存储
 */
export function setStorageData(key, value) {
  try {
    uni.setStorageSync(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * 删除本地存储
 */
export function removeStorageData(key) {
  try {
    uni.removeStorageSync(key)
    return true
  } catch {
    return false
  }
}
