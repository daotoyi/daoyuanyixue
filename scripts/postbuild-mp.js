#!/usr/bin/env node
/**
 * 小程序构建后处理: 把主包 uni_modules/uview-plus 移入分包 pages-sub/uni_modules/
 * 解决微信「主包内存在主包未使用的JS文件 / 主包尺寸超1.5M」报错
 * (uview 组件仅被分包页面引用, 应随分包打包)
 * 用法: node scripts/postbuild-mp.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MP = path.join(ROOT, 'dist/build/mp-weixin')
const UV_SRC = path.join(MP, 'uni_modules/uview-plus')
const UV_DST = path.join(MP, 'pages-sub/uni_modules/uview-plus')

/* 0. 还原 wxss 中的 Unicode 转义 (\\XXXX → 中文)
   uni-app 会把源码中的中文类名(如 .st-待处理) 转义为 CSS 转义 (如 .st-\\5f85\\4ed8\\6b3e)。
   H5/App 的 CSS 引擎支持转义, 但微信小程序 wxss 解析器不支持 \\, 直接编译报错
   "unexpected '\\'"。这里还原为 UTF-8 中文类名(微信 wxss 支持中文选择器)。 */
function fixWxssEscapes() {
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
}
fixWxssEscapes()

if (!fs.existsSync(UV_SRC)) {
  console.log('[postbuild-mp] uni_modules/uview-plus 不在主包, 跳过')
  process.exit(0)
}

// 1. 移动 uview-plus 到分包
fs.mkdirSync(path.dirname(UV_DST), { recursive: true })
fs.renameSync(UV_SRC, UV_DST)
console.log('[postbuild-mp] uni_modules/uview-plus 已移入分包 pages-sub/uni_modules/')

// 2. 改写分包页面 json 的 uview 引用路径:
//    原: ../../uni_modules/uview-plus/... (从 pages-sub/<dir>/ 指向主包 uni_modules)
//    新: ../uni_modules/uview-plus/... (从 pages-sub/<dir>/ 指向 pages-sub/uni_modules)
let fixed = 0
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) { walk(p); continue }
    if (!f.endsWith('.json')) continue
    const text = fs.readFileSync(p, 'utf8')
    if (text.includes('uni_modules/uview-plus')) {
      fs.writeFileSync(p, text.replace(/\.\.\/\.\.\/uni_modules\/uview-plus/g, '../uni_modules/uview-plus'))
      fixed++
      console.log('[postbuild-mp] 改写:', path.relative(MP, p))
    }
  }
}
walk(path.join(MP, 'pages-sub'))

// 3. 清理主包空的 uni_modules
const um = path.join(MP, 'uni_modules')
if (fs.existsSync(um)) {
  const items = fs.readdirSync(um)
  if (items.length === 0) { fs.rmdirSync(um); console.log('[postbuild-mp] 主包 uni_modules 已清空') }
  else console.log('[postbuild-mp] 主包 uni_modules 仍有:', items.join(', '))
}
console.log('[postbuild-mp] 完成, 改写', fixed, '个 json')
