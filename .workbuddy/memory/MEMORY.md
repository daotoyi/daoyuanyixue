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
