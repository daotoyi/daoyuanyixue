/**
 * 抖音小程序 · 支付
 *
 * 现状: 后端只实现了微信支付 (JSAPI / H5 / Native), 抖音小程序无法直接复用
 *      —— tt.requestPayment 需要抖音支付商户参数, 与微信商户体系不通。
 *
 * 首版策略: 非微信端统一降级为"跳转 H5 收银台", 即复用 club.zhenhesheng.cn/dy-api
 *      的微信 H5 支付, 用户在抖音内点"去支付"→ 复制/跳转浏览器完成微信支付。
 *      后续接入抖音支付时, 只需替换本文件的 preparePayment 实现。
 */

/** 是否支持抖音小程序原生支付 (待接入抖音商户后开启) */
export const NATIVE_PAY_SUPPORTED = false

/**
 * 支付方式可用性
 */
export function availablePayMethods() {
  return {
    balance: true,        // 元宝抵扣: 纯业务逻辑, 各端一致
    wechat: true,         // 跳 H5 收银台
    douyin: false,        // 原生抖音支付待接入
  }
}

/**
 * 准备支付参数
 * 抖音端当前走"跳转 H5 收银台", 返回 url 供 uni.navigateTo/复制链接
 * @returns {Promise<{mode:'h5'|'native', url?:string, payment?:object}>}
 */
export async function preparePayment(orderNo) {
  if (NATIVE_PAY_SUPPORTED) {
    // TODO: 接入抖音支付后, 调后端 douyin.prepay 返回 tt.requestPayment 所需参数
    throw Object.assign(new Error('抖音支付尚未接入'), { code: 'PAY_NOT_READY' })
  }
  return { mode: 'h5', orderNo }
}

/**
 * 拉起支付
 * 抖音端无原生支付能力时, 由 UI 层引导用户到 H5 收银台完成
 */
export async function requestPayment(prepay) {
  throw Object.assign(
    new Error('抖音端暂不支持直接支付, 请跳转 H5 收银台完成微信支付'),
    { code: 'PAY_REDIRECT_REQUIRED' }
  )
}

/**
 * 支付失败/取消的错误归类 (供 checkout 页统一处理)
 */
export function normalizePayError(e) {
  const code = (e && e.code) || ''
  if (code === 'PAY_CANCELLED') return { cancelled: true, message: '已取消支付' }
  if (code === 'PAY_REDIRECT_REQUIRED') return { cancelled: false, message: '请跳转收银台完成支付', redirect: true }
  if (code === 'PAY_NOT_READY') return { cancelled: false, message: '支付通道维护中, 请稍后再试' }
  return { cancelled: false, message: (e && e.message) || '支付失败' }
}