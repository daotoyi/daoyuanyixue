/**
 * 已购课程缓存 (模块级单例)
 * 解决: 进入已购课程详情页时, 因 getMyCourses 异步请求(3-4s) 未返回,
 *       默认按"未购买"渲染出"价格+立即购买", 数秒后才切换为"已购买"。
 * 方案: 缓存已购课程 id 集合, App 启动(已登录)时预热,
 *       详情页 onLoad 先用缓存同步判定初值(命中则立即可见"已购买"), 请求回来再校正。
 */
import { getMyCourses } from '../api/api'

const TTL = 60 * 1000 // 缓存有效期 60s (避免长期不刷新)

let cache = { ids: null, ts: 0, loading: null, uid: null }

function normalize(list) {
  const s = new Set()
  ;(list || []).forEach((c) => {
    if (c && c.id) s.add(c.id)
  })
  return s
}

/* 返回当前有效缓存的 id 集合; 过期/未加载返回 null */
export function getCachedPurchasedIds() {
  if (!cache.ids) return null
  if (Date.now() - cache.ts > TTL) return null
  return cache.ids
}

/* 同步判断: 缓存命中且含该课程 → true; 否则 false (不触发网络请求) */
export function isPurchasedSync(cid) {
  const ids = getCachedPurchasedIds()
  return ids ? ids.has(cid) : false
}

/* 预热/校正: 命中有效缓存则秒回; 否则发请求填充缓存; 进行中复用同一 Promise */
export function ensurePurchased(uid) {
  if (!uid) return Promise.resolve(null)
  if (cache.ids && cache.uid === uid && Date.now() - cache.ts <= TTL) {
    return Promise.resolve(cache.ids)
  }
  if (cache.loading) return cache.loading
  cache.uid = uid
  cache.loading = getMyCourses({ uid })
    .then((list) => {
      cache.ids = normalize(list)
      cache.ts = Date.now()
      cache.loading = null
      return cache.ids
    })
    .catch((e) => {
      cache.loading = null
      return null
    })
  return cache.loading
}

/* 登录失效/切换账号时清空, 防止串号读到旧的已购集合 */
export function clearPurchasedCache() {
  cache = { ids: null, ts: 0, loading: null, uid: null }
}
