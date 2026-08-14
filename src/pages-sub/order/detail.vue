<template>
  <view class="od-page" v-if="order">
    <!-- 状态横幅 -->
    <view class="status-banner" :class="'sb-' + stCls(order.status)">
      <text class="sb-status">{{ order.status }}</text>
      <text class="sb-tip">{{ statusTip }}</text>
    </view>

    <!-- 收货信息 -->
    <view class="card addr">
      <text class="addr-name">{{ order.address.name }}</text>
      <text class="addr-phone">{{ order.address.phone }}</text>
      <text class="addr-detail">{{ order.address.detail }}</text>
    </view>

    <!-- 商品清单 -->
    <view class="card">
      <view class="card-title">商品清单</view>
      <view class="oi" v-for="(i, idx) in order.items" :key="idx">
        <image class="oi-img" :src="i.image" mode="aspectFill"></image>
        <view class="oi-info">
          <text class="oi-name ellipsis-2">{{ i.name }}</text>
          <view class="oi-row">
            <text class="oi-price">¥{{ i.price }}</text>
            <text class="oi-qty">×{{ i.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 金额明细 -->
    <view class="card">
      <view class="row"><text class="rk">商品总额</text><text class="rv">¥{{ order.total_price }}</text></view>
      <view class="row"><text class="rk">运费</text><text class="rv">包邮</text></view>
      <view class="row total"><text class="rk">实付款</text><text class="rv red">¥{{ order.total_price }}</text></view>
    </view>

    <!-- 订单信息 -->
    <view class="card">
      <view class="row"><text class="rk">订单编号</text><text class="rv">{{ order.order_no }}</text></view>
      <view class="row"><text class="rk">支付方式</text><text class="rv">{{ payName }}</text></view>
      <view class="row"><text class="rk">下单时间</text><text class="rv">{{ order.created_at }}</text></view>
    </view>

    <!-- 支付方式选择 (待付款订单; 微信/积分/支付宝三选一, 支付宝默认隐藏且受后台开关控制) -->
    <view class="pay-methods" v-if="order.status === '待付款'">
      <view class="pm-title">选择支付方式</view>
      <view class="pm-item" :class="{ on: selectedPay === 'wechat' }" @tap="selectedPay = 'wechat'">
        <view class="pm-icon pm-wx"><text>微</text></view>
        <text class="pm-name">微信支付</text>
        <text class="pm-check" :class="{ on: selectedPay === 'wechat' }">{{ selectedPay === 'wechat' ? '✓' : '' }}</text>
      </view>
      <view class="pm-item" :class="{ on: selectedPay === 'balance' }" @tap="selectedPay = 'balance'">
        <view class="pm-icon pm-balance"><text>积</text></view>
        <text class="pm-name">积分支付</text>
        <text class="pm-check" :class="{ on: selectedPay === 'balance' }">{{ selectedPay === 'balance' ? '✓' : '' }}</text>
      </view>
      <!-- 支付宝: 默认隐藏, 后台开启"显示支付宝"后可用 -->
      <view class="pm-more" v-if="alipayEnabled && !showAlipay" @tap="showAlipay = true"><text>更多支付方式 ▾</text></view>
      <view class="pm-item" :class="{ on: selectedPay === 'alipay' }" v-if="alipayEnabled && showAlipay" @tap="selectedPay = 'alipay'">
        <view class="pm-icon pm-alipay"><text>支</text></view>
        <text class="pm-name">支付宝</text>
        <text class="pm-check" :class="{ on: selectedPay === 'alipay' }">{{ selectedPay === 'alipay' ? '✓' : '' }}</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="action-bar" v-if="order.status !== '已完成' && order.status !== '已退款' && order.status !== '已取消'">
      <view v-if="order.status === '待付款'" class="btn-fill btn-pay" @tap="doPay">
        <text>立即支付</text>
      </view>
      <view v-if="order.status === '待付款'" class="btn-fill btn-cancel" @tap="doCancel">
        <text>取消订单</text>
      </view>
      <view v-else-if="order.status === '待收货'" class="btn-fill btn-confirm" @tap="doConfirm">
        <text>确认收货</text>
      </view>
      <view v-else class="btn-fill btn-shop" @tap="goShop">
        <text>去逛逛</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const ST_CLS = {'待付款':'unpaid','待发货':'unshipped','待收货':'unreceived','已完成':'done','已取消':'cancelled','已退款':'refunded','全部':'all'}
const stCls = (v) => ST_CLS[v] || v

import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrder, confirmOrder, cancelOrder, wxpayPrepay, wxRequestPayment, orderPayBalance, alipayPrepay, getPayConfig } from '../../api/api'
import { useUserStore } from '../../store/index'

const order = ref(null)
const orderNo = ref(null)

/* 支付方式选择: 微信/积分/支付宝 三选一; 默认小程序=微信, H5/其他=积分; 支付宝默认隐藏(后台开关) */
const selectedPay = ref('balance')
// #ifdef MP-WEIXIN
selectedPay.value = 'wechat'
// #endif
const showAlipay = ref(false)
const alipayEnabled = ref(false)

onLoad(async (options) => {
  orderNo.value = options.order_no
  await Promise.all([load(), loadPayConfig()])
})

/* 读取后台支付配置 (显示支付宝开关) */
async function loadPayConfig() {
  try {
    const cfg = await getPayConfig()
    alipayEnabled.value = !!(cfg && cfg.show_alipay === true)
  } catch (e) {
    alipayEnabled.value = false
  }
}

const statusTip = computed(() => ({
  待付款: '订单尚未支付，请尽快完成付款',
  待发货: '商家正在精心备货，请耐心等待',
  待收货: '商品已发出，请留意物流信息',
  已完成: '交易已完成，感谢您的信任',
  已退款: '退款已原路退回',
})[order.value?.status] || '')

// 支付方式名: 微信支付 / 积分支付 / 支付宝
const payName = computed(() => {
  const m = {
    wechat: '微信支付',
    alipay: '支付宝',
    balance: '积分支付',
    余额: '积分支付',
  }
  return m[order.value?.pay_method] || '微信支付'
})

async function load() {
  order.value = await getOrder(orderNo.value)
}

async function doPay() {
  // 支付宝支付 (预约订单可选): 调后端生成支付宝订单, 未配置商户时明确提示
  if (selectedPay.value === 'alipay') {
    try {
      const res = await alipayPrepay({ order_no: orderNo.value })
      if (res && res.alipay) {
        if (res.alipay.pay_url) {
          // #ifdef H5
          window.location.href = res.alipay.pay_url
          // #endif
          // #ifndef H5
          uni.showModal({
            title: '支付宝支付',
            content: '请在浏览器中打开支付宝完成支付',
            showCancel: false,
          })
          // #endif
        } else {
          uni.showModal({ title: '支付宝支付', content: '支付宝支付参数已生成，商户接入后即可使用；当前请选择微信支付', showCancel: false })
        }
      } else {
        uni.showToast({ title: (res && res.msg) || '支付宝支付未配置', icon: 'none' })
      }
    } catch (e) {
      uni.showToast({ title: (e && e.message) || '支付宝支付失败', icon: 'none' })
    }
    return
  }

  // 积分支付 (积分真实扣款, 支持所有订单类型)
  if (selectedPay.value === 'balance') {
    try {
      const userStore = useUserStore()
      await orderPayBalance({ order_no: orderNo.value, uid: userStore.userInfo.uid })
      uni.showToast({ title: '支付成功', icon: 'success' })
    } catch (e) {
      uni.showToast({ title: (e && e.message) || '支付失败', icon: 'none' })
    }
    await load()
    return
  }

  // 微信支付
  // #ifdef MP-WEIXIN
  try {
    const prepay = await wxpayPrepay(orderNo.value)
    if (prepay && prepay.payment) {
      await wxRequestPayment(prepay.payment)
      uni.showToast({ title: '支付成功', icon: 'success' })
    } else {
      uni.showToast({ title: (prepay && prepay.msg) || '支付未配置', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '支付失败：' + (e.message || ''), icon: 'none' })
  }
  await load()
  return
  // #endif
  // #ifndef MP-WEIXIN
  // H5/App 无 JSAPI 微信支付能力: 明确引导, 不再静默走其他支付
  uni.showModal({
    title: '微信支付',
    content: '微信支付请在微信小程序中完成；当前端请选择「积分支付」或「支付宝」。',
    showCancel: false,
  })
  return
  // #endif
}

async function doCancel() {
  uni.showModal({
    title: '取消订单',
    content: '确定取消该订单吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await cancelOrder({ order_no: orderNo.value })
        uni.showToast({ title: '订单已取消', icon: 'success' })
        order.value.status = '已取消'
      } catch (e) {
        uni.showToast({ title: e.message || '取消失败', icon: 'none' })
      }
    },
  })
}
async function doConfirm() {
  await confirmOrder(orderNo.value)
  uni.showToast({ title: '已确认收货', icon: 'success' })
  await load()
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}
</script>

<style lang="scss" scoped>
.od-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding-bottom: 140rpx;
}

.status-banner {
  padding: 50rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.sb-unpaid { background: linear-gradient(135deg, #6b1f1f, #b04a45); }
.sb-unshipped { background: linear-gradient(135deg, #6e4a26, #8c5a2b); }
.sb-unreceived { background: linear-gradient(135deg, #7a5610, #ba7517); }
.sb-done { background: linear-gradient(135deg, #3d4a26, #6e7f5a); }
.sb-refunded { background: linear-gradient(135deg, #5a5144, #857563); }
.sb-status {
  font-size: 44rpx;
  font-weight: 500;
  color: #fefbf6;
}
.sb-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 252, 245, 0.75);
}

.card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin: 0 24rpx 20rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
  margin-bottom: 16rpx;
}

.addr-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
}
.addr-phone {
  font-size: 24rpx;
  color: #857563;
  margin-left: 16rpx;
}
.addr-detail {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #857563;
}

.oi {
  display: flex;
  padding: 10rpx 0;
}
.oi-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f8f3ea;
}
.oi-info {
  flex: 1;
  margin-left: 20rpx;
}
.oi-name {
  font-size: 26rpx;
  color: #42372c;
  line-height: 1.4;
}
.oi-row {
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
}
.oi-price {
  font-size: 28rpx;
  color: #b04a45;
  font-weight: 500;
}
.oi-qty {
  font-size: 24rpx;
  color: #857563;
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
}
.rk {
  font-size: 26rpx;
  color: #857563;
}
.rv {
  font-size: 26rpx;
  color: #42372c;
}
.row.total .rk {
  color: #42372c;
  font-weight: 500;
}
.rv.red {
  color: #b04a45;
  font-weight: 500;
  font-size: 30rpx;
}

/* 支付方式选择 (预约订单): 微信默认/支付宝默认隐藏 */
.pay-methods {
  margin: 20rpx 24rpx;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 20rpx 24rpx;
}
.pm-title {
  font-size: 24rpx;
  color: #8c5a2b;
  font-weight: 500;
  margin-bottom: 14rpx;
}
.pm-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
}
.pm-item.on {
  background: #f5ecdb;
}
.pm-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.pm-icon text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}
/* 微信: 绿色 */
.pm-wx {
  background: linear-gradient(135deg, #07c160, #06ad56);
}
/* 支付宝: 品牌蓝 + "支"字 */
.pm-alipay {
  background: linear-gradient(135deg, #1677ff, #0a5fd6);
}
/* 积分支付: 金色 + "积"字 */
.pm-balance {
  background: linear-gradient(135deg, #d4a24c, #b8860b);
}
.pm-name {
  flex: 1;
  font-size: 28rpx;
  color: #42372c;
}
.pm-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d9c39a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fefbf6;
}
.pm-check.on {
  background: #8c5a2b;
  border-color: #8c5a2b;
}
.pm-more {
  padding: 12rpx 0 4rpx;
  font-size: 22rpx;
  color: #b3a595;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fefbf6;
  border-top: 1rpx solid #efe7d8;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  z-index: 10;
}
/* 状态按钮: 实心填充 */
.btn-fill {
  flex-shrink: 0;
  height: 84rpx;
  padding: 0 56rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 28rpx;
  color: #fefbf6;
  letter-spacing: 2rpx;
}
.btn-pay {
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
.btn-confirm {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}
.btn-shop {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}
.btn-cancel {
  background: linear-gradient(135deg, #9a9a9a, #777);
  margin-left: 16rpx;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .od-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .od-page {
    max-width: 1320px;
  }
}

</style>
