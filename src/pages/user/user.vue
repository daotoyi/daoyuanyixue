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
      <view class="msg-entry" @tap="goMessages">
        <text class="msg-icon">🔔</text>
        <text class="msg-dot" v-if="unreadCount > 0"></text>
      </view>
      <view class="home-entry" @tap="isLoggedIn ? openProfile() : goLogin()">
        <text class="home-icon">🏠</text>
        <text class="home-label">主页</text>
      </view>
      <view class="user-main">
        <view class="avatar-wrap" @tap="isLoggedIn ? openProfile() : goLogin()">
          <image v-if="displayAvatar" class="user-avatar" :src="displayAvatar" mode="aspectFill"></image>
          <view v-else class="user-avatar avatar-fallback">
            <text>{{ userInfo.nickname ? userInfo.nickname[0] : '客' }}</text>
          </view>
          <view class="avatar-edit" v-if="isLoggedIn" @tap.stop="editProfile()"><text>✎</text></view>
        </view>
        <view class="user-meta">
          <template v-if="isLoggedIn">
            <view class="name-row">
              <text class="user-name">{{ userInfo.nickname }}</text>
              <view class="vip-wrap">
                <view class="vip-badge" :class="'vip-' + vipLevel" @tap.stop="showVipTip">
                  <text>VIP{{ vipLevel }}</text>
                </view>
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
        <text class="asset-num">{{ userInfo.balance || '0' }}</text>
        <text class="asset-label">元宝</text>
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

    <!-- 玄学工具 (位于我的订单下方, 后台开关控制, 默认关闭) -->
    <view class="panel" v-if="showTools">
      <view class="panel-head" @tap="goTools('')">
        <text class="panel-title">玄学工具</text>
        <text class="panel-more">更多工具 ›</text>
      </view>
      <!-- 玄学工具横向滑动 (含排盘记录) -->
      <scroll-view scroll-x class="tool-scroll" :show-scrollbar="false">
        <view class="order-entry tool-entry">
          <view class="entry-item" v-for="t in toolEntries" :key="t.key" @tap="goTools(t.key)">
            <text class="entry-icon">{{ t.icon }}</text>
            <text class="entry-label">{{ t.label }}</text>
          </view>
          <!-- 排盘记录: 与其他工具一行, 可左右滑动 -->
          <view class="entry-item" @tap="goPaipanRecords">
            <text class="entry-icon">📜</text>
            <text class="entry-label">排盘记录</text>
          </view>
        </view>
      </scroll-view>
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
      <view class="logout-btn" @tap="onLogout"><text>退出登录</text></view>
    </view>

    <view class="version">道元易学 {{ APP_FULL_VERSION }}</view>

    <!-- 修改资料弹窗 -->
    <view class="popup-mask" v-if="showProfile" @tap="showProfile = false"></view>
    <view class="popup-sheet" v-if="showProfile">
      <view class="form-sheet">
        <view class="sheet-head">
          <text class="sheet-title">修改资料</text>
          <text class="sheet-close" @tap="showProfile = false">✕</text>
        </view>
        <view class="pf-avatar-row">
          <image v-if="profileForm.avatar" class="pf-avatar-img" :src="profileForm.avatar" mode="aspectFill"></image>
          <view v-else class="pf-avatar-img pf-avatar-fallback"><text>+</text></view>
          <view class="pf-pick" @tap="pickAvatar">
            <text>从相册选择</text>
          </view>
        </view>
        <view class="f-row"><text class="f-label">昵称</text><input class="f-input" v-model="profileForm.nickname" maxlength="12" /></view>
        <view class="sheet-actions">
          <view class="sheet-btn" @tap="showProfile = false"><text>取消</text></view>
          <view class="btn-fill btn-save" @tap="saveProfile">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请有礼弹窗 -->
    <view class="popup-mask" v-if="showInvite" @tap="showInvite = false"></view>
    <view class="popup-sheet" v-if="showInvite">
      <view class="form-sheet invite-sheet">
        <view class="sheet-head">
          <text class="sheet-title">邀请有礼</text>
          <text class="sheet-close" @tap="showInvite = false">✕</text>
        </view>
        <view class="invite-code">{{ daoCode }}</view>
        <text class="invite-tip">好友通过你的专属链接注册，双方得 8 折优惠券</text>
        <view class="invite-link" @tap="copyInviteLink">
          <text class="invite-link-text">{{ inviteLink }}</text>
        </view>
        <view class="btn-fill btn-invite" @tap="copyInviteLink">
          <text>复制邀请链接</text>
        </view>
      </view>
    </view>

    <!-- 会员等级说明弹窗 (每行一个等级) -->
    <view class="popup-mask" v-if="showVipSheet" @tap="showVipSheet = false"></view>
    <view class="popup-sheet" v-if="showVipSheet">
      <view class="form-sheet">
        <view class="sheet-head">
          <text class="sheet-title">会员等级说明</text>
          <text class="sheet-close" @tap="showVipSheet = false">✕</text>
        </view>
        <view class="vip-row" v-for="v in vipLevels" :key="v.level">
          <view class="vip-badge-lg" :class="'vip-' + v.level"><text>{{ v.label }}</text></view>
          <text class="vip-range">{{ v.range }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { resolveCloudUrl } from '../../utils/avatar'
import { useUserStore } from '../../store/index'
import { getMyCoupons, getMyFavorites, getMyFootprints, userAssets, updateProfile, getUnreadCount, getMyVip, userProfile, getPayConfig } from '../../api/api'
import { getStorage } from '../../api/cloudbase'
import { APP_FULL_VERSION } from '../../version'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)

const daoCode = computed(() => userInfo.value.dao_code || userInfo.value.invite_code || '')
const inviteLink = computed(() => `https://club.zhenhesheng.cn/download/?invite=${daoCode.value}`)

// 会员等级: 按累计消费 (储值/购买) 自动划分 (8档: <1000/1000/3000/5000/10000/30000/50000/100000)
const vipLevel = computed(() => {
  // 等级 = 累计消费 + 累计储值
  const total = (Number(userInfo.value.total_spent || 0) || 0) + (Number(userInfo.value.total_recharge || 0) || 0)
  if (total >= 100000) return 7
  if (total >= 50000) return 6
  if (total >= 30000) return 5
  if (total >= 10000) return 4
  if (total >= 5000) return 3
  if (total >= 3000) return 2
  if (total >= 1000) return 1
  return 0
})
/* 等级说明 (每行一个等级) */
const vipLevels = [
  { level: 0, label: 'VIP0', range: '累计消费/储值 1000元宝以下' },
  { level: 1, label: 'VIP1', range: '累计消费/储值 1000-3000元宝' },
  { level: 2, label: 'VIP2', range: '累计消费/储值 3000-5000元宝' },
  { level: 3, label: 'VIP3', range: '累计消费/储值 5000-10000元宝' },
  { level: 4, label: 'VIP4', range: '累计消费/储值 10000-30000元宝' },
  { level: 5, label: 'VIP5', range: '累计消费/储值 30000-50000元宝' },
  { level: 6, label: 'VIP6', range: '累计消费/储值 50000-100000元宝' },
  { level: 7, label: 'VIP7', range: '累计消费/储值 100000元宝以上' },
]

const assets = ref({ coupon_count: 0, favorite_count: 0, footprint_count: 0 })
const displayAvatar = ref("") // cloud:// 头像转可访问 URL (H5 渲染)
const courseCounts = ref({ purchased: 0, learning: 0, done: 0, fav: 0 })
const unreadCount = ref(0)
const showProfile = ref(false)
const showInvite = ref(false)
const showVipSheet = ref(false)
const uploading = ref(false)
const profileForm = ref({ nickname: '', avatar: '' })
const showTools = ref(false) // 玄学工具板块显示开关 (后台控制, 默认关闭)

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

const toolEntries = [
  { key: 'bazi', label: '四柱八字', icon: '☯️' },
  { key: 'qimen', label: '奇门遁甲', icon: '🧭' },
  { key: 'ziwei', label: '紫微斗数', icon: '🌟' },
  { key: 'liuren', label: '六壬', icon: '🌀' },
  { key: 'liuyao', label: '六爻', icon: '🪙' },
]

const isAdmin = computed(() => ['admin', 'manager', 'operator', 'viewer'].includes(userInfo.value.role))

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
  uni.navigateTo({ url: '/pages-sub/login/login' })
}

function goSetting() {
  uni.navigateTo({ url: '/pages-sub/setting/setting' })
}

function goOrders(status) {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: `/pages-sub/order/list?status=${status}` })
}

function goMyCourse(tab) {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: `/pages-sub/course/my?tab=${tab || ''}` })
}

function goTools(tool) {
  uni.navigateTo({ url: `/pages-sub/user/tools?tool=${tool || ''}` })
}

function goPaipanRecords() {
  uni.navigateTo({ url: `/pages-sub/user/paipan-records` })
}

function goAssets(type) {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: `/pages-sub/user/assets?type=${type}` })
}

function copyDaoCode() {
  if (!daoCode.value) return
  uni.setClipboardData({
    data: daoCode.value,
    success: () => uni.showToast({ title: '道号已复制', icon: 'none' }),
  })
}

function openProfile() {
  // 头像点击 → 个人主页 (含我的动态/关注/粉丝/收到的赞)
  uni.navigateTo({ url: '/pages-sub/user/profile?uid=' + (userInfo.value.uid || 0) })
}

function editProfile() {
  // avatar: 显示用 URL (云存储 fileID 需转换), avatarRaw: 入库用原始 fileID
  // 先置空 avatar 避免 cloud:// 短暂空白, 转换完成后回填
  profileForm.value = { nickname: userInfo.value.nickname || '', avatar: '', avatarRaw: userInfo.value.avatar || '' }
  if (userInfo.value.avatar) {
    resolveCloudUrl(userInfo.value.avatar).then((u) => { if (u) profileForm.value.avatar = u })
  }
  showProfile.value = true
}

function pickAvatar() {
  if (uploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uploading.value = true
      uni.showLoading({ title: '上传中...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = `avatars/u${userInfo.value.uid}_${Date.now()}.png`
        const upRes = await storage.uploadFile(filePath, cloudPath)
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        // 三端统一存 cloud:// fileID (私有桶铁律: 显示时由 resolveCloudUrl 转签名 URL)
        // 切勿去掉前缀存相对路径 / 切勿存 blob 本地路径 (跨端必失效)
        profileForm.value.avatarRaw = String(fileID)
        profileForm.value.avatar = await resolveCloudUrl(String(fileID)).catch(() => String(fileID))
      } catch (e) {
        // 上传失败: 不存本地临时路径 (blob 仅当前页面会话有效), 保留原头像
        uni.showToast({ title: (e && e.message) || '头像上传失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
        uploading.value = false
      }
    },
  })
}

async function saveProfile() {
  if (!profileForm.value.nickname.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  try {
    // 入库用 avatarRaw (cloud:// fileID); 未重新上传时 avatarRaw 保持原 fileID
    const avatarVal = profileForm.value.avatarRaw || ''
    await updateProfile({ uid: userInfo.value.uid, nickname: profileForm.value.nickname, avatar: avatarVal })
    userStore.setUserInfo({ nickname: profileForm.value.nickname, avatar: avatarVal })
    // 顶部头像即时刷新 (avatar 为转换后的显示 URL)
    if (profileForm.value.avatar) displayAvatar.value = profileForm.value.avatar
    showProfile.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

function goMessages() {
  if (!isLoggedIn.value) return goLogin()
  uni.navigateTo({ url: '/pages-sub/user/messages' })
}

function showVipTip() {
  showVipSheet.value = true
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
      uni.navigateTo({ url: '/pages-sub/cart/cart' })
      break
    case 'feedback':
      uni.navigateTo({ url: '/pages-sub/user/feedback' })
      break
    case 'admin':
      uni.navigateTo({ url: '/pages-sub/admin/dashboard' })
      break
    case 'about':
      uni.navigateTo({ url: '/pages-sub/setting/about' })
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

onShow(async () => {
  if (!isLoggedIn.value) return
  // 从后端刷新最新用户信息 (头像/道号以服务端为准, 避免本地缓存旧数据 H5 显示不一致)
  try {
    const fresh = await userProfile({ uid: userInfo.value.uid })
    if (fresh && fresh.user) {
      userStore.setUserInfo({
        // 昵称/简介等也以服务端为准 (后台改昵称后本地缓存需同步, 否则个人中心一直显示旧名)
        nickname: fresh.user.nickname || userInfo.value.nickname,
        avatar: fresh.user.avatar,
        dao_code: fresh.user.dao_code || userInfo.value.dao_code,
        invite_code: fresh.user.invite_code || userInfo.value.invite_code,
        balance: fresh.user.balance || userInfo.value.balance || '0',
        bio: fresh.user.bio || userInfo.value.bio || '',
      })
    }
  } catch (e) { /* 忽略, 用本地缓存 */ }
  // cloud:// 头像转可访问 URL (H5 渲染)
  if (userInfo.value.avatar) displayAvatar.value = await resolveCloudUrl(userInfo.value.avatar)
  try {
    const [a, coupons, favs, foots, unread, vip] = await Promise.all([
      userAssets({ uid: userInfo.value.uid }),
      getMyCoupons({ uid: userInfo.value.uid }),
      getMyFavorites({ uid: userInfo.value.uid }),
      getMyFootprints({ uid: userInfo.value.uid }),
      getUnreadCount({ uid: userInfo.value.uid }),
      getMyVip({ uid: userInfo.value.uid }),
    ])
    assets.value = a || { coupon_count: 0, favorite_count: 0, footprint_count: 0 }
    unreadCount.value = (unread && unread.count) || 0
    // 会员等级回写 (等级/消费/储值 同步, 颜色随等级变化)
    if (vip && vip.level !== undefined) {
      userStore.setUserInfo({
        vip_level: vip.level,
        total_spent: vip.total_spent,
        total_recharge: vip.total_recharge,
        total_amount: vip.total_amount,
      })
    }
  } catch (e) {
    /* 忽略 */
  }
  // 加载页面配置 (玄学工具开关等, 默认关闭)
  try {
    const cfg = await getPayConfig()
    showTools.value = cfg.show_tools === true
  } catch (e) { /* 默认关闭 */ }
})
</script>

<style lang="scss" scoped>
.user-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 60rpx;
}

/* 头部 */
.user-header {
  position: relative;
  padding: 48rpx 40rpx 40rpx;
  min-height: 160rpx;
  background: linear-gradient(160deg, #9c1630 0%, #6b1022 60%, #c41e3a 100%);
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
  top: 16rpx;
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
  color: #fffafa;
}
.home-entry {
  position: absolute;
  right: 200rpx;
  top: 16rpx;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 24rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: rgba(254, 251, 246, 0.16);
  border: 1rpx solid rgba(254, 251, 246, 0.3);
}
.home-icon {
  font-size: 26rpx;
}
.home-label {
  font-size: 24rpx;
  color: #fffafa;
}

.msg-entry {
  position: absolute;
  right: 116rpx;
  top: 16rpx;
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
.msg-icon {
  font-size: 32rpx;
}
.msg-dot {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #9c1630;
  border: 2rpx solid #9c1630;
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
  color: #55524c;
}
.avatar-edit {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-edit text {
  font-size: 22rpx;
  color: #fffafa;
}
.user-meta {
  margin-left: 30rpx;
  flex: 1;
  min-width: 0;
  padding-right: 60rpx;
}
.name-row {
  display: flex;
  align-items: center;
}
.user-name {
  font-size: 38rpx;
  font-weight: 500;
  color: #fffafa;
  max-width: 320rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.vip-badge {
  margin-left: 16rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: #9c1630;
}
.vip-wrap {
  position: relative;
  margin-left: 16rpx;
}
.vip-0 { background: #55524c; }
.vip-1 { background: linear-gradient(135deg, #d4a94b, #6b1022); }
.vip-2 { background: linear-gradient(135deg, #d4a84c, #b07a2a); }
.vip-3 { background: linear-gradient(135deg, #c9a9a9, #9c6b6b); }
.vip-4 { background: linear-gradient(135deg, #d8b84c, #a8822a); }
.vip-5 { background: linear-gradient(135deg, #9c1630, #6b1022); }
.vip-6 { background: linear-gradient(135deg, #9c1630, #6b1022); }
.vip-7 { background: linear-gradient(135deg, #6b1022, #9c1630); box-shadow: 0 0 12rpx rgba(140, 109, 63, 0.5); }
/* 等级说明弹窗 */
.vip-tip { display: block; text-align: center; font-size: 26rpx; color: #5f4c3a; margin-bottom: 20rpx; font-weight: 500; }
.vip-row {
  display: flex;
  align-items: center;
  background: #f8f5f0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
}
.vip-badge-lg {
  width: 110rpx;
  padding: 6rpx 0;
  border-radius: 999rpx;
  text-align: center;
  flex-shrink: 0;
}
.vip-badge-lg text { font-size: 24rpx; font-weight: 600; color: #fffafa; }
.vip-range { flex: 1; margin-left: 20rpx; font-size: 24rpx; color: #2a2a2a; }
.vip-tip {
  margin-left: 14rpx;
  font-size: 20rpx;
  color: rgba(240, 230, 205, 0.55);
  text-decoration: underline;
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
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
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
  color: #9c1630;
}
.asset-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #55524c;
}
.asset-divider {
  width: 1rpx;
  height: 48rpx;
  background: #e8e2da;
}

/* 面板 */
.panel {
  margin: 24rpx 30rpx 0;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 30rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.panel-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.panel-more {
  font-size: 22rpx;
  color: #8a857c;
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
  line-height: 1.2;
}
.entry-label {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #55524c;
}
.entry-badge {
  position: absolute;
  right: 26rpx;
  top: -8rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #9c1630;
  color: #fffafa;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 玄学工具横向滑动 (排盘记录与其他工具一行) */
.tool-scroll {
  white-space: nowrap;
}
.tool-scroll .order-entry {
  display: inline-flex;
  padding-right: 20rpx;
  white-space: nowrap;
}
.tool-scroll .entry-item {
  width: 130rpx;
  flex: none;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  position: relative;
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
  border-bottom: 1rpx solid #e8e2da;
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
  color: #2a2a2a;
}
.menu-arrow {
  font-size: 36rpx;
  color: #55524c;
}

.logout {
  margin: 40rpx 60rpx 0;
}
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  border: 1rpx solid #d8ccb8;
  background: #fffafa;
}
.logout-btn text {
  font-size: 28rpx;
  color: #9c1630;
}
.version {
  text-align: center;
  color: #8a857c;
  font-size: 22rpx;
  padding: 40rpx 0 0;
}

/* 弹窗 (自定义底部弹层, 替代 u-popup) */
.popup-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}
.popup-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fffafa;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 75vh;
  overflow-y: auto;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 30rpx 0;
}
.sheet-head .sheet-title { margin-bottom: 0; }
.sheet-close {
  font-size: 30rpx;
  color: #8a857c;
  padding: 6rpx 0 6rpx 30rpx;
}
.sheet-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  border: 1rpx solid #d8ccb8;
  color: #55524c;
  font-size: 26rpx;
}
/* 弹窗 */
.form-sheet {
  padding: 30rpx 30rpx 60rpx;
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
  margin-bottom: 24rpx;
}
.pf-avatar-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin-bottom: 30rpx;
}
.pf-avatar-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 3rpx solid #c41e3a;
  background: #f8f5f0;
}
.pf-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  color: #8a857c;
}
.pf-pick {
  padding: 16rpx 30rpx;
  border-radius: 999rpx;
  background: #c41e3a;
}
.pf-pick text {
  font-size: 24rpx;
  color: #fffafa;
}
/* 弹窗实心按钮 */
.btn-fill {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76rpx;
  padding: 0 44rpx;
  border-radius: 999rpx;
}
.btn-fill text {
  font-size: 26rpx;
  color: #fffafa;
  letter-spacing: 2rpx;
}
.btn-save {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
.btn-invite {
  margin-top: 24rpx;
  width: 100%;
  height: 80rpx;
  box-sizing: border-box;
  padding: 0 20rpx;
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.f-label {
  width: 140rpx;
  font-size: 24rpx;
  color: #55524c;
  flex-shrink: 0;
}
.f-input {
  flex: 1;
  height: 76rpx;
  background: #f8f5f0;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #2a2a2a;
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
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}
.invite-code {
  font-size: 56rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
  color: #c41e3a;
  margin: 10rpx 0 16rpx;
}
.invite-tip {
  display: block;
  font-size: 24rpx;
  color: #55524c;
  margin-bottom: 20rpx;
}
.invite-link {
  display: flex;
  align-items: flex-start;
  background: #f8f5f0;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin-bottom: 10rpx;
  overflow: hidden;
}
.invite-link-text {
  flex: 1;
  min-width: 0;
  font-size: 20rpx;
  color: #c41e3a;
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  white-space: normal;
}

/* PC 宽屏: 页面收拢居中 (H5 桌面浏览器生效, 手机/小程序窄屏不触发) */
@media screen and (min-width: 1025px) {
  .user-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
  /* 弹窗: 与页面屏对齐居中, 不铺满整个显示器 */
  .popup-sheet {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: 100%;
    max-width: 520px;
    border-radius: 24rpx;
    margin-bottom: 30rpx;
  }
}
@media screen and (min-width: 1440px) {
  .user-page {
    max-width: 1320px;
  }
}

</style>
