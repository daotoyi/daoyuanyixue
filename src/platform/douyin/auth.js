/**
 * 抖音小程序 · 登录态
 *
 * 微信端靠 getOpenId 云函数拿 OPENID;抖音没有 wx.cloud, 也没有对应开放能力,
 * 首版降级为"手机号 + 密码/验证码"登录 (后端 user.login / auth.sendCode 零改动)。
 * getLoginState 返回 null 表示"无平台级登录态",上层据此走手机号登录。
 */

/**
 * 获取登录态
 * @returns {Promise<null>} 抖音端恒为 null (无平台绑定态)
 */
export async function getLoginState() {
  return null
}

/**
 * 是否支持"平台一键登录"
 * 抖音端小程序基座不支持微信式一键登录, 返回 false 由UI 决定降级展示
 */
export function supportsOneTapLogin() {
  return false
}

/**
 * 平台登录能力描述 (供设置页/登录页展示)
 */
export function describeLogin() {
  return {
    platform: 'mp-toutiao',
    oneTap: false,
    phoneLogin: true,
    tip: '请使用手机号 + 密码登录, 或注册新账号',
  }
}