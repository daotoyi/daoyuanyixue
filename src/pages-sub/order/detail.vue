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
import { getOrder, payOrder, confirmOrder, cancelOrder, wxpayPrepay, wxRequestPayment, orderPayBalance } from '../../api/api'
import { useUserStore } from '../../store/index'

const order = ref(null)
const orderNo = ref(null)

const statusTip = computed(() => ({
  待付款: '订单尚未支付，请尽快完成付款',
  待发货: '商家正在精心备货，请耐心等待',
  待收货: '商品已发出，请留意物流信息',
  已完成: '交易已完成，感谢您的信任',
  已退款: '退款已原路退回',
})[order.value?.status] || '')

// 支付方式名: 小程序=微信支付; H5/APP=模拟支付 (预约订单 H5 用积分余额真实支付)
const payName = computed(() => {
  const m = {
    wechat: '微信支付',
    alipay: '支付宝',
    balance: '余额支付',
  }
  // #ifndef MP-WEIXIN
  m.wechat = '模拟支付'
  if (order.value && order.value.order_type === 'appointment') return '积分余额支付'
  // #endif
  return m[order.value?.pay_method] || '模拟支付'
})

onLoad(async (options) => {
  orderNo.value = options.order_no
  await load()
})

async function load() {
  order.value = await getOrder(orderNo.value)
}

async function doPay() {
  // 微信小程序: 真实微信支付; 其他端: 演示支付
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
  // 预约订单 (盘道): H5 无微信支付能力, 用积分余额真实扣款, 不走模拟支付
  if (order.value && order.value.order_type === 'appointment') {
    try {
      const userStore = useUserStore()
      await orderPayBalance({ order_no: orderNo.value, uid: userStore.userInfo.uid })
      uni.showToast({ title: '预约支付成功', icon: 'success' })
    } catch (e) {
      uni.showToast({ title: (e && e.message) || '支付失败', icon: 'none' })
    }
    await load()
    return
  }
  await payOrder(orderNo.value)
  uni.showToast({ title: '支付成功', icon: 'success' })
  await load()
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
