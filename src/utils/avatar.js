/**
 * 头像/图片 URL 解析工具
 * cloud:// fileID → 可访问临时 URL (H5/后台 image 无法直接渲染 cloud://)
 * https/http 直链原样返回; 带缓存避免重复转换
 */
import { getStorage } from '../api/cloudbase'

const _cache = {}

export function isCloudFile(src) {
  return typeof src === 'string' && src.startsWith('cloud://')
}

/**
 * 转换 cloud:// → 可访问 URL (异步)
 * @param {string} src 原始 src (cloud:// / https / 空)
 * @returns {Promise<string>} 可访问 URL 或空
 */
export async function resolveCloudUrl(src) {
  if (!src) return ''
  if (typeof src !== 'string') return ''
  if (!isCloudFile(src)) return src // https/本地路径原样
  if (_cache[src]) return _cache[src]
  try {
    const storage = await getStorage()
    if (!storage || !storage.getTempFileURL) return ''
    const res = await storage.getTempFileURL([src])
    const list = (res && res.fileList) || []
    const url = (list[0] && list[0].tempFileURL) || ''
    if (url) _cache[src] = url
    return url || ''
  } catch (e) {
    console.error('[avatar] 转换失败', e)
    return ''
  }
}

/**
 * 批量转换 (用于列表数据)
 * @param {Array} list 数据数组
 * @param {string} field 头像字段名 (默认 avatar)
 * @param {Function} keyFn 可选: 取每项的转换标识 (默认取 field 值)
 * @returns {Promise<Array>} 转换后的新数组 (转换成功的项替换 field)
 */
export async function resolveCloudList(list, field = 'avatar', keyFn) {
  if (!Array.isArray(list) || !list.length) return list
  const need = list.filter((item) => item && isCloudFile(item[field]))
  if (!need.length) return list
  const storage = await getStorage()
  if (!storage || !storage.getTempFileURL) return list
  try {
    const fileList = need.map((item) => item[field])
    const res = await storage.getTempFileURL(fileList)
    const urlMap = {}
    ;((res && res.fileList) || []).forEach((f, i) => {
      if (f.tempFileURL) {
        const key = keyFn ? keyFn(need[i]) : need[i][field]
        urlMap[key] = f.tempFileURL
        _cache[need[i][field]] = f.tempFileURL
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
