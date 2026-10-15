/**
 * 抖音小程序 · 云存储适配
 *
 * 对外暴露与 H5 分支**完全一致**的 storage 接口签名, 上层调用方零改动:
 *   uploadFile(filePath, cloudPath, onProgress?, control?, onStatus?, resume?, fileObj?) → { fileID }
 *   getTempFileURL(fileList) → 临时访问 URL
 *
 * 实现要点(全部走标准小程序 API,零浏览器依赖):
 *   图片: uni.compressImage → fs.readFile(base64) → 网关 storage.uploadBase64 中转
 *   其他: 网关 storage.getUploadUrl 取 COS 凭证 → uni.uploadFile multipart 直传
 *        (小程序原生支持 multipart/form-data, 正好对上 COS POST Object 的表单要求)
 */
import { BASE64_GATEWAY_LIMIT, SIGN_TIMEOUT, isImagePath } from './env'
import { callGateway, getTempFileURL } from './gateway'
import { compressImage, readFileBase64, getFileInfo } from './image'

/**
 * 上传文件到云存储
 * @returns {Promise<{fileID:string}>}
 */
export async function uploadFile(filePath, cloudPath, onProgress, control = {}, onStatus, resume, fileObj) {
  if (!filePath) throw new Error('未选择文件')
  if (!cloudPath) throw new Error('缺少存储路径')
  if (fileObj && fileObj.uploaded) return { fileID: fileObj.uploaded }

  const status = typeof onStatus === 'function' ? onStatus : () => {}
  const progress = typeof onProgress === 'function' ? onProgress : () => {}

  if (isImagePath(cloudPath)) {
    return uploadImageViaGateway(filePath, cloudPath, progress, control, status)
  }
  return uploadBinaryViaCos(filePath, cloudPath, progress, control, status)
}

/* ========== 图片: 网关 base64 中转 ========== */

/**
 * 图片上传主链路
 * 压缩 → base64 → 云函数中转 (复用 H5 同款 action, 后端零改动)
 */
async function uploadImageViaGateway(filePath, cloudPath, progress, control, status) {
  status('compressing')
  await throwIfCancelled(control)

  // 1) 压缩 (失败自动用原图兜底, 不阻断)
  const compressed = await compressImage(filePath)

  // 2) 网关体积预检: 压缩后仍超限则先尝试降质量, 再不行才报错
  status('reading')
  let base64 = await readFileBase64(compressed)

  if (base64.length >= BASE64_GATEWAY_LIMIT) {
    // 二次压缩 (quality 更低) 再试一次
    const retry = await compressImage(compressed, 50)
    if (retry !== compressed) {
      try {
        base64 = await readFileBase64(retry)
      } catch (e) { /* 保持原 base64 */ }
    }
  }

  if (base64.length >= BASE64_GATEWAY_LIMIT) {
    // 图片太大 → 降级走 COS 直传 (小程序 uploadFile 支持, 不受网关 100KB 限制)
    status('uploading')
    return uploadBinaryViaCos(filePath, cloudPath, progress, control, status)
  }

  // 3) 中转上传
  status('uploading')
  await throwIfCancelled(control)
  progress(30)
  const res = await callGateway(
    'storage.uploadBase64',
    { cloudPath, base64 },
    { timeout: 30000 }
  )

  if (!res || !res.fileID) throw new Error('上传未返回文件ID')
  progress(100)
  status('done')
  return { fileID: res.fileID }
}

/* ========== 非图片: COS 直传 (视频/音频/文档) ========== */

/**
 * COS 表单直传
 * 网关取凭证 → uni.uploadFile multipart POST → COS
 * 小程序 uploadFile 天然是 multipart/form-data, 与 COS POST Object 表单要求一致,
 * 因此无需 fetch/FormData (这正是 H5 分支在抖音端崩溃的根因)。
 */
async function uploadBinaryViaCos(filePath, cloudPath, progress, control, status) {
  status('signing')
  await throwIfCancelled(control)

  const meta = await callGateway('storage.getUploadUrl', { cloudPath }, { timeout: SIGN_TIMEOUT })
  if (!meta || !meta.url) throw new Error((meta && meta.msg) || '获取上传凭证失败')

  status('uploading')
  progress(5)

  // 表单字段与 H5 分支保持一致(签名/令牌/fileid/key)
  const formData = { key: cloudPath }
  if (meta.authorization) formData.Signature = meta.authorization
  if (meta.token) formData['x-cos-security-token'] = meta.token
  const cosFileId = meta.cosFileId || meta.fileId
  if (cosFileId) formData['x-cos-meta-fileid'] = cosFileId

  const fileName = cloudPath.split('/').pop() || 'upload.bin'

  await new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: meta.url,
      filePath,
      name: 'file',
      // formData 必须是字符串值
      formData: Object.keys(formData).reduce((acc, k) => {
        acc[k] = String(formData[k])
        return acc
      }, {}),
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
          return
        }
        reject(new Error('上传失败 HTTP ' + res.statusCode + ' ' + String(res.data || '').slice(0, 150)))
      },
      fail: (err) => reject(new Error('上传网络失败: ' + ((err && err.errMsg) || ''))),
    })

    // 真实进度 + 取消
    if (task && typeof task.onProgressUpdate === 'function') {
      task.onProgressUpdate((p) => {
        progress(5 + Math.round((p.progress || 0) * 0.9))
        if (control && control.cancelled) {
          if (typeof task.abort === 'function') task.abort()
          reject(Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' }))
        }
      })
    }
  })

  const fileID = meta.fileId || cosFileId
  if (!fileID) throw new Error('上传凭证缺少 fileId')
  progress(100)
  status('done')
  return { fileID }
}

/* ========== 工具 ========== */

/** 抛出取消错误 (若control.cancelled 为真) */
function throwIfCancelled(control) {
  if (control && control.cancelled) {
    throw Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' })
  }
}

/**
 * 查询文件信息 (与 H5 storage._raw 探测能力对齐, 上层按需使用)
 */
export async function statFile(filePath) {
  return getFileInfo(filePath)
}

export { getTempFileURL }