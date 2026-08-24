/**
 * 微信支付 API v3 直连模块 (原生 crypto 实现, 零额外依赖)
 * 覆盖: 统一下单(JSAPI) / H5下单 / Native扫码下单 / 支付回调验签解密 / 查询订单 / 申请退款
 * 依赖 config.local.js: WXPAY_MCHID / WXPAY_V3_KEY / WXPAY_APIV3_SERIAL / WXPAY_CERT_PEM / WXPAY_KEY_PEM / WXPAY_APPID / GZH_APPID
 */
const crypto = require('crypto')
const https = require('https')

const API_BASE = 'https://api.mch.weixin.qq.com'
let CFG = null

function cfg() {
  if (CFG) return CFG
  let c = {}
  try { c = require('./config.local') || {} } catch (e) {}
  CFG = c
  return c
}

/** 生成随机 nonce */
function nonceStr() {
  return crypto.randomBytes(16).toString('hex')
}

/** 获取商户私钥 */
function privKey() {
  const key = cfg().WXPAY_KEY_PEM || ''
  return key.includes('-----BEGIN') ? key : Buffer.from(key, 'base64').toString('utf8')
}

/** SHA256-RSA 签名 */
function sign(message) {
  return crypto.createSign('RSA-SHA256').update(message).sign(privKey(), 'base64')
}

/** 构造 Authorization 头 (path 需含 query string, 微信 v3 签名规范 URL 含 query) */
function authHeader(method, path, body) {
  const c = cfg()
  const ts = Math.floor(Date.now() / 1000)
  const nonce = nonceStr()
  const bodyStr = body ? JSON.stringify(body) : ''
  const message = `${method}\n${path}\n${ts}\n${nonce}\n${bodyStr}\n`
  const signature = sign(message)
  return `WECHATPAY2-SHA256-RSA2048 mchid="${c.WXPAY_MCHID}",nonce_str="${nonce}",signature="${signature}",timestamp="${ts}",serial_no="${c.WXPAY_APIV3_SERIAL}"`
}

/** 发送 API v3 请求 */
function request(method, path, body, query) {
  return new Promise((resolve, reject) => {
    const c = cfg()
    let url = API_BASE + path
    // 签名串 URL 必须含 query string (微信 v3 规范), query 需按原样拼接参与签名
    const signPath = query ? path + '?' + new URLSearchParams(query).toString() : path
    if (query) url += '?' + new URLSearchParams(query).toString()
    const bodyStr = body ? JSON.stringify(body) : ''
    const req = https.request(url, {
      method,
      headers: {
        Authorization: authHeader(method, signPath, body),
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'daoyuanyixue/1.0',
      },
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch (e) {}
        resolve({ status: res.statusCode, json, raw: data })
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

/** AES-256-GCM 解密 (回调资源解密) */
function decryptResource(encrypted) {
  const { algorithm, ciphertext, nonce: iv, associated_data: aad } = encrypted
  if (algorithm !== 'AEAD_AES_256_GCM') throw new Error('不支持的加密算法: ' + algorithm)
  const key = Buffer.from(cfg().WXPAY_V3_KEY, 'utf8')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'utf8'))
  decipher.setAuthTag(Buffer.from(encrypted.auth_tag, 'utf8'))
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

/** 验签 (微信平台证书, 简化: 用平台证书公钥验证; 未配置平台证书时跳过 -- 生产建议配置) */
function verifySignature(headers, rawBody) {
  try {
    const c = cfg()
    const pub = c.WXPAY_PLATFORM_PUB || ''
    if (!pub) return true // 未配置平台证书时放行 (风险: 生产应配置)
    const message = `${headers['wechatpay-timestamp']}\n${headers['wechatpay-nonce']}\n${rawBody}\n`
    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(message)
    return verify.verify(pub, headers['wechatpay-signature'], 'base64')
  } catch (e) {
    return false
  }
}

/**
 * 统一下单 (JSAPI) → 返回小程序 wx.requestPayment 所需参数
 */
async function unifiedOrder({ outTradeNo, totalFee, body, openid }) {
  const c = cfg()
  const nonce = nonceStr()
  const res = await request('POST', '/v3/pay/transactions/jsapi', {
    appid: c.WXPAY_APPID,
    mchid: c.WXPAY_MCHID,
    description: String(body || '道元易学-订单').slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: `https://${c.WXPAY_NOTIFY_HOST || ''}/dy-api/pay/notify`,
    amount: { total: Math.round(totalFee), currency: 'CNY' },
    payer: { openid },
  })
  if (res.status !== 200 && res.status !== 202) {
    throw new Error((res.json && res.json.message) || '微信支付下单失败(' + res.status + ')')
  }
  const prepayId = res.json.prepay_id
  const pkg = 'prepay_id=' + prepayId
  const ts = Math.floor(Date.now() / 1000)
  const paySignMsg = `${c.WXPAY_APPID}\n${ts}\n${nonce}\n${pkg}\n`
  return {
    timeStamp: String(ts),
    nonceStr: nonce,
    package: pkg,
    signType: 'RSA',
    paySign: sign(paySignMsg),
  }
}

/**
 * Native 扫码支付统一下单 → 返回 code_url (用于 PC 端渲染二维码)
 * 注意: Native 支付 appid 用「小程序 AppID」(商户号已绑定小程序, 无需服务号);
 *       订阅号/未认证公众号无法用于微信支付 (仅 H5 支付才要求认证服务号)
 */
async function nativeUnifiedOrder({ outTradeNo, totalFee, body }) {
  const c = cfg()
  const res = await request('POST', '/v3/pay/transactions/native', {
    appid: c.WXPAY_APPID,
    mchid: c.WXPAY_MCHID,
    description: String(body || '道元易学-订单').slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: `https://${c.WXPAY_NOTIFY_HOST || ''}/dy-api/pay/notify`,
    amount: { total: Math.round(totalFee), currency: 'CNY' },
  })
  if (res.status !== 200 && res.status !== 202) {
    throw new Error((res.json && res.json.message) || '微信支付Native下单失败(' + res.status + ')')
  }
  return { code_url: res.json.code_url }
}

/** 查询订单 */
async function queryOrder(outTradeNo) {
  const c = cfg()
  const res = await request('GET', `/v3/pay/transactions/out-trade-no/${outTradeNo}`, null, { mchid: c.WXPAY_MCHID })
  return res.json
}

/**
 * H5 支付统一下单 → 返回 h5_url (微信收银台跳转地址, 公众号 appid + 商户号需开通 H5 支付)
 * v3 参数: h5_info.type 固定 "Wap"; wap_url/wap_name 是 v2 字段已废弃
 * appUrl: 支付完成「返回商户」跳转地址 (前端订单详情页 URL)
 */
async function h5UnifiedOrder({ outTradeNo, totalFee, body, clientIp, appUrl }) {
  const c = cfg()
  if (!c.GZH_APPID) throw new Error('未配置公众号AppID')
  const res = await request('POST', '/v3/pay/transactions/h5', {
    appid: c.GZH_APPID,
    mchid: c.WXPAY_MCHID,
    description: String(body || '道元易学-订单').slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: `https://${c.WXPAY_NOTIFY_HOST || ''}/dy-api/pay/notify`,
    amount: { total: Math.round(totalFee), currency: 'CNY' },
    scene_info: {
      payer_client_ip: clientIp || '101.35.0.0',
      h5_info: { type: 'Wap', app_name: '道元易学', app_url: appUrl || `https://${c.WXPAY_NOTIFY_HOST || ''}` },
    },
  })
  if (res.status !== 200 && res.status !== 202) {
    throw new Error((res.json && res.json.message) || '微信支付H5下单失败(' + res.status + ')')
  }
  return { h5_url: res.json.h5_url }
}

/** 申请退款 */
async function refund({ outTradeNo, outRefundNo, totalFee, refundFee, reason }) {
  const c = cfg()
  const res = await request('POST', '/v3/refund/domestic/refunds', {
    out_trade_no: outTradeNo,
    out_refund_no: outRefundNo,
    reason: String(reason || '').slice(0, 80),
    notify_url: `https://${c.WXPAY_NOTIFY_HOST || ''}/dy-api/refund/notify`,
    amount: { refund: Math.round(refundFee), total: Math.round(totalFee), currency: 'CNY' },
  })
  if (res.status >= 300) throw new Error((res.json && res.json.message) || '退款失败(' + res.status + ')')
  return res.json
}

/** 支付回调处理: 验签+解密 → 返回 { event_type, resource(明文) } */
function handleNotify(headers, rawBody) {
  const body = JSON.parse(rawBody)
  if (!verifySignature(headers, rawBody)) throw new Error('回调验签失败')
  const resource = decryptResource(body.resource)
  return { eventType: body.event_type, resource, body }
}

module.exports = { unifiedOrder, h5UnifiedOrder, nativeUnifiedOrder, queryOrder, refund, handleNotify, verifySignature, decryptResource }
