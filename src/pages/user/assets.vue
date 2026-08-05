<template>
  <view class="assets-page">
    <!-- 余额 -->
    <view class="balance-card" v-if="type === 'balance'">
      <text class="bc-label">账户余额</text>
      <text class="bc-num">¥{{ userInfo.balance || '0.00' }}</text>
      <text class="bc-tip">余额可在结算时抵扣商品金额</text>
      <u-button type="primary" text="去购物" shape="circle" size="small" @click="goShop"></u-button>
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
        <u-empty text="暂无优惠券，邀请好友可得 8 折券" mode="coupon"></u-empty>
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
        <u-empty :text="type === 'favorite' ? '暂无收藏商品' : '暂无浏览足迹'" mode="list"></u-empty>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMyCoupons, getMyFavorites, getMyFootprints } from '../../api/api'
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
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` })
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}
</script>

<style lang="scss" scoped>
.assets-page {
  min-height: 100vh;
  background: var(--dy-page);
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
  color: var(--dy-sub);
  margin: 16rpx 0;
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
  background: var(--dy-card);
  border-radius: 16rpx;
  border: 1rpx solid var(--dy-line);
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
  color: var(--dy-text);
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
  color: var(--dy-faint);
}
.coupon-expire {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--dy-faint);
}

/* 收藏/足迹 */
.fav-card {
  display: flex;
  background: var(--dy-card);
  border-radius: 16rpx;
  border: 1rpx solid var(--dy-line);
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.fav-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: var(--dy-page);
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
  color: var(--dy-text);
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
</style>
