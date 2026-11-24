<template>
  <view class="detail-page">
    <!-- 图片轮播: 移动端 aspectFit 完整显示(不裁切上下) + 按首图比例自适应高度; PC 端左大图 + 右侧竖排缩略图 -->
    <view class="swiper-wrap" v-if="product">
      <view class="swiper-box">
        <swiper
          class="swiper"
          :style="swiperStyle"
          indicator-dots
          :current="current"
          :indicator-active-color="'#c41e3a'"
          indicator-color="rgba(255,255,255,0.5)"
          circular
          @change="onSwiperChange"
        >
          <swiper-item v-for="(img, i) in product.images" :key="i">
            <image class="swiper-img" :src="img" mode="aspectFit" @load="onImgLoad" @tap="preview(i)"></image>
          </swiper-item>
        </swiper>
        <view class="img-count">{{ current + 1 }} / {{ product.images.length }}</view>
      </view>
      <!-- PC 端竖排缩略图 (移动端由 CSS 隐藏), 点击切换大图 -->
      <view class="thumbs" v-if="product.images && product.images.length > 1">
        <view
          class="thumb"
          v-for="(img, i) in product.images"
          :key="'t' + i"
          :class="{ on: current === i }"
          @tap="goImage(i)"
        >
          <image lazy-load class="thumb-img" :src="img" mode="aspectFill"></image>
        </view>
      </view>
    </view>

    <view class="info-card" v-if="product">
      <view class="price-row">
        <text class="price">{{ fmtPrice(product.price) }}</text>
        <text class="otprice" v-if="!isFreePrice(product.price) && Number(product.ot_price) > 0">¥{{ product.ot_price }}</text>
        <text class="sales">已售 {{ product.sales }}</text>
      </view>
      <text class="p-name">{{ product.name }}</text>
      <text class="p-sub" v-if="product.subtitle">{{ product.subtitle }}</text>
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

    <!-- 道家养生次卡区（仅养生商品 cate_id=12 显示）：有效期设置 + 下单 + 我的次卡核销 -->
    <view class="hc-panel" v-if="isHealthProduct">
      <view class="hc-panel-head">
        <text class="hcp-title">养生次卡</text>
        <text class="hcp-sub">开通后到店消费，每使用一次核销一次</text>
      </view>

      <!-- 有效期设置 -->
      <view class="hcp-row">
        <text class="hcp-label">有效期</text>
        <view class="hcp-opts">
          <view
            class="hcp-opt"
            v-for="opt in validOpts"
            :key="opt.days"
            :class="{ on: validDays === opt.days }"
            @tap="validDays = opt.days"
          >{{ opt.label }}</view>
        </view>
      </view>

      <!-- 开通次卡（下单） -->
      <view class="hcp-open">
        <view class="hcp-open-info">
          <text class="hcp-open-t">每次 {{ timesOfProduct(product) }} 次 · ¥{{ product ? product.price : '' }}</text>
          <text class="hcp-open-d">有效期 {{ validLabel }}，开通后按次核销</text>
        </view>
        <view class="btn-p sm" @tap="openHealthCard"><text>开通次卡</text></view>
      </view>

      <!-- 我的该商品次卡 + 核销按钮 -->
      <view class="hcp-my" v-if="myCards.length">
        <text class="hcp-my-title">我的次卡（{{ myCards.length }}）</text>
        <view class="hcp-card" v-for="c in myCards" :key="c.cardNo" :class="{ expired: !isCardValid(c) }">
          <view class="hcpc-info">
            <text class="hcpc-no">{{ c.cardNo }}</text>
            <text class="hcpc-remain">剩余 {{ c.remain }}/{{ c.total }} 次 · 有效至 {{ fmtDate(c.expireAt) }}</text>
          </view>
          <view class="hcpc-btn" :class="{ disabled: !isCardValid(c) || c.remain <= 0 }" @tap="doHealthCheckin(c)">
            <text>{{ !isCardValid(c) ? '已过期' : (c.remain > 0 ? '核销1次' : '已用完') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <view class="act-collect" @tap="toggleCollect">
        <view class="heart-wrap" :class="{ on: collected }">
          <image class="heart" :class="{ on: collected }" :src="LIKE_SVG" mode="aspectFit"></image>
        </view>
        <text class="collect-label" :class="{ on: collected }">收藏</text>
      </view>
      <!-- 分享: 仿盘道详情页模式 —— 微信/抖音用原生 share 按钮, H5/App 复制链接 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="act-share" open-type="share">
        <view class="share-wrap">
          <image class="share-icon" :src="SHARE_SVG" mode="aspectFit"></image>
        </view>
        <text class="collect-label">分享</text>
      </button>
      <!-- #endif -->
      <!-- #ifdef MP-TOUTIAO -->
      <!-- 抖音的 button 同样支持 open-type=share, 且 onShareAppMessage 有效;
           但抖音默认"分享小程序首页", 页面级 path 需在 onShareAppMessage 里返回 -->
      <button class="act-share" open-type="share">
        <view class="share-wrap">
          <image class="share-icon" :src="SHARE_SVG" mode="aspectFit"></image>
        </view>
        <text class="collect-label">分享</text>
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- #ifndef MP-TOUTIAO -->
      <view class="act-collect" @tap="sharePage">
        <view class="share-wrap">
          <image class="share-icon" :src="SHARE_SVG" mode="aspectFit"></image>
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
import {
  HEALTH_CATE_ID, buyCardSim, cardsOfProduct, checkinOnceSim,
  isCardValid, timesOfProduct, DEFAULT_CARD_VALID_DAYS,
} from '../../config/phase2.js'

// 分享图标 (SVG 紫色转发箭头) —— 微信/抖音小程序 CSS 不支持 SVG 背景图, 故用 data-uri 内联到 <image>
const SHARE_SVG =
  'data:image/svg+xml;base64,' +
  'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yNiA0TDQ0IDIyTDI2IDM5VjI4QzEyIDI4IDYgNDMgNiA0M0M2IDI2IDExIDE1IDI2IDE1VjRaIiBmaWxsPSIjOTAxYmIxIiBzdHJva2U9IiM5MDFiYjEiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+'

// 收藏图标 (SVG 红色心形)
const LIKE_SVG =
  'data:image/svg+xml;base64,' +
  'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xNSA4QzguOTI0ODcgOCA0IDEyLjkyNDkgNCAxOUM0IDMwIDE3IDQwIDI0IDQyLjMyNjJDMzEgNDAgNDQgMzAgNDQgMTlDNDQgMTIuOTI0OSAzOS4wNzUxIDggMzMgOEMyOS4yNzk3IDggMjUuOTkwNyA5Ljg0NjkgMjQgMTIuNjczOEMyMi4wMDkzIDkuODQ2OSAxOC43MjAzIDggMTUgOFoiIGZpbGw9IiNkMDAyMWIiIHN0cm9rZT0iI2QwMDIxYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4='

const userStore = useUserStore()
const product = ref(null)
const current = ref(0)
const swiperStyle = ref('')
let ratioMeasured = false
const collected = ref(false)
const qty = ref(1)

const attrList = computed(() => {
  if (!product.value || !product.value.attrs) return []
  return Object.entries(product.value.attrs)
})

/* ==================== 道家养生次卡（cate_id=12）==================== */
const validOpts = [
  { days: 180, label: '6个月' },
  { days: 365, label: '12个月' },
  { days: 730, label: '24个月' },
]
const validDays = ref(DEFAULT_CARD_VALID_DAYS)
const myCards = ref([])
const isHealthProduct = computed(() => !!product.value && Number(product.value.cate_id) === HEALTH_CATE_ID)
const validLabel = computed(() => {
  const o = validOpts.find((x) => x.days === validDays.value)
  return o ? o.label : '12个月'
})
function refreshMyCards() {
  myCards.value = product.value ? cardsOfProduct(product.value._id || product.value.id) : []
}
function fmtDate(ts) {
  if (!ts) return '长期有效'
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function openHealthCard() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录后开通', icon: 'none' })
    return
  }
  uni.showModal({
    title: '开通养生次卡',
    content: `「${product.value.name}」共 ${timesOfProduct(product.value)} 次，有效期 ${validLabel.value}。演示版本地模拟，不产生真实扣款。`,
    confirmText: '确认开通',
    success: (r) => {
      if (!r.confirm) return
      buyCardSim(product.value, validDays.value)
      refreshMyCards()
      uni.showToast({ title: '开通成功', icon: 'success' })
    },
  })
}
function doHealthCheckin(c) {
  if (!isCardValid(c) || c.remain <= 0) return
  uni.showModal({
    title: '核销一次',
    content: `确认本次消费？将从该次卡核销 1 次。`,
    confirmText: '确认核销',
    success: (r) => {
      if (!r.confirm) return
      const res = checkinOnceSim(c.cardNo)
      refreshMyCards()
      uni.showToast({ title: res.msg, icon: res.ok ? 'success' : 'none' })
    },
  })
}

onLoad(async (options) => {
  try {
    product.value = await getProduct(options.id)
    uni.setNavigationBarTitle({ title: product.value ? product.value.name : '商品详情' })
    if (isHealthProduct.value) refreshMyCards()
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

/* ==================== 轮播图: 计数 / 缩略图切换 / 移动端自适应高度 ==================== */
function onSwiperChange(e) {
  current.value = (e && e.detail && e.detail.current) || 0
}

function goImage(i) {
  current.value = i
}

// 移动端按首图宽高比算轮播高度, 配合 aspectFit 让图片完整显示(不裁切上下);
// PC 端不写内联高度, 由 media query 固定 480px, 避免内联样式压过 media query
function onImgLoad(e) {
  if (ratioMeasured) return
  const d = (e && e.detail) || {}
  const w = Number(d.width) || 0
  const h = Number(d.height) || 0
  if (!w || !h) return
  ratioMeasured = true
  const sys = uni.getSystemInfoSync()
  const winW = sys.windowWidth || 375
  if (winW >= 1025) return
  const boxH = Math.min(
    Math.max(winW * (h / w), winW * 0.72),
    (sys.windowHeight || 667) * 0.62
  )
  swiperStyle.value = 'height:' + Math.round(boxH) + 'px'
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
  display: flex;
  align-items: flex-start;
}
.swiper-box {
  position: relative;
  flex: 1;
  min-width: 0;
}
.swiper {
  width: 100%;
  height: 600rpx;
  background: #f3efe8;
}
.swiper-img {
  width: 100%;
  height: 100%;
}
/* PC 竖排缩略图: 默认隐藏, 仅在宽屏 media query 内显示 */
.thumbs {
  display: none;
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
  margin: 16rpx 24rpx 0;
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
/* 商品副标题 (后台「副标题」字段, 名称下方) */
.p-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 25rpx;
  color: #8a857c;
  line-height: 1.5;
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

/* 收藏图标: SVG 红色心形 (data-uri), 未选中用灰度滤镜变灰 */
.heart-wrap {
  width: 99rpx;
  height: 90rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.heart {
  width: 36rpx;
  height: 36rpx;
  filter: grayscale(1);
  opacity: 0.5;
  transition: filter 0.2s, opacity 0.2s;
}
.heart.on {
  filter: none;
  opacity: 1;
  animation: heartbeat 0.4s ease;
}
@keyframes heartbeat {
  0% { transform: scale(0.8); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
.collect-label.on {
  color: #9c1630;
}

/* ==================== 道家养生次卡区 ==================== */
.hc-panel {
  margin: 24rpx; padding: 28rpx;
  background: #fffafa; border: 1rpx solid #e8dcc8; border-radius: 16rpx;
}
.hc-panel-head { display: flex; flex-direction: column; margin-bottom: 24rpx; }
.hcp-title { font-size: 30rpx; font-weight: 500; color: #7a1220; }
.hcp-sub { font-size: 21rpx; color: #a89a88; margin-top: 8rpx; }
.hcp-row { display: flex; align-items: center; margin-bottom: 22rpx; }
.hcp-label { font-size: 26rpx; color: #4a3b2a; margin-right: 20rpx; flex-shrink: 0; }
.hcp-opts { display: flex; flex-wrap: wrap; }
.hcp-opt {
  font-size: 23rpx; color: #8c6b1f; padding: 8rpx 22rpx; margin-right: 14rpx;
  border: 1rpx solid #e8d9b8; border-radius: 999rpx; background: #fbf3e2;
}
.hcp-opt.on { background: #c41e3a; color: #fff; border-color: #c41e3a; }
.hcp-open {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22rpx; background: #fbf3e2; border-radius: 12rpx;
}
.hcp-open-info { display: flex; flex-direction: column; }
.hcp-open-t { font-size: 26rpx; color: #7a1220; font-weight: 500; }
.hcp-open-d { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; }
.hcp-my { margin-top: 24rpx; border-top: 1rpx solid var(--dy-line); padding-top: 20rpx; }
.hcp-my-title { font-size: 26rpx; color: #4a3b2a; font-weight: 500; }
.hcp-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18rpx; margin-top: 14rpx; background: #fff;
  border: 1rpx solid #e8dcc8; border-radius: 12rpx;
}
.hcp-card.expired { opacity: 0.6; }
.hcpc-info { display: flex; flex-direction: column; }
.hcpc-no { font-size: 24rpx; color: #4a3b2a; }
.hcpc-remain { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; }
.hcpc-btn {
  font-size: 23rpx; color: #fff; background: #c41e3a;
  padding: 12rpx 24rpx; border-radius: 999rpx; flex-shrink: 0;
}
.hcpc-btn.disabled { background: #c9b8a4; }

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
  width: 112rpx;
}
.collect-icon {
  font-size: 40rpx;
  color: #55524c;
}
.collect-icon.on {
  color: #9c1630;
}
.collect-label {
  font-size: 22rpx;
  color: #55524c;
}
/* 分享按钮: 与收藏按钮(.act-collect)宽度/结构/字号完全一致, 保证视觉统一 */
.act-share {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 112rpx;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  line-height: 1.2;
}
.act-share::after {
  border: none;
}
.share-wrap {
  width: 99rpx;
  height: 90rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 分享图标: SVG 转发箭头 (data-uri), 与收藏心形(.heart 48rpx)等大小 */
.share-icon {
  width: 36rpx;
  height: 36rpx;
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
  .swiper-wrap {
    gap: 14px;
  }
  .swiper {
    height: 480px;
  }
  /* PC 端竖排缩略图: 宽屏页面较宽, 大图左 + 缩略图右, 点击切换 */
  .thumbs {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 92px;
    max-height: 480px;
    overflow-y: auto;
    padding: 0 4px 0 0;
  }
  .thumb {
    flex: 0 0 auto;
    width: 88px;
    height: 88px;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid transparent;
    box-sizing: border-box;
    cursor: pointer;
    background: #f3efe8;
    transition: border-color 0.2s;
  }
  .thumb.on {
    border-color: #c41e3a;
  }
  .thumb-img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .img-count {
    right: 18px;
    bottom: 16px;
    font-size: 14px;
    padding: 4px 12px;
  }
  .info-card {
    margin: 18px 24px 0;
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
  .p-sub {
    font-size: 14px;
    margin-top: 6px;
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
    width: 72px;
    height: 63px;
  }
  .heart {
    width: 27px;
    height: 27px;
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
    width: 81px;
  }
  /* 分享按钮与收藏按钮 PC 端同样保持等宽 */
  .act-share {
    width: 81px;
  }
  .collect-icon {
    font-size: 28px;
  }
  .collect-label {
    font-size: 15px;
  }
  /* 分享图标 PC 端用绝对 px 覆写, 与收藏心形(.heart 36px)大小一致, 避免 rpx 在宽屏被撑大 */
  .share-wrap {
    width: 72px;
    height: 63px;
  }
  .share-icon {
    width: 27px;
    height: 27px;
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
