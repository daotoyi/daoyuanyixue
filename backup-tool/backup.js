#!/usr/bin/env node
/**
 * 真和盛 / 道元易学 — CloudBase 数据与云存储同步备份工具
 *
 * 用途: 在本地自建服务器上定期把 CloudBase 的 NoSQL 数据库全部集合 + 云存储文件同步到本地磁盘。
 *      换服务器 / 迁移云厂商 / 应对误删时, 数据始终有一份在自己的磁盘上。
 *
 * 用法:
 *   node backup.js                      全量备份(全部集合快照 + COS 全桶文件)
 *   node backup.js --no-files           只备份数据库, 不下载文件
 *   node backup.js --only=orders,users  只备份指定集合
 *   node backup.js --since=2026-11-01   增量: 只拉 created_at >= 该日期的记录
 *   node backup.js --since-field=updated_at  指定增量比较字段
 *   node backup.js --dry-run            只统计将要备份什么, 不落盘不下载
 *   node backup.js --keep=7             只保留最近 7 份数据库快照
 *   node backup.js --self-test           离线自测(不需要密钥)
 *   node backup.js --out=/mnt/nas/zhs   指定备份落地目录
 *
 * 环境变量(可写在同目录 .env):
 *   TCB_ENV_ID      云开发环境 ID
 *   TCB_SECRET_ID   腾讯云 SecretId   (推荐: CAM 子账号, 只给只读权限)
 *   TCB_SECRET_KEY  腾讯云 SecretKey
 *   TCB_REGION      地域, 默认 ap-shanghai
 *   COS_BUCKET      云存储桶名; 留空则从数据库 fileID 自动解析 / 列举账号桶
 *   COLLECTIONS     可选, 覆盖集合清单(逗号分隔)
 *
 * 输出结构:
 *   backups/YYYYMMDD-HHMMSS/data/*.ndjson   每次数据库快照
 *   backups/YYYYMMDD-HHMMSS/manifest.json   条数/字节/sha256/失败清单
 *   backups/_files/                         **共享**文件池, 跨次备份增量累积, 已存在且大小一致即跳过
 *
 * 安全: 密钥只从环境变量 / .env 读取, 不写入代码, 不打印明文。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// ---------- 参数解析 ----------
const argv = process.argv.slice(2)
function flag(name, def) {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return def
  if (hit.includes('=')) return hit.split('=').slice(1).join('=')
  return true
}
const OPT = {
  only: flag('only', ''),
  since: flag('since', ''),
  sinceField: flag('since-field', 'created_at'),
  keep: Number(flag('keep', 0)) || 0,
  noFiles: flag('no-files', false) === true || flag('no-files', false) === 'true',
  dryRun: flag('dry-run', false) === true || flag('dry-run', false) === 'true',
  out: flag('out', ''),
  concurrency: Number(flag('concurrency', 4)) || 4,
  pageSize: Number(flag('page-size', 100)) || 100,
}

// ---------- 加载 .env(无第三方依赖的极简解析) ----------
function loadEnv() {
  const p = path.join(__dirname, '.env')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    const i = s.indexOf('=')
    if (i < 0) continue
    const k = s.slice(0, i).trim()
    let v = s.slice(i + 1).trim()
    if (/^["'].*["']$/.test(v)) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

const CFG = {
  envId: process.env.TCB_ENV_ID || '',
  secretId: process.env.TCB_SECRET_ID || '',
  secretKey: process.env.TCB_SECRET_KEY || '',
  region: process.env.TCB_REGION || 'ap-shanghai',
  bucket: process.env.COS_BUCKET || '',
}

// ---------- 默认集合清单(与 dy-api 实际使用的集合一致) ----------
// 新增集合时请同步补到这里, 或用 --only 指定; 也可用环境变量 COLLECTIONS=a,b,c 覆盖
const DEFAULT_COLLECTIONS = [
  'users', 'orders', 'products', 'courses', 'categories', 'course_categories',
  'user_courses', 'aftersales', 'favorites', 'footprints', 'comments',
  'moment_likes', 'moments', 'follows', 'messages', 'feedbacks',
  'coupons', 'addresses', 'logistics', 'live_streams', 'live_bookings',
  'pandao_sessions', 'ai_asks', 'pay_config', 'settings',
  'verify_codes', 'wxmp_authors', 'wxmp_ticket', 'oss_migrate_progress',
]

// ---------- 工具函数 ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 带指数退避的重试, 云 API 偶发网络抖动不该让整次备份失败 */
async function withRetry(fn, label, retries = 3) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = String((e && e.message) || e)
      // 集合不存在等确定性错误不重试
      if (/not exist|不存在|INVALID_PARAM|PERMISSION_DENIED|权限/i.test(msg)) throw e
      if (i < retries) {
        const wait = 800 * Math.pow(2, i)
        log(`  · ${label} 失败(${msg.slice(0, 60)}), ${wait}ms 后第 ${i + 1} 次重试`)
        await sleep(wait)
      }
    }
  }
  throw lastErr
}

function log(msg) {
  const t = new Date().toTimeString().slice(0, 8)
  console.log(`[${t}] ${msg}`)
}

function sha256File(p) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    const s = fs.createReadStream(p)
    s.on('data', (c) => h.update(c))
    s.on('error', reject)
    s.on('end', () => resolve(h.digest('hex')))
  })
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** 从任意嵌套值里递归收集云存储 fileID 与外部 URL */
function collectFileRefs(val, out) {
  if (val == null) return
  if (typeof val === 'string') {
    const s = val
    // CloudBase fileID: cloud://envid.bucket/path
    const re = /cloud:\/\/[A-Za-z0-9._\-]+\/[^\s"'<>),\]]+/g
    let m
    while ((m = re.exec(s))) out.add(m[0])
    // 云存储公网域名直链 → 转 fileID
    const dom = /https?:\/\/[A-Za-z0-9._\-]+\.tcb\.qcloud\.la\/([^\s"'<>),\]]+)/g
    while ((m = dom.exec(s))) out.add(m[0])
    return
  }
  if (Array.isArray(val)) { for (const v of val) collectFileRefs(v, out); return }
  if (typeof val === 'object') {
    for (const k of Object.keys(val)) {
      // 跳过 _id 等纯标识字段, 减少无谓遍历
      if (k === '_id') continue
      collectFileRefs(val[k], out)
    }
  }
}

/** fileID / URL → 本地安全相对路径 */
function refToLocalPath(ref) {
  let p = ref
  p = p.replace(/^cloud:\/\//, '')
  p = p.replace(/^https?:\/\//, '')
  p = p.replace(/\.tcb\.qcloud\.la\//, '/')
  // 去掉查询参数(COS 预签名会在 URL 上带 ?sign=...)
  p = p.split('?')[0]
  // 防目录穿越
  p = p.split('/').filter((x) => x && x !== '.' && x !== '..').join('/')
  return p
}

/** 过滤目录穿越, 保证任何云端 Key 都落在备份目录内 */
function safeRel(p) {
  return String(p).split('/').filter((x) => x && x !== '.' && x !== '..').join('/')
}

/** CloudBase fileID 形如 cloud://<envId>.<bucket>/<path> */
function parseBucketFromFileId(ref) {
  const m = /^cloud:\/\/([^/]+)\/(.+)$/.exec(ref)
  if (!m) return ''
  const parts = m[1].split('.')
  if (parts.length >= 2) return parts.slice(1).join('.')
  return /^636c-/.test(m[1]) ? m[1] : ''
}
function fileIdToKey(ref) {
  const m = /^cloud:\/\/([^/]+)\/(.+)$/.exec(ref)
  return m ? m[2].split('?')[0] : ''
}

/** 确定 COS 桶名: 显式配置 > 数据库 fileID 解析 > 列举账号桶匹配 envId */
async function resolveBucket(cos, refs, envId) {
  if (CFG.bucket) return CFG.bucket
  for (const r of refs) {
    const b = parseBucketFromFileId(r)
    if (b) return b
  }
  try {
    const r = await new Promise((res, rej) => cos.getService((e, d) => (e ? rej(e) : res(d))))
    const hit = ((r && r.Buckets) || []).find((x) => String(x.Name || '').includes(envId))
    if (hit) return hit.Name
  } catch (e) {
    log(`  · 列举账号桶失败(${String((e && e.message) || e).slice(0, 60)}), 回退数据库引用`)
  }
  return ''
}

/** 分页列举桶内全部对象(含孤立文件), 不依赖数据库引用 */
async function listAllObjects(cos, bucket) {
  const out = []
  let marker = ''
  for (let page = 0; page < 1000; page++) {
    const params = { Bucket: bucket, Region: CFG.region, MaxKeys: 1000 }
    if (marker) params.Marker = marker
    const r = await withRetry(
      () => new Promise((res, rej) => cos.getBucket(params, (e, d) => (e ? rej(e) : res(d)))),
      `getBucket@${marker}`,
    )
    const items = (r && r.Contents) || []
    for (const o of items) {
      out.push({ Key: o.Key, Size: Number(o.Size) || 0, ETag: o.ETag, LastModified: o.LastModified })
    }
    const truncated = r && (r.IsTruncated === 'true' || r.IsTruncated === true)
    if (!truncated || !items.length) break
    marker = r.NextMarker || items[items.length - 1].Key
    if (page === 0 && out.length) log(`  · 桶对象较多, 正在分页列举 (已 ${out.length})`)
  }
  return out
}

/** 流式下载到 .part 再原子重命名; 中途失败不会留下伪装成完整文件的残件 */
function downloadCosObject(cos, bucket, key, dest) {
  ensureDir(path.dirname(dest))
  const tmp = dest + '.part'
  try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp) } catch (e) { /* ignore */ }
  const ws = fs.createWriteStream(tmp)
  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (e) => {
      if (settled) return
      settled = true
      try { ws.destroy() } catch (x) { /* ignore */ }
      reject(e)
    }
    const done = () => {
      if (settled) return
      settled = true
      try {
        fs.renameSync(tmp, dest)
        resolve(fs.statSync(dest).size)
      } catch (e) { fail(e) }
    }
    ws.on('error', fail)
    cos.getObject({ Bucket: bucket, Region: CFG.region, Key: key, Output: ws }, (err) => {
      if (err) return fail(err)
      if (ws.writableFinished) return done()
      ws.once('finish', done)
    })
  })
}

// ---------- 离线自测(不需要任何密钥) ----------
function runSelfTest() {
  const assert = require('assert')
  const refs = new Set()
  collectFileRefs({
    avatar: 'cloud://cloud1-abc.636c-cloud1-abc-123/a.png',
    images: ['https://636c-x.tcb.qcloud.la/b.jpg?sign=xxx'],
    nested: { cover: 'cloud://cloud1-abc.636c-cloud1-abc-123/c.pdf' },
  }, refs)
  assert.strictEqual(refs.size, 3, '应收集 3 个文件引用')
  assert.ok(!refToLocalPath('https://x.tcb.qcloud.la/../../etc/passwd').includes('..'), '目录穿越未过滤')
  assert.strictEqual(parseBucketFromFileId('cloud://cloud1-abc.636c-cloud1-abc-123/a.png'), '636c-cloud1-abc-123')
  assert.strictEqual(fileIdToKey('cloud://cloud1-abc.636c-cloud1-abc-123/a/b.png'), 'a/b.png')
  assert.strictEqual(safeRel('bucket/a/../../b.png'), 'bucket/a/b.png')
  assert.ok(OPT.concurrency >= 1 && OPT.pageSize >= 1, '参数默认值异常')
  log('✅ self-test 通过: 文件引用收集 / 路径安全 / bucket 解析 / Key 提取 / 参数解析')
}

// ---------- 主流程 ----------
async function main() {
  if (!CFG.envId) die('缺少 TCB_ENV_ID, 请在 .env 或环境变量中配置云开发环境 ID')
  if (!CFG.secretId || !CFG.secretKey) {
    die('缺少 TCB_SECRET_ID / TCB_SECRET_KEY。\n'
      + '  建议在腾讯云「访问管理 CAM」建一个子账号, 只授予该 CloudBase 环境的读写权限,\n'
      + '  再用它的 API 密钥跑定时备份(不要用主账号密钥)。')
  }

  const tcb = require('@cloudbase/node-sdk')
  const app = tcb.init({
    env: CFG.envId,
    secretId: CFG.secretId,
    secretKey: CFG.secretKey,
    region: CFG.region,
  })
  const db = app.database()

  const runId = stamp()
  const outRoot = OPT.out
    ? path.resolve(OPT.out)
    : path.join(__dirname, 'backups')
  const runDir = path.join(outRoot, runId)
  const dataDir = path.join(runDir, 'data')
  // 文件池跨次备份共享: 已下载且大小一致的文件不再重复拉, 这才是「定期同步」而不是每次全量重下
  const fileDir = path.join(outRoot, '_files')

  // 集合清单
  let collections = DEFAULT_COLLECTIONS
  if (process.env.COLLECTIONS) {
    collections = process.env.COLLECTIONS.split(',').map((s) => s.trim()).filter(Boolean)
  }
  // 云端后来新建的集合: 通过 EXTRA_COLLECTIONS 追加, 不必改代码(不存在的集合会自动跳过)
  if (process.env.EXTRA_COLLECTIONS) {
    for (const c of process.env.EXTRA_COLLECTIONS.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!collections.includes(c)) collections.push(c)
    }
  }
  if (OPT.only) {
    const want = String(OPT.only).split(',').map((s) => s.trim()).filter(Boolean)
    collections = collections.filter((c) => want.includes(c))
    // 允许 --only 指定清单外的集合
    for (const w of want) if (!collections.includes(w)) collections.push(w)
  }

  log(`环境: ${CFG.envId} (${CFG.region})`)
  log(`输出: ${runDir}`)
  log(`模式: ${OPT.since ? `增量 since=${OPT.since}` : '全量'}｜集合 ${collections.length} 个｜文件 ${OPT.noFiles ? '跳过' : '同步'}`)
  if (OPT.dryRun) log('⚠️  DRY-RUN: 只统计, 不写盘不下载')

  if (!OPT.dryRun) { ensureDir(dataDir); if (!OPT.noFiles) ensureDir(fileDir) }

  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    envId: CFG.envId,
    region: CFG.region,
    mode: OPT.since ? 'incremental' : 'full',
    since: OPT.since || null,
    collections: {},
    files: { total: 0, downloaded: 0, skipped: 0, failed: 0, bytes: 0, failures: [] },
    errors: [],
  }

  const allRefs = new Set()

  // ===== 1. 逐集合导出 =====
  for (const name of collections) {
    const t0 = Date.now()
    process.stdout.write(`  · ${name} ... `)
    try {
      let total = 0
      try {
        total = await withRetry(() => db.collection(name).count().then((r) => (r && r.total) || 0), `${name}.count`)
      } catch (e) {
        const msg = String((e && e.message) || e)
        if (/not exist|不存在|-502005/i.test(msg)) {
          console.log('跳过(集合不存在)')
          manifest.collections[name] = { exists: false }
          continue
        }
        throw e
      }

      if (OPT.dryRun) {
        console.log(`${total} 条`)
        manifest.collections[name] = { exists: true, total }
        continue
      }

      const rows = []
      let skip = 0
      while (true) {
        const query = OPT.since
          ? db.collection(name).where({ [OPT.sinceField]: db.command.gte(OPT.since) })
          : db.collection(name)
        const res = await withRetry(
          () => query.orderBy('_id', 'asc').skip(skip).limit(OPT.pageSize).get(),
          `${name}.get@${skip}`,
        )
        const batch = (res && res.data) || []
        if (!batch.length) break
        for (const row of batch) { rows.push(row); collectFileRefs(row, allRefs) }
        if (batch.length < OPT.pageSize) break
        skip += batch.length
        if (skip > 200000) { log('⚠️ 超过 20 万条上限, 提前结束该集合'); break }
      }

      const filePath = path.join(dataDir, `${name}.ndjson`)
      const ws = fs.createWriteStream(filePath, { encoding: 'utf8' })
      for (const row of rows) ws.write(JSON.stringify(row) + '\n')
      await new Promise((r) => ws.end(r))

      const hash = await sha256File(filePath)
      const size = fs.statSync(filePath).size
      manifest.collections[name] = {
        exists: true, total, exported: rows.length, file: `data/${name}.ndjson`, bytes: size, sha256: hash,
      }
      const note = rows.length !== total ? ` ⚠️ 实际导出 ${rows.length} 条与总数不一致` : ''
      console.log(`${rows.length}/${total} 条, ${(size / 1024).toFixed(1)}KB, ${Date.now() - t0}ms${note}`)
      if (rows.length !== total) {
        manifest.errors.push(`${name}: 导出 ${rows.length} 条, 云端计数 ${total} 条, 存在差异(可能备份期间有新增)`)
      }
    } catch (e) {
      const msg = String((e && e.message) || e)
      console.log(`失败: ${msg.slice(0, 120)}`)
      manifest.collections[name] = { exists: true, error: msg }
      manifest.errors.push(`${name}: ${msg}`)
    }
  }

  // ===== 2. 云存储文件同步 =====
  if (!OPT.noFiles) {
    const refs = Array.from(allRefs)
    const COS = require('cos-nodejs-sdk-v5')
    const cos = new COS({ SecretId: CFG.secretId, SecretKey: CFG.secretKey })
    const bucket = await resolveBucket(cos, refs, CFG.envId)
    let objects = []
    if (bucket) {
      try {
        objects = await listAllObjects(cos, bucket)
        const bytes = objects.reduce((s, o) => s + o.Size, 0)
        log(`COS 桶 ${bucket}: ${objects.length} 个对象 / ${(bytes / 1048576).toFixed(1)}MB`)
      } catch (e) {
        const msg = String((e && e.message) || e)
        log(`⚠️  COS 列举失败(${msg.slice(0, 100)}), 退化为仅同步数据库引用文件`)
        manifest.errors.push(`COS getBucket: ${msg}`)
      }
    } else {
      log('⚠️  未确定 COS 桶名, 退化为仅同步数据库引用的文件(建议配置 COS_BUCKET)')
    }

    // 任务来源: ① 桶内全部对象(含无数据库引用的孤立文件) ② 数据库引用补充
    const tasks = []
    const seen = new Set()
    for (const o of objects) {
      seen.add(o.Key)
      tasks.push({ kind: 'cos', key: o.Key, size: o.Size, rel: safeRel('bucket/' + o.Key) })
    }
    for (const ref of refs) {
      if (ref.startsWith('cloud://')) {
        const key = fileIdToKey(ref)
        if (key && !seen.has(key)) {
          seen.add(key)
          tasks.push({ kind: 'fileID', ref, rel: safeRel('bucket/' + key) })
        }
      } else {
        tasks.push({ kind: 'url', ref, rel: safeRel(refToLocalPath(ref)) })
      }
    }
    manifest.files.total = tasks.length
    manifest.files.bucket = bucket || null
    manifest.files.bucketObjects = objects.length
    manifest.files.sharedDir = '_files'
    log(`数据库引用 ${refs.length} 个; 待同步文件 ${tasks.length} 个(桶内 ${objects.length} + 补充 ${tasks.length - objects.length})`)

    if (OPT.dryRun) {
      log('DRY-RUN: 跳过下载')
    } else if (tasks.length) {
      let idx = 0
      const queue = tasks.slice()
      const worker = async () => {
        while (queue.length) {
          const t = queue.shift()
          idx++
          const dest = path.join(fileDir, t.rel)
          try {
            // 跨次增量: 已存在且字节数一致即跳过(仅桶对象有精确 Size; 其他按非空判断)
            if (fs.existsSync(dest)) {
              const localSize = fs.statSync(dest).size
              if (localSize > 0 && (t.kind !== 'cos' || localSize === t.size)) {
                manifest.files.skipped++
                continue
              }
            }
            let bytes
            if (t.kind === 'cos') {
              bytes = await withRetry(() => downloadCosObject(cos, bucket, t.key, dest), `cos ${t.key}`)
            } else if (t.kind === 'fileID') {
              const r = await withRetry(() => app.downloadFile({ fileID: t.ref }), `fileID ${t.rel}`)
              const buf = r && r.fileContent
              if (!buf || !buf.length) throw new Error('内容为空')
              ensureDir(path.dirname(dest))
              fs.writeFileSync(dest, buf)
              bytes = buf.length
            } else {
              const buf = await withRetry(() => httpGetBuffer(t.ref), `url ${t.rel}`)
              if (!buf || !buf.length) throw new Error('内容为空')
              ensureDir(path.dirname(dest))
              fs.writeFileSync(dest, buf)
              bytes = buf.length
            }
            manifest.files.downloaded++
            manifest.files.bytes += bytes
            if (idx % 20 === 0 || idx === tasks.length) log(`  文件进度 ${idx}/${tasks.length}`)
          } catch (e) {
            manifest.files.failed++
            const msg = String((e && e.message) || e)
            manifest.files.failures.push({ ref: (t.ref || t.key || '').slice(0, 200), error: msg.slice(0, 200) })
            if (manifest.files.failures.length <= 5) log(`  ✗ ${t.rel.slice(0, 80)}: ${msg.slice(0, 100)}`)
          }
        }
      }
      const workers = []
      for (let i = 0; i < Math.min(OPT.concurrency, tasks.length); i++) workers.push(worker())
      await Promise.all(workers)
      log(`文件同步完成: 新下载 ${manifest.files.downloaded}, 跳过 ${manifest.files.skipped}, 失败 ${manifest.files.failed}, 共 ${(manifest.files.bytes / 1048576).toFixed(1)}MB`)
    }
  }

  // ===== 3. 写 manifest =====
  manifest.finishedAt = new Date().toISOString()
  manifest.durationSec = Math.round((Date.parse(manifest.finishedAt) - Date.parse(manifest.startedAt)) / 1000)
  if (!OPT.dryRun) {
    fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  }

  // ===== 4. 汇总 =====
  const okCols = Object.values(manifest.collections).filter((c) => c.exists && !c.error).length
  const totalRows = Object.values(manifest.collections).reduce((s, c) => s + (c.exported || 0), 0)
  console.log('')
  log('========== 备份汇总 ==========')
  log(`集合: ${okCols}/${collections.length} 成功, 共 ${totalRows} 条记录`)
  if (!OPT.noFiles) log(`文件: ${manifest.files.downloaded} 下载 / ${manifest.files.skipped} 跳过 / ${manifest.files.failed} 失败`)
  log(`耗时: ${manifest.durationSec}s`)
  if (manifest.errors.length) {
    log(`⚠️  ${manifest.errors.length} 个问题:`)
    manifest.errors.slice(0, 10).forEach((e) => log(`   - ${e.slice(0, 160)}`))
  }
  if (!OPT.dryRun) log(`备份目录: ${runDir}`)

  // ===== 5. 保留策略 =====
  if (!OPT.dryRun && OPT.keep > 0) {
    const dirs = fs.readdirSync(outRoot)
      .filter((d) => /^\d{8}-\d{6}$/.test(d))
      .sort()
      .reverse()
    const drop = dirs.slice(OPT.keep)
    for (const d of drop) {
      fs.rmSync(path.join(outRoot, d), { recursive: true, force: true })
      log(`清理旧备份: ${d}`)
    }
  }

  const failedHard = manifest.errors.length > 0 || manifest.files.failed > 0
  process.exit(failedHard ? 2 : 0)
}

function httpGetBuffer(url) {
  const proto = url.startsWith('https') ? require('https') : require('http')
  return new Promise((resolve, reject) => {
    const req = proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return httpGetBuffer(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)) }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('timeout', () => { req.destroy(new Error('请求超时')) })
    req.on('error', reject)
  })
}

function die(msg) {
  console.error('❌ ' + msg)
  process.exit(1)
}

if (argv.includes('--self-test')) {
  runSelfTest()
} else {
  main().catch((e) => {
    console.error('❌ 备份异常终止:', (e && e.stack) || e)
    process.exit(1)
  })
}
