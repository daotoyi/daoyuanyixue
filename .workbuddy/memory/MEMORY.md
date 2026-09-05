# zhs-deploy 项目记忆

## 技术栈
- uni-app (Vue3 + Vite) 多端: H5 / 微信小程序 / App
- uview-plus 3.8.86 (easycom 自动注册 u- 前缀); Pinia; @cloudbase/js-sdk
- **源码在 src/ (manifest.json 等也在 src/)**
- 构建: H5 `node node_modules/.bin/uni build`; 小程序 `... build -p mp-weixin`
- 微信小程序 AppID: wx3ec1337aae9ace3c

## CloudBase (envId cloud1-d8gs2k9m311f7272f, ap-shanghai)
- 云函数网关 dy-api: https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api (含 -1464523137 全域名, 短域名 INVALID_ENV)
- 云存储CDN桶: 636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la (ACL 私有读, 直连 403)
- 测试域名: cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com (弹测试域名警告) → 改用自定义域名 club.zhenhesheng.cn
- NoSQL(tnt-19urkukbc); 云函数 Node.js; 静态托管 online
- 支付: 微信支付 v3 直连 (商户号 1116271440, cloudPay 不可用, 微信登录可拿 OPENID)

## MCP 工具铁律
- 云函数部署: manageFunctions action=updateFunctionCode functionRootPath=cloudfunctions/dy-api **绝对路径**
- H5 部署: manageHosting action=upload localPath=dist/build/h5 cloudPath=/h5/ (**务必 /h5/ 子路径; 曾误写 / 把 H5 传到根目录覆盖官网首页, deploy-cloudbase.js 已修正)
- 认证: 设备码 auth 浏览器授权 (会话过期重授权)
- 云函数新增路由 **必须重部署**; write update 是**整体替换语义**(改字段带全字段)
- 私有读桶直连 CDN 一律 403 → 走 app.fileUrl getTempFileURL 签名 URL (数据库存 cloud:// fileID)
- **functions 部署脚本铁律**: `scripts/deploy-cloudbase.js functions` 必须用 `updateFunctionCode` + `functionName=dy-api` + `functionRootPath=<绝对路径>/cloudfunctions/dy-api`(函数目录本身, 非父目录); mcporter 不接受 `localPath`(updateFunctionCode 报 paths[0] undefined, createFunction 报 func.name 必需) → 旧脚本用 localPath 会**静默不更新**, 2026-09-02 已修

## C/OSS 搬运到 COS 排查 (2026-09-02 深度定位)
- **结论**: 搬运代码路径本身正确(COS 预签名 v1 签名算法已逐行核对无误, 流式 GET→PUT 管道 `getRes.pipe(putReq)` 正确接好); 反复"报错"的根因在**目标 C/OSS 配置/密钥**, 非代码 bug
- 失败点: `adminOssVideoMigrate` 用 settings(oss) 里的 access_key/secret_key/bucket/region 生成预签名 PUT URL, 再 httpsPipe 上传; 任一不对 → COS 返回 403/404/AccessDenied/NoSuchBucket/SignatureDoesNotMatch
- **常见错因**: ① Region 填错(如照搬云开发 ap-shanghai, 实际桶在 ap-beijing) ② Bucket 名不含 APPID 后缀 ③ 子账号密钥无该桶 PutObject 权限 ④ SecretKey 复制带空格/换行
- **自诊断**: 新增 `admin.oss.config.test` 路由 — 用配置做一次极小预签名 PUT+DELETE 探测, 直出腾讯云精确错误码与中文原因; 后台「系统设置→C/OSS 存储」新增「测试连接」按钮。先点它再搬运, 报错即知是哪项错误
- `db.settings(group='oss')` 字段: enabled/provider(cos|oss)/access_key/secret_key/bucket/region/domain; 缺任一项 → "配置不完整"
- 网络硬超时: 必须叠加 Promise.race 硬超时 (AbortController 在 hang 下不保证 reject)
- 云函数网关请求体 ~100KB → BASE64_GATEWAY_LIMIT=90000 勿调高 (调高形成 413 死区)

## 版本管理铁律 (2026-08 确立)
- **每改必升小版本 patch+1**: `node scripts/bump-version.js && node scripts/gen-version.js`
- bump 读 `git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1` (只认版本 tag, 防 NaN); gen 以 version.js 为准 (曾因都用 git describe 互相覆盖出错)
- **四端版本号一次同步**: version.js + build.gradle + 下载页; H5+小程序每次必构建部署, APK 仅提需求时构建 (用已同步版本号)
- bump 末尾会 `git tag vX` (指向当时 HEAD), commit 在其上 → 提交后 `git tag -f vX` 让 tag 精确指向发布提交
- **勿留非版本格式 tag** (git describe 会误当最新版 → NaN)
- APK: mobile/ 是 Capacitor 工程; sync 用 `cd mobile && ./node_modules/.bin/cap sync android`; 再 `cd mobile/android && ./gradlew assembleRelease --no-daemon`; 产物 app-release.apk
- H5 构建清空 dist/build/h5 (含 apk/), APK 需 H5 构建后重复制; 验证 APK 内部版本 `unzip -p app-release.apk "assets/public/assets/version*.js"`

## GitHub 纪律
- 远程 https://github.com/daotoyi/daoyuanyixue (HTTPS, keychain PAT); 密钥泄漏用 git-filter-repo 抹除历史后强推 (用户决定不加 .workbuddy 到 gitignore, **笔记一律脱敏 AKIDvv5x**** 不落明文**)
- 443 超时常是瞬时抖动, 先重试; main 与 tag 分开推 (`git config http.postBuffer 1048576000`)

## 静态托管路径布局 (铁律)
- 根 `/` = 官网; `/h5/` = H5 应用; `/download/`(实际文件 `/download/index.html`) = 下载页; **APK 发布到 `/h5/apk/`**(旧 `/apk/` 仅历史留存, 不再使用)
- **自定义域名 club.zhenhesheng.cn 路径映射不统一**: `/apk/*` 走 h5 前缀, `/download/` 走根目录
- **APK 发布铁律(2026-09-06 改)**: 下载页只链 `/h5/apk/`, **APK 只传 `/h5/apk/daoyuan-vX.Y.Z.apk`, 不再传 `/apk/`**(用户要求"不要 /apk/"); 下载页源在**跨项目** `zhs-website/zhenhesheng.cn/download.html`, 部署到 `/download/index.html`
- 上传 cloudPath 必须带**文件名**(如 `/h5/apk/daoyuan-v1.12.11.apk`); manageHosting upload 单文件 cloudPath 以 `/` 结尾会把文件存成名为该路径的脏对象 → 具体 URL 404 (2026-09-06 踩坑); **绝不传根** (覆盖官网首页)
- **H5 应用部署 cloudPath 必须 = /h5/** (deploy-cloudbase.js 已固定为 /h5/), 与官网根 / 严格分离; 切勿改回 / (会覆盖官网首页, 且 /h5/ 路径长期不更新导致用户看到旧版本, 见 2026-09-01 v1.11.289 部署事故)
- 测试域名访问会弹警告 → 下载页/APK 链接一律用 club.zhenhesheng.cn

## CSS / 展示铁律
- PC `@media(min-width:1025px)` 块必须置于 base 规则**之后**才生效 (否则被 base 覆盖)
- `<script setup>` 顶层立即执行代码勿引用后面才声明的 const (TDZ → 白屏); 用固定值或事件回调里惰性读
- 轮播图: 固定比例(如 16:9)用 `mode="aspectFill"`; 容器宽用 `uni.createSelectorQuery().select(sel).boundingClientRect()` **包 nextTick** 测量; `display-multiple-items` 并排 N 张 (16:9+并排2张会偏矮)
