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
        <text class="field-label">{{ mode === 'login' ? '手机号 / 邮箱 / 道号' : '手机号 / 邮箱' }}</text>
        <input class="field-input" v-model="phone" type="text" maxlength="50" :placeholder="mode === 'login' ? '手机号、邮箱或道号' : '手机号或邮箱'" />
      </view>

      <!-- 注册: 验证码 -->
      <view class="field" v-if="mode === 'register'">
        <text class="field-label">验证码</text>
        <view class="code-row">
          <input class="field-input code-input" v-model="verifyCode" type="number" maxlength="6" placeholder="请输入验证码" />
          <view class="btn-p plain code-btn" :class="{ 'code-btn-disabled': codeCountdown > 0 }" @click="sendCode('register')">
            <text>{{ codeCountdown > 0 ? codeCountdown + 's 后重发' : '获取验证码' }}</text>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">密码</text>
        <input class="field-input" v-model="password" :password="true" placeholder="请输入密码" />
      </view>

      <view class="field" v-if="mode === 'register'">
        <text class="field-label">邀请码</text>
        <input class="field-input" v-model="inviteCode" placeholder="选填，输入好友邀请码" />
      </view>

      <!-- 登录: 忘记密码 -->
      <view class="forgot-row" v-if="mode === 'login'">
        <text class="forgot-link" @tap="openForgot">忘记密码？</text>
      </view>

      <view class="err-text" v-if="errorMsg">{{ errorMsg }}</view>

      <view class="btn-p" @click="submit">{{ mode === 'login' ? '登 录' : '注 册' }}</view>

      <!-- 其他登录方式 -->
      <view class="wx-divider">
        <view class="wx-line"></view>
        <text class="wx-text">其他登录方式</text>
        <view class="wx-line"></view>
      </view>
      <!-- 手机号快捷登录: 小程序端微信 getPhoneNumber 授权, H5/APP 弹窗输入手机号+密码 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="wx-login wx-login-btn" open-type="getPhoneNumber" @getphonenumber="onPhoneQuickLogin">
        <text class="wx-icon">📱</text>
        <text class="wx-name">手机号快捷登录</text>
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="wx-login" @tap="showPhoneQuick = true">
        <text class="wx-icon">📱</text>
        <text class="wx-name">手机号快捷登录</text>
      </view>
      <!-- #endif -->
      <!-- 微信一键登录: 后台「页面管理-登录设置」开关打开时显示 (与手机号快捷登录上下排列) -->
      <view class="wx-login" v-if="showWechatLogin" @tap="wxLogin">
        <text class="wx-icon">💬</text>
        <text class="wx-name">微信一键登录</text>
      </view>

      <!-- 手机号快捷登录弹窗 (H5/APP): 手机号 + 密码 -->
      <view class="pp-mask" v-if="showPhoneQuick" @tap="showPhoneQuick = false"><view class="pp-sheet wx-auth-sheet" @tap.stop>
        <view class="sheet-title">手机号快捷登录</view>
        <view class="wx-auth-row">
          <input class="wx-nick-input" type="text" v-model="quickPhone" placeholder="请输入手机号或道号" maxlength="50" />
        </view>
        <view class="wx-auth-row">
          <input class="wx-nick-input" type="password" v-model="quickPwd" placeholder="请输入密码" />
        </view>
        <view class="wx-auth-actions">
          <view class="btn-p plain wx-auth-btn" @click="showPhoneQuick = false">取消</view>
          <view class="btn-p wx-auth-btn" @click="doPhoneQuickLogin">登录</view>
        </view>
      </view></view>

      <!-- 忘记密码弹窗: 手机号/邮箱 + 验证码 + 新密码 -->
      <view class="pp-mask" v-if="showForgot" @tap="showForgot = false"><view class="pp-sheet wx-auth-sheet" @tap.stop>
        <view class="sheet-title">重置密码</view>
        <view class="wx-auth-row">
          <input class="wx-nick-input" type="text" v-model="forgotAccount" placeholder="请输入注册手机号或邮箱" maxlength="50" />
        </view>
        <view class="wx-auth-row">
          <input class="wx-nick-input" type="number" v-model="forgotCode" maxlength="6" placeholder="请输入验证码" />
          <view class="btn-p plain forgot-code-btn" :class="{ 'code-btn-disabled': forgotCountdown > 0 }" @click="sendCode('forgot')">
            <text>{{ forgotCountdown > 0 ? forgotCountdown + 's 后重发' : '获取验证码' }}</text>
          </view>
        </view>
        <view class="wx-auth-row">
          <input class="wx-nick-input" type="password" v-model="forgotPwd" placeholder="请输入新密码（至少6位）" />
        </view>
        <view class="wx-auth-actions">
          <view class="btn-p plain wx-auth-btn" @click="showForgot = false">取消</view>
          <view class="btn-p wx-auth-btn" @click="doResetPassword">重置密码</view>
        </view>
      </view></view>

      <!-- 小程序: 微信授权面板 (chooseAvatar 微信头像 + nickname 微信昵称, 点登录后弹出) -->
      <!-- #ifdef MP-WEIXIN -->
      <view class="pp-mask" v-if="showWxAuth" @tap="showWxAuth = false"><view class="pp-sheet wx-auth-sheet" @tap.stop>
        <view class="sheet-title">微信授权头像昵称</view>
        <view class="wx-auth-row">
          <button class="wx-avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image v-if="wxAvatar" class="wx-avatar-img" :src="wxAvatar" mode="aspectFill"></image>
            <view v-else class="wx-avatar-fallback"><text>👤</text></view>
          </button>
          <text class="wx-auth-hint">点击选择头像（含“使用微信头像”）</text>
        </view>
        <view class="wx-auth-row">
          <input class="wx-nick-input" type="nickname" v-model="wxNickname" placeholder="点击自动填入微信昵称" />
        </view>
        <view class="wx-auth-row">
          <button class="wx-phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
            <text class="wx-phone-icon">📱</text>
            <text>{{ wxPhoneBound ? '已绑定手机号：' + wxPhoneMask : (wxNeedPhone ? '绑定手机号（必填）' : '绑定手机号（选填）') }}</text>
          </button>
        </view>
        <view class="wx-auth-actions">
          <view class="btn-p plain wx-auth-btn" @click="showWxAuth = false">取消</view>
          <view class="btn-p wx-auth-btn" :class="{ 'wx-auth-disabled': wxNeedPhone && !wxPhoneBound }" @click="wxLoginConfirm">{{ wxNeedPhone && !wxPhoneBound ? '请先绑定手机号' : '微信登录' }}</view>
        </view>
      </view></view>
      <!-- #endif -->

    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { login, register, sendVerifyCode, resetPassword, wechatLogin, wechatCheck, bindWechatPhone, phoneLogin, getPayConfig } from '../../api/api'
import { getStorage } from '../../api/cloudbase'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const mode = ref('login')
const phone = ref('')
const password = ref('')
const inviteCode = ref('')
const loading = ref(false)
const errorMsg = ref('')
// 验证码 (注册)
const verifyCode = ref('')
const codeCountdown = ref(0)
let codeTimer = null
// 忘记密码
const showForgot = ref(false)
const forgotAccount = ref('')
const forgotCode = ref('')
const forgotPwd = ref('')
const forgotCountdown = ref(0)
let forgotTimer = null

function startCountdown(target) {
  if (target === 'forgot') {
    forgotCountdown.value = 60
    if (forgotTimer) clearInterval(forgotTimer)
    forgotTimer = setInterval(() => {
      forgotCountdown.value--
      if (forgotCountdown.value <= 0) clearInterval(forgotTimer)
    }, 1000)
  } else {
    codeCountdown.value = 60
    if (codeTimer) clearInterval(codeTimer)
    codeTimer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) clearInterval(codeTimer)
    }, 1000)
  }
}

/* 发送验证码: scene=register 注册 / forgot 忘记密码 */
async function sendCode(scene) {
  const acct = (scene === 'forgot' ? forgotAccount.value : phone.value).trim()
  if (!acct) {
    uni.showToast({ title: '请先输入手机号或邮箱', icon: 'none' })
    return
  }
  const isEmail = acct.includes('@')
  if (!isEmail && !/^1\d{10}$/.test(acct)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (isEmail) {
    uni.showToast({ title: '邮箱验证暂未开通，请使用手机号', icon: 'none' })
    return
  }
  try {
    uni.showLoading({ title: '发送中...' })
    await sendVerifyCode({ account: acct, scene })
    uni.hideLoading()
    uni.showToast({ title: '验证码已发送，请查收短信', icon: 'success' })
    startCountdown(scene)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: (e && e.message) || '发送失败', icon: 'none' })
  }
}

function openForgot() {
  showForgot.value = true
  forgotAccount.value = ''
  forgotCode.value = ''
  forgotPwd.value = ''
}

/* 重置密码 */
async function doResetPassword() {
  const acct = forgotAccount.value.trim()
  if (!acct) return uni.showToast({ title: '请输入手机号或邮箱', icon: 'none' })
  if (!forgotCode.value) return uni.showToast({ title: '请输入验证码', icon: 'none' })
  if (forgotPwd.value.length < 6) return uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
  try {
    uni.showLoading({ title: '重置中...' })
    await resetPassword({ account: acct, code: forgotCode.value, password: forgotPwd.value })
    uni.hideLoading()
    uni.showToast({ title: '密码已重置，请登录', icon: 'success' })
    showForgot.value = false
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: (e && e.message) || '重置失败', icon: 'none' })
  }
}
// 小程序微信授权头像昵称 (chooseAvatar 官方方案)
const wxAvatar = ref('')
const wxNickname = ref('')
const wxPhone = ref('') // 微信授权手机号 (待绑定)
const wxPhoneBound = ref(false)
const wxPhoneMask = ref('')
function onChooseAvatar(e) {
  if (e && e.detail && e.detail.avatarUrl) wxAvatar.value = e.detail.avatarUrl
}

/* 微信一键登录面板: 绑定手机号 (getPhoneNumber → code → 后端换手机号) */
async function onGetPhoneNumber(e) {
  if (!e || !e.detail || !e.detail.code) {
    uni.showToast({ title: '未授权手机号', icon: 'none' })
    return
  }
  try {
    const res = await bindWechatPhone({ code: e.detail.code })
    if (res && res.phone) {
      wxPhone.value = res.phone
      wxPhoneBound.value = true
      wxPhoneMask.value = res.phone.slice(0, 3) + '****' + res.phone.slice(7)
      uni.showToast({ title: '手机号绑定成功', icon: 'success' })
    } else {
      uni.showToast({ title: (res && res.msg) || '绑定失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: err.message || '绑定失败', icon: 'none' })
  }
}

// 邀请链接自动填充: ?invite=道号
onLoad((options) => {
  if (options && options.invite) {
    inviteCode.value = String(options.invite)
    mode.value = 'register'
  }
  // 后台「登录设置」开关: 控制微信一键登录是否显示 (默认隐藏)
  getPayConfig().then((cfg) => {
    if (cfg) showWechatLogin.value = !!cfg.show_wechat_login
  }).catch(() => {})
})

/* 离开页面清理验证码倒计时 */
onUnload(() => {
  if (codeTimer) clearInterval(codeTimer)
  if (forgotTimer) clearInterval(forgotTimer)
})

/* 手机号快捷登录 (H5/APP 弹窗输入) */
const showPhoneQuick = ref(false)
const quickPhone = ref('')
const quickPwd = ref('')
const showWechatLogin = ref(false)
async function doPhoneQuickLogin() {
  if (!quickPhone.value || !quickPwd.value) {
    uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const user = await login({ phone: quickPhone.value, password: quickPwd.value })
    saveUser(user)
    showPhoneQuick.value = false
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(goAfterLogin, 500)
  } catch (e) {
    errorMsg.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
/* 手机号快捷登录 (小程序 getPhoneNumber → 后端换取手机号 → 登录/自动注册) */
async function onPhoneQuickLogin(e) {
  if (!e || !e.detail || !e.detail.code) {
    uni.showToast({ title: '未授权手机号', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const user = await phoneLogin({ code: e.detail.code })
    saveUser(user)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(goAfterLogin, 500)
  } catch (e2) {
    errorMsg.value = e2.message || '登录失败'
  } finally {
    loading.value = false
  }
}


/* 登录成功跳转: 有上一页则返回, 无(直接打开/刷新登录页)则回首页 */
function goAfterLogin() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}

function saveUser(user) {
  userStore.setToken(user.session_token || 'demo-token-' + user.uid)
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

const showWxAuth = ref(false)
const wxNeedPhone = ref(false) // 老微信用户未绑定手机号 → 强制绑定后才能登录

/* 授权面板登录按钮: 需绑定手机号时先绑定 */
function wxLoginConfirm() {
  if (wxNeedPhone.value && !wxPhoneBound.value) {
    uni.showToast({ title: '请先点击上方按钮绑定手机号', icon: 'none' })
    return
  }
  doWxLogin()
}

async function wxLogin() {
  errorMsg.value = ''
  // #ifdef MP-WEIXIN
  // 小程序: 已注册且有头像昵称 → 直接登录; 首次/无资料 → 弹授权面板
  try {
    const chk = await wechatCheck()
    if (chk && chk.registered && chk.hasProfile) {
      // 老用户: 用已有头像昵称
      wxNickname.value = chk.nickname || ''
      wxAvatar.value = chk.avatar || ''
      showWxAuth.value = false
      // 老用户未绑定手机号 → 必须绑定后才能登录
      if (chk.needPhone) {
        wxNeedPhone.value = true
        wxPhoneBound.value = false
        wxPhone.value = ''
        showWxAuth.value = true
        uni.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }
      await doWxLogin()
      return
    }
  } catch (e) { /* check 失败则弹面板 */ }
  wxNeedPhone.value = false
  showWxAuth.value = true
  // #endif
  // #ifndef MP-WEIXIN
  uni.showModal({
    title: '提示',
    content: '微信一键登录需配置微信开放平台/公众号（App 与 H5 端）。当前请使用手机号登录，或前往小程序体验微信登录。',
    showCancel: false,
  })
  // #endif
}

/* 真正执行微信登录: 已通过授权面板取得头像昵称 */
async function doWxLogin() {
  errorMsg.value = ''
  // 老用户强制绑定: 未绑定手机号禁止登录
  if (wxNeedPhone.value && !wxPhoneBound.value) {
    uni.showToast({ title: '请先绑定手机号', icon: 'none' })
    return
  }
  loading.value = true
  try {
    let profile = { nickname: wxNickname.value || '', avatar: wxAvatar.value || '' }
    // 未选头像/昵称时, getUserProfile 兜底 (部分基础库仍返回真实信息)
    if (!profile.nickname || !profile.avatar) {
      try {
        const p = await new Promise((resolve) => {
          uni.getUserProfile({ desc: '用于完善会员资料', success: resolve, fail: resolve })
        })
        if (p && p.userInfo) {
          profile.nickname = profile.nickname || p.userInfo.nickName || ''
          profile.avatar = profile.avatar || p.userInfo.avatarUrl || ''
        }
      } catch (e) { /* 保持当前值 */ }
    }
    // 临时路径 → 云存储永久 fileID (已是 cloud:///https 不上传)
    if (profile.avatar && !/^(https?:|cloud:)/.test(profile.avatar)) {
      try {
        const storage = await getStorage()
        if (storage && storage.uploadFile) {
          const cloudPath = 'avatars/wx' + Date.now() + '.png'
          const upRes = await storage.uploadFile(profile.avatar, cloudPath)
          const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
          if (fileID) profile.avatar = String(fileID)
        }
      } catch (e) { /* 上传失败则保持原路径 */ }
    }
    const codeRes = await new Promise((resolve) => wx.login({ success: resolve, fail: resolve }))
    if (!codeRes || !codeRes.code) throw new Error('微信登录失败，请重试')
    const user = await wechatLogin({ code: codeRes.code, nickname: profile.nickname, avatar: profile.avatar, phone: wxPhone.value || undefined })
    saveUser(user)
    showWxAuth.value = false
    uni.showToast({ title: '微信登录成功', icon: 'success' })
    setTimeout(() => goAfterLogin(), 600)
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
  // 登录: 手机号 / 邮箱 / 道号; 注册: 手机号 / 邮箱 (注册时还没有道号)
  if (!isEmail && mode.value === 'login') {
    if (!/^1\d{10}$/.test(acct) && !/^[A-Za-z0-9]{3,20}$/.test(acct)) {
      errorMsg.value = '请输入正确的手机号、邮箱或道号'
      return
    }
  } else if (!isEmail && !/^1\d{10}$/.test(acct)) {
    errorMsg.value = '请输入正确的手机号或邮箱'
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = '密码至少 6 位'
    return
  }
  // 注册必须输入验证码
  if (mode.value === 'register' && !verifyCode.value.trim()) {
    errorMsg.value = '请输入验证码'
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
        code: verifyCode.value.trim(),
        invite_code: inviteCode.value,
      })
    }
    userStore.setToken(user.session_token || 'demo-token-' + user.uid)
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
    setTimeout(() => goAfterLogin(), 600)
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
  background: linear-gradient(180deg, #9c1630 0%, #6b1022 40%, #f8f5f0 100%);
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
  border: 3rpx solid #b8860b;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.12);
  margin-bottom: 24rpx;
}
.seal-char {
  font-size: 68rpx;
  color: #b8860b;
}
.brand-sub {
  font-size: 30rpx;
  letter-spacing: 8rpx;
  color: #c41e3a;
  font-weight: 500;
  margin-bottom: 8rpx;
}
.brand-name {
  font-size: 44rpx;
  letter-spacing: 10rpx;
  color: #55524c;
  font-weight: 500;
}
.brand-slogan {
  margin-top: 12rpx;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: rgba(240, 230, 205, 0.6);
}

.form-card {
  background: #fffafa;
  border-radius: 24rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 8rpx 40rpx rgba(69, 26, 3, 0.15);
}
.form-tabs {
  display: flex;
  margin-bottom: 40rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.ft {
  flex: 1;
  text-align: center;
  padding-bottom: 20rpx;
  font-size: 30rpx;
  color: #55524c;
  position: relative;
}
.ft.on {
  color: #c41e3a;
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
  background: #c41e3a;
}

.field {
  margin-bottom: 30rpx;
}
.field-label {
  display: block;
  font-size: 24rpx;
  color: #55524c;
  margin-bottom: 12rpx;
}
.field-input {
  height: 88rpx;
  background: #f8f5f0;
  border-radius: 14rpx;
  padding: 0 26rpx;
  font-size: 28rpx;
  color: #2a2a2a;
}

/* 验证码行 */
.code-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.code-input {
  flex: 1;
}
.code-btn {
  flex-shrink: 0;
  min-width: 200rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  font-size: 26rpx;
  padding: 0 16rpx;
}
.code-btn-disabled {
  opacity: 0.55;
}
/* 忘记密码 */
.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin: -12rpx 0 24rpx;
}
.forgot-link {
  font-size: 24rpx;
  color: #8a857c;
  padding: 8rpx 0 8rpx 20rpx;
}
/* 忘记密码弹窗内验证码按钮 */
.forgot-code-btn {
  flex-shrink: 0;
  min-width: 200rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 24rpx;
  padding: 0 16rpx;
}

.err-text {
  color: #9c1630;
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
  border-top: 1rpx dashed #e8e2da;
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
  background: #e8e2da;
}
.wx-text {
  margin: 0 20rpx;
  font-size: 22rpx;
  color: #8a857c;
}
.wx-auth-sheet { padding: 40rpx 40rpx 60rpx; }
.wx-auth-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}
.wx-auth-actions .wx-auth-btn {
  flex: 1;
  height: 92rpx;
  font-size: 30rpx;
}
/* 需绑定手机号时登录按钮禁用态 */
.wx-auth-btn.wx-auth-disabled {
  opacity: 0.5;
  pointer-events: none;
}
.wx-auth-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 24rpx 0;
}
.wx-auth-hint { font-size: 24rpx; color: #55524c; flex: 1; }
.wx-avatar-btn {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #e8e2da;
  border: none;
  line-height: normal;
}
.wx-avatar-btn::after { border: none; }
.wx-avatar-img { width: 100%; height: 100%; }
.wx-avatar-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 44rpx;
}
.wx-phone-btn {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: #2a2a2a;
  background: #f6efe3;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border: 1rpx dashed #c8b99a;
}
.wx-phone-btn::after {
  border: none;
}
.wx-phone-icon {
  font-size: 28rpx;
}
.wx-nick-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: #2a2a2a;
  background: #fffafa;
  border-radius: 12rpx;
  padding: 0 20rpx;
}
.wx-auth-sheet { padding: 40rpx 40rpx 60rpx; }
.wx-auth-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}
.wx-auth-actions .wx-auth-btn {
  flex: 1;
  height: 92rpx;
  font-size: 30rpx;
}
/* 需绑定手机号时登录按钮禁用态 */
.wx-auth-btn.wx-auth-disabled {
  opacity: 0.5;
  pointer-events: none;
}
.wx-auth-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 24rpx 0;
}
.wx-auth-hint { font-size: 24rpx; color: #55524c; flex: 1; }
.wx-avatar-btn {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #e8e2da;
  border: none;
  line-height: normal;
}
.wx-avatar-btn::after { border: none; }
.wx-avatar-img { width: 100%; height: 100%; }
.wx-avatar-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 44rpx;
}
.wx-nick-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: #2a2a2a;
  background: #fffafa;
  border-radius: 12rpx;
  padding: 0 20rpx;
}
.wx-login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
  border: 1rpx solid #e8e2da;
}
/* 小程序 button 复用登录按钮样式: 重置 button 默认边框/背景/内边距 */
.wx-login-btn {
  width: 100%;
  box-sizing: border-box;
  line-height: normal;
  padding: 0;
  margin: 0;
  font-size: inherit;
  color: inherit;
}
.wx-login-btn::after {
  border: none;
}
/* 两个登录按钮上下排列时保持间距 */
.wx-login + .wx-login {
  margin-top: 20rpx;
}
.wx-icon {
  font-size: 34rpx;
  margin-right: 14rpx;
}
.wx-name {
  font-size: 28rpx;
  color: #2a2a2a;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .login-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .login-page {
    max-width: 1320px;
  }
}

</style>
