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

/* ===== 大文件分片上传 (COS Multipart Upload) =====
   COS 单次 PUT 上限 5GB, 4GB+ 上传不稳定 → 非图片(视频)上传统一走分片,
   可获得真实进度, 并支持暂停/继续/取消。
   协议: createMultipart → (partUploadAuth + fetch PUT) × N → completeMultipart */
const MULTIPART_PART_SIZE = 16 * 1024 * 1024        // 16MB / 片 (参考百度网盘细粒度分片: 单片失败影响小, 重试易成功)
const MULTIPART_CONCURRENCY = 6                     // 并发片数 (吃满浏览器同域名连接上限, 提速)
const PUT_TIMEOUT_MS = 90000                        // 单片 PUT 超时: 防请求挂起卡死进度

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* 暂停/取消控制: control = { paused, cancelled, abortFns:Set }。
   暂停: 立即中断所有进行中的分片请求并停止调度新的; 恢复后续传;
   取消: 立即中断所有分片并抛 UPLOAD_CANCELLED */
async function waitIfPaused(control) {
  while (control && control.paused && !control.cancelled) {
    await sleep(300)
  }
  if (control && control.cancelled) {
    throw Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' })
  }
}

/* 探测文件大小 (优先用 File 对象 .size 零开销; 其次 fetch blob; App/其他: getFileInfo)
   fileObj: 可选 Blob/File — 直接 .size, 解决几 GB 大视频 fetch 全读超时导致的"无法读取文件大小" (2026-08-30) */
async function probeFileSize(filePath, fileObj) {
  if (fileObj && fileObj.size !== undefined) return fileObj.size || 0
  try {
    if (typeof fetch === 'function' && typeof filePath === 'string' && /^(blob:|https?:)/.test(filePath)) {
      const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('读取超时')), 10000))])
      return (await withTimeout(fetch(filePath), 10000).then((r) => r.blob())).size || 0
    }
    if (uni.getFileInfo) {
      return await new Promise((resolve) => {
        uni.getFileInfo({ filePath, success: (r) => resolve(r.size || 0), fail: () => resolve(0) })
      })
    }
  } catch (e) {
    console.warn('[CloudBase] 探测文件大小失败', e)
  }
  return 0
}

/* 读取指定区间的文件内容 (H5: 优先用 File/Blob 对象直接 slice 零拷贝; 其次 fetch blob; App: FileSystemManager)
   signal: 可选 AbortSignal — 暂停/取消可中断读取 (2026-08-30: 修复读取挂起导致卡死且取消无效)
   fileObj: 可选 Blob/File — chooseVideo 的 originalFile, 直接 slice 不读全文件, 解决几 GB 大视频 fetch 全读超时/内存爆 */
async function readBlobSlice(filePath, start, end, signal, fileObj) {
  if (fileObj && typeof fileObj.slice === 'function') {
    return fileObj.slice(start, end) // Blob.slice 零拷贝, 不读全文件
  }
  if (typeof fetch === 'function' && typeof filePath === 'string' && /^(blob:|https?:)/.test(filePath)) {
    const blob = await fetch(filePath, signal ? { signal } : {}).then((r) => r.blob())
    return blob.slice(start, end)
  }
  const fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
  if (!fs || !fs.readFile) throw new Error('当前环境不支持大文件分片上传')
  const ab = await new Promise((resolve, reject) => {
    fs.readFile({ filePath, position: start, length: end - start, encoding: '', success: (r) => resolve(r.data), fail: reject })
  })
  return new Blob([ab])
}

/* COS 分片上传主流程: 返回 { fileID }。
   control = { paused, cancelled, abortFns:Set } 支持暂停/取消 (abortFns 遍历中断所有并发分片);
   onStatus('retrying'|'paused'|'resumed'|'cancelling') 状态回调用于界面提示;
   resume = { uploadId, skipPartNumbers } 断点续传: 复用 uploadId 跳过已传分片, 只传缺失的;
   失败/取消【不 abort 分片】→ 已传分片保留在 COS, 供下次续传 (control 上暴露 uploadId/partNumbers/size) */
async function uploadMultipartToCos(filePath, cloudPath, onProgress, control, onStatus, resume, fileObj) {
  if (!control) control = {}
  if (!control.abortFns) control.abortFns = new Set()
  const status = (s) => { if (onStatus) onStatus(s) }
  // 取消感知包装 (2026-08-30): 任意 await 点 250ms 轮询 cancelled,
  // 点取消立即抛 UPLOAD_CANCELLED — 覆盖初始化/取签名/合并等无 abort 目标的阶段, 杜绝"取消没反应"
  const cancelAware = (promise) => {
    let iv = null
    const cancelP = new Promise((_, rej) => {
      iv = setInterval(() => {
        if (control && control.cancelled) {
          clearInterval(iv)
          rej(Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' }))
        }
      }, 250)
    })
    return Promise.race([promise, cancelP]).finally(() => clearInterval(iv))
  }
  // 硬超时: 不依赖 AbortController 是否生效, 到点必定 reject (2026-08-31 修复代理/VPN网络下
  // fetch 挂起时 abort 不 reject 导致整批 Promise.allSettled 永久卡死、进度卡在某百分比不动)
  const withHardTimeout = (promise, ms, onTimeout) => {
    let to = null
    const timeoutP = new Promise((_, rej) => {
      to = setTimeout(() => {
        if (onTimeout) { try { onTimeout() } catch (e) {} }
        const err = new Error('请求硬超时')
        err.code = 'HARD_TIMEOUT'
        rej(err)
      }, ms)
    })
    return Promise.race([promise, timeoutP]).finally(() => { if (to) clearTimeout(to) })
  }
  await waitIfPaused(control)
  // 文件大小: 优先 chooseVideo 返回的 res.size (control.size) → File 对象 .size → 兜底 fetch 探测
  // (2026-08-30: 几 GB 大视频 fetch 全读会超时/内存爆 → "无法读取文件大小", 必须避免 fetch)
  let size = control.size || 0
  if (!size && fileObj && fileObj.size !== undefined) size = fileObj.size || 0
  if (!size) size = await cancelAware(probeFileSize(filePath, fileObj)).catch(() => 0)
  if (!size) throw new Error('无法读取文件大小')
  const totalParts = Math.ceil(size / MULTIPART_PART_SIZE)
  const call = async (action, data, signal) => {
    const res = await cancelAware(apiRequest({ action, data }, 30000, signal))
    if (res.status !== 200) throw new Error(res.msg || action + ' 失败')
    return res.data || {}
  }
  let uploadId = ''
  const donePartNumbers = []
  let uploaded = 0
  // 1) 初始化: 续传复用 uploadId + 服务端查询已传分片; 否则新建
  await waitIfPaused(control)
  if (resume && resume.uploadId) {
    uploadId = resume.uploadId
    // 校验 uploadId 有效性: listParts 返回空(分片被清理/uploadId失效)时, 丢弃旧续传点重建, 避免合并时"未找到分片"报错
    // (2026-08-30: 取消/失败留下的旧 uploadId 可能已被 COS 清理, 续传→completeMultipart 必然失败 → 用户反复遇到"上传中断")
    const lp = await call('storage.listParts', { cloudPath, uploadId }).catch(() => null)
    if (lp && lp.parts && lp.parts.length) {
      donePartNumbers.push(...lp.parts)
      uploaded = donePartNumbers.length * MULTIPART_PART_SIZE // 近似 (最后一片略小, 进度显示无碍)
      if (uploaded > size) uploaded = size
      console.log('[CloudBase] 断点续传: uploadId=' + uploadId.slice(0, 12) + '... 已传分片=' + donePartNumbers.length + '/' + totalParts)
    } else {
      // uploadId 已失效/分片被清理: 重建新的分片上传 (丢弃旧进度, 从头传)
      console.warn('[CloudBase] 续传 uploadId 已失效(服务端无分片), 重新创建分片上传')
      uploadId = ''
      const init = await call('storage.createMultipart', { cloudPath })
      if (!init.uploadId) throw new Error('初始化分片上传失败')
      uploadId = init.uploadId
    }
  } else {
    const init = await call('storage.createMultipart', { cloudPath })
    if (!init.uploadId) throw new Error('初始化分片上传失败')
    uploadId = init.uploadId
  }
  control.uploadId = uploadId
  control.partNumbers = donePartNumbers
  control.size = size
  const skipSet = new Set(donePartNumbers)
  let retrying = false
  const uploadOne = async (partIndex) => {
    const partNumber = partIndex + 1
    await waitIfPaused(control)
    if (skipSet.has(partNumber)) {
      // 已传分片: 跳过 (续传场景)
      if (onProgress) onProgress(uploaded / size, uploaded, size)
      return
    }
    const start = partIndex * MULTIPART_PART_SIZE
    const end = Math.min(size, start + MULTIPART_PART_SIZE)
    // 每片一个 AbortController 注册到 control.abortFns: 暂停/取消可中断【读取分片 + PUT 上传】全阶段
    // (2026-08-30: 注册提前到读分片前 — 之前读取挂起时取消无法中断, 导致进度卡死且取消无效)
    const controller = new AbortController()
    const abortFn = () => controller.abort()
    if (control && control.abortFns) control.abortFns.add(abortFn)
    let piece
    try {
      // 读分片: 60s 超时兜底 (blob 读取挂起会拖死整批并发且取消也中断不了)
      const readTimer = setTimeout(() => controller.abort(), 60000)
      try {
        piece = await readBlobSlice(filePath, start, end, controller.signal, fileObj)
      } finally {
        clearTimeout(readTimer)
      }
    } catch (readErr) {
      if (readErr && readErr.name === 'AbortError') {
        // 中止来源: 超时 / 用户暂停 / 用户取消 → 统一先判断控制状态
        await waitIfPaused(control) // 取消→抛 UPLOAD_CANCELLED; 暂停→等恢复; 纯超时→继续走失败重试
        throw new Error('分片 ' + partNumber + ' 读取超时')
      }
      throw readErr
    }
    try {
      // 获取本分片 PUT 预签名 URL (有效期 30 分钟, 失败重试 2 次; 取消/暂停可中断取签名)
      let auth = null
      for (let k = 0; k < 3 && !auth; k++) {
        await waitIfPaused(control)
        try {
          auth = await call('storage.partUploadAuth', { cloudPath, uploadId, partNumber }, controller.signal)
        } catch (e) {
          if (e && e.code === 'UPLOAD_CANCELLED') throw e
          if (k === 2) throw e
          await sleep(600 * (k + 1))
        }
      }
      if (!auth || !auth.url) throw new Error('获取分片 ' + partNumber + ' 上传签名失败')
      // PUT 分片: HTTP 错误/网络异常/超时均自动重试 3 次退避递增, 重试前刷新签名
      let okFlag = false
      let lastErr = null
      for (let retry = 0; retry < 3 && !okFlag; retry++) {
        await waitIfPaused(control)
        if (retry > 0) {
          try { auth = await call('storage.partUploadAuth', { cloudPath, uploadId, partNumber }) } catch (e2) {}
        }
        try {
          // 硬超时: 不依赖 abort 是否生效 (代理/VPN网络下 fetch 挂起时 abort 不 reject),
          // 到点必定 reject, 进入失败→重试, 避免整批 Promise.allSettled 永久卡死 (2026-08-31)
          const hardRace = Promise.race([
            fetch(auth.url, { method: 'PUT', body: piece, signal: controller.signal }),
            new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('分片上传硬超时'), { code: 'HARD_TIMEOUT' })), PUT_TIMEOUT_MS + 3000))
          ])
          const timer = setTimeout(() => { try { controller.abort() } catch (e) {} }, PUT_TIMEOUT_MS)
          let resp
          try {
            resp = await hardRace
          } finally {
            clearTimeout(timer)
          }
          if (resp.ok) {
            okFlag = true
          } else {
            let msg = '分片 ' + partNumber + ' 上传失败 HTTP ' + resp.status
            try { msg += ' ' + (await resp.text()).slice(0, 160) } catch (e2) {}
            lastErr = new Error(msg)
            console.error('[CloudBase]', msg)
          }
        } catch (netErr) {
          if (netErr && netErr.name === 'AbortError') {
            // 中止来源: 超时 / 用户暂停 / 用户取消 → 统一先判断控制状态
            await waitIfPaused(control) // 取消→抛 UPLOAD_CANCELLED; 暂停→等恢复; 纯超时→继续重试
            lastErr = new Error('分片 ' + partNumber + ' 上传超时')
            console.warn('[CloudBase] 分片 ' + partNumber + ' 上传超时, 自动重试')
          } else {
            lastErr = netErr
            console.error('[CloudBase] 分片 ' + partNumber + ' 网络错误(自动重试):', netErr.message || netErr)
          }
        }
        if (!okFlag && retry < 2) {
          if (!retrying) { retrying = true; status('retrying') }
          await sleep(1000 * Math.pow(2, retry)) // 1s/2s 退避
        }
      }
      if (!okFlag) throw lastErr || new Error('分片 ' + partNumber + ' 上传失败')
      if (retrying) { retrying = false; status('resumed') }
      donePartNumbers.push(partNumber)
      uploaded += piece.size
      if (onProgress) onProgress(uploaded / size, uploaded, size)
    } finally {
      if (control && control.abortFns) control.abortFns.delete(abortFn)
    }
  }
  try {
    // 分片上传: 参考百度网盘"永不放弃"模式 — 单片失败不中断整体,
    // 失败片进补齐队列, 退避后反复重试(最多 8 轮), 直到全部传完或用户取消
    let pendingParts = []
    for (let p = 1; p <= totalParts; p++) {
      if (!skipSet.has(p)) pendingParts.push(p)
    }
    let failedParts = []
    let round = 0
    while (pendingParts.length > 0) {
      failedParts = []
      for (let i = 0; i < pendingParts.length; i += MULTIPART_CONCURRENCY) {
        await waitIfPaused(control) // 暂停等待 / 取消立即抛 UPLOAD_CANCELLED
        const batch = pendingParts.slice(i, i + MULTIPART_CONCURRENCY)
        const results = await Promise.allSettled(batch.map((pn) => uploadOne(pn - 1)))
        results.forEach((r, j) => {
          if (r.status === 'rejected') {
            failedParts.push(batch[j])
            console.error('[CloudBase] 分片 ' + batch[j] + ' 失败(留待补齐轮):', (r.reason && r.reason.message) || r.reason)
          }
        })
        if (control.cancelled) throw Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' })
      }
      if (failedParts.length === 0) break // 全部成功
      round++
      if (round > 8) {
        throw new Error('分片 ' + failedParts.slice(0, 8).join(',') + ' 多次失败，已保留进度，可重新选择该文件续传')
      }
      pendingParts = failedParts
      status('retrying')
      await sleep(2000 * Math.min(round, 5)) // 轮间退避 2s/4s/6s/8s/10s, 等网络恢复
    }
    if (round > 0) status('resumed')
    donePartNumbers.sort((a, b) => a - b)
    // 2) 合并分片
    await waitIfPaused(control)
    const done = await call('storage.completeMultipart', { cloudPath, uploadId, partNumbers: donePartNumbers })
    if (!done.fileID) throw new Error('合并完成但未返回 fileID')
    return { fileID: done.fileID }
  } catch (e) {
    // 3) 失败/取消: 已传分片【保留在 COS】供下次断点续传 (COS 7 天后自动清理未完成分片)
    if (e && e.code === 'UPLOAD_CANCELLED') status('cancelling')
    throw e
  }
}

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
 * 通用 API 请求 (H5 端用 fetch 绕过 uni.request CORS 问题; 带 30s 超时防挂起)
 * externalSignal: 可选 AbortSignal — 上传取消/暂停时可中断"取签名"等云函数调用 (2026-08-30)
 */
async function apiRequest(payload, timeoutMs = 30000, externalSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onExtAbort = () => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExtAbort)
  }
  try {
    // 硬超时: 不依赖 abort 是否生效 (代理/VPN网络下 fetch 挂起时 abort 不 reject),
    // 到点必定 reject, 避免"取签名/合并分片"等云函数调用永久挂起拖垮整段上传 (2026-08-31)
    const hardRace = Promise.race([
      fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('云函数请求硬超时'), { code: 'HARD_TIMEOUT' })), timeoutMs + 3000)),
    ])
    const res = await hardRace
    const data = await res.json()
    return data
  } finally {
    clearTimeout(timer)
    if (externalSignal) externalSignal.removeEventListener('abort', onExtAbort)
  }
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
    // H5 端调用云函数需要身份, 尝试匿名登录 (失败/超时都不阻塞: 云函数网关调用不依赖前端登录态)
    try {
      const auth = cloudApp.auth()
      const withTimeout = (p, ms) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('匿名登录超时')), ms)),
      ])
      const state = await withTimeout(auth.getLoginState(), 10000)
      if (!state) {
        await withTimeout(auth.signInAnonymously(), 10000)
        console.log('[CloudBase] 匿名登录完成')
      }
    } catch (e) {
      console.warn('[CloudBase] 匿名登录跳过(超时或失败, 不影响网关调用)', e && e.message || e)
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
    uploadFile: async (filePath, cloudPath, onProgress, control = {}, onStatus, resume, fileObj) => {
      // H5: 图片 → canvas 压缩到 <80KB → base64 云函数中转 (云函数网关 body 限制 ~100KB)
      //      非图片 → 云函数 getUploadUrl → COS 直传; >3GB 大文件 → COS 分片上传
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
      // 非图片或 canvas 失败: 原始 base64 (仅图片兜底, 视频等非图片直接 COS 分片, 不读内存)
      // 1.5) 非图片(视频) → 一律走 COS 分片上传: 真实进度 + 暂停/取消 + 断点续传
      if (!isImage) {
        return uploadMultipartToCos(filePath, cloudPath, onProgress, control, onStatus, resume, fileObj)
      }
      if (isImage && !base64) {
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
      // 3) 降级: 直传 COS (增强版 - 增加详细错误诊断)
      console.log('[CloudBase] 准备获取上传凭证 cloudPath:', cloudPath)
      const meta = await new Promise((resolve, reject) => {
        uni.request({
          url: API_BASE,
          method: 'POST',
          data: { action: 'storage.getUploadUrl', data: { cloudPath } },
          timeout: 20000,
          success: (res) => {
            console.log('[CloudBase] getUploadUrl 响应:', JSON.stringify(res.data))
            if (res.data && res.data.status === 200) resolve(res.data.data || {})
            else reject(new Error((res.data && res.data.msg) || '获取上传凭证失败'))
          },
          fail: (err) => reject(new Error('获取上传凭证网络失败: ' + (err.errMsg || ''))),
        })
      })
      console.log('[CloudBase] 上传凭证原始数据:', JSON.stringify(meta))
      
      if (!meta || !meta.url) throw new Error(meta && meta.msg ? meta.msg : '上传凭证无效，缺少 URL')
      
      // 读取文件内容
      let body = filePath
      try {
        if (typeof fetch === 'function' && typeof filePath === 'string' && filePath.indexOf('blob:') === 0) {
          body = await fetch(filePath).then((r) => r.blob())
        }
      } catch (e) {
        console.warn('[CloudBase] blob 读取失败, 按原值上传', e)
      }
      
      // 打印将要发送到 COS 的关键字段（脱敏）
      console.log('[CloudBase] COS 直传参数预览:')
      console.log('  url:', meta.url ? meta.url.slice(0, 60) + '...' : '(无)')
      console.log('  token:', meta.token ? '(有)' : '(无)')
      console.log('  authorization(sig):', meta.authorization ? meta.authorization.slice(0, 30) + '...' : '(无)')
      console.log('  fileId:', meta.fileId || meta.cosFileId ? '(有)' : '(无)')
      console.log('  cloudPath:', cloudPath)
      
      const formData = new FormData()
      if (meta.authorization) formData.append('Signature', meta.authorization)
      if (meta.token) formData.append('x-cos-security-token', meta.token)
      if (meta.cosFileId) formData.append('x-cos-meta-fileid', meta.cosFileId)
      formData.append('key', cloudPath)
      formData.append('file', body, cloudPath.split('/').pop() || 'upload.bin')
      
      console.log('[CloudBase] 开始 POST 到 COS...')
      let resp
      try {
        resp = await fetch(meta.url, { method: 'POST', body: formData })
      } catch (fetchErr) {
        console.error('[CloudBase] fetch 调用异常:', fetchErr)
        throw new Error('COS 直传网络错误: ' + fetchErr.message + ' (请检查 COS bucket CORS 配置或网络连接)')
      }
      
      console.log('[CloudBase] COS 响应 status:', resp.status, resp.statusText)
      if (!resp.ok) {
        let msg = '上传失败 HTTP ' + resp.status
        try { msg = msg + ' ' + (await resp.text()).slice(0, 200) } catch (e2) {}
        console.error('[CloudBase] COS 上传失败详情:', msg)
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
