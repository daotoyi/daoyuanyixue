#!/usr/bin/env node
/**
 * health 分支 — 独立预览路径部署（带假成功检测 + daemon 自愈 + 线上 curl 校验）
 *
 * 用法:
 *   node scripts/deploy-preview.js                    # 默认部署到 /preview/health/
 *   node scripts/deploy-preview.js /preview/xxx/      # 指定预览路径
 *
 * 设计要点（均来自本项目踩坑记录）：
 *   1. localPath 必须绝对路径、cloudPath 目录必须以 / 结尾
 *   2. mcporter 会返回 AUTH_REQUIRED 但退出码 0 → 不采信退出码，只认返回体 success:true
 *   3. 连接层故障（ECONNREFUSED / Connection refused / broker.sock）→ 自动 restart daemon 重试一次
 *   4. node 软链 22.22.2 → 22.22.2-6 易失效导致 daemon ENOENT → 每次执行前自愈
 *   5. 部署后单独 curl 线上 index + 版本 JS，确认真的生效
 */
'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENV_ID = 'cloud1-d8gs2k9m311f7272f'
const CLOUD_PATH = (process.argv[2] || '/preview/health/').replace(/\/?$/, '/')
const DIST = path.join(ROOT, 'dist', 'build', 'h5')

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
function upload() {
  const cmd = [
    'npx -y mcporter call cloudbase.manageHosting',
    'action=upload',
    `envId=${ENV_ID}`,
    `localPath=${DIST}`,
    `cloudPath=${CLOUD_PATH}`,
  ].join(' ')
  log(`📦 上传: ${DIST}`)
  log(`   → cloudPath: ${CLOUD_PATH}`)
  try {
    return run(cmd)
  } catch (e) {
    return `${e.stdout || ''}\n${e.stderr || ''}\n${e.message || ''}`
  }
}

const isSuccess = (out) => /"success"\s*:\s*true/i.test(out)
const isConnError = (out) => /connection refused|econnrefused|connect failed|broker\.sock|connection closed|appears offline/i.test(out)
const isAuthRequired = (out) => /AUTH_REQUIRED|未登录|start_auth/i.test(out)

/** 部署后线上校验：index.html 可达 + 版本 JS 内容一致 */
function verifyOnline() {
  const urls = [
    `https://club.zhenhesheng.cn${CLOUD_PATH}`,
    `https://${ENV_ID}-1464523137.ap-shanghai.app.tcloudbase.com${CLOUD_PATH}`,
    `https://${ENV_ID}-1464523137.tcloudbaseapp.com${CLOUD_PATH}`,
  ]

  // 从本地产物取版本 JS 与版本串（产物才是真正部署的东西）
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

  let indexOk = false
  let assetOk = false
  let verifiedBase = ''

  for (const base of urls) {
    let code = ''
    try {
      code = run(`curl -sL -o /dev/null -w '%{http_code}' --max-time 30 "${base}"`).trim()
    } catch (_) { /* 该域名不可达，试下一个 */ }
    if (code === '200') {
      indexOk = true
      verifiedBase = base
      break
    }
  }

  if (!indexOk) {
    fail(`线上 index 校验失败（HTTP 非 200）: ${urls.join(' / ')}`)
    return false
  }
  ok(`线上 index 可达: ${verifiedBase}`)

  if (versionAsset && versionStr) {
    let remote = ''
    try {
      remote = run(`curl -sL --max-time 30 "${verifiedBase}${versionAsset}"`)
    } catch (_) { /* ignore */ }
    if (remote.includes(versionStr)) {
      assetOk = true
      ok(`线上版本串校验通过: ${versionStr}（${versionAsset}）`)
    } else {
      warn(`线上版本串未匹配 ${versionStr}（可能 CDN 缓存，请稍后手动核查）`)
    }
  } else {
    warn('未找到本地版本 JS，跳过版本串校验（index 可达即视为部署成功）')
    assetOk = true
  }

  log('')
  log(`🌐 预览地址: ${verifiedBase}`)
  return assetOk
}

async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log(` 🚀 health 分支预览部署 | cloudPath=${CLOUD_PATH}`)
  log(`    环境: ${ENV_ID}`)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    fail('H5 构建产物不存在或缺少 index.html，先执行: npm run build:h5')
    process.exit(1)
  }

  ensureNodeLink()

  let out = upload()

  // 连接层故障 → restart daemon 后重试一次
  if (!isSuccess(out) && isConnError(out)) {
    warn('检测到 daemon 连接层故障，自动 restart 后重试一次...')
    try { run('npx -y mcporter daemon restart') } catch (_) { /* ignore */ }
    out = upload()
  }

  log(out.trim())

  if (!isSuccess(out)) {
    if (isAuthRequired(out)) {
      fail('mcporter 授权已过期：请执行 npx -y mcporter call cloudbase.auth action=start_auth authMode=device 完成设备码授权后重试')
    } else if (isConnError(out)) {
      fail('mcporter 连接层故障自愈失败：请手动 npx -y mcporter daemon restart 后重试')
    } else {
      fail('CloudBase 上传失败（返回体无 success:true）')
    }
    process.exit(1)
  }

  ok('CloudBase 上传返回 success:true')

  // 线上实测（mcporter 可能假成功，必须单独校验）
  const verified = verifyOnline()
  log('')
  if (verified) {
    ok('部署 + 线上校验全部通过')
  } else {
    warn('部署已提交但线上校验未通过，请按上方提示核查')
  }
  log('')
}

main().catch((e) => {
  fail(e.message || String(e))
  process.exit(1)
})
