/**
 * 抖音小程序 · 图片处理
 *
 * 抖音运行���境没有 document / canvas / Image / fetch / FileReader,
 * 因此 H5 分支那套"canvas 压缩 → toDataURL → 读 base64"完全不可用。
 * 这里改用小程序标准 API:
 *   压缩: uni.compressImage (tt.compressImage)
 *   读取: uni.getFileSystemManager().readFile({ encoding: 'base64' })
 */
import { IMAGE_QUALITY } from './env'

/**
 * 压缩图片 (小程序原生)
 * @param {string} src 本地临时路径 (如 wxfile://tmp_xxx / ttfile://tmp_xxx)
 * @param {number} quality 1-100
 * @returns {Promise<string>} 压缩后的临时路径; 失败时回退原路径
 */
export function compressImage(src, quality = IMAGE_QUALITY) {
  return new Promise((resolve) => {
    if (!src || typeof uni === 'undefined' || !uni.compressImage) {
      resolve(src)
      return
    }
    uni.compressImage({
      src,
      quality,
      success: (r) => resolve(r.tempFilePath || src),
      // 压缩失败不是致命错误 (部分格式/超小图会失败), 用原图兜底
      fail: () => resolve(src),
    })
  })
}

/**
 * 读取本地文件为 base64 (不含 data: 前缀)
 * @param {string} localPath
 * @returns {Promise<string>}
 */
export function readFileBase64(localPath) {
  return new Promise((resolve, reject) => {
    if (!localPath) {
      reject(new Error('文件路径为空'))
      return
    }
    let fs = null
    try {
      fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
    } catch (e) {
      reject(new Error('当前环境不支持文件读取'))
      return
    }
    if (!fs || !fs.readFile) {
      reject(new Error('当前环境不支持文件读取'))
      return
    }
    fs.readFile({
      filePath: localPath,
      encoding: 'base64',
      success: (r) => {
        const data = r && r.data
        // 部分基础库在未指定 encoding 时返回 ArrayBuffer, 这里兜底二次转换
        if (typeof data === 'string') resolve(data)
        else if (data instanceof ArrayBuffer) resolve(arrayBufferToBase64(data))
        else reject(new Error('读取文件返回格式异常'))
      },
      fail: (e) => reject(new Error('读取文件失败: ' + ((e && e.errMsg) || ''))),
    })
  })
}

/** ArrayBuffer → base64 (分块避免 apply 参数过多爆栈) */
function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  // 抖音/H5 都有 atob, 小程序没有 → 手写 base64 编码兜底
  if (typeof btoa === 'function') return btoa(bin)
  return manualBase64(bytes)
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 纯 JS base64 编码 (无 btoa 环境兜底) */
function manualBase64(bytes) {
  let out = ''
  const len = bytes.length
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += B64_CHARS[b0 >> 2]
    out += B64_CHARS[((b0 & 0x03) << 4) | ((b1 || 0) >> 4)]
    out += i + 1 < len ? B64_CHARS[((b1 & 0x0f) << 2) | ((b2 || 0) >> 6)] : '='
    out += i + 2 < len ? B64_CHARS[b2 & 0x3f] : '='
  }
  return out
}

/**
 * 取本地文件信息 (size / 路径)
 * @returns {Promise<{size:number, path:string}>}
 */
export function getFileInfo(localPath) {
  return new Promise((resolve, reject) => {
    if (!uni || !uni.getFileInfo) {
      reject(new Error('当前环境不支持读取文件信息'))
      return
    }
    uni.getFileInfo({
      filePath: localPath,
      success: (r) => resolve({ size: (r && r.size) || 0, path: localPath }),
      fail: (e) => reject(new Error('读取文件信息失败: ' + ((e && e.errMsg) || ''))),
    })
  })
}