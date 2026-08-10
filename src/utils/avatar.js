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
 * 微信小程序: image 组件原生支持 cloud:// fileID 渲染, 无需转换 (直接原样返回)
 * H5/App: 需要转 https URL (且 H5 域名需在控制台白名单/公网可访问)
 * @param {string} src 原始 src (cloud:// / https / 空)
 * @returns {Promise<string>} 可访问 URL 或空
 */
export async function resolveCloudUrl(src) {
  if (!src || typeof src !== 'string') return ''
  if (!isCloudFile(src)) return src // https/本地路径原样
  // #ifdef MP-WEIXIN
  return src // 小程序 image 原生渲染 cloud://, 无需转 https (https 域名还需 downloadFile 白名单)
  // #endif
  // #ifndef MP-WEIXIN
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
  // #endif
}

/**
 * 批量转换 (用于列表数据, 走云函数一次性转换, 按 fileID 精确匹配防止错位)
 * 微信小程序: image 原生渲染 cloud://, 直接原样返回不转换
 * @param {Array} list 数据数组
 * @param {string} field 头像字段名 (默认 avatar)
 * @returns {Promise<Array>} 转换后的新数组 (转换成功的项替换 field)
 */
export async function resolveCloudList(list, field = 'avatar') {
  if (!Array.isArray(list) || !list.length) return list
  // #ifdef MP-WEIXIN
  return list // 小程序原生支持 cloud://, 无需转换
  // #endif
  // #ifndef MP-WEIXIN
  const need = list.filter((item) => item && isCloudFile(item[field]))
  if (!need.length) return list
  try {
    const fileList = need.map((item) => item[field])
    const res = await fileUrl({ fileList })
    // 按 fileID 匹配 (服务端返回顺序可能不一致, 不能按 index 对应!)
    const urlMap = {}
    ;((res && res.list) || []).forEach((f) => {
      if (f.url && f.fileID) {
        urlMap[f.fileID] = f.url
        _cache[f.fileID] = f.url
      }
    })
    return list.map((item) => {
      const src = item[field]
      return urlMap[src] ? { ...item, [field]: urlMap[src] } : item
    })
  } catch (e) {
    console.error('[avatar] 批量转换失败', e)
    return list
  }
  // #endif
}
