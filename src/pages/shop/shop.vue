<template>
  <view class="shop-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-box" @tap="focusSearch">
        <text class="search-icon">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商品 / 名称 / 描述"
          placeholder-class="ph"
          confirm-type="search"
          @confirm="doSearch"
        />
        <text v-if="keyword" class="search-clear" @tap="clearSearch">×</text>
      </view>
    </view>

    <view class="shop-body">
      <!-- 左侧分类 -->
      <scroll-view scroll-y class="cate-side" :scroll-top="0">
        <view
          v-for="c in cateList"
          :key="c.id"
          class="cate-item"
          :class="{ active: activeCate === c.id }"
          @tap="switchCate(c.id)"
        >
          <view class="cate-indicator" v-if="activeCate === c.id"></view>
          <text class="cate-name">{{ c.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧商品分区 -->
      <scroll-view scroll-y class="goods-side" :scroll-into-view="intoView" :scroll-with-animation="true" @scroll="onSideScroll">
        <view
          v-for="c in cateList"
          :key="c.id"
          :id="'cate-' + c.id"
          class="goods-section"
        >
          <view class="section-head">
            <text class="section-title">{{ c.name }}</text>
            <text class="section-sub">{{ cateCount(c.id) }} 件</text>
          </view>

          <view class="goods-grid" v-if="grouped[c.id] && grouped[c.id].length">
            <view class="goods-card" v-for="p in grouped[c.id]" :key="p.id" @tap="goDetail(p.id)">
              <image class="goods-img" :src="p.images[0]" mode="aspectFill"></image>
              <view class="goods-info">
                <text class="goods-name ellipsis-2">{{ p.name }}</text>
                <view class="goods-price-row">
                  <text class="goods-price">¥{{ p.price }}</text>
                  <text class="goods-otprice">¥{{ p.ot_price }}</text>
                </view>
                <text class="goods-sales">已售 {{ p.sales }}</text>
              </view>
            </view>
          </view>

          <view class="section-empty" v-else>
            <text class="empty-icon">🛍</text>
            <text class="empty-tip">该分类暂无商品</text>
          </view>
        </view>

        <view class="goods-bottom">— 道法自然 · 物以载道 —</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { getCategories, getProducts } from '../../api/api'

const cateList = ref([])
const products = ref([])
const grouped = reactive({})
const activeCate = ref(0)
const intoView = ref('')
const keyword = ref('')
const scrollingByTap = ref(false)

const cateCount = (id) => (grouped[id] ? grouped[id].length : 0)

function groupByCate() {
  Object.keys(grouped).forEach((k) => delete grouped[k])
  cateList.value.forEach((c) => {
    grouped[c.id] = products.value.filter((p) => p.cate_id === c.id)
  })
}

function switchCate(id) {
  activeCate.value = id
  scrollingByTap.value = true
  intoView.value = ''
  nextTick(() => {
    intoView.value = 'cate-' + id
    setTimeout(() => {
      scrollingByTap.value = false
    }, 400)
  })
}

/** 右侧滚动联动左侧高亮 */
function onSideScroll(e) {
  if (scrollingByTap.value) return
  const el = e.detail.scrollTop
  let found = cateList.value[0] ? cateList.value[0].id : 0
  for (const c of cateList.value) {
    const offset = c._offset || 0
    if (el >= offset - 10) {
      found = c.id
    } else {
      break
    }
  }
  if (found !== activeCate.value) {
    activeCate.value = found
  }
}

/** 测量各分区 offsetTop, 供滚动联动 */
function measureOffsets() {
  const query = uni.createSelectorQuery()
  cateList.value.forEach((c) => {
    query
      .select('#cate-' + c.id)
      .boundingClientRect()
      .exec((res) => {
        if (res && res[0]) c._offset = res[0].top
      })
  })
  query.select('.goods-side').boundingClientRect().exec(() => {})
}

function doSearch() {
  loadProducts(keyword.value)
}

function clearSearch() {
  keyword.value = ''
  loadProducts('')
}

function focusSearch() {}

function goDetail(id) {
  uni.navigateTo({ url: `/pages-sub2/product/detail?id=${id}` })
}

async function loadProducts(kw = '') {
  const list = await getProducts({ keyword: kw })
  products.value = list
  groupByCate()
  if (!activeCate.value || !cateList.value.some((c) => c.id === activeCate.value)) {
    activeCate.value = cateList.value[0] ? cateList.value[0].id : 0
  }
  nextTick(() => measureOffsets())
}

onMounted(async () => {
  try {
    const cats = await getCategories()
    cateList.value = cats
    await loadProducts()
  } catch (e) {
    console.error('[Shop] load failed', e)
  }
})
</script>

<style lang="scss" scoped>
.shop-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f3ea;
}

/* 搜索栏 */
.search-bar {
  padding: 20rpx 24rpx;
  background: #fefbf6;
}
.search-box {
  display: flex;
  align-items: center;
  height: 68rpx;
  background: #f8f3ea;
  border-radius: 999rpx;
  padding: 0 28rpx;
}
.search-icon {
  font-size: 34rpx;
  color: #857563;
  margin-right: 12rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #42372c;
}
.ph {
  color: #b3a595;
}
.search-clear {
  color: #b3a595;
  font-size: 34rpx;
  padding: 0 8rpx;
}

/* 主体 */
.shop-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧分类 */
.cate-side {
  width: 168rpx;
  background: #faf3e9;
  border-right: 2rpx solid rgba(140, 90, 43, 0.35);
  box-shadow: 1rpx 0 0 rgba(140, 90, 43, 0.12) inset;
}
.cate-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 34rpx 20rpx;
  justify-content: center;
}
.cate-item.active {
  background: #fefbf6;
}
.cate-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 40rpx;
  border-radius: 3rpx;
  background: #8c5a2b;
}
.cate-name {
  font-size: 26rpx;
  color: #857563;
}
.cate-item.active .cate-name {
  color: #8c5a2b;
  font-weight: 500;
}

/* 右侧商品 */
.goods-side {
  flex: 1;
  background: #fefbf6;
}
.goods-section {
  padding: 24rpx;
}
.section-head {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #4e3420;
  padding-left: 16rpx;
  border-left: 6rpx solid #8c5a2b;
}
.section-sub {
  margin-left: auto;
  font-size: 22rpx;
  color: #b3a595;
}

.goods-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.goods-card {
  width: calc(50% - 10rpx);
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  margin-bottom: 20rpx;
  overflow: hidden;
}
.goods-img {
  width: 100%;
  height: 300rpx;
  background: #f8f3ea;
}
.goods-info {
  padding: 16rpx;
}
.goods-name {
  font-size: 26rpx;
  color: #42372c;
  line-height: 1.4;
  height: 72rpx;
}
.goods-price-row {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}
.goods-price {
  font-size: 30rpx;
  color: #b04a45;
  font-weight: 500;
}
.goods-otprice {
  font-size: 20rpx;
  color: #b3a595;
  text-decoration: line-through;
  margin-left: 10rpx;
}
.goods-sales {
  font-size: 20rpx;
  color: #b3a595;
  margin-top: 4rpx;
}

.section-empty {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.section-empty .empty-icon { font-size: 64rpx; }
.section-empty .empty-tip { margin-top: 16rpx; font-size: 26rpx; color: #b3a595; }
.goods-bottom {
  text-align: center;
  color: #b3a595;
  font-size: 22rpx;
  padding: 30rpx 0 40rpx;
  letter-spacing: 2rpx;
}
</style>
