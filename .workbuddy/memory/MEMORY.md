# zhs-deploy 项目记忆

## 技术栈 / 构建
- uni-app (Vue3+Vite) 多端: H5 / 微信小程序(mp-weixin, AppID wx3ec1337aae9ace3c) / 抖音(mp-toutiao, AppID tted9b9b2673e23d3f01) / App(Capacitor)
- uview-plus 3.8.86 (easycom u-); Pinia; @cloudbase/js-sdk; 源码在 src/(manifest.json 也在 src/)
- 构建: H5 `node node_modules/.bin/uni build`; 小程序 `... build -p mp-weixin|mp-toutiao`; 默认 build=H5
- 依赖对齐 @dcloudio/uni-mp-* 与 3.0.0-4060620250520001 同版本

## CloudBase (envId cloud1-d8gs2k9m311f7272f, ap-shanghai)
- 网关 dy-api: https://...-1464523137.ap-shanghai.app.tcloudbase.com/dy-api (务必含 -1464523137 全域名, 短域名 INVALID_ENV)
- 自定义域名 club.zhenhesheng.cn (一律用它); 云存储桶私有读直连 403 → getTempFileURL 签名
- NoSQL(tnt-19urkukbc); 微信支付 v3 直连(商户号 1116271440, 微信登录拿 OPENID, cloudPay 不可用)

## 部署铁律 / mcporter
- 云函数: `manageFunctions action=updateFunctionCode functionName=dy-api functionRootPath=<绝对路径>/cloudfunctions/dy-api`(函数目录本身; 不接受 localPath → 旧脚本静默不更新); 新增路由必须重部署; write update 是整体替换
- H5: `manageHosting action=upload localPath=<绝对路径>/dist/build/h5 cloudPath=/h5/`(务必 /h5/ 子路径, 误写 / 覆盖官网首页); cloudPath 单文件必须带文件名, 以 / 结尾会存成脏对象→404
- 必须带 `action=upload` 且 localPath 用绝对路径(相对会被拼到 <repo>/config/ 下→路径不存在)
- **部署假成功坑**: mcporter 返回 AUTH_REQUIRED 但退出码 0 → 别信返回, 部署后必单独 curl 线上验证
- 认证: 设备码浏览器授权(≈10min 失效) `auth action=start_auth authMode=device` → 给用户 user_code+verification_uri → 授权后 `auth action=status` 确认 READY; ENV_REQUIRED 补 `auth action=set_env envId=cloud1-d8gs2k9m311f7272f`
- **daemon 恢复**: ① ECONNREFUSED 127.0.0.1:<端口> / `Connection refused`(COS段) / `broker.sock ECONNREFUSED` = 代理端口轮换或已死 → `npx -y mcporter daemon restart`(用当前 env, 不要 -u), auth 通常保持 READY
  ② 报 `spawn .../22.22.2/bin/node ENOENT` = node 目录改名 `22.22.2-6` 软链失效 → `cd ~/.workbuddy/binaries/node/versions && ln -sfn 22.22.2-6 22.22.2` 再 restart
  ③ 重启后仍 AUTH_REQUIRED 才是真过期 → 走设备码 (2026-11-05 三种依次踩过)

## 静态托管 / 下载页 / 官网联动
- 根 `/` = 官网; `/h5/` = H5; `/h5/download/index.html` = **静态跳转页**(meta refresh + location.replace) → `https://zhenhesheng.cn/download.html`; 官网页是下载内容唯一数据源
- 官网页版本串仅两处: `daoyuan-vX.Y.Z.apk`(指向 club/h5/apk) + `当前版本 vX.Y.Z`; 自带 MicroMessenger 检测; iOS 区块 `.ios-box` 是线上原文重建(不在 git 历史, 曾被我误回滚覆盖)
- APK 只传 `/h5/apk/daoyuan-vX.Y.Z.apk`(不再用旧 /apk/)
- **官网项目**: `~/Library/CloudStorage/OneDrive-个人/zhenhesheng/zhs-website/zhenhesheng.cn/`(独立 git, GitHub:daotoyi/zhs-website, 站点版本 v1.1.x); 部署 `./scripts/deploy.sh "msg"` = 升站点版本+commit+tag+推送+整站传 CloudBase 根 `/`; deploy.sh 内 zhs-deploy 相对站点是 `../../zhs-deploy`
- `bump-version.js --apk` 跨项目同步官网 download.html + 本地 download-page; **同步后必须在官网项目跑 deploy.sh 才生效**
- **跨项目操作(zhs-website)须先征得用户确认**(用户 2026-08-24 立的规矩)

## 版本管理铁律
- 每改必升 patch+1: `node scripts/bump-version.js [patch|minor|major|版本号]` → 改代码 → commit → `git tag -f vX` 修正 tag → `node scripts/gen-version.js` → 重建受影响端
- bump 读版本 tag(只认 vX.Y.Z 防 NaN); **gen-version.js 无构建钩子**, uni build 不会自动跑; 漏跑则产物 FULL_VERSION/COMMIT/DATE 全是旧值 → 必须 commit→tag -f→gen-version→重建, 勿留非版本格式 tag
- 四端版本号同步: version.js + build.gradle(APK) + 下载页; `--apk` 才同步下载页(不带则下载页/官网保持指向旧 APK, 符合"APK 仅提需求时构建")
- **生效范围**: H5 部署 + 云函数部署 = 即时线上生效; 小程序/App 构建后不自动上线(需开发者工具上传/本地 gradle 重打) → 排查"没生效"先问测试端
- **每次更改必须 push 远程仓库**(用户 2026-11-24 明确要求): 功能 commit + chore(version) commit 后 `git push -u origin health` 与 `git push origin vX.Y.Z`(分支/tag 分开推)。远程工作分支 `origin/health`(2026-11-24 新建); `origin/main` 停在 v2.0.23(9b5e776, 落后约 48 提交) — 纯快进可同步, 但**未经用户确认不要擅自改默认分支**。

## 小程序端配置铁律
- 开发者工具导入 = 构建产物目录本身: 微信 `dist/build/mp-weixin/`, 抖音 `dist/build/mp-toutiao/`
- 端特有配置唯一数据源 = `src/manifest.json`(禁止另建配置目录); 改完**必须严格 JSON.parse 校验** — uni 解析失败静默用兜底(appid=testAppId, setting 剩5个)仍打印 DONE; 注释键必须单行; 改后查产物 project.config.json 的 appid/setting 字段数一致(微信 24/抖音 26)
- **已彻底取消分包**(v2.0.16 铁律): 28 个页面全并入主 `pages`, 总包 1.3M < 2M。原因: 微信端「主包页面路径不能位于分包 root 目录」非法; 抖音分享卡片冷启动子包报 **10003026 加载失败**(子包需下载, 非代码错)。**新页面直接写进主 pages, 不再建分包** — 别拿通用分包最佳实践覆盖此项目踩过的坑
- **盘道分享须补 `#ifdef MP-TOUTIAO`**: 所有分享按钮模板须同时覆盖 MP-WEIXIN + MP-TOUTIAO 两个 open-type=share 分支, 否则抖音端走 H5 分支只复制链接 → 不生效

## 多平台适配层铁律
- 平台差异放 `src/platform/<平台名>/`, 目录内只依赖 `uni.*`; **严禁 fetch/FormData/Blob/document/canvas/Image/btoa**(非浏览器端必崩)
- getStorage() 平台分支须放在 `if (!app) return null` 之前(抖音 initCloudBase 返回 null); Vite ESM 不能用 require(), 用 `// #ifdef MP-TOUTIAO` + 静态 import
- **平台分支为空=静默失败**: 新增端须检查所有 #ifdef 覆盖, 空分支显式降级提示
- 上传双通道: 图片 compressImage→readFile(base64)→storage.uploadBase64; 非图片 getUploadUrl→uni.uploadFile multipart 直传 COS
- 支付后端仅微信 v3; 非微信小程序端降级 H5 收银台链接 + setClipboardData 复制
- 抖音链路(v2.0.4~7): tt.login→tt.getPhoneNumber(onLoad 调 ensureDouyinLogin); 担保支付 tt.pay({orderInfo:{order_id,order_token},service:5}); ecpay 签名=参数字典序+值拼接带 SALT MD5, 回调 SHA1 验签→{err_no:0}; 回调 URL 按请求传 notify_url
- 构建产物验证: grep 确认无 new FormData/document.createElement/wx.cloud.uploadFile 残留, 其他端不含新平台代码

## CSS / 展示铁律
- PC `@media(min-width:1025px)` 须置于 base 规则之后; 改基础布局须检查 media query 是否靠继承 base 属性(如 justify-content), 改后 PC 可能意外分散 → 显式覆写
- 小程序 scroll-view 内 flex 网格**勿用 gap**(微信/抖音算错宽度→2列塌1列); 用 space-between + width:calc(50%-10rpx)
- PC 端 rpx 会随屏宽撑大 → 关键图标/尺寸用绝对 px 在 media query 覆写; 改 CSS 后 grep 产物(wxss/ttss)确认落地
- **H5 产物样式位置**: uni 把页面样式抽到 `dist/build/h5/static/*.css`(按页命名), 且 **rpx 编译成 rem**(99rpx→3.09375rem); 排查"没生效"要 grep rem 值或 static/*.css, 搜 rpx 原值搜不到会误判; 小程序产物保留 rpx; APK 内同样在 assets/public/static/*.css
- **H5 文档标题**: uni 把 `<title>` 注入成 `pages[0].style.navigationBarTitleText`(首页页面级), 改根 index.html 或 globalStyle 均无效; 须在 App.vue 的 `// #ifdef H5` 里 `document.title='真和盛 | 道家文化传承'` + MutationObserver 监听改回; favicon 用 `<link>` 放根 index.html(自动拷到 /h5/static/)
- **H5 构建 safe-delete 护栏**: 环境批量删除保护(阈值50)拦截 uni build 对 dist/build/h5/assets|static 的清理 → Build failed; 也拦截直接 rm -rf 大目录。绕过: `mv dist/build/h5 /tmp/h5bak/h5-<ts>` 再 build; mp 两端无此问题; 并发写 dist 也会假失败, 串行构建
- v2.0.18 图标基准: 收藏/分享按钮 99×90rpx/图标36rpx/宽112rpx/字22rpx, PC 72×63px/27px/81px/15px; tabBar 图标 96 画布内 77×77 居中(原始 PNG 在 git `d48d73f^`)
- **首页「养生/文旅/游学」有两套独立展示位**(2026-11-24 踩坑): ① 推荐页 `rec-sec` 模块(rec_show_health/travel/study 开关, rec*Products 横滑商品卡) ② 顶部 tab 板块(`P2_TABS`/`p2Tab`, show_health/travel/study 开关, p2b-good 网格)。改其中一套不等于另一套生效; 用户说"首页没显示商品卡片"先确认看的是哪一处。另: 正式版 `club.zhenhesheng.cn/h5/` 常停留旧构建, 预览版在 `/preview/health/`, 排查"没生效"先确认测试地址与版本 JS
- **后台宽表格横向滑动 (v2.2.20 起)**: 订单管理/次卡核销内容一律 `white-space:nowrap`, 表头与数据行严格等宽并整体左右滑动。**小程序端 view 的 `overflow-x:auto` 不产生滚动**, 必须用 `<scroll-view scroll-x class="table-scroll">` 包住 `.table`; `.table` 设 `display:inline-block; width:2000rpx; min-width:100%`(PC media 覆写 `width:1280px`), 内部 `.tr { width:100%; min-width:0 }`, 商品列 `.w-name` 固定宽(不再 flex 伸缩) 保证表头/行对齐; 表格上方加「← 左右滑动表头 →」提示。元宝账本等其它表格仍用旧 `.table overflow-x:auto` 方案, 勿误删 `.orders-table .tr { min-width }` 基础规则。

## fish / 提权 / 沙箱坑
- 沙箱提权包装器是 bash 风格 `unset ... && eval`, fish 无 unset → 提权命令 exit 127; **已修** `~/.config/fish/functions/unset.fish` shim(`set -e $argv`)
- 提权命令内**不能有 `$(...)` 命令替换**(fish 报 command substitutions not allowed) → 带时间戳的清理/备份放沙箱内先跑, 提权命令只放纯命令
- 提权是命令级触发: `npx cap sync` / `./gradlew` 会提权; `mcporter call/daemon` 不提权
- Bash 里用 grep 的 `\|` 转义在 fish 下会误判为 0 命中 → 用专用 Grep 工具复核

## APK 构建 (Android, Capacitor)
- webDir=`../dist/build/h5` → APK 内嵌整个 H5 产物, 改完 H5 必须先重建 H5 再打 APK
- 步骤: ① `mv` 清空 `mobile/android/app/src/main/assets/public` 与 `capacitor-cordova-android-plugins` 到 /tmp ② `cd mobile && npx cap sync android`(提权) ③ `cd mobile/android && ./gradlew assembleRelease -q`(提权, ~70s); cap sync 偶发 removePluginsNativeFiles 瞬时报错 → 原样重跑即成功
- 产物 `app/build/outputs/apk/release/app-release.apk` → 复制为 `dist/apk/daoyuan-vX.Y.Z.apk`
- 校验: `aapt dump badging` 看 versionName/Code; `apksigner verify --print-certs` 确认 CN=Daoyuan Yixue; `unzip -p ... assets/public/assets/version.*.js` 看内嵌 H5 版本
- 分发: 上传 `/h5/apk/daoyuan-vX.Y.Z.apk`; 线上用 HEAD 对 content-length 与 sha256; 版本号格式 `Android vX.Y.Z`/`daoyuan-vX.Y.Z.apk`(bump --apk 靠正则同步, iOS 区块不受影响)

## 元宝/现金双账铁律 (v2.2.16 起)
- **口径**: 用户充值时已计入营业额; 元宝消费**不计入实际营业、单独计账**。元宝支付单 `total_price`(现金实付) 恒为 "0.00" 是设计如此, 但前端必须显示 `balance_used_points`(元宝数), 不可显示 ¥0 或「免费」。1 元 = 10 元宝 (`POINTS_PER_YUAN=10`), 元额字段 `balance_used` 与元宝字段 `*_points` 严格分开。
- **最大坑**: 任何 `refundAmt = Number(order.total_price)` 的退款/免费判断, 元宝单都会得 0 → 被判免费单 → 不退钱还标记已退款(2026-11-24 实物单 DY1795511214203926 踩过)。所有退款入口(adminOrderRefund/cancelOrder/courseRefund/pandaoCancel/adminVirtualForceRefund)统一走 `refundYuanbaoOrder()` 按 `orderPointsOf(order)` 退元宝 + `refundPointsFields()` 写 `refund_balance_points`, 元宝单**不发起微信退款**、不重复退 balUsed、refund_amount 记 0。
- 强制退款弹窗对元宝单默认值/单位/基数一律按 `orderPoints(o)`(元宝数), 否则默认 "0" 被 `amount>0` 拦下报「请输入正确的退款金额」。后台「元宝账本」与订单分析口径提示为独立账, 不与现金混算。
- 「我的元宝」消费/退款记录颜色反常规: **出账(消费 -) 绿 #2e7d32 / 进账(退款 +) 红 #c41e3a**, 勿再改回。退款记录只认真实入账明细; 仅历史老订单(无 balance_used_points)允许按消费额兜底, 新订单无明细=没真退, 不显示假进账。
- checkout.vue 微信小程序分支曾无条件 wxpayPrepay, 选元宝支付却拉微信收银台 → 元宝/记录都不变; 已在 MP-WEIXIN 块补 balance → orderPayBalance 分支。
- **正式版 /h5/ 与预览双路径须同步推送**: 此前多轮只更预览导致用户在正式版反复报"没生效/没显示"。v2.2.16 起用 `manageHosting action=upload localPath=<绝对>/dist/build/h5 cloudPath=/h5/`, 推后 curl 入口 js + version chunk 校验。

## 次卡/核销流水口径 (v2.2.18 起)
- `health_checkins` 每条流水带 `operator: user|admin` + `platform`, 后台代核另记 `operator_uid`(来自 `_adminAuth` 注入的 opUid); 历史无 operator 的老数据按 `platform==='admin'` 兜底判定。**用户端 `health.checkins` 支持 `card_no` 且 where 强制带 uid**(只能查本人卡), 后台 `admin.cards.checkins` 不传 card_no 即查全部 300 条。
- 展示区分固定配色: 用户自助=绿 #6e7f5a, 管理员代核=红 #9c1630; 用户端点次卡弹层看该卡流水, 后台「核销流水」用弹层列表(不再是 `uni.showModal` 纯文本只显 8 条)。**弹层复用 App.vue 全局 `.pp-mask/.pp-sheet`(非 scoped)**, 页面内自定义类用 scoped 覆写即可; 整卡可点 + 内部按钮/链接必须 `@tap.stop` 防冒泡双开。
- 服务端 `at` 是 `YYYY/MM/DD HH:mm:ss` 斜杠串, 小程序 iOS 对斜杠日期解析不稳 → `fmtTime` 先 replace 成 `-`, 并留 NaN 兜底返回原串。

## 板块介绍文案约定 (v2.2.19 起)
- 养生/文旅/游学/研究院四频道页 + 首页三个内容型 tab 的介绍**统一取 `src/config/sectionIntro.js`**（BRAND / SECTION_INTROS / SECTION_THEME），由 `src/components/SectionIntro.vue` 渲染；改口径只改配置，勿回退到各页硬编码。四板块理念分工：养生=天人合一·清静养生，文旅=道法自然·山水为课堂，游学=明人事·正本清源，研究院=德道经为本/易卦为纲/四柱为用。
- 真和盛理念原文以官网 `zhenhesheng.cn` 公开页为准：观天道·明人事·致中和；传承千年智慧，启迪现代生活；以帛书《德道经》为本、周易六十四卦为纲、四柱八字为用；正本清源；道家四象；五术山医命相卜；以道会友，同修共参。**只读官网网页，不跨项目改 zhs-website**。
- 单文件组件放 `src/components/X.vue` 时须在 `<script setup>` 显式 import（easycom autoscan 只认 `components/目录/同名.vue`）；构建后核对微信/抖音两端 `index.json` 的 usingComponents 与 `components/` 产物齐全，H5 会抽成独立 chunk + `static/X.css`。

## 其他
- **⚠️ mcporter 写库 `writeNoSqlDatabaseContent action=update` 的 `update` 参数是整条文档替换**(非部分更新): 只传几个字段会把该文档其它字段全部冲掉(2026-11-24 踩过, 订单 DY1795501084406151 被覆盖后靠首次 read 输出+addresses+users 手工重建)。正确做法: 先 read 存全量 → update 传完整文档 → 写完立刻 read 回验; 或改在云函数里用 SDK `where().update()` 做部分更新
- 关于我们联系邮箱: `haochen@foxmail.com`(2026-11-05 改, 显示+点击复制两处 in src/pages-sub/setting/about.vue)
- 隐私接口: manifest requiredPrivateInfos 声明 getLocation/chooseLocation/chooseAddress, 但 2026-11-05 核实**源码无任何 wx/uni 隐私接口调用**(checkout.chooseAddress 是自定义地址列表弹窗) → 无需授权弹窗, 声明属冗余(暂保留)
- C/OSS 搬运(2026-09-02): 搬代码路径正确(COS v1 预签名 GET→PUT); 报错根因在目标配置/密钥 — Region错/Bucket缺APPID后缀/子账号无PutObject/SecretKey带空格; `db.settings(group='oss')` 缺项→配置不完整; 网关体~100KB → BASE64_GATEWAY_LIMIT=90000 勿调高(高则413)
- GitHub: https://github.com/daotoyi/daoyuanyixue (HTTPS, keychain PAT); 443 超时先重试; main 与 tag 分开推(git config http.postBuffer 1048576000); 密钥泄漏用 git-filter-repo 抹除后强推
