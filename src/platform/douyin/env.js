/**
 * 抖音小程序 · 环境配置
 *
 * 独立于主链路 (src/api/*), 避免抖音专属常量污染微信/H5 代码。
 * 所有值与 CloudBase 环境 cloud1-d8gs2k9m311f7272f 绑定。
 */

/** CloudBase 环境 ID (与 src/api/cloudbase.js 保持一致) */
export const ENV_ID = 'cloud1-d8gs2k9m311f7272f'
export const REGION = 'ap-shanghai'

/**
 * 云函数网关地址 (H5/小程序 通用)
 *注意子域: 是 `app.tcloudbase.com`, 不是 manifest._tcb_domains 里列的
 * `tcloudbaseapp.com`(静态托管域), 两者不同, 抖音后台配合法域名须用本域。
 */
export const API_BASE =
  'https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api'

/**
 * 自定义域名 (club.zhenhesheng.cn) —— 备用通道
 * 主通道网关异常时可切换; 注意该域名下 H5 应用挂在 /h5/, dy-api 挂在 /dy-api。
 */
export const API_BASE_FALLBACK = 'https://club.zhenhesheng.cn/dy-api'

/**
 * 云函数网关请求体上限 ≈100KB, 留约 10KB 余量给 JSON 包裹字段。
 * 2026-08-31 实测: base64 100,184 → 200 成功; 109,908 → 413 EXCEED_MAX_PAYLOAD_SIZE。
 * 勿调高(调高会形成 413 死区)。
 */
export const BASE64_GATEWAY_LIMIT = 90000

/** 抖音端图片压缩质量 (1-100) */
export const IMAGE_QUALITY = 80

/** 网关 / COS 签名请求超时 (ms) */
export const SIGN_TIMEOUT = 20000

/** 普通业务请求超时 (ms) */
export const API_TIMEOUT = 15000

/** 平台标识: 写入订单 platform 字段做渠道分析 */
export const PLATFORM_TAG = 'mp-toutiao'

/** 抖音端可用的图片扩展名 */
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i
/** 业务上按路径判定为图片的场景 (与 H5 分支保持同一套规则) */
const IMAGE_PATH_HINT = ['covers/', 'images/', 'avatar', 'avatars', 'posters/', 'thumb']

/** 判断某个 cloudPath 是否为图片 */
export function isImagePath(cloudPath) {
  const p = String(cloudPath || '')
  if (IMAGE_EXT.test(p)) return true
  return IMAGE_PATH_HINT.some((k) => p.includes(k))
}