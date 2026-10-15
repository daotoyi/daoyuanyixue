# 抖音小程序（mp-toutiao）— 抖音开发助手项目目录

## 这是什么

抖音小程序开发助手的**导入目录**。开发者助手里选「导入项目」→ 指向本文件夹。

## 目录结构

```
douyin-project/              ← 开发者助手导入这里（持久化, 进 git）
├── project.config.json      ← AppID / 调试设置 / miniprogramRoot
├── project.private.config.json      ← 本地覆盖 (gitignore)
├── project.private.config.json.example ← 模板 (缺失时脚本自动复制)
└── README.md

dist/build/mp-toutiao/       ← 实际代码产物（gitignore, 每次构建重新生成）
```

`project.config.json` 里的 `miniprogramRoot` 指向 `../dist/build/mp-toutiao/`，
所以本目录里放配置、`dist/` 里放代码，两者分离，重建不丢配置。

## AppID 单一数据源

AppID 写在 `src/manifest.json` 的 `mp-toutiao.appid`（唯一数据源），
构建后由同步脚本单向写入本目录的 `project.config.json`：

```bash
npm run build:mp-toutiao   # 构建 + 自动同步配置
npm run sync:douyin        # 只同步配置
node scripts/sync-douyin-config.js   # 同上
```

同步是**幂等**的，连跑多次结果一致；`project.private.config.json` 缺失时
自动从 `.example` 模板创建。

当前 manifest 里是占位符 `__UNI__TOUTIAO`，**必须替换才能真机预览/上传**。
填完跑一次 `npm run sync:douyin` 即可同步过来。

## 上手三步

### 1. 配置 AppID

在抖音开放平台（https://developer.open-douyin.com）创建小程序，
拿到 AppID 后写入 `project.config.json` 的 `appid` 字段
（或写进 `project.private.config.json` 覆盖，不污染 git）。

当前仓库里是占位符 `__UNI__TOUTIAO`，**必须替换才能真机预览/上传**。

### 2. 构建代码

```bash
npm run build:mp-toutiao
# 构建 + 自动同步 project.config.json (AppID / 域名从 manifest 注入)
```

产物落在 `dist/build/mp-toutiao/`。

### 3. 导入开发者助手

- 打开抖音小程序开发助手
- 导入项目 → 选择 `douyin-project/` 目录
- 填入 AppID → 编译 → 预览（扫码真机）

## 上线流程

1. `npm run build:mp-toutiao` 构建
2. 在抖音开放平台后台配置**服务器域名**（见下）
3. 开发者助手里「上传」→ 填版本号 `2.0.1` → 提交审核
4. 审核通过后发布

## 服务器域名（必配，否则真机一切请求失败）

抖音开放平台 → 小程序 → 开发设置 → 服务器域名，逐条添加：

| 类型 | 域名 |
|---|---|
| request | `https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com` |
| request | `https://club.zhenhesheng.cn` |
| uploadFile | 同上两条 |
| downloadFile | 同上两条 |

⚠️ **易错点**：`app.tcloudbase.com`（云函数网关，上传/请求走这个）和
`tcloudbaseapp.com`（静态托管，图片走这个）是**两个不同子域**，只配一个会 401/403。

## 抖音端能力边界

| 功能 | 状态 | 说明 |
|---|---|---|
| 浏览/下单/课程/社区 | ✅ 可用 | 业务请求走 `uni.request` 直连网关，与 H5 同链路 |
| 图片上传（头像/动态/售后/反馈） | ✅ 可用 | 压缩→base64→网关中转，超限自动降级 COS 直传 |
| 视频/文件上传 | ✅ 可用 | `uni.uploadFile` multipart 直传 COS |
| 登录 | ⚠️ 降级 | 无一键登录，走手机号 + 密码/验证码 |
| 支付 | ⚠️ 降级 | 无原生支付，复制 H5 收银台链接到浏览器完成微信支付 |

后端 `dy-api` 云函数完全复用，**零改动**。

## 相关代码

平台适配层在 `src/platform/douyin/`，仅抖音端进入产物：

- `env.js` 环境常量 · `gateway.js` 网关调用 · `image.js` 图片处理
- `storage.js` 上传 · `auth.js` 登录降级 · `pay.js` 支付降级

详细设计见 `docs/douyin-upload-design.md`。