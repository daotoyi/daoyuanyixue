<template>
  <view class="od-page" v-if="order">
    <!-- 状态横幅 -->
    <view class="status-banner" :class="'sb-' + order.status">
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
    <view class="action-bar" v-if="order.status !== '已完成' && order.status !== '已退款'">
      <view v-if="order.status === '待付款'" class="btn-fill btn-pay" @tap="doPay">
        <text>立即支付</text>
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
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrder, payOrder, confirmOrder } from '../../api/api'

const order = ref(null)
const orderNo = ref(null)

const statusTip = computed(() => ({
  待付款: '订单尚未支付，请尽快完成付款',
  待发货: '商家正在精心备货，请耐心等待',
  待收货: '商品已发出，请留意物流信息',
  已完成: '交易已完成，感谢您的信任',
  已退款: '退款已原路退回',
})[order.value?.status] || '')

const payName = computed(() => ({
  wechat: '微信支付',
  alipay: '支付宝',
  balance: '余额支付',
})[order.value?.pay_method] || '模拟支付')

onLoad(async (options) => {
  orderNo.value = options.order_no
  await load()
})

async function load() {
  order.value = await getOrder(orderNo.value)
}

async function doPay() {
  await payOrder(orderNo.value)
  uni.showToast({ title: '支付成功', icon: 'success' })
  await load()
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
  background: var(--dy-page);
  padding-bottom: 140rpx;
}

.status-banner {
  padding: 50rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.sb-待付款 { background: linear-gradient(135deg, #6b1f1f, #b04a45); }
.sb-待发货 { background: linear-gradient(135deg, #6e4a26, #8c5a2b); }
.sb-待收货 { background: linear-gradient(135deg, #7a5610, #ba7517); }
.sb-已完成 { background: linear-gradient(135deg, #3d4a26, #6e7f5a); }
.sb-已退款 { background: linear-gradient(135deg, #5a5144, var(--dy-sub)); }
.sb-status {
  font-size: 44rpx;
  font-weight: 500;
  color: var(--dy-card);
}
.sb-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 252, 245, 0.75);
}

.card {
  background: var(--dy-card);
  border-radius: 16rpx;
  border: 1rpx solid var(--dy-line);
  padding: 24rpx;
  margin: 0 24rpx 20rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--dy-text);
  margin-bottom: 16rpx;
}

.addr-name {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--dy-text);
}
.addr-phone {
  font-size: 24rpx;
  color: var(--dy-sub);
  margin-left: 16rpx;
}
.addr-detail {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--dy-sub);
}

.oi {
  display: flex;
  padding: 10rpx 0;
}
.oi-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: var(--dy-page);
}
.oi-info {
  flex: 1;
  margin-left: 20rpx;
}
.oi-name {
  font-size: 26rpx;
  color: var(--dy-text);
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
  color: var(--dy-sub);
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
}
.rk {
  font-size: 26rpx;
  color: var(--dy-sub);
}
.rv {
  font-size: 26rpx;
  color: var(--dy-text);
}
.row.total .rk {
  color: var(--dy-text);
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
  background: var(--dy-card);
  border-top: 1rpx solid var(--dy-line);
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
  color: var(--dy-card);
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
</style>
