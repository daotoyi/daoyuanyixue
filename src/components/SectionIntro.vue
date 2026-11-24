<template>
  <view class="si-wrap">
    <!-- 真和盛品牌理念条 (四个板块统一口径) -->
    <view class="si-brand">
      <view class="si-brand-left">
        <text class="si-brand-dot" :style="{ background: theme.accent }"></text>
        <text class="si-brand-name">{{ BRAND.name }}</text>
        <text class="si-brand-motto">{{ BRAND.motto }}</text>
      </view>
      <text class="si-toggle" @tap="open = !open">{{ open ? '收起 ‹' : '展开介绍 ›' }}</text>
    </view>

    <view class="si-head">
      <text class="si-title" :style="{ color: theme.accent }">{{ intro.title }}</text>
      <text class="si-sub">{{ intro.subtitle }}</text>
    </view>
    <text class="si-lead">{{ intro.lead }}</text>

    <!-- 分节详述: 理念所本 / 这里如何践行 / 与修学相续 -->
    <view class="si-blocks" v-if="open">
      <view class="si-block" v-for="b in intro.blocks" :key="b.label">
        <view class="si-block-head">
          <text class="si-block-bar" :style="{ background: theme.accent }"></text>
          <text class="si-block-label">{{ b.label }}</text>
        </view>
        <text class="si-block-text">{{ b.text }}</text>
      </view>
    </view>

    <view class="si-quote" v-if="open && intro.quote">
      <text class="si-quote-mark" :style="{ color: theme.accent }">「</text>
      <view class="si-quote-body">
        <text class="si-quote-text">{{ intro.quote }}</text>
        <text class="si-quote-src">— {{ intro.quoteFrom }}</text>
      </view>
    </view>

    <view class="si-tags">
      <text
        v-for="t in intro.tags"
        :key="t"
        class="si-tag"
        :style="{ color: theme.tagColor, background: theme.tagBg, borderColor: theme.tagBorder }"
      >{{ t }}</text>
    </view>
    <text class="si-foot">{{ BRAND.mission }} · {{ BRAND.principle }}</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { BRAND } from '../config/sectionIntro.js'

defineProps({
  intro: { type: Object, required: true },
  theme: { type: Object, required: true },
})

/* 默认展开: 用户要求介绍更详细, 进来即可看到全文; 点右上「收起」可折叠 */
const open = ref(true)
</script>

<style lang="scss" scoped>
.si-wrap { display: flex; flex-direction: column; }
.si-brand {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 16rpx; margin-bottom: 22rpx;
  border-bottom: 1rpx solid var(--dy-line);
}
.si-brand-left { display: flex; align-items: center; flex-wrap: wrap; min-width: 0; }
.si-brand-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-right: 10rpx; flex-shrink: 0; }
.si-brand-name { font-size: 22rpx; font-weight: 500; color: #7a1220; margin-right: 12rpx; }
.si-brand-motto { font-size: 21rpx; color: #8c6b1f; letter-spacing: 1rpx; }
.si-toggle { font-size: 21rpx; color: #a89a88; margin-left: 12rpx; flex-shrink: 0; }
.si-head { display: flex; align-items: baseline; flex-wrap: wrap; }
.si-title { font-size: 30rpx; font-weight: 500; }
.si-sub { font-size: 21rpx; color: #a89a88; margin-left: 16rpx; }
.si-lead { display: block; margin-top: 16rpx; font-size: 24rpx; color: #5a4d3e; line-height: 1.85; }
.si-blocks { display: flex; flex-direction: column; margin-top: 22rpx; }
.si-block { margin-bottom: 20rpx; }
.si-block-head { display: flex; align-items: center; }
.si-block-bar { width: 6rpx; height: 24rpx; border-radius: 3rpx; margin-right: 12rpx; flex-shrink: 0; }
.si-block-label { font-size: 23rpx; font-weight: 500; color: #4a3b2a; }
.si-block-text {
  display: block; margin-top: 8rpx; padding-left: 18rpx;
  font-size: 23rpx; color: #8a7d6c; line-height: 1.8;
}
.si-quote {
  display: flex; margin: 6rpx 0 20rpx; padding: 16rpx 20rpx;
  background: #faf6ef; border-radius: 10rpx;
}
.si-quote-mark { font-size: 34rpx; line-height: 1; margin-right: 8rpx; flex-shrink: 0; }
.si-quote-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.si-quote-text { font-size: 23rpx; color: #6b5b47; line-height: 1.7; font-family: serif; }
.si-quote-src { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; align-self: flex-end; }
.si-tags { display: flex; flex-wrap: wrap; margin-top: 4rpx; }
.si-tag { font-size: 20rpx; border: 1rpx solid; border-radius: 999rpx; padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0; }
.si-foot { margin-top: 14rpx; font-size: 20rpx; color: #a89a88; letter-spacing: 1rpx; }

/* PC 端 rpx 随屏宽放大: 介绍文字统一用绝对 px 固定 */
@media screen and (min-width: 1025px) {
  .si-brand { padding-bottom: 10px; margin-bottom: 14px; }
  .si-brand-dot { width: 8px; height: 8px; margin-right: 6px; }
  .si-brand-name, .si-brand-motto, .si-toggle { font-size: 12px; }
  .si-title { font-size: 19px; }
  .si-sub, .si-tag, .si-foot { font-size: 12px; }
  .si-lead { font-size: 14px; margin-top: 10px; }
  .si-blocks { margin-top: 14px; }
  .si-block { margin-bottom: 12px; }
  .si-block-bar { width: 3px; height: 15px; margin-right: 8px; }
  .si-block-label, .si-block-text { font-size: 13px; }
  .si-block-text { padding-left: 11px; margin-top: 5px; }
  .si-quote { padding: 10px 12px; margin-bottom: 12px; }
  .si-quote-mark { font-size: 20px; }
  .si-quote-text { font-size: 13px; }
  .si-quote-src { font-size: 11px; }
  .si-tag { padding: 3px 10px; margin: 0 7px 5px 0; }
}
</style>
