<template>
  <view class="doc-page">
    <view class="doc-block">
      <text class="doc-title">道元易学隐私协议</text>
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
  { h: '一、信息收集', p: '为向您提供服务，我们会在您注册登录时收集手机号、昵称等基础信息；在您下单时收集收货地址信息；在您发布动态时收集您主动上传的图片与文字内容。' },
  { h: '二、信息使用', p: '您的个人信息仅用于：完成订单与物流配送、提供课程学习服务、处理您的咨询与反馈、改进产品体验。我们不会将您的个人信息出售或出租给任何第三方。' },
  { h: '三、信息存储', p: '您的数据存储于腾讯云 CloudBase 云服务（中国上海区域），采用行业标准安全措施保护。我们仅在提供服务所必需的期限内保留您的信息。' },
  { h: '四、权限说明', p: '为提供图片上传、拍照发布等功能，我们可能申请相机、相册等权限。您可随时在系统设置中关闭相关权限，关闭后不影响其他功能使用。' },
  { h: '五、未成年人保护', p: '本应用面向成年用户。若您为未成年人，请在监护人指导下使用，并取得监护人同意后提供个人信息。' },
  { h: '六、您的权利', p: '您有权查询、更正、删除您的个人信息，有权注销账号。您可通过应用内"意见反馈"联系我们行使上述权利。' },
  { h: '七、协议更新', p: '我们可能适时更新本隐私协议，更新后会通过应用内公告等方式通知您。持续使用本应用即视为您接受更新后的协议。' },
]
</script>

<style lang="scss" scoped>
.doc-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding: 30rpx;
}
.doc-block {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 26rpx;
  margin-bottom: 20rpx;
}
.doc-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #2a2a2a;
  display: block;
}
.doc-update {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8a857c;
}
.doc-h {
  font-size: 28rpx;
  font-weight: 500;
  color: #c41e3a;
  display: block;
  margin-bottom: 12rpx;
}
.doc-p {
  font-size: 25rpx;
  color: #55524c;
  line-height: 1.9;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .doc-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .doc-page {
    max-width: 1320px;
  }
}

</style>
