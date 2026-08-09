<template>
  <view class="home-page">
    <!-- 顶部品牌横幅 -->
    <view class="banner">
      <view class="banner-title">道元易学</view>
      <view class="banner-sub">观天道 · 明人事 · 致中和</view>
      <view class="banner-seal">
        <image class="seal-img" src="/static/logo.png" mode="aspectFit"></image>
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
    <scroll-view scroll-y class="feed-scroll" v-if="currentTab === 'recommend' || currentTab === 'follow'">
      <view class="feed" v-if="shownMoments.length">
        <view class="moment-card" v-for="m in shownMoments" :key="m.id">
          <view class="moment-head">
            <view class="avatar-circle" @tap.stop="goProfile(m)"><text>{{ m.user_name[0] }}</text></view>
            <view class="moment-user" @tap.stop="goProfile(m)">
              <text class="moment-name">{{ m.user_name }}</text>
              <text class="moment-time">{{ m.created_at }}</text>
            </view>
            <text
              v-if="userStore.isLoggedIn && m.user_id === userStore.userInfo.uid"
              class="moment-del"
              @tap.stop="deleteMoment(m)"
            >删除</text>
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
            <view class="act" @tap="toggleComments(m)">
              <text class="act-icon">💬</text>
              <text class="act-num">{{ m.comments }}</text>
            </view>
            <view class="act act-share">
              <text class="act-icon">↗</text>
              <text class="act-num">分享</text>
            </view>
          </view>

          <!-- 评论展开区 -->
          <view class="moment-comments" v-if="m._showComments">
            <view class="cmt-list" v-if="m._comments && m._comments.length">
              <view class="cmt-item" v-for="(c, ci) in m._comments" :key="ci">
                <text class="cmt-user">{{ c.user_name }}：</text>
                <text class="cmt-text">{{ c.content }}</text>
                <text class="cmt-time">{{ c.created_at }}</text>
              </view>
            </view>
            <view class="cmt-empty" v-else>暂无评论，来抢沙发～</view>
            <view class="cmt-input-row">
              <input
                class="cmt-input"
                v-model="m._cmtText"
                placeholder="友善评论，理性交流"
                maxlength="200"
                confirm-type="send"
                @confirm="submitComment(m)"
              />
              <view class="btn-p sm" @click="submitComment(m)">发表</view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <text class="empty-icon">📭</text>
        <text class="empty-tip">暂无动态</text>
      </view>

      <!-- 发布动态: 悬浮右下角 (后台可配置隐藏) -->
      <view class="fab-publish" v-if="homeShowPublish" @tap="goPublish">
        <text class="fab-icon">✎</text>
        <text class="fab-text">发布动态</text>
      </view>
    </scroll-view>

    <!-- 盘道频道 (线下排盘道活动) -->
    <scroll-view scroll-y class="feed-scroll" v-else-if="currentTab === 'pandao'">
      <view class="pandao-list">
        <view class="pandao-card" v-for="pd in pandaoList" :key="pd.id" @tap="goPandaoDetail(pd)">
          <view class="pandao-head">
            <text class="pandao-badge">{{ pd.day }}</text>
            <view class="pandao-info">
              <text class="pandao-title">{{ pd.title }}</text>
              <text class="pandao-time">🕐 {{ pd.day }} {{ pd.time }}</text>
              <text class="pandao-place">📍 {{ pd.place }}</text>
              <text class="pandao-desc">{{ pd.desc }}</text>
            </view>
          </view>
          <view class="pandao-foot">
            <text class="pandao-price">¥{{ pd.price }}</text>
            <view class="pandao-btn" :class="{ ok: pd._booked }" @tap.stop="bookPandao(pd)">
              <text>{{ pd._booked ? '已预约' : '报名预约' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="pandao-follow">
        <text class="pf-icon">📢</text>
        <view class="pf-info">
          <text class="pf-title">关注「真和盛」公众号</text>
          <text class="pf-desc">获取更多道学文章与盘道活动资讯</text>
        </view>
        <!-- 微信官方关注组件: 同主体+特定场景进入时显示, 点击直达公众号 -->
        <!-- #ifdef MP-WEIXIN -->
        <official-account class="pf-official"></official-account>
        <!-- #endif -->
        <view class="pf-btn" @tap="followGzh">
          <text>关注</text>
        </view>
      </view>
      <view class="empty" v-if="!pandaoList.length">
        <text class="empty-icon">☯️</text>
        <text class="empty-tip">暂无盘道活动</text>
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
                <view class="live-btn error" @tap="enterLive(l)"><text>进入直播间</text></view>
              </template>
              <template v-else-if="l.status === 'upcoming'">
                <view class="live-btn" :class="l._booked ? 'ok' : ''" @tap="bookLive(l)"><text>{{ l._booked ? '已预约' : '预约直播' }}</text></view>
              </template>
              <template v-else>
                <view class="live-btn plain" @tap="enterLive(l)"><text>看回放</text></view>
              </template>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-if="!liveList.length">
        <text class="empty-icon">📺</text>
        <text class="empty-tip">暂无直播</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMoments, getLiveStreams, bookLive as apiBookLive, getMyBookings, getComments, addComment, deleteOwnMoment, getPandaoList, pandaoBook, getPayConfig, momentLike, myLikes } from '../../api/api'
import { useUserStore } from '../../store/index'

// 默认只显示 推荐 + 盘道; 关注/直播 由后台首页管理开关控制 (默认隐藏)
const tabs = ref([
  { key: 'recommend', label: '推荐' },
  { key: 'pandao', label: '盘道' },
])

const currentTab = ref('recommend')
const momentList = ref([])
const liveList = ref([])
const pandaoList = ref([])
const homeShowPublish = ref(false) // 后台可配置: 首页是否显示发布动态按钮 (默认隐藏)

// 顶层声明 (模板中的 userStore.isLoggedIn 引用需要)
const userStore = useUserStore()

// 推荐=全部动态; 关注=精选(推荐)动态
const shownMoments = computed(() => {
  // 推荐=被推荐动态; 关注=我关注的人发的动态(暂用推荐精选); 未推荐的不显示在推荐页
  if (currentTab.value === 'recommend') return momentList.value.filter((m) => m.is_recommended)
  if (currentTab.value === 'follow') return momentList.value
  return momentList.value
})

function switchTab(key) {
  currentTab.value = key
  // 切到动态类 tab 时刷新数据 (后台推荐/审核后立即生效)
  if (key === 'recommend' || key === 'follow') {
    refreshMoments()
  }
}

/* 刷新动态列表 (推荐/关注共用) */
async function refreshMoments() {
  try {
    const [moments, likes] = await Promise.all([
      getMoments(),
      userStore.isLoggedIn ? myLikes({ uid: userStore.userInfo.uid }).catch(() => []) : Promise.resolve([]),
    ])
    const likedIds = new Set((likes || []).map((id) => Number(id)))
    momentList.value = moments.map((m) => ({ ...m, _liked: likedIds.has(Number(m.id)) }))
  } catch (e) {}
}

/* 盘道详情页 */
function goPandaoDetail(pd) {
  uni.navigateTo({ url: '/pages-sub/pandao/detail?id=' + pd.id })
}

/* 盘道报名: 创建预约订单 → 跳结算支付 */
async function bookPandao(pd) {
  if (pd._booked) return
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再报名', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  try {
    const res = await pandaoBook({ uid: userStore.userInfo.uid, session_id: pd.id })
    if (res && res.order_no) {
      uni.showToast({ title: '已创建预约订单，请完成支付', icon: 'none' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages-sub/order/detail?order_no=' + res.order_no })
      }, 800)
    }
  } catch (e) {
    uni.showToast({ title: e.message || '报名失败', icon: 'none' })
  }
}

/* 关注公众号: 复制微信号 zhenhesheng_com 引导微信内搜索关注 */
function followGzh() {
  uni.setClipboardData({
    data: 'zhenhesheng_com',
    success: () => {
      uni.showModal({
        title: '关注「真和盛」公众号',
        content: '微信号已复制：zhenhesheng_com\n请打开微信 → 搜索公众号「真和盛」或微信号 zhenhesheng_com 关注',
        showCancel: false,
      })
    },
  })
}

function statusText(s) {
  return { live: '直播中', upcoming: '未开始', ended: '已结束' }[s] || s
}

function previewImage(urls, index) {
  uni.previewImage({ urls, current: index })
}

function deleteMoment(m) {
  const userStore = useUserStore()
  uni.showModal({
    title: '删除动态',
    content: '确定删除这条动态吗？其评论也会一并删除',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteOwnMoment({ user_id: userStore.userInfo.uid, _id: m._id })
        uni.showToast({ title: '已删除', icon: 'none' })
        momentList.value = momentList.value.filter((x) => x._id !== m._id)
      } catch (e) {
        uni.showToast({ title: '删除失败: ' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

async function toggleComments(m) {
  m._showComments = !m._showComments
  if (m._showComments && !m._comments) {
    try {
      m._comments = await getComments({ moment_id: m.id }) || []
    } catch (e) {
      m._comments = []
    }
  }
}

async function submitComment(m) {
  const text = (m._cmtText || '').trim()
  if (!text) return uni.showToast({ title: '请输入评论内容', icon: 'none' })
  const userStore = useUserStore()
  try {
    await addComment({
      moment_id: m.id,
      content: text,
      user_id: userStore.isLoggedIn ? userStore.userInfo.uid : 0,
      user_name: userStore.isLoggedIn ? userStore.userInfo.nickname : '道友',
    })
    m._cmtText = ''
    m.comments = (m.comments || 0) + 1
    if (m._comments) m._comments.push({ user_name: userStore.isLoggedIn ? userStore.userInfo.nickname : '道友', content: text, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
    uni.showToast({ title: '评论成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '评论失败: ' + (e.message || ''), icon: 'none' })
  }
}

async function toggleLike(m) {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const prev = m._liked
  m._liked = !prev
  m.likes = Math.max(0, (m.likes || 0) + (m._liked ? 1 : -1))
  try {
    const res = await momentLike({ uid: userStore.userInfo.uid, moment_id: m.id })
    if (res.liked !== m._liked) {
      m._liked = res.liked
      m.likes = Math.max(0, (m.likes || 0) + (res.liked ? 1 : -1))
    }
  } catch (e) {
    m._liked = prev
    m.likes = Math.max(0, (m.likes || 0) - (m._liked ? 1 : -1))
    uni.showToast({ title: '点赞失败', icon: 'none' })
  }
}

/* 进入个人主页 (仅非官方号) */
function goProfile(m) {
  if (!m || !m.user_id) return
  uni.navigateTo({ url: '/pages-sub/user/profile?uid=' + m.user_id })
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

onShow(async () => {
  try {
    const [moments, lives, pandao, likes] = await Promise.all([
      getMoments(), getLiveStreams(), getPandaoList(),
      userStore.isLoggedIn ? myLikes({ uid: userStore.userInfo.uid }).catch(() => []) : Promise.resolve([]),
    ])
    const likedIds = new Set((likes || []).map((id) => Number(id)))
    momentList.value = moments.map((m) => ({ ...m, _liked: likedIds.has(Number(m.id)) }))
    liveList.value = lives.map((l) => ({ ...l, _booked: false }))
    pandaoList.value = (pandao || []).map((p) => ({ ...p, _booked: false }))
    // 后台配置: 首页入口显示开关 (发布动态/关注/直播, 默认全隐藏)
    try {
      const cfg = await getPayConfig()
      homeShowPublish.value = cfg.show_publish === true
      const want = []
      if (cfg.show_follow === true) want.push({ key: 'follow', label: '关注' })
      if (cfg.show_live === true) want.push({ key: 'live', label: '直播' })
      const has = (k) => tabs.value.some((t) => t.key === k)
      want.forEach((t) => { if (!has(t.key)) tabs.value.push(t) })
      // 当前 tab 被隐藏时切回推荐
      if (!tabs.value.some((t) => t.key === currentTab.value)) currentTab.value = 'recommend'
    } catch (e) {}
    // 已预约的盘道标记
    const userStore2 = useUserStore()
    if (userStore2.isLoggedIn) {
      try {
        const pdOrders = await getPandaoMine({ uid: userStore2.userInfo.uid })
        const booked = new Set(pdOrders.map((o) => o.session_id))
        pandaoList.value.forEach((p) => {
          if (booked.has(p.id)) p._booked = true
        })
      } catch (e2) {}
    }
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
.seal-img {
  width: 72rpx;
  height: 72rpx;
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
.avatar-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #efe7d8;
  color: #8c5a2b;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

.moment-del {
  margin-left: auto;
  font-size: 22rpx;
  color: #b04a45;
  padding: 6rpx 14rpx;
}
/* 评论展开区 */
.moment-comments {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
}
.cmt-list { max-height: 320rpx; overflow-y: auto; }
.cmt-item {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  font-size: 24rpx;
  line-height: 1.5;
  padding: 6rpx 0;
}
.cmt-user { color: #8c5a2b; font-weight: 500; }
.cmt-text { color: #42372c; }
.cmt-time { color: #b3a595; font-size: 20rpx; margin-left: 12rpx; }
.cmt-empty { color: #b3a595; font-size: 24rpx; padding: 10rpx 0; }
.cmt-input-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  gap: 12rpx;
}
.cmt-input {
  flex: 1;
  height: 60rpx;
  background: #fefbf6;
  border: 1rpx solid #e6dcca;
  border-radius: 30rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #42372c;
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

/* 盘道 */
.pandao-list {
  padding: 20rpx 24rpx;
}
.pandao-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.pandao-head {
  display: flex;
  gap: 20rpx;
}
.pandao-badge {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #8c5a2b, #b8860b);
  color: #fff;
  font-size: 26rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pandao-info {
  flex: 1;
}
.pandao-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3a2a18;
  display: block;
}
.pandao-time,
.pandao-place {
  display: block;
  font-size: 24rpx;
  color: #8b7355;
  margin-top: 8rpx;
}
.pandao-desc {
  display: block;
  font-size: 22rpx;
  color: #a08b6f;
  margin-top: 8rpx;
  line-height: 1.5;
}
.pandao-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0e8d8;
}
.pandao-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #c0392b;
}
.pandao-btn {
  background: #8c5a2b;
  color: #fff;
  font-size: 26rpx;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
}
.pandao-btn.ok {
  background: #95a5a6;
}

/* 盘道关注公众号 */
.pandao-follow {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: linear-gradient(135deg, #fdf6e8, #f8ecd6);
  border: 1rpx solid #efe0c0;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 20rpx;
}
.pf-icon {
  font-size: 40rpx;
}
.pf-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.pf-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #3a2a18;
}
.pf-desc {
  font-size: 22rpx;
  color: #8b7355;
}
.pf-btn {
  background: #c0392b;
  color: #fff;
  font-size: 26rpx;
  padding: 12rpx 30rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
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
.live-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #fefbf6;
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
.live-btn.ok { background: linear-gradient(135deg, #2e7d32, #1b5e20); }
.live-btn.plain {
  background: none;
  border: 1rpx solid #d8ccb8;
  color: #857563;
}
.live-btn text { font-size: 24rpx; }

.empty {
  padding-top: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon { font-size: 64rpx; }
.empty-tip { margin-top: 16rpx; font-size: 26rpx; color: #b3a595; }

/* PC 宽屏: 页面收拢居中 (H5 桌面浏览器生效, 手机/小程序窄屏不触发) */
@media screen and (min-width: 1025px) {
  .home-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
}
@media screen and (min-width: 1440px) {
  .home-page {
    max-width: 1320px;
  }
}

</style>
