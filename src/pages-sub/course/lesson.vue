<template>
  <!-- 付费课时锁定态 (未购买) -->
  <view class="ls-page ls-locked" v-if="locked">
    <view class="ls-lock-icon">🔒</view>
    <text class="ls-lock-title">付费课时</text>
    <text class="ls-lock-desc">购买课程后即可观看全部课时</text>
    <view class="ls-btn ls-lock-btn" @tap="goBuy">去购买</view>
  </view>
  <view class="ls-page" v-else-if="lesson && !waitingOwned">
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
        :poster="course.cover || ''"
        autoplay
        controls
        object-fit="contain"
        :show-center-play-btn="true"
        :enable-progress-gesture="true"
      ></video>
    </view>
    <view class="ls-empty" v-else>
      <text>课程待更新</text>
    </view>

    <!-- 课时文本说明 (显示在视频下方) -->
    <view class="ls-note" v-if="lesson.text">
      <text class="ls-note-text">{{ lesson.text }}</text>
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
import { getCourseCache, setCourseCache } from '../../utils/courseCache'

const userStore = useUserStore()
const course = ref(null)
const index = ref(0)
const loaded = ref(false)
const owned = ref(false)
/* owned 是否已确定: 付费课时必须等它才能判定锁定; 从详情页跳转时由 URL 参数直接带入, 无需等待 */
const ownedReady = ref(false)
const lesson = computed(() => {
  const eps = Array.isArray(course.value && course.value.episodes) ? course.value.episodes : []
  return eps[index.value] || null
})
const episodes = computed(() => (Array.isArray(course.value && course.value.episodes) ? course.value.episodes : []))
const courseTitle = computed(() => (course.value && course.value.title) || '')
/* 付费课时且未购买 → 锁定 (购买后全部开放; 课程免费则全部开放) */
const isFreeCourse = computed(() => {
  const p = course.value && course.value.price
  const s = String(p ?? '').trim()
  if (s === '免费') return true
  const n = Number(s.replace(/[^\d.\-]/g, ''))
  return !isNaN(n) && n <= 0
})
/* 是否需要付费鉴权: 仅"付费课程 + 该课时非免费"才需要查已购状态 */
const needOwned = computed(() => !!lesson.value && !isFreeCourse.value && lesson.value.free === false)
/* 付费课时在已购状态确定前, 先显示加载态(不能提前露出付费视频) */
const waitingOwned = computed(() => needOwned.value && !ownedReady.value)
const locked = computed(() => loaded.value && needOwned.value && ownedReady.value && !owned.value)

onLoad(async (options) => {
  index.value = Number(options.index) || 0
  const cid = Number(options.course_id)

  /* 优化1: 先用详情页留下的缓存立即渲染(视频秒开), 再后台静默刷新最新数据 */
  const cached = getCourseCache(cid)
  if (cached) {
    course.value = cached
    loaded.value = true
    uni.setNavigationBarTitle({ title: cached.title })
  }

  /* 优化2: 详情页已完成已购判断, 通过 URL 参数带过来 → 不必等 getMyCourses 即可解锁
     (仅作 UI 提速, 下面仍会用真实已购状态校正, 防止手改参数绕过) */
  if (options.owned === '1') {
    owned.value = true
    ownedReady.value = true
  }

  /* 优化3: 课程详情 与 已购状态 并行请求, 不再串行叠加耗时 */
  const mineP = userStore.isLoggedIn
    ? getMyCourses({ uid: userStore.userInfo.uid }).catch(() => [])
    : Promise.resolve(null)

  try {
    const c = await getCourse(cid)
    if (!c) {
      if (!cached) uni.showToast({ title: '课程不存在', icon: 'none' })
    } else {
      course.value = c
      setCourseCache(c) // 回填缓存, 供下次进入/详情页复用
      uni.setNavigationBarTitle({ title: c.title })
    }
  } catch (e) {
    if (!cached) uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
  loaded.value = true

  // 真实已购状态校正(缓存/参数只是提速手段, 以此为准)
  const mine = await mineP
  if (mine) {
    const id = course.value && course.value.id
    owned.value = (mine || []).some((x) => x.id === id)
  }
  ownedReady.value = true
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
/* 课时文本说明: 视频下方 */
.ls-note {
  margin: 30rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: #fffcf5;
  border: 1rpx solid #f0e4d2;
  border-radius: 16rpx;
}
.ls-note-text {
  font-size: 26rpx;
  color: #3a2a18;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
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
