<template>
  <view class="order-page">
    <!-- 状态筛选 (紧凑彩色 + 右上角数量) -->
    <view class="filter-bar">
      <view class="filter-inner">
        <view
          v-for="s in statuses"
          :key="s"
          class="o-tab"
          :class="['ot-' + s, { active: activeStatus === s }]"
          @tap="switchStatus(s)"
        >
          <text class="ot-label">{{ s }}</text>
          <view class="ot-badge"><text>{{ counts[s] || 0 }}</text></view>
        </view>
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view scroll-y class="order-scroll">
      <view class="order-list" v-if="orders.length">
        <view class="order-card" v-for="o in orders" :key="o._id || o.order_no" @tap="goDetail(o.order_no)">
          <view class="order-head">
            <text class="order-no">订单号 {{ o.order_no }}</text>
            <text class="order-status" :class="'st-' + o.status">{{ o.status }}</text>
          </view>

          <view class="order-items">
            <view class="oi" v-for="(i, idx) in o.items" :key="idx">
              <image class="oi-img" :src="i.image" mode="aspectFill"></image>
              <view class="oi-info">
                <text class="oi-name ellipsis-2">{{ i.name }}</text>
                <text class="oi-price">¥{{ i.price }} ×{{ i.qty }}</text>
              </view>
            </view>
          </view>

          <view class="order-foot">
            <text class="of-time">{{ o.created_at }}</text>
            <view class="of-right">
              <text class="of-total">合计 ¥{{ o.total_price }}</text>
              <view v-if="o.status === '待付款'" class="btn-fill btn-pay" @tap.stop="doPay(o)">
                <text>去支付</text>
              </view>
              <view v-else-if="o.status === '待收货'" class="btn-fill btn-confirm" @tap.stop="doConfirm(o)">
                <text>确认收货</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <u-empty text="暂无相关订单" mode="order"></u-empty>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrders, payOrder, confirmOrder } from '../../api/api'

const statuses = ['全部', '待付款', '待发货', '待收货', '已完成', '已退款']
const activeStatus = ref('全部')
const allOrders = ref([])

onLoad((options) => {
  if (options.status) activeStatus.value = options.status
})

onShow(async () => {
  await loadOrders()
})

// 一次拉全部订单, 统计各状态数量
async function loadOrders() {
  allOrders.value = await getOrders({ status: '全部' })
}

const counts = computed(() => {
  const c = { '全部': allOrders.value.length }
  statuses.forEach((s) => {
    if (s !== '全部') c[s] = allOrders.value.filter((o) => o.status === s).length
  })
  return c
})

const orders = computed(() => {
  if (activeStatus.value === '全部') return allOrders.value
  return allOrders.value.filter((o) => o.status === activeStatus.value)
})

async function switchStatus(s) {
  activeStatus.value = s
  await loadOrders()
}

function goDetail(orderNo) {
  uni.navigateTo({ url: `/pages/order/detail?order_no=${orderNo}` })
}

async function doPay(o) {
  await payOrder(o.order_no)
  uni.showToast({ title: '支付成功', icon: 'success' })
  await loadOrders()
}

async function doConfirm(o) {
  await confirmOrder(o.order_no)
  uni.showToast({ title: '已确认收货', icon: 'success' })
  await loadOrders()
}
</script>

<style lang="scss" scoped>
.order-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f3ea;
}

/* 状态筛选: 紧凑彩色按钮 + 右上角数量 */
.filter-bar {
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
}
.filter-inner {
  display: flex;
  padding: 16rpx 20rpx;
  gap: 12rpx;
}
.o-tab {
  position: relative;
  flex: 1;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid;
}
.ot-label {
  font-size: 20rpx;
  line-height: 1.3;
  text-align: center;
  max-width: 110rpx;
}
.ot-badge {
  position: absolute;
  right: -6rpx;
  top: -10rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #efe7d8;
}
.ot-badge text {
  font-size: 18rpx;
  color: #fefbf6;
  font-weight: 500;
}
/* 每个状态固定颜色 */
.ot-全部 { border-color: #857563; background: #faf3e9; }
.ot-全部 .ot-label { color: #857563; }
.ot-全部 .ot-badge { background: #857563; }
.ot-全部.active { background: #857563; }
.ot-全部.active .ot-label { color: #fefbf6; }

.ot-待付款 { border-color: #b04a45; background: #faf3e9; }
.ot-待付款 .ot-label { color: #b04a45; }
.ot-待付款 .ot-badge { background: #b04a45; }
.ot-待付款.active { background: #b04a45; }
.ot-待付款.active .ot-label { color: #fefbf6; }

.ot-待发货 { border-color: #8c5a2b; background: #faf3e9; }
.ot-待发货 .ot-label { color: #8c5a2b; }
.ot-待发货 .ot-badge { background: #8c5a2b; }
.ot-待发货.active { background: #8c5a2b; }
.ot-待发货.active .ot-label { color: #fefbf6; }

.ot-待收货 { border-color: #ba7517; background: #faf3e9; }
.ot-待收货 .ot-label { color: #ba7517; }
.ot-待收货 .ot-badge { background: #ba7517; }
.ot-待收货.active { background: #ba7517; }
.ot-待收货.active .ot-label { color: #fefbf6; }

.ot-已完成 { border-color: #6e7f5a; background: #faf3e9; }
.ot-已完成 .ot-label { color: #6e7f5a; }
.ot-已完成 .ot-badge { background: #6e7f5a; }
.ot-已完成.active { background: #6e7f5a; }
.ot-已完成.active .ot-label { color: #fefbf6; }

.ot-已退款 { border-color: #857563; background: #faf3e9; }
.ot-已退款 .ot-label { color: #857563; }
.ot-已退款 .ot-badge { background: #857563; }
.ot-已退款.active { background: #857563; }
.ot-已退款.active .ot-label { color: #fefbf6; }

.order-scroll {
  flex: 1;
}
.order-list {
  padding: 20rpx 24rpx;
}
.order-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.order-no {
  font-size: 22rpx;
  color: #b3a595;
}
.order-status {
  font-size: 24rpx;
  font-weight: 500;
}
.st-待付款 { color: #b04a45; }
.st-待发货 { color: #8c5a2b; }
.st-待收货 { color: #ba7517; }
.st-已完成 { color: #6e7f5a; }
.st-已退款 { color: #857563; }
/* 状态按钮: 实心彩色 */
.btn-fill {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 64rpx;
  padding: 0 34rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 24rpx;
  color: #fefbf6;
  letter-spacing: 1rpx;
}
.btn-pay {
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
.btn-confirm {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}

.order-items {
  padding: 12rpx 0;
}
.oi {
  display: flex;
  padding: 8rpx 0;
}
.oi-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 10rpx;
  background: #f8f3ea;
}
.oi-info {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.oi-name {
  font-size: 26rpx;
  color: #42372c;
  line-height: 1.4;
}
.oi-price {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #857563;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #efe7d8;
}
.of-time {
  font-size: 22rpx;
  color: #b3a595;
}
.of-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.of-total {
  font-size: 26rpx;
  color: #42372c;
}

.empty {
  padding-top: 120rpx;
}
</style>
