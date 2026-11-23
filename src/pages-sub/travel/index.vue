<template>
  <view class="tp-page">
    <!-- 顶部品牌头 -->
    <view class="tp-header">
      <view class="tp-deco">遊</view>
      <view class="tp-headtxt">
        <text class="tp-title">文旅</text>
        <text class="tp-sub">寻访道场胜境 · 于山水之间体证道法自然</text>
      </view>
    </view>

    <!-- 栏目说明 -->
    <view class="tp-card">
      <view class="sec-head">
        <text class="sec-title">文旅 · 路线与活动</text>
        <text class="sec-sub">商品上架后自动呈现</text>
      </view>
      <view class="tp-empty">
        <text class="tp-empty-icon">🏯</text>
        <text class="tp-empty-title">文旅项目筹备中</text>
        <text class="tp-empty-tip">后续将在商城上架文旅相关商品（路线 / 营期 / 参访）<br>上架后此处将自动生成卡片并可直达商品详情</text>
      </view>
    </view>

    <!-- 骨架占位卡片预览 -->
    <view class="tp-card">
      <view class="sec-head">
        <text class="sec-title">即将呈现</text>
        <text class="sec-sub">示例版式</text>
      </view>
      <view class="skeleton-card" v-for="i in 2" :key="i">
        <view class="sk-cover">🏞️</view>
        <view class="sk-main">
          <text class="sk-name">{{ i === 1 ? '名山道场参访 · 示例' : '节气养生游学 · 示例' }}</text>
          <text class="sk-desc">此处为骨架演示卡片，商品上架后由系统自动替换</text>
        </view>
      </view>
    </view>

    <view class="tp-foot">道元易学 · 文旅板块（骨架版）</view>
  </view>
</template>

<script setup>
/**
 * 文旅板块骨架页
 * 【设计约定】
 *  - 参考养生页视觉风格，先搭主体骨架，不涉及任何真实下单/支付
 *  - 商品上架后：按真实分类（TRAVEL_CATE_ID，待后台建分类后填入）从 products 集合拉取，
 *    按 cate_id 生成卡片并跳转商品详情，逻辑与 pages-sub/health/index.vue 一致
 *  - 当前用示例卡片占位并明确标注"示例"，避免误认为真实商品
 */
import { TRAVEL_CATE_ID } from '../../config/phase2.js'

// 预留分类 id（0 = 后台尚未建分类）；商品上架后填真实 id 并接入 getProducts 筛选
const cateId = TRAVEL_CATE_ID
</script>

<style lang="scss" scoped>
.tp-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.tp-header {
  position: relative; overflow: hidden;
  padding: 48rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #f3efe2 0%, #e8e0cd 100%);
  border-bottom: 2rpx solid rgba(140, 90, 43, 0.2);
}
.tp-deco {
  position: absolute; right: 30rpx; top: 6rpx;
  font-size: 180rpx; line-height: 1; color: rgba(124, 122, 58, 0.10); font-family: serif;
}
.tp-headtxt { position: relative; display: flex; flex-direction: column; }
.tp-title { font-size: 40rpx; font-weight: 500; color: #6e7f5a; }
.tp-sub { font-size: 24rpx; color: #8c8a6a; margin-top: 10rpx; }
.tp-card {
  margin: 24rpx; padding: 28rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
}
.sec-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 500; color: #4a3b2a; }
.sec-sub { font-size: 20rpx; color: #a89a88; }
.tp-empty { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0 20rpx; }
.tp-empty-icon { font-size: 72rpx; }
.tp-empty-title { font-size: 30rpx; font-weight: 500; color: #6e7f5a; margin-top: 16rpx; }
.tp-empty-tip { font-size: 22rpx; color: #a89a88; margin-top: 16rpx; text-align: center; line-height: 1.7; }
.skeleton-card {
  display: flex; align-items: center; padding: 18rpx 0;
  border-bottom: 1rpx solid var(--dy-line);
}
.skeleton-card:last-child { border-bottom: none; }
.sk-cover {
  width: 130rpx; height: 100rpx; flex-shrink: 0; border-radius: 12rpx;
  background: #f0e8dc; display: flex; align-items: center; justify-content: center; font-size: 48rpx;
}
.sk-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; }
.sk-name { font-size: 28rpx; color: #4a3b2a; font-weight: 500; }
.sk-desc { font-size: 20rpx; color: #b8a894; margin-top: 8rpx; }
.tp-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }
</style>
