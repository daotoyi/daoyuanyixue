#!/usr/bin/env node
/**
 * health 分支 — 独立预览路径部署（带假成功检测 + daemon 自愈 + 线上 curl 校验）
 *
 * 用法:
 *   node scripts/deploy-preview.js                    # 双路径部署（默认 /preview/health/ + /h5/preview/health/）
 *   node scripts/deploy-preview.js /preview/xxx/      # 单路径部署（自定义路径）
 *
 * 为什么要双路径（2026-11-23 实测结论）：
 *   - 默认静态域名 cloud1-...-1464523137.tcloudbaseapp.com 无路径重写，直接读 /preview/health/
 *   - club.zhenhesheng.cn 网关路由 "/" 带 PathRewrite Prefix=/h5，访问 /preview/health/
 *     会被重写成 /h5/preview/health/，因此必须额外把同一份产物传到 /h5/preview/health/ 才能命中
 *   - 只传一份会导致 club 域名 404、默认域名 200 的"半部署"现象
 *
 * 设计要点（均来自本项目踩坑记录）：
 *   1. localPath 必须绝对路径、cloudPath 目录必须以 / 结尾
 *   2. mcporter 会返回 AUTH_REQUIRED 但退出码 0 → 不采信退出码，只认返回体 success:true
 *   3. 连接层故障（ECONNREFUSED / Connection refused / broker.sock）→ 自动 restart daemon 重试一次
 *   4. node 软链 22.22.2 → 22.22.2-6 易失效导致 daemon ENOENT → 每次执行前自愈
 *   5. 部署后单独 curl 线上 index + 版本 JS，确认真的生效（证书过期期间用 -k 跳过本地校验）
 */
'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENV_ID = 'cloud1-d8gs2k9m311f7272f'
const STATIC_DOMAIN = 'cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com'
const DIST = path.join(ROOT, 'dist', 'build', 'h5')
const CUSTOM_PATH = process.argv[2] // 自定义单路径（可选）

// 默认双路径：默认域名直达 + club 网关 Prefix=/h5 重写落地
const norm = (p) => ('/' + p.replace(/^\/+|\/+$/g, '') + '/')
const DEFAULT_PATHS = ['/preview/health/', '/h5/preview/health/']
const CLOUD_PATHS = CUSTOM_PATH ? [norm(CUSTOM_PATH)] : DEFAULT_PATHS

const GREEN = '\x1b[0;32m'
const YELLOW = '\x1b[1;33m'
const RED = '\x1b[0;31m'
const NC = '\x1b[0m'
const log = (m) => console.log(m)
const ok = (m) => console.log(`${GREEN}✅ ${m}${NC}`)
const warn = (m) => console.log(`${YELLOW}⚠️  ${m}${NC}`)
const fail = (m) => console.log(`${RED}❌ ${m}${NC}`)

function run(cmd) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

/** 修复 node 软链：22.22.2 → 22.22.2-6（daemon spawn 走这个固定路径） */
function ensureNodeLink() {
  const base = path.join(os.homedir(), '.workbuddy', 'binaries', 'node', 'versions')
  const link = path.join(base, '22.22.2')
  const target = path.join(base, '22.22.2-6')
  try {
    execSync(`"${path.join(link, 'bin', 'node')}" -v`, { stdio: 'ignore' })
    return
  } catch (_) { /* 软链失效，下面重建 */ }

  if (fs.existsSync(path.join(target, 'bin', 'node'))) {
    try {
      if (fs.existsSync(link) || fs.lstatSync(link)) fs.unlinkSync(link)
    } catch (_) { /* 不存在则忽略 */ }
    try {
      fs.symlinkSync('22.22.2-6', link, 'dir')
      log('🔧 已重建 node 软链 22.22.2 → 22.22.2-6')
    } catch (e) {
      warn(`重建 node 软链失败（不影响 npx 兜底）: ${e.message}`)
    }
  }
}

/** 执行一次上传，返回 mcporter 原始输出（不用退出码判断成功） */
function upload(cloudPath) {
  const cmd = [
    'npx -y mcporter call cloudbase.manageHosting',
    'action=upload',
    `envId=${ENV_ID}`,
    `localPath=${DIST}`,
    `cloudPath=${cloudPath}`,
  ].join(' ')
  log(`📦 上传: ${DIST}`)
  log(`   → cloudPath: ${cloudPath}`)
  try {
    return run(cmd)
  } catch (e) {
    return `${e.stdout || ''}\n${e.stderr || ''}\n${e.message || ''}`
  }
}

const isSuccess = (out) => /"success"\s*:\s*true/i.test(out)
const isConnError = (out) => /connection refused|econnrefused|connect failed|broker\.sock|connection closed|appears offline/i.test(out)
const isAuthRequired = (out) => /AUTH_REQUIRED|未登录|start_auth/i.test(out)

/** 上传单路径（含连接层自愈），返回结果输出 */
function uploadWithRetry(cloudPath) {
  let out = upload(cloudPath)
  if (!isSuccess(out) && isConnError(out)) {
    warn('检测到 daemon 连接层故障，自动 restart 后重试一次...')
    try { run('npx -y mcporter daemon restart') } catch (_) { /* ignore */ }
    out = upload(cloudPath)
  }
  return out
}

/** 校验单个 URL（证书过期期间用 -k） */
function httpCode(url) {
  try {
    return run(`curl -skL -o /dev/null -w '%{http_code}' --max-time 30 "${url}"`).trim()
  } catch (_) {
    return ''
  }
}

/** 从本地产物取版本 JS 文件名与版本串 */
function localVersion() {
  const assetsDir = path.join(DIST, 'assets')
  let versionAsset = null
  let versionStr = null
  if (fs.existsSync(assetsDir)) {
    const versionFiles = fs.readdirSync(assetsDir).filter((f) => /^version.*\.js$/.test(f))
    if (versionFiles.length) {
      versionAsset = `assets/${versionFiles[0]}`
      versionStr = (fs.readFileSync(path.join(assetsDir, versionFiles[0]), 'utf8').match(/v\d+\.\d+\.\d+/g) || [])[0] || null
    }
  }
  if (!versionStr) {
    try {
      versionStr = (fs.readFileSync(path.join(ROOT, 'src', 'version.js'), 'utf8').match(/v\d+\.\d+\.\d+/g) || [])[0] || null
    } catch (_) { /* ignore */ }
  }
  return { versionAsset, versionStr }
}

/**
 * 线上校验：对每个部署路径，校验默认域名 + club 域名可达，并核对版本串
 * 默认路径 /preview/health/ 时，club 域名访问同一路径（网关会重写到 /h5/preview/health/）
 */
function verifyOnline() {
  const { versionAsset, versionStr } = localVersion()
  let allOk = true

  for (const cloudPath of CLOUD_PATHS) {
    log(`\n🔍 校验 cloudPath: ${cloudPath}`)
    // 候选地址：默认静态域名 + club 域名（同一逻辑路径，网关负责重写）
    const urls = [
      `https://${STATIC_DOMAIN}${cloudPath}`,
      `https://club.zhenhesheng.cn${cloudPath}`,
    ]
    for (const url of urls) {
      const code = httpCode(url)
      if (code !== '200') {
        fail(`index 不可达 (HTTP ${code || '000'}): ${url}`)
        allOk = false
        continue
      }
      ok(`index 可达: ${url}`)

      if (versionAsset && versionStr) {
        let remote = ''
        try {
          remote = run(`curl -skL --max-time 30 "${url}${versionAsset}"`)
        } catch (_) { /* ignore */ }
        if (remote.includes(versionStr)) {
          ok(`  版本串匹配: ${versionStr}`)
        } else {
          warn(`  版本串未匹配 ${versionStr}（可能 CDN 缓存，请手动核查）`)
          allOk = false
        }
      }
    }
  }

  log('')
  log('🌐 预览地址:')
  log(`   club 域名（推荐）: https://club.zhenhesheng.cn/preview/health/`)
  log(`   默认静态域名    : https://${STATIC_DOMAIN}/preview/health/`)
  return allOk
}

async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log(` 🚀 health 分支预览部署 | 环境=${ENV_ID}`)
  log(` 部署路径: ${CLOUD_PATHS.join('  +  ')}`)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    fail('H5 构建产物不存在或缺少 index.html，先执行: npm run build:h5')
    process.exit(1)
  }

  ensureNodeLink()

  // 逐路径上传（串行，避免并发写 dist 冲突）
  for (const cloudPath of CLOUD_PATHS) {
    const out = uploadWithRetry(cloudPath)
    log(out.trim())
    if (!isSuccess(out)) {
      if (isAuthRequired(out)) {
        fail('mcporter 授权已过期：请执行 npx -y mcporter call cloudbase.auth action=start_auth authMode=device 完成设备码授权后重试')
      } else if (isConnError(out)) {
        fail('mcporter 连接层故障自愈失败：请手动 npx -y mcporter daemon restart 后重试')
      } else {
        fail(`CloudBase 上传失败 (${cloudPath})：返回体无 success:true`)
      }
      process.exit(1)
    }
    ok(`上传成功: ${cloudPath}`)
  }

  // 线上实测（mcporter 可能假成功，必须单独校验）
  const verified = verifyOnline()
  log('')
  if (verified) {
    ok('部署 + 线上校验全部通过')
  } else {
    warn('部署已提交但部分线上校验未通过，请按上方提示核查')
  }
  log('')
}

main().catch((e) => {
  fail(e.message || String(e))
  process.exit(1)
})
