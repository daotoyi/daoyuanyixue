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
- 云存储CDN: **`636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la`** (getUploadMetadata 验证的真实桶; 曾误用 7a68 已修正; fileID cloud:// 前缀 replace 成此域名)
- H5 上传: 云函数 storage.getUploadUrl 生成 COS 临时凭证(getUploadMetadata) → 前端 fetch PUT 直传 (不依赖前端登录态, 规避 unauthenticated)
- 课程视频: courses.episodes 数组(每集{title,video}) 存 CDN URL; 小程序播放需配置 downloadFile 合法域名 tcb.qcloud.la
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
- **TDZ 崩溃铁律 (08-14)**: `<script setup>` 中**顶层立即执行的代码(非函数体内/非 computed/非 watch 回调)绝不能引用后面才声明的 const 变量**(如 form 定义在 614 行, 前面顶层写了 ref(form.value...) 立即执行 → TDZ ReferenceError → 整个页面白屏进不去)。computed/函数体是惰性求值才安全。**页面整体进不去时优先怀疑顶层 TDZ**; 顶层初始化需要 form 时用固定值/惰性写法(事件回调里再读 form)
- **CSS 顺序铁律 (08-27)**: index.vue 中 rec- base 样式块曾在 @media(min-width:1025px) **之后** → 同优先级下 base 的 rpx 值覆盖了 media 的 px 值 → **PC media query 从未生效**, 改 base 就"连累"PC。**凡 media query 想覆盖的 base 规则, base 必须在 media 之前**。PC/移动端独立显示的可靠做法: base 在前(移动端 rpx 值), media 在后(PC 值, 可用 rpx 亦可 px); 改移动端尺寸前先确认对应 PC media 规则存在且位于其后, 否则 PC 会跟着变
- **云存储图片铁律 (08-15)**: 存储桶 ACL=**PRIVATE**(私有读), 直接存 CDN publicUrl(636c-...tcb.qcloud.la/...) 一律 **403 不显示**。正确模式(复用头像): **数据库存 cloud:// fileID**, 前端显示用 `resolveCloudUrl/resolveCloudListField`(走云函数 app.fileUrl getTempFileURL → 签名 URL, 1小时有效, 前端 _cache 缓存; 小程序原生渲染 cloud:// 不转换)。上传函数不要 replace 成 636c URL。MCP `updateResourcePermission` 改 READONLY **报成功但实际未生效**(COS 层 ACL), 勿依赖。测试: curl 直连 403 / fileUrl 签名 200
- **网络硬超时铁律 (08-31)**: **AbortController 在网络"挂起(hang)"场景下不保证 reject** —— 代理/VPN 下 fetch 卡住时 `controller.abort()` 不一定让 promise reject, 只写 `setTimeout(()=>controller.abort(), ms)` 会**永久卡死**(表现为上传进度冻结在某一百分比、取消/暂停也无反应)。**凡网络请求的超时兜底, 必须叠加 `Promise.race([请求, 定时 reject])` 硬超时**(到点必定 reject, 不依赖 abort 生效)。已在 v1.11.269 应用于 `src/api/cloudbase.js`: ①分片 PUT 硬超时 `PUT_TIMEOUT_MS+3000`(93s) ②`apiRequest` 云函数硬超时 `timeoutMs+3000`。**排查"进度不动/按钮无反应"类卡死时, 优先怀疑网络挂起而非业务逻辑**
- **云函数网关体积上限铁律 (08-31)**: 云函数 HTTP 网关请求体上限**实测约 100KB**(base64 长度 100,184 → 200; 109,908 → **413 EXCEED_MAX_PAYLOAD_SIZE**)。`src/api/cloudbase.js` 的 `BASE64_GATEWAY_LIMIT = 90000` 即据此设定(给 JSON 包裹字段留约 10KB 余量), **勿再调回 110000**。因压缩器 `compressImageToBase64(80KB)` 产出 base64 上限约 109KB, 前端分支阈值一旦高于网关上限就形成**死区**: 稍大的图必然 413、小图正常 → 表现为**"有时能传有时不能"**。**压缩目标 / 网关上限 / 前端分支阈值 三者必须自洽**。排查"上传失败"用脚本直接打线上接口探测体积边界最快; 大图应走 `storage.getUploadUrl` → COS 直传(已端到端实测: 199KB 原图 POST → 204 成功, 返回 url/token/authorization/fileId), 且云函数中转失败应 **catch 后降级 COS, 而非直接抛错**

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
- **版本号策略 (2026-08-25 用户最新确认)**: **每一次改动都必须升版本号 (patch+1)**, 没有"日常小改动不升版本"的约定。每次改动完成提交前先 `node scripts/bump-version.js && node scripts/gen-version.js` (patch+1), 再构建提交推送; bump 读 git tag 为准
- **四端同步升版铁律 (2026-08-25)**: 升版本必须 **version.js + build.gradle + 下载页 + git tag 一次同步完成**, 然后 **H5 + 小程序 + APK 全部重建为同一版本号** 再部署, 禁止只为单一端(如只出APK)单独升版造成不同步
- **APK 构建策略 (2026-08-26 用户确认)**: **Android APK 不随每次迭代自动构建** (H5+小程序照常每次构建部署); 但**版本号始终四端同步递增** (bump 时 build.gradle 一起升, 下载页同步); **当用户需要生成 APK 时, 用当前已同步的版本号直接构建**, 不需要再单独升版本 — 即 APK 永远与 H5线上/小程序/下载页版本一致
- **APK 构建时序铁律 (2026-08-25)**: ①升版本(bump+gen) ②**先重建 H5** ③`cap sync android`(复制最新 dist/build/h5) ④`gradlew assembleRelease` ⑤复制上传。⚠️ **cap sync 复制的是 dist/build/h5, 若 H5 未重建, APK 内部是旧版本**; ⚠️ **H5 构建会清空 dist/build/h5(含 apk/ 子目录), APK 需在 H5 构建后重新复制**; 验证: `unzip -p app-release.apk "assets/public/assets/version*.js"` 看内部版本号
- **版本迭代 (2026-08-07 13:30 用户要求)**: 每次提交都升小版本 — 每次改动完成提交前先 `node scripts/bump-version.js && node scripts/gen-version.js` (patch+1), 再构建提交推送
- **构建策略 (2026-08-07 18:25 用户约定)**: 每次迭代**同步构建 H5 + 小程序并部署**; **APP(APK) 单独提需求才构建**, 不随每次迭代自动构建

## 静态托管路径布局 (铁律 2026-08-21)

- 根路径 `/` = **官网** (official-site/, 19文件, 首页 index.html="真和盛 | 道家文化传承")
- `/h5/` = 道元易学 H5 应用 (dist/build/h5/)
- `/download/` = APK 下载页 | `/apk/` = APK 文件
- **铁律**: 根路径 index.html = 官网首页; 下载页只能传 /download/, **绝不能传根路径** (曾因覆盖导致官网首页变下载页)
- club.zhenhesheng.cn 根 → 官网 index.html 里 JS 判断 club 域名自动跳 /h5/
- 上传: manageHosting action=upload localPath=<目录> cloudPath=/ (官网) 或 /h5/ (应用)

## APP(APK) 构建流程 (2026-08-11 确立)

- mobile/ 是 **Capacitor** 工程 (capacitor.config.json: appId=cn.codebuddy.zhs.workbuddy, appName=道元易学, webDir=../dist/build/h5)
- 三步: ①`node scripts/bump-version.js`(自动更新 build.gradle 版本) → ②`npx cap sync android` → ③`cd mobile/android && ./gradlew assembleRelease`
- 产物: mobile/android/app/build/outputs/apk/release/app-release.apk; 签名 daoyuan.keystore/daoyuan2026 (在 mobile/android/app/ 下)
- **发布**: APK 复制为 daoyuan-v1.XX.XX.apk + scripts/download-page/index.html → dist/build/h5/apk/ + download/ → 上传静态托管 (文件名由 bump-version.js 自动更新)
- 下载地址: https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/apk/daoyuan-v1.11.65.apk (下载页 /download/)
- ⚠️ 上传前需 CloudBase 认证: 设备码 auth start_auth → 用户浏览器授权 → status READY; 会话过期需重新授权


