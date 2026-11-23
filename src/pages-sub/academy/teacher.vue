<template>
  <view class="td-page">
    <template v-if="teacher">
      <!-- 头部简介卡片（仿课程详情封面 + 简介卡） -->
      <view class="td-cover">
        <view class="tdc-deco">{{ teacher.avatar }}</view>
        <view class="tdc-info">
          <text class="tdc-name">{{ teacher.name }}</text>
          <text class="tdc-title">{{ teacher.title }}</text>
        </view>
      </view>

      <view class="card td-card">
        <view class="card-title">老师简介</view>
        <view class="td-tags">
          <text class="td-tag" v-for="(f, i) in teacher.fields" :key="i">{{ f }}</text>
        </view>
        <text class="td-intro">{{ teacher.intro }}</text>
      </view>

      <!-- 主讲课程：依据真实 courses.teacher 匹配的上架课程，点击进课程详情 -->
      <view class="card td-card">
        <view class="card-title">主讲课程 · {{ teacher.courses.length }} 门</view>
        <view class="course-list" v-if="teacher.courses.length">
          <view class="course-row" v-for="(c, i) in teacher.courses" :key="c._id || i" @tap="goCourse(c)">
            <image v-if="c.cover" lazy-load class="cr-cover" :src="c.cover" mode="aspectFill"></image>
            <view v-else class="cr-idx">{{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}</view>
            <view class="cr-main">
              <text class="cr-title ellipsis-1">{{ c.title }}</text>
              <text class="cr-sub">{{ fmtPrice(c.price) }} · 点击进入课程</text>
            </view>
            <text class="cr-go">›</text>
          </view>
        </view>
        <view class="cr-empty" v-else>
          <text>该老师暂无上架课程</text>
        </view>
      </view>

      <view class="td-foot">— 点击课程即可进入学习 —</view>
    </template>
    <view class="td-empty" v-else>
      <text class="empty-tip">未找到该老师</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourses } from '../../api/api'
import { ACADEMY_TEACHERS, coursesOfTeacher } from '../../config/phase2.js'
import { fmtPrice } from '../../utils/price'

const teacher = ref(null)

onLoad(async (options) => {
  const base = ACADEMY_TEACHERS.find((t) => t.id === options.id)
  if (!base) return
  teacher.value = { ...base, courses: [] }
  uni.setNavigationBarTitle({ title: base.name })
  try {
    const list = await getCourses()
    const courses = Array.isArray(list) ? list : (list && list.data) || []
    teacher.value.courses = coursesOfTeacher(courses, base.name)
  } catch (e) {
    console.warn('[teacher] 课程加载失败', e)
  }
})

function goCourse(c) {
  if (c._id || c.id) {
    uni.navigateTo({ url: `/pages-sub/course/detail?id=${c._id || c.id}` })
  }
}
</script>

<style lang="scss" scoped>
.td-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.td-cover { position: relative; overflow: hidden; display: flex; align-items: center; padding: 56rpx 32rpx; background: linear-gradient(135deg, #7a1220 0%, #a31930 100%); }
.tdc-deco { width: 140rpx; height: 140rpx; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); color: #fff; font-size: 68rpx; font-family: serif; margin-right: 28rpx; }
.tdc-info { display: flex; flex-direction: column; }
.tdc-name { font-size: 40rpx; font-weight: 500; color: #fff; }
.tdc-title { font-size: 24rpx; color: rgba(255,255,255,0.82); margin-top: 12rpx; }
.td-card { margin: 24rpx; padding: 28rpx; }
.card-title { font-size: 30rpx; font-weight: 500; color: #4a3b2a; margin-bottom: 20rpx; }
.td-tags { display: flex; flex-wrap: wrap; margin-bottom: 18rpx; }
.td-tag { font-size: 20rpx; color: #8c6b1f; background: #fbf3e2; border: 1rpx solid #e8d9b8; border-radius: 999rpx; padding: 4rpx 16rpx; margin: 0 12rpx 10rpx 0; }
.td-intro { font-size: 26rpx; color: #6a5d4c; line-height: 1.8; }
.course-list { display: flex; flex-direction: column; }
.course-row { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid var(--dy-line); }
.course-row:last-child { border-bottom: none; }
.cr-idx { width: 56rpx; height: 56rpx; flex-shrink: 0; border-radius: 12rpx; background: #fbe9ec; color: #a31930; display: flex; align-items: center; justify-content: center; font-size: 24rpx; margin-right: 20rpx; }
.cr-cover { width: 110rpx; height: 74rpx; flex-shrink: 0; border-radius: 10rpx; background: #f0e8dc; margin-right: 20rpx; }
.cr-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.cr-title { font-size: 28rpx; color: #4a3b2a; }
.cr-sub { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; }
.cr-go { font-size: 36rpx; color: #c9b8a4; margin-left: 12rpx; }
.cr-empty { text-align: center; padding: 40rpx 0; font-size: 24rpx; color: #b8a894; }
.td-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 36rpx; }
.td-empty { display: flex; justify-content: center; padding: 120rpx 0; }
</style>
