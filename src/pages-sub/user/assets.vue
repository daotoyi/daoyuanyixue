<template>
  <view class="assets-page">
    <!-- 积分 -->
    <view class="balance-card" v-if="type === 'balance'">
      <text class="bc-label">我的积分</text>
      <text class="bc-num">{{ userInfo.balance || '0' }} <text class="bc-unit">积分</text></text>
      <text class="bc-tip">1 积分 = 1 元抵扣 · AI 提问每次消耗 0.5 积分 · 充值 1 元 = 9.9 积分</text>
      <view class="bc-actions">
        <view class="btn-p sm" @click="goRecharge">充值积分</view>
        <view class="btn-p plain sm" @click="goShop">去购物</view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="coupon-list" v-else-if="type === 'coupon'">
      <view class="coupon-card" v-for="c in list" :key="c.id">
        <view class="coupon-left">
          <text class="coupon-val">{{ c.type === 'percent' ? c.value + '折' : c.discount }}</text>
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
    title: { balance: '我的余额', coupon: '我的优惠券', favorite: '我的收藏', footprint: '我的足迹' }[type.value] || '我的',
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

/* 充值积分: 1元=9.9积分 */
function goRecharge() {
  const amounts = [10, 30, 50, 100]
  uni.showActionSheet({
    itemList: amounts.map((a) => '充 ' + a + ' 元 → ' + (a * 9.9) + ' 积分'),
    success: async (res) => {
      const amt = amounts[res.tapIndex]
      if (!amt) return
      try {
        const r = await rechargeCreate({ uid: userStore.userInfo.uid, amount: amt })
        if (r && r.order_no) {
          uni.showToast({ title: '充值订单已创建，请完成支付', icon: 'none' })
          setTimeout(() => uni.redirectTo({ url: '/pages-sub/order/detail?order_no=' + r.order_no }), 800)
        }
      } catch (e) {
        uni.showToast({ title: e.message || '创建失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.assets-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 24rpx;
}

/* 余额 */
.balance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #4e3420, #8c5a2b);
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
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
