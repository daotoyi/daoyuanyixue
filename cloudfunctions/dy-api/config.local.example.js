/**
 * 云函数配置模板 — 复制为 config.local.js 后填入真实值
 *   cp config.local.example.js config.local.js
 *
 * config.local.js 已被 .gitignore, 不会入库; 本模板仅说明字段, 不含任何真实密钥。
 */

module.exports = {
  /* ==================== 微信(已配置) ==================== */
  WXPAY_APPID: 'wx3ec1337aae9ace3c',
  WXPAY_MCHID: '',
  WXPAY_V3_KEY: '',
  WXPAY_APIV3_SERIAL: '',
  WXPAY_CERT_PEM: '',
  WXPAY_KEY_PEM: '',
  // 公众号 AppSecret (手机号授权/模板消息等需要)
  WX_APPSECRET: '',

  /* ==================== 抖音小程序: 手机号一键登录 ====================
     前端 button open-type=getPhoneNumber 回调拿到动态令牌 code 后,
     由 user.douyinPhoneLogin 路由消费换取手机号。

     平台侧前置条件(代码无法代做, 缺一则授权拿不到数据):
       1. 抖音开放平台 → 小程序 → 开发配置 → 配置「应用公私钥」。
          未配置时前端回调的 code 为空字符串, 表现为"点了授权但没反应"。
          公钥填后台, 私钥填下面的 DY_APP_PRIVATE_KEY。
       2. 小程序需为**企业主体**, 且「获取手机号」能力已申请并通过审核,
          否则回调 errno 为 no permission。
       3. 小程序基础库 ≥ 3.51.0 才会返回 code(旧版返回 encryptedData+iv)。 */
  // 抖音小程序 AppID (公开值, 非密钥)
  DY_CLIENT_KEY: 'tted9b9b2673e23d3f01',
  // 抖音小程序 AppSecret — 必填, 用于换 client_token
  DY_CLIENT_SECRET: '',
  // 应用私钥 (PEM, PKCS8 格式; 与后台配置的应用公钥成对)
  // 填多行 PEM 时用反引号包裹, 注意保留换行
  DY_APP_PRIVATE_KEY: '',
}
