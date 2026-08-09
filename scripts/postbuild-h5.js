#!/usr/bin/env node
/**
 * H5 构建后处理:
 * 1. index.html 注入 no-cache meta (防止浏览器缓存旧版导致功能不更新)
 * 2. 复制 extra-html/gzh-bind.html 到产物目录 (服务号绑定页)
 */
const fs = require('fs')
const path = require('path')

const H5 = path.join(__dirname, '..', 'dist', 'build', 'h5')
const indexHtml = path.join(H5, 'index.html')

// 1. index.html no-cache
if (fs.existsSync(indexHtml)) {
  let s = fs.readFileSync(indexHtml, 'utf8')
  if (!s.includes('no-cache')) {
    const meta = '  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n' +
      '  <meta http-equiv="Pragma" content="no-cache" />\n' +
      '  <meta http-equiv="Expires" content="0" />\n'
    s = s.replace('<meta charset="UTF-8" />', meta + '  <meta charset="UTF-8" />')
    fs.writeFileSync(indexHtml, s)
    console.log('[postbuild-h5] index.html 已注入 no-cache')
  } else {
    console.log('[postbuild-h5] index.html 已有 no-cache')
  }
} else {
  console.warn('[postbuild-h5] 未找到 index.html')
}

// 2. 复制 gzh-bind.html
const src = path.join(__dirname, '..', 'extra-html', 'gzh-bind.html')
const dst = path.join(H5, 'gzh-bind.html')
if (fs.existsSync(src)) {
  fs.copyFileSync(src, dst)
  console.log('[postbuild-h5] gzh-bind.html 已复制')
} else {
  console.warn('[postbuild-h5] extra-html/gzh-bind.html 不存在')
}
