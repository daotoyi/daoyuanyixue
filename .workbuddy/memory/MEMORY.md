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
- 根 `/` = 官网; `/h5/` = H5 应用; `/download/` = 下载页; `/apk/` = APK 文件
- **自定义域名 club.zhenhesheng.cn 路径映射不统一**: `/apk/*` 走 h5 前缀, `/download/` 走根目录 → 发布 APK 时 `/apk`+`/download` 与 `/h5/apk`+`/h5/download` **两处都传**; 上传 cloudPath 严格限定 `/apk/` 或 `/download/`, **绝不传根** (覆盖官网首页)
- **H5 应用部署 cloudPath 必须 = /h5/** (deploy-cloudbase.js 已固定为 /h5/), 与官网根 / 严格分离; 切勿改回 / (会覆盖官网首页, 且 /h5/ 路径长期不更新导致用户看到旧版本, 见 2026-09-01 v1.11.289 部署事故)
- 测试域名访问会弹警告 → 下载页/APK 链接一律用 club.zhenhesheng.cn

## CSS / 展示铁律
- PC `@media(min-width:1025px)` 块必须置于 base 规则**之后**才生效 (否则被 base 覆盖)
- `<script setup>` 顶层立即执行代码勿引用后面才声明的 const (TDZ → 白屏); 用固定值或事件回调里惰性读
- 轮播图: 固定比例(如 16:9)用 `mode="aspectFill"`; 容器宽用 `uni.createSelectorQuery().select(sel).boundingClientRect()` **包 nextTick** 测量; `display-multiple-items` 并排 N 张 (16:9+并排2张会偏矮)
