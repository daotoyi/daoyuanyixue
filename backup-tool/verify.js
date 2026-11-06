#!/usr/bin/env node
/**
 * 校验一次备份的完整性(离线, 不需要密钥)。
 *
 *   node verify.js                 校验最近一次备份
 *   node verify.js <备份目录>      校验指定目录
 *   node verify.js --all           校验 backups/ 下所有备份
 *
 * 校验项: manifest 中每个集合 NDJSON 的 sha256 是否与实际文件一致、
 *         每个集合导出条数是否等于云端计数、是否有失败记录、共享文件池字节数。
 * 退出码: 0 全部通过; 2 发现问题; 1 用法/读取错误。
 */
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.join(__dirname, 'backups')
const argv = process.argv.slice(2)

function sha256(p) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    const s = fs.createReadStream(p)
    s.on('data', (c) => h.update(c))
    s.on('error', reject)
    s.on('end', () => resolve(h.digest('hex')))
  })
}
function countLines(p) {
  let n = 0
  const buf = fs.readFileSync(p)
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++
  return n
}
async function walk(dir, cb) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) await walk(p, cb)
    else cb(p, st)
  }
}

async function verifyOne(dir) {
  const mf = path.join(dir, 'manifest.json')
  if (!fs.existsSync(mf)) return { dir, problems: ['缺少 manifest.json'], cols: 0, bytes: 0 }
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'))
  const problems = []
  if (m.errors && m.errors.length) problems.push(`manifest.errors: ${m.errors.length} 条`)
  if (m.files && m.files.failed) problems.push(`文件下载失败: ${m.files.failed} 个`)

  let cols = 0
  let bytes = 0
  for (const [name, meta] of Object.entries(m.collections || {})) {
    if (!meta || meta.exists === false) continue
    if (meta.error) { problems.push(`${name}: ${meta.error}`); continue }
    const p = path.join(dir, meta.file || '')
    if (!fs.existsSync(p)) { problems.push(`${name}: 缺文件 ${meta.file}`); continue }
    const hash = await sha256(p)
    if (hash !== meta.sha256) problems.push(`${name}: sha256 不匹配`)
    const lines = countLines(p)
    if (lines !== meta.exported) problems.push(`${name}: 行数 ${lines} != manifest ${meta.exported}`)
    if (meta.exported !== meta.total) problems.push(`${name}: 导出 ${meta.exported} != 云端 ${meta.total}`)
    bytes += fs.statSync(p).size
    cols++
  }

  const shared = path.join(ROOT, '_files')
  let fileCount = 0
  let fileBytes = 0
  await walk(shared, (_p, st) => { fileCount++; fileBytes += st.size })

  return { dir, runId: m.runId, problems, cols, bytes, fileCount, fileBytes, durationSec: m.durationSec }
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`❌ 备份目录不存在: ${ROOT}`)
    process.exit(1)
  }
  const dirs = fs.readdirSync(ROOT)
    .filter((d) => /^\d{8}-\d{6}$/.test(d))
    .sort()
    .reverse()
  if (!dirs.length) { console.error('❌ 还没有任何备份'); process.exit(1) }

  let targets
  const custom = argv.find((a) => !a.startsWith('--'))
  if (custom) targets = [path.resolve(custom)]
  else if (argv.includes('--all')) targets = dirs.map((d) => path.join(ROOT, d))
  else targets = [path.join(ROOT, dirs[0])]

  let bad = 0
  for (const t of targets) {
    const r = await verifyOne(t)
    console.log(`\n=== ${path.basename(t)} ===`)
    console.log(`集合 ${r.cols} 个 / 数据 ${(r.bytes / 1048576).toFixed(2)}MB / 文件池 ${r.fileCount} 个 ${(r.fileBytes / 1048576).toFixed(1)}MB / 耗时 ${r.durationSec ?? '-'}s`)
    if (r.problems.length) {
      bad++
      r.problems.forEach((p) => console.log(`  ✗ ${p}`))
    } else {
      console.log('  ✅ 完整: sha256 / 行数 / 条数 全部一致, 无失败项')
    }
  }
  process.exit(bad ? 2 : 0)
}
main().catch((e) => { console.error('❌ 校验异常:', e); process.exit(1) })
