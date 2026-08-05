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
        <u-avatar
          :text="userInfo.nickname ? userInfo.nickname[0] : '客'"
          size="110"
          bg-color="rgba(201,169,106,0.35)"
          color="#F0E6CD"
          shape="circle"
        ></u-avatar>
        <view class="user-meta">
          <template v-if="isLoggedIn">
            <view class="name-row">
              <text class="user-name">{{ userInfo.nickname }}</text>
              <view class="vip-badge" v-if="userInfo.vip_level">
                <text>VIP{{ userInfo.vip_level }}</text>
              </view>
            </view>
            <text class="user-id">道号 · {{ userInfo.invite_code || ('UID ' + userInfo.uid) }}</text>
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
      <view class="asset-item" @tap="showAsset('balance')">
        <text class="asset-num">¥{{ userInfo.balance || '0.00' }}</text>
        <text class="asset-label">余额</text>
      </view>
      <view class="asset-divider"></view>
      <view class="asset-item" @tap="showAsset('coupon')">
        <text class="asset-num">{{ couponCount }}</text>
        <text class="asset-label">优惠券</text>
      </view>
      <view class="asset-divider"></view>
      <view class="asset-item" @tap="showAsset('favorite')">
        <text class="asset-num">0</text>
        <text class="asset-label">收藏</text>
      </view>
      <view class="asset-divider"></view>
      <view class="asset-item" @tap="showAsset('footprint')">
        <text class="asset-num">0</text>
        <text class="asset-label">足迹</text>
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
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/index'
import { getCoupons } from '../../api/api'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)

const couponCount = ref(0)

const orderEntries = [
  { status: '待付款', label: '待付款', icon: '💰' },
  { status: '待发货', label: '待发货', icon: '📦' },
  { status: '待收货', label: '待收货', icon: '🚚' },
  { status: '已退款', label: '退款', icon: '↩' },
]

const isAdmin = computed(() => userInfo.value.role === 'admin')

const menuItems = [
  { key: 'my-course', label: '我的课程', icon: '📖' },
  { key: 'cart', label: '购物车', icon: '🛒' },
  { key: 'invite', label: '邀请有礼', icon: '🎁' },
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

function showAsset(type) {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function onMenu(m) {
  if (!isLoggedIn.value && m.key !== 'about') return goLogin()
  switch (m.key) {
    case 'my-course':
      uni.navigateTo({ url: '/pages/course/my' })
      break
    case 'cart':
      uni.navigateTo({ url: '/pages/cart/cart' })
      break
    case 'invite':
      uni.showModal({
        title: '我的邀请码',
        content: `邀请码：${userInfo.value.invite_code || 'DY8888'}\n邀请好友注册可得优惠券`,
        showCancel: false,
      })
      break
    case 'admin':
      uni.navigateTo({ url: '/pages/admin/dashboard' })
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
  try {
    const list = await getCoupons()
    couponCount.value = list.length
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
}
.entry-icon {
  font-size: 44rpx;
}
.entry-label {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #857563;
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
</style>
