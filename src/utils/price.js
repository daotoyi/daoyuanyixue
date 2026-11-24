/**
 * 价格工具: 兼容后台可能填写的 "免费" 文本 / 数字 0 / "0" / 空值
 * 统一视为免费订单
 */
export function isFreePrice(p) {
  const s = String(p ?? '').trim()
  if (s === '免费') return true
  const n = Number(s.replace(/[^\d.\-]/g, ''))
  return !isNaN(n) && n <= 0
}

/** 解析价格数值 (非数字/免费 → 0) */
export function priceNum(p) {
  const s = String(p ?? '').trim()
  if (s === '免费') return 0
  const n = Number(s.replace(/[^\d.\-]/g, ''))
  return isNaN(n) ? 0 : n
}

/** 显示价格: 免费返回"免费", 否则 ¥xx */
export function fmtPrice(p) {
  return isFreePrice(p) ? '免费' : '¥' + p
}

/* ===== 元宝账口径 (2026-11-24) =====
   规则: 元宝是充值时已计入营业额的预付额度, 消费时【不计入实际营业额】,
   所以订单 total_price(实付现金) 为 0 是正确的; 但必须显示实际支付的元宝金额,
   并由后台「元宝账本」单独计账, 不与现金混算。
   - 新订单: balance_used_points = 实际扣减元宝数 (1 元 = 10 元宝)
   - 历史订单(旧 1:1 口径): balance_used 数值即元宝数, 不再 ×10 */
export const POINTS_PER_YUAN = 10

export function isYuanbaoPayOrder(o) {
  if (!o) return false
  return String(o.pay_method || '').includes('余额')
    || Number(o.balance_used) > 0
    || Number(o.balance_used_points) > 0
}

export function orderPoints(o) {
  if (!o) return 0
  const p = Number(o.balance_used_points)
  if (Number.isFinite(p) && p > 0) return Math.round(p * 100) / 100
  return Math.round((Number(o.balance_used) || 0) * 100) / 100
}

export function orderRefundPoints(o) {
  if (!o) return 0
  const p = Number(o.refund_balance_points)
  if (Number.isFinite(p) && p > 0) return Math.round(p * 100) / 100
  const a = Number(o.refund_balance_amount)
  if (Number.isFinite(a) && a > 0) return Math.round(a * 100) / 100
  // 仅历史老订单兜底; 新订单无退款明细=当时未真退, 不虚增进账
  if (o.status === '已退款' && isYuanbaoPayOrder(o) && !Number(o.balance_used_points)) return orderPoints(o)
  return 0
}

export function fmtPoints(v) {
  const n = Number(v) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/** 订单金额展示: 现金(计入营业) 与 元宝(单独计账) 分开返回 */
export function orderAmount(o) {
  const cash = Number(o && o.total_price) || 0
  const points = orderPoints(o)
  return { cash, points, hasPoints: isYuanbaoPayOrder(o) && points > 0 }
}

/** 商品原价合计 (元宝支付单 total_price=0, 商品总额须按 items 原价算, 不能显示"免费") */
export function goodsTotalOf(o) {
  const items = (o && Array.isArray(o.items)) ? o.items : []
  return Math.round(items.reduce((s, i) => s + (Number(i && i.price) || 0) * (Number(i && i.qty) || 1), 0) * 100) / 100
}

/** 订单合计文案: 纯现金 → ¥x; 元宝支付 → x 元宝 (混合支付两者并列) */
export function orderTotalText(o) {
  const pts = orderPoints(o)
  const cash = Number(o && o.total_price) || 0
  if (pts > 0) {
    return (cash > 0 ? '¥' + cash.toFixed(2) + ' + ' : '') + fmtPoints(pts) + ' 元宝'
  }
  return fmtPrice(o && o.total_price)
}
