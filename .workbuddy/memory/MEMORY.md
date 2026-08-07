# zhs-deploy 项目记忆

## 项目技术栈

- uni-app (Vue 3 + Vite) 多端统一: H5 / 微信小程序 / App
- UI 组件库: **uview-plus 3.8.86**（easycom 自动注册 u- 前缀组件）
- 状态管理: Pinia | CloudBase: @cloudbase/js-sdk
- **源码必须在 `src/` 目录**（uni-app Vite 硬性要求，manifest.json 等都在 src/ 下）
- 构建: `node node_modules/.bin/uni build [-p mp-weixin]` | dev: `node node_modules/.bin/uni`
- 微信小程序 AppID: `wxe4eea58de8107961`

## CloudBase 环境

- envId: `zhenhesheng-d6gkez7p221305432`
- 区域: `ap-shanghai`
- 静态域名: `zhenhesheng-d6gkez7p221305432-1309518368.tcloudbaseapp.com`
- 云存储CDN: `7a68-zhenhesheng-d6gkez7p221305432-1309518368.tcb.qcloud.la`

## 环境能力

- NoSQL 文档数据库 (tnt-19urkukbc)
- 无 PostgreSQL / MySQL
- 云函数: Node.js 可用 (namespace 已就绪)
- 静态托管: online

## MCP 工具

- CloudBase MCP 通过 mcporter 调用: `npx -y mcporter call cloudbase.<tool> ...`
- 配置文件: `config/mcporter.json`

## 版本管理 (Git)

- **2026-08-05 建立**: 基线提交 977fb9d (v1.0.0 完整源码, 171 文件)
- Git 身份: daotoyi / wenhuas.shi@gmail.com
- **铁律 (用户明确要求 08-05)**: **每一次修改 = 一次版本管理**。无论改动大小，完成一次修改立即: `git add -A && git commit -m "vX.Y.Z: 描述"` + `git push origin main`。用户可随时回退到任意版本点
- 版本号惯例: v1.1.0(16项) / v1.2.0(9项) 等大版本递进; 小修改用 fix:/feat: 前缀
- .gitignore 排除: node_modules / dist / mobile android build / keystore / local.properties
- **远程仓库 (已推送)**: https://github.com/daotoyi/daoyuanyixue (HTTPS 推送, keychain 存有 PAT 凭证; SSH 不通)
- 推送命令: git push origin main; 拉取: git pull origin main
- 云端备份: ✅ GitHub 已同步

## 用户约定

- **项目内文件删除免确认 (2026-08-06)**: 项目目录(/Users/wenhua/WorkBuddy/zhs-deploy)内需要删除的文件直接删, 不要问确认
- **版本号策略 (2026-08-07 用户确认)**: 日常小改动/测试**不升版本号** (微信上传支持同版本号覆盖); 只有**正式提审/上线前**才用 `node scripts/bump-version.js` 升一次 (当前 v1.10.5); 构建前跑 `node scripts/gen-version.js` 同步完整版本; bump 读 git tag 为准


