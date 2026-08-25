/**
 * 静态资源 URL 工具
 *
 * 设计原则 (2026-08-25 用户要求):
 *   小程序包不打包图片等静态资源, 全部放云服务器通过 URL 加载。
 *   src/static 内仅保留微信强制本地文件 (tabBar 图标等)。
 *
 * 云托管静态域名:
 *   https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com
 *
 * 使用: staticUrl('/static/logo.png') → 完整 URL
 *   传入路径以 /static/ 开头; 内部会统一拼接云托管域名。
 *   若已是完整 http(s) URL 则原样返回。
 */
const STATIC_CDN_BASE = 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com'

export function staticUrl(path) {
  if (!path) return ''
  if (/^(https?:|cloud:|data:)/.test(path)) return path
  // 兼容传入 'static/xxx' 或 '/static/xxx' 或 '/h5/static/xxx'
  let p = path
  if (p.startsWith('/')) p = p.slice(1)
  // 去掉可能的 /h5/ 前缀 (静态托管 /static 在根路径)
  p = p.replace(/^h5\//, '')
  return STATIC_CDN_BASE + '/' + p
}

/**
 * 带 origin 的 logo 绝对路径 (兼容 H5 旧逻辑; 现在统一走云托管)
 * 小程序端注意: image 组件 src 支持 https, 无需 downloadFile 白名单(仅 wx.downloadFile 需要)
 */
export const logoUrl = staticUrl('/static/logo.png')
