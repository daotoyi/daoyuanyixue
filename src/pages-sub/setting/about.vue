<template>
  <view class="about-page">
    <view class="about-head">
      <view class="about-seal"><image class="about-seal-img" src="/static/logo.png" mode="aspectFit"></image></view>
      <text class="about-name">道元易学</text>
      <text class="about-slogan">观天道 · 明人事 · 致中和</text>
      <text class="about-version">{{ APP_FULL_VERSION }}</text>
    </view>

    <view class="about-info">
      <view class="info-row"><text class="info-label">关于我们</text><text class="info-value">真和盛文化</text></view>
      <view class="info-row"><text class="info-label">版本</text><text class="info-value">{{ APP_FULL_VERSION }}（{{ APP_BUILD_DATE }}）</text></view>
      <view class="info-row"><text class="info-label">理念</text><text class="info-value">融合传统智慧与现代科技</text></view>
    </view>

    <view class="about-foot">
      <text>道元易学 · 传承华夏智慧</text>
      <text class="foot-sub">© 2026 道元易学 All Rights Reserved</text>
    </view>
  </view>
</template>

<script setup>
import { APP_FULL_VERSION, APP_BUILD_DATE } from '../../version'
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #4e3420 0%, #4e3420 380rpx, #f8f3ea 380rpx);
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
  border: 3rpx solid #c4a484;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(196, 164, 132, 0.12);
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
  color: #fefbf6;
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
  color: #c4a484;
  background: rgba(196, 164, 132, 0.15);
  padding: 6rpx 24rpx;
  border-radius: 999rpx;
}

.about-info {
  margin: 0 24rpx;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  overflow: hidden;
}
.info-row {
  display: flex;
  padding: 26rpx 30rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  width: 170rpx;
  font-size: 26rpx;
  color: #857563;
  flex-shrink: 0;
}
.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #42372c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.about-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60rpx;
  font-size: 22rpx;
  color: #857563;
}
.foot-sub {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #b3a595;
}
</style>
