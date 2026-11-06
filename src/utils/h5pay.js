/**
 * H5 手机端微信支付兜底 (2026-11-06)
 *
 * 背景: 商户号「H5 支付」产品权限处于「预开通中」时, wxpayH5 下单会被微信拒绝
 *       (报「商户号该产品权限预开通中, 请等待产品开通后重试」), 手机浏览器无法付款。
 * 兜底: 降级为「跳转微信小程序完成支付」—— 复用后端 pay.wxmpScheme 生成的 URL Scheme,
 *       在手机浏览器里可唤起微信并打开订单详情页, 用户在小程序内用 JSAPI 完成付款。
 *
 * 约束: 仅供 H5 端调用; 其他端已有各自支付通道, 不要用这里。
 */

/** 是否在微信内置浏览器内 (微信禁止自己唤起自己, scheme 会被拦截) */
export function isInWeChatBrowser() {
  // #ifdef H5
  try {
    return /MicroMessenger/i.test((navigator && navigator.userAgent) || '')
  } catch (e) {
    return false
  }
  // #endif
  // #ifndef H5
  return false
  // #endif
}

/**
 * 判断错误是否属于「H5 支付产品未开通」类可兜底错误
 * 命中则说明换通道仍有救, 值得走小程序兜底; 其它错误(金额/参数/风控)直接提示原错误更准确。
 */
export function isH5PayUnavailable(msg) {
  const s = String(msg || '')
  return /预开通|未开通|产品权限|权限.{0,4}开通|H5\s*支付|产品.*开通|NO_AUTH|PRODUCT/.test(s)
}

/**
 * 用小程序 URL Scheme 兜底支付
 * @param {(orderNo: string) => Promise<any>} wxmpSchemeFn  api.js 的 wxmpScheme
 * @param {string} orderNo 订单号
 * @returns {Promise<{ok: boolean, inWechat?: boolean, free?: boolean, reason?: string}>}
 */
export async function payByWxmpScheme(wxmpSchemeFn, orderNo) {
  // #ifdef H5
  try {
    const sc = await wxmpSchemeFn(orderNo)
    // 免费订单后端会直接完成, 无需跳转
    if (sc && sc.free) return { ok: true, free: true }
    if (!sc || !sc.openlink) {
      return { ok: false, reason: (sc && sc.msg) || '小程序跳转链接生成失败' }
    }
    if (isInWeChatBrowser()) {
      // 微信内没法唤起微信小程序, 交给调用方给文字指引
      return { ok: false, inWechat: true, reason: '微信内无法自动跳转小程序', openlink: sc.openlink }
    }
    window.location.href = sc.openlink
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: (e && e.message) || '跳转小程序失败' }
  }
  // #endif
  // #ifndef H5
  return { ok: false, reason: '仅 H5 端支持该兜底' }
  // #endif
}

/**
 * 兜底失败时的统一提示文案
 * 分两类: 微信内(需用户手动操作) / 微信外(跳转失败)
 */
export function wxmpFallbackTip(res) {
  if (res && res.inWechat) {
    return '当前微信内无法跳转小程序支付，请点击右上角「···」→「在浏览器打开」后重试，或直接在微信里搜索小程序「道元易学」进入订单支付'
  }
  return 'H5 支付暂不可用，跳转小程序支付失败：' + ((res && res.reason) || '未知原因')
}
