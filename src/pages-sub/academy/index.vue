<template>
  <view class="academy-page">
    <view class="ac-header">
      <view class="ac-deco">道</view>
      <view class="ac-headtxt">
        <text class="ac-title">研究院</text>
        <text class="ac-sub">师者引路 · 各擅其学</text>
      </view>
    </view>

    <!-- 基本介绍 -->
    <view class="ac-intro">
      <text class="ac-intro-title">关于研究院</text>
      <text class="ac-intro-text">研究院汇集道学、易学与书道诸门明师，各以所长立课。四柱、奇门为入世之学，书法、古汉字为载道之器，德道经为归根之典。可先看老师所长与所讲课程，择一门深入，亦可诸门并观、互相印证。</text>
      <view class="ac-intro-tags">
        <text class="ac-intro-tag">明师讲席</text>
        <text class="ac-intro-tag">课程可直达</text>
        <text class="ac-intro-tag">一门深入</text>
      </view>
    </view>

    <view class="ac-list">
      <view class="teacher-card" v-for="t in teacherCards" :key="t.id">
        <view class="tc-head" @tap="goTeacher(t)">
          <view class="tc-avatar">{{ t.avatar }}</view>
          <view class="tc-main">
            <view class="tc-name-row">
              <text class="tc-name">{{ t.name }}</text>
              <text class="tc-arrow">›</text>
            </view>
            <text class="tc-title">{{ t.title }}</text>
            <view class="tc-tags">
              <text class="tc-tag" v-for="(f, i) in t.fields" :key="i">{{ f }}</text>
            </view>
          </view>
        </view>
        <view class="tc-intro ellipsis-2" @tap="goTeacher(t)">{{ t.intro }}</view>

        <!-- 该老师主讲的「上架」课程卡片: 依据真实 courses.teacher 匹配生成 -->
        <view class="tc-courses" v-if="t.courses.length">
          <view class="course-card" v-for="c in t.courses" :key="c._id" @tap="goCourse(c)">
            <image v-if="c.cover" lazy-load class="cc-cover" :src="c.cover" mode="aspectFill"></image>
            <view class="cc-main">
              <text class="cc-title ellipsis-1">{{ c.title }}</text>
              <view class="cc-meta">
                <text class="cc-price">{{ fmtPrice(c.price) }}</text>
                <text class="cc-go">去看课 ›</text>
              </view>
            </view>
          </view>
        </view>
        <view class="tc-nocourse" v-else>
          <text>暂无上架课程</text>
        </view>
      </view>
    </view>

    <!-- 商城推荐好物 (研究院相关: 优先首页推荐商品, 点击进商品详情) -->
    <view class="ac-goods" v-if="goods.length">
      <view class="ac-goods-head">
        <text class="ac-goods-title">研究院 · 相关好物</text>
        <text class="ac-goods-more" @tap="goShop">逛商城 ›</text>
      </view>
      <view class="ag-list">
        <view class="ag-card" v-for="p in goods" :key="p.id || p._id" @tap="goProduct(p)">
          <image v-if="p.images && p.images[0]" lazy-load class="ag-cover" :src="p.images[0]" mode="aspectFill"></image>
          <view v-else class="ag-cover ag-ph">道</view>
          <view class="ag-main">
            <text class="ag-name ellipsis-1">{{ p.name }}</text>
            <view class="ag-meta">
              <text class="ag-price">{{ fmtPrice(p.price) }}</text>
              <text class="ag-go">选购 ›</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="ac-foot">— 为学日益 · 为道日损 —</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourses, getProducts } from '../../api/api'
import { ACADEMY_TEACHERS, coursesOfTeacher } from '../../config/phase2.js'
import { fmtPrice } from '../../utils/price'

const teacherCards = ref(ACADEMY_TEACHERS.map((t) => ({ ...t, courses: [] })))
const goods = ref([])
const loading = ref(true)

onLoad(async () => {
  // 老师课程与商城好物互不影响, 并行加载
  try {
    const list = await getCourses()
    const courses = Array.isArray(list) ? list : (list && list.data) || []
    teacherCards.value = ACADEMY_TEACHERS.map((t) => ({
      ...t,
      courses: coursesOfTeacher(courses, t.name),
    }))
  } catch (e) {
    // 拉取失败: 保留老师卡片, 课程区显示「暂无上架课程」
    console.warn('[academy] 课程加载失败', e)
  } finally {
    loading.value = false
  }
  loadGoods()
})

/* 商城好物: 拉在售商品, 首页推荐的优先, 取前 6 个做卡片链接 */
async function loadGoods() {
  try {
    const list = (await getProducts({})) || []
    const arr = Array.isArray(list) ? list : (list.data || list.list) || []
    const visible = arr.filter((p) => p && (p.id != null || p._id) && p.is_show !== false)
    const rec = visible.filter((p) => p.home_recommend === true)
    const rest = visible.filter((p) => p.home_recommend !== true)
    goods.value = [...rec, ...rest].slice(0, 6)
  } catch (e) {
    console.warn('[academy] 商品加载失败', e)
    goods.value = []
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
function goTeacher(t) {
  uni.navigateTo({ url: `/pages-sub/academy/teacher?id=${t.id}` })
}
function goCourse(c) {
  uni.navigateTo({ url: `/pages-sub/course/detail?id=${c._id || c.id}` })
}
</script>

<style lang="scss" scoped>
.academy-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.ac-header { position: relative; overflow: hidden; padding: 48rpx 32rpx 40rpx; background: #fbe9ec; border-bottom: 2rpx solid rgba(140,90,43,0.2); }
.ac-deco { position: absolute; right: 30rpx; top: 2rpx; font-size: 190rpx; line-height: 1; color: rgba(196,30,58,0.08); font-family: serif; }
.ac-headtxt { position: relative; display: flex; flex-direction: column; }
.ac-title { font-size: 40rpx; font-weight: 500; color: #7a1220; }
.ac-sub { font-size: 24rpx; color: #9c7a68; margin-top: 10rpx; }
.ac-list { padding: 8rpx 24rpx; }
.teacher-card {
  display: flex; flex-direction: column; padding: 28rpx; margin-top: 20rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
}
.tc-head { display: flex; }
.tc-avatar {
  width: 108rpx; height: 108rpx; flex-shrink: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #7a1220 0%, #a31930 100%);
  color: #fff; font-size: 48rpx; font-family: serif; margin-right: 24rpx;
}
.tc-main { flex: 1; min-width: 0; }
.tc-name-row { display: flex; justify-content: space-between; align-items: center; }
.tc-name { font-size: 32rpx; font-weight: 500; color: #4a3b2a; }
.tc-arrow { font-size: 36rpx; color: #c9b8a4; }
.tc-title { font-size: 24rpx; color: #c41e3a; margin-top: 6rpx; }
.tc-tags { display: flex; flex-wrap: wrap; margin-top: 14rpx; }
.tc-tag { font-size: 20rpx; color: #8c6b1f; background: #fbf3e2; border: 1rpx solid #e8d9b8; border-radius: 999rpx; padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0; }
.tc-intro { font-size: 22rpx; color: #8a7d6c; line-height: 1.6; margin-top: 16rpx; }
.tc-courses { margin-top: 18rpx; border-top: 1rpx dashed rgba(140,90,43,0.25); padding-top: 16rpx; }
.course-card {
  display: flex; align-items: center; padding: 14rpx; margin-bottom: 12rpx;
  background: #fff; border: 1rpx solid #e8dcc8; border-radius: 12rpx;
}
.course-card:last-child { margin-bottom: 0; }
.cc-cover { width: 110rpx; height: 78rpx; border-radius: 8rpx; flex-shrink: 0; background: #f0e8dc; }
.cc-main { flex: 1; min-width: 0; margin-left: 16rpx; }
.cc-title { display: block; font-size: 26rpx; color: #4a3b2a; font-weight: 500; }
.cc-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.cc-price { font-size: 26rpx; color: #c41e3a; font-weight: 600; }
.cc-go { font-size: 22rpx; color: #8c6b1f; }
.tc-nocourse { margin-top: 18rpx; padding-top: 14rpx; border-top: 1rpx dashed rgba(140,90,43,0.25); font-size: 22rpx; color: #b8a894; text-align: center; }
.ac-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }

/* 基本介绍 */
.ac-intro {
  margin: 24rpx; padding: 28rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
  display: flex; flex-direction: column;
}
.ac-intro-title { font-size: 30rpx; font-weight: 500; color: #7a1220; }
.ac-intro-text { margin-top: 16rpx; font-size: 24rpx; color: #8a7d6c; line-height: 1.8; }
.ac-intro-tags { display: flex; flex-wrap: wrap; margin-top: 18rpx; }
.ac-intro-tag {
  font-size: 20rpx; color: #8c6b1f; background: #fbf3e2;
  border: 1rpx solid #e8d9b8; border-radius: 999rpx;
  padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0;
}

/* 商城好物 */
.ac-goods { margin: 8rpx 24rpx 0; padding: 28rpx; background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx; }
.ac-goods-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18rpx; }
.ac-goods-title { font-size: 30rpx; font-weight: 500; color: #4a3b2a; }
.ac-goods-more { font-size: 24rpx; color: #8c6b1f; }
.ag-list { display: flex; flex-direction: column; }
.ag-card { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid var(--dy-line); }
.ag-card:last-child { border-bottom: none; }
.ag-cover { width: 120rpx; height: 96rpx; flex-shrink: 0; border-radius: 10rpx; background: #f0e8dc; }
.ag-ph { display: flex; align-items: center; justify-content: center; color: #a31930; font-size: 44rpx; font-family: serif; }
.ag-main { flex: 1; min-width: 0; margin-left: 18rpx; }
.ag-name { display: block; font-size: 27rpx; color: #4a3b2a; }
.ag-meta { display: flex; align-items: baseline; margin-top: 12rpx; }
.ag-price { font-size: 27rpx; font-weight: 600; color: #c41e3a; }
.ag-go { font-size: 22rpx; color: #8c6b1f; margin-left: auto; }

/* PC 宽屏: 页面收拢居中, 不铺满整个显示器 */
@media screen and (min-width: 1025px) {
  .academy-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
  .ac-intro { margin: 18px auto; max-width: 1160px; padding: 18px; }
  .ac-intro-text { font-size: 15px; }
  .ac-list { max-width: 1160px; margin: 0 auto; padding: 4px 18px; }
  .ac-goods { margin: 8px auto 0; max-width: 1104px; padding: 18px; }
}
@media screen and (min-width: 1440px) {
  .academy-page { max-width: 1320px; }
}
</style>
