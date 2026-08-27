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
