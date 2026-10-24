# 道元易学 (Daoyuan Yixue)

> 观天道 · 明人事 · 致中和

道元易学是「真和盛」旗下的传统文化玄学应用，涵盖商城（开运饰品 / 香薰禅修 / 文房茶道）、课程（八字命理 / 奇门遁甲 / 六爻风水）、社区动态、直播讲堂、命理排盘工具（八字 / 紫微 / 六爻 / 六壬 / 奇门 / 拆字）与管理后台。

## 技术栈

- **uni-app** (Vue 3 + Vite) 一套代码多端运行
- **Pinia** 状态管理 · **dayjs** · **qrcode** · **vue-i18n**
- **@cloudbase/js-sdk** 腾讯云开发 (CloudBase)
- **Capacitor** 打包 Android App

## 多端支持

| 端 | 构建命令 | 说明 |
|---|---|---|
| H5 | `uni build` | 部署于 `club.zhenhesheng.cn/h5/` |
| 微信小程序 | `uni build -p mp-weixin` | AppID `wx3ec1337aae9ace3c`，产物在 `dist/build/mp-weixin/`，需开发者工具上传 |
| 抖音小程序 | `uni build -p mp-toutiao` | AppID `tted9b9b2673e23d3f01`，产物在 `dist/build/mp-toutiao/`，需开发者工具上传 |
| Android App | `mobile/` 下 Capacitor 打包 | 内嵌整个 H5 产物，签名 `CN=Daoyuan Yixue` |

## 目录结构

```
├── src/                    # 应用源码 (manifest.json 也在此)
│   ├── pages/              # 主包页面 (首页/商城/课程/我的 + 公共页)
│   ├── pages-sub/          # 业务页面 (商品/课程/盘道/订单/购物车/管理后台…)
│   ├── platform/           # 多平台适配层 (抖音端等, 只用 uni.* 标准 API)
│   ├── static/tabbar/      # tabBar 图标 (96×96 画布, 选中 #c41e3a / 未选 #A89A85)
│   └── version.js          # 版本文件 (gen-version.js 自动生成, 勿手改)
├── cloudfunctions/         # 云函数 (dy-api 主网关 / getOpenId / club-redirect)
├── mobile/                 # Capacitor Android 工程 (APK 构建)
├── scripts/                # 构建部署脚本 (版本/图标/部署)
├── docs/                   # 项目文档
└── official-site/          # 官网早期源码留档
```

## 开发

```bash
npm install
npm run dev:h5            # H5 开发 (其余: dev:mp-weixin / dev:mp-toutiao / dev:app)
```

## 构建与版本管理

**每次代码改动必须升版本号**（铁律）：

```bash
node scripts/bump-version.js patch      # 或 minor / major / 指定版本号 (如 2.1.0)
# 改代码 → git commit → git tag -f vX.Y.Z (修正 tag 指向发布提交)
node scripts/gen-version.js             # 重新生成 src/version.js (必须 commit 后跑, 否则产物版本信息是旧的)
```

构建 APK 时加 `--apk`：`node scripts/bump-version.js --apk patch`，会额外同步下载页版本。

```bash
npm run build:h5                  # 构建 H5
npm run build:mp-weixin           # 构建微信小程序
npm run build:mp-toutiao          # 构建抖音小程序
```

APK 构建：先构建 H5 → `cd mobile && npx cap sync android` → `cd mobile/android && ./gradlew assembleRelease -q`，产物复制为 `dist/apk/daoyuan-vX.Y.Z.apk`。

## 部署 (腾讯云开发)

环境 `cloud1-d8gs2k9m311f7272f` (ap-shanghai)，通过 mcporter CLI 操作：

- **H5 / 静态资源**：`mcporter call cloudbase.manageHosting action=upload localPath=<绝对路径> cloudPath=/h5/`（H5 只传 `/h5/` 子路径，根目录归官网）
- **云函数**：`mcporter call cloudbase.manageFunctions action=updateFunctionCode functionName=dy-api functionRootPath=<绝对路径>/cloudfunctions/dy-api`
- **APK**：上传至 `/h5/apk/daoyuan-vX.Y.Z.apk`
- 部署后务必 `curl` 线上验证，不轻信部署工具返回

> daemon 代理端口每会话轮换，遇 `ECONNREFUSED` 时 `npx -y mcporter daemon restart` 即可（凭据落盘，无需重授权）。

## 域名与下载页

- `club.zhenhesheng.cn` → 应用域（H5 在 `/h5/`）
- `zhenhesheng.cn` → 官网域（静态托管根目录，由独立的 [zhs-website](https://github.com/daotoyi/zhs-website) 仓库维护）
- 下载页已统一：`club.zhenhesheng.cn/h5/download` 跳转 `zhenhesheng.cn/download.html`（官网为下载内容唯一数据源）；`bump-version.js --apk` 会跨项目同步官网下载页版本，同步后需在官网仓库跑 `./scripts/deploy.sh` 上线

## 支付

- 微信支付 v3 直连（商户号 1116271440，cloudPay 不可用）
- 抖音小程序：担保支付 `tt.pay({orderInfo:{order_id,order_token},service:5})`；非微信小程序端降级为 H5 收银台链接 + 复制提示

## 管理后台

Web 后台内置于应用（`src/pages/admin/`、`src/pages-sub/admin/`），道号 / 手机号登录，支持商品 / 课程 / 订单 / 用户 / 售后 / 数据分析等管理。

---

相关仓库：[zhs-website](https://github.com/daotoyi/zhs-website)（官网 zhenhesheng.cn）
