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
import { onLoad } from '@dcloudio/uni-app'
import { getMyCoupons, getMyFavorites, getMyFootprints, rechargeCreate } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const type = ref('balance')
const list = ref([])

onLoad((options) => {
  type.value = options.type || 'balance'
  uni.setNavigationBarTitle({
    title: { balance: '我的元宝', coupon: '我的优惠券', favorite: '我的收藏', footprint: '我的足迹' }[type.value] || '我的',
  })
  load()
})

async function load() {
  const uid = userInfo.value.uid
  if (!uid) return
  try {
    if (type.value === 'coupon') list.value = await getMyCoupons({ uid })
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
  background: #f8f3ea;
  padding: 24rpx;
}

/* 元宝 */
.balance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #4e3420, #8c5a2b);
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
  color: #857563;
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

/* 优惠券 */
.coupon-card {
  display: flex;
  align-items: center;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
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
  color: #b04a45;
}
.coupon-name {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #42372c;
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
  color: #b3a595;
}
.coupon-expire {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #b3a595;
}

/* 收藏/足迹 */
.fav-card {
  display: flex;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.fav-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f8f3ea;
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
  color: #42372c;
  line-height: 1.4;
}
.fav-price {
  margin-top: auto;
  font-size: 30rpx;
  font-weight: 500;
  color: #b04a45;
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
  background: #fefbf6;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 32rpx;
}
.rc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #42372c;
  text-align: center;
}
.rc-sub {
  font-size: 22rpx;
  color: #b3a595;
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
  background: #f8f3ea;
  padding: 20rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.rc-item.on {
  border-color: #8c5a2b;
  background: #fdf6ec;
  box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.15);
}
.rc-num {
  font-size: 32rpx;
  font-weight: 600;
  color: #8c5a2b;
}
.rc-points {
  font-size: 20rpx;
  color: #b3a595;
}
.rc-item.on .rc-points {
  color: #8c5a2b;
}
.rc-custom {
  padding: 12rpx 0;
}
.rc-input {
  width: 100%;
  text-align: center;
  font-size: 30rpx;
  color: #42372c;
  height: 56rpx;
}
.rc-ph {
  color: #b3a595;
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
