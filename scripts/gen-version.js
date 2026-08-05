/**
 * 生成版本文件: src/version.js
 * 从 git 读取最新提交短号 + 分支, 与 Git 版本保持一致
 * 用法: node scripts/gen-version.js
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim()
  } catch (e) {
    return ''
  }
}

const commit = sh('git rev-parse --short HEAD') || 'dev'
const branch = sh('git rev-parse --abbrev-ref HEAD') || 'main'
const date = sh('git log -1 --format=%cd --date=format:%Y-%m-%d') || new Date().toISOString().slice(0, 10)
const tag = sh('git describe --tags --abbrev=0') || ''

const version = tag || commit
const content = `/**
 * 自动生成: 版本与 Git 保持一致 (构建前由 scripts/gen-version.js 更新)
 * 请勿手动修改
 */
export const APP_VERSION = '${version}'
export const APP_COMMIT = '${commit}'
export const APP_BRANCH = '${branch}'
export const APP_BUILD_DATE = '${date}'
export const APP_FULL_VERSION = '${version} (${commit})'
`

const target = path.resolve(__dirname, '../src/version.js')
fs.writeFileSync(target, content, 'utf8')
console.log('[gen-version]', version, commit, date)
