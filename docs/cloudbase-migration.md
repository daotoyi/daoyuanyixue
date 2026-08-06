# CloudBase 环境迁移方案（主体不一致 → 新主体环境）

> 背景：当前环境 `zhenhesheng-d6gkez7p221305432`（腾讯云 APPID 1309518368）的认证主体与目标小程序主体不一致，无法直接绑定小程序（微信/腾讯云要求同主体）。
> 方案：把数据与配置整体迁移到**新主体账号下的新 CloudBase 环境**，改一处环境 ID 配置后重新部署即可。

---

## 一、迁移前准备（用户操作）

### 1. 确认新环境归属
目标小程序主体对应的腾讯云账号，二选一开通新环境：

- **方式 A（推荐·最省事）**：在**微信开发者工具**里打开目标小程序项目 → 顶部「云开发」→ 创建环境（微信侧云开发环境**自动与该小程序同主体**，后续绑定/支付/接管全部顺畅）
- **方式 B**：用目标主体腾讯云账号登录 `tcb.cloud.tencent.com/dev` → 创建新环境（地域建议 ap-shanghai）

> ⚠️ 新环境创建后，把**新环境 ID**（形如 `xxx-xxxxx`）发给开发者即可开始迁移。

### 2. 确认主体一致
- 方式 A：微信侧环境天然一致，无需额外操作
- 方式 B：在新账号控制台「身份认证 → 登录方式 → 微信」绑定目标小程序（接管模式），管理员扫码确认主体一致

---

## 二、数据迁移（开发者执行，可全自动）

### 1. 数据库（NoSQL 文档数据库）
旧环境全部集合导出 → 新环境导入。集合清单（从云函数代码确认）：

```
users, products, categories, orders, coupons, course_categories, courses,
user_courses, live_streams, moments, feedbacks, settings, messages,
wxmp_authors, wxmp_ticket
```

工具：CloudBase MCP（queryNoSqlDatabaseStructure / readNoSqlDatabaseContent / writeNoSqlDatabaseContent）
流程：
1. 旧环境 `listCollections` 拿到全部集合与字段
2. 逐集合 `readNoSqlDatabaseContent` 全量导出（分页）
3. 新环境 `createCollection` + `writeNoSqlDatabaseContent(insert)` 批量导入
4. 索引：`listIndexes` → 新环境 `createCollection/updateCollection` 重建索引

### 2. 云存储
旧环境存储桶全部文件下载 → 上传新环境（manageStorage download / upload）。商品图/头像等路径原样保留。

### 3. 云函数
代码完全复用，无需改业务逻辑：
- `dy-api`、`getOpenId` 部署到新环境
- 环境变量同步：DEEPSEEK_KEY（config.local.js 随函数打包）、微信开放平台参数（WXMP_*，若启用）
- 微信支付（cloudPay）在新环境「微信支付」重新开通绑定商户号

### 4. 静态托管
H5 产物 + APK + 下载页重新部署到新环境，域名换新：
- 新静态域名：`<新envId>-<新APPID>.tcloudbaseapp.com`
- 新存储CDN：`<id>-<新envId>-<新APPID>.tcb.qcloud.la`

---

## 三、配置替换（开发者执行）

全局把旧环境 ID / 域名替换为新值，涉及文件：

| 文件 | 内容 |
|---|---|
| `src/api/cloudbase.js` | ENV_ID、staticDomain、storageDomain |
| `src/api/api.js` | API_BASE（云函数网关域名） |
| `src/manifest.json` | mp-weixin 合法域名（request/uploadFile/downloadFile） |
| `src/pages/admin/dashboard.vue` | 商品图片 CDN 域名（uploadProductImg） |
| `src/pages/user/user.vue` | 头像上传 CDN 域名 |
| `src/pages/setting/setting.vue` | 静态域名/存储域名展示 |
| `scripts/deploy-cloudbase.js` | 部署脚本环境参数 |
| `scripts/seed-upload.py` | 种子数据脚本 |
| `cloudfunctions/dy-api/index.js` | wxmp extJson 中的 envId、回调 URL |

> 统一改法：`zhenhesheng-d6gkez7p221305432` → 新环境 ID；`1309518368` → 新 APPID；对应域名同步替换。

---

## 四、重新部署

1. 构建：`uni build -p h5`、`uni build -p mp-weixin`、`mobile npm run build`（APK）
2. 部署云函数：`tcb fn deploy dy-api`（新环境）
3. 部署静态托管：H5 / APK / 下载页 → 新环境
4. 更新下载页域名

---

## 五、验证清单

- [ ] 新环境数据库各集合数据完整（用户数/订单数一致）
- [ ] 商品图、头像在 H5/小程序正常显示（新 CDN 域名）
- [ ] H5 登录（手机号/微信）正常
- [ ] 小程序：wx.cloud.init 指向新环境，登录（接管模式）正常
- [ ] 支付：新环境微信支付开通后下单支付成功
- [ ] AI 解盘/问答（DEEPSEEK_KEY）正常
- [ ] 后台管理全部模块数据可见可操作

---

## 六、注意

1. **旧环境保留不销毁**，验证全部通过后再下线（或保持并行只读）
2. 数据库迁移建议**低峰执行**（订单/用户数据实时性：迁移期间产生的增量数据需在切换时补迁一次）
3. 微信支付需在新环境重新开通绑定（商户号不变，主体同即可）
4. 切换后小程序端 `wx.cloud.init` 的 env 由新环境接管，旧环境 H5 域名可保留一段过渡期
