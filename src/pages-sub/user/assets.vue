<template>
  <view class="assets-page">
    <!-- 元宝 -->
    <view class="balance-card" v-if="type === 'balance'">
      <text class="bc-corner">1 元 = 10 元宝</text>
      <text class="bc-label">我的元宝</text>
      <text class="bc-num">{{ userInfo.balance || '0' }} <text class="bc-unit">元宝</text></text>
      <text class="bc-tip">充值 1 元获得 10 元宝，元宝可在结算时抵扣</text>
      <view class="bc-actions">
        <view class="btn-p sm" @click="goRecharge">充值元宝</view>
        <view class="btn-p plain sm" @click="goShop">去购物</view>
      </view>
    </view>

    <!-- 元宝充值记录 -->
    <view class="rc-records" v-if="type === 'balance'">
      <view class="rr-head">
        <text class="rr-title">充值记录</text>
        <text class="rr-total" v-if="rechargeList.length">共 {{ rechargeList.length }} 笔</text>
      </view>
      <view class="rr-list" v-if="rechargeList.length">
        <view class="rr-row" v-for="o in rechargeList" :key="o._id || o.order_no">
          <view class="rr-left">
            <text class="rr-no">订单号：{{ o.order_no }}</text>
            <text class="rr-time">时间：{{ fmtUtcTime(o.created_at) }}</text>
          </view>
          <view class="rr-right">
            <text class="rr-amt">+{{ (Number(o.total_price) || 0).toFixed(2) }} 元<text class="rr-points">（{{ (Number(o.total_price) || 0) * 10 }} 元宝）</text></text>
            <text class="rr-status" :class="{ paid: o.status === '已支付' || o.status === '已完成' }">{{ o.status }}</text>
          </view>
        </view>
      </view>
      <view class="rr-empty" v-else>暂无充值记录</view>
    </view>

    <!-- 优惠券 -->
    <view class="coupon-list" v-else-if="type === 'coupon'">
      <view class="coupon-card" v-for="c in list" :key="c.id">
        <view class="coupon-left">
          <text class="coupon-val">{{ c.type === 'percent' ? (c.value / 10) + '折' : c.discount }}</text>
          <text class="coupon-name">{{ c.name }}</text>
        </view>
        <view class="coupon-right">
          <text class="coupon-status" :class="{ used: c.used }">{{ c.used ? '已使用' : '可用' }}</text>
          <text class="coupon-expire">有效期至 {{ c.expire_at }}</text>
        </view>
      </view>
      <view class="empty" v-if="!list.length">
        <view class="empty-tip">暂无优惠券，邀请好友可得 8 折券</view>
      </view>
    </view>

    <!-- 收藏 / 足迹 -->
    <view class="fav-list" v-else>
      <view class="fav-card" v-for="p in list" :key="p.product_id" @tap="goProduct(p.product_id)">
        <image class="fav-img" :src="p.image" mode="aspectFill"></image>
        <view class="fav-info">
          <text class="fav-name ellipsis-2">{{ p.name }}</text>
          <text class="fav-price">¥{{ p.price }}</text>
        </view>
      </view>
      <view class="empty" v-if="!list.length">
        <view class="empty-tip">{{ type === 'favorite' ? '暂无收藏商品' : '暂无浏览足迹' }}</view>
      </view>
    </view>

    <!-- 充值元宝弹窗: 固定档位 + 自定义金额 -->
    <view class="rc-mask" v-if="showRecharge" @tap="showRecharge = false">
      <view class="rc-pop" @tap.stop>
        <view class="rc-title">充值元宝</view>
        <view class="rc-sub">1 元 = 10 元宝</view>
        <view class="rc-grid">
          <view
            class="rc-item"
            v-for="a in [10, 50, 100, 200, 500]"
            :key="a"
            :class="{ on: selAmt === a }"
            @tap="selAmt = a; customAmt = ''"
          >
            <text class="rc-num">¥{{ a }}</text>
            <text class="rc-points">充 {{ a * 10 }} 元宝</text>
          </view>
          <view class="rc-item rc-custom" :class="{ on: selAmt === 0 && customAmt }" @tap="selAmt = 0">
            <input
              class="rc-input"
              type="digit"
              placeholder="自定义金额"
              placeholder-class="rc-ph"
              :value="customAmt"
              @focus="selAmt = 0"
              @input="(e) => customAmt = e.detail.value"
            />
            <text class="rc-points" v-if="customAmt">充 {{ (Number(customAmt) || 0) * 10 }} 元宝</text>
          </view>
        </view>
        <view class="rc-actions">
          <view class="btn-p plain sm" @tap="showRecharge = false">取消</view>
          <view class="btn-p sm" @tap="confirmRecharge">确认充值</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMyCoupons, getMyFavorites, getMyFootprints, rechargeCreate, getOrders } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const type = ref('balance')
const list = ref([])
const rechargeList = ref([]) // 元宝充值记录

/* UTC 字符串 → 东八区显示 (服务器生成时间为 UTC, Date.UTC 构造避免浏览器本地时区干扰) */
function fmtUtcTime(s) {
  if (!s) return '-'
  const m = String(s).match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)(?::(\d+))?/)
  if (!m) return s
  const [, y, mo, d, h, mi, se] = m
  const t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se || 0)) + 8 * 3600 * 1000
  const dt = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getUTCFullYear()}/${dt.getUTCMonth() + 1}/${dt.getUTCDate()} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`
}

onLoad((options) => {
  type.value = options.type || 'balance'
  uni.setNavigationBarTitle({
    title: { balance: '我的元宝', coupon: '我的优惠券', favorite: '我的收藏', footprint: '我的足迹' }[type.value] || '我的',
  })
})
// 充值/支付后返回自动刷新记录
onShow(() => {
  load()
})

async function load() {
  const uid = userInfo.value.uid
  if (!uid) return
  try {
    if (type.value === 'balance') {
      // 充值记录: 充值订单 (order_type=recharge 或订单号 RC 前缀)
      const orders = await getOrders({ uid })
      rechargeList.value = (orders || []).filter((o) => o.order_type === 'recharge' || /^RC/i.test(String(o.order_no || '')))
    } else if (type.value === 'coupon') list.value = await getMyCoupons({ uid })
    else if (type.value === 'favorite') list.value = await getMyFavorites({ uid })
    else if (type.value === 'footprint') list.value = await getMyFootprints({ uid })
  } catch (e) {
    list.value = []
  }
}

function goProduct(id) {
  uni.navigateTo({ url: `/pages-sub/product/detail?id=${id}` })
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}

/* 充值元宝: 1元=10元宝, 弹窗选档位(10/50/100/200/500)或自定义金额 */
const showRecharge = ref(false)
const selAmt = ref(10)
const customAmt = ref('')

function goRecharge() {
  selAmt.value = 10
  customAmt.value = ''
  showRecharge.value = true
}

async function confirmRecharge() {
  let amt = selAmt.value
  if (!amt || amt <= 0) {
    const c = Number(customAmt.value)
    if (!c || c <= 0) {
      uni.showToast({ title: '请输入充值金额', icon: 'none' })
      return
    }
    amt = c
  }
  try {
    const r = await rechargeCreate({ uid: userStore.userInfo.uid, amount: amt })
    if (r && r.order_no) {
      showRecharge.value = false
      uni.showToast({ title: '充值订单已创建，请完成支付', icon: 'none' })
      setTimeout(() => uni.redirectTo({ url: '/pages-sub/order/detail?order_no=' + r.order_no }), 800)
    }
  } catch (e) {
    uni.showToast({ title: e.message || '创建失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.assets-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding: 24rpx;
}

/* 元宝 */
.balance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #9c1630, #c41e3a);
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  position: relative;
}
.bc-corner {
  position: absolute;
  top: 24rpx;
  right: 28rpx;
  font-size: 20rpx;
  color: rgba(254, 251, 246, 0.85);
  background: rgba(255, 255, 255, 0.15);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.bc-label {
  font-size: 24rpx;
  color: rgba(254, 251, 246, 0.7);
}
.bc-num {
  font-size: 72rpx;
  font-weight: 500;
  color: #55524c;
  margin: 16rpx 0;
}
.bc-unit {
  font-size: 30rpx;
  color: rgba(254, 251, 246, 0.8);
  margin-left: 8rpx;
}
.bc-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}
.bc-actions .btn-p {
  margin: 0;
}
.bc-tip {
  font-size: 22rpx;
  color: rgba(254, 251, 246, 0.6);
  margin-bottom: 30rpx;
}

/* 充值记录 */
.rc-records {
  margin-top: 24rpx;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
}
.rr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.rr-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2a2a2a;
}
.rr-total {
  font-size: 22rpx;
  color: #8a857c;
}
.rr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-top: 1rpx solid #f0e8da;
}
.rr-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.rr-no {
  font-size: 24rpx;
  color: #2a2a2a;
}
.rr-time {
  font-size: 20rpx;
  color: #8a857c;
}
.rr-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.rr-amt {
  font-size: 28rpx;
  font-weight: 600;
  color: #c41e3a;
}
.rr-points {
  font-size: 20rpx;
  color: #8a857c;
  font-weight: 400;
}
.rr-status {
  font-size: 20rpx;
  color: #9c1630;
}
.rr-status.paid {
  color: #6e7f5a;
}
.rr-empty {
  padding: 50rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #8a857c;
}

/* 优惠券 */
.coupon-card {
  display: flex;
  align-items: center;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 26rpx;
  margin-bottom: 20rpx;
}
.coupon-left {
  flex: 1;
}
.coupon-val {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #9c1630;
}
.coupon-name {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #2a2a2a;
}
.coupon-right {
  text-align: right;
}
.coupon-status {
  display: block;
  font-size: 26rpx;
  color: #6e7f5a;
  font-weight: 500;
}
.coupon-status.used {
  color: #8a857c;
}
.coupon-expire {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #8a857c;
}

/* 收藏/足迹 */
.fav-card {
  display: flex;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.fav-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f8f5f0;
  flex-shrink: 0;
}
.fav-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.fav-name {
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.4;
}
.fav-price {
  margin-top: auto;
  font-size: 30rpx;
  font-weight: 500;
  color: #9c1630;
}

.empty {
  padding-top: 80rpx;
}

/* 充值元宝弹窗 */
.rc-mask {
  position: fixed;
  inset: 0;
  background: rgba(38, 22, 8, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.rc-pop {
  width: 600rpx;
  background: #fffafa;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 32rpx;
}
.rc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2a2a2a;
  text-align: center;
}
.rc-sub {
  font-size: 22rpx;
  color: #8a857c;
  text-align: center;
  margin: 8rpx 0 28rpx;
}
.rc-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.rc-item {
  width: calc(33.33% - 11rpx);
  box-sizing: border-box;
  border: 2rpx solid #e6dcca;
  border-radius: 14rpx;
  background: #f8f5f0;
  padding: 20rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.rc-item.on {
  border-color: #c41e3a;
  background: #fdf6ec;
  box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.15);
}
.rc-num {
  font-size: 32rpx;
  font-weight: 600;
  color: #c41e3a;
}
.rc-points {
  font-size: 20rpx;
  color: #8a857c;
}
.rc-item.on .rc-points {
  color: #c41e3a;
}
.rc-custom {
  padding: 12rpx 0;
}
.rc-input {
  width: 100%;
  text-align: center;
  font-size: 30rpx;
  color: #2a2a2a;
  height: 56rpx;
}
.rc-ph {
  color: #8a857c;
  font-size: 26rpx;
}
.rc-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}
.rc-actions .btn-p {
  flex: 1;
  margin: 0;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .assets-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .assets-page {
    max-width: 1320px;
  }
}

</style>
