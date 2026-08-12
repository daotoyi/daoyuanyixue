# zhs-deploy 项目记忆

## 项目技术栈

- uni-app (Vue 3 + Vite) 多端统一: H5 / 微信小程序 / App
- UI 组件库: **uview-plus 3.8.86**（easycom 自动注册 u- 前缀组件）
- 状态管理: Pinia | CloudBase: @cloudbase/js-sdk
- **源码必须在 `src/` 目录**（uni-app Vite 硬性要求，manifest.json 等都在 src/ 下）
- 构建: `node node_modules/.bin/uni build [-p mp-weixin]` | dev: `node node_modules/.bin/uni`
- 微信小程序 AppID: `wxe4eea58de8107961`

## CloudBase 环境

- envId: **`cloud1-d8gs2k9m311f7272f`** (Source=CloudBase 独立环境, 非微信小程序原生云环境 → cloudPay 不可用, 微信登录可正常拿 OPENID)
- 区域: `ap-shanghai`
- 静态域名: `cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com`
- 云函数网关: `https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api` (完整域名含 -1464523137, 短域名会 INVALID_ENV)
- 云存储CDN: `7a68-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la` (以代码为准; 旧 636c- 已过时; fileID cloud:// 前缀 replace 成此域名)
- 课程视频: courses.video 存 CDN URL (后台上传→course_videos/v*.mp4); 小程序播放需配置 downloadFile 合法域名 tcb.qcloud.la
- 微信小程序 AppID: **`wx3ec1337aae9ace3c`** (旧 wxe4eea58de8107961 已改)
- 支付: 微信支付 API v3 直连 (商户号 1116271440, 证书 /Users/wenhua/cert/1116271440_20260808_cert/, wxpay-v3.js 零依赖实现, cloud1 不可用 cloudPay)

## 环境能力

- NoSQL 文档数据库 (tnt-19urkukbc)
- 无 PostgreSQL / MySQL
- 云函数: Node.js 可用 (namespace 已就绪)
- 静态托管: online

## MCP 工具

- CloudBase MCP 通过 mcporter 调用: `npx -y mcporter call cloudbase.<tool> ...`
- 配置文件: `config/mcporter.json`
- **云函数部署**: manageFunctions action=updateFunctionCode envId=... functionName=dy-api **functionRootPath=cloudfunctions/dy-api 绝对路径** (localPath 无效)
- **H5 部署**: manageHosting action=**upload** envId=... localPath=dist/build/h5 cloudPath=/ (uploadFiles 已废弃会误报成功)
- **认证**: 设备码 auth PENDING→READY 需用户在浏览器打开 tcb.cloud.tencent.com/dev#/cli-auth?user_code=xxx 授权
- **铁律教训 (08-09)**: 云函数新增路由后**必须重新部署 dy-api**, 否则前端调用失败 = "功能没实现"
- **写库坑 (08-11)**: writeNoSqlDatabaseContent action=update 的 update 参数是**整体替换语义**(非 $set), 改单个字段必须带上全部字段(如 settings home 组: group/show_follow/show_publish/show_live), 否则其他字段被清空导致功能被误关

## 版本管理 (Git)

- **2026-08-05 建立**: 基线提交 977fb9d (v1.0.0 完整源码, 171 文件)
- Git 身份: daotoyi / wenhuas.shi@gmail.com
- **铁律 (用户明确要求 08-05)**: **每一次修改 = 一次版本管理**。无论改动大小，完成一次修改立即: `git add -A && git commit -m "vX.Y.Z: 描述"` + `git push origin main`。用户可随时回退到任意版本点
- 版本号惯例: v1.1.0(16项) / v1.2.0(9项) 等大版本递进; 小修改用 fix:/feat: 前缀
- .gitignore 排除: node_modules / dist / mobile android build / keystore / local.properties
- **远程仓库 (已推送)**: https://github.com/daotoyi/daoyuanyixue (HTTPS 推送, keychain 存有 PAT 凭证; SSH 不通)
- 推送命令: git push origin main; 拉取: git pull origin main
- 云端备份: ✅ GitHub 已同步
- **推送失败处理 (2026-08-10 用户约定)**: GitHub 推送若网络不通(常见 443 超时), **先本地 commit 完成版本管理**, 后续网络恢复时再 push; 用户可能因切换网速/关闭 VPN 导致网络波动, 不要因 push 失败而卡住或反复重试, 本地提交成功即算完成, 提示用户稍后重推即可

## 用户约定

- **项目内文件删除免确认 (2026-08-06)**: 项目目录(/Users/wenhua/WorkBuddy/zhs-deploy)内需要删除的文件直接删, 不要问确认
- **版本号策略 (2026-08-07 用户确认)**: 日常小改动/测试**不升版本号** (微信上传支持同版本号覆盖); 只有**正式提审/上线前**才用 `node scripts/bump-version.js` 升一次 (当前 v1.10.5); 构建前跑 `node scripts/gen-version.js` 同步完整版本; bump 读 git tag 为准
- **版本迭代 (2026-08-07 13:30 用户最新要求)**: **每次提交都升小版本** — 每次改动完成提交前先 `node scripts/bump-version.js && node scripts/gen-version.js` (patch+1), 再构建提交推送; 当前 v1.10.6
- **构建策略 (2026-08-07 18:25 用户约定)**: 每次迭代**同步构建 H5 + 小程序并部署**; **APP(APK) 单独提需求才构建**, 不随每次迭代自动构建

## APP(APK) 构建流程 (2026-08-11 确立)

- mobile/ 是 **Capacitor** 工程 (capacitor.config.json: appId=cn.codebuddy.zhs.workbuddy, appName=道元易学, webDir=../dist/build/h5)
- 三步: ①`node scripts/bump-version.js`(自动更新 build.gradle 版本) → ②`npx cap sync android` → ③`cd mobile/android && ./gradlew assembleRelease`
- 产物: mobile/android/app/build/outputs/apk/release/app-release.apk; 签名 daoyuan.keystore/daoyuan2026 (在 mobile/android/app/ 下)
- **发布**: APK 复制为 daoyuan-v1.XX.XX.apk + scripts/download-page/index.html → dist/build/h5/apk/ + download/ → 上传静态托管 (文件名由 bump-version.js 自动更新)
- 下载地址: https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/apk/daoyuan-v1.11.65.apk (下载页 /download/)
- ⚠️ 上传前需 CloudBase 认证: 设备码 auth start_auth → 用户浏览器授权 → status READY; 会话过期需重新授权


