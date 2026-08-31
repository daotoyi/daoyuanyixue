#!/usr/bin/env node
/**
 * 自动迭代版本号 (patch +1): v1.10.2 → v1.10.3
 * 同步更新: src/version.js / mobile/android/app/build.gradle / git tag
 * 可选: --apk 额外更新 scripts/download-page/index.html (仅在构建 APK 时用)
 * 用法: node scripts/bump-version.js [patch|minor|major] [--apk]
 * 说明: 版本迭代后需重新构建 (uni build) 产物才会带上新版本号;
 *       APK 不随每次迭代构建 (2026-08-26 用户约定), 下载页保持指向最近已构建的 APK,
 *       构建 APK 时用 `node scripts/bump-version.js --apk` 同步下载页
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const WITH_APK = process.argv.includes('--apk')
function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim() } catch (e) { return '' }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8') }
function write(p, c) { fs.writeFileSync(path.join(ROOT, p), c) }

// 读取当前版本 (以 git 最新 tag 为准, 避免与 gen-version.js 互相覆盖)
/* 只认 vX.Y.Z 形式的版本标签。
   原先用 `git describe --tags --abbrev=0`: 它会把任意标签当成"最新版本"返回,
   一旦仓库里有非版本标签(如备份标签 backup-xxx), 版本号就会被算成 NaN
   (2026-08-31 踩坑: 历史重写后残留的备份标签导致 version.js/build.gradle 被写成 NaN)。
   --sort=-v:refname 按版本号自然序倒排, 保证 v1.11.270 正确排在 v1.11.27 之后。 */
let cur = sh("git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1").replace(/^v/, '')
if (!cur) cur = (read('src/version.js').match(/APP_VERSION = 'v([\d.]+)'/) || [])[1]
if (!cur) { console.error('无法识别当前版本'); process.exit(1) }
// 兜底校验: 三段都必须是数字, 否则宁可报错也不要写出 NaN 版本号
if (!/^\d+\.\d+\.\d+$/.test(cur)) { console.error(`识别到的版本号不合法: "${cur}"，请检查 git tag`); process.exit(1) }

const [major, minor, patch] = cur.split('.').map(Number)
const type = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'patch'
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

// 3. download-page APK 文件名 + 页面版本显示 (仅 --apk 时更新, 避免指向未构建的 APK)
if (WITH_APK) {
  let d = read('scripts/download-page/index.html')
  d = d.replace(/daoyuan-v[\d.]+\.apk/g, `daoyuan-v${next}.apk`)
  d = d.replace(/Android v[\d.]+/, `Android v${next}`)
  write('scripts/download-page/index.html', d)
}

// 4. git tag
sh(`git tag v${next}`)
console.log(`已更新: src/version.js + build.gradle${WITH_APK ? ' + download-page' : ''}, git tag v${next}`)
console.log('下一步: 重新构建三端, 上传小程序时版本号填 ' + next)
console.log(WITH_APK ? '下载页已同步到新 APK 版本' : '提示: 未更新下载页(APK 不随本次迭代构建), 构建 APK 时用 node scripts/bump-version.js --apk')
