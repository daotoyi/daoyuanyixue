#!/usr/bin/env node
/**
 * 自动迭代版本号 (patch +1): v1.10.2 → v1.10.3
 * 同步更新: src/version.js / mobile/android/app/build.gradle / scripts/download-page/index.html
 * 用法: node scripts/bump-version.js [patch|minor|major]
 * 说明: 版本迭代后需重新构建 (uni build) 产物才会带上新版本号
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim() } catch (e) { return '' }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8') }
function write(p, c) { fs.writeFileSync(path.join(ROOT, p), c) }

// 读取当前版本 (从 version.js 或 git 最新 tag)
let cur = (read('src/version.js').match(/APP_VERSION = 'v([\d.]+)'/) || [])[1]
if (!cur) {
  const tag = sh('git describe --tags --abbrev=0')
  cur = (tag || '').replace(/^v/, '')
}
if (!cur) { console.error('无法识别当前版本'); process.exit(1) }

const [major, minor, patch] = cur.split('.').map(Number)
const type = process.argv[2] || 'patch'
let next
if (type === 'major') next = `${major + 1}.0.0`
else if (type === 'minor') next = `${major}.${minor + 1}.0`
else next = `${major}.${minor}.${patch + 1}`

console.log(`版本迭代: v${cur} → v${next} (${type})`)

// 1. version.js (仅主版本号, 完整版由 gen-version.js 构建时再生成)
let v = read('src/version.js').replace(/APP_VERSION = 'v[\d.]+'/, `APP_VERSION = 'v${next}'`)
write('src/version.js', v)

// 2. build.gradle
let g = read('mobile/android/app/build.gradle')
const vc = (g.match(/versionCode (\d+)/) || [])[1]
if (vc) g = g.replace(/versionCode \d+/, `versionCode ${Number(vc) + 1}`)
g = g.replace(/versionName "[\d.]+"/, `versionName "${next}"`)
write('mobile/android/app/build.gradle', g)

// 3. download-page APK 文件名
let d = read('scripts/download-page/index.html')
d = d.replace(/daoyuan-v[\d.]+\.apk/g, `daoyuan-v${next}.apk`)
write('scripts/download-page/index.html', d)

// 4. git tag
sh(`git tag v${next}`)
console.log('已更新: src/version.js + build.gradle + download-page, git tag v' + next)
console.log('下一步: 重新构建三端, 上传小程序时版本号填 ' + next)
