<template>
  <view class="home-page">
    <!-- 顶部品牌横幅 -->
    <view class="banner">
      <view class="banner-title">道元易学</view>
      <view class="banner-sub">观天道 · 明人事 · 致中和</view>
      <view class="banner-seal">
        <text class="seal-text">道</text>
      </view>
    </view>

    <!-- 子频道 Tab -->
    <view class="channel-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="channel-tab"
        :class="{ active: currentTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text>{{ tab.label }}</text>
        <view class="tab-line" v-if="currentTab === tab.key"></view>
      </view>
    </view>

    <!-- 推荐 / 关注: 动态流 -->
    <scroll-view scroll-y class="feed-scroll" v-if="currentTab !== 'live'">
      <view class="feed" v-if="momentList.length">
        <view class="moment-card" v-for="m in momentList" :key="m.id">
          <view class="moment-head">
            <u-avatar :text="m.user_name[0]" size="40" bg-color="#efe7d8" color="#8c5a2b" shape="circle"></u-avatar>
            <view class="moment-user">
              <text class="moment-name">{{ m.user_name }}</text>
              <text class="moment-time">{{ m.created_at }}</text>
            </view>
          </view>

          <view class="moment-content">{{ m.content }}</view>

          <view class="moment-images" v-if="m.images.length">
            <view
              class="moment-img-wrap"
              :class="'img-' + m.images.length"
              v-for="(img, i) in m.images"
              :key="i"
              @tap="previewImage(m.images, i)"
            >
              <image class="moment-img" :src="img" mode="aspectFill"></image>
            </view>
          </view>

          <view class="moment-actions">
            <view class="act" @tap="toggleLike(m)">
              <text class="act-icon" :class="{ liked: m._liked }">{{ m._liked ? '❤' : '🤍' }}</text>
              <text class="act-num">{{ m.likes }}</text>
            </view>
            <view class="act">
              <text class="act-icon">💬</text>
              <text class="act-num">{{ m.comments }}</text>
            </view>
            <view class="act act-share">
              <text class="act-icon">↗</text>
              <text class="act-num">分享</text>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <u-empty text="暂无动态" mode="list"></u-empty>
      </view>

      <!-- 发布动态: 悬浮右下角 -->
      <view class="fab-publish" @tap="goPublish">
        <text class="fab-icon">✎</text>
        <text class="fab-text">发布动态</text>
      </view>
    </scroll-view>

    <!-- 直播频道 -->
    <scroll-view scroll-y class="feed-scroll" v-else>
      <view class="live-list">
        <view class="live-card" v-for="l in liveList" :key="l.id">
          <view class="live-cover">
            <image class="live-img" :src="l.cover" mode="aspectFill"></image>
            <view class="live-status" :class="'st-' + l.status">
              {{ statusText(l.status) }}
            </view>
            <view class="live-viewers" v-if="l.viewers">
              <text class="eye">👁</text> {{ l.viewers }}
            </view>
          </view>

          <view class="live-body">
            <text class="live-title ellipsis-2">{{ l.title }}</text>
            <view class="live-meta">
              <text class="live-anchor">主播 · {{ l.anchor }}</text>
              <text class="live-time">{{ l.start_time }}</text>
            </view>

            <view class="live-actions">
              <template v-if="l.status === 'live'">
                <u-button type="error" text="进入直播间" shape="circle" size="small" @click="enterLive(l)"></u-button>
              </template>
              <template v-else-if="l.status === 'upcoming'">
                <u-button
                  :type="l._booked ? 'success' : 'primary'"
                  :text="l._booked ? '已预约' : '预约直播'"
                  shape="circle"
                  size="small"
                  plain
                  @click="bookLive(l)"
                ></u-button>
              </template>
              <template v-else>
                <u-button type="info" text="看回放" shape="circle" size="small" plain @click="enterLive(l)"></u-button>
              </template>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-if="!liveList.length">
        <u-empty text="暂无直播" mode="data"></u-empty>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMoments, getLiveStreams, bookLive as apiBookLive, getMyBookings } from '../../api/api'
import { useUserStore } from '../../store/index'

const tabs = [
  { key: 'recommend', label: '推荐' },
  { key: 'follow', label: '关注' },
  { key: 'live', label: '直播' },
]

const currentTab = ref('recommend')
const momentList = ref([])
const liveList = ref([])

function switchTab(key) {
  currentTab.value = key
}

function statusText(s) {
  return { live: '直播中', upcoming: '未开始', ended: '已结束' }[s] || s
}

function previewImage(urls, index) {
  uni.previewImage({ urls, current: index })
}

function toggleLike(m) {
  m._liked = !m._liked
  m.likes += m._liked ? 1 : -1
}

function goPublish() {
  uni.navigateTo({ url: '/pages-sub/moment/publish' })
}

async function bookLive(l) {
  if (l._booked) return
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再预约', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  try {
    await apiBookLive({ uid: userStore.userInfo.uid, live_id: l.id })
    l._booked = true
    uni.showToast({ title: '预约成功，开播前提醒', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '预约失败', icon: 'none' })
  }
}

function enterLive(l) {
  if (l.third_party_url) {
    // #ifdef H5
    window.open(l.third_party_url)
    // #endif
    // #ifndef H5
    uni.showModal({
      title: '直播',
      content: '正在跳转直播平台…',
      showCancel: false,
      success: () => {},
    })
    // #endif
  } else {
    uni.showToast({ title: '直播即将开放', icon: 'none' })
  }
}

onMounted(async () => {
  try {
    const [moments, lives] = await Promise.all([getMoments(), getLiveStreams()])
    momentList.value = moments.map((m) => ({ ...m, _liked: false }))
    liveList.value = lives.map((l) => ({ ...l, _booked: false }))
    // 已预约的直播标记
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      try {
        const bookings = await getMyBookings({ uid: userStore.userInfo.uid })
        const bookedIds = bookings.map((b) => b.id)
        liveList.value.forEach((l) => {
          if (bookedIds.includes(l.id)) l._booked = true
        })
      } catch (e) {
        /* 忽略 */
      }
    }
  } catch (e) {
    console.error('[Home] load failed', e)
  }
})
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: #f8f3ea;
}

/* 品牌横幅 */
.banner {
  position: relative;
  padding: 40rpx 40rpx 36rpx;
  background: linear-gradient(135deg, #4e3420 0%, #6e4a26 55%, #8c5a2b 100%);
}
.banner-title {
  font-size: 52rpx;
  font-weight: 500;
  color: #857563;
  letter-spacing: 8rpx;
}
.banner-sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(240, 230, 205, 0.65);
  letter-spacing: 4rpx;
}
.banner-seal {
  position: absolute;
  right: 44rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 88rpx;
  height: 88rpx;
  border: 2rpx solid #c4a484;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.12);
}
.seal-text {
  font-size: 48rpx;
  color: #c4a484;
}

/* 子频道 */
.channel-tabs {
  display: flex;
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
}
.channel-tab {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 24rpx 0 20rpx;
  font-size: 28rpx;
  color: #857563;
}
.channel-tab.active {
  color: #8c5a2b;
  font-weight: 500;
}
.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #8c5a2b;
}

/* 动态流 */
.feed-scroll {
  height: calc(100vh - 340rpx);
}
.feed {
  padding: 20rpx 24rpx;
}
.moment-card {
  background: #fefbf6;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #efe7d8;
}
.moment-head {
  display: flex;
  align-items: center;
}
.moment-user {
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.moment-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
}
.moment-time {
  font-size: 20rpx;
  color: #b3a595;
  margin-top: 4rpx;
}
.moment-content {
  margin: 20rpx 0;
  font-size: 28rpx;
  line-height: 1.7;
  color: #42372c;
}
.moment-images {
  display: flex;
  flex-wrap: wrap;
}
.moment-img-wrap {
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
}
.moment-img {
  width: 100%;
  height: 100%;
  display: block;
}
.img-1 { width: 100%; height: 360rpx; }
.img-2 { width: calc(50% - 10rpx); height: 220rpx; }
.img-3 { width: calc(33.3% - 10rpx); height: 200rpx; }
.moment-actions {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #efe7d8;
}
.act {
  display: flex;
  align-items: center;
  margin-right: 48rpx;
}
.act-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}
.act-icon.liked { color: #b04a45; }
.act-num {
  font-size: 24rpx;
  color: #857563;
}
.act-share {
  margin-left: auto;
  margin-right: 0;
}
/* 发布动态悬浮按钮 (右下角) */
.fab-publish {
  position: fixed;
  right: 28rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 30rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
  box-shadow: 0 8rpx 24rpx rgba(78, 52, 32, 0.35);
}
.fab-icon {
  font-size: 30rpx;
  color: #f0e6cd;
}
.fab-text {
  font-size: 26rpx;
  color: #fefbf6;
  font-weight: 500;
}

/* 直播 */
.live-list {
  padding: 20rpx 24rpx;
}
.live-card {
  background: #fefbf6;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  border: 1rpx solid #efe7d8;
}
.live-cover {
  position: relative;
  width: 100%;
  height: 340rpx;
}
.live-img {
  width: 100%;
  height: 100%;
}
.live-status {
  position: absolute;
  left: 20rpx;
  top: 20rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #fefbf6;
}
.st-live { background: #b04a45; }
.st-upcoming { background: #8c5a2b; }
.st-ended { background: #857563; }
.live-viewers {
  position: absolute;
  right: 20rpx;
  top: 20rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.eye { margin-right: 4rpx; }
.live-body {
  padding: 24rpx;
}
.live-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
  line-height: 1.5;
}
.live-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #857563;
}
.live-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
}

.empty {
  padding-top: 80rpx;
}
</style>
