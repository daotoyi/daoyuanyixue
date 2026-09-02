/* 课程详情内存缓存 (2026-09-02)
   目的: 详情页 → 播放页 不必重复请求同一门课; 播放页可【先用缓存立即渲染视频】, 再后台静默刷新。
   - 只在内存(不做持久化), 页面栈存活期间有效, 关闭 App 自然失效
   - 带 TTL 防止长期读到陈旧数据
   - 详情页保存成功/上传视频后若需强一致, 可调用 clearCourseCache(id) */

const cache = new Map()
const TTL = 10 * 60 * 1000 // 10 分钟

export function setCourseCache(course) {
  try {
    if (!course || course.id === undefined || course.id === null) return
    cache.set(String(course.id), { data: course, ts: Date.now() })
  } catch (e) { /* 忽略 */ }
}

export function getCourseCache(id) {
  try {
    const key = String(id)
    const it = cache.get(key)
    if (!it) return null
    if (Date.now() - it.ts > TTL) {
      cache.delete(key)
      return null
    }
    return it.data
  } catch (e) {
    return null
  }
}

export function clearCourseCache(id) {
  try {
    if (id === undefined || id === null) cache.clear()
    else cache.delete(String(id))
  } catch (e) { /* 忽略 */ }
}
