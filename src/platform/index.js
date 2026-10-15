/**
 * 平台专属适配层
 *
 * 每个子目录对应一个小程序/App 平台, 内部代码通过条件编译隔离:
 *   douyin/  抖音小程序 (mp-toutiao)
 *
 * 约定:
 *   1. 平台目录只依赖 uni.* 标准 API, 不碰 fetch / FormData / Blob / document / canvas
 *      (非浏览器小程序环境这些全局对象不存在, 用了必崩)
 *   2. 对外暴露的接口签名必须与主链路 (src/api/cloudbase.js) 保持一致, 保证上层零改动
 *   3. 新增平台时在此新建同级目录, 并在 src/api/cloudbase.js 加一处条件编译分支
 */
export const PLATFORMS = {
  'mp-toutiao': () => import('./douyin/index.js'),
}