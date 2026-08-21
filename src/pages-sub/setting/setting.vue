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
          <text class="ac-label">手机号</text>
          <template v-if="userInfo.phone">
            <text class="ac-value">{{ userInfo.phone }}</text>
            <text class="ac-btn danger" @tap="unbind('phone')">解绑</text>
          </template>
          <template v-else>
            <text class="ac-value muted">未绑定</text>
            <text class="ac-btn" @tap="acMode = 'phone'">绑定</text>
          </template>
        </view>
        <view class="ac-row">
          <text class="ac-label">微信</text>
          <template v-if="userInfo.openid">
            <text class="ac-value">已绑定</text>
            <text class="ac-btn danger" @tap="unbind('wechat')">解绑</text>
          </template>
          <template v-else>
            <text class="ac-value muted">未绑定</text>
            <text class="ac-btn" @tap="doBindWechat">绑定</text>
          </template>
        </view>
        <view class="ac-row">
          <text class="ac-label">邮箱</text>
          <template v-if="userInfo.email">
            <text class="ac-value">{{ userInfo.email }}</text>
            <text class="ac-btn danger" @tap="unbind('email')">解绑</text>
          </template>
          <template v-else>
            <text class="ac-value muted">未绑定</text>
            <text class="ac-btn" @tap="acMode = 'email'">绑定</text>
          </template>
        </view>
        <view class="ac-divider"></view>

        <!-- 绑定输入区 (点绑定后显示) -->
        <template v-if="acMode">
          <view class="pwd-field">
            <text class="pwd-label">{{ acMode === 'phone' ? '手机号' : '邮箱' }}</text>
            <input class="pwd-input" :type="acMode === 'phone' ? 'number' : 'text'" maxlength="30" v-model="acForm.value" :placeholder="acMode === 'phone' ? '输入11位手机号' : '输入邮箱地址'" />
          </view>
          <view class="pwd-field">
            <text class="pwd-label">登录密码</text>
            <input class="pwd-input" :password="true" v-model="acForm.password" placeholder="有密码需验证，无密码留空" />
          </view>
          <view class="pwd-err" v-if="acErr">{{ acErr }}</view>
          <view class="btn-p sm" @click="saveBind">{{ acMode === 'phone' ? '保存手机号' : '保存邮箱' }}</view>
        </template>
      </view>
    </view></view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { settingsState, setTheme, setLang, t, applyTheme, updateTabBar } from '../../utils/settings'
import { setPassword as apiSetPassword, checkUpdate as apiCheckUpdate, updatePhone as apiUpdatePhone, bindWechat as apiBindWechat, updateEmail as apiUpdateEmail, unbindAccount as apiUnbindAccount } from '../../api/api'
import { useUserStore } from '../../store/index'
import { APP_FULL_VERSION } from '../../version'

const userStore = useUserStore()

const showTheme = ref(false)
const showLang = ref(false)
const showPassword = ref(false)
const showAccount = ref(false)
const acForm = ref({ value: '', password: '' })
const acMode = ref('') // '' | 'phone' | 'email'
const acErr = ref('')
const userInfo = computed(() => userStore.userInfo || {})
function openAccount() {
  if (!userStore.isLoggedIn) return uni.showToast({ title: '请先登录', icon: 'none' })
  acForm.value = { value: '', password: '' }
  acMode.value = ''
  acErr.value = ''
  showAccount.value = true
}
async function saveBind() {
  const val = acForm.value.value.trim()
  if (!val) return (acErr.value = acMode.value === 'phone' ? '请输入手机号' : '请输入邮箱')
  acErr.value = ''
  try {
    if (acMode.value === 'phone') {
      if (!/^1\d{10}$/.test(val)) return (acErr.value = '请输入正确的11位手机号')
      await apiUpdatePhone({ uid: userInfo.value.uid, phone: val, password: acForm.value.password })
      userStore.userInfo.phone = val
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return (acErr.value = '邮箱格式不正确')
      await apiUpdateEmail({ uid: userInfo.value.uid, email: val, password: acForm.value.password })
      userStore.userInfo.email = val
    }
    uni.showToast({ title: '绑定成功', icon: 'success' })
    acMode.value = ''
    acForm.value = { value: '', password: '' }
  } catch (e) {
    acErr.value = e.message || '绑定失败'
  }
}
async function unbind(type) {
  const names = { phone: '手机号', wechat: '微信', email: '邮箱' }
  uni.showModal({
    title: '解绑' + names[type],
    content: '确定解绑' + names[type] + '吗？' + (type === 'wechat' ? '' : '（有密码需输入验证）'),
    editable: type !== 'wechat',
    placeholderText: type === 'wechat' ? '' : '输入登录密码',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await apiUnbindAccount({ uid: userInfo.value.uid, type, password: r.content || '' })
        if (type === 'phone') userStore.userInfo.phone = ''
        if (type === 'wechat') userStore.userInfo.openid = ''
        if (type === 'email') userStore.userInfo.email = ''
        uni.showToast({ title: '已解绑', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '解绑失败', icon: 'none' })
      }
    },
  })
}

async function doBindWechat() {
  // #ifdef MP-WEIXIN
  try {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginRes.code) throw new Error('获取微信授权码失败')
    await apiBindWechat({ uid: userStore.userInfo.uid, code: loginRes.code })
    userStore.userInfo.openid = 'bound'
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
          window.open(info.url || 'https://club.zhenhesheng.cn/download/')
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
  background: #f8f5f0;
  padding: 20rpx 0 60rpx;
}
.group {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  margin: 0 24rpx 24rpx;
  overflow: hidden;
}
.group-title {
  font-size: 22rpx;
  color: #55524c;
  padding: 24rpx 30rpx 12rpx;
}
.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.cell:last-child {
  border-bottom: none;
}
.cell-label {
  font-size: 28rpx;
  color: #2a2a2a;
}
.cell-right {
  display: flex;
  align-items: center;
}
.cell-value {
  font-size: 24rpx;
  color: #55524c;
  margin-right: 10rpx;
}
.cell-arrow {
  font-size: 32rpx;
  color: #8a857c;
}
.version {
  text-align: center;
  font-size: 22rpx;
  color: #8a857c;
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
  color: #2a2a2a;
  margin-bottom: 24rpx;
}
.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 20rpx;
  border-bottom: 1rpx solid #e8e2da;
  font-size: 28rpx;
  color: #2a2a2a;
}
.picker-row.on {
  color: #c41e3a;
  font-weight: 500;
}
.picker-check {
  color: #c41e3a;
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
  color: #55524c;
}
.pwd-input {
  flex: 1;
  height: 76rpx;
  background: #f8f5f0;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #2a2a2a;
}
.ac-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  font-size: 28rpx;
}
.ac-label { color: #55524c; }
.ac-value { color: #2a2a2a; }
.ac-divider { height: 1rpx; background: #e8e2da; margin: 10rpx 0 20rpx; }
.ac-btn {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #c41e3a;
  border: 1rpx solid #c41e3a;
  border-radius: 999rpx;
  padding: 6rpx 24rpx;
  flex-shrink: 0;
  line-height: 1.4;
}
.ac-btn.danger {
  color: #9c1630;
  border-color: #9c1630;
}
.ac-value.muted {
  color: #8a857c;
}
.pwd-err {
  color: #9c1630;
  font-size: 22rpx;
  margin: -6rpx 0 18rpx;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .setting-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .setting-page {
    max-width: 1320px;
  }
}

</style>
