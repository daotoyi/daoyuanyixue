/**
 * 抖音小程序 · 网关请求封装
 *
 * 只依赖标准小程序 API (uni.request / tt.request), 不碰 fetch / FormData /
 * Blob / document / canvas —— 这些在抖音运行环境里全部不存在。
 *
 * 统一响应约定: { status, data, msg }
 */
import { API_BASE, API_BASE_FALLBACK, API_TIMEOUT, SIGN_TIMEOUT } from './env'

/** 主通道是否已经失败过 (失败一次后本次会话内直接走备用域名, 避免反复超时) */
let _fallbackOnly = false

/** 标记主通道不可用 */
export function markPrimaryFailed() {
  _fallbackOnly = true
}

function currentBase() {
  return _fallbackOnly ? API_BASE_FALLBACK : API_BASE
}

/**
 * POST 一个 action到云函数网关
 * @param {string} action  action 名, 如 'storage.uploadBase64'
 * @param {object} data   业务参数
 * @param {object} opts   { timeout, retries, silentFallback }
 * @returns {Promise<any>} res.data (业务数据)
 */
export async function callGateway(action, data = {}, opts = {}) {
  const { timeout = API_TIMEOUT, retries = 1, silentFallback = false } = opts
  let lastErr = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await rawPost(currentBase(), action, data, timeout)
    } catch (e) {
      lastErr = e
      // 主通道网络层失败 → 切备用域名重试一次
      if (!_fallbackOnly && isNetworkError(e)) {
        markPrimaryFailed()
        continue
      }
      if (attempt >= retries) break
    }
  }
  throw lastErr || new Error('网关请求失败')
}

/**
 * 单次 POST (不走重试/降级), 供需要精细控制的场景使用
 */
export function rawPost(base, action, data, timeout = API_TIMEOUT) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: base,
      method: 'POST',
      data: { action, data },
      timeout,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const body = res.data
        if (body && body.status === 200) {
          resolve(body.data)
          return
        }
        // 业务错误: 直接抛, 不重试 (重试无意义)
        reject(new Error((body && body.msg) || `服务异常(${res.statusCode})`))
      },
      fail: (err) => {
        const e = new Error('网关请求失败: ' + (err.errMsg || ''))
        e.isNetwork = true
        reject(e)
      },
    })
  })
}

/** 判断是否为网络层错误 (可降级重试), 业务错误不重试 */
function isNetworkError(e) {
  return !!(e && (e.isNetwork || /网关请求失败|timeout|fail/i.test(e.message || '')))
}

/**
 * 取云存储文件的临时访问URL (后端 app.fileUrl action 内部调 getTempFileURL)
 * 抖音端无 CloudBase SDK, 读图必须走这条网关通道。
 * @param {string|Array} fileList cloud:// fileID 或其数组
 * @returns {Promise<string|Array>}
 */
export async function getTempFileURL(fileList) {
  const isSingle = typeof fileList === 'string'
  const list = isSingle ? [fileList] : (fileList || [])
  const valid = list.filter((f) => typeof f === 'string' && f.startsWith('cloud://'))
  if (!valid.length) return isSingle ? fileList : list

  const res = await callGateway('app.fileUrl', { fileList: valid }, { timeout: SIGN_TIMEOUT })
  const map = (res && (res.urlMap || res.fileUrlList)) || {}

  const resolveOne = (f) => {
    if (typeof f === 'string' && /^https?:\/\//.test(f)) return f
    return map[f] || f
  }
  return isSingle ? resolveOne(valid[0]) : list.map(resolveOne)
}