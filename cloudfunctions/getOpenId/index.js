/**
 * 云函数: getOpenId
 * 获取微信小程序用户 OPENID (免登录)
 *
 * 微信小程序中 wx.cloud 会自动注入 OPENID 到 context
 */

const cloud = require('wx-server-sdk')

// 初始化 (微信小程序环境)
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

/**
 * 云函数入口
 * @param {object} event - 调用参数
 * @param {object} context - 运行上下文 (含 OPENID)
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    env: wxContext.ENV,
    timestamp: Date.now(),
  }
}
