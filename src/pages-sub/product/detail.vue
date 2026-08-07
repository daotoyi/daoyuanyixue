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

      <!-- 购买数量 -->
      <view class="qty-row">
        <text class="qty-label">购买数量</text>
        <view class="qty-ctrl">
          <view class="qty-btn" :class="{ off: qty <= 1 }" @tap="changeQty(-1)"><text>−</text></view>
          <text class="qty-num">{{ qty }}</text>
          <view class="qty-btn" :class="{ off: qty >= product.stock }" @tap="changeQty(1)"><text>＋</text></view>
        </view>
        <text class="qty-stock">库存 {{ product.stock }} 件</text>
      </view>

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
        <view class="heart-wrap" :class="{ on: collected }">
          <view class="heart" :class="{ on: collected }"></view>
        </view>
        <text class="collect-label" :class="{ on: collected }">收藏</text>
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
import { addToCart } from '../utils/cart'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const product = ref(null)
const current = ref(1)
const collected = ref(false)
const qty = ref(1)

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
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
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

function changeQty(delta) {
  const stock = product.value ? product.value.stock : 1
  qty.value = Math.min(stock, Math.max(1, qty.value + delta))
}

function addCart() {
  if (!product.value) return
  addToCart(product.value, qty.value)
  uni.showToast({ title: '已加入购物车', icon: 'success' })
  setTimeout(() => uni.switchTab({ url: '/pages-sub/cart/cart' }), 600)
}

function buyNow() {
  if (!product.value) return
  addToCart(product.value, qty.value)
  uni.navigateTo({ url: '/pages-sub/checkout/checkout' })
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
  background: #f8f3ea;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
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

/* 购买数量 (板块化) */
.qty-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  background: #f8f3ea;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
}
.qty-label {
  font-size: 26rpx;
  color: #42372c;
  font-weight: 500;
}
.qty-ctrl {
  display: flex;
  align-items: center;
  margin-left: 30rpx;
  border: 1rpx solid #efe7d8;
  border-radius: 999rpx;
  overflow: hidden;
}
.qty-btn {
  width: 64rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f3ea;
}
.qty-btn text {
  font-size: 30rpx;
  color: #8c5a2b;
}
.qty-btn.off {
  opacity: 0.4;
}
.qty-num {
  width: 80rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
}
.qty-stock {
  margin-left: 24rpx;
  font-size: 22rpx;
  color: #b3a595;
}

/* 饱满红心 (CSS 绘制) */
.heart-wrap {
  width: 44rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.heart {
  width: 34rpx;
  height: 34rpx;
  background: #857563;
  transform: rotate(45deg);
  position: relative;
  border-radius: 5rpx;
}
.heart::before,
.heart::after {
  content: '';
  position: absolute;
  width: 34rpx;
  height: 34rpx;
  background: inherit;
  border-radius: 50%;
}
.heart::before {
  left: -17rpx;
  top: 0;
}
.heart::after {
  top: -17rpx;
  left: 0;
}
.heart.on {
  background: linear-gradient(135deg, #e84545, #b02a2a);
  animation: heartbeat 0.4s ease;
}
.heart.on::before,
.heart.on::after {
  background: inherit;
  background: linear-gradient(135deg, #e84545, #b02a2a);
}
@keyframes heartbeat {
  0% { transform: rotate(45deg) scale(0.8); }
  60% { transform: rotate(45deg) scale(1.15); }
  100% { transform: rotate(45deg) scale(1); }
}
.collect-label.on {
  color: #b04a45;
}

/* 底部操作栏 (框效果) */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: #fefbf6;
  border-top: 2rpx solid #efe7d8;
  box-shadow: 0 -6rpx 20rpx rgba(78, 52, 32, 0.08);
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
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
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .detail-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .detail-page {
    max-width: 1320px;
  }
}

</style>
