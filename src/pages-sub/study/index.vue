<template>
  <view class="sp-page">
    <!-- 顶部品牌头 -->
    <view class="sp-header">
      <view class="sp-deco">學</view>
      <view class="sp-headtxt">
        <text class="sp-title">游学</text>
        <text class="sp-sub">读万卷书 · 行万里路 · 访名师而问道</text>
      </view>
    </view>

    <!-- 基本介绍 -->
    <view class="sp-card sp-intro-card">
      <text class="si-title">关于游学</text>
      <text class="si-text">短期研学行程，随师同行、现场讲解，边走边学。行程结束回到课程里再深入一层，知行相续不使中断；适合已入门、欲在实践中印证书本所学之人，亦适合初次接触、想先看一看到的学人。</text>
      <view class="si-tags">
        <text class="si-tag">随师讲解</text>
        <text class="si-tag">短期营期</text>
        <text class="si-tag">知行相续</text>
      </view>
    </view>

    <!-- 商城游学商品卡片（按真实分类拉取，点击进商品详情） -->
    <view class="sp-card">
      <view class="sec-head">
        <text class="sec-title">游学商品</text>
        <text class="sec-more" @tap="goShop">逛商城 ›</text>
      </view>
      <view v-if="products.length" class="prod-list">
        <view class="prod-card" v-for="p in products" :key="p._id || p.id" @tap="goProduct(p)">
          <image v-if="p.images && p.images[0]" lazy-load class="pc-cover" :src="p.images[0]" mode="aspectFill"></image>
          <view v-else class="pc-cover pc-ph">學</view>
          <view class="pc-main">
            <text class="pc-name">{{ p.name }}</text>
            <text class="pc-desc">{{ p.description || '游学 · 研学营 / 拜师访学' }}</text>
            <view class="pc-meta">
              <text class="pc-price">{{ fmtPrice(p.price) }}</text>
              <text class="pc-go">查看详情 ›</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="sp-empty">
        <text class="sp-empty-icon">🎒</text>
        <text class="sp-empty-title">{{ loading ? '加载中…' : '游学项目筹备中' }}</text>
        <text class="sp-empty-tip">后续将在商城上架游学商品（研学营 / 拜师访学 / 主题游学）<br>上架后此处自动生成卡片，可直接进入商品详情</text>
      </view>
    </view>

    <view class="sp-foot">— 纸上得来终觉浅 · 绝知此事要躬行 —</view>
  </view>
</template>

<script setup>
/**
 * 游学板块页
 * 【数据来源】
 *  - 商品: 按真实分类 STUDY_CATE_ID 从 products 集合拉取(仅上架)，点击进商品详情
 *  - STUDY_CATE_ID = 0 表示后台尚未建游学分类 → 不请求，显示筹备空态
 *  - 商品上架后只需把 config/phase2.js 里 STUDY_CATE_ID 改成真实分类 id，本页无需再改
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProducts } from '../../api/api'
import { STUDY_CATE_ID } from '../../config/phase2.js'
import { fmtPrice } from '../../utils/price'

const cateId = STUDY_CATE_ID
const products = ref([])
const loading = ref(true)

async function loadProducts() {
  if (!cateId) {
    products.value = []
    loading.value = false
    return
  }
  try {
    const res = await getProducts({ cate_id: cateId })
    const list = Array.isArray(res) ? res : (res && (res.data || res.list)) || []
    products.value = list.filter((p) => p && p.is_show !== false)
  } catch (e) {
    console.warn('[study] 商品加载失败', e)
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
.sp-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.sp-header {
  position: relative; overflow: hidden;
  padding: 48rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #e6eef3 0%, #d6e3ec 100%);
  border-bottom: 2rpx solid rgba(43, 87, 120, 0.18);
}
.sp-deco {
  position: absolute; right: 30rpx; top: 6rpx;
  font-size: 180rpx; line-height: 1; color: rgba(43, 87, 120, 0.09); font-family: serif;
}
.sp-headtxt { position: relative; display: flex; flex-direction: column; }
.sp-title { font-size: 40rpx; font-weight: 500; color: #2b5778; }
.sp-sub { font-size: 24rpx; color: #6a8598; margin-top: 10rpx; }
.sp-card {
  margin: 24rpx; padding: 28rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
}
.sec-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 500; color: #4a3b2a; }
.sec-more { font-size: 24rpx; color: #2b5778; }

/* 基本介绍 */
.sp-intro-card { display: flex; flex-direction: column; }
.si-title { font-size: 30rpx; font-weight: 500; color: #2b5778; }
.si-text { margin-top: 16rpx; font-size: 24rpx; color: #8a7d6c; line-height: 1.8; }
.si-tags { display: flex; flex-wrap: wrap; margin-top: 18rpx; }
.si-tag {
  font-size: 20rpx; color: #2b5778; background: #eef3f7;
  border: 1rpx solid #d5e2ea; border-radius: 999rpx;
  padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0;
}

/* 商品列表 */
.prod-list { display: flex; flex-direction: column; }
.prod-card {
  display: flex; align-items: center; padding: 18rpx 0;
  border-bottom: 1rpx solid var(--dy-line);
}
.prod-card:last-child { border-bottom: none; }
.pc-cover { width: 130rpx; height: 100rpx; flex-shrink: 0; border-radius: 12rpx; background: #eaf0f4; }
.pc-ph { display: flex; align-items: center; justify-content: center; color: #2b5778; font-size: 48rpx; font-family: serif; }
.pc-main { flex: 1; min-width: 0; margin-left: 20rpx; }
.pc-name { display: block; font-size: 28rpx; color: #4a3b2a; font-weight: 500; }
.pc-desc { display: block; font-size: 21rpx; color: #a89a88; margin-top: 8rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pc-meta { display: flex; align-items: baseline; margin-top: 14rpx; }
.pc-price { font-size: 30rpx; font-weight: 600; color: #c41e3a; }
.pc-go { font-size: 22rpx; color: #8c6b1f; margin-left: auto; }

.sp-empty { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0 20rpx; }
.sp-empty-icon { font-size: 72rpx; }
.sp-empty-title { font-size: 30rpx; font-weight: 500; color: #2b5778; margin-top: 16rpx; }
.sp-empty-tip { font-size: 22rpx; color: #a89a88; margin-top: 16rpx; text-align: center; line-height: 1.7; }
.sp-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }

/* PC 宽屏: 页面收拢居中, 不铺满整个显示器 */
@media screen and (min-width: 1025px) {
  .sp-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
  .sp-card { margin: 18px auto; max-width: 1160px; }
  .si-text { font-size: 15px; }
}
@media screen and (min-width: 1440px) {
  .sp-page { max-width: 1320px; }
}
</style>
