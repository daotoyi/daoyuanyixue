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
- 认证: 设备码 auth 浏览器授权 (会话过期重授权); 重授权流程 `npx -y mcporter call cloudbase.auth action=start_auth authMode=device` → 给用户 verification_uri + user_code (10min 有效) → 用户浏览器授权 → `cloudbase.auth action=status` 确认 READY 后再部署
- **部署脚本"假成功"坑(2026-09-09 踩)**: `deploy-cloudbase.js functions` 用 `execSync(...,{stdio:'inherit'})`, mcporter 返回 `AUTH_REQUIRED`(退出码 0)也会被当成成功打印"✅ 更新成功"。**会话过期时 dy-api 实际没更新**。铁律: 部署后必须**单独验证**——`curl -s -X POST https://club.zhenhesheng.cn/dy-api -d '{"action":"courses.list"}'` 看返回是否符合预期; 或重跑 `mcporter call cloudbase.manageFunctions action=updateFunctionCode ...` 确认无 AUTH_REQUIRED。
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
- **四端版本号一次同步**: version.js + build.gradle + 下载页(= `/h5/download/index.html`); H5+小程序每次必构建部署, APK 仅提需求时构建 (用已同步版本号)
- **生效范围铁律(2026-09-08 明确)**: **H5 部署 + 云函数部署 = 即时线上生效**; 但 **小程序与 App(APK) 构建后不会自动上线** —— 小程序必须用户在微信开发者工具「上传」并填版本号(微信后台/体验版才更新), App 需 `cap sync`+本地 `gradlew assembleRelease` 重打。排查"修了却没生效/不生效"时**先问用户测试端**, 大概率是在小程序/App 跑旧包。
- **gen-version 纠偏后必须重建小程序**: 提交+纠偏 version.js 后只重 build H5 会漏掉 mp-weixin(其 dist 仍含旧 commit 哈希); 若需小程序上线, 务必再 `node node_modules/.bin/uni build -p mp-weixin` 一次
- bump 末尾会 `git tag vX` (指向当时 HEAD), commit 在其上 → 提交后 `git tag -f vX` 让 tag 精确指向发布提交
- **勿留非版本格式 tag** (git describe 会误当最新版 → NaN)
- APK: mobile/ 是 Capacitor 工程; sync 用 `cd mobile && ./node_modules/.bin/cap sync android`; 再 `cd mobile/android && ./gradlew assembleRelease --no-daemon`; 产物 app-release.apk
- H5 构建清空 dist/build/h5 (含 apk/), APK 需 H5 构建后重复制; 验证 APK 内部版本 `unzip -p app-release.apk "assets/public/assets/version*.js"`

## GitHub 纪律
- 远程 https://github.com/daotoyi/daoyuanyixue (HTTPS, keychain PAT); 密钥泄漏用 git-filter-repo 抹除历史后强推 (用户决定不加 .workbuddy 到 gitignore, **笔记一律脱敏 AKIDvv5x**** 不落明文**)
- 443 超时常是瞬时抖动, 先重试; main 与 tag 分开推 (`git config http.postBuffer 1048576000`)

## 静态托管路径布局 (铁律)
- 根 `/` = 官网; `/h5/` = H5 应用; 下载页 = `/h5/download/index.html`(访问 club.zhenhesheng.cn/h5/download, 线上 200, 唯一入口); **APK 发布到 `/h5/apk/`**(旧 `/apk/` 仅历史留存, 不再使用); 注: 根目录旧入口 `/download/index.html` 已于 2026-09-06 由用户删除(线上 404), 下载页源在跨项目 `zhs-website/zhenhesheng.cn/download.html`(完好)
- **自定义域名 club.zhenhesheng.cn 路径映射不统一**: `/apk/*` 走 h5 前缀, `/download/` 走根目录
- **APK 发布铁律(2026-09-06 改)**: 下载页只链 `/h5/apk/`, **APK 只传 `/h5/apk/daoyuan-vX.Y.Z.apk`, 不再传 `/apk/`**(用户要求"不要 /apk/"); 下载页源在**跨项目** `zhs-website/zhenhesheng.cn/download.html`; **后续部署只更新 `/h5/download/index.html`**(用户 2026-09-06 明确要求: 不再两处都传, 不再动根目录 `/download/index.html`)
- 上传 cloudPath 必须带**文件名**(如 `/h5/apk/daoyuan-v1.12.11.apk`); manageHosting upload 单文件 cloudPath 以 `/` 结尾会把文件存成名为该路径的脏对象 → 具体 URL 404 (2026-09-06 踩坑); **绝不传根** (覆盖官网首页)
- **H5 应用部署 cloudPath 必须 = /h5/** (deploy-cloudbase.js 已固定为 /h5/), 与官网根 / 严格分离; 切勿改回 / (会覆盖官网首页, 且 /h5/ 路径长期不更新导致用户看到旧版本, 见 2026-09-01 v1.11.289 部署事故)
- 测试域名访问会弹警告 → 下载页/APK 链接一律用 club.zhenhesheng.cn

## CloudBase MCP 本地代理/daemon 恢复铁律 (2026-10-14 实测)
- **症状**: `mcporter call cloudbase.*` 无论什么 action 都报 `connect ECONNREFUSED 127.0.0.1:60204`(或 auth status 也报同错)——不是认证过期, 是 cloudbase-mcp 的**本地代理进程挂了**。
- **根因**: cloudbase-mcp 配置写死 node 路径 `.../node/versions/22.22.2/bin/node`, 但托管目录已重命名为 `22.22.2-6`; 旧 daemon 进程曾占着已删二进制故此前可用, 一旦 `mcporter daemon restart` 新进程即 ENOENT。
- **恢复三步**:
  1. `cd ~/.workbuddy/binaries/node/versions && ln -sfn 22.22.2-6 22.22.2`(让旧路径重新可用, 不删任何东西)
  2. `npx -y mcporter daemon restart`(清掉 cloudbase offline 缓存)
  3. 此时 auth 多半已 REQUIRED → 走设备码重授权: `npx -y mcporter call cloudbase.auth action=start_auth authMode=device` 拿 `user_code`+`verification_uri`, 浏览器授权后再 `auth action=status` 确认 READY
- 注: 托管 node 真实目录是 `22.22.2-6`(非 `22.22.2`), 部署/构建用 `22.12.0` 或 `22.22.2-6` 均可; 该符号链接是给 cloudbase-mcp 旧配置兜底。

## CSS / 展示铁律
- PC `@media(min-width:1025px)` 块必须置于 base 规则**之后**才生效 (否则被 base 覆盖)
- `<script setup>` 顶层立即执行代码勿引用后面才声明的 const (TDZ → 白屏); 用固定值或事件回调里惰性读
- 轮播图: 固定比例(如 16:9)用 `mode="aspectFill"`; 容器宽用 `uni.createSelectorQuery().select(sel).boundingClientRect()` **包 nextTick** 测量; `display-multiple-items` 并排 N 张 (16:9+并排2张会偏矮)

## 多平台适配层铁律 (2026-10-15 确立, 抖音端 v2.0.1)
- **平台差异代码一律放 `src/platform/<平台名>/`**, 不在主链路文件里堆条件编译分支。
  目录内只依赖 `uni.*` 标准 API; **严禁 fetch / FormData / Blob / document / canvas / Image / btoa** —— 非浏览器小程序环境这些全局对象不存在, 用了必崩。
  新增平台: 建同级目录 → `src/platform/index.js` 注册 → `src/api/cloudbase.js` 加一处 `#ifdef` 分支。
- **getStorage() 的平台分支必须放在 `const app = await getCloudBaseInstance(); if (!app) return null` 之前**。
  原因: 抖音等端initCloudBase 返回 null, 若先判空会直接 return null, 上层 22 处 `storage.uploadFile` 全部拿不到 storage。
- **Vite ESM 下不能用 `require()`**, 平台适配层必须用条件编译包的静态 import: `// #ifdef MP-TOUTIAO` + `import douyinAdapter from '../platform/douyin/index.js'`。
- **小程序上传双通道**(微信外的所有小程序通用): 图片 = `uni.compressImage` → `getFileSystemManager().readFile({encoding:'base64'})` → 网关 `storage.uploadBase64`; 非图片 = 网关 `storage.getUploadUrl` 取凭证 → **`uni.uploadFile` multipart 直传 COS**(小程序原生 multipart 正好对上 COS POST Object 表单, 无需 fetch/FormData)。
- **`uni.compressImage` / `fs.readFile(base64)` 在 mp-weixin 与 mp-toutiao 均可用** → 后续支付宝/百度等端可直接复用该模式。
- **base64 网关中转上限 90000** (见BASE64_GATEWAY_LIMIT); 超限先降质重试, 仍超则降级 COS 直传, 勿直接报错。
- **平台分支为空 = 静默失败**: checkout/order-detail 的支付块原本只有 `#ifdef H5` 和 `#ifdef APP-PLUS`, 抖音端会编译成空函数(点支付无反应)。**新增端时必须检查所有 `#ifdef` 是否覆盖, 空分支要显式降级提示**。
- **支付**: 后端只有微信(v3)。非微信小程序端统一降级为"H5 收银台链接 → setClipboardData 复制 → 提示用户到浏览器支付"(小程序无 window.location 无法直接跳)。
- **构建产物验证**: `node node_modules/.bin/uni build -p <平台>`, 然后 grep 产物确认 `new FormData`/`document.createElement`/`wx.cloud.uploadFile` 残留为 0, 并反查其他端产物**不含**新平台代码(隔离性验证)。
- **依赖版本必须对齐**: `@dcloudio/uni-mp-*` 与现有 `3.0.0-4060620250520001` 同版本。
- **构建假失败**: 并发写同一 dist 目录时 H5 构建可能报 "Build failed with errors", 重跑即成功; 排查前先确认是否真错。
- **bump-version.js 已支持指定版本号**: `node scripts/bump-version.js 2.0.1`(里程碑版本跨大版本时用, 三段纯数字校验)。

## 小程序端配置铁律 (2026-10-16 修正, 曾走弯路)
- **开发者工具导入的目录 = 构建产物目录本身**, 两端一致:
  微信工具导入 `dist/build/mp-weixin/`, 抖音助手导入 `dist/build/mp-toutiao/`。
  `uni build` 会把 manifest 对应段**完整编译**进产物内的 `project.config.json`(AppID/全部 setting/condition),
  与 `app.json` 同批生成, **开发者工具不会改写它**。
- **⚠️ 曾走过的弯路(已回退)**: 建了 `douyin-project/` 持久化配置目录 + `miniprogramRoot` 指向产物 + `scripts/sync-douyin-config.js` 同步脚本(commit 9c0fd50), 理由是「dist 被 gitignore 会丢配置」。**这个担心不成立** —— 配置由 manifest 每次构建重新生成, 且工具不写产物内配置。微信端一直是这么跑的。多一个目录只让「导入哪个目录」变困惑。已在 commit 中回退删除。
- **根目录 `project.config.json` 不是给开发者工具用的**: 它含 `cloudfunctionRoot: cloudfunctions/` + `qcloudRoot` + `beforeUpload` 钩子, 是 **CloudBase 云函数联调**用的; 微信工具读的是产物内那份。
- **端特有配置唯一数据源 = `src/manifest.json`**: 各端配置段结构保持同构(微信/抖音顶层字段应零差异), 填manifest 后构建自动带到产物。禁止为某端另建配置目录。
- **manifest 的 mp-toutiao 段已与 mp-weixin 同构**: 26 个 setting 字段, 顶层零差异, 仅多 `minifyWXSS` / `urlCheckParam`(抖音特有)。
- **项目 JSON 文件含"多行注释键"惯例** (`"/* 说明 */": ""` 形式) → **不是合法 JSON**, `JSON.parse` 会报 "Bad control character"。任何脚本读写这些文件都要宽松解析: 正则把注释键压成单行再 parse, 写回时用 withComments 保留原键。
- **写 JS 块注释时禁止嵌套 `*/`** (哪怕放在字符串或正则描述里), 会提前闭合注释导致 SyntaxError。


## 版本号提示铁律 (2026-10-16 用户明确要求)
- **每次代码变更后, 回复里必须显式带上版本号** (变更前 → 变更后), 便于用户随时确认当前版本。
- 涉及源码/配置/构建脚本的改动, 一律先 `node scripts/bump-version.js [patch|minor|major|指定版本号]` 再提交;
  只改文档/记忆可不升版本, 但回复中仍需说明"本次未升版本"。
- 提交流程固定顺序: bump(打 tag 在旧 HEAD) → 改代码 → commit → `git tag -f vX` 修正 tag 指向发布提交 →
  `node scripts/gen-version.js` → **重建受影响端**(纠偏后 dist 仍含旧 commit 哈希)。

## manifest.json 校验铁律 (2026-10-16 踩坑确立)
- **改完 manifest.json 必须用严格 `JSON.parse` 校验**, 不可用宽松解析蒙混过关。
- **uni 解析 manifest 失败时不报错, 静默用兜底默认值**: appid 变 `testAppId`、setting 只剩 5 个,
  构建仍打印 `DONE Build complete` —— 极易漏检。
- **注释键必须单行** (`"/* 说明 */": ""`), 跨行会导致 JSON.parse 抛 `Bad control character`。
- **改 manifest 后必查产物**: `dist/build/<平台>/project.config.json` 的 appid 与 setting 字段数须与 manifest 一致。
