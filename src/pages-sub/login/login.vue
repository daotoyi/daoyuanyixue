<template>
  <view class="login-page">
    <!-- 品牌区 -->
    <view class="brand">
      <view class="brand-seal"><text class="seal-char">道</text></view>
      <text class="brand-sub">眞和盛</text>
      <text class="brand-name">道元易学</text>
      <text class="brand-slogan">观天道 · 明人事 · 致中和</text>
    </view>

    <!-- 表单区 -->
    <view class="form-card">
      <view class="form-tabs">
        <view class="ft" :class="{ on: mode === 'login' }" @tap="mode = 'login'">登录</view>
        <view class="ft" :class="{ on: mode === 'register' }" @tap="mode = 'register'">注册</view>
      </view>

      <view class="field">
        <text class="field-label">手机号 / 邮箱</text>
        <input class="field-input" v-model="phone" type="number" maxlength="11" placeholder="手机号或邮箱" />
      </view>

      <view class="field">
        <text class="field-label">密码</text>
        <input class="field-input" v-model="password" :password="true" placeholder="请输入密码" />
      </view>

      <view class="field" v-if="mode === 'register'">
        <text class="field-label">邀请码</text>
        <input class="field-input" v-model="inviteCode" placeholder="选填，输入好友邀请码" />
      </view>

      <view class="err-text" v-if="errorMsg">{{ errorMsg }}</view>

      <view class="btn-p" @click="submit">{{ mode === 'login' ? '登 录' : '注 册' }}</view>

      <!-- 微信一键登录 -->
      <view class="wx-divider">
        <view class="wx-line"></view>
        <text class="wx-text">其他登录方式</text>
        <view class="wx-line"></view>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <view class="wx-profile">
        <view class="wx-avatar-btn" @tap="chooseWxAvatar">
          <image v-if="wxAvatar" class="wx-avatar-img" :src="wxAvatar" mode="aspectFill"></image>
          <text v-else class="wx-avatar-tip">点击选择微信头像</text>
        </view>
        <input class="wx-nick-input" type="nickname" v-model="wxNickname" placeholder="点击输入微信昵称" />
      </view>
      <!-- #endif -->
      <view class="wx-login" @tap="wxLogin">
        <text class="wx-icon">💬</text>
        <text class="wx-name">微信一键登录</text>
      </view>

    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { login, register, wechatLogin } from '../../api/api'
import { getStorage } from '../../api/cloudbase'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const mode = ref('login')
const phone = ref('')
const password = ref('')
const inviteCode = ref('')
const loading = ref(false)
const errorMsg = ref('')
// 微信登录资料 (头像昵称)
const wxAvatar = ref('')
const wxNickname = ref('')
const wxAvatarUploading = ref(false)
function chooseWxAvatar() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFiles[0].tempFilePath
      wxAvatarUploading.value = true
      uni.showLoading({ title: '上传头像...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = `avatars/wx_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`
        const upRes = await storage.uploadFile(filePath, cloudPath)
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        wxAvatar.value = fileID.replace(/^cloud:\/\/[^\/]+\//, 'https://7a68-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
      } catch (e) {
        wxAvatar.value = filePath
        uni.showToast({ title: e.message || '上传失败，已使用本地图片', icon: 'none' })
      } finally {
        wxAvatarUploading.value = false
        uni.hideLoading()
      }
    },
  })
  // #endif
}

// 邀请链接自动填充: ?invite=道号
onLoad((options) => {
  if (options && options.invite) {
    inviteCode.value = String(options.invite)
    mode.value = 'register'
  }
})


function saveUser(user) {
  userStore.setToken('demo-token-' + user.uid)
  userStore.setUserInfo({
    uid: user.uid,
    dao_code: user.dao_code || '',
    nickname: user.nickname,
    avatar: user.avatar || '',
    vip_level: user.vip_level || 0,
    balance: user.balance || '0.00',
    invite_code: user.invite_code || '',
    role: user.role || 'user',
  })
}

async function wxLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    // #ifdef MP-WEIXIN
    // 小程序: wx.login 换取 code → 云函数换 openid 自动登录
    const codeRes = await new Promise((resolve) => wx.login({ success: resolve, fail: resolve }))
    if (!codeRes || !codeRes.code) throw new Error('微信登录失败，请重试')
    const user = await wechatLogin({ code: codeRes.code, nickname: wxNickname.value, avatar: wxAvatar.value })
    saveUser(user)
    uni.showToast({ title: '微信登录成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
    // #endif
    // #ifndef MP-WEIXIN
    uni.showModal({
      title: '提示',
      content: '微信一键登录需配置微信开放平台/公众号（App 与 H5 端）。当前请使用手机号登录，或前往小程序体验微信登录。',
      showCancel: false,
    })
    // #endif
  } catch (e) {
    errorMsg.value = e.message || '微信登录失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  errorMsg.value = ''
  const acct = phone.value.trim()
  const isEmail = acct.includes('@')
  if (!isEmail && !/^1\d{10}$/.test(acct)) {
    errorMsg.value = '请输入正确的手机号或邮箱'
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = '密码至少 6 位'
    return
  }
  loading.value = true
  try {
    let user
    if (mode.value === 'login') {
      user = await login({ account: phone.value.trim(), password: password.value })
    } else {
      user = await register({
        account: phone.value.trim(),
        password: password.value,
        invite_code: inviteCode.value,
      })
    }
    userStore.setToken('demo-token-' + user.uid)
    userStore.setUserInfo({
      uid: user.uid,
      dao_code: user.dao_code || '',
      nickname: user.nickname,
      avatar: user.avatar || '',
      vip_level: user.vip_level || 0,
      balance: user.balance || '0.00',
      invite_code: user.invite_code || '',
      role: user.role || 'user',
    })
    uni.showToast({ title: mode.value === 'login' ? '登录成功' : '注册成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    errorMsg.value = e.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #4e3420 0%, #6e4a26 40%, #f8f3ea 100%);
  padding: 60rpx 40rpx 80rpx;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 70rpx;
}
.brand-seal {
  width: 120rpx;
  height: 120rpx;
  border: 3rpx solid #c4a484;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.12);
  margin-bottom: 24rpx;
}
.seal-char {
  font-size: 68rpx;
  color: #c4a484;
}
.brand-sub {
  font-size: 30rpx;
  letter-spacing: 8rpx;
  color: #8c5a2b;
  font-weight: 500;
  margin-bottom: 8rpx;
}
.brand-name {
  font-size: 44rpx;
  letter-spacing: 10rpx;
  color: #857563;
  font-weight: 500;
}
.brand-slogan {
  margin-top: 12rpx;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: rgba(240, 230, 205, 0.6);
}

.form-card {
  background: #fefbf6;
  border-radius: 24rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 8rpx 40rpx rgba(69, 26, 3, 0.15);
}
.form-tabs {
  display: flex;
  margin-bottom: 40rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.ft {
  flex: 1;
  text-align: center;
  padding-bottom: 20rpx;
  font-size: 30rpx;
  color: #857563;
  position: relative;
}
.ft.on {
  color: #8c5a2b;
  font-weight: 500;
}
.ft.on::after {
  content: '';
  position: absolute;
  bottom: -1rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 64rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #8c5a2b;
}

.field {
  margin-bottom: 30rpx;
}
.field-label {
  display: block;
  font-size: 24rpx;
  color: #857563;
  margin-bottom: 12rpx;
}
.field-input {
  height: 88rpx;
  background: #f8f3ea;
  border-radius: 14rpx;
  padding: 0 26rpx;
  font-size: 28rpx;
  color: #42372c;
}

.err-text {
  color: #b04a45;
  font-size: 24rpx;
  margin: -10rpx 0 20rpx;
}
/* 登录/注册按钮居中 */
.form-card .btn-p {
  width: 100%;
  display: flex;
}

.demo-tip {
  margin-top: 40rpx;
  padding-top: 30rpx;
  border-top: 1rpx dashed #efe7d8;
}

/* 微信登录 */
.wx-divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0 24rpx;
}
.wx-line {
  flex: 1;
  height: 1rpx;
  background: #efe7d8;
}
.wx-text {
  margin: 0 20rpx;
  font-size: 22rpx;
  color: #b3a595;
}
.wx-profile {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.wx-avatar-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 2rpx dashed #c4a484;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background: #f8f3ea;
}
.wx-avatar-img {
  width: 100%;
  height: 100%;
}
.wx-avatar-tip {
  font-size: 20rpx;
  color: #857563;
  text-align: center;
  padding: 0 10rpx;
}
.wx-nick-input {
  flex: 1;
  height: 88rpx;
  background: #f8f3ea;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #42372c;
}
.wx-login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  border: 1rpx solid #efe7d8;
}
.wx-icon {
  font-size: 34rpx;
  margin-right: 14rpx;
}
.wx-name {
  font-size: 28rpx;
  color: #42372c;
}
</style>
