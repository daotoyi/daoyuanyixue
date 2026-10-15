#!/usr/bin/env node
/**
 * 抖音小程序 · 配置同步脚本
 *
 * 从 src/manifest.json 的 mp-toutiao 段读取 AppID, 同步到抖音开发助手的
 * project.config.json; 并把合法域名清单输出到 _serverDomains 便于核对。
 *
 * 为什么需要它:
 *   AppID 同时存在于 manifest.json (构建产物 project.config.json 的来源) 和
 *   douyin-project/project.config.json (开发者助手导入的目录)。两处手改必然
 *   漂移 —— 此脚本以 manifest 为唯一数据源单向同步。
 *
 * 运行: node scripts/sync-douyin-config.js
 * 随构建自动执行: npm run build:mp-toutiao
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJSON(p) {
  return parseLenient(fs.readFileSync(path.join(ROOT, p), 'utf-8'));
}
function writeJSON(p, obj) {
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

/**
 * 宽松 JSON 解析: 容忍多行字符串值 (项目沿用 manifest.json 的注释键惯例, 形如
 * "以斜杠-星号开头、星号-斜杠结尾": "" 的说明键)。
 * 做法: 把这些键压成单行, 再解析; 写回时按原样保留, 见 withComments。
 */
function parseLenient(text) {
  const comments = [];
  // 将 "/* ... */" 形式的注释键(可跨行)压缩为 "key": "" 单行, 并记录原文
  const flattened = text.replace(/"(\/\*[\s\S]*?\*\/)\"\s*:\s*""/g, (m, c) => {
    const key = c.replace(/\s+/g, ' ');
    comments.push(key);
    return JSON.stringify(key) + ': ""';
  });
  try {
    return { data: JSON.parse(flattened), comments };
  } catch (e) {
    return { data: JSON.parse(text), comments };
  }
}

/** 还原注释键到对象尾部 (保持可读性, 不影响解析) */
function withComments(obj, comments) {
  if (!comments || !comments.length) return obj;
  const out = {};
  Object.keys(obj).forEach((k) => { if (k.indexOf('/*') === -1) out[k] = obj[k]; });
  comments.forEach((c) => { out[c] = ''; });
  return out;
}

const manifestDoc = readJSON('src/manifest.json');
const manifest = manifestDoc.data;
const tt = manifest['mp-toutiao'] || {};
const legal = tt._legal_domains || {};

// 占位符 AppID: 未配置时不覆盖现有值, 保留开发者本地已填的 AppID
const PLACEHOLDER = '__UNI__TOUTIAO';
const manifestAppId = tt.appid || '';
const hasRealAppId = manifestAppId && manifestAppId !== PLACEHOLDER;

// --- 域名清单 (manifest 为准, 缺省用抖音端实际请求的网关域) ---
const GATEWAY = 'https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com';
const CUSTOM = 'https://club.zhenhesheng.cn';
const domains = {
  request: legal.request || [GATEWAY, CUSTOM],
  uploadFile: legal.uploadFile || [GATEWAY, CUSTOM],
  downloadFile: legal.downloadFile || [GATEWAY, CUSTOM],
};

// --- 同步 douyin-project/project.config.json ---
const cfgPath = 'douyin-project/project.config.json';
const cfgDoc = readJSON(cfgPath);
const cfg = cfgDoc.data;

if (hasRealAppId && cfg.appid !== manifestAppId) {
  cfg.appid = manifestAppId;
  console.log('[sync-douyin] AppID 已同步 →', manifestAppId);
}

// 合法域名始终以 manifest 为准 (助手内可直接查看, 便于逐条核对)
cfg._serverDomains = {
  _mpAdminUrl: 'https://developer.open-douyin.com/app/miniprogram-dev/config',
  request: domains.request,
  uploadFile: domains.uploadFile,
  downloadFile: domains.downloadFile,
};

// 保留文件内的注释键 (写回时不会丢失可读性注释)
writeJSON(cfgPath, withComments(cfg, cfgDoc.comments));

/* --- 私有配置: 缺失时从模板复制, 避免新clone 下来没有本地配置 --- */
const privPath = 'douyin-project/project.private.config.json';
const privTpl = 'douyin-project/project.private.config.json.example';
if (!fs.existsSync(path.join(ROOT, privPath)) && fs.existsSync(path.join(ROOT, privTpl))) {
  fs.copyFileSync(path.join(ROOT, privTpl), path.join(ROOT, privPath));
  console.log('[sync-douyin] 已从模板生成 project.private.config.json');
}

console.log('[sync-douyin] 已同步 douyin-project/project.config.json');
if (!hasRealAppId) {
  console.log('[sync-douyin] ⚠️  manifest.json 中 mp-toutiao.appid 仍是占位符 ' + PLACEHOLDER);
  console.log('[sync-douyin]    请填入抖音开放平台的真实 AppID, 否则无法真机预览/上传');
}
console.log('[sync-douyin] 📋 服务器域名需在抖音开放平台后台手动配置:');
console.log(`             ${domains.request[0]}`);
console.log(`             ${domains.request[1]}`);
console.log('[sync-douyin] 🔧 后台: https://developer.open-douyin.com/app/miniprogram-dev/config');