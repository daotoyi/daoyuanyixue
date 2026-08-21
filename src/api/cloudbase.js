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
// H5端: 优先用同域名的 /dy-api 路由 (避免跨域), 降级到云函数网关直连
const API_BASE = typeof window !== 'undefined' && window.location.hostname.includes('club')
  ? '/dy-api'
  : 'https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api'

// #ifdef H5 || APP-PLUS
    // H5 / App: 静态引入 @cloudbase/js-sdk (避免 app 端 code-splitting 冲突)
import * as cloudbaseSdkModule from '@cloudbase/js-sdk'
const cloudbaseSdk = cloudbaseSdkModule.default || cloudbaseSdkModule
// #endif

let cloudApp = null
let _initPromise = null

/**
 * Canvas 压缩图片到指定大小以下的 base64 (H5 端)
 * @param {string} src 图片路径 (blob:/http: URL)
 * @param {number} targetKB 目标大小 KB
 * @returns {Promise<string>} base64 字符串 (不含 data: 前缀)
 */
async function compressImageToBase64(src, targetKB = 80) {
  const targetBytes = targetKB * 1024
  const img = new Image()
  img.src = src
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
  let { naturalWidth: w, naturalHeight: h } = img
  // 限制最大尺寸 1280px
  const MAX_DIM = 1280
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = MAX_DIM / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  // 逐步降低 quality 直到 < targetKB
  let quality = 0.85
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length * 0.75 > targetBytes && quality > 0.15) {
    quality -= 0.15
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  // 去掉 data:image/jpeg;base64, 前缀
  return dataUrl.replace(/^data:image\/\w+;base64,/, '')
}

/**
 * 通用 API 请求 (H5 端用 fetch 绕过 uni.request CORS 问题)
 */
async function apiRequest(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  return data
}

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
  // H5/App: @cloudbase/js-sdk 存储为顶级方法 app.uploadFile / app.getTempFileURL (无 app.storage())
  // 兼容 js-sdk 回调式与 Promise 式两种风格 (回调可能被忽略, 需同时接 Promise)
  const wrap = (fn) => {
    return new Promise((resolve, reject) => {
      let settled = false
      const done = (r) => { if (!settled) { settled = true; resolve(r) } }
      const fail = (e) => { if (!settled) { settled = true; reject(e) } }
      try {
        const p = fn(done, fail)
        if (p && p.then) p.then(done).catch(fail)
      } catch (e) { fail(e) }
    })
  }
  return {
    uploadFile: async (filePath, cloudPath) => {
      // H5: 图片 → canvas 压缩到 <80KB → base64 云函数中转 (云函数网关 body 限制 ~100KB)
      //      非图片 → 云函数 getUploadUrl → COS 直传
      // 1) 图片: canvas 压缩 + base64
      let base64 = ''
      const isImage = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(cloudPath) || cloudPath.includes('covers/') || cloudPath.includes('images/') || cloudPath.includes('avatar')
      if (isImage && typeof document !== 'undefined' && typeof document.createElement === 'function') {
        try {
          base64 = await compressImageToBase64(filePath, 80)
        } catch (e) {
          console.warn('[CloudBase] canvas 压缩失败, 尝试原始读取', e)
        }
      }
      // 非图片或 canvas 失败: 原始 base64 (小文件可用, 大文件走 COS 直传)
      if (!base64) {
        try {
          let bytes = null
          if (typeof filePath === 'string' && /^(blob:|https?:)/.test(filePath)) {
            const ab = await fetch(filePath).then((r) => r.arrayBuffer())
            bytes = new Uint8Array(ab)
          } else if (typeof filePath === 'string') {
            const fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
            if (fs && fs.readFile) {
              bytes = await new Promise((resolve, reject) => {
                fs.readFile({ filePath, success: (r) => resolve(new Uint8Array(r.data)), fail: reject })
              })
            }
          }
          if (bytes && bytes.length) {
            let bin = ''
            const CHUNK = 0x8000
            for (let i = 0; i < bytes.length; i += CHUNK) {
              bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
            }
            base64 = btoa(bin)
          }
        } catch (e) {
          console.warn('[CloudBase] base64 读取失败', e)
        }
      }
      // 2) 有 base64 且 <80KB → 云函数中转上传
      if (base64 && base64.length < 110000) {
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'storage.uploadBase64', data: { cloudPath, base64 } }),
        }).then(r => r.json())
        if (res.status === 200) {
          if (res.data && res.data.fileID) return { fileID: res.data.fileID }
          throw new Error('云函数上传未返回 fileID')
        }
        throw new Error(res.msg || '上传失败')
      }
      // 3) 降级: 直传 COS
      const meta = await new Promise((resolve, reject) => {
        uni.request({
          url: API_BASE,
          method: 'POST',
          data: { action: 'storage.getUploadUrl', data: { cloudPath } },
          timeout: 20000,
          success: (res) => {
            if (res.data && res.data.status === 200) resolve(res.data.data || {})
            else reject(new Error((res.data && res.data.msg) || '获取上传凭证失败'))
          },
          fail: (err) => reject(new Error('网络请求失败: ' + (err.errMsg || ''))),
        })
      })
      if (!meta || !meta.url) throw new Error(meta && meta.msg ? meta.msg : '上传凭证无效')
      let body = filePath
      try {
        if (typeof fetch === 'function' && typeof filePath === 'string' && filePath.indexOf('blob:') === 0) {
          body = await fetch(filePath).then((r) => r.blob())
        }
      } catch (e) {
        console.warn('[CloudBase] blob 读取失败, 按原值上传', e)
      }
      const formData = new FormData()
      if (meta.authorization) formData.append('Signature', meta.authorization)
      if (meta.token) formData.append('x-cos-security-token', meta.token)
      if (meta.cosFileId) formData.append('x-cos-meta-fileid', meta.cosFileId)
      formData.append('key', cloudPath)
      formData.append('file', body, cloudPath.split('/').pop() || 'upload.bin')
      const resp = await fetch(meta.url, { method: 'POST', body: formData })
      if (!resp.ok) {
        let msg = '上传失败 HTTP ' + resp.status
        try { msg = msg + ' ' + (await resp.text()).slice(0, 160) } catch (e2) {}
        throw new Error(msg)
      }
      return { fileID: meta.fileId || meta.cosFileId }
    },
    getTempFileURL: (fileList) => wrap((done, fail) => app.getTempFileURL({ fileList, success: done, fail })),
    _raw: app,
  }
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
  staticDomain: 'club.zhenhesheng.cn',
  storageDomain: '', // 云存储文件URL: 小程序用 cloud://fileID, H5 用 getTempFileURL 获取
}
