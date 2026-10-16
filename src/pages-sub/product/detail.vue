<template>
  <view class="detail-page">
    <!-- 图片轮播 -->
    <view class="swiper-wrap" v-if="product">
      <swiper class="swiper" indicator-dots :indicator-active-color="'#c41e3a'" indicator-color="rgba(255,255,255,0.5)" circular>
        <swiper-item v-for="(img, i) in product.images" :key="i">
          <image class="swiper-img" :src="img" mode="aspectFill" @tap="preview(i)"></image>
        </swiper-item>
      </swiper>
      <view class="img-count">{{ current }} / {{ product.images.length }}</view>
    </view>

    <view class="info-card" v-if="product">
      <view class="price-row">
        <text class="price">{{ fmtPrice(product.price) }}</text>
        <text class="otprice" v-if="!isFreePrice(product.price) && Number(product.ot_price) > 0">¥{{ product.ot_price }}</text>
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
      <!-- 分享: 仿盘道详情页模式 —— 微信/抖音用原生 share 按钮, H5/App 复制链接 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="act-share" open-type="share">
        <view class="share-wrap">
          <view class="share-icon"></view>
        </view>
        <text class="collect-label">分享</text>
      </button>
      <!-- #endif -->
      <!-- #ifdef MP-TOUTIAO -->
      <!-- 抖音的 button 同样支持 open-type=share, 且 onShareAppMessage 有效;
           但抖音默认"分享小程序首页", 页面级 path 需在 onShareAppMessage 里返回 -->
      <button class="act-share" open-type="share">
        <view class="share-wrap">
          <view class="share-icon"></view>
        </view>
        <text class="collect-label">分享</text>
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- #ifndef MP-TOUTIAO -->
      <view class="act-collect" @tap="sharePage">
        <view class="share-wrap">
          <view class="share-icon"></view>
        </view>
        <text class="collect-label">分享</text>
      </view>
      <!-- #endif -->
      <!-- #endif -->
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
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getProduct, toggleFavoriteProduct, addFootprint } from '../../api/api'
import { addToCart } from '../utils/cart'
import { useUserStore } from '../../store/index'
import { isFreePrice, fmtPrice } from '../../utils/price'

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

/* ==================== 分享 (仿盘道详情页) ==================== */
// 微信/抖音小程序: onShareAppMessage 让右上角胶囊出现"转发"入口
onShareAppMessage(() => {
  const p = product.value
  return {
    title: p ? p.name + ' · 真和盛' : '真和盛 · 好物',
    path: '/pages-sub/product/detail?id=' + (p ? p.id : ''),
    imageUrl: p && p.images && p.images[0] ? p.images[0] : '',
  }
})

// H5 / App: 无原生分享面板, 复制链接到剪贴板
function sharePage() {
  const p = product.value
  const link = 'https://club.zhenhesheng.cn/h5/#/pages-sub/product/detail?id=' + (p ? p.id : '')
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制，可发给好友', icon: 'none' }),
  })
}

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
  // 立即购买: 只结算当前商品, 不带购物车遗留的已选商品
  const p = product.value
  uni.navigateTo({ url: '/pages-sub/checkout/checkout?buy_now=' + p.id + '&qty=' + qty.value })
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f8f5f0;
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
  background: #fffafa;
  border-radius: 20rpx;
  border: 1rpx solid #e8e2da;
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
  color: #9c1630;
}
.otprice {
  font-size: 24rpx;
  color: #8a857c;
  text-decoration: line-through;
  margin-left: 14rpx;
}
.sales {
  margin-left: auto;
  font-size: 22rpx;
  color: #55524c;
}
.p-name {
  display: block;
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.p-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #55524c;
  line-height: 1.6;
}

.attrs {
  margin-top: 24rpx;
  background: #f8f5f0;
  border: 1rpx solid #e8e2da;
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
  color: #55524c;
}
.attr-val {
  flex: 1;
  font-size: 24rpx;
  color: #2a2a2a;
}

/* 购买数量 (板块化) */
.qty-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  background: #f8f5f0;
  border: 1rpx solid #e8e2da;
  border-radius: 16rpx;
}
.qty-label {
  font-size: 26rpx;
  color: #2a2a2a;
  font-weight: 500;
}
.qty-ctrl {
  display: flex;
  align-items: center;
  margin-left: 30rpx;
  border: 1rpx solid #e8e2da;
  border-radius: 999rpx;
  overflow: hidden;
}
.qty-btn {
  width: 64rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f5f0;
}
.qty-btn text {
  font-size: 30rpx;
  color: #c41e3a;
}
.qty-btn.off {
  opacity: 0.4;
}
.qty-num {
  width: 80rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.qty-stock {
  margin-left: 24rpx;
  font-size: 22rpx;
  color: #8a857c;
}

/* 饱满红心 (CSS 绘制) */
.heart-wrap {
  width: 44rpx;
  height: 40rpx;
  display: flex;
  align-items: center;  justify-content: center;
}
.heart {
  width: 34rpx;
  height: 34rpx;
  background: #55524c;
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
  color: #9c1630;
}

/* 底部操作栏 (框效果) */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: #fffafa;
  border-top: 2rpx solid #e8e2da;
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
  color: #55524c;
}
.collect-icon.on {
  color: #9c1630;
}
.collect-label {
  font-size: 20rpx;
  color: #55524c;
}
/* 分享按钮: 与收藏同宽同高, 视觉对齐; 微信端是 button 需去掉默认边框 */
.act-share {
  width: 88rpx;
  padding: 0;
  margin: 0 0 0 8rpx;
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}
.act-share::after {
  border: none;
}
.share-wrap {
  width: 44rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 分享图标: 纯 CSS 画的"方框+上箭头" */
.share-icon {
  position: relative;
  width: 26rpx;
  height: 26rpx;
  border: 3rpx solid #55524c;
  border-radius: 6rpx;
  box-sizing: border-box;
}
.share-icon::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -16rpx;
  width: 3rpx;
  height: 14rpx;
  background: #55524c;
  transform: translateX(-50%);
}
.share-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -22rpx;
  width: 12rpx;
  height: 12rpx;
  border-left: 3rpx solid #55524c;
  border-top: 3rpx solid #55524c;
  transform: translateX(-50%) rotate(45deg);
  box-sizing: border-box;
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
  color: #fffafa;
  letter-spacing: 2rpx;
}
.btn-cart {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
.btn-buy {
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
/* PC 宽屏: 页面收拢居中 + 关键尺寸 px 覆写, 解决轮播/卡片/操作栏过宽过高 (手机窄屏不触发) */
/* 用绝对 px 覆写, 避免 rpx(rem) 基准(默认 960) 在宽屏把元素撑得过大 */
@media screen and (min-width: 1025px) {
  .detail-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
  .swiper {
    height: 480px;
  }
  .img-count {
    right: 18px;
    bottom: 16px;
    font-size: 14px;
    padding: 4px 12px;
  }
  .info-card {
    margin: -20px 24px 0;
    padding: 28px;
  }
  .price {
    font-size: 36px;
  }
  .otprice {
    font-size: 16px;
    margin-left: 10px;
  }
  .sales {
    font-size: 14px;
  }
  .p-name {
    font-size: 26px;
    margin-top: 12px;
  }
  .p-desc {
    font-size: 15px;
    margin-top: 8px;
    line-height: 1.7;
  }
  .attrs {
    margin-top: 18px;
    padding: 16px 20px;
  }
  .attr-key {
    width: 110px;
    font-size: 15px;
  }
  .attr-val {
    font-size: 15px;
  }
  .qty-row {
    margin-top: 18px;
    padding: 18px 20px;
  }
  .qty-label {
    font-size: 16px;
  }
  .qty-ctrl {
    margin-left: 20px;
  }
  .qty-btn {
    width: 46px;
    height: 40px;
  }
  .qty-btn text {
    font-size: 20px;
  }
  .qty-num {
    width: 56px;
    font-size: 18px;
  }
  .qty-stock {
    font-size: 14px;
    margin-left: 16px;
  }
  .heart-wrap {
    width: 32px;
    height: 28px;
  }
  .heart {
    width: 24px;
    height: 24px;
  }
  .heart::before {
    width: 24px;
    height: 24px;
    left: -12px;
    top: 0;
  }
  .heart::after {
    width: 24px;
    height: 24px;
    top: -12px;
    left: 0;
  }
  /* 底部操作栏: 约束在居中容器内, 不横跨整个视口 */
  .action-bar {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: 1200px;
    max-width: 1200px;
    padding: 14px 24px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
  }
  .act-collect {
    width: 72px;
  }
  .collect-icon {
    font-size: 28px;
  }
  .collect-label {
    font-size: 13px;
  }
  .act-btns {
    gap: 16px;
    margin-left: 16px;
  }
  .btn-fill {
    height: 52px;
  }
  .btn-fill text {
    font-size: 17px;
    letter-spacing: 1px;
  }
}
@media screen and (min-width: 1440px) {
  .detail-page {
    max-width: 1320px;
  }
  .action-bar {
    width: 1320px;
    max-width: 1320px;
  }
}

</style>
