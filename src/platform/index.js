/**
 * 平台专属适配层
 *
 * 每个子目录对应一个小程序/App 平台, 内部代码通过条件编译隔离:
 *   douyin/  抖音小程序 (mp-toutiao)
 *
 * 关于"抖音为什么叫 toutiao":
 *   uni-app 的平台标识是编译期内置的固定字符串, 抖音对应 mp-toutiao
 *   (取字节头条系旧称 toutiao/tiktok, 与开放平台域名 open-douyin.com 不同源)。
 *   **不可改成 mp-douyin** —— @dcloudio/uni-mp-douyin 包不存在 (npm 404),
 *   平台定义表 uni-cli-shared/dist/platform.js 仅收录 9 个平台, 其中无 douyin:
 *   mp-alipay / mp-baidu / mp-jd / mp-kuaishou / mp-lark / mp-qq / mp-toutiao /
 *   mp-weixin / mp-xhs
 *   条件编译指令 #ifdef MP-TOUTIAO 与产物目录 dist/build/mp-toutiao/ 同理不可改。
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