#!/usr/bin/env node
/**
 * 小程序构建后处理:
 * 1. 还原 wxss 中的 Unicode 转义 (\\XXXX → 中文)
 *    uni-app 会把源码中文类名(如 .st-待处理) 转义为 CSS 转义 (\\5f85\\4ed8\\6b3e)。
 *    H5/App 的 CSS 引擎支持转义, 但微信小程序 wxss 解析器不支持 \\, 直接报错
 *    "unexpected '\\'"。还原为 UTF-8 中文类名(微信 wxss 支持中文选择器)。
 *
 * 注意: 不再移动 uview-plus 到分包 —— uview 放主包 uni_modules/ 是微信工具
 * 原生支持的组件规范目录(工具扫描项目根 uni_modules/), 且瘦身后 uview 仅 ~200KB,
 * 主包 474KB < 1.5M 达标; 分包通过 ../../uni_modules/uview-plus 引用主包组件,
 * 属微信官方支持的分包引用主包资源。
 *
 * 用法: node scripts/postbuild-mp.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MP = path.join(ROOT, 'dist/build/mp-weixin')

let files = 0, total = 0
function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) { walk(p); continue }
    if (!f.endsWith('.wxss')) continue
    const text = fs.readFileSync(p, 'utf8')
    if (!text.includes('\\')) continue
    const fixed = text.replace(/\\[0-9a-fA-F]{4}(?![0-9a-fA-F])/g, (m) =>
      String.fromCodePoint(parseInt(m.slice(1), 16)))
    if (fixed !== text) {
      fs.writeFileSync(p, fixed)
      files++
      total += (text.match(/\\[0-9a-fA-F]{4}(?![0-9a-fA-F])/g) || []).length
      console.log('[postbuild-mp] wxss 转义还原:', path.relative(MP, p))
    }
  }
}
walk(MP)
if (files) console.log(`[postbuild-mp] 还原 ${total} 处 Unicode 转义, 共 ${files} 个 wxss`)
else console.log('[postbuild-mp] wxss 无转义需还原')

