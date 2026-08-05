<template>
  <view class="user-page">
    <!-- 用户头部 -->
    <view class="user-header">
      <view class="header-bg">
        <text class="bg-char">道</text>
      </view>
      <view class="setting-entry" @tap="goSetting">
        <text class="setting-icon">⚙</text>
      </view>
      <view class="user-main">
        <view class="avatar-wrap" @tap="isLoggedIn ? openProfile() : goLogin()">
          <image v-if="userInfo.avatar" class="user-avatar" :src="userInfo.avatar" mode="aspectFill"></image>
          <view v-else class="user-avatar avatar-fallback">
            <text>{{ userInfo.nickname ? userInfo.nickname[0] : '客' }}</text>
          </view>
          <view class="avatar-edit" v-if="isLoggedIn"><text>✎</text></view>
        </view>
        <view class="user-meta">
          <template v-if="isLoggedIn">
            <view class="name-row">
              <text class="user-name">{{ userInfo.nickname }}</text>
              <view class="vip-badge" v-if="userInfo.vip_level">
                <text>VIP{{ userInfo.vip_level }}</text>
              </view>
            </view>
            <text class="user-id" @tap.stop="copyDaoCode">道号 · {{ daoCode }}（点按复制）</text>
          </template>
          <template v-else>
            <text class="user-name" @tap="goLogin">点击登录</text>
            <text class="user-id">登录后解锁完整功能</text>
          </template>
        </view>
      </view>
    </view>

    <!-- 资产展示 -->
    <view class="asset-card">
      <view class="asset-item" @tap="goAssets('balance')">
        <text class="asset-num">¥{{ userInfo.balance || '0.00' }}</text>
        <text class="asset-label">余额</text>
      </view>
      <view class="asset-divider"></view>
      <view class="asset-item" @tap="goAssets('coupon')">
        <text class="asset-num">{{ assets.coupon_count }}</text>
        <text class="asset-label">优惠券</text>
      </view>
      <view class="asset-divider"></view>
      <view class="asset-item" @tap="goAssets('favorite')">
        <text class="asset-num">{{ assets.favorite_count }}</text>
        <text class="asset-label">收藏</text>
      </view>
      <view class="asset-divider"></view>
      <view class="asset-item" @tap="goAssets('footprint')">
        <text class="asset-num">{{ assets.footprint_count }}</text>
        <text class="asset-label">足迹</text>
      </view>
    </view>

    <!-- 我的课程 (位于我的订单上方) -->
    <view class="panel">
      <view class="panel-head" @tap="goMyCourse">
        <text class="panel-title">我的课程</text>
        <text class="panel-more">全部课程 ›</text>
      </view>
      <view class="order-entry course-entry">
        <view class="entry-item" v-for="c in courseEntries" :key="c.key" @tap="goMyCourse(c.key)">
          <text class="entry-icon">{{ c.icon }}</text>
          <text class="entry-label">{{ c.label }}</text>
          <text class="entry-badge" v-if="c.count">{{ c.count }}</text>
        </view>
      </view>
    </view>

    <!-- 订单入口 -->
    <view class="panel">
      <view class="panel-head" @tap="goOrders('全部')">
        <text class="panel-title">我的订单</text>
        <text class="panel-more">查看全部 ›</text>
      </view>
      <view class="order-entry">
        <view class="entry-item" v-for="o in orderEntries" :key="o.status" @tap="goOrders(o.status)">
          <text class="entry-icon">{{ o.icon }}</text>
          <text class="entry-label">{{ o.label }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="panel menu-panel">
      <view class="menu-item" v-for="m in visibleMenus" :key="m.key" @tap="onMenu(m)">
        <text class="menu-icon">{{ m.icon }}</text>
        <text class="menu-label">{{ m.label }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout" v-if="isLoggedIn">
      <u-button type="error" text="退出登录" shape="circle" plain @click="onLogout"></u-button>
    </view>

    <view class="version">道元易学 v1.0.0</view>

    <!-- 修改资料弹窗 -->
    <u-popup :show="showProfile" mode="bottom" @close="showProfile = false">
      <view class="form-sheet">
        <view class="sheet-title">修改资料</view>
        <view class="pf-avatar-row">
          <view
            v-for="a in presetAvatars"
            :key="a"
            class="pf-avatar"
            :class="{ on: profileForm.avatar === a }"
            @tap="profileForm.avatar = a"
          >
            <text>{{ a }}</text>
          </view>
        </view>
        <view class="f-row"><text class="f-label">昵称</text><input class="f-input" v-model="profileForm.nickname" maxlength="12" /></view>
        <view class="sheet-actions">
          <u-button type="info" text="取消" shape="circle" size="small" plain @click="showProfile = false"></u-button>
          <u-button type="primary" text="保存" shape="circle" size="small" @click="saveProfile"></u-button>
        </view>
      </view>
    </u-popup>

    <!-- 邀请有礼弹窗 -->
    <u-popup :show="showInvite" mode="bottom" @close="showInvite = false">
      <view class="form-sheet invite-sheet">
        <view class="sheet-title">邀请有礼</view>
        <view class="invite-code">{{ daoCode }}</view>
        <text class="invite-tip">好友通过你的专属链接注册，双方得 8 折优惠券</text>
        <view class="invite-link" @tap="copyInviteLink">
          <text class="invite-link-text">{{ inviteLink }}</text>
        </view>
        <view class="sheet-actions">
          <u-button type="primary" text="复制邀请链接" shape="circle" size="small" @click="copyInviteLink"></u-button>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/index'
import { getMyCoupons, getMyFavorites, getMyFootprints, userAssets, updateProfile } from '../../api/api'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)

const daoCode = computed(() => userInfo.value.dao_code || userInfo.value.invite_code || '')
const inviteLink = computed(() => `https://zhenhesheng-d6gkez7p221305432-1309518368.tcloudbaseapp.com/download/?invite=${daoCode.value}`)

const assets = ref({ coupon_count: 0, favorite_count: 0, footprint_count: 0 })
const courseCounts = ref({ purchased: 0, learning: 0, done: 0, fav: 0 })
const showProfile = ref(false)
const showInvite = ref(false)
const profileForm = ref({ nickname: '', avatar: '' })

const presetAvatars = ['易', '道', '玄', '禅', '和', '真']

const orderEntries = [
  { status: '待付款', label: '待付款', icon: '💰' },
  { status: '待发货', label: '待发货', icon: '📦' },
  { status: '待收货', label: '待收货', icon: '🚚' },
  { status: '已退款', label: '退款', icon: '↩' },
]

const courseEntries = [
  { key: 'purchased', label: '已购课程', icon: '📚', count: 0 },
  { key: 'learning', label: '正在学习', icon: '🎓', count: 0 },
  { key: 'done', label: '已完成', icon: '✅', count: 0 },
  { key: 'fav', label: '收藏课程', icon: '⭐', count: 0 },
]

const isAdmin = computed(() => userInfo.value.role === 'admin')

const menuItems = [
  { key: 'invite', label: '邀请有礼', icon: '🎁' },
  { key: 'cart', label: '购物车', icon: '🛒' },
  { key: 'feedback', label: '意见反馈', icon: '✉' },
  { key: 'about', label: '关于我们', icon: '☯' },
  { key: 'admin', label: '管理后台', icon: '⚙' },
]

const visibleMenus = computed(() =>
  menuItems.filter((m) => m.key !== 'admin' || isAdmin.value)
)

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function goSetting() {
  uni.navigateTo({ url: '/pages/setting/setting' })
}

function goOrders(status) {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: `/pages/order/list?status=${status}` })
}

function goMyCourse(tab) {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: `/pages/course/my?tab=${tab || ''}` })
}

function goAssets(type) {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: `/pages/user/assets?type=${type}` })
}

function copyDaoCode() {
  if (!daoCode.value) return
  uni.setClipboardData({
    data: daoCode.value,
    success: () => uni.showToast({ title: '道号已复制', icon: 'none' }),
  })
}

function openProfile() {
  profileForm.value = { nickname: userInfo.value.nickname || '', avatar: userInfo.value.avatar || '' }
  showProfile.value = true
}

async function saveProfile() {
  if (!profileForm.value.nickname.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  try {
    await updateProfile({ uid: userInfo.value.uid, nickname: profileForm.value.nickname, avatar: profileForm.value.avatar })
    userStore.setUserInfo({ nickname: profileForm.value.nickname, avatar: profileForm.value.avatar })
    showProfile.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

function copyInviteLink() {
  uni.setClipboardData({
    data: inviteLink.value,
    success: () => uni.showToast({ title: '邀请链接已复制', icon: 'success' }),
  })
}

function onMenu(m) {
  if (!isLoggedIn.value && m.key !== 'about') return goLogin()
  switch (m.key) {
    case 'invite':
      showInvite.value = true
      break
    case 'cart':
      uni.navigateTo({ url: '/pages/cart/cart' })
      break
    case 'admin':
      uni.navigateTo({ url: '/pages/admin/dashboard' })
      break
    case 'about':
      uni.navigateTo({ url: '/pages/setting/about' })
      break
    default:
      uni.showToast({ title: m.label + ' · 开发中', icon: 'none' })
  }
}

function onLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出', icon: 'none' })
      }
    },
  })
}

onMounted(async () => {
  if (!isLoggedIn.value) return
  try {
    const [a, coupons, favs, foots] = await Promise.all([
      userAssets({ uid: userInfo.value.uid }),
      getMyCoupons({ uid: userInfo.value.uid }),
      getMyFavorites({ uid: userInfo.value.uid }),
      getMyFootprints({ uid: userInfo.value.uid }),
    ])
    assets.value = a || { coupon_count: 0, favorite_count: 0, footprint_count: 0 }
    courseCounts.value = { purchased: 0, learning: 0, done: 0, fav: 0 }
    courseEntries[0].count = 0
  } catch (e) {
    /* 忽略 */
  }
})
</script>

<style lang="scss" scoped>
.user-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding-bottom: 60rpx;
}

/* 头部 */
.user-header {
  position: relative;
  padding: 70rpx 40rpx 60rpx;
  background: linear-gradient(160deg, #4e3420 0%, #6e4a26 60%, #8c5a2b 100%);
  overflow: hidden;
}
.header-bg {
  position: absolute;
  right: -20rpx;
  top: -40rpx;
}
.setting-entry {
  position: absolute;
  right: 36rpx;
  top: 44rpx;
  z-index: 5;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(254, 251, 246, 0.16);
  border: 1rpx solid rgba(254, 251, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.setting-icon {
  font-size: 34rpx;
  color: #fefbf6;
}
.bg-char {
  font-size: 320rpx;
  color: rgba(201, 169, 106, 0.12);
  font-family: 'STSong', 'SimSun', serif;
}
.user-main {
  position: relative;
  display: flex;
  align-items: center;
}
.avatar-wrap {
  position: relative;
}
.user-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(254, 251, 246, 0.5);
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.35);
  font-size: 52rpx;
  color: #f0e6cd;
}
.avatar-edit {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #8c5a2b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-edit text {
  font-size: 22rpx;
  color: #fefbf6;
}
.user-meta {
  margin-left: 30rpx;
}
.name-row {
  display: flex;
  align-items: center;
}
.user-name {
  font-size: 38rpx;
  font-weight: 500;
  color: #f0e6cd;
}
.vip-badge {
  margin-left: 16rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c4a484, #a8884c);
  font-size: 20rpx;
  color: #4e3420;
}
.user-id {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: rgba(240, 230, 205, 0.6);
}

/* 资产卡片 */
.asset-card {
  display: flex;
  align-items: center;
  margin: -30rpx 30rpx 0;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 30rpx 0;
  position: relative;
  z-index: 1;
}
.asset-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.asset-num {
  font-size: 32rpx;
  font-weight: 500;
  color: #4e3420;
}
.asset-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #857563;
}
.asset-divider {
  width: 1rpx;
  height: 48rpx;
  background: #efe7d8;
}

/* 面板 */
.panel {
  margin: 24rpx 30rpx 0;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 30rpx;
  border-bottom: 1rpx solid #f8f3ea;
}
.panel-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
}
.panel-more {
  font-size: 22rpx;
  color: #b3a595;
}

.order-entry {
  display: flex;
  padding: 24rpx 0;
}
.entry-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.entry-icon {
  font-size: 44rpx;
}
.entry-label {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #857563;
}
.entry-badge {
  position: absolute;
  right: 26rpx;
  top: -8rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #b04a45;
  color: #fefbf6;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.course-entry .entry-item {
  padding: 6rpx 0;
}

/* 菜单 */
.menu-panel {
  padding: 0 30rpx;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f8f3ea;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-icon {
  font-size: 38rpx;
  margin-right: 20rpx;
}
.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: #42372c;
}
.menu-arrow {
  font-size: 36rpx;
  color: #d8ccb8;
}

.logout {
  margin: 40rpx 60rpx 0;
}
.version {
  text-align: center;
  color: #c2b5a2;
  font-size: 22rpx;
  padding: 40rpx 0 0;
}

/* 弹窗 */
.form-sheet {
  padding: 30rpx 30rpx 60rpx;
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
  margin-bottom: 24rpx;
}
.pf-avatar-row {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  margin-bottom: 30rpx;
}
.pf-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f8f3ea;
  border: 3rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #8c5a2b;
}
.pf-avatar.on {
  border-color: #8c5a2b;
  background: #faf3e9;
}
.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.f-label {
  width: 140rpx;
  font-size: 24rpx;
  color: #857563;
  flex-shrink: 0;
}
.f-input {
  flex: 1;
  height: 76rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #42372c;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 30rpx;
}

/* 邀请弹窗 */
.invite-sheet {
  text-align: center;
}
.invite-code {
  font-size: 56rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
  color: #8c5a2b;
  margin: 10rpx 0 16rpx;
}
.invite-tip {
  display: block;
  font-size: 24rpx;
  color: #857563;
  margin-bottom: 20rpx;
}
.invite-link {
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 22rpx;
  color: #8c5a2b;
  word-break: break-all;
  margin-bottom: 10rpx;
}
</style>
