<template>
  <view class="admin-login">
    <view class="brand">
      <view class="seal"><text class="seal-char">道</text></view>
      <text class="brand-name">道元易学 · 管理后台</text>
      <text class="brand-sub">ADMIN CONSOLE</text>
    </view>

    <view class="form">
      <view class="field">
        <text class="label">手机号</text>
        <input class="input" v-model="phone" type="number" maxlength="11" placeholder="请输入管理员手机号" />
      </view>
      <view class="field">
        <text class="label">密码</text>
        <input class="input" v-model="password" :password="true" placeholder="请输入密码" />
      </view>
      <view class="err" v-if="errMsg">{{ errMsg }}</view>
      <view class="btn-p" @click="doLogin">进入后台</view>

      <view class="tip" @tap="fillDemo">示例：管理员 13800138001 / 123456（点击填入）</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { login } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const phone = ref('')
const password = ref('')
const loading = ref(false)
const errMsg = ref('')

function fillDemo() {
  phone.value = '13800138001'
  password.value = '123456'
  errMsg.value = ''
}

async function doLogin() {
  errMsg.value = ''
  if (!phone.value || !password.value) {
    errMsg.value = '请输入手机号和密码'
    return
  }
  loading.value = true
  try {
    const user = await login({ phone: phone.value, password: password.value })
    if (user.role !== 'admin') {
      errMsg.value = '该账号不是管理员'
      return
    }
    userStore.setToken('admin-token-' + user.uid)
    userStore.setUserInfo({
      uid: user.uid,
      nickname: user.nickname,
      avatar: user.avatar || '',
      vip_level: user.vip_level || 0,
      balance: user.balance || '0.00',
      invite_code: user.invite_code || '',
      role: 'admin',
    })
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages-sub/admin/dashboard' })
    }, 500)
  } catch (e) {
    errMsg.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.admin-login {
  min-height: 100vh;
  background: linear-gradient(170deg, #4e3420 0%, #6e4a26 45%, #f8f3ea 100%);
  padding: 80rpx 48rpx;
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 70rpx;
}
.seal {
  width: 130rpx;
  height: 130rpx;
  border: 3rpx solid #c4a484;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.12);
  margin-bottom: 28rpx;
}
.seal-char {
  font-size: 72rpx;
  color: #c4a484;
}
.brand-name {
  font-size: 40rpx;
  font-weight: 500;
  letter-spacing: 6rpx;
  color: #857563;
}
.brand-sub {
  margin-top: 14rpx;
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: rgba(240, 230, 205, 0.5);
}

.form {
  background: #fefbf6;
  border-radius: 24rpx;
  padding: 44rpx 36rpx;
  box-shadow: 0 10rpx 40rpx rgba(69, 26, 3, 0.2);
}
.field {
  margin-bottom: 28rpx;
}
.label {
  display: block;
  font-size: 24rpx;
  color: #857563;
  margin-bottom: 12rpx;
}
.input {
  height: 88rpx;
  background: #f8f3ea;
  border-radius: 14rpx;
  padding: 0 26rpx;
  font-size: 28rpx;
  color: #42372c;
}
.err {
  color: #b04a45;
  font-size: 24rpx;
  margin: -8rpx 0 20rpx;
}
.tip {
  margin-top: 32rpx;
  text-align: center;
  font-size: 22rpx;
  color: #857563;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .admin-login {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .admin-login {
    max-width: 1320px;
  }
}

</style>
