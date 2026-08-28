<template>
  <!-- 付费课时锁定态 (未购买) -->
  <view class="ls-page ls-locked" v-if="locked">
    <view class="ls-lock-icon">🔒</view>
    <text class="ls-lock-title">付费课时</text>
    <text class="ls-lock-desc">购买课程后即可观看全部课时</text>
    <view class="ls-btn ls-lock-btn" @tap="goBuy">去购买</view>
  </view>
  <view class="ls-page" v-else-if="lesson">
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
      <text>课程待更新</text>
    </view>

    <!-- 上一课 / 下一课 -->
    <view class="ls-nav">
      <view class="ls-btn" v-if="index > 0" @tap="go(index - 1)">‹ 上一课</view>
      <view class="ls-btn" v-if="index < episodes.length - 1" @tap="go(index + 1)">下一课 ›</view>
    </view>
  </view>
  <view class="ls-page ls-empty" v-else-if="loaded">
    <text>课程不存在或已下架</text>
  </view>
  <view class="ls-page ls-loading" v-else>
    <text>加载中...</text>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCourse, getMyCourses } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const course = ref(null)
const index = ref(0)
const loaded = ref(false)
const owned = ref(false)
const lesson = computed(() => {
  const eps = Array.isArray(course.value && course.value.episodes) ? course.value.episodes : []
  return eps[index.value] || null
})
const episodes = computed(() => (Array.isArray(course.value && course.value.episodes) ? course.value.episodes : []))
const courseTitle = computed(() => (course.value && course.value.title) || '')
/* 付费课时且未购买 → 锁定 (购买后全部开放) */
const locked = computed(() => loaded.value && !!lesson.value && lesson.value.free === false && !owned.value)

onLoad(async (options) => {
  index.value = Number(options.index) || 0
  try {
    course.value = await getCourse(Number(options.course_id))
    if (!course.value) {
      uni.showToast({ title: '课程不存在', icon: 'none' })
    } else {
      uni.setNavigationBarTitle({ title: course.value.title })
      // 已购判断
      if (userStore.isLoggedIn) {
        try {
          const mine = await getMyCourses({ uid: userStore.userInfo.uid })
          owned.value = mine.some((c) => c.id === course.value.id)
        } catch (e) { /* 忽略 */ }
      }
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
  loaded.value = true
})

function go(i) {
  index.value = i
  // 切换课时回到顶部
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}

/* 去购买: 跳课程详情 (含购买按钮) */
function goBuy() {
  uni.navigateTo({ url: `/pages-sub/course/detail?id=${course.value && course.value.id}` })
}
</script>

<style>
.ls-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 60rpx;
}
.ls-head {
  padding: 28rpx 24rpx 16rpx;
}
.ls-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #2a2a2a;
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
/* PC 宽屏: 视频默认铺满整个屏幕, 标题/导航半透明浮层叠加 */
@media screen and (min-width: 1025px) {
  .ls-page {
    position: relative;
    min-height: 100vh;
    background: #000;
    padding-bottom: 0;
  }
  .ls-head {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    padding: 28rpx 32rpx;
    background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0));
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .ls-title {
    color: #fff;
    text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4);
  }
  .ls-sub {
    color: rgba(255,255,255,0.75);
    margin-top: 0;
    margin-left: 24rpx;
  }
  .ls-video {
    margin: 0;
    border-radius: 0;
    height: 100vh;
    width: 100vw;
  }
  .ls-player {
    height: 100vh;
    width: 100vw;
  }
  .ls-nav {
    position: fixed;
    bottom: 40rpx;
    left: 32rpx;
    right: 32rpx;
    z-index: 10;
    margin: 0;
  }
}
.ls-empty {
  margin: 60rpx 24rpx 0;
  padding: 80rpx 0;
  background: #fffafa;
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
  background: #c41e3a;
  color: #fffafa;
  border-radius: 40rpx;
  font-size: 26rpx;
}
.ls-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a08c72;
}
/* 付费课时锁定态 */
.ls-locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
}
.ls-lock-icon {
  font-size: 90rpx;
}
.ls-lock-title {
  margin-top: 24rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #2a2a2a;
}
.ls-lock-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #a08c72;
}
.ls-lock-btn {
  margin-top: 40rpx;
  padding: 18rpx 80rpx;
}
</style>
