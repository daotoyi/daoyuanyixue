<template>
  <view class="login-page">
    <!-- 品牌区 -->
    <view class="brand">
      <view class="brand-seal"><text class="seal-char">道</text></view>
      <text class="brand-name">道元易学</text>
      <text class="brand-slogan">观天道 · 明人道 · 致中和</text>
    </view>

    <!-- 表单区 -->
    <view class="form-card">
      <view class="form-tabs">
        <view class="ft" :class="{ on: mode === 'login' }" @tap="mode = 'login'">登录</view>
        <view class="ft" :class="{ on: mode === 'register' }" @tap="mode = 'register'">注册</view>
      </view>

      <view class="field">
        <text class="field-label">手机号</text>
        <input class="field-input" v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" />
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

      <u-button
        :type="'primary'"
        :text="mode === 'login' ? '登 录' : '注 册'"
        shape="circle"
        :loading="loading"
        @click="submit"
      ></u-button>

      <view class="demo-tip">
        <text class="demo-title">示例账号</text>
        <view class="demo-row" v-for="d in demoAccounts" :key="d.phone" @tap="fillDemo(d)">
          <text class="demo-phone">{{ d.phone }}</text>
          <text class="demo-role">{{ d.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { login, register } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const mode = ref('login')
const phone = ref('')
const password = ref('')
const inviteCode = ref('')
const loading = ref(false)
const errorMsg = ref('')

const demoAccounts = [
  { phone: '13800138001', password: '123456', label: '管理员' },
  { phone: '13800138002', password: '123456', label: '普通用户' },
]

function fillDemo(d) {
  phone.value = d.phone
  password.value = d.password
  errorMsg.value = ''
}

async function submit() {
  errorMsg.value = ''
  if (!/^1\d{10}$/.test(phone.value)) {
    errorMsg.value = '请输入正确的手机号'
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
      user = await login({ phone: phone.value, password: password.value })
    } else {
      user = await register({
        phone: phone.value,
        password: password.value,
        invite_code: inviteCode.value,
      })
    }
    userStore.setToken('demo-token-' + user.uid)
    userStore.setUserInfo({
      uid: user.uid,
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
.brand-name {
  font-size: 44rpx;
  letter-spacing: 10rpx;
  color: #f0e6cd;
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

.demo-tip {
  margin-top: 40rpx;
  padding-top: 30rpx;
  border-top: 1rpx dashed #e6dcca;
}
.demo-title {
  font-size: 22rpx;
  color: #b3a595;
}
.demo-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 8rpx;
  border-bottom: 1rpx solid #f8f3ea;
}
.demo-phone {
  font-size: 26rpx;
  color: #42372c;
}
.demo-role {
  font-size: 22rpx;
  color: #8c5a2b;
}
</style>
