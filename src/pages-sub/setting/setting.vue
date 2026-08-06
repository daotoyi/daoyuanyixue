<template>
  <view class="setting-page">
    <!-- 外观 -->
    <view class="group">
      <view class="group-title">{{ t('外观', 'Appearance') }}</view>
      <view class="cell" @tap="openTheme">
        <text class="cell-label">{{ t('主题', 'Theme') }}</text>
        <view class="cell-right">
          <text class="cell-value">{{ themeText }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
      <view class="cell" @tap="openLang">
        <text class="cell-label">{{ t('语言', 'Language') }}</text>
        <view class="cell-right">
          <text class="cell-value">{{ langText }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 账户 -->
    <view class="group">
      <view class="group-title">{{ t('账户', 'Account') }}</view>
      <view class="cell" @tap="openAccount">
        <text class="cell-label">{{ t('我的账号', 'My Account') }}</text>
        <view class="cell-right">
          <text class="cell-value">{{ userStore.isLoggedIn ? userStore.userInfo.phone || userStore.userInfo.nickname : '未登录' }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
      <view class="cell" @tap="openPassword">
        <text class="cell-label">{{ t('设置密码', 'Set Password') }}</text>
        <view class="cell-right">
          <text class="cell-arrow">›</text>
        </view>
      </view>
      <view class="cell" @tap="goAddress">
        <text class="cell-label">{{ t('收货地址', 'Address') }}</text>
        <view class="cell-right">
          <text class="cell-value">{{ addressCount }} 条</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 关于 -->
    <view class="group">
      <view class="group-title">{{ t('关于', 'About') }}</view>
      <view class="cell" @tap="goPage('/pages-sub/setting/agreement')">
        <text class="cell-label">{{ t('用户协议', 'User Agreement') }}</text>
        <view class="cell-right"><text class="cell-arrow">›</text></view>
      </view>
      <view class="cell" @tap="goPage('/pages-sub/setting/privacy')">
        <text class="cell-label">{{ t('隐私协议', 'Privacy Policy') }}</text>
        <view class="cell-right"><text class="cell-arrow">›</text></view>
      </view>
      <view class="cell" @tap="checkUpdate">
        <text class="cell-label">{{ t('检查更新', 'Check Update') }}</text>
        <view class="cell-right">
          <text class="cell-value" v-if="checking">{{ t('检查中...', 'Checking...') }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="version">道元易学 {{ APP_FULL_VERSION }}</view>

    <!-- 主题选择 -->
    <view class="pp-mask" v-if="showTheme" @tap="showTheme = false"><view class="pp-sheet" @tap.stop>
      <view class="picker-sheet">
        <view class="sheet-title">{{ t('选择主题', 'Select Theme') }}</view>
        <view
          v-for="opt in themeOptions"
          :key="opt.value"
          class="picker-row"
          :class="{ on: settingsState.theme === opt.value }"
          @tap="chooseTheme(opt.value)"
        >
          <text>{{ opt.label }}</text>
          <text class="picker-check">{{ settingsState.theme === opt.value ? '✓' : '' }}</text>
        </view>
      </view>
    </view></view>

    <!-- 语言选择 -->
    <view class="pp-mask" v-if="showLang" @tap="showLang = false"><view class="pp-sheet" @tap.stop>
      <view class="picker-sheet">
        <view class="sheet-title">{{ t('选择语言', 'Select Language') }}</view>
        <view
          v-for="opt in langOptions"
          :key="opt.value"
          class="picker-row"
          :class="{ on: settingsState.lang === opt.value }"
          @tap="chooseLang(opt.value)"
        >
          <text>{{ opt.label }}</text>
          <text class="picker-check">{{ settingsState.lang === opt.value ? '✓' : '' }}</text>
        </view>
      </view>
    </view></view>

    <!-- 设置密码 -->
    <view class="pp-mask" v-if="showPassword" @tap="showPassword = false"><view class="pp-sheet" @tap.stop>
      <view class="picker-sheet">
        <view class="sheet-title">{{ t('设置密码', 'Set Password') }}</view>
        <view class="pwd-field">
          <text class="pwd-label">{{ t('原密码', 'Old Password') }}</text>
          <input class="pwd-input" :password="true" v-model="pwdForm.old_password" :placeholder="t('未设置可留空', 'Leave blank if none')" />
        </view>
        <view class="pwd-field">
          <text class="pwd-label">{{ t('新密码', 'New Password') }}</text>
          <input class="pwd-input" :password="true" v-model="pwdForm.new_password" :placeholder="t('至少 6 位', 'At least 6 chars')" />
        </view>
        <view class="pwd-err" v-if="pwdErr">{{ pwdErr }}</view>
        <view class="btn-p sm" @click="savePassword">{{ t('确认修改', 'Confirm') }}</view>
      </view>
    </view></view>

    <!-- 我的账号 -->
    <view class="pp-mask" v-if="showAccount" @tap="showAccount = false"><view class="pp-sheet" @tap.stop>
      <view class="picker-sheet">
        <view class="sheet-title">我的账号</view>
        <view class="ac-row">
          <text class="ac-label">当前手机号</text>
          <text class="ac-value">{{ userStore.isLoggedIn ? (userStore.userInfo.phone || '未绑定') : '-' }}</text>
        </view>
        <view class="ac-row">
          <text class="ac-label">微信绑定</text>
          <text class="ac-value">{{ userStore.isLoggedIn && userStore.userInfo.openid ? '已绑定' : '未绑定' }}</text>
        </view>
        <view class="ac-divider"></view>
        <view class="pwd-field">
          <text class="pwd-label">新手机号</text>
          <input class="pwd-input" type="number" maxlength="11" v-model="acForm.phone" placeholder="输入新手机号" />
        </view>
        <view class="pwd-field">
          <text class="pwd-label">登录密码</text>
          <input class="pwd-input" :password="true" v-model="acForm.password" placeholder="有密码需验证，无密码留空" />
        </view>
        <view class="pwd-err" v-if="acErr">{{ acErr }}</view>
        <view class="btn-p sm" @click="savePhone">保存手机号</view>
        <view class="btn-p sm" style="margin-top:16rpx" @click="doBindWechat">绑定微信（小程序内使用）</view>
      </view>
    </view></view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { settingsState, setTheme, setLang, t, applyTheme, updateTabBar } from '../../utils/settings'
import { setPassword as apiSetPassword, checkUpdate as apiCheckUpdate, updatePhone as apiUpdatePhone, bindWechat as apiBindWechat } from '../../api/api'
import { useUserStore } from '../../store/index'
import { APP_FULL_VERSION } from '../../version'

const userStore = useUserStore()

const showTheme = ref(false)
const showLang = ref(false)
const showPassword = ref(false)
const showAccount = ref(false)
const acForm = ref({ phone: '', password: '' })
const acErr = ref('')
function openAccount() {
  if (!userStore.isLoggedIn) return uni.showToast({ title: '请先登录', icon: 'none' })
  acForm.value = { phone: '', password: '' }
  acErr.value = ''
  showAccount.value = true
}
async function savePhone() {
  if (!/^1\d{10}$/.test(acForm.value.phone)) return (acErr.value = '请输入正确的11位手机号')
  acErr.value = ''
  try {
    await apiUpdatePhone({ uid: userStore.userInfo.uid, phone: acForm.value.phone, password: acForm.value.password })
    uni.showToast({ title: '手机号已更新', icon: 'success' })
    userStore.userInfo.phone = acForm.value.phone
    showAccount.value = false
  } catch (e) {
    acErr.value = e.message || '修改失败'
  }
}
async function doBindWechat() {
  // #ifdef MP-WEIXIN
  try {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginRes.code) throw new Error('获取微信授权码失败')
    await apiBindWechat({ uid: userStore.userInfo.uid, code: loginRes.code })
    uni.showToast({ title: '微信绑定成功', icon: 'success' })
    showAccount.value = false
  } catch (e) {
    acErr.value = e.message || '绑定失败'
  }
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中绑定微信', icon: 'none' })
  // #endif
}
const pwdForm = ref({ old_password: '', new_password: '' })
const pwdErr = ref('')
const pwdSaving = ref(false)
const checking = ref(false)
const addressCount = ref(0)

const themeOptions = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]
const langOptions = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
]

const themeText = computed(() => themeOptions.find((o) => o.value === settingsState.theme)?.label || '跟随系统')
const langText = computed(() => (settingsState.lang === 'en' ? 'English' : '简体中文'))

function openTheme() {
  showTheme.value = true
}
function chooseTheme(v) {
  setTheme(v)
  showTheme.value = false
}

function openLang() {
  showLang.value = true
}
function chooseLang(v) {
  setLang(v)
  updateTabBar()
  showLang.value = false
}

function goAddress() {
  uni.navigateTo({ url: '/pages-sub/setting/address' })
}
function goPage(url) {
  uni.navigateTo({ url })
}

function openPassword() {
  pwdForm.value = { old_password: '', new_password: '' }
  pwdErr.value = ''
  showPassword.value = true
}

async function savePassword() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (!pwdForm.value.new_password || pwdForm.value.new_password.length < 6) {
    pwdErr.value = '新密码至少 6 位'
    return
  }
  pwdSaving.value = true
  try {
    await apiSetPassword({
      uid: userStore.userInfo.uid,
      old_password: pwdForm.value.old_password,
      new_password: pwdForm.value.new_password,
    })
    showPassword.value = false
    uni.showToast({ title: '密码已修改', icon: 'success' })
  } catch (e) {
    pwdErr.value = e.message || '修改失败'
  } finally {
    pwdSaving.value = false
  }
}

async function checkUpdate() {
  if (checking.value) return
  checking.value = true
  try {
    const info = await apiCheckUpdate()
    checking.value = false
    const current = '1.0.0'
    if (info.latest === current) {
      uni.showToast({ title: '已是最新版本', icon: 'none' })
      return
    }
    uni.showModal({
      title: `发现新版本 v${info.latest}`,
      content: info.changelog || '更新内容详见下载页',
      confirmText: '前往更新',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          // #ifdef H5
          window.open(info.url || 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/download/')
          // #endif
          // #ifndef H5
          uni.showToast({ title: '请到应用市场更新', icon: 'none' })
          // #endif
        }
      },
    })
  } catch (e) {
    checking.value = false
    uni.showToast({ title: '检查失败', icon: 'none' })
  }
}

onMounted(() => {
  applyTheme()
  // 读取地址数量 (本地存储)
  try {
    const list = uni.getStorageSync('app_addresses') || []
    addressCount.value = list.length
  } catch (e) {
    addressCount.value = 0
  }
})
</script>

<style lang="scss" scoped>
.setting-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 20rpx 0 60rpx;
}
.group {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  margin: 0 24rpx 24rpx;
  overflow: hidden;
}
.group-title {
  font-size: 22rpx;
  color: #857563;
  padding: 24rpx 30rpx 12rpx;
}
.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.cell:last-child {
  border-bottom: none;
}
.cell-label {
  font-size: 28rpx;
  color: #42372c;
}
.cell-right {
  display: flex;
  align-items: center;
}
.cell-value {
  font-size: 24rpx;
  color: #857563;
  margin-right: 10rpx;
}
.cell-arrow {
  font-size: 32rpx;
  color: #b3a595;
}
.version {
  text-align: center;
  font-size: 22rpx;
  color: #b3a595;
  margin-top: 30rpx;
  letter-spacing: 2rpx;
}

/* 选择弹窗 */
.picker-sheet {
  padding: 30rpx 30rpx 60rpx;
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
  margin-bottom: 24rpx;
}
.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 20rpx;
  border-bottom: 1rpx solid #efe7d8;
  font-size: 28rpx;
  color: #42372c;
}
.picker-row.on {
  color: #8c5a2b;
  font-weight: 500;
}
.picker-check {
  color: #8c5a2b;
  font-size: 30rpx;
}

/* 密码 */
.pwd-field {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.pwd-label {
  width: 150rpx;
  font-size: 24rpx;
  color: #857563;
}
.pwd-input {
  flex: 1;
  height: 76rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #42372c;
}
.ac-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  font-size: 28rpx;
}
.ac-label { color: #857563; }
.ac-value { color: #42372c; }
.ac-divider { height: 1rpx; background: #efe7d8; margin: 10rpx 0 20rpx; }
.pwd-err {
  color: #b04a45;
  font-size: 22rpx;
  margin: -6rpx 0 18rpx;
}
</style>
