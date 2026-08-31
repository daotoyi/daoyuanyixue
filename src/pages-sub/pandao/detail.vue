<template>
  <view class="pd-page">
    <view class="pd-card" v-if="session">
      <image class="pd-cover" v-if="session.cover" :src="session._coverUrl || session.cover" mode="aspectFill"></image>
      <view class="pd-badge-row">
        <text class="pd-badge">{{ session.day || '盘道' }}</text>
        <text class="pd-near" v-if="session._near">{{ session._near }}</text>
        <text class="pd-status" :class="'st-' + statusKey(session.status)">{{ session.status || '即将开始' }}</text>
      </view>
      <text class="pd-title">{{ session.title }}</text>
      <text class="pd-subtitle" v-if="session.desc">{{ session.desc }}</text>
      <view class="pd-meta">
        <view class="pd-meta-item"><text class="pd-meta-icon">🕐</text><text>{{ session.start_date || '' }} {{ session.day }} {{ session.time }}</text></view>
        <view class="pd-meta-item"><text class="pd-meta-icon">📍</text><text>{{ session.place }}</text></view>
        <view class="pd-meta-item"><text class="pd-meta-icon">💰</text><text class="pd-price" :class="{ 'pd-free': isFreePrice(session.price) }">{{ fmtPrice(session.price) }}</text></view>
      </view>
    </view>

    <!-- 已预约用户 (不论是否支付成功都展示; 点击头像进个人主页) -->
    <view class="pd-bookers" v-if="bookers.length">
      <view class="pd-bookers-head">
        <text class="pd-bookers-title">已预约 {{ bookers.length }} 人</text>
        <text class="pd-bookers-tip">点击头像查看主页</text>
      </view>
      <view class="pd-bookers-list">
        <view class="pd-booker" v-for="b in visibleBookers" :key="b.uid" @tap="openUserProfile(b)">
          <image class="pd-booker-avatar" v-if="b._avatarUrl" :src="b._avatarUrl" mode="aspectFill"></image>
          <view class="pd-booker-fb" v-else><text>{{ b.nickname ? b.nickname[0] : '?' }}</text></view>
        </view>
        <view
          class="pd-booker-more"
          v-if="bookers.length > MAX_BOOKER_AVATARS"
          @tap="showAllBookers = !showAllBookers"
        ><text>{{ showAllBookers ? '收起' : '+' + (bookers.length - MAX_BOOKER_AVATARS) }}</text></view>
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
        <text>{{ session._booked ? '已预约' : (isFreePrice(session.price) ? '免费报名' : '报名预约 ¥' + session.price) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getPandaoDetail, pandaoBook, pandaoCancel, getPandaoMine, getPandaoBookers } from '../../api/api'
import { useUserStore } from '../../store/index'
import { resolveCloudUrl } from '../../utils/avatar'
import { isFreePrice, fmtPrice } from '../../utils/price'

/* 盘道临近提醒: 按 start_date 计算 */
function nearLabel(p) {
  if (!p || !p.start_date) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(String(p.start_date).replace(/-/g, '/'))
  if (isNaN(d.getTime())) return ''
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff < 0) return ''
  if (diff === 0) return '今天开始'
  if (diff === 1) return '明天开始'
  if (diff <= 3) return diff + '天后开始'
  return ''
}

const userStore = useUserStore()
const session = ref(null)

function statusKey(st) {
  return { '即将开始': 'upcoming', '进行中': 'live', '已结束': 'end' }[st] || 'upcoming'
}
const sessionId = ref(0)

/* 已预约用户头像墙: 不论是否支付成功都展示, 点击头像进个人主页 (2026-08-31) */
const MAX_BOOKER_AVATARS = 10 // 最多显示个数, 超出折叠为 +N
const bookers = ref([])
const showAllBookers = ref(false)
const visibleBookers = computed(() =>
  showAllBookers.value ? bookers.value : bookers.value.slice(0, MAX_BOOKER_AVATARS)
)

async function loadBookers() {
  try {
    const res = await getPandaoBookers({ session_id: sessionId.value })
    const list = (res && res.bookers) || []
    // cloud:// 头像转可访问签名 URL (存储桶私有读, 直接渲染不显示)
    await Promise.all(list.map(async (b) => {
      if (b.avatar) b._avatarUrl = await resolveCloudUrl(b.avatar).catch(() => '')
    }))
    bookers.value = list
  } catch (e) {
    bookers.value = [] // 预约列表失败不影响详情页主内容
  }
}

function openUserProfile(b) {
  if (!b || !b.uid) return
  uni.navigateTo({ url: '/pages-sub/user/profile?uid=' + b.uid })
}

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
    if (session.value && session.value.cover) {
      session.value._coverUrl = await resolveCloudUrl(session.value.cover).catch(() => '')
    }
    if (session.value) session.value._near = nearLabel(session.value)
    if (session.value && userStore.isLoggedIn) {
      try {
        const mine = await getPandaoMine({ uid: userStore.userInfo.uid })
        session.value._booked = mine.some((o) => Number(o.session_id) === sessionId.value)
      } catch (e) {}
    }
    loadBookers() // 不 await: 头像墙加载慢/失败都不阻塞详情主内容
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

/* H5 分享: 复制链接 */
function shareH5() {
  const link = 'https://club.zhenhesheng.cn/h5/#/pages-sub/pandao/detail?id=' + sessionId.value
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制，可发给好友', icon: 'none' }),
  })
}

async function bookNow() {
  if (!session.value) return
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再报名', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  // 已预约 → 取消预约
  if (session.value._booked) {
    uni.showModal({
      title: '取消预约',
      content: '确定取消该场次的预约吗？',
      confirmText: '取消预约',
      confirmColor: '#9c1630',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await pandaoCancel({ uid: userStore.userInfo.uid, session_id: sessionId.value })
          session.value._booked = false
          uni.showToast({ title: '已取消预约', icon: 'success' })
          loadBookers()
        } catch (e) {
          uni.showToast({ title: (e && e.message) || '取消失败', icon: 'none' })
        }
      },
    })
    return
  }
  try {
    const res = await pandaoBook({ uid: userStore.userInfo.uid, session_id: sessionId.value })
    if (res && res.order_no) {
      if (res.free) {
        // 免费场次: 直接预约成功, 无需支付
        session.value._booked = true
        uni.showToast({ title: '预约成功', icon: 'success' })
        loadBookers()
      } else {
        uni.showToast({ title: '已创建预约订单，请完成支付', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages-sub/order/detail?order_no=' + res.order_no })
        }, 800)
      }
    }
  } catch (e) {
    uni.showToast({ title: e.message || '报名失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.pd-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding: 20rpx 24rpx 160rpx;
}
.pd-card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 30rpx 24rpx;
}
.pd-cover {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  background: #f8f5f0;
}
.pd-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pd-badge {
  background: linear-gradient(135deg, #c41e3a, #b8860b);
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}

.pd-near {
  font-size: 20rpx;
  color: #c0392b;
  background: #fdece8;
  padding: 4rpx 14rpx;
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
/* 说明 → 副标题 */
.pd-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8a857c;
  line-height: 1.5;
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
/* 已预约用户头像墙 (不论是否支付成功都展示) */
.pd-bookers {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
  margin-top: 20rpx;
}
.pd-bookers-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.pd-bookers-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #3a2a18;
}
.pd-bookers-tip {
  font-size: 22rpx;
  color: #a89f92;
}
.pd-bookers-list {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16rpx;
}
.pd-booker,
.pd-booker-more {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  overflow: hidden;
}
.pd-booker-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
}
/* 无头像时取昵称首字兜底 */
.pd-booker-fb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c41e3a, #b8860b);
  color: #fff;
  font-size: 30rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pd-booker-more {
  background: #f3efe8;
  border: 1rpx solid #e0d9cf;
  color: #8a857c;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pd-content {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
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
  justify-content: center;
}
.pd-share-btn {
  width: 220rpx;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  padding: 0;
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
  background: #f8f5f0;
  display: flex;
  gap: 20rpx;
  align-items: center;
  justify-content: center;
}
.pd-book-btn {
  width: 260rpx;
  background: #c41e3a;
  color: #fff;
  font-size: 26rpx;
  font-weight: bold;
  text-align: center;
  height: 76rpx;
  line-height: 76rpx;
  padding: 0;
  border-radius: 999rpx;
}
.pd-book-btn.ok {
  background: #95a5a6;
}
/* ===== PC 宽屏 =====
   注意: 必须放在所有 base 规则【之后】—— 同优先级下后面的规则才生效 (CSS 顺序铁律 08-27)。
   本块原位于 style 块最前面, 被其后的 base 规则覆盖 → PC 覆盖长期失效
   (封面仍是 300rpx 而非 16:9); 2026-08-31 统一后移到此处以真正生效。 */
@media screen and (min-width: 1025px) {
  /* 详情卡片限宽居中; 封面 16:9 协调比例 (避免左右太宽/上下太矮/图片裁切) */
  .pd-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 30px 24px 150px;
  }
  .pd-cover {
    height: auto;
    aspect-ratio: 16 / 9;
  }
  .pd-title {
    font-size: 32px;
  }
  .pd-meta-item {
    font-size: 17px;
  }
  .pd-content-title {
    font-size: 20px;
  }
  .pd-content-text {
    font-size: 17px;
  }
  .pd-book-bar {
    max-width: 860px;
    left: 50%;
    transform: translateX(-50%);
    right: auto;
    padding: 20px 24px calc(20px + env(safe-area-inset-bottom));
  }
  /* 头像墙: px 固定尺寸 (避免 rpx 在宽屏等比放大导致头像过大) */
  .pd-bookers-title {
    font-size: 20px;
  }
  .pd-bookers-tip {
    font-size: 14px;
  }
  .pd-bookers-list {
    gap: 12px;
  }
  .pd-booker,
  .pd-booker-more,
  .pd-booker-avatar,
  .pd-booker-fb {
    width: 44px;
    height: 44px;
  }
  .pd-booker-fb {
    font-size: 19px;
  }
  .pd-booker-more {
    font-size: 15px;
  }
}
</style>
