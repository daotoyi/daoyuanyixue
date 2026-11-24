<template>
  <view class="tp-page">
    <!-- 顶部品牌头 -->
    <view class="tp-header">
      <view class="tp-deco">遊</view>
      <view class="tp-headtxt">
        <text class="tp-title">文旅</text>
        <text class="tp-sub">寻访道场胜境 · 于山水之间体证道法自然</text>
      </view>
    </view>

    <!-- 基本介绍 -->
    <view class="tp-card tp-intro-card">
      <text class="ti-title">关于文旅</text>
      <text class="ti-text">以山水为课堂，走访道观古迹与人文胜地，把书卷上的义理放到眼前印证。行程由熟悉当地掌故的老师带队，路线不求多而求透，行一处得一处；参访之余留有静坐与抄经的时间，使身心与山水同调。</text>
      <view class="ti-tags">
        <text class="ti-tag">道场参访</text>
        <text class="ti-tag">古迹寻访</text>
        <text class="ti-tag">随行讲解</text>
      </view>
    </view>

    <!-- 商城文旅商品卡片（按真实分类拉取，点击进商品详情） -->
    <view class="tp-card">
      <view class="sec-head">
        <text class="sec-title">文旅商品</text>
        <text class="sec-more" @tap="goShop">逛商城 ›</text>
      </view>
      <view v-if="products.length" class="prod-list">
        <view class="prod-card" v-for="p in products" :key="p._id || p.id" @tap="goProduct(p)">
          <image v-if="p.images && p.images[0]" lazy-load class="pc-cover" :src="p.images[0]" mode="aspectFill"></image>
          <view v-else class="pc-cover pc-ph">遊</view>
          <view class="pc-main">
            <text class="pc-name">{{ p.name }}</text>
            <text class="pc-desc">{{ p.description || '文旅 · 路线 / 营期 / 参访' }}</text>
            <view class="pc-meta">
              <text class="pc-price">{{ fmtPrice(p.price) }}</text>
              <text class="pc-go">查看详情 ›</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="tp-empty">
        <text class="tp-empty-icon">🏯</text>
        <text class="tp-empty-title">{{ loading ? '加载中…' : '文旅项目筹备中' }}</text>
        <text class="tp-empty-tip">后续将在商城上架文旅商品（路线 / 营期 / 参访）<br>上架后此处自动生成卡片，可直接进入商品详情</text>
      </view>
    </view>

    <view class="tp-foot">— 行到水穷处 · 坐看云起时 —</view>
  </view>
</template>

<script setup>
/**
 * 文旅板块页
 * 【数据来源】
 *  - 商品: 按真实分类 TRAVEL_CATE_ID 从 products 集合拉取(仅上架)，点击进商品详情
 *  - TRAVEL_CATE_ID = 0 表示后台尚未建文旅分类 → 不请求，显示筹备空态
 *  - 商品上架后只需把 config/phase2.js 里 TRAVEL_CATE_ID 改成真实分类 id，本页无需再改
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProducts } from '../../api/api'
import { TRAVEL_CATE_ID } from '../../config/phase2.js'
import { fmtPrice } from '../../utils/price'

const cateId = TRAVEL_CATE_ID
const products = ref([])
const loading = ref(true)

async function loadProducts() {
  if (!cateId) {
    // 分类未建: 不发请求, 直接空态
    products.value = []
    loading.value = false
    return
  }
  try {
    const res = await getProducts({ cate_id: cateId })
    const list = Array.isArray(res) ? res : (res && (res.data || res.list)) || []
    products.value = list.filter((p) => p && p.is_show !== false)
  } catch (e) {
    console.warn('[travel] 商品加载失败', e)
    products.value = []
  } finally {
    loading.value = false
  }
}

function goProduct(p) {
  const id = p.id || p._id
  if (!id) return
  uni.navigateTo({ url: `/pages-sub/product/detail?id=${id}` })
}
function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}

onShow(loadProducts)
</script>

<style lang="scss" scoped>
.tp-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.tp-header {
  position: relative; overflow: hidden;
  padding: 48rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #f3efe2 0%, #e8e0cd 100%);
  border-bottom: 2rpx solid rgba(140, 90, 43, 0.2);
}
.tp-deco {
  position: absolute; right: 30rpx; top: 6rpx;
  font-size: 180rpx; line-height: 1; color: rgba(124, 122, 58, 0.10); font-family: serif;
}
.tp-headtxt { position: relative; display: flex; flex-direction: column; }
.tp-title { font-size: 40rpx; font-weight: 500; color: #6e7f5a; }
.tp-sub { font-size: 24rpx; color: #8c8a6a; margin-top: 10rpx; }
.tp-card {
  margin: 24rpx; padding: 28rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
}
.sec-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 500; color: #4a3b2a; }
.sec-more { font-size: 24rpx; color: #6e7f5a; }

/* 基本介绍 */
.tp-intro-card { display: flex; flex-direction: column; }
.ti-title { font-size: 30rpx; font-weight: 500; color: #6e7f5a; }
.ti-text { margin-top: 16rpx; font-size: 24rpx; color: #8a7d6c; line-height: 1.8; }
.ti-tags { display: flex; flex-wrap: wrap; margin-top: 18rpx; }
.ti-tag {
  font-size: 20rpx; color: #6e7f5a; background: #f2f5ec;
  border: 1rpx solid #dde5d0; border-radius: 999rpx;
  padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0;
}

/* 商品列表 */
.prod-list { display: flex; flex-direction: column; }
.prod-card {
  display: flex; align-items: center; padding: 18rpx 0;
  border-bottom: 1rpx solid var(--dy-line);
}
.prod-card:last-child { border-bottom: none; }
.pc-cover { width: 130rpx; height: 100rpx; flex-shrink: 0; border-radius: 12rpx; background: #f0e8dc; }
.pc-ph { display: flex; align-items: center; justify-content: center; color: #6e7f5a; font-size: 48rpx; font-family: serif; }
.pc-main { flex: 1; min-width: 0; margin-left: 20rpx; }
.pc-name { display: block; font-size: 28rpx; color: #4a3b2a; font-weight: 500; }
.pc-desc { display: block; font-size: 21rpx; color: #a89a88; margin-top: 8rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pc-meta { display: flex; align-items: baseline; margin-top: 14rpx; }
.pc-price { font-size: 30rpx; font-weight: 600; color: #c41e3a; }
.pc-go { font-size: 22rpx; color: #8c6b1f; margin-left: auto; }

.tp-empty { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0 20rpx; }
.tp-empty-icon { font-size: 72rpx; }
.tp-empty-title { font-size: 30rpx; font-weight: 500; color: #6e7f5a; margin-top: 16rpx; }
.tp-empty-tip { font-size: 22rpx; color: #a89a88; margin-top: 16rpx; text-align: center; line-height: 1.7; }
.tp-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }

/* PC 宽屏: 页面收拢居中, 不铺满整个显示器 */
@media screen and (min-width: 1025px) {
  .tp-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
  .tp-card { margin: 18px auto; max-width: 1160px; }
  .ti-text { font-size: 15px; }
}
@media screen and (min-width: 1440px) {
  .tp-page { max-width: 1320px; }
}
</style>
