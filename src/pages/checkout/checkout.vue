<template>
  <view class="checkout-page">
    <!-- 收货地址 -->
    <view class="card addr-card" @tap="chooseAddress">
      <view class="addr-content" v-if="address">
        <view class="addr-top">
          <text class="addr-name">{{ address.name }}</text>
          <text class="addr-phone">{{ address.phone }}</text>
          <text class="addr-default" v-if="address.is_default">默认</text>
        </view>
        <text class="addr-detail">{{ address.detail }}</text>
      </view>
      <view class="addr-empty" v-else>
        <text>＋ 请选择收货地址</text>
      </view>
      <text class="addr-arrow">›</text>
    </view>

    <!-- 商品清单 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">商品清单</text>
        <text class="card-count">{{ items.length }} 件</text>
      </view>
      <view class="co-item" v-for="i in items" :key="i.id">
        <image class="co-img" :src="i.image" mode="aspectFill"></image>
        <view class="co-info">
          <text class="co-name ellipsis-2">{{ i.name }}</text>
          <view class="co-row">
            <text class="co-price">¥{{ i.price }}</text>
            <text class="co-qty">×{{ i.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠与支付 -->
    <view class="card">
      <view class="co-row-line" @tap="toggleCoupon">
        <text class="line-label">优惠券</text>
        <text class="line-value" :class="{ on: selectedCoupon }">
          {{ selectedCoupon ? '-¥' + couponDiscount : '暂无可用' }}
        </text>
        <text class="line-arrow">›</text>
      </view>

      <view class="co-row-line" @tap="toggleBalance">
        <text class="line-label">余额抵扣</text>
        <view class="balance-right">
          <text class="line-value">{{ balanceUsed ? '已使用' : '可用 ¥' + balance }}</text>
          <switch :checked="balanceUsed" color="#8c5a2b" style="transform: scale(0.8)" @change="toggleBalance" />
        </view>
      </view>

      <view class="co-row-line">
        <text class="line-label">配送方式</text>
        <text class="line-value">快递包邮</text>
      </view>
    </view>

    <!-- 支付方式 -->
    <view class="card">
      <view class="card-head"><text class="card-title">支付方式</text></view>
      <view class="pay-item" v-for="p in payMethods" :key="p.key" @tap="payMethod = p.key">
        <text class="pay-icon">{{ p.icon }}</text>
        <text class="pay-name">{{ p.name }}</text>
        <view class="pay-check" :class="{ on: payMethod === p.key }">
          <text v-if="payMethod === p.key">✓</text>
        </view>
      </view>
    </view>

    <!-- 底部提交 -->
    <view class="submit-bar">
      <view class="submit-total">
        <text class="st-label">合计</text>
        <text class="st-price">¥{{ finalPrice }}</text>
        <text class="st-origin" v-if="discount">(已省 ¥{{ discount }})</text>
      </view>
      <u-button type="error" :text="'提交订单 · 模拟支付'" shape="circle" :loading="submitting" @click="submitOrder"></u-button>
    </view>

    <!-- 优惠券选择弹窗 -->
    <u-popup :show="showCoupon" mode="bottom" @close="showCoupon = false">
      <view class="coupon-sheet">
        <view class="sheet-head"><text class="sheet-title">选择优惠券</text></view>
        <view class="coupon-item" v-for="c in coupons" :key="c.id" @tap="applyCoupon(c)">
          <view class="coupon-left">
            <text class="coupon-name">{{ c.name }}</text>
            <text class="coupon-desc">{{ c.discount }} · 有效期至 {{ c.expire_at }}</text>
          </view>
          <view class="coupon-check" :class="{ on: selectedCoupon && selectedCoupon.id === c.id }">
            <text v-if="selectedCoupon && selectedCoupon.id === c.id">✓</text>
          </view>
        </view>
        <u-button type="primary" text="不使用优惠券" shape="circle" size="small" plain @click="applyCoupon(null)"></u-button>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCart, getSelectedItems, clearSelected } from '../../utils/cart'
import { getCoupons, createOrder, payOrder } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()

const items = ref([])
const address = ref(null)
const coupons = ref([])
const selectedCoupon = ref(null)
const balanceUsed = ref(false)
const payMethod = ref('wechat')
const showCoupon = ref(false)
const submitting = ref(false)

const balance = computed(() => userStore.userInfo.balance || '0.00')

const payMethods = [
  { key: 'wechat', name: '微信支付', icon: '💚' },
  { key: 'alipay', name: '支付宝', icon: '🔵' },
  { key: 'balance', name: '余额支付', icon: '💰' },
]

const subTotal = computed(() =>
  items.value.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0)
)

const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  const m = (selectedCoupon.value.discount || '').match(/\d+/)
  return m ? Number(m[0]) : 0
})

const discount = computed(() => couponDiscount.value + (balanceUsed.value ? Math.min(parseFloat(balance.value), subTotal.value - couponDiscount.value) : 0))

const finalPrice = computed(() =>
  Math.max(0, subTotal.value - discount.value).toFixed(2)
)

onMounted(() => {
  const { items: list } = getSelectedItems()
  items.value = list
  loadCoupons()
})

async function loadCoupons() {
  try {
    coupons.value = await getCoupons()
  } catch (e) {
    /* 忽略 */
  }
}

function chooseAddress() {
  uni.showToast({ title: '演示环境：使用默认地址', icon: 'none' })
  address.value = {
    name: '昊辰',
    phone: '13800138001',
    detail: '北京市朝阳区 · 真和盛文化工作室',
    is_default: true,
  }
}

function toggleCoupon() {
  showCoupon.value = true
}

function applyCoupon(c) {
  selectedCoupon.value = c
  showCoupon.value = false
}

function toggleBalance() {
  balanceUsed.value = !balanceUsed.value
}

async function submitOrder() {
  if (!items.value.length) return
  if (!address.value) {
    uni.showToast({ title: '请先选择收货地址', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const order = await createOrder({
      items: items.value.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
      total_price: finalPrice.value,
      pay_method: payMethod.value,
      address: address.value,
    })
    // 模拟支付成功
    await payOrder(order.order_no)
    clearSelected()
    uni.showToast({ title: '支付成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/order/detail?order_no=${order.order_no}` })
    }, 800)
  } catch (e) {
    uni.showToast({ title: '下单失败：' + (e.message || ''), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.checkout-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 20rpx 24rpx 160rpx;
}

.card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
}
.card-count {
  font-size: 22rpx;
  color: #857563;
}

/* 地址 */
.addr-card {
  display: flex;
  align-items: center;
}
.addr-content {
  flex: 1;
}
.addr-top {
  display: flex;
  align-items: center;
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
.addr-default {
  margin-left: 16rpx;
  font-size: 20rpx;
  color: #8c5a2b;
  border: 1rpx solid #c4a484;
  border-radius: 6rpx;
  padding: 0 10rpx;
}
.addr-detail {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #857563;
}
.addr-empty {
  flex: 1;
  font-size: 28rpx;
  color: #857563;
}
.addr-arrow {
  font-size: 36rpx;
  color: #d8ccb8;
}

/* 商品清单 */
.co-item {
  display: flex;
  padding: 12rpx 0;
}
.co-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f8f3ea;
}
.co-info {
  flex: 1;
  margin-left: 20rpx;
}
.co-name {
  font-size: 26rpx;
  color: #42372c;
  line-height: 1.4;
}
.co-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}
.co-price {
  font-size: 28rpx;
  font-weight: 500;
  color: #b04a45;
}
.co-qty {
  font-size: 24rpx;
  color: #857563;
}

/* 行 */
.co-row-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f8f3ea;
}
.co-row-line:last-child {
  border-bottom: none;
}
.line-label {
  font-size: 26rpx;
  color: #42372c;
}
.line-value {
  font-size: 26rpx;
  color: #857563;
}
.line-value.on {
  color: #b04a45;
}
.line-arrow {
  font-size: 32rpx;
  color: #d8ccb8;
  margin-left: 10rpx;
}
.balance-right {
  display: flex;
  align-items: center;
}

/* 支付方式 */
.pay-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}
.pay-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}
.pay-name {
  flex: 1;
  font-size: 26rpx;
  color: #42372c;
}
.pay-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d8ccb8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fefbf6;
}
.pay-check.on {
  background: #8c5a2b;
  border-color: #8c5a2b;
}

/* 提交栏 */
.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fefbf6;
  border-top: 1rpx solid #efe7d8;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 10;
}
.submit-total {
  display: flex;
  align-items: baseline;
}
.st-label {
  font-size: 24rpx;
  color: #857563;
}
.st-price {
  font-size: 40rpx;
  font-weight: 500;
  color: #b04a45;
  margin-left: 8rpx;
}
.st-origin {
  font-size: 20rpx;
  color: #6e7f5a;
  margin-left: 10rpx;
}

/* 优惠券弹窗 */
.coupon-sheet {
  padding: 30rpx;
  padding-bottom: 60rpx;
}
.sheet-head {
  text-align: center;
  margin-bottom: 30rpx;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
}
.coupon-item {
  display: flex;
  align-items: center;
  background: #fefbf6;
  border: 1rpx solid #e6dcca;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.coupon-left {
  flex: 1;
}
.coupon-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #8c5a2b;
}
.coupon-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #857563;
}
.coupon-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d8ccb8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fefbf6;
}
.coupon-check.on {
  background: #8c5a2b;
  border-color: #8c5a2b;
}
</style>
