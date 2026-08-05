<template>
  <view class="detail-page">
    <!-- 图片轮播 -->
    <view class="swiper-wrap" v-if="product">
      <swiper class="swiper" indicator-dots :indicator-active-color="'#8c5a2b'" indicator-color="rgba(255,255,255,0.5)" circular>
        <swiper-item v-for="(img, i) in product.images" :key="i">
          <image class="swiper-img" :src="img" mode="aspectFill" @tap="preview(i)"></image>
        </swiper-item>
      </swiper>
      <view class="img-count">{{ current }} / {{ product.images.length }}</view>
    </view>

    <view class="info-card" v-if="product">
      <view class="price-row">
        <text class="price">¥{{ product.price }}</text>
        <text class="otprice">¥{{ product.ot_price }}</text>
        <text class="sales">已售 {{ product.sales }}</text>
      </view>
      <text class="p-name">{{ product.name }}</text>
      <text class="p-desc">{{ product.description }}</text>

      <!-- 自定义属性 -->
      <view class="attrs" v-if="attrList.length">
        <view class="attr-row" v-for="[key, val] in attrList" :key="key">
          <text class="attr-key">{{ key }}</text>
          <text class="attr-val">{{ val }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <view class="act-collect" @tap="toggleCollect">
        <text class="collect-icon" :class="{ on: collected }">{{ collected ? '♥' : '♡' }}</text>
        <text class="collect-label">收藏</text>
      </view>
      <view class="act-btns">
        <view class="btn-fill btn-cart" @tap="addCart">
          <text>加入购物车</text>
        </view>
        <view class="btn-fill btn-buy" @tap="buyNow">
          <text>立即购买</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProduct, toggleFavoriteProduct, addFootprint } from '../../api/api'
import { addToCart } from '../../utils/cart'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const product = ref(null)
const current = ref(1)
const collected = ref(false)

const attrList = computed(() => {
  if (!product.value || !product.value.attrs) return []
  return Object.entries(product.value.attrs)
})

onLoad(async (options) => {
  try {
    product.value = await getProduct(options.id)
    uni.setNavigationBarTitle({ title: product.value ? product.value.name : '商品详情' })
    // 浏览足迹
    if (userStore.isLoggedIn && product.value) {
      addFootprint({
        uid: userStore.userInfo.uid,
        product_id: product.value.id,
        name: product.value.name,
        image: (product.value.images || [])[0] || '',
        price: product.value.price,
      }).catch(() => {})
    }
  } catch (e) {
    uni.showToast({ title: '商品加载失败', icon: 'none' })
  }
})

function preview(i) {
  uni.previewImage({ urls: product.value.images, current: i })
}

async function toggleCollect() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 600)
    return
  }
  try {
    const res = await toggleFavoriteProduct({
      uid: userStore.userInfo.uid,
      product_id: product.value.id,
      name: product.value.name,
      image: (product.value.images || [])[0] || '',
      price: product.value.price,
    })
    collected.value = res.favorited
    uni.showToast({ title: res.favorited ? '已收藏' : '已取消收藏', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

function addCart() {
  if (!product.value) return
  addToCart(product.value)
  uni.showToast({ title: '已加入购物车', icon: 'success' })
  setTimeout(() => uni.switchTab({ url: '/pages/cart/cart' }), 600)
}

function buyNow() {
  if (!product.value) return
  addToCart(product.value)
  uni.navigateTo({ url: '/pages/checkout/checkout' })
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding-bottom: 140rpx;
}

.swiper-wrap {
  position: relative;
}
.swiper {
  width: 100%;
  height: 600rpx;
}
.swiper-img {
  width: 100%;
  height: 100%;
}
.img-count {
  position: absolute;
  right: 24rpx;
  bottom: 20rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 18rpx;
  border-radius: 999rpx;
}

.info-card {
  margin: -24rpx 24rpx 0;
  background: #fefbf6;
  border-radius: 20rpx;
  border: 1rpx solid #efe7d8;
  padding: 30rpx;
  position: relative;
}
.price-row {
  display: flex;
  align-items: baseline;
}
.price {
  font-size: 44rpx;
  font-weight: 500;
  color: #b04a45;
}
.otprice {
  font-size: 24rpx;
  color: #b3a595;
  text-decoration: line-through;
  margin-left: 14rpx;
}
.sales {
  margin-left: auto;
  font-size: 22rpx;
  color: #857563;
}
.p-name {
  display: block;
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 500;
  color: #42372c;
}
.p-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #857563;
  line-height: 1.6;
}

.attrs {
  margin-top: 24rpx;
  border-top: 1rpx solid #f8f3ea;
  padding-top: 20rpx;
}
.attr-row {
  display: flex;
  margin-bottom: 14rpx;
}
.attr-key {
  width: 140rpx;
  font-size: 24rpx;
  color: #857563;
}
.attr-val {
  flex: 1;
  font-size: 24rpx;
  color: #42372c;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: #fefbf6;
  border-top: 1rpx solid #efe7d8;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 10;
}
.act-collect {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100rpx;
}
.collect-icon {
  font-size: 40rpx;
  color: #857563;
}
.collect-icon.on {
  color: #b04a45;
}
.collect-label {
  font-size: 20rpx;
  color: #857563;
}
.act-btns {
  flex: 1;
  display: flex;
  gap: 20rpx;
  margin-left: 16rpx;
}
/* 双色实心按钮 */
.btn-fill {
  flex: 1;
  height: 84rpx;
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
.btn-cart {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}
.btn-buy {
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
</style>
