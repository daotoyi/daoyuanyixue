/**
 * TCB 域名自动注入脚本
 *
 * 将 CloudBase 环境域名自动适配到微信小程序合法域名配置。
 * 读取 manifest.json 中的 _tcb_domains，生成 project.private.config.json 中的域名配置。
 *
 * 运行方式:
 *   node scripts/inject-tcb-domains.js
 *
 * macOS 兼容:
 *   - 所有路径使用正斜杠 (/)
 *   - 文件名全小写
 */

const fs = require('fs');
const path = require('path');

// --- 项目根目录 (macOS 兼容：使用 path.resolve，不假设 cwd) ---
const ROOT = path.resolve(__dirname, '..');

// --- 读取 manifest.json ---
const manifestPath = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// --- 读取 cloudbaserc.json ---
const cloudbaseRcPath = path.join(ROOT, 'cloudbaserc.json');
const cloudbaseRc = JSON.parse(fs.readFileSync(cloudbaseRcPath, 'utf-8'));

// --- 提取 TCB 域名 ---
const tcbDomains = (manifest._tcb_domains && manifest._tcb_domains.domains) || {};
const envId = (manifest._tcb_domains && manifest._tcb_domains.envId) || cloudbaseRc.envId;
const region = (manifest._tcb_domains && manifest._tcb_domains.region) || cloudbaseRc.region;

// 基础 TCB 域名列表
const baseDomains = {
  request: [
    `https://${cloudbaseRc.staticDomain || `${envId}-1309518368.tcloudbaseapp.com`}`,
    `https://${cloudbaseRc.storageDomain || `7a68-${envId}-1309518368.tcb.qcloud.la`}`,
    'https://tcb-api.tencentcloudapi.com',
    `https://${region}.tcb-api.tencentcloudapi.com`,
    'https://api.weixin.qq.com',
    'https://openapi.wxaqcloud.com',
    // CloudBase Web SDK CDN
    'https://static.cloudbase.net',
  ],
  uploadFile: [
    `https://${cloudbaseRc.staticDomain || `${envId}-1309518368.tcloudbaseapp.com`}`,
    `https://${cloudbaseRc.storageDomain || `7a68-${envId}-1309518368.tcb.qcloud.la`}`,
    'https://tcb-api.tencentcloudapi.com',
  ],
  downloadFile: [
    `https://${cloudbaseRc.staticDomain || `${envId}-1309518368.tcloudbaseapp.com`}`,
    `https://${cloudbaseRc.storageDomain || `7a68-${envId}-1309518368.tcb.qcloud.la`}`,
    'https://tcb-api.tencentcloudapi.com',
    'https://static.cloudbase.net',
  ],
  socket: [
    `wss://${cloudbaseRc.staticDomain || `${envId}-1309518368.tcloudbaseapp.com`}`,
    'wss://tcb-api.tencentcloudapi.com',
  ],
};

// 合并 manifest 中手动配置的域名
Object.keys(tcbDomains).forEach((key) => {
  if (baseDomains[key]) {
    const existing = new Set(baseDomains[key]);
    (tcbDomains[key] || []).forEach((d) => existing.add(d));
    baseDomains[key] = [...existing];
  }
});

// --- 生成 project.private.config.json ---
const privateConfig = {
  description: `TCB 域名自动注入 — env: ${envId}, region: ${region}`,
  condition: {},
  setting: {
    urlCheck: true, // 开启域名校验
  },
  // 微信小程序服务器域名配置
  // 注意: 此配置仅供参考。实际合法域名需在微信小程序管理后台设置。
  // 路径: 开发管理 -> 开发设置 -> 服务器域名
  _serverDomains: {
    _description: '以下域名需要手动添加到微信小程序管理后台的「服务器域名」配置中',
    _mpAdminUrl: 'https://mp.weixin.qq.com/wxamp/devsetting/domain',
    request: baseDomains.request,
    uploadFile: baseDomains.uploadFile,
    downloadFile: baseDomains.downloadFile,
    socket: baseDomains.socket,
  },
};

// --- macOS 路径兼容 ---
// 确保所有路径使用正斜杠
const privateConfigPath = path.join(ROOT, 'project.private.config.json')
  .split(path.sep).join('/');

fs.writeFileSync(
  privateConfigPath,
  JSON.stringify(privateConfig, null, 2) + '\n',
  'utf-8'
);

// --- 输出摘要 ---
console.log('\n✅ TCB 域名配置已生成');
console.log(`   环境: ${envId} (${region})`);
console.log(`   输出: project.private.config.json\n`);
console.log('📋 需要手动添加到微信小程序管理后台的域名:\n');

console.log('🔗 request 合法域名:');
baseDomains.request.forEach((d) => console.log(`   ${d}`));

console.log('\n📤 uploadFile 合法域名:');
baseDomains.uploadFile.forEach((d) => console.log(`   ${d}`));

console.log('\n📥 downloadFile 合法域名:');
baseDomains.downloadFile.forEach((d) => console.log(`   ${d}`));

console.log('\n🔌 socket 合法域名:');
baseDomains.socket.forEach((d) => console.log(`   ${d}`));

console.log('\n🔧 管理后台: https://mp.weixin.qq.com/wxamp/devsetting/domain');
console.log('⚠️  域名变更后需重新编译上传才生效\n');
