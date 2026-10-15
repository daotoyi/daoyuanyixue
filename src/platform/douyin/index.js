/**
 * 抖音小程序适配层 · 统一出口
 *
 * 目录约定: src/platform/douyin/ 下的代码**仅在 mp-toutiao 编译时进入产物**,
 *          微信/H5/App 端由条件编译完全剔除, 零体积、零侵入。
 *
 * 分工:
 *   env.js       环境常量与路径判定
 *   gateway.js   云函数网关调用 + 文件URL 解析
 *   image.js     小程序原生图片压缩 / 读文件 (替代 canvas)
 *   storage.js   云存储上传 (base64 中转 + COS 表单直传)
 *   auth.js      登录态降级 (手机号登录)
 *   pay.js       支付降级 (H5 收银台)
 *
 * 对外只暴露两个与 cloudbase.js 对齐的工厂: createStorage() / createAuth()
 */
import { ENV_ID, REGION, API_BASE, PLATFORM_TAG, isImagePath } from './env'
import { callGateway, getTempFileURL } from './gateway'
import { uploadFile, statFile } from './storage'
import * as auth from './auth'
import * as pay from './pay'

export { ENV_ID, REGION, API_BASE, PLATFORM_TAG, isImagePath, callGateway, getTempFileURL }

/**
 * 抖音端云存储实例
 * 接口签名与 H5/微信分支完全一致, 调用方 (22 处) 无需任何改动
 */
export function createStorage() {
  return {
    uploadFile,
    getTempFileURL,
    statFile,
    /** 抖音端无CloudBase SDK 实例, 显式标记避免上层误判 */
    _raw: null,
  }
}

/**
 * 抖音端认证实例 (与 cloudbase.getAuth() 对齐)
 */
export function createAuth() {
  return {
    getLoginState: auth.getLoginState,
    supportsOneTapLogin: auth.supportsOneTapLogin,
    describeLogin: auth.describeLogin,
  }
}

export { auth, pay }

export default {
  ENV_ID,
  REGION,
  API_BASE,
  PLATFORM_TAG,
  createStorage,
  createAuth,
  getTempFileURL,
  callGateway,
  auth,
  pay,
}