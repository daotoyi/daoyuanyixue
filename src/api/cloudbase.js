/**
 * CloudBase SDK 初始化与单例管理
 *
 * 多端适配:
 *   - H5: 使用 @cloudbase/js-sdk (CDN 或 npm)
 *   - 微信小程序: 使用 wx.cloud (原生)
 *   - App: 使用 @cloudbase/js-sdk (npm)
 */

// CloudBase 环境配置
const ENV_ID = 'cloud1-d8gs2k9m311f7272f'
const REGION = 'ap-shanghai'

// #ifdef H5 || APP-PLUS
// H5 / App: 静态引入 @cloudbase/js-sdk (避免 app 端 code-splitting 冲突)
import * as cloudbaseSdkModule from '@cloudbase/js-sdk'
const cloudbaseSdk = cloudbaseSdkModule.default || cloudbaseSdkModule
// #endif

let cloudApp = null
let _initPromise = null

/**
 * 初始化 CloudBase SDK (H5 / App 端)
 * 微信小程序使用 wx.cloud.init() 单独处理
 */
export async function initCloudBase() {
  // #ifdef MP-WEIXIN
  // 微信小程序: 使用原生 wx.cloud (注意: 微信小程序 wx.cloud.init 不支持 region 参数, 只传 env)
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    })
    cloudApp = wx.cloud
    console.log('[CloudBase] 微信小程序 wx.cloud 初始化完成', ENV_ID)
    return cloudApp
  }
  // #endif

  // #ifdef H5 || APP-PLUS
  // H5 / App: 使用 @cloudbase/js-sdk (静态引入)
  try {
    cloudApp = cloudbaseSdk.init({
      env: ENV_ID,
      region: REGION,
    })
    console.log('[CloudBase] H5/App SDK 初始化完成', ENV_ID)
    // H5 端调用云函数需要身份, 尝试匿名登录 (失败不阻塞)
    try {
      const auth = cloudApp.auth()
      const state = await auth.getLoginState()
      if (!state) {
        await auth.signInAnonymously()
        console.log('[CloudBase] 匿名登录完成')
      }
    } catch (e) {
      console.warn('[CloudBase] 匿名登录跳过', e)
    }
    return cloudApp
  } catch (e) {
    // CDN 模式 (H5)
    if (typeof window !== 'undefined' && window.cloudbase) {
      cloudApp = window.cloudbase.init({
        env: ENV_ID,
        region: REGION,
      })
      console.log('[CloudBase] CDN SDK 初始化完成', ENV_ID)
      return cloudApp
    }
    console.warn('[CloudBase] SDK 未加载, 请检查依赖', e)
    return null
  }
  // #endif
}

/**
 * 获取 CloudBase 实例 (惰性初始化, 等待完整初始化含匿名登录)
 */
export async function getCloudBaseInstance() {
  if (!_initPromise) {
    _initPromise = initCloudBase()
  }
  return _initPromise
}

/**
 * 获取数据库实例
 */
export async function getDatabase() {
  const app = await getCloudBaseInstance()
  if (!app) return null

  // #ifdef MP-WEIXIN
  return app.database()
  // #endif

  // #ifndef MP-WEIXIN
  return app.database()
  // #endif
}

/**
 * 获取云函数调用器
 */
export async function getCallableFunction() {
  const app = await getCloudBaseInstance()
  if (!app) return null

  return async function callFunction(name, data = {}) {
    // #ifdef MP-WEIXIN
    const res = await app.callFunction({ name, data })
    return res.result
    // #endif

    // #ifndef MP-WEIXIN
    const res = await app.callFunction({ name, data })
    return res.result
    // #endif
  }
}

/**
 * 获取云存储实例
 */
export async function getStorage() {
  const app = await getCloudBaseInstance()
  if (!app) return null

  // #ifdef MP-WEIXIN
  return {
    uploadFile: (filePath, cloudPath) => {
      return new Promise((resolve, reject) => {
        app.uploadFile({
          cloudPath,
          filePath,
          success: resolve,
          fail: reject,
        })
      })
    },
    getTempFileURL: (fileList) => {
      return new Promise((resolve, reject) => {
        app.getTempFileURL({
          fileList,
          success: resolve,
          fail: reject,
        })
      })
    },
  }
  // #endif

  // #ifndef MP-WEIXIN
  return app.storage()
  // #endif
}

/**
 * 获取认证实例
 */
export async function getAuth() {
  const app = await getCloudBaseInstance()
  if (!app) return null

  // #ifdef MP-WEIXIN
  return {
    getLoginState: () => {
      // 微信小程序: 在云函数中获取 OPENID
      return app.callFunction({
        name: 'getOpenId',
        data: {},
      }).then(res => res.result)
    },
  }
  // #endif

  // #ifndef MP-WEIXIN
  return app.auth()
  // #endif
}

// 导出环境配置
export const CLOUDBASE_CONFIG = {
  envId: ENV_ID,
  region: REGION,
  staticDomain: 'cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com',
  storageDomain: '', // 云存储文件URL: 小程序用 cloud://fileID, H5 用 getTempFileURL 获取
}
