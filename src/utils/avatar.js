/**
 * 头像/图片 URL 解析工具
 * cloud:// fileID → 可访问 URL (通过云函数服务端 getTempFileURL, 各端通用可靠)
 * https/http 直链原样返回; 带缓存避免重复转换
 */
import { fileUrl } from '../api/api'

const _cache = {}

export function isCloudFile(src) {
  return typeof src === 'string' && src.startsWith('cloud://')
}

/**
 * 转换 cloud:// → 可访问 URL (异步, 走云函数服务端)
 * @param {string} src 原始 src (cloud:// / https / 空)
 * @returns {Promise<string>} 可访问 URL 或空
 */
export async function resolveCloudUrl(src) {
  if (!src || typeof src !== 'string') return ''
  if (!isCloudFile(src)) return src // https/本地路径原样
  if (_cache[src]) return _cache[src]
  try {
    const res = await fileUrl({ fileList: [src] })
    const url = (res && res.list && res.list[0] && res.list[0].url) || ''
    if (url) _cache[src] = url
    return url || ''
  } catch (e) {
    console.error('[avatar] 转换失败', e)
    return ''
  }
}

/**
 * 批量转换 (用于列表数据, 走云函数一次性转换)
 * @param {Array} list 数据数组
 * @param {string} field 头像字段名 (默认 avatar)
 * @param {Function} keyFn 可选: 取每项的转换标识 (默认取 field 值)
 * @returns {Promise<Array>} 转换后的新数组 (转换成功的项替换 field)
 */
export async function resolveCloudList(list, field = 'avatar', keyFn) {
  if (!Array.isArray(list) || !list.length) return list
  const need = list.filter((item) => item && isCloudFile(item[field]))
  if (!need.length) return list
  try {
    const fileList = need.map((item) => item[field])
    const res = await fileUrl({ fileList })
    const urlMap = {}
    ;((res && res.list) || []).forEach((f, i) => {
      if (f.url) {
        const key = keyFn ? keyFn(need[i]) : need[i][field]
        urlMap[key] = f.url
        _cache[need[i][field]] = f.url
      }
    })
    return list.map((item) => {
      const key = keyFn ? keyFn(item) : item[field]
      return urlMap[key] ? { ...item, [field]: urlMap[key] } : item
    })
  } catch (e) {
    console.error('[avatar] 批量转换失败', e)
    return list
  }
}
