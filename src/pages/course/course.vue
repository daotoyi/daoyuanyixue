<template>
  <view class="course-page">
    <view class="course-body">
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

      <!-- 右侧课程分区 -->
      <scroll-view scroll-y class="course-side" :scroll-into-view="intoView" :scroll-with-animation="true" @scroll="onSideScroll">
        <view
          v-for="c in cateList"
          :key="c.id"
          :id="'cate-' + c.id"
          class="course-section"
        >
          <view class="section-head">
            <text class="section-title">{{ c.name }}</text>
            <text class="section-sub">{{ cateCount(c.id) }} 门</text>
          </view>

          <view class="course-list" v-if="grouped[c.id] && grouped[c.id].length">
            <view class="course-card" v-for="cc in grouped[c.id]" :key="cc.id" @tap="goDetail(cc.id)">
              <view class="course-cover">
                <image class="course-img" :src="cc.cover" mode="aspectFill"></image>
                <view class="course-level" :class="'lv-' + cc.level">{{ cc.level }}</view>
              </view>
              <view class="course-body-inner">
                <text class="course-title">{{ cc.title }}</text>
                <view class="course-teacher">
                  <u-icon name="account" color="var(--dy-sub)" size="14"></u-icon>
                  <text class="teacher-name">{{ cc.teacher }}</text>
                </view>
                <view class="course-stats">
                  <text class="stat">{{ cc.lessons_count }} 课时</text>
                  <text class="stat-dot">·</text>
                  <text class="stat">{{ cc.students_count }} 人学过</text>
                </view>
                <view class="course-price-row">
                  <text class="course-price">¥{{ cc.price }}</text>
                  <text class="course-otprice">¥{{ cc.ot_price }}</text>
                  <view class="btn-view" @tap.stop="goDetail(cc.id)">
                    <text>查看</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="section-empty" v-else>
            <u-empty text="该分类暂无课程" mode="list"></u-empty>
          </view>
        </view>

        <view class="course-bottom">— 为学日益 · 为道日损 —</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { getCourseCategories, getCourses } from '../../api/api'

const cateList = ref([])
const grouped = reactive({})
const activeCate = ref(0)
const intoView = ref('')
let sideTop = 0

const currentCate = computed(() =>
  cateList.value.find((c) => c.id === activeCate.value) || null
)

function cateCount(id) {
  return (grouped[id] || []).length
}

async function switchCate(id) {
  activeCate.value = id
  intoView.value = 'cate-' + id
  if (!grouped[id]) {
    await loadCourses(id)
  }
}

function onSideScroll(e) {
  sideTop = e.detail.scrollTop
}

async function loadCourses(cateId) {
  try {
    const list = await getCourses({ category_id: cateId })
    grouped[cateId] = list
  } catch (e) {
    grouped[cateId] = []
  }
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/course/detail?id=${id}` })
}

onMounted(async () => {
  try {
    const cats = await getCourseCategories()
    cateList.value = cats
    if (cats.length) {
      activeCate.value = cats[0].id
      await loadCourses(cats[0].id)
    }
  } catch (e) {
    console.error('[Course] load failed', e)
  }
})
</script>

<style lang="scss" scoped>
.course-page {
  min-height: 100vh;
  background: var(--dy-page);
}

.course-body {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* 左侧分类 */
.cate-side {
  width: 168rpx;
  background: var(--dy-soft);
  border-right: 2rpx solid rgba(140, 90, 43, 0.35);
  box-shadow: 1rpx 0 0 rgba(140, 90, 43, 0.12) inset;
  flex-shrink: 0;
}
.cate-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 34rpx 20rpx;
  justify-content: center;
}
.cate-item.active {
  background: var(--dy-card);
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
  color: var(--dy-sub);
}
.cate-item.active .cate-name {
  color: #8c5a2b;
  font-weight: 500;
}

/* 右侧课程 */
.course-side {
  flex: 1;
  background: var(--dy-page);
}
.course-section {
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
}
.section-sub {
  margin-left: auto;
  font-size: 22rpx;
  color: var(--dy-faint);
}

.course-card {
  display: flex;
  background: var(--dy-card);
  border-radius: 16rpx;
  border: 1rpx solid var(--dy-line);
  overflow: hidden;
  margin-bottom: 20rpx;
}
.course-cover {
  position: relative;
  width: 216rpx;
  height: 216rpx;
  flex-shrink: 0;
}
.course-img {
  width: 100%;
  height: 100%;
}
.course-level {
  position: absolute;
  left: 12rpx;
  top: 12rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: var(--dy-card);
}
.lv-入门 { background: #6e7f5a; }
.lv-进阶 { background: #8c5a2b; }
.lv-高级 { background: #b04a45; }

.course-body-inner {
  flex: 1;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.course-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--dy-text);
  line-height: 1.6;
  word-break: break-all;
}
.course-teacher {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}
.teacher-name {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: var(--dy-sub);
}
.course-stats {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--dy-faint);
}
.stat-dot {
  margin: 0 8rpx;
}
.course-price-row {
  margin-top: auto;
  display: flex;
  align-items: center;
  padding-top: 12rpx;
  padding-right: 16rpx;
}
/* 查看按钮: 实心 + 靠左不贴右边 + 文字单行 */
.btn-view {
  flex-shrink: 0;
  margin-left: auto;
  margin-right: 4rpx;
  min-width: 96rpx;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-view text {
  font-size: 22rpx;
  color: var(--dy-card);
  letter-spacing: 1rpx;
  white-space: nowrap;
  line-height: 1;
}
.course-price {
  font-size: 32rpx;
  font-weight: 500;
  color: #b04a45;
}
.course-otprice {
  font-size: 20rpx;
  color: var(--dy-faint);
  text-decoration: line-through;
  margin-left: 10rpx;
  margin-right: auto;
}

.section-empty {
  padding: 20rpx 0 40rpx;
}
.course-bottom {
  text-align: center;
  color: var(--dy-faint);
  font-size: 22rpx;
  padding: 30rpx 0 40rpx;
  letter-spacing: 2rpx;
}
</style>
