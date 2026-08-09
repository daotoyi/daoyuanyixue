#!/usr/bin/env node
/**
 * CloudBase 部署脚本
 *
 * 用法:
 *   node scripts/deploy-cloudbase.js h5         # 部署 H5 到静态托管
 *   node scripts/deploy-cloudbase.js mp-weixin    # 注入小程序域名配置
 *   node scripts/deploy-cloudbase.js functions    # 部署云函数
 */

'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENV_ID = 'cloud1-d8gs2k9m311f7272f'
const REGION = 'ap-shanghai'

const GREEN = '\x1b[0;32m'
const YELLOW = '\x1b[1;33m'
const NC = '\x1b[0m'

function log(msg) { console.log(msg) }
function ok(msg) { console.log(`${GREEN}✅ ${msg}${NC}`) }
function warn(msg) { console.log(`${YELLOW}⚠️  ${msg}${NC}`) }

async function main() {
  const target = process.argv[2] || 'h5'

  log(`\n🚀 CloudBase 部署 — ${target}`)
  log(`   环境: ${ENV_ID} (${REGION})\n`)

  switch (target) {
    case 'h5':
      await deployH5()
      break
    case 'mp-weixin':
      await deployMpWeixin()
      break
    case 'functions':
      await deployFunctions()
      break
    default:
      log('用法: node scripts/deploy-cloudbase.js [h5|mp-weixin|functions]')
      process.exit(1)
  }
}

// --- H5 部署 ---
async function deployH5() {
  const distPath = path.join(ROOT, 'dist', 'build', 'h5')

  if (!fs.existsSync(distPath)) {
    warn('H5 构建产物不存在, 先执行: npm run build:h5')
    process.exit(1)
  }

  log('📦 上传 H5 到 CloudBase 静态托管...')
  try {
    execSync(
      `npx -y mcporter call cloudbase.manageHosting action=upload ` +
      `envId=${ENV_ID} localPath=${distPath} cloudPath=/`,
      { stdio: 'inherit', cwd: ROOT }
    )
    ok('H5 部署完成')
    log(`\n🌐 访问地址:`)
    log(`   https://${ENV_ID}-1464523137.tcloudbaseapp.com/\n`)
  } catch (e) {
    warn('H5 部署失败, 请检查 mcporter 连接')
    console.error(e.message)
  }
}

// --- 小程序域名注入 ---
async function deployMpWeixin() {
  log('📋 注入 TCB 域名到小程序配置...')
  try {
    execSync('node scripts/inject-tcb-domains.js', {
      stdio: 'inherit',
      cwd: ROOT,
    })
    ok('域名配置已生成')
    log('\n下一步:')
    log('  1. 打开微信开发者工具, 导入 dist/build/mp-weixin/')
    log('  2. 在小程序管理后台添加服务器域名')
    log('  3. 点击上传发布\n')
  } catch (e) {
    warn('域名注入失败')
    console.error(e.message)
  }
}

// --- 云函数部署 ---
async function deployFunctions() {
  const fnDir = path.join(ROOT, 'cloudfunctions')

  if (!fs.existsSync(fnDir)) {
    warn('cloudfunctions/ 目录不存在')
    process.exit(1)
  }

  const dirs = fs.readdirSync(fnDir).filter((d) => {
    return fs.statSync(path.join(fnDir, d)).isDirectory()
  })

  if (dirs.length === 0) {
    warn('未发现云函数, 请先在 cloudfunctions/ 下创建')
    process.exit(1)
  }

  for (const fn of dirs) {
    log(`📦 部署云函数: ${fn}...`)
    try {
      execSync(
        `npx -y mcporter call cloudbase.manageFunctions action=createFunction ` +
        `envId=${ENV_ID} functionName=${fn} ` +
        `localPath=${path.join(fnDir, fn)}`,
        { stdio: 'inherit', cwd: ROOT }
      )
      ok(`云函数 ${fn} 部署成功`)
    } catch (e) {
      warn(`云函数 ${fn} 部署失败 (可能已存在, 尝试更新)`)
      try {
        execSync(
          `npx -y mcporter call cloudbase.manageFunctions action=updateFunctionCode ` +
          `envId=${ENV_ID} functionName=${fn} ` +
          `localPath=${path.join(fnDir, fn)}`,
          { stdio: 'inherit', cwd: ROOT }
        )
        ok(`云函数 ${fn} 更新成功`)
      } catch (e2) {
        console.error(e2.message)
      }
    }
  }
}

main().catch(console.error)
