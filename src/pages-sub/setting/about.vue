<template>
  <view class="about-page">
    <view class="about-head">
      <view class="about-seal"><image class="about-seal-img" :src="logoUrl" mode="aspectFit"></image></view>
      <text class="about-name">道元易学</text>
      <text class="about-slogan">观天道 · 明人事 · 致中和</text>
      <text class="about-version">{{ APP_FULL_VERSION }}</text>
    </view>

    <view class="about-info">
      <view class="info-row"><text class="info-label">关于我们</text><text class="info-value">真和盛文化</text></view>
      <view class="info-row"><text class="info-label">版本</text><text class="info-value">{{ APP_FULL_VERSION }}（{{ APP_BUILD_DATE }}）</text></view>
      <view class="info-row"><text class="info-label">理念</text><text class="info-value">融合传统智慧与现代科技</text></view>
      <view class="info-row" @tap="copyContact"><text class="info-label">开发</text><text class="info-value">昊辰（zhenhesheng@126.com）</text></view>
      <view class="info-row" @tap="openSite('https://zhenhesheng.cn')"><text class="info-label">网站</text><text class="info-value info-link">https://zhenhesheng.cn</text></view>
      <view class="info-row" @tap="openSite('https://club.zhenhesheng.cn')"><text class="info-label">同修汇</text><text class="info-value info-link">https://club.zhenhesheng.cn</text></view>
    </view>

    <view class="about-foot">
      <text>道元易学 · 传承华夏智慧</text>
      <text class="foot-sub">© 2026 道元易学 All Rights Reserved</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { APP_FULL_VERSION, APP_BUILD_DATE } from '../../version'
import { staticUrl } from '../../utils/static-url'

/* logo 统一走云托管静态 URL (小程序不打包 static 图片, 2026-08-25) */
const logoUrl = computed(() => staticUrl('/static/logo.png'))

/* 点击邮箱 → 复制到剪贴板 (H5/小程序通用) */
function copyContact() {
  uni.setClipboardData({
    data: 'zhenhesheng@126.com',
    success: () => uni.showToast({ title: '邮箱已复制', icon: 'success' }),
  })
}

/* 点击网站 → H5 新窗口打开; 小程序复制链接 */
function openSite(url) {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' }),
  })
  // #endif
}
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #9c1630 0%, #9c1630 380rpx, #f8f5f0 380rpx);
}
.about-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0 60rpx;
}
.about-seal {
  width: 150rpx;
  height: 150rpx;
  border: 3rpx solid #b8860b;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6ead3; /* 实心米金底, 让深色 logo 可见 (原半透明在深棕背景上看不见) */
  margin-bottom: 26rpx;
}
.about-seal-img {
  width: 120rpx;
  height: 120rpx;
}
.about-name {
  font-size: 40rpx;
  font-weight: 500;
  letter-spacing: 8rpx;
  color: #fffafa;
}
.about-slogan {
  margin-top: 14rpx;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: rgba(254, 251, 246, 0.6);
}
.about-version {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #b8860b;
  background: rgba(196, 164, 132, 0.15);
  padding: 6rpx 24rpx;
  border-radius: 999rpx;
}

.about-info {
  margin: 0 24rpx;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  overflow: hidden;
}
.info-row {
  display: flex;
  padding: 26rpx 30rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  width: 170rpx;
  font-size: 26rpx;
  color: #55524c;
  flex-shrink: 0;
}
.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #2a2a2a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.info-link {
  color: #c41e3a;
  text-decoration: underline;
}

.about-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60rpx;
  font-size: 22rpx;
  color: #55524c;
}
.foot-sub {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #8a857c;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .about-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .about-page {
    max-width: 1320px;
  }
}

</style>
