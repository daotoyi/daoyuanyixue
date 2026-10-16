# 抖音小程序「通用上传分支」剥离方案设计文档

> 项目：道元易学（zhs-deploy，uni-app Vue3 + Vite，CloudBase 后端）  
> 日期：2026-10-14  
> 范围：**仅聚焦前端小程序通用上传能力剥离**，让抖音小程序（`mp-toutiao`）复用现有 CloudBase 后台（`dy-api` 云函数 + 云存储），实现"后台设置、各端同步"。  
> 登录 / 支付 / 分享改造不在本文档范围（见可行性分析报告），但会标注与上传相关的依赖点。

---

## 0. 一句话结论

后台系统（`dy-api` 云函数 + CloudBase 数据库 + 云存储）**完全平台无关，抖音端零后端改动即可复用**。前端唯一必须解决的硬骨头是**上传链路**：当前 `cloudbase.js` 的上传逻辑被浏览器 API（`fetch`/`Blob`/`FormData`/`document`/`canvas`）和微信专属 `wx.cloud.uploadFile` 强耦合，抖音小程序运行环境（非浏览器、无 `wx.cloud`）两者都不具备 → **抖音端编译后上传必崩**。本文档给出抽离"小程序通用 HTTP 上传分支"的完整改造方案。

---

## 1. 现状剖析：当前上传链路

### 1.1 `getStorage()` 的三端实现（`src/api/cloudbase.js` 第 610–784 行）

| 平台分支                          | 代码位置    | 上传实现                                                                                            | 抖音能否用              |
| ----------------------------- | ------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| `#ifdef MP-WEIXIN`            | 615–636 | `wx.cloud.uploadFile`（微信云开发原生直传）                                                                | ❌ 抖音无 `wx.cloud`   |
| `#ifndef MP-WEIXIN`（H5 / App） | 638–783 | `@cloudbase/js-sdk` `app.uploadFile`，内部依赖 `document`/`canvas`/`Image`/`fetch`/`Blob`/`FormData` | ❌ 抖音非浏览器，这些全局对象全缺失 |

**关键事实**：抖音小程序命中第二个分支（`MP-TOUTIAO` 不是 `MP-WEIXIN`）。该分支第 700–705 行 `fetch(API_BASE, …)`、第 755 行 `new FormData()`、第 281 行 `fetch(putUrl, {method:'PUT'})` 等——抖音环境无全局 `fetch`/`FormData` → 直接 `ReferenceError: fetch is not defined`，上传功能整体不可用。

### 1.2 图片压缩（第 441–468 行 `compressImageToBase64`）

全程依赖浏览器 `Image` / `document.createElement('canvas')` / `canvas.toDataURL`。抖音无 `document`/`canvas` → 完全不可用。

### 1.3 视频分片 `uploadMultipartToCos`（第 116–433 行）

依赖 `fetch`（`readBlobSlice` 第 99 行、`uploadOne` 第 281 行）、`new Blob([ab])`（第 107 行）、`FormData`（第 755 行）。抖音全部缺失。

### 1.4 `API_BASE` 的端差异（重要）

- `cloudbase.js` 第 14–16 行：`API_BASE` 在 H5 且 hostname 含 `club` 时用 `/dy-api`（同源），否则用 TCB 全域名 `https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api`。**抖音端无 `window` → 自动走 TCB 全域名分支**，故上传网关地址无需额外写死。
- `api.js` 第 35 行：`API_BASE` 为**无条件常量**，同样是上述 TCB 全域名。

> 注意：`api.js` 实际请求的域名是 `…ap-shanghai.app.tcloudbase.com`，而 `manifest.json` 的 `_tcb_domains` 列的是 `…tcloudbaseapp.com`（不同子域，见 §6）。这是抖音端合法域名配置的坑点。

### 1.5 业务请求层（好消息，无需改）

`api.js` 的 `_callFunction`（第 48–83 行）非微信分支（第 63–82 行）**直接用 `uni.request(API_BASE)` 打 TCB 网关，不调用 `getCloudBaseInstance` / `getCallableFunction`**，不依赖任何 SDK。抖音命中此分支 → **业务请求层零改动即可工作**。文件 URL 解析走 `app.fileUrl` 网关接口（`api.js` 第 392 行 `fileUrl` 已导出），抖音同样零后端改动。

---

## 2. 目标架构

```
                  ┌─────────────┐
   抖音小程序      │ MP-TOUTIAO  │── 新增专用分支：uni.* + 网关 storage.*
   (mp-toutiao)    └─────────────┘     ├─ 图片: uni.compressImage + fs.readFile(base64) + storage.uploadBase64
                  ┌─────────────┐     └─ 视频: 首版降级(提示用微信/H5) / 后续分片uni.request PUT
   微信小程序      │ MP-WEIXIN   │── 保留 wx.cloud.uploadFile (当前已上线、最优，不动)
   (mp-weixin)     └─────────────┘
                  ┌─────────────┐
   H5 / App        │ H5/APP-PLUS │── 保留浏览器分支(canvas压缩质量更好)，但内部抽公共网关调用
                  └─────────────┘
```

**核心设计**：抽一个**平台无关的"网关上传"主入口** `uploadViaGateway(localPath, cloudPath, opts)`，只依赖 `uni.*` API + 网关 `storage.*` action：

- 图片：跨端压缩（`uni.compressImage` 小程序 / `canvas` H5）→ 读 base64（`uni.getFileSystemManager().readFile({encoding:'base64'})` 小程序 / 浏览器读取 H5）→ `storage.uploadBase64` 网关中转。
- 视频：首版抖音降级；后续 `uploadMultipartToCos` 小程序化（见 §3.4）。

---

## 3. 详细改造方案（代码级）

### 3.1 新增平台无关工具函数（`src/api/cloudbase.js`）

```js
/* ===== 小程序通用图片压缩 (替代浏览器 canvas 方案, 抖音/微信小程序共用) ===== */
async function compressImageMini(src, quality = 80) {
  // uni.compressImage 在 mp-weixin / mp-toutiao 均可用
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality,                       // 1-100
      success: (r) => resolve(r.tempFilePath),
      fail: (e) => reject(e),
    })
  })
}

/* ===== 小程序读文件为 base64 (替代浏览器 fetch+FileReader) ===== */
async function readFileBase64(localPath) {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    fs.readFile({
      filePath: localPath,
      encoding: 'base64',
      success: (r) => resolve(r.data),     // 纯 base64 字符串
      fail: reject,
    })
  })
}

/* ===== 网关 base64 上传 (与 H5 同款云函数接口, 零后端改动) ===== */
async function uploadImageBase64Mini(cloudPath, base64) {
  if (!base64 || base64.length >= BASE64_GATEWAY_LIMIT) {
    throw new Error('图片过大，无法走网关中转（超过 ' + BASE64_GATEWAY_LIMIT + ' 字节）')
  }
  const res = await new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE,
      method: 'POST',
      timeout: 20000,
      data: { action: 'storage.uploadBase64', data: { cloudPath, base64 } },
      success: (r) => resolve(r.data),
      fail: (e) => reject(new Error('网关上传失败: ' + (e.errMsg || ''))),
    })
  })
  if (res && res.status === 200 && res.data && res.data.fileID) return { fileID: res.data.fileID }
  throw new Error((res && res.msg) || '网关上传未返回 fileID')
}
```

### 3.2 `getStorage()` 重构（抖音分支 + 保留微信/H5）

在现有 `#ifdef MP-WEIXIN` 分支**之后**、`#ifndef MP-WEIXIN` 分支**之前**，插入抖音专用分支：

```js
  // #ifdef MP-TOUTIAO
  // 抖音小程序: 无 wx.cloud、非浏览器 → 走纯 uni.* + 网关 HTTP 上传
  return {
    uploadFile: async (filePath, cloudPath, onProgress) => {
      const isImage = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(cloudPath)
        || cloudPath.includes('covers/') || cloudPath.includes('images/') || cloudPath.includes('avatar')
      if (isImage) {
        // 1) 跨端压缩 (抖音/微信小程序共用 uni.compressImage)
        let compressed = filePath
        try { compressed = await compressImageMini(filePath, 80) } catch (e) { /* 压缩失败用原图兜底 */ }
        // 2) 读 base64
        let base64 = ''
        try { base64 = await readFileBase64(compressed) } catch (e) { throw new Error('读取图片失败') }
        // 3) 网关中转 (复用 H5 同款 storage.uploadBase64, 零后端改)
        return uploadImageBase64Mini(cloudPath, base64)
      }
      // 视频/非图片: 首版抖音降级 (见 §3.4 后续方案)
      throw Object.assign(new Error('抖音端暂不支持视频上传，请使用微信小程序或 H5 端发布视频'), { code: 'DY_NOT_SUPPORTED' })
    },
    getTempFileURL: (fileList) => wrap((done, fail) => app.getTempFileURL({ fileList, success: done, fail })),
    // 注: 抖音端 app 未初始化 SDK, getTempFileURL 改用网关 app.fileUrl, 见 §4
  }
  // #endif
```

> 微信分支（615–636 `wx.cloud.uploadFile`）与 H5/App 分支（638–783）**保持不变**。H5 分支内部可不动（它只在 H5/App 编译，不影响抖音）。

### 3.3 `initCloudBase()` / `getAuth()` 抖音分支

**`initCloudBase()`**（第 507 行起）：当前抖音会命中 `#ifndef MP-WEIXIN` 的 js-sdk 逻辑（第 521–558 行），但 js-sdk 在抖音无 `window` 会失败/无意义。新增：

```js
  // #ifdef MP-TOUTIAO
  // 抖音小程序: 业务请求走 uni.request 直连网关, 不依赖任何 SDK, 直接返回空壳
  cloudApp = null
  return null
  // #endif
```

**`getAuth()`**（第 789 行起）：当前 `#ifdef MP-WEIXIN` 用 `getOpenId`（wx.cloud.callFunction），抖音不可用。首版抖音登录走"手机号+密码"（`phoneLogin` 接口，零后端改，见可行性分析）。新增：

```js
  // #ifdef MP-TOUTIAO
  // 抖音首版: 不依赖微信 openid, 登录走 phoneLogin; getLoginState 返回 null 表示"未绑定微信态"
  return { getLoginState: async () => null }
  // #endif
```

> 配套：登录页 `login.vue` 抖音端需把"微信一键登录"降级为"手机号+密码/验证码"（可行性分析已覆盖，本文档不展开）。

### 3.4 视频分片 `uploadMultipartToCos` 小程序化（选做 / 后续）

首版建议**抖音视频上传降级**（抛出 `DY_NOT_SUPPORTED`，UI 友好提示）。若后续要做，改造点如下（微信/抖音共用，改造一次收益两端）：

| 改造点                       | 原实现                                                  | 小程序实现                                                                                                          |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `readBlobSlice`（第 94–108） | `new Blob([ab])` 返回 Blob                             | 直接返回 `ab`（ArrayBuffer / Uint8Array）                                                                            |
| `uploadOne` 第 281 行       | `fetch(putUrl, {method:'PUT', body: piece, signal})` | `uni.request({url: putUrl, method: 'PUT', data: piece, header: {'Content-Type': 'application/octet-stream'}})` |
| `probeFileSize`（第 73–89）  | `fetch(filePath).blob()`                             | 抖音无 fetch → 已自动落到 `uni.getFileInfo` 分支（第 80 行），**无需改**                                                         |
| 暂停/取消 signal              | 依赖 AbortController.signal 传给 fetch                   | 改用 `control` 轮询机制（代码已有 `waitIfPaused`/`cancelled` 判定）+ 硬超时，**去掉 signal 依赖**                                    |
| `AbortController` 兼容性     | 抖音现代基础库支持                                            | 若不确定，上传循环内以 `control.cancelled` 轮询为主、AbortController 为辅                                                        |

> 关键验证项：抖音 `tt.request` 的 `data` 传 `ArrayBuffer` 是否被接受为请求体（微信 `wx.request` 支持，抖音应一致，但需真机/模拟器实测）。

---

## 4. 文件 URL 解析（抖音端读图）

抖音端读 `cloud://fileID` 不能用 SDK，但 `app.fileUrl` 是网关接口（`api.js` 第 392 行 `fileUrl` 已导出，对应后端 `app.fileUrl` action 调 `getTempFileURL` 签名 URL）。抖音端所有 `resolveCloudUrl(cloud://...)` 调用应改为走 `api.fileUrl`（H5 已是此路径）。**无需后端改动**。

---

## 5. 上层调用方影响（无缝迁移）

所有页面通过 `storage.uploadFile(filePath, cloudPath, onProgress?, control?, onStatus?, resume?, fileObj?) → {fileID}` 调用。**抖音分支保持完全相同的函数签名与返回结构**，调用方零改动。调用点清单（来自代码检索）：

| 文件                                                                | 用途                  |
| ----------------------------------------------------------------- | ------------------- |
| `src/pages-sub/login/login.vue:439`                               | 注册头像                |
| `src/pages/user/user.vue:358`                                     | 个人头像                |
| `src/pages-sub/moment/publish.vue:67`                             | 动态图片                |
| `src/components/aftersale-popup/aftersale-popup.vue:98`           | 售后图片                |
| `src/pages-sub/user/feedback.vue:45`                              | 反馈图片                |
| `src/pages-sub/admin/dashboard.vue:2159/2869/2912/2973/2999/3039` | 后台盘道封面/视频、课程封面、商品图等 |

> 后台 `dashboard.vue` 仅在 H5/web 使用，抖音分支上线不影响它（H5 分支不变）。

---

## 6. `manifest.json` 配置

### 6.1 新增 `mp-toutiao` 段（与 `mp-weixin` 同构，仅 AppID 与两个特有字段不同）

`src/manifest.json` 的 `mp-toutiao` 段已按微信端同构配好（26 个 setting 字段，
与 `mp-weixin` 顶层结构零差异）。关键点：

```json
"mp-toutiao": {
  "/* AppID: 抖音开放平台 → 小程序 → 开发设置 获取 */": "",
  "appid": "替换为你的抖音小程序AppID",
  "projectname": "道元易学",
  "compileType": "miniprogram",
  "setting": { "/* 与 mp-weixin 同构, 另加 minifyWXSS / urlCheckParam */": "" },
  "packOptions": { "ignore": [], "include": [] },
  "_legal_domains": { "/* 域名清单, 供人工核对 */": "" }
}
```

### 6.2 构建产物即导入目录（与微信端完全一致）

抖音小程序开发助手的导入目录 = **`dist/build/mp-toutiao/`**，与微信端导入
`dist/build/mp-weixin/` 的模式完全相同：

- `uni build -p mp-toutiao` 会把 manifest 的 `mp-toutiao` 段**完整编译**进
  `dist/build/mp-toutiao/project.config.json`（AppID / 全部 setting / condition）
- 该文件与 `app.json` 同批生成，开发者工具不会改写它
- AppID 填在 manifest（唯一数据源），每次构建自动带上，不存在两处手改漂移

> ⚠️ **不需要**额外的持久化配置目录。曾尝试建 `douyin-project/` + `miniprogramRoot`
> 指向产物，理由是「dist 被 gitignore 会丢配置」——但这个担心不成立：
> 配置由 manifest 每次构建重新生成，且开发者工具不写产物内的配置文件。
> 微信端一直是这么跑的，抖音端照搬即可。多一个目录只会让「导入哪个目录」变困惑。

### 6.3 合法域名（关键坑）

抖音小程序的 request / uploadFile / downloadFile 合法域名**需在抖音开放平台后台手动配置**（manifest 无法自动注入抖音后台）。清单已写在 `manifest.mp-toutiao._legal_domains`，必须包含：

- `https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com` ← **注意此子域**，与 `_tcb_domains` 里列的 `.tcloudbaseapp.com` 不是同一个，必须精确加。
- `https://club.zhenhesheng.cn`（上传/请求走自定义域名时）
- COS 上传直传域名（非图片走 `uni.uploadFile` 直传 COS 时需要）

配置入口：抖音开放平台 → 小程序 → 开发设置 → 服务器域名

---

## 7. 风险与降级策略

| 风险                                                            | 等级       | 应对                                                                            |
| ------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `uni.compressImage` 抖音支持度                                     | 低        | 抖音支持 `tt.compressImage`（uni 已封装）；压缩失败已做原图兜底                                   |
| `uni.getFileSystemManager().readFile({encoding:'base64'})` 抖音 | 低        | 标准小程序 API，支持                                                                  |
| 网关 `storage.uploadBase64` 体积上限（~90KB base64）                  | 中        | `uploadImageBase64Mini` 已校验；图片经 `uni.compressImage quality:80` 后基本落在此内；超限抛错提示 |
| 视频上传首版不支持                                                     | 中        | 已设计为友好降级（`DY_NOT_SUPPORTED`），不影响图片主链路                                         |
| `initCloudBase` 抖音返回 null 是否影响其他模块                            | 低        | 业务请求走 `uni.request` 不依赖；`getStorage` 抖音分支不依赖 `cloudApp`                       |
| COS 分片 `uni.request` PUT ArrayBuffer                          | 中（仅后续方案） | 需真机实测；首版不触及                                                                   |

---

## 8. 验证清单

1. 抖音开发者工具导入项目，编译 `mp-toutiao`，确认无 `fetch is not defined` 类报错。
2. 抖音端：个人页改头像 → 上传成功返回 `fileID` → 详情/列表头像正常显示（`resolveCloudUrl` 走 `app.fileUrl`）。
3. 抖音端：发布动态配图 → 上传成功 → 动态列表/详情显示。
4. 抖音端：售后/反馈上传图片 → 后台可见。
5. 抖音端：点击视频上传 → 友好提示"请使用微信/H5 端"。
6. 跨端一致性：微信端、H5 上传行为不受本次改造影响（回归测试）。

---

## 9. 工作量估算

| 项             | 工时    |
| ------------- | ----- |
| §3.1 平台无关工具函数 | 0.5 天 |


| §3.2 `getStorage()` 抖音分支 + §3.3 initCloudBase/getAuth 抖音分支 | 0.5 天 |  
| §5 上层调用方联调 + §6 manifest + 合法域名 | 0.5 天 |  
| §8 抖音开发者工具联调验证 | 0.5 天 |  
| **合计（首版，含图片上传）** | **约 2 天** |  
| 视频分片小程序化（选做） | +1.5 天 |

---

## 附录 A：当前 `storage.uploadFile` 全量调用点（代码检索结果）

```
src/pages-sub/login/login.vue:439,441
src/pages/user/user.vue:358,367,369
src/pages-sub/moment/publish.vue:67,68,78,81
src/components/aftersale-popup/aftersale-popup.vue:34,98,101,108,111
src/pages-sub/user/feedback.vue:15,45,48,55,58
src/pages-sub/admin/dashboard.vue:2159,2169,2173,2869,2877,2879,2912,2922,2928,2973,2981,2983,2999,3007,3009,3039,3046,3048,3433,3449,3589
```

> 这些调用方接口签名保持不变即可无缝迁移；后台 `dashboard.vue` 仅 H5 使用，不受抖音分支影响。
