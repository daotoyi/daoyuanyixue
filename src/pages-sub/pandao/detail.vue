<template>
  <view class="pd-page">
    <view class="pd-card" v-if="session">
      <view class="pd-badge-row">
        <text class="pd-badge">{{ session.day || '盘道' }}</text>
        <text class="pd-status" :class="'st-' + statusKey(session.status)">{{ session.status || '即将开始' }}</text>
      </view>
      <text class="pd-title">{{ session.title }}</text>
      <view class="pd-meta">
        <view class="pd-meta-item"><text class="pd-meta-icon">🕐</text><text>{{ session.day }} {{ session.time }}</text></view>
        <view class="pd-meta-item"><text class="pd-meta-icon">📍</text><text>{{ session.place }}</text></view>
        <view class="pd-meta-item"><text class="pd-meta-icon">💰</text><text class="pd-price">¥{{ session.price }}</text></view>
      </view>
    </view>

    <view class="pd-content" v-if="session">
      <text class="pd-content-title">活动介绍</text>
      <text class="pd-content-text">{{ session.content || session.desc || '暂无详细介绍' }}</text>
    </view>

    <view class="pd-book-bar" v-if="session">
      <!-- #ifdef MP-WEIXIN -->
      <button class="pd-share-btn" open-type="share"><text>分享</text></button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="pd-share-btn" @tap="shareH5"><text>分享</text></view>
      <!-- #endif -->
      <view class="pd-book-btn" :class="{ ok: session._booked }" @tap="bookNow">
        <text>{{ session._booked ? '已预约' : '报名预约 ¥' + session.price }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getPandaoDetail, pandaoBook, getPandaoMine } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const session = ref(null)

function statusKey(st) {
  return { '即将开始': 'upcoming', '进行中': 'live', '已结束': 'end' }[st] || 'upcoming'
}
const sessionId = ref(0)

// 微信分享: 分享给好友
onShareAppMessage(() => {
  return {
    title: (session.value ? session.value.title : '盘道活动') + ' · 真和盛',
    path: '/pages-sub/pandao/detail?id=' + sessionId.value,
    imageUrl: '',
  }
})

onLoad(async (options) => {
  sessionId.value = options.id ? Number(options.id) : 0
  if (!sessionId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  await loadDetail()
})

async function loadDetail() {
  try {
    const res = await getPandaoDetail({ id: sessionId.value })
    session.value = res || null
    if (session.value && userStore.isLoggedIn) {
      try {
        const mine = await getPandaoMine({ uid: userStore.userInfo.uid })
        session.value._booked = mine.some((o) => Number(o.session_id) === sessionId.value)
      } catch (e) {}
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

/* H5 分享: 复制链接 */
function shareH5() {
  const link = 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/#/pages-sub/pandao/detail?id=' + sessionId.value
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制，可发给好友', icon: 'none' }),
  })
}

async function bookNow() {
  if (!session.value || session.value._booked) return
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再报名', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  try {
    const res = await pandaoBook({ uid: userStore.userInfo.uid, session_id: sessionId.value })
    if (res && res.order_no) {
      uni.showToast({ title: '已创建预约订单，请完成支付', icon: 'none' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages-sub/order/detail?order_no=' + res.order_no })
      }, 800)
    }
  } catch (e) {
    uni.showToast({ title: e.message || '报名失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.pd-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 20rpx 24rpx 160rpx;
}
.pd-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 30rpx 24rpx;
}
.pd-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pd-badge {
  background: linear-gradient(135deg, #8c5a2b, #b8860b);
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}
.pd-status {
  font-size: 22rpx;
  color: #27ae60;
}
.pd-status.st-end {
  color: #95a5a6;
}
.pd-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #3a2a18;
  margin-top: 20rpx;
}
.pd-meta {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pd-meta-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #6b5a45;
}
.pd-meta-icon {
  font-size: 28rpx;
}
.pd-price {
  color: #c0392b;
  font-weight: bold;
  font-size: 30rpx;
}
.pd-content {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-top: 20rpx;
}
.pd-content-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #3a2a18;
  display: block;
  margin-bottom: 14rpx;
}
.pd-content-text {
  font-size: 26rpx;
  color: #6b5a45;
  line-height: 1.7;
  white-space: pre-wrap;
}
.pd-book-bar {
  display: flex;
  gap: 20rpx;
  align-items: center;
}
.pd-share-btn {
  flex-shrink: 0;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  background: #dff0d8;
  color: #4a7a3a;
  font-size: 26rpx;
  border: none;
}
.pd-share-btn::after {
  border: none;
}
.pd-book-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #f8f3ea;
}
.pd-book-btn {
  flex: 1;
  background: #8c5a2b;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  padding: 30rpx 20rpx;
  border-radius: 999rpx;
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.pd-book-btn.ok {
  background: #95a5a6;
}
</style>
