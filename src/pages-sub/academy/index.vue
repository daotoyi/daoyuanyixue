<template>
  <view class="academy-page">
    <view class="ac-header">
      <view class="ac-deco">道</view>
      <view class="ac-headtxt">
        <text class="ac-title">道学 · 易学研究院</text>
        <text class="ac-sub">师者引路 · 各擅其学</text>
      </view>
    </view>

    <view class="demo-tip">
      <text>骨架演示版 · 老师数据暂为内置，确认后接入云端配置</text>
    </view>

    <view class="ac-list">
      <view class="teacher-card" v-for="t in teachers" :key="t.id" @tap="goTeacher(t)">
        <view class="tc-avatar">{{ t.avatar }}</view>
        <view class="tc-main">
          <view class="tc-name-row">
            <text class="tc-name">{{ t.name }}</text>
            <text class="tc-arrow">›</text>
          </view>
          <text class="tc-title">{{ t.title }}</text>
          <view class="tc-tags">
            <text class="tc-tag" v-for="(f, i) in t.fields" :key="i">{{ f }}</text>
          </view>
          <text class="tc-intro ellipsis-2">{{ t.intro }}</text>
        </view>
      </view>
    </view>

    <view class="ac-foot">— 为学日益 · 为道日损 —</view>
  </view>
</template>

<script setup>
import { ACADEMY_TEACHERS } from '../../config/phase2.js'
const teachers = ACADEMY_TEACHERS

function goTeacher(t) {
  uni.navigateTo({ url: `/pages-sub/academy/teacher?id=${t.id}` })
}
</script>

<style lang="scss" scoped>
.academy-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.ac-header { position: relative; overflow: hidden; padding: 48rpx 32rpx 40rpx; background: #fbe9ec; border-bottom: 2rpx solid rgba(140,90,43,0.2); }
.ac-deco { position: absolute; right: 30rpx; top: 2rpx; font-size: 190rpx; line-height: 1; color: rgba(196,30,58,0.08); font-family: serif; }
.ac-headtxt { position: relative; display: flex; flex-direction: column; }
.ac-title { font-size: 40rpx; font-weight: 500; color: #7a1220; }
.ac-sub { font-size: 24rpx; color: #9c7a68; margin-top: 10rpx; }
.demo-tip { margin: 20rpx 24rpx 0; padding: 16rpx 20rpx; background: #fbf3e2; border: 1rpx solid #e8d9b8; border-radius: 12rpx; font-size: 22rpx; color: #8c6b1f; text-align: center; }
.ac-list { padding: 8rpx 24rpx; }
.teacher-card {
  display: flex; padding: 28rpx; margin-top: 20rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
}
.tc-avatar {
  width: 108rpx; height: 108rpx; flex-shrink: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #7a1220 0%, #a31930 100%);
  color: #fff; font-size: 48rpx; font-family: serif; margin-right: 24rpx;
}
.tc-main { flex: 1; min-width: 0; }
.tc-name-row { display: flex; justify-content: space-between; align-items: center; }
.tc-name { font-size: 32rpx; font-weight: 500; color: #4a3b2a; }
.tc-arrow { font-size: 36rpx; color: #c9b8a4; }
.tc-title { font-size: 24rpx; color: #c41e3a; margin-top: 6rpx; }
.tc-tags { display: flex; flex-wrap: wrap; margin-top: 14rpx; }
.tc-tag { font-size: 20rpx; color: #8c6b1f; background: #fbf3e2; border: 1rpx solid #e8d9b8; border-radius: 999rpx; padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0; }
.tc-intro { font-size: 22rpx; color: #8a7d6c; line-height: 1.6; margin-top: 10rpx; }
.ac-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }
</style>
