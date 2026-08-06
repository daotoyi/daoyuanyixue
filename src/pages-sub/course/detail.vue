<template>
  <view class="cd-page" v-if="course">
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
      <view class="teacher-row">
        <u-avatar :text="course.teacher[0]" size="56" bg-color="#efe7d8" color="#8c5a2b" shape="circle"></u-avatar>
        <view class="teacher-info">
          <text class="teacher-name">{{ course.teacher }}</text>
          <text class="teacher-sub">课程讲师</text>
        </view>
      </view>
    </view>

    <!-- 课程介绍 -->
    <view class="card">
      <view class="card-title">课程介绍</view>
      <text class="desc">{{ course.description }}</text>
    </view>

    <!-- 课程大纲 (课时) -->
    <view class="card">
      <view class="card-title">课程大纲 · 共 {{ course.lessons_count }} 课时</view>
      <view class="outline">
        <view class="lesson" v-for="n in Math.min(course.lessons_count, 12)" :key="n">
          <view class="lesson-idx">{{ n < 10 ? '0' + n : n }}</view>
          <text class="lesson-name">第 {{ n }} 课 · {{ n === 1 ? '课程导论' : '主题精讲 ' + n }}</text>
          <text class="lesson-lock">🔒</text>
        </view>
        <view class="lesson-more" v-if="course.lessons_count > 12">
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
          <text class="buy-price">¥{{ course.price }}</text>
          <text class="buy-origin">¥{{ course.ot_price }}</text>
        </view>
        <view class="btn-fill btn-buy" @tap="buyCourse">
          <text>{{ buying ? '购买中...' : '立即购买' }}</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
const LV_CLS = {'入门':'basic','进阶':'inter','高级':'senior','庙':'miao','旺':'wang','得':'de','利':'li','平':'ping','不':'bu','陷':'xian'}
const lvCls = (v) => LV_CLS[v] || v

import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourse, buyCourse as apiBuyCourse, getMyCourses } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const course = ref(null)
const owned = ref(false)
const buying = ref(false)

const isOwned = computed(() => owned.value)

onLoad(async (options) => {
  course.value = await getCourse(options.id)
  if (course.value) {
    uni.setNavigationBarTitle({ title: course.value.title })
  }
  // 检查是否已购
  if (userStore.isLoggedIn) {
    try {
      const mine = await getMyCourses({ uid: userStore.userInfo.uid })
      owned.value = mine.some((c) => c.id === course.value.id)
    } catch (e) {
      /* 忽略 */
    }
  }
})

async function buyCourse() {
  if (buying.value) return
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再购买', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  uni.showModal({
    title: '购买课程',
    content: `确认购买「${course.value.title}」？\n价格 ¥${course.value.price}（模拟支付）`,
    success: async (res) => {
      if (!res.confirm) return
      buying.value = true
      try {
        await apiBuyCourse({ uid: userStore.userInfo.uid, course_id: course.value.id })
        owned.value = true
        uni.showToast({ title: '购买成功，已加入我的课程', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '购买失败', icon: 'none' })
      } finally {
        buying.value = false
      }
    },
  })
}

function startLearn() {
  uni.navigateTo({ url: '/pages-sub/course/my' })
}
</script>

<style lang="scss" scoped>
.cd-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding-bottom: 140rpx;
}

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
  color: #fefbf6;
}
.lv-basic { background: #6e7f5a; }
.lv-inter { background: #8c5a2b; }
.lv-senior { background: #b04a45; }
.cover-title {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  font-size: 36rpx;
  font-weight: 500;
  color: #fefbf6;
  text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.5);
}

.card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
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
  color: #b04a45;
}
.otprice {
  font-size: 24rpx;
  color: #b3a595;
  text-decoration: line-through;
  margin-left: 14rpx;
}
.students {
  margin-left: auto;
  font-size: 22rpx;
  color: #857563;
}
.teacher-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #efe7d8;
}
.teacher-info {
  margin-left: 20rpx;
}
.teacher-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
}
.teacher-sub {
  display: block;
  font-size: 20rpx;
  color: #857563;
  margin-top: 4rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
  margin-bottom: 16rpx;
}
.desc {
  font-size: 26rpx;
  color: #857563;
  line-height: 1.7;
}
.outline {
  margin-top: 24rpx;
  border-top: 1rpx solid #efe7d8;
  padding-top: 10rpx;
}
.lesson {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #efe7d8;
}
.lesson-idx {
  width: 48rpx;
  height: 48rpx;
  border-radius: 10rpx;
  background: #f8f3ea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #8c5a2b;
}
.lesson-name {
  flex: 1;
  margin-left: 16rpx;
  font-size: 26rpx;
  color: #42372c;
}
.lesson-lock {
  font-size: 26rpx;
}
.lesson-more {
  text-align: center;
  padding: 20rpx;
  font-size: 22rpx;
  color: #b3a595;
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
  background: #fefbf6;
  border-top: 2rpx solid #efe7d8;
  box-shadow: 0 -6rpx 20rpx rgba(78, 52, 32, 0.08);
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 10;
}
.buy-price {
  font-size: 40rpx;
  font-weight: 500;
  color: #b04a45;
}
.buy-left {
  display: flex;
  align-items: baseline;
}
.buy-origin {
  font-size: 22rpx;
  color: #b3a595;
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
  color: #fefbf6;
  letter-spacing: 2rpx;
}
.btn-buy {
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
.btn-learn {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}
</style>
