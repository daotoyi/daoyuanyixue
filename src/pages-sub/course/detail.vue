<template>
  <view class="cd-page">
  <template v-if="course">
    <!-- 封面 -->
    <view class="cover">
      <image class="cover-img" :src="course.cover" mode="aspectFill"></image>
      <view class="cover-level" :class="'lv-' + lvCls(course.level)">{{ course.level }}</view>
      <view class="cover-title">{{ course.title }}</view>
    </view>

    <!-- 价格与信息 -->
    <view class="card">
      <view class="price-row">
        <text class="price">¥{{ course.price }}</text>
        <text class="otprice">¥{{ course.ot_price }}</text>
        <text class="students">{{ course.students_count }} 人学过</text>
      </view>
      <view class="teacher-row" @tap="showTeacher">
        <view class="avatar-circle">{{ course.teacher[0] }}</view>
        <view class="teacher-info">
          <text class="teacher-name">{{ course.teacher }}</text>
          <text class="teacher-sub">课程讲师 · 点击查看简介 ›</text>
        </view>
      </view>

      <!-- 老师简介弹层 -->
      <view class="pp-mask" v-if="showTeacherPanel" @tap="showTeacherPanel = false"><view class="pp-sheet" @tap.stop>
        <view class="picker-sheet">
          <view class="sheet-title">{{ teacherInfoData.teacher }}</view>
          <view class="ti-intro">{{ teacherInfoData.intro }}</view>
          <view class="ti-courses" v-if="teacherInfoData.courses && teacherInfoData.courses.length">
            <text class="ti-courses-label">主讲课程</text>
            <text class="ti-course" v-for="(t, ti) in teacherInfoData.courses" :key="ti">· {{ t }}</text>
          </view>
          <view class="btn-p sm ti-close" @click="showTeacherPanel = false">关闭</view>
        </view>
      </view></view>
    </view>

    <!-- 课程介绍 -->
    <view class="card">
      <view class="card-title">课程介绍</view>
      <text class="desc">{{ course.description }}</text>
    </view>

    <!-- 课程大纲 (后台上传的课时; 点击进入小节页播放) -->
    <view class="card">
      <view class="card-title">课程大纲 · 共 {{ outlineList.length }} 课时</view>
      <view class="outline">
        <view class="lesson" v-for="(ep, i) in outlineList" :key="i" @tap="openLesson(i)">
          <view class="lesson-idx">{{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}</view>
          <view class="lesson-main">
            <view class="lesson-name-row">
              <text class="lesson-name">{{ ep.title || '第 ' + (i + 1) + ' 课' }}</text>
              <text class="lesson-pending" v-if="!ep.video">课程待更新</text>
              <text class="lesson-lock" v-if="!isFreeCourse && ep.free === false && !isOwned">🔒</text>
            </view>
          </view>
        </view>
        <view class="lesson-more" v-if="!episodesList.length && course.lessons_count > 12">
          … 共 {{ course.lessons_count }} 课时
        </view>
      </view>
    </view>

    <!-- 底部购买 -->
    <view class="buy-bar">
      <template v-if="isOwned">
        <text class="buy-price owned">已购买</text>
        <view class="btn-fill btn-learn" @tap="startLearn">
          <text>开始学习</text>
        </view>
      </template>
      <template v-else>
        <view class="buy-left">
          <text class="buy-price">{{ fmtPrice(course.price) }}</text>
          <text class="buy-origin" v-if="!isFreePrice(course.price) && Number(course.ot_price) > 0">¥{{ course.ot_price }}</text>
        </view>
        <view class="btn-fill btn-buy" @tap="buyCourse">
          <text>{{ buying ? '购买中...' : (isFreePrice(course.price) ? '立即学习' : '立即购买') }}</text>
        </view>
      </template>
    </view>
  </template>

  <!-- 骨架屏: 数据未到位时立即渲染页面框架, 消除白屏等待 (2026-09-02 加载优化) -->
  <template v-else>
    <view class="cover sk-block sk-cover"></view>
    <view class="card">
      <view class="sk-line sk-w40 sk-h40"></view>
      <view class="sk-row">
        <view class="sk-avatar sk-block"></view>
        <view class="sk-line sk-w50"></view>
      </view>
    </view>
    <view class="card">
      <view class="sk-line sk-w30 sk-bold"></view>
      <view class="sk-line sk-w100"></view>
      <view class="sk-line sk-w90"></view>
      <view class="sk-line sk-w60"></view>
    </view>
    <view class="card">
      <view class="sk-line sk-w30 sk-bold"></view>
      <view class="sk-row sk-lesson" v-for="i in 5" :key="i">
        <view class="sk-idx sk-block"></view>
        <view class="sk-line sk-w70"></view>
      </view>
    </view>
  </template>
</view>
</template>

<script setup>
const LV_CLS = {'入门':'basic','进阶':'inter','高级':'senior','庙':'miao','旺':'wang','得':'de','利':'li','平':'ping','不':'bu','陷':'xian'}
const lvCls = (v) => LV_CLS[v] || v

import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourse, teacherInfo, getMyCourses, updateCourseProgress } from '../../api/api'
import { useUserStore } from '../../store/index'
import { isFreePrice, fmtPrice } from '../../utils/price'
import { getCourseCache, setCourseCache } from '../../utils/courseCache'

const userStore = useUserStore()
const course = ref(null)
const showTeacherPanel = ref(false)
const teacherInfoData = ref({})

/* 课程大纲: 后台上传的课时(episodes), 无则用课时数生成占位; 点击进入小节页播放 */
const episodesList = computed(() => (Array.isArray(course.value && course.value.episodes) && course.value.episodes.length ? course.value.episodes : []))
const outlineList = computed(() => {
  const eps = episodesList.value
  if (eps.length) return eps
  const n = Math.min(course.value && course.value.lessons_count || 0, 12)
  return Array.from({ length: n }, (_, i) => ({ title: i === 0 ? '课程导论' : '主题精讲 ' + (i + 1), video: '' }))
})
function openLesson(i) {
  const ep = outlineList.value[i]
  if (!ep || !ep.video) {
    uni.showToast({ title: '课程待更新', icon: 'none' })
    return
  }
  // 付费课时: 未购买则引导购买 (购买后全部课时开放; 课程免费则全部开放)
  if (!isFreeCourse.value && ep.free === false && !isOwned.value) {
    uni.showModal({
      title: '付费课时',
      content: '该课时为付费内容，购买课程后即可观看全部课时',
      confirmText: '去购买',
      cancelText: '取消',
      success: (r) => {
        if (r.confirm) buyCourse()
      },
    })
    return
  }
  // 上报学习进度: 记录已打开的章节 (进度 = 已打开章节数/总章节数)
  if (userStore.isLoggedIn && userStore.userInfo.uid) {
    const total = episodesList.value.length || course.value.lessons_count || outlineList.value.length
    updateCourseProgress({ uid: userStore.userInfo.uid, course_id: course.value.id, lesson_idx: i, total_lessons: total }).catch(() => {})
  }
  // 带上已购状态: 播放页可据此立即开播, 无需再等一次 getMyCourses(仅 UI 提速, 播放页仍会用真实状态校正)
  uni.navigateTo({ url: `/pages-sub/course/lesson?course_id=${course.value.id}&index=${i}&owned=${isOwned.value ? 1 : 0}` })
}
async function showTeacher() {
  try {
    const info = await teacherInfo({ teacher: course.value.teacher })
    teacherInfoData.value = info || {}
    showTeacherPanel.value = true
  } catch (e) {
    uni.showToast({ title: '获取老师简介失败', icon: 'none' })
  }
}
const owned = ref(false)
const buying = ref(false)

const isOwned = computed(() => owned.value)
/* 课程免费 (价格 0 或 "免费") → 所有课时不上锁 */
const isFreeCourse = computed(() => isFreePrice(course.value && course.value.price))

onLoad(async (options) => {
  const cid = options.id
  /* 优化1: 先用内存缓存立即渲染(从列表页进入/播放页返回时几乎零等待), 再后台刷新最新数据 */
  const cached = getCourseCache(cid)
  if (cached) {
    course.value = cached
    uni.setNavigationBarTitle({ title: cached.title })
  }
  /* 优化2: 课程详情 与 已购状态 并行请求 (原为串行 await, 耗时叠加) */
  const mineP = userStore.isLoggedIn
    ? getMyCourses({ uid: userStore.userInfo.uid }).catch(() => null)
    : Promise.resolve(null)
  try {
    const c = await getCourse(cid)
    if (c) {
      course.value = c
      setCourseCache(c) // 回填缓存, 供播放页/下次进入直接复用
      uni.setNavigationBarTitle({ title: c.title })
    }
  } catch (e) { /* 失败时保留缓存或骨架屏, 不打断页面 */ }
  const mine = await mineP
  if (mine && course.value) {
    owned.value = (mine || []).some((c) => c.id === course.value.id)
  }
})

async function buyCourse() {
  if (buying.value) return
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再购买', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  // 免费课程: 直接开始学习 (跳转第一个有视频的课时)
  if (isFreeCourse.value) {
    const eps = episodesList.value.length ? episodesList.value : outlineList.value
    const firstVideoIdx = eps.findIndex((e) => e.video)
    uni.navigateTo({ url: `/pages-sub/course/lesson?course_id=${course.value.id}&index=${firstVideoIdx >= 0 ? firstVideoIdx : 0}` })
    return
  }
  // 课程购买: 跳转结算页走订单+微信支付 (支付成功后自动发放课程)
  uni.navigateTo({ url: '/pages-sub/checkout/checkout?course_id=' + course.value.id })
}

function startLearn() {
  uni.navigateTo({ url: '/pages-sub/course/my' })
}
</script>

<style lang="scss" scoped>
.cd-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 140rpx;
}
/* ===== 骨架屏 (数据未到位时先出框架, 消除白屏) ===== */
.sk-block,
.sk-line {
  background: linear-gradient(90deg, #efe9e0 25%, #f7f3ec 37%, #efe9e0 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.2s ease-in-out infinite;
  border-radius: 8rpx;
}
@keyframes sk-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
.sk-line {
  height: 26rpx;
  margin: 18rpx 0;
  width: 80%;
}
.sk-cover { height: 420rpx; border-radius: 0; }
.sk-row { display: flex; align-items: center; gap: 18rpx; }
.sk-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0; }
.sk-idx { width: 48rpx; height: 48rpx; border-radius: 10rpx; flex-shrink: 0; }
.sk-lesson { margin: 22rpx 0; }
.sk-lesson .sk-line { flex: 1; margin: 0; }
.sk-w30 { width: 30%; }
.sk-w40 { width: 40%; }
.sk-w50 { width: 50%; }
.sk-w60 { width: 60%; }
.sk-w70 { width: 70%; }
.sk-w90 { width: 90%; }
.sk-w100 { width: 100%; }
.sk-h40 { height: 40rpx; }
.sk-bold { height: 32rpx; }

.cover {
  position: relative;
  height: 420rpx;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-level {
  position: absolute;
  left: 24rpx;
  top: 24rpx;
  padding: 6rpx 22rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #fffafa;
}
.lv-basic { background: #6e7f5a; }
.lv-inter { background: #c41e3a; }
.lv-senior { background: #9c1630; }
.cover-title {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  font-size: 36rpx;
  font-weight: 500;
  color: #fffafa;
  text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.5);
}

.card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 26rpx;
  margin: 20rpx 24rpx 0;
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
.students {
  margin-left: auto;
  font-size: 22rpx;
  color: #55524c;
}
.teacher-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #e8e2da;
}
.teacher-info {
  margin-left: 20rpx;
}
.ti-intro {
  font-size: 26rpx;
  line-height: 1.7;
  color: #2a2a2a;
  padding: 16rpx 4rpx;
}
.ti-courses {
  margin: 10rpx 0 24rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e8e2da;
}
.ti-courses-label {
  display: block;
  font-size: 26rpx;
  color: #c41e3a;
  font-weight: 500;
  margin-bottom: 10rpx;
}
.ti-course {
  display: block;
  font-size: 24rpx;
  color: #55524c;
  line-height: 1.8;
}
.ti-close {
  display: flex;
  margin: 0 auto;
  width: 320rpx;
  justify-content: center;
}
.teacher-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.teacher-sub {
  display: block;
  font-size: 20rpx;
  color: #55524c;
  margin-top: 4rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
  margin-bottom: 16rpx;
}
.desc {
  font-size: 26rpx;
  color: #55524c;
  line-height: 1.7;
}
.outline {
  margin-top: 24rpx;
  border-top: 1rpx solid #e8e2da;
  padding-top: 10rpx;
}
.lesson {
  display: flex;
  align-items: center; /* 课时名与左侧序号块垂直居中对齐 (2026-09-02: 原 flex-start 导致名称偏上) */
  padding: 18rpx 0;
  border-bottom: 1rpx solid #e8e2da;
}
.lesson-idx {
  width: 48rpx;
  height: 48rpx;
  border-radius: 10rpx;
  background: #f8f5f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #c41e3a;
  flex-shrink: 0;
}
.lesson-main {
  flex: 1;
  margin-left: 16rpx;
  min-width: 0;
}
.lesson-name-row {
  display: flex;
  align-items: center;
}
.lesson-name {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #2a2a2a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.lesson-lock {
  font-size: 26rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}
/* 课时未上传视频标记: 贴着右侧的锁 */
.lesson-pending {
  font-size: 20rpx;
  color: #b0804a;
  background: #f7eddd;
  border-radius: 999rpx;
  padding: 2rpx 16rpx;
  flex-shrink: 0;
  margin-left: auto;
}
.lesson-more {
  text-align: center;
  padding: 20rpx;
  font-size: 22rpx;
  color: #8a857c;
}

/* 底部购买栏 (框效果) */
.buy-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fffafa;
  border-top: 2rpx solid #e8e2da;
  box-shadow: 0 -6rpx 20rpx rgba(78, 52, 32, 0.08);
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 10;
}
.buy-price {
  font-size: 40rpx;
  font-weight: 500;
  color: #9c1630;
}
.buy-left {
  display: flex;
  align-items: baseline;
}
.buy-origin {
  font-size: 22rpx;
  color: #8a857c;
  text-decoration: line-through;
  margin-left: 12rpx;
}
/* 立即购买: 实心按钮 + 与文字留出间距 */
.btn-fill {
  flex-shrink: 0;
  margin-left: 24rpx;
  height: 84rpx;
  padding: 0 56rpx;
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
.btn-buy {
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
.btn-learn {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .cd-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .cd-page {
    max-width: 1320px;
  }
}

</style>
