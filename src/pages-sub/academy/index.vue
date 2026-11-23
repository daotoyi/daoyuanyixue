<template>
  <view class="academy-page">
    <view class="ac-header">
      <view class="ac-deco">道</view>
      <view class="ac-headtxt">
        <text class="ac-title">研究院</text>
        <text class="ac-sub">师者引路 · 各擅其学</text>
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

    <view class="ac-foot">— 为学日益 · 为道日损 —</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourses } from '../../api/api'
import { ACADEMY_TEACHERS, coursesOfTeacher } from '../../config/phase2.js'
import { fmtPrice, isFreePrice } from '../../utils/price'

const teacherCards = ref(ACADEMY_TEACHERS.map((t) => ({ ...t, courses: [] })))
const loading = ref(true)

onLoad(async () => {
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
})

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
</style>
