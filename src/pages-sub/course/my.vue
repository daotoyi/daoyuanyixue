<template>
  <view class="my-course-page">
    <!-- 头部：标题 + 全部课程入口 -->
    <view class="mc-head">
      <text class="mc-head-title">我的课程</text>
      <view class="mc-head-right" @tap="goCourse">
        <text class="mc-head-link">全部课程</text>
        <text class="mc-head-arrow">›</text>
      </view>
    </view>

    <!-- 分类 tab (紧凑彩色 + 右上角数量) -->
    <view class="filter-bar">
      <view class="filter-inner">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="c-tab"
          :class="['ct-' + tab.key, { active: activeTab === tab.key }]"
          @tap="activeTab = tab.key"
        >
          <text class="ct-label">{{ tab.label }}</text>
          <view class="ct-badge"><text>{{ counts[tab.key] || 0 }}</text></view>
        </view>
      </view>
    </view>

    <!-- 课程列表 -->
    <scroll-view scroll-y class="mc-scroll">
      <view class="course-list" v-if="myCourses.length">
        <view class="mc-card" v-for="c in myCourses" :key="c.id" @tap="goDetail(c.id)">
          <image class="mc-cover" :src="c.cover" mode="aspectFill"></image>
          <view class="mc-body">
            <view class="mc-title-row">
              <text class="mc-title ellipsis-2">{{ c.title }}</text>
              <text class="mc-fav" :class="{ on: c._favorited }" @tap.stop="toggleFavorite(c)">{{ c._favorited ? '★' : '☆' }}</text>
            </view>
            <text class="mc-teacher">{{ c.teacher }}</text>
            <view class="mc-progress-row">
              <view class="mc-progress">
                <view class="mc-progress-inner" :style="{ width: c.progress + '%' }"></view>
              </view>
              <text class="mc-progress-text">{{ c.progress }}%</text>
            </view>
            <text class="mc-status-tag" v-if="c._status">{{ c._status }}</text>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <view class="empty-tip">暂无课程，快去学习吧</view>
        <view class="empty-btn">
          <view class="btn-p" @click="goCourse">去选课</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMyCourses, favoriteCourse } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()

const tabs = [
  { key: 'purchased', label: '已购课程' },
  { key: 'learning', label: '正在学习' },
  { key: 'done', label: '完成课程' },
  { key: 'fav', label: '收藏课程' },
]
const activeTab = ref('purchased')
const allCourses = ref([])

// 各分类数量
const counts = computed(() => {
  const list = allCourses.value
  return {
    purchased: list.length,
    learning: list.filter((c) => c._status === '学习中').length,
    done: list.filter((c) => c._status === '已完成').length,
    fav: list.filter((c) => c._favorited).length,
  }
})

// 当前 tab 列表
const myCourses = computed(() => {
  if (activeTab.value === 'learning') return allCourses.value.filter((c) => c._status === '学习中')
  if (activeTab.value === 'done') return allCourses.value.filter((c) => c._status === '已完成')
  if (activeTab.value === 'fav') return allCourses.value.filter((c) => c._favorited)
  return allCourses.value
})

async function load() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  try {
    allCourses.value = await getMyCourses({ uid: userStore.userInfo.uid })
  } catch (e) {
    allCourses.value = []
  }
}

onMounted(load)

// 支持 ?tab= 参数直达 (purchased/learning/done/fav)
onLoad((options) => {
  const t = options && options.tab
  if (t && tabs.some((x) => x.key === t)) activeTab.value = t
})

function goDetail(id) {
  uni.navigateTo({ url: `/pages-sub/course/detail?id=${id}` })
}

async function toggleFavorite(c) {
  await favoriteCourse({ uid: userStore.userInfo.uid, course_id: c.id, favorited: !c._favorited })
  c._favorited = !c._favorited
  uni.showToast({ title: c._favorited ? '已收藏' : '已取消收藏', icon: 'none' })
}

function goCourse() {
  uni.switchTab({ url: '/pages/course/course' })
}
</script>

<style lang="scss" scoped>
.my-course-page {
  min-height: 100vh;
  background: #f8f3ea;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
}
.mc-head-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #42372c;
}
.mc-head-right {
  display: flex;
  align-items: center;
}
.mc-head-link {
  font-size: 24rpx;
  color: #8c5a2b;
}
.mc-head-arrow {
  font-size: 28rpx;
  color: #8c5a2b;
  margin-left: 4rpx;
}

/* 分类 tab: 紧凑小按钮 + 固定彩色 + 右上角数字 */
.filter-bar {
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
  flex-shrink: 0;
}
.filter-inner {
  display: flex;
  padding: 16rpx 20rpx;
  gap: 14rpx;
}
.c-tab {
  position: relative;
  flex: 1;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid;
}
.ct-label {
  font-size: 20rpx;
  line-height: 1.3;
  text-align: center;
  max-width: 110rpx;
}
.ct-badge {
  position: absolute;
  right: -6rpx;
  top: -10rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #efe7d8;
}
.ct-badge text {
  font-size: 18rpx;
  color: #fefbf6;
  font-weight: 500;
}
/* 每个按钮固定颜色 */
.ct-purchased { border-color: #8c5a2b; background: #faf3e9; }
.ct-purchased .ct-label { color: #8c5a2b; }
.ct-purchased .ct-badge { background: #8c5a2b; }
.ct-purchased.active { background: #8c5a2b; }
.ct-purchased.active .ct-label { color: #fefbf6; }

.ct-learning { border-color: #b04a45; background: #faf3e9; }
.ct-learning .ct-label { color: #b04a45; }
.ct-learning .ct-badge { background: #b04a45; }
.ct-learning.active { background: #b04a45; }
.ct-learning.active .ct-label { color: #fefbf6; }

.ct-done { border-color: #6e7f5a; background: #faf3e9; }
.ct-done .ct-label { color: #6e7f5a; }
.ct-done .ct-badge { background: #6e7f5a; }
.ct-done.active { background: #6e7f5a; }
.ct-done.active .ct-label { color: #fefbf6; }

.ct-fav { border-color: #ba7517; background: #faf3e9; }
.ct-fav .ct-label { color: #ba7517; }
.ct-fav .ct-badge { background: #ba7517; }
.ct-fav.active { background: #ba7517; }
.ct-fav.active .ct-label { color: #fefbf6; }

/* 列表 */
.mc-scroll {
  flex: 1;
  height: calc(100vh - 220rpx);
}
.course-list {
  padding: 20rpx 24rpx;
}
.mc-card {
  display: flex;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.mc-cover {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  background: #f8f3ea;
  flex-shrink: 0;
}
.mc-body {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.mc-title-row {
  display: flex;
  align-items: flex-start;
}
.mc-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
  line-height: 1.4;
  flex: 1;
}
.mc-fav {
  font-size: 34rpx;
  color: #b3a595;
  padding-left: 12rpx;
}
.mc-fav.on {
  color: #c4a484;
}
.mc-teacher {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #857563;
}
.mc-progress-row {
  margin-top: auto;
  display: flex;
  align-items: center;
}
.mc-progress {
  flex: 1;
  height: 12rpx;
  background: #efe7d8;
  border-radius: 6rpx;
  overflow: hidden;
}
.mc-progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #c4a484, #8c5a2b);
  border-radius: 6rpx;
}
.mc-progress-text {
  margin-left: 14rpx;
  font-size: 22rpx;
  color: #8c5a2b;
}
.mc-status-tag {
  margin-top: 8rpx;
  align-self: flex-start;
  font-size: 20rpx;
  color: #6e7f5a;
  background: #f8f3ea;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
}

.empty {
  padding-top: 120rpx;
}
.empty-btn {
  width: 320rpx;
  margin: 40rpx auto 0;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .my-course-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .my-course-page {
    max-width: 1320px;
  }
}

</style>
