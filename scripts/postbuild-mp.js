#!/usr/bin/env node
/**
 * 小程序构建后处理: 把主包 node-modules/uview-plus 移入分包 pages-sub/
 * 解决微信「主包内存在主包未使用的JS文件」报错 (uview 只被分包页面引用)
 * 用法: node scripts/postbuild-mp.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MP = path.join(ROOT, 'dist/build/mp-weixin')
const UV_SRC = path.join(MP, 'node-modules/uview-plus')
const UV_DST = path.join(MP, 'pages-sub/uview-plus')

if (!fs.existsSync(UV_SRC)) {
  console.log('[postbuild-mp] uview-plus 不在主包, 跳过')
  process.exit(0)
}

// 1. 移动 uview-plus 到分包
fs.mkdirSync(path.dirname(UV_DST), { recursive: true })
fs.renameSync(UV_SRC, UV_DST)
console.log('[postbuild-mp] uview-plus 已移入分包 pages-sub/')

// 2. 改写分包页面 json 的 uview 引用路径:
//    原路径 ../../node-modules/uview-plus (从 pages-sub/<dir>/ 出发指向主包 node-modules)
//    新位置 pages-sub/uview-plus → 从 pages-sub/<dir>/ 出发应为 ../uview-plus
let fixed = 0
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) { walk(p); continue }
    if (!f.endsWith('.json')) continue
    const text = fs.readFileSync(p, 'utf8')
    if (text.includes('node-modules/uview-plus')) {
      fs.writeFileSync(p, text.replace(/\.\.\/\.\.\/node-modules\/uview-plus/g, '../uview-plus'))
      fixed++
      console.log('[postbuild-mp] 改写:', path.relative(MP, p))
    }
  }
}
walk(path.join(MP, 'pages-sub'))

// 3. 清理主包空 node-modules
const nm = path.join(MP, 'node-modules')
if (fs.existsSync(nm)) {
  const items = fs.readdirSync(nm)
  if (items.length === 0) { fs.rmdirSync(nm); console.log('[postbuild-mp] 主包 node-modules 已清空删除') }
  else console.log('[postbuild-mp] 主包 node-modules 仍有内容:', items.join(', '))
}
console.log('[postbuild-mp] 完成, 改写', fixed, '个 json')
