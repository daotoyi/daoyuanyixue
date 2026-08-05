<template>
  <view class="doc-page">
    <view class="doc-block">
      <text class="doc-title">道元易学用户协议</text>
      <text class="doc-update">更新日期：2026年8月5日</text>
    </view>
    <view class="doc-block" v-for="(s, i) in sections" :key="i">
      <text class="doc-h">{{ s.h }}</text>
      <text class="doc-p">{{ s.p }}</text>
    </view>
  </view>
</template>

<script setup>
const sections = [
  { h: '一、服务说明', p: '道元易学（以下简称"本应用"）为您提供传统文化内容服务，包括但不限于商品浏览与购买、课程学习、社区互动、直播预约等功能。使用本应用即表示您同意本协议全部条款。' },
  { h: '二、账号管理', p: '您应妥善保管账号与密码，因账号保管不善造成的损失由您自行承担。您不得利用本应用从事任何违法违规活动，包括但不限于传播违法信息、侵害他人权益、扰乱网络秩序等。' },
  { h: '三、内容与课程', p: '本应用内课程、文章等内容仅供学习参考，不构成任何专业建议。涉及命理、风水等传统文化内容，请您理性看待，切勿沉迷。' },
  { h: '四、商品交易', p: '本应用内商品交易遵循《中华人民共和国电子商务法》等相关法律法规。商品退换货政策以平台规则及国家规定为准。' },
  { h: '五、服务变更与终止', p: '我们可能根据业务需要调整或中断部分服务，您理解并同意我们无需为此承担责任，但会尽可能提前通知。' },
  { h: '六、免责声明', p: '因不可抗力、网络故障、第三方服务异常等导致的服务中断，我们不承担相应责任。' },
  { h: '七、联系我们', p: '如对本协议有任何疑问，请通过应用内"意见反馈"功能与我们联系。' },
]
</script>

<style lang="scss" scoped>
.doc-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 30rpx;
}
.doc-block {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 26rpx;
  margin-bottom: 20rpx;
}
.doc-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #42372c;
  display: block;
}
.doc-update {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #b3a595;
}
.doc-h {
  font-size: 28rpx;
  font-weight: 500;
  color: #8c5a2b;
  display: block;
  margin-bottom: 12rpx;
}
.doc-p {
  font-size: 25rpx;
  color: #857563;
  line-height: 1.9;
}
</style>
