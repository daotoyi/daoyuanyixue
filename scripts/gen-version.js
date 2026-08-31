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

const target = path.resolve(__dirname, '../src/version.js')

/* 版本号以 bump-version.js 刚写入 src/version.js 的值为准, 保证两个脚本一致。
   绝不能用 `git describe --tags --abbrev=0`: 它返回"最近的任意标签",
   当多个标签指向同一提交时结果不确定, 且会被非版本标签干扰
   (2026-08-31 踩坑: 备份标签/重复标签导致这里取到 276, 而 bump 已写入 277, 版本号错乱)。 */
let version = ''
try {
  version = (fs.readFileSync(target, 'utf8').match(/APP_VERSION = '([^']+)'/) || [])[1] || ''
} catch (e) { /* 文件不存在则走兜底 */ }

// 兜底: version.js 里的值不合法时, 退回查版本标签(只认 vX.Y.Z)
if (!/^v\d+\.\d+\.\d+$/.test(version)) {
  const tag = sh("git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1") || ''
  version = tag || commit
}
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

fs.writeFileSync(target, content, 'utf8')
console.log('[gen-version]', version, commit, date)
