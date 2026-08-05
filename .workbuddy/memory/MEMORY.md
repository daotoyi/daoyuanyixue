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
- **惯例: 每次完成任务后必须 git commit 一个版本点** (git add -A && git commit -m "描述")
- .gitignore 排除: node_modules / dist / mobile android build / keystore / local.properties
- 云端备份: 待用户提供 Gitee/GitHub 仓库地址后推送 (GitHub SSH 不通, 建议 Gitee)
