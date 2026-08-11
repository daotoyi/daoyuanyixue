<template>
  <view class="profile-page">
    <!-- 用户信息 -->
    <view class="profile-head">
      <view class="ph-avatar">
        <image v-if="profile.user && profile.user.avatar" class="ph-avatar-img" :src="profile.user.avatar" mode="aspectFill"></image>
        <view v-else class="ph-avatar-fallback"><text>{{ (profile.user && profile.user.nickname) ? profile.user.nickname[0] : '?' }}</text></view>
      </view>
      <view class="ph-info">
        <text class="ph-name">{{ profile.user ? profile.user.nickname : '...' }}</text>
        <text class="ph-dao" v-if="profile.user && (profile.user.dao_code || profile.user.invite_code)">道号 · {{ profile.user.dao_code || profile.user.invite_code }}</text>
        <text class="ph-bio" v-if="profile.user && profile.user.bio">{{ profile.user.bio }}</text>
      </view>
      <view class="ph-follow-btn" v-if="profile.user && isSelf === false" :class="{ followed: profile.is_followed }" @tap="toggleFollow">
        <text>{{ profile.is_followed ? '已关注' : '关注' }}</text>
      </view>
    </view>

    <!-- 统计 -->
    <view class="profile-stats">
      <view class="ps-item" @tap="switchList('moments')">
        <text class="ps-num">{{ profile.moments ? profile.moments.length : 0 }}</text>
        <text class="ps-label">动态</text>
      </view>
      <view class="ps-item" @tap="switchList('follow')">
        <text class="ps-num">{{ profile.follow_count || 0 }}</text>
        <text class="ps-label">关注</text>
      </view>
      <view class="ps-item" @tap="switchList('fans')">
        <text class="ps-num">{{ profile.fan_count || 0 }}</text>
        <text class="ps-label">粉丝</text>
      </view>
      <view class="ps-item" @tap="switchList('liked')">
        <text class="ps-num">{{ profile.liked_me || 0 }}</text>
        <text class="ps-label">收到的赞</text>
      </view>
    </view>

    <!-- 列表区: 动态 -->
    <view class="profile-list" v-if="listMode === 'moments'">
      <view class="pl-moment" v-for="m in profile.moments" :key="m.id">
        <view class="plm-head">
          <text class="plm-user">{{ m.user_name }}</text>
          <text class="plm-time">{{ m.created_at }}</text>
        </view>
        <view class="plm-content">{{ m.content }}</view>
        <view class="plm-actions">
          <view class="plm-act">
            <text class="plm-icon">❤</text><text>{{ m.likes || 0 }}</text>
          </view>
          <view class="plm-act">
            <text class="plm-icon">💬</text><text>{{ m.comments || 0 }}</text>
          </view>
        </view>
      </view>
      <view class="pl-empty" v-if="!profile.moments || !profile.moments.length">
        <text>暂无动态</text>
      </view>
    </view>

    <!-- 关注/粉丝列表 -->
    <view class="profile-list" v-if="listMode === 'follow' || listMode === 'fans'">
      <view class="pl-user" v-for="u in userList" :key="u.uid" @tap="goProfile(u)">
        <view class="plu-avatar">
          <image v-if="u.avatar" class="plu-avatar-img" :src="u.avatar" mode="aspectFill"></image>
          <view v-else class="plu-avatar-fallback"><text>{{ u.nickname ? u.nickname[0] : '?' }}</text></view>
        </view>
        <view class="plu-info">
          <text class="plu-name">{{ u.nickname }}</text>
          <text class="plu-dao" v-if="u.dao_code">道号 · {{ u.dao_code }}</text>
        </view>
      </view>
      <view class="pl-empty" v-if="!userList.length">
        <text>{{ listMode === 'follow' ? '暂无关注的人' : '暂无粉丝' }}</text>
      </view>
    </view>

    <!-- 收到的点赞 -->
    <view class="profile-list" v-if="listMode === 'liked'">
      <view class="pl-empty" v-if="!likedMoments.length"><text>暂无收到的赞</text></view>
      <view class="pl-moment" v-for="m in likedMoments" :key="m.id">
        <view class="plm-head">
          <text class="plm-user">{{ m.user_name }}</text>
          <text class="plm-time">{{ m.created_at }}</text>
        </view>
        <view class="plm-content">{{ m.content }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { userProfile, followUser, followList } from '../../api/api'
import { resolveCloudUrl, resolveCloudList } from '../../utils/avatar'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const profile = ref({})
const listMode = ref('moments')
const userList = ref([])
const likedMoments = ref([])
const targetUid = ref(0)
const isSelf = ref(false)

onLoad(async (options) => {
  targetUid.value = options.uid ? Number(options.uid) : (userStore.userInfo.uid || 0)
  isSelf.value = targetUid.value === (userStore.userInfo.uid || 0)
  await loadProfile()
})

async function loadProfile() {
  try {
    const res = await userProfile({ uid: targetUid.value, viewer_uid: userStore.userInfo.uid || 0 })
    // cloud:// 头像转可访问 URL (H5 渲染)
    if (res && res.user && res.user.avatar) {
      res.user.avatar = await resolveCloudUrl(res.user.avatar)
    }
    if (res && res.moments) {
      res.moments = await resolveCloudList(res.moments)
    }
    profile.value = res || {}
    // 收到的点赞: 从点赞记录取动态
    if (res && res.liked_me && res.user) {
      const likes = await userProfile({ uid: targetUid.value })
      likedMoments.value = (likes && likes.moments) || []
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

async function switchList(mode) {
  listMode.value = mode
  if (mode === 'follow' || mode === 'fans') {
    userList.value = []
    try {
      userList.value = await resolveCloudList(await followList({ uid: targetUid.value, type: mode }))
    } catch (e) {}
  }
}

async function toggleFollow() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    const res = await followUser({ uid: userStore.userInfo.uid, target_uid: targetUid.value })
    profile.value.is_followed = res.followed
    profile.value.fan_count = (profile.value.fan_count || 0) + (res.followed ? 1 : -1)
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

function goProfile(u) {
  uni.navigateTo({ url: '/pages-sub/user/profile?uid=' + u.uid })
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 20rpx 24rpx 60rpx;
}
.profile-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 30rpx 24rpx;
}
.ph-avatar-img,
.ph-avatar-fallback {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
}
.ph-avatar-fallback {
  background: #8c5a2b;
  color: #fff;
  font-size: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ph-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.ph-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #3a2a18;
}
.ph-dao {
  font-size: 24rpx;
  color: #8b7355;
}
.ph-bio {
  font-size: 22rpx;
  color: #a08b6f;
}
.ph-follow-btn {
  background: #8c5a2b;
  color: #fff;
  font-size: 26rpx;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
}
.ph-follow-btn.followed {
  background: #95a5a6;
}
.profile-stats {
  display: flex;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  margin-top: 20rpx;
  padding: 20rpx 0;
}
.ps-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.ps-num {
  font-size: 32rpx;
  font-weight: bold;
  color: #3a2a18;
}
.ps-label {
  font-size: 22rpx;
  color: #8b7355;
}
.profile-list {
  margin-top: 20rpx;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 10rpx 24rpx;
}
.pl-moment {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0e8d8;
}
.plm-head {
  display: flex;
  justify-content: space-between;
}
.plm-user {
  font-size: 24rpx;
  color: #8c5a2b;
  font-weight: bold;
}
.plm-time {
  font-size: 20rpx;
  color: #a08b6f;
}
.plm-content {
  font-size: 28rpx;
  color: #3a2a18;
  margin-top: 10rpx;
  line-height: 1.5;
}
.plm-actions {
  display: flex;
  gap: 30rpx;
  margin-top: 12rpx;
}
.plm-act {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: #8b7355;
}
.plm-icon {
  font-size: 24rpx;
}
.pl-user {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0e8d8;
}
.plu-avatar-img,
.plu-avatar-fallback {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
}
.plu-avatar-fallback {
  background: #8c5a2b;
  color: #fff;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plu-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.plu-name {
  font-size: 28rpx;
  color: #3a2a18;
}
.plu-dao {
  font-size: 22rpx;
  color: #8b7355;
}
.pl-empty {
  padding: 40rpx 0;
  text-align: center;
  color: #a08b6f;
  font-size: 24rpx;
}
</style>
