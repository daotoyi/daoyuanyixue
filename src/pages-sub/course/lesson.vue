<template>
  <view class="ls-page" v-if="lesson">
    <!-- 课时标题 -->
    <view class="ls-head">
      <text class="ls-title">{{ lesson.title || '第 ' + (index + 1) + ' 课' }}</text>
      <text class="ls-sub">{{ courseTitle }} · 第 {{ index + 1 }} 课 / 共 {{ episodes.length }} 课</text>
    </view>

    <!-- 视频播放器 -->
    <view class="ls-video" v-if="lesson.video">
      <video
        class="ls-player"
        :src="lesson.video"
        controls
        object-fit="contain"
        :show-center-play-btn="true"
        :enable-progress-gesture="true"
      ></video>
    </view>
    <view class="ls-empty" v-else>
      <text>本课时暂未上传视频，请稍后再来</text>
    </view>

    <!-- 上一课 / 下一课 -->
    <view class="ls-nav">
      <view class="ls-btn" v-if="index > 0" @tap="go(index - 1)">‹ 上一课</view>
      <view class="ls-btn" v-if="index < episodes.length - 1" @tap="go(index + 1)">下一课 ›</view>
    </view>
  </view>
  <view class="ls-page ls-loading" v-else>
    <text>加载中...</text>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourse } from '../../api/api'

const course = ref(null)
const index = ref(0)
const lesson = computed(() => {
  const eps = Array.isArray(course.value && course.value.episodes) ? course.value.episodes : []
  return eps[index.value] || null
})
const episodes = computed(() => (Array.isArray(course.value && course.value.episodes) ? course.value.episodes : []))
const courseTitle = computed(() => (course.value && course.value.title) || '')

onLoad(async (options) => {
  index.value = Number(options.index) || 0
  try {
    course.value = await getCourse({ id: Number(options.course_id) })
    if (!course.value) {
      uni.showToast({ title: '课程不存在', icon: 'none' })
    } else {
      uni.setNavigationBarTitle({ title: course.value.title })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

function go(i) {
  index.value = i
  // 切换课时回到顶部
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}
</script>

<style>
.ls-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding-bottom: 60rpx;
}
.ls-head {
  padding: 28rpx 24rpx 16rpx;
}
.ls-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #42372c;
}
.ls-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #a08c72;
}
.ls-video {
  margin: 12rpx 24rpx 0;
  border-radius: 16rpx;
  overflow: hidden;
  background: #000;
}
.ls-player {
  width: 100%;
  height: 420rpx;
}
.ls-empty {
  margin: 60rpx 24rpx 0;
  padding: 80rpx 0;
  background: #fefbf6;
  border: 1rpx dashed #d9c39a;
  border-radius: 16rpx;
  text-align: center;
  color: #a08c72;
  font-size: 26rpx;
}
.ls-nav {
  display: flex;
  justify-content: space-between;
  margin: 30rpx 24rpx 0;
}
.ls-btn {
  padding: 16rpx 40rpx;
  background: #8c5a2b;
  color: #fefbf6;
  border-radius: 40rpx;
  font-size: 26rpx;
}
.ls-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a08c72;
}
</style>
