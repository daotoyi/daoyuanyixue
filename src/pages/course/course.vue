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
                <view class="course-level" :class="'lv-' + lvCls(cc.level)">{{ cc.level }}</view>
                <view class="course-pending" v-if="!hasCourseVideo(cc)">课程待更新</view>
              </view>
              <view class="course-body-inner">
                <text class="course-title">{{ cc.title }}</text>
                <view class="course-teacher">
                  <text class="teacher-icon">👤</text>
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
                </view>
              </view>
            </view>
          </view>

          <view class="section-empty" v-else>
            <text class="empty-icon">📚</text>
            <text class="empty-tip">该分类暂无课程</text>
          </view>
        </view>

        <view class="course-bottom">— 为学日益 · 为道日损 —</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
const LV_CLS = {'入门':'basic','进阶':'inter','高级':'senior','庙':'miao','旺':'wang','得':'de','利':'li','平':'ping','不':'bu','陷':'xian'}
const lvCls = (v) => LV_CLS[v] || v

import { ref, reactive, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCourseCategories, getCourses } from '../../api/api'
import { setCourseCache } from '../../utils/courseCache'

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

/* 课程是否已有视频: 单视频字段或任一课时视频 */
function hasCourseVideo(c) {
  if (!c) return false
  if (c.video) return true
  if (Array.isArray(c.episodes)) return c.episodes.some((e) => e && e.video)
  return false
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

async function loadAllCourses() {
  // 一次加载全部课程, 按分类分组 (右侧所有分类一次性显示)
  try {
    const list = await getCourses({})
    Object.keys(grouped).forEach((k) => delete grouped[k])
    list.forEach((c) => {
      const cid = c.category_id
      if (!grouped[cid]) grouped[cid] = []
      grouped[cid].push(c)
      // 列表已含封面/标题/价格等基础字段 → 写入缓存,
      // 点进详情页时先渲染这些(封面秒出), 大纲等完整请求返回后再填充 (2026-09-03 渐进式加载)
      setCourseCache(c)
    })
  } catch (e) {
    console.error('[Course] loadAll failed', e)
  }
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages-sub/course/detail?id=${id}` })
}

onShow(async () => {
  try {
    const cats = await getCourseCategories()
    cateList.value = cats
    if (cats.length) activeCate.value = cats[0].id
    await loadAllCourses()
  } catch (e) {
    console.error('[Course] load failed', e)
  }
})
</script>

<style lang="scss" scoped>
.course-page {
  min-height: 100vh;
  background: #f8f5f0;
}

.course-body {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* 左侧分类 */
.cate-side {
  width: 168rpx;
  background: #fbe9ec;
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
  background: #fffafa;
}
.cate-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 40rpx;
  border-radius: 3rpx;
  background: #c41e3a;
}
.cate-name {
  font-size: 26rpx;
  color: #55524c;
}
.cate-item.active .cate-name {
  color: #c41e3a;
  font-weight: 500;
}

/* 右侧课程 */
.course-side {
  flex: 1;
  background: #f8f5f0;
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
  color: #9c1630;
}
.section-sub {
  margin-left: auto;
  font-size: 22rpx;
  color: #8a857c;
}

.course-card {
  display: flex;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
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
  color: #fffafa;
}
/* 课程待更新标记 (未上传视频) */
.course-pending {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 8rpx 20rpx;
  background: rgba(60, 42, 24, 0.72);
  color: #ffd8a8;
  font-size: 20rpx;
  border-top-left-radius: 14rpx;
}
.lv-basic { background: #6e7f5a; }
.lv-inter { background: #c41e3a; }
.lv-senior { background: #9c1630; }

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
  color: #2a2a2a;
  line-height: 1.6;
  word-break: break-all;
}
.course-teacher {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}
.teacher-icon { font-size: 20rpx; color: #55524c; }
.teacher-name {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: #55524c;
}
.course-stats {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #8a857c;
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
.course-price {
  font-size: 32rpx;
  font-weight: 500;
  color: #9c1630;
}
.course-otprice {
  font-size: 20rpx;
  color: #8a857c;
  text-decoration: line-through;
  margin-left: 10rpx;
  margin-right: auto;
}

.section-empty {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.section-empty .empty-icon { font-size: 64rpx; }
.section-empty .empty-tip { margin-top: 16rpx; font-size: 26rpx; color: #8a857c; }
.course-bottom {
  text-align: center;
  color: #8a857c;
  font-size: 22rpx;
  padding: 30rpx 0 40rpx;
  letter-spacing: 2rpx;
}

/* PC 宽屏: 页面收拢居中 (H5 桌面浏览器生效, 手机/小程序窄屏不触发) */
@media screen and (min-width: 1025px) {
  .course-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
}
@media screen and (min-width: 1440px) {
  .course-page {
    max-width: 1320px;
  }
}

</style>
